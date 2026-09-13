import { authenticateSupabase, supabaseAuthEnabled } from './supabase-auth';
import { mountPayments, paymentWebhook, paymentsRequired, entitled } from './payments';
import { mountPublic } from './public';
import sharp from 'sharp';
import { googleEnabled, googleFlow } from './google';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { randomUUID, randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { putAsset, readAsset, deleteAsset } from './storage';
import path from 'node:path';
import { z, ZodError } from 'zod';
import type { DB } from './db';
import { gameSchema, assetReferences, type Game } from '../shared/schema';
import { createTemplate } from '../shared/template';
import { propose } from './ai';
import { validateEnvironment, trustedOrigin } from './config';
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
  slug: p.slug,
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
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && trustedOrigin(origin)) {
      res.set('Access-Control-Allow-Origin', origin).set('Access-Control-Allow-Credentials', 'true').vary('Origin');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Playcraft-Request, X-Project-Id');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') { res.sendStatus(origin && trustedOrigin(origin) ? 204 : 403); return; }
    next();
  });
  // Provider signatures cover exact bytes, before JSON parsing or browser CSRF middleware.
  app.post('/api/webhooks/razorpay', express.raw({ type: 'application/json', limit: '256kb' }), paymentWebhook(db));
  app.use(express.json({ limit: '1mb' }), cookieParser());
  app.use(
    '/api',
    rateLimit({ windowMs: 60000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false }),
  );
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      if (origin && !trustedOrigin(origin)) return next(fail(403, 'Untrusted request origin'));
      if (!supabaseAuthEnabled() && !req.headers['x-playcraft-request']) return next(fail(403, 'Missing request header'));
    }
    next();
  });
  app.get(['/health', '/api/health'], async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ ok: true, status: 'ok' });
  });
  app.get('/api/config', (_req, res) =>
    res.json({
      googleEnabled: !supabaseAuthEnabled() && googleEnabled(),
      authProvider: supabaseAuthEnabled() ? 'supabase' : 'legacy',
      aiEnabled: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
      registrationCodeRequired: !supabaseAuthEnabled() && !!process.env.REGISTRATION_CODE,
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
  async function session(user: any, res: express.Response, redirect = false) {
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
    if (redirect) res.redirect(303, '/');
    else res.json({ user: { id: user.id, name: user.name, email: user.email } });
  }
  app.use('/api/auth', (req, _res, next) => {
    if (supabaseAuthEnabled() && !['/me', '/account'].includes(req.path)) return next(fail(404, 'Use Supabase Auth'));
    next();
  });
  const google = googleFlow();
  app.post('/api/auth/google/start', authLimit, async (req, res) => {
    if (!googleEnabled()) throw fail(503, 'Google sign-in is not configured');
    const input = z
      .object({
        password: z.string().min(10).max(128).optional(),
        registrationCode: z.string().max(256).optional(),
      })
      .parse(req.body);
    const invited =
      !process.env.REGISTRATION_CODE ||
      timingSafeEqual(
        Buffer.from(hashToken(input.registrationCode || '')),
        Buffer.from(hashToken(process.env.REGISTRATION_CODE)),
      );
    res.json({
      url: google.start(res, input.password ? await passwordHash(input.password) : '', invited),
    });
  });
  app.get('/api/auth/google/callback', authLimit, async (req, res) => {
    if (!googleEnabled()) throw fail(503, 'Google sign-in is not configured');
    try {
      const profile = await google.finish(req, res);
      let [user] = await db.query('SELECT * FROM users WHERE google_sub=$1', [profile.sub]);
      if (!user) {
        if (!profile.invited)
          throw new Error('A valid invitation code is required to create an account.');
        if (!profile.password)
          throw new Error(
            'Choose Create account and set a recovery password before your first Google sign-in.',
          );
        const [existing] = await db.query('SELECT id FROM users WHERE email=$1', [profile.email]);
        if (existing)
          throw new Error('This email already has a password account. Sign in with your password.');
        user = { id: randomUUID(), email: profile.email, name: profile.name };
        await db.query(
          'INSERT INTO users(id,email,password,name,google_sub) VALUES ($1,$2,$3,$4,$5)',
          [user.id, user.email, profile.password, user.name, profile.sub],
        );
      }
      await session(user, res, true);
    } catch (e) {
      const message = (e as Error).message;
      res.redirect(
        303,
        '/?authError=' +
          encodeURIComponent(
            message.startsWith('Google') ||
              message.startsWith('A valid') ||
              message.startsWith('Choose Create') ||
              message.startsWith('This email')
              ? message
              : 'Google sign-in failed. Please try again.',
          ),
      );
    }
  });
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
    if (supabaseAuthEnabled()) {
      res.locals.user = await authenticateSupabase(db, req.get('authorization'));
      next(); return;
    }
    const [user] = await db.query(
      'SELECT users.id, users.name, users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=$1 AND sessions.expires>$2',
      [hashToken(req.cookies.session || ''), Date.now()],
    );
    if (!user) return next(fail(401, 'Sign in to save your games'));
    res.locals.user = user;
    next();
  };
  mountPayments(app, db, auth);
  mountPublic(app, db, auth);
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
    const password = supabaseAuthEnabled() ? '' : z.object({ password: passwordInput }).parse(req.body).password;
    await db.transaction(async (q) => {
      const id = res.locals.user.id;
      await q('UPDATE users SET name=name WHERE id=$1', [id]);
      if (supabaseAuthEnabled()) await q('INSERT INTO deleted_accounts(id,created_at) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, new Date().toISOString()]);
      else await verifyPassword(id, password, q);
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
    const [p] = await db.query("SELECT published_game FROM projects WHERE (published_id=$1 OR slug=$2) AND publication_status='active'", [
      req.params.id, req.params.id,
    ]);
    if (!p?.published_game) throw fail(404, 'This game is not published');
    res.json({ game: JSON.parse(p.published_game) });
  });
  const uploads = path.resolve(process.env.DATA_DIR || '.data', 'uploads');
  app.get('/api/assets/:id', async (req, res) => {
    const [asset] = await db.query('SELECT * FROM assets WHERE id=$1', [req.params.id]);
    if (!asset) throw fail(404, 'Asset not found');
    const [publicUse] = await db.query(
      "SELECT projects.id FROM published_assets JOIN projects ON projects.id=published_assets.project_id WHERE published_assets.asset_id=$1 AND projects.published_id IS NOT NULL AND projects.publication_status='active'",
      [asset.id],
    );
    const [legacyOwner] = await db.query('SELECT user_id FROM sessions WHERE token=$1 AND expires>$2', [
      hashToken(req.cookies.session || ''),
      Date.now(),
    ]);
    const owner = supabaseAuthEnabled() ? (req.get('authorization') ? { user_id: (await authenticateSupabase(db, req.get('authorization'))).id } : null) : legacyOwner;
    if (!publicUse && owner?.user_id !== asset.owner_id) throw fail(404, 'Asset not found');
    res
      .type(asset.mime)
      .set('Cache-Control', 'no-store')
      .send(await readAsset(asset.filename));
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
      if (p.publication_status === 'disabled') throw fail(403, 'This game has been disabled by moderation');
      if (p.revision !== revision) throw fail(409, 'Save the latest version before publishing');
      if (paymentsRequired() && !await entitled(q, p.id, res.locals.user.id)) throw fail(402, 'Payment required to publish this game');
      gameSchema.parse(JSON.parse(p.game));
      const publishedId = p.published_id || randomUUID();
      const slug = p.slug || ((JSON.parse(p.game).title as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'game') + '-' + randomBytes(9).toString('base64url');
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
      await q('UPDATE projects SET slug=$1,published_at=$2 WHERE id=$3', [slug, new Date().toISOString(), p.id]);
      await q("INSERT INTO email_outbox(id,user_id,kind,payload,created_at) VALUES ($1,$2,'published',$3,$4) ON CONFLICT DO NOTHING", [`published-${p.id}-${revision}`, res.locals.user.id, JSON.stringify({ slug }), new Date().toISOString()]);
      return { publishedId, slug };
    });
    res.json({ ...publishedId, url: `/g/${publishedId.slug}` });
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
      const projectId = req.get('x-project-id');
      if (projectId) await owned(projectId, res.locals.user.id);
      if (production && !projectId) throw fail(400, 'Save the project before uploading');
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
      const storagePath = process.env.SUPABASE_URL && projectId ? `users/${res.locals.user.id}/projects/${projectId}/${mime.startsWith('audio/') ? 'audio' : 'characters'}/${id}` : id;
      await putAsset(storagePath, payload, mime);
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
          if (projectId) await owned(projectId, res.locals.user.id, q);
          await q('INSERT INTO assets(id,owner_id,mime,filename,size,project_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [
            id,
            res.locals.user.id,
            mime,
            storagePath,
            payload.length,
            projectId || null,
            new Date().toISOString(),
          ]);
        });
      } catch (e) {
        await deleteAsset(storagePath);
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
      const usageId = randomUUID();
      await db.transaction(async q => {
        await q('UPDATE users SET name=name WHERE id=$1', [res.locals.user.id]);
        const [{ total }] = await q('SELECT COUNT(*) AS total FROM ai_usage WHERE user_id=$1 AND created_at>$2', [res.locals.user.id, new Date(Date.now() - 86400000).toISOString()]);
        if (Number(total) >= Number(process.env.AI_DAILY_LIMIT || 20)) throw fail(429, 'Daily AI allowance reached');
        await q("INSERT INTO ai_usage(id,user_id,operation,model,status,created_at) VALUES ($1,$2,'proposal',$3,'started',$4)", [usageId, res.locals.user.id, process.env.OPENAI_MODEL || 'unconfigured', new Date().toISOString()]);
      });
      try {
        const proposal = await propose(input.game, input.prompt);
        await db.query("UPDATE ai_usage SET status='completed' WHERE id=$1", [usageId]);
        res.json(proposal);
      } catch (error) {
        await db.query("UPDATE ai_usage SET status='failed' WHERE id=$1", [usageId]);
        throw error;
      }
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
