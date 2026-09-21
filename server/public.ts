import type express from 'express';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { DB } from './db';
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
export function mountPublic(app: express.Express, db: DB, auth: express.RequestHandler) {
  const reportLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many reports from this connection. Try again later.' },
  });
  const published = async (reference: string, publishedId?: string) => {
    const [p] = await db.query(
      publishedId
        ? "SELECT * FROM projects WHERE owner_id=$1 AND published_id=$2 AND published_game IS NOT NULL AND publication_status='active'"
        : "SELECT * FROM projects WHERE slug=$1 AND published_game IS NOT NULL AND published_id IS NOT NULL AND publication_status='active'",
      publishedId ? [reference, publishedId] : [reference],
    );
    if (!p) throw fail(404, 'This game is not published');
    return p;
  };
  app.get('/api/public-games/:ownerId/:publishedId', async (req, res) => {
    const p = await published(String(req.params.ownerId), String(req.params.publishedId));
    res.json({
      game: JSON.parse(p.published_game),
      ownerId: p.owner_id,
      publishedId: p.published_id,
      publishedAt: p.published_at,
    });
  });
  app.get('/api/public-games/:slug', async (req, res) => {
    const p = await published(String(req.params.slug));
    res.json({ game: JSON.parse(p.published_game), slug: p.slug, publishedAt: p.published_at });
  });
  // Vercel rewrites /g/* here. The backend injects metadata into the exact same Vite build.
  app.get('/g/:slug', async (req, res) => {
    const p = await published(String(req.params.slug));
    const game = JSON.parse(p.published_game);
    const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
    const url = `${origin}/g/${encodeURIComponent(p.slug)}`;
    const metadata = `<title>${escape(game.title)} · Game Gift</title><meta name="robots" content="noindex, nofollow, noarchive"><meta property="og:title" content="${escape(game.title)}"><meta property="og:description" content="${escape(game.description || 'A personalized playable gift, made just for you.')} "><meta property="og:url" content="${escape(url)}"><meta property="og:type" content="website"><meta property="og:image" content="${escape(origin)}/screenshots/gameplay-preview.webp"><meta name="twitter:card" content="summary_large_image">`;
    const html = (await readFile('dist/index.html', 'utf8'))
      .replace(/<title>.*?<\/title>/s, '')
      .replace('</head>', `${metadata}</head>`);
    res.type('html').set('Cache-Control', 'no-store').send(html);
  });
  app.post('/api/public-games/:ownerId/:publishedId/report', reportLimit, async (req, res) => {
    const input = z
      .object({
        reason: z.enum(['inappropriate_content', 'harassment', 'copyright', 'privacy', 'other']),
        details: z.string().max(2000).default(''),
      })
      .parse(req.body);
    const p = await published(String(req.params.ownerId), String(req.params.publishedId));
    await db.query(
      'INSERT INTO reports(id,project_id,reason,details,created_at) VALUES ($1,$2,$3,$4,$5)',
      [randomUUID(), p.id, input.reason, input.details, new Date().toISOString()],
    );
    res.status(201).json({ ok: true });
  });
  app.post('/api/public-games/:slug/report', reportLimit, async (req, res) => {
    const input = z
      .object({
        reason: z.enum(['inappropriate_content', 'harassment', 'copyright', 'privacy', 'other']),
        details: z.string().max(2000).default(''),
      })
      .parse(req.body);
    const p = await published(String(req.params.slug));
    await db.query(
      'INSERT INTO reports(id,project_id,reason,details,created_at) VALUES ($1,$2,$3,$4,$5)',
      [randomUUID(), p.id, input.reason, input.details, new Date().toISOString()],
    );
    res.status(201).json({ ok: true });
  });
  app.use('/api/admin', auth, (_req, res, next) => {
    if (!(process.env.ADMIN_USER_IDS || '').split(',').includes(res.locals.user.id))
      return next(fail(403, 'Operator access required'));
    next();
  });
  app.get('/api/admin/reports', async (_req, res) =>
    res.json({
      reports: await db.query(
        'SELECT reports.*,projects.slug,projects.publication_status FROM reports LEFT JOIN projects ON reports.project_id=projects.id ORDER BY reports.created_at DESC LIMIT 100',
      ),
    }),
  );
  app.put('/api/admin/projects/:id/status', async (req, res) => {
    const { status } = z.object({ status: z.enum(['active', 'disabled']) }).parse(req.body);
    const rows = await db.query(
      'UPDATE projects SET publication_status=$1 WHERE id=$2 RETURNING id',
      [status, req.params.id],
    );
    if (!rows.length) throw fail(404, 'Game not found');
    res.json({ ok: true });
  });
}
