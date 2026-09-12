import sharp from 'sharp';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { randomUUID, randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z, ZodError } from 'zod';
import type { DB } from './db';
import { gameSchema, assetReferences, type Game } from '../shared/schema';
import { createTemplate } from '../shared/template';
import { propose } from './ai';
import { validateEnvironment } from './config';
const hashToken = (s: string) => createHash('sha256').update(s).digest('hex');
const scryptAsync = promisify(scrypt);
async function passwordHash(password: string, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${((await scryptAsync(password, salt, 64)) as Buffer).toString('hex')}`;
}
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
const present = (p: any) => ({
  id: p.id,
  game: JSON.parse(p.game),
  revision: p.revision,
  updatedAt: p.updated_at,
  publishedId: p.published_id,
});
export function createApp(db: DB) {
  validateEnvironment();
  const app = express(),
    production = process.env.NODE_ENV === 'production';
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: production
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'blob:', 'data:'],
              mediaSrc: ["'self'", 'blob:'],
              connectSrc: ["'self'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
    }),
  );
  app.use(express.json({ limit: '1mb' }), cookieParser());
  app.use(
    '/api',
    rateLimit({ windowMs: 60000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false }),
  );
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      const expected = process.env.APP_ORIGIN || 'http://localhost:5173';
      if (origin && origin !== expected) return next(fail(403, 'Untrusted request origin'));
      if (!req.headers['x-gamegift-request']) return next(fail(403, 'Missing request header'));
    }
    next();
  });
  app.get('/api/health', async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ ok: true });
  });
  app.get('/api/config', (_req, res) =>
    res.json({
      aiEnabled: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
      registrationCodeRequired: !!process.env.REGISTRATION_CODE,
    }),
  );
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  const credentials = z.object({
    email: z
      .string()
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(10).max(128),
    name: z.string().trim().min(1).max(60).optional(),
    registrationCode: z.string().max(256).optional(),
  });
  async function session(user: any, res: express.Response) {
    await db.query('DELETE FROM sessions WHERE expires<$1', [Date.now()]);
    const token = randomBytes(32).toString('hex');
    await db.query('INSERT INTO sessions(token,user_id,expires) VALUES ($1,$2,$3)', [
      hashToken(token),
      user.id,
      Date.now() + 7 * 86400000,
    ]);
    res.cookie('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: production,
      maxAge: 7 * 86400000,
      path: '/',
    });
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  }
  app.post('/api/auth/register', authLimit, async (req, res) => {
    const input = credentials.parse(req.body);
    if (
      process.env.REGISTRATION_CODE &&
      !timingSafeEqual(
        Buffer.from(hashToken(input.registrationCode || '')),
        Buffer.from(hashToken(process.env.REGISTRATION_CODE)),
      )
    )
      throw fail(403, 'A valid invitation code is required');
    const user = {
      id: randomUUID(),
      email: input.email,
      name: input.name || input.email.split('@')[0],
    };
    try {
      await db.query('INSERT INTO users(id,email,password,name) VALUES ($1,$2,$3,$4)', [
        user.id,
        user.email,
        await passwordHash(input.password),
        user.name,
      ]);
    } catch (e: any) {
      if (e.code === '23505' || e.code?.startsWith('ERR_SQLITE'))
        throw fail(409, 'Unable to create account with this email');
      throw e;
    }
    await session(user, res);
  });
  app.post('/api/auth/login', authLimit, async (req, res) => {
    const input = credentials.parse(req.body);
    const [user] = await db.query('SELECT * FROM users WHERE email=$1', [input.email]);
    const stored = user?.password || `${'0'.repeat(32)}:${'0'.repeat(128)}`;
    const actual = await passwordHash(input.password, stored.split(':')[0]);
    if (!timingSafeEqual(Buffer.from(actual), Buffer.from(stored)) || !user)
      throw fail(401, 'Email or password is incorrect');
    await session(user, res);
  });
  app.post('/api/auth/logout', async (req, res) => {
    await db.query('DELETE FROM sessions WHERE token=$1', [hashToken(req.cookies.session || '')]);
    res.clearCookie('session', { path: '/' }).json({ ok: true });
  });
  const auth: express.RequestHandler = async (req, res, next) => {
    const [user] = await db.query(
      'SELECT users.id, users.name, users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=$1 AND sessions.expires>$2',
      [hashToken(req.cookies.session || ''), Date.now()],
    );
    if (!user) return next(fail(401, 'Sign in to save your games'));
    res.locals.user = user;
    next();
  };
  app.get('/api/auth/me', auth, (_req, res) => res.json({ user: res.locals.user }));
  async function verifyPassword(userId: string, password: string, q = db.query) {
    const [user] = await q('SELECT password FROM users WHERE id=$1', [userId]);
    if (!user) throw fail(401, 'Sign in again');
    const actual = await passwordHash(password, user.password.split(':')[0]);
    if (!timingSafeEqual(Buffer.from(actual), Buffer.from(user.password)))
      throw fail(401, 'Current password is incorrect');
  }
  const passwordInput = z.string().min(10).max(128);
  app.post('/api/auth/password', authLimit, auth, async (req, res) => {
    const input = z
      .object({ currentPassword: passwordInput, password: passwordInput })
      .parse(req.body);
    const hashed = await passwordHash(input.password);
    await db.transaction(async (q) => {
      await q('UPDATE users SET name=name WHERE id=$1', [res.locals.user.id]);
      await verifyPassword(res.locals.user.id, input.currentPassword, q);
      await q('UPDATE users SET password=$1 WHERE id=$2', [hashed, res.locals.user.id]);
      await q('DELETE FROM sessions WHERE user_id=$1', [res.locals.user.id]);
    });
    await session(res.locals.user, res);
  });
  app.delete('/api/auth/account', authLimit, auth, async (req, res) => {
    const { password } = z.object({ password: passwordInput }).parse(req.body);
    await db.transaction(async (q) => {
      const id = res.locals.user.id;
      await q('UPDATE users SET name=name WHERE id=$1', [id]);
      await verifyPassword(id, password, q);
      await q('INSERT INTO deleted_files(filename) SELECT filename FROM assets WHERE owner_id=$1', [
        id,
      ]);
      await q('DELETE FROM projects WHERE owner_id=$1', [id]);
      await q('DELETE FROM assets WHERE owner_id=$1', [id]);
      await q('DELETE FROM users WHERE id=$1', [id]);
    });
    res.clearCookie('session', { path: '/' }).json({ ok: true });
  });

  app.get('/api/play/:id', async (req, res) => {
    const [p] = await db.query('SELECT published_game FROM projects WHERE published_id=$1', [
      req.params.id,
    ]);
    if (!p?.published_game) throw fail(404, 'This game is not published');
    res.json({ game: JSON.parse(p.published_game) });
  });
  const uploads = path.resolve(process.env.DATA_DIR || '.data', 'uploads');
  app.get('/api/assets/:id', async (req, res) => {
    const [asset] = await db.query('SELECT * FROM assets WHERE id=$1', [req.params.id]);
    if (!asset) throw fail(404, 'Asset not found');
    const [publicUse] = await db.query(
      'SELECT projects.id FROM published_assets JOIN projects ON projects.id=published_assets.project_id WHERE published_assets.asset_id=$1 AND projects.published_id IS NOT NULL',
      [asset.id],
    );
    const [owner] = await db.query('SELECT user_id FROM sessions WHERE token=$1 AND expires>$2', [
      hashToken(req.cookies.session || ''),
      Date.now(),
    ]);
    if (!publicUse && owner?.user_id !== asset.owner_id) throw fail(404, 'Asset not found');
    res
      .type(asset.mime)
      .set('Cache-Control', 'no-store')
      .sendFile(path.join(uploads, asset.filename));
  });
  app.use('/api/projects', auth);
  async function owned(id: string, user: string, q = db.query) {
    const [p] = await q('SELECT * FROM projects WHERE id=$1 AND owner_id=$2', [id, user]);
    if (!p) throw fail(404, 'Game not found');
    return p;
  }
  async function validateAssets(game: Game, user: string) {
    for (const { url, kind } of assetReferences(game)) {
      if (url.startsWith('/assets/')) {
        if (kind !== 'image') throw fail(400, 'Sound slots require an audio upload');
        continue;
      }
      const [asset] = await db.query('SELECT mime FROM assets WHERE id=$1 AND owner_id=$2', [
        url.split('/').at(-1),
        user,
      ]);
      if (!asset) throw fail(400, 'Game references an asset you do not own');
      if (!asset.mime.startsWith(kind + '/')) throw fail(400, `Choose ${kind} media for this slot`);
    }
  }
  app.get('/api/projects', async (_req, res) =>
    res.json({
      projects: (
        await db.query('SELECT * FROM projects WHERE owner_id=$1 ORDER BY updated_at DESC', [
          res.locals.user.id,
        ])
      ).map(present),
    }),
  );
  app.post('/api/projects', async (req, res) => {
    const game = gameSchema.parse(req.body.game || createTemplate());
    await validateAssets(game, res.locals.user.id);
    const id = randomUUID(),
      now = new Date().toISOString();
    await db.transaction(async (q) => {
      await q('UPDATE users SET name=name WHERE id=$1', [res.locals.user.id]);
      const [{ total }] = await q('SELECT COUNT(*) AS total FROM projects WHERE owner_id=$1', [
        res.locals.user.id,
      ]);
      if (Number(total) >= 50)
        throw fail(409, 'Your 50-game allowance is full. Delete a game first.');
      await q(
        'INSERT INTO projects(id,owner_id,game,revision,updated_at) VALUES ($1,$2,$3,$4,$5)',
        [id, res.locals.user.id, JSON.stringify(game), 1, now],
      );
      await q(
        'INSERT INTO revisions(id,project_id,revision,game,created_at) VALUES ($1,$2,$3,$4,$5)',
        [randomUUID(), id, 1, JSON.stringify(game), now],
      );
    });
    res.status(201).json(present(await owned(id, res.locals.user.id)));
  });
  app.delete('/api/projects/:id', async (req, res) => {
    await db.transaction(async (q) => {
      await owned(req.params.id, res.locals.user.id, q);
      await q('DELETE FROM projects WHERE id=$1 AND owner_id=$2', [
        req.params.id,
        res.locals.user.id,
      ]);
    });
    res.json({ ok: true });
  });
  app.get('/api/projects/:id', async (req, res) =>
    res.json(present(await owned(req.params.id, res.locals.user.id))),
  );
  app.put('/api/projects/:id', async (req, res) => {
    const input = z
      .object({ game: gameSchema, revision: z.number().int().positive() })
      .parse(req.body);
    await validateAssets(input.game, res.locals.user.id);
    const updated = await db.transaction(async (q) => {
      const p = await owned(req.params.id, res.locals.user.id, q);
      if (p.revision !== input.revision)
        throw fail(409, 'A newer version exists. Reload the project before saving.');
      const now = new Date().toISOString();
      const rows = await q(
        'UPDATE projects SET game=$1,revision=revision+1,updated_at=$2 WHERE id=$3 AND owner_id=$4 AND revision=$5 RETURNING *',
        [JSON.stringify(input.game), now, p.id, res.locals.user.id, input.revision],
      );
      if (!rows.length) throw fail(409, 'A newer version exists. Reload before saving.');
      await q(
        'INSERT INTO revisions(id,project_id,revision,game,created_at) VALUES ($1,$2,$3,$4,$5)',
        [randomUUID(), p.id, p.revision + 1, JSON.stringify(input.game), now],
      );
      await q('DELETE FROM revisions WHERE project_id=$1 AND revision<=$2', [
        p.id,
        p.revision + 1 - 100,
      ]);
      return rows[0];
    });
    res.json(present(updated));
  });
  app.get('/api/projects/:id/revisions', async (req, res) => {
    await owned(req.params.id, res.locals.user.id);
    res.json({
      revisions: await db.query(
        'SELECT revision,created_at FROM revisions WHERE project_id=$1 ORDER BY revision DESC LIMIT 50',
        [req.params.id],
      ),
    });
  });
  app.get('/api/projects/:id/revisions/:revision', async (req, res) => {
    await owned(req.params.id, res.locals.user.id);
    const [r] = await db.query('SELECT game FROM revisions WHERE project_id=$1 AND revision=$2', [
      req.params.id,
      Number(req.params.revision),
    ]);
    if (!r) throw fail(404, 'Version not found');
    res.json({ game: JSON.parse(r.game) });
  });
  app.post('/api/projects/:id/publish', async (req, res) => {
    const revision = z.number().int().positive().parse(req.body.revision);
    const publishedId = await db.transaction(async (q) => {
      // Serialize publish with draft updates so the asset ACL matches the snapshot.
      await q('UPDATE projects SET revision=revision WHERE id=$1 AND owner_id=$2', [
        req.params.id,
        res.locals.user.id,
      ]);
      const p = await owned(req.params.id, res.locals.user.id, q);
      gameSchema.parse(JSON.parse(p.game));
      const publishedId = p.published_id || randomUUID();
      const rows = await q(
        'UPDATE projects SET published_id=$1,published_game=game WHERE id=$2 AND owner_id=$3 AND revision=$4 RETURNING id',
        [publishedId, p.id, res.locals.user.id, revision],
      );
      if (!rows.length) throw fail(409, 'Save the latest version before publishing');
      await q('DELETE FROM published_assets WHERE project_id=$1', [p.id]);
      for (const url of new Set(
        assetReferences(JSON.parse(p.game))
          .map((a) => a.url)
          .filter((url) => url.startsWith('/api/assets/')),
      ))
        await q('INSERT INTO published_assets(project_id,asset_id) VALUES ($1,$2)', [
          p.id,
          url.split('/').at(-1),
        ]);
      return publishedId;
    });
    res.json({ publishedId, url: `/play/${publishedId}` });
  });
  app.delete('/api/projects/:id/publish', async (req, res) => {
    await db.transaction(async (q) => {
      await owned(req.params.id, res.locals.user.id, q);
      await q('UPDATE projects SET published_id=NULL,published_game=NULL WHERE id=$1', [
        req.params.id,
      ]);
      await q('DELETE FROM published_assets WHERE project_id=$1', [req.params.id]);
    });
    res.json({ ok: true });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0, parts: 2 },
  });
  app.post(
    '/api/assets',
    auth,
    rateLimit({ windowMs: 3600000, limit: 60 }),
    upload.single('file'),
    async (req, res) => {
      const f = req.file;
      if (!f) throw fail(400, 'Choose a file');
      const b = f.buffer;
      let mime = b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? 'image/png'
        : b[0] === 255 && b[1] === 216 && b[2] === 255
          ? 'image/jpeg'
          : b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
            ? 'image/webp'
            : b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE'
              ? 'audio/wav'
              : b.toString('ascii', 0, 3) === 'ID3' || (b[0] === 255 && (b[1] & 224) === 224)
                ? 'audio/mpeg'
                : b.toString('ascii', 0, 4) === 'OggS'
                  ? 'audio/ogg'
                  : null;
      if (!mime) throw fail(400, 'Use PNG, JPEG, WebP, MP3, WAV or OGG files');
      let payload = b;
      if (mime.startsWith('image/')) {
        try {
          payload = await sharp(b, { limitInputPixels: 16777216 })
            .rotate()
            .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 90 })
            .toBuffer();
          mime = 'image/webp';
        } catch {
          throw fail(
            400,
            'This image could not be decoded. Use a valid image under 16 megapixels.',
          );
        }
      }
      const id = randomUUID();
      await mkdir(uploads, { recursive: true });
      await writeFile(path.join(uploads, id), payload, { flag: 'wx' });
      try {
        await db.transaction(async (q) => {
          // Lock the account row in PostgreSQL; SQLite transactions serialize writers.
          await q('UPDATE users SET name=name WHERE id=$1', [res.locals.user.id]);
          const [{ total }] = await q(
            'SELECT COALESCE(SUM(size),0) AS total FROM assets WHERE owner_id=$1',
            [res.locals.user.id],
          );
          if (Number(total) + payload.length > 100 * 1024 * 1024)
            throw fail(413, 'Your 100 MB asset allowance is full');
          await q('INSERT INTO assets(id,owner_id,mime,filename,size) VALUES ($1,$2,$3,$4,$5)', [
            id,
            res.locals.user.id,
            mime,
            id,
            payload.length,
          ]);
        });
      } catch (e) {
        await unlink(path.join(uploads, id));
        throw e;
      }
      res.status(201).json({ url: `/api/assets/${id}`, mime });
    },
  );
  app.post(
    '/api/ai/propose',
    auth,
    rateLimit({ windowMs: 3600000, limit: 20 }),
    async (req, res) => {
      const input = z
        .object({ game: gameSchema, prompt: z.string().min(4).max(2000) })
        .parse(req.body);
      res.json(await propose(input.game, input.prompt));
    },
  );
  app.use('/api', (_req, _res, next) => next(fail(404, 'Endpoint not found')));
  app.use(
    express.static(path.resolve('dist'), {
      setHeaders(res, file) {
        res.setHeader(
          'Cache-Control',
          file.endsWith('.html') ? 'no-cache' : 'public, max-age=3600',
        );
      },
    }),
  );
  app.get('/{*path}', (_req, res) =>
    res.set('Cache-Control', 'no-cache').sendFile(path.resolve('dist/index.html')),
  );
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status =
      err instanceof ZodError
        ? 400
        : err.code === 'LIMIT_FILE_SIZE'
          ? 413
          : err instanceof multer.MulterError
            ? 400
            : err.status || 500;
    if (status >= 500)
      console.error(JSON.stringify({ event: 'request_error', message: err.message }));
    res.status(status).json({
      error:
        err instanceof ZodError
          ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
          : status === 500
            ? 'An unexpected error occurred'
            : err.message,
    });
  });
  return app;
}
