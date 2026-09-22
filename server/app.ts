import { authenticateSupabase, supabaseAuthEnabled } from './supabase-auth';
import { mountPayments, paymentWebhook, paymentsRequired, entitled } from './payments';
import { mountPublic } from './public';
import sharp from 'sharp';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { randomUUID, randomBytes } from 'node:crypto';
import { putAsset, readAsset, deleteAsset } from './storage';
import path from 'node:path';
import { z, ZodError } from 'zod';
import type { DB } from './db';
import { gameSchema, assetReferences, type Game } from '../shared/schema';
import { createTemplate } from '../shared/template';
import { createGameExport, type GameExportAsset } from '../shared/export';
import { propose } from './ai';
import { validateEnvironment, trustedOrigin } from './config';
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
const present = (p: any) => ({
  id: p.id,
  game: JSON.parse(p.game),
  revision: p.revision,
  updatedAt: p.updated_at,
  publishedId: p.published_id,
  slug: p.slug,
  publishedUrl:
    p.published_id && p.owner_id
      ? `/play/${encodeURIComponent(p.owner_id)}/${encodeURIComponent(p.published_id)}`
      : null,
});
type AppOptions = {
  /** Tests can exercise authorization without shipping a test-only HTTP auth endpoint. */
  authenticate?: (authorization: string | undefined) => Promise<{
    id: string;
    email: string;
    name: string;
    age?: number | null;
    authSubject?: string;
  }>;
};
export function createApp(db: DB, options: AppOptions = {}) {
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
              connectSrc: [
                "'self'",
                ...(process.env.SUPABASE_URL ? [process.env.SUPABASE_URL] : []),
              ],
              upgradeInsecureRequests: [],
            },
          }
        : false,
    }),
  );
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && trustedOrigin(origin)) {
      res
        .set('Access-Control-Allow-Origin', origin)
        .set('Access-Control-Allow-Credentials', 'true')
        .vary('Origin');
      res.set(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, X-game-gift-Request, X-Project-Id, X-Upload-Id, X-Confirm-Account-Deletion',
      );
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(origin && trustedOrigin(origin) ? 204 : 403);
      return;
    }
    next();
  });
  // Provider signatures cover exact bytes, before JSON parsing or browser CSRF middleware.
  app.post(
    '/api/webhooks/razorpay',
    express.raw({ type: 'application/json', limit: '256kb' }),
    paymentWebhook(db),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(
    '/api',
    rateLimit({ windowMs: 60000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false }),
  );
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      // Bearer tokens are explicitly attached by the client rather than ambient browser
      // credentials. Cross-origin browsers must still pass the OPTIONS gate above before they
      // can send Authorization, while same-origin frontend proxies may preserve a public Origin
      // that differs from the API's APP_ORIGIN configuration.
      if (origin && !trustedOrigin(origin) && !req.get('authorization'))
        return next(fail(403, 'Untrusted request origin'));
    }
    next();
  });
  app.get(['/health', '/api/health'], async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ ok: true, status: 'ok' });
  });
  app.get('/api/config', (req, res) =>
    res.json({
      googleEnabled: supabaseAuthEnabled(),
      authProvider: 'supabase',
      supabaseUrl: supabaseAuthEnabled() ? process.env.SUPABASE_URL : undefined,
      // Supabase publishable/anon keys are designed for public clients; service-role stays server-only.
      supabaseAnonKey: supabaseAuthEnabled() ? process.env.SUPABASE_ANON_KEY : undefined,
      // The browser resolves this against its active origin. This keeps PKCE storage and
      // the callback on the same apex/www origin when a hosting provider canonicalizes it.
      authRedirectUrl: supabaseAuthEnabled() ? '/auth/callback' : undefined,
      aiEnabled: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
      paymentsEnabled: paymentsRequired(),
      // The browser suite injects a scoped fixture token at the network layer.
      testAuthEnabled:
        process.env.NODE_ENV === 'test' && !!options.authenticate && !!req.get('authorization'),
    }),
  );
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  app.use('/api/auth', (req, _res, next) => {
    if (!['/me', '/profile', '/account'].includes(req.path))
      return next(fail(404, 'Use Google sign-in'));
    next();
  });
  const auth: express.RequestHandler = async (req, res, next) => {
    res.locals.user = options.authenticate
      ? await options.authenticate(req.get('authorization'))
      : await authenticateSupabase(db, req.get('authorization'));
    next();
  };
  mountPayments(app, db, auth);
  mountPublic(app, db, auth);
  app.get('/api/auth/me', auth, (_req, res) => {
    const { id, name, email, age } = res.locals.user;
    res.json({ user: { id, name, email, age: age ?? null, profileComplete: age != null } });
  });
  app.patch('/api/auth/profile', authLimit, auth, async (req, res) => {
    const profile = z
      .object({
        name: z.string().trim().min(2).max(60),
        age: z.number().int().min(1).max(120),
      })
      .strict()
      .parse(req.body);
    await db.query('UPDATE users SET name=$1,age=$2 WHERE id=$3', [
      profile.name,
      profile.age,
      res.locals.user.id,
    ]);
    res.json({
      user: {
        id: res.locals.user.id,
        email: res.locals.user.email,
        ...profile,
        profileComplete: true,
      },
    });
  });
  app.delete('/api/auth/account', authLimit, auth, async (req, res) => {
    if (req.get('x-confirm-account-deletion') !== 'delete')
      throw fail(400, 'Confirm account deletion');
    await db.transaction(async (q) => {
      const id = res.locals.user.id;
      await q('UPDATE users SET name=name WHERE id=$1', [id]);
      await q(
        'INSERT INTO deleted_accounts(id,auth_subject,created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [id, res.locals.user.authSubject || id, new Date().toISOString()],
      );
      await q('INSERT INTO deleted_files(filename) SELECT filename FROM assets WHERE owner_id=$1', [
        id,
      ]);
      await q('DELETE FROM projects WHERE owner_id=$1', [id]);
      await q('DELETE FROM assets WHERE owner_id=$1', [id]);
      await q('DELETE FROM users WHERE id=$1', [id]);
    });
    res.json({ ok: true });
  });

  app.get('/api/play/:ownerId/:publishedId', async (req, res) => {
    const [p] = await db.query(
      "SELECT published_game FROM projects WHERE owner_id=$1 AND published_id=$2 AND publication_status='active'",
      [req.params.ownerId, req.params.publishedId],
    );
    if (!p?.published_game) throw fail(404, 'This game is not published');
    res.json({ game: JSON.parse(p.published_game) });
  });
  // Keep already-shared links working; all new links use the owner/public-ID namespace above.
  app.get('/api/play/:id', async (req, res) => {
    const [p] = await db.query(
      "SELECT published_game FROM projects WHERE (published_id=$1 OR slug=$2) AND publication_status='active'",
      [req.params.id, req.params.id],
    );
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
    const owner = req.get('authorization')
      ? {
          user_id: options.authenticate
            ? (await options.authenticate(req.get('authorization'))).id
            : (await authenticateSupabase(db, req.get('authorization'))).id,
        }
      : null;
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
      if (url.startsWith('blob:') || url.startsWith('data:'))
        throw fail(400, 'Upload your media before saving');
      if (url.startsWith('/assets/')) {
        // Static media has already been restricted to approved local paths by assetUrl.
        // It is application-owned, so it does not need an entry in the user's asset table.
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
  app.get('/api/projects/:id/export', async (req, res) => {
    const p = await owned(req.params.id, res.locals.user.id);
    const game = gameSchema.parse(JSON.parse(p.game));
    const assets: Record<string, GameExportAsset> = {};
    for (const url of new Set(
      assetReferences(game)
        .map(({ url }) => url)
        .filter((url) => url.startsWith('/api/assets/')),
    )) {
      const [asset] = await db.query('SELECT * FROM assets WHERE id=$1 AND owner_id=$2', [
        url.split('/').at(-1),
        res.locals.user.id,
      ]);
      if (!asset) throw fail(409, 'A custom asset used by this game is no longer available');
      assets[url] = {
        mime: asset.mime,
        data: (await readAsset(asset.filename)).toString('base64'),
      };
    }
    const filename = `${game.title.replace(/[^a-z0-9-]/gi, '-').slice(0, 60) || 'experience'}.game-gift.json`;
    res
      .set('Content-Disposition', `attachment; filename="${filename}"`)
      .type('application/vnd.gamegift+json')
      .send(`${JSON.stringify(createGameExport(game, assets), null, 2)}\n`);
  });
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
      if (p.publication_status === 'disabled')
        throw fail(403, 'This game has been disabled by moderation');
      if (p.revision !== revision) throw fail(409, 'Save the latest version before publishing');
      if (paymentsRequired() && !(await entitled(q, p.id, res.locals.user.id)))
        throw fail(402, 'Payment required to publish this game');
      gameSchema.parse(JSON.parse(p.game));
      const publishedId = p.published_id || randomUUID();
      const slug =
        p.slug ||
        ((JSON.parse(p.game).title as string)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60) || 'game') +
          '-' +
          randomBytes(9).toString('base64url');
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
      await q('UPDATE projects SET slug=$1,published_at=$2 WHERE id=$3', [
        slug,
        new Date().toISOString(),
        p.id,
      ]);
      await q(
        "INSERT INTO email_outbox(id,user_id,kind,payload,created_at) VALUES ($1,$2,'published',$3,$4) ON CONFLICT DO NOTHING",
        [
          `published-${p.id}-${revision}`,
          res.locals.user.id,
          JSON.stringify({ ownerId: p.owner_id, publishedId }),
          new Date().toISOString(),
        ],
      );
      return {
        publishedId,
        slug,
        url: `/play/${encodeURIComponent(p.owner_id)}/${encodeURIComponent(publishedId)}`,
      };
    });
    res.json(publishedId);
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
      const requestedId = req.get('x-upload-id');
      if (requestedId && !/^[a-f0-9-]{36}$/.test(requestedId))
        throw fail(400, 'Invalid upload identifier');
      if (requestedId) {
        const [existing] = await db.query(
          'SELECT id,mime FROM assets WHERE id=$1 AND owner_id=$2',
          [requestedId, res.locals.user.id],
        );
        if (existing)
          return res.status(200).json({ url: `/api/assets/${existing.id}`, mime: existing.mime });
      }
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
      const id = requestedId || randomUUID();
      const storagePath =
        process.env.SUPABASE_URL && projectId
          ? `users/${res.locals.user.id}/projects/${projectId}/${mime.startsWith('audio/') ? 'audio' : 'characters'}/${id}`
          : id;
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
          await q(
            'INSERT INTO assets(id,owner_id,mime,filename,size,project_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [
              id,
              res.locals.user.id,
              mime,
              storagePath,
              payload.length,
              projectId || null,
              new Date().toISOString(),
            ],
          );
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
      await db.transaction(async (q) => {
        await q('UPDATE users SET name=name WHERE id=$1', [res.locals.user.id]);
        const [{ total }] = await q(
          'SELECT COUNT(*) AS total FROM ai_usage WHERE user_id=$1 AND created_at>$2',
          [res.locals.user.id, new Date(Date.now() - 86400000).toISOString()],
        );
        if (Number(total) >= Number(process.env.AI_DAILY_LIMIT || 20))
          throw fail(429, 'Daily AI allowance reached');
        await q(
          "INSERT INTO ai_usage(id,user_id,operation,model,status,created_at) VALUES ($1,$2,'proposal',$3,'started',$4)",
          [
            usageId,
            res.locals.user.id,
            process.env.OPENAI_MODEL || 'unconfigured',
            new Date().toISOString(),
          ],
        );
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
      redirect: false,
      setHeaders(res, file) {
        res.setHeader(
          'Cache-Control',
          file.endsWith('.html')
            ? 'no-cache'
            : file.includes(`${path.sep}avatars${path.sep}`)
              ? file.endsWith('manifest.json')
                ? 'public, max-age=300, stale-while-revalidate=86400'
                : 'public, max-age=86400, stale-while-revalidate=604800'
              : 'public, max-age=3600',
        );
      },
    }),
  );
  const marketingRoutes = new Set([
    '/personalized-game-gift',
    '/custom-video-game-gift',
    '/birthday-game-gift',
    '/game-for-girlfriend',
    '/game-for-boyfriend',
    '/anniversary-game-gift',
    '/couples-game-gift',
    '/personalized-digital-gift',
    '/examples',
    '/gift-ideas',
    '/gift-ideas/unique-birthday-gifts-for-girlfriend',
    '/gift-ideas/birthday-gifts-for-boyfriend',
    '/gift-ideas/anniversary-gift-ideas',
    '/gift-ideas/digital-gift-ideas',
    '/gift-ideas/long-distance-relationship-gifts',
    '/gift-ideas/last-minute-personalized-gifts',
    '/gift-ideas/how-to-make-a-personalized-game',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ]);
  app.get('/{*path}', (req, res) => {
    const route = req.path.replace(/\/$/, '') || '/';
    if (marketingRoutes.has(route))
      return res
        .set('Cache-Control', 'no-cache')
        .sendFile(path.resolve('dist', route.slice(1), 'index.html'));
    if (['/studio', '/my-games', '/auth/callback'].includes(route) || route.startsWith('/play/'))
      return res.set('Cache-Control', 'no-cache').sendFile(path.resolve('dist/private.html'));
    if (route !== '/') return res.status(404).type('text').send('Page not found');
    return res.set('Cache-Control', 'no-cache').sendFile(path.resolve('dist/index.html'));
  });
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
      console.error(
        JSON.stringify({
          event: 'request_error',
          message: err.message,
          ...(err.detail ? { detail: err.detail } : {}),
        }),
      );
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
