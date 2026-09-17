import express from 'express';
import { createHmac, timingSafeEqual, randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import type { DB, Query } from './db';
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
export const paymentsRequired = () =>
  process.env.NODE_ENV === 'production' && process.env.PAYMENTS_ENABLED === 'true';
export function validSignature(
  body: string | Buffer,
  signature: string,
  secret: string | undefined,
) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(
    createHmac('sha256', secret).update(body).digest(),
    Buffer.from(signature, 'hex'),
  );
}
export async function razorpay(path: string, body?: unknown) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw fail(503, 'Checkout is not configured yet');
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString(
          'base64',
        ),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw fail(502, 'Payment provider unavailable. Please try again.');
  return response.json() as Promise<any>;
}
export async function product(q: Query) {
  await q(
    'INSERT INTO products(id,code,name,price_amount,currency,active,created_at) VALUES ($1,$2,$3,$4,$5,1,$6) ON CONFLICT(code) DO NOTHING',
    [
      'single-game-publish',
      'SINGLE_GAME_PUBLISH',
      'Publish one game-gift',
      Number(process.env.PUBLISH_PRICE_AMOUNT || 29900),
      'INR',
      new Date().toISOString(),
    ],
  );
  const [p] = await q("SELECT * FROM products WHERE code='SINGLE_GAME_PUBLISH' AND active=1");
  if (!p) throw fail(503, 'Publishing is currently unavailable');
  return p;
}
export async function entitled(q: Query, project: string, user: string) {
  return (
    (
      await q("SELECT id FROM entitlements WHERE project_id=$1 AND user_id=$2 AND type='publish'", [
        project,
        user,
      ])
    ).length > 0
  );
}
/** One transaction locks the order, checks captured amount and grants at most one entitlement. */
export async function settle(q: Query, payment: any) {
  if (!payment || typeof payment.order_id !== 'string' || typeof payment.id !== 'string')
    throw fail(400, 'Invalid payment event');
  await q('UPDATE orders SET status=status WHERE provider_order_id=$1', [payment.order_id]);
  const [order] = await q('SELECT * FROM orders WHERE provider_order_id=$1', [payment.order_id]);
  if (!order) throw fail(409, 'Payment order has not been reconciled yet');
  if (payment.status === 'failed') {
    await q("UPDATE orders SET status='failed' WHERE id=$1 AND status<>'paid'", [order.id]);
    return;
  }
  if (
    payment.status !== 'captured' ||
    payment.captured !== true ||
    payment.amount !== Number(order.amount) ||
    payment.currency !== order.currency
  )
    throw fail(400, 'Payment is not captured for the expected amount');
  if (order.status === 'paid') {
    if (order.provider_payment_id !== payment.id)
      throw fail(409, 'Order already has a different payment');
    return;
  }
  const now = new Date().toISOString();
  await q("UPDATE orders SET status='paid',provider_payment_id=$1,paid_at=$2 WHERE id=$3", [
    payment.id,
    now,
    order.id,
  ]);
  // A deleted project/account must never be resurrected by a late webhook.
  if (order.user_id && order.project_id) {
    await q(
      "INSERT INTO entitlements(id,user_id,project_id,type,source_order_id,created_at) VALUES ($1,$2,$3,'publish',$4,$5) ON CONFLICT DO NOTHING",
      [randomUUID(), order.user_id, order.project_id, order.id, now],
    );
    await q(
      "INSERT INTO email_outbox(id,user_id,kind,payload,created_at) VALUES ($1,$2,'payment',$3,$4) ON CONFLICT DO NOTHING",
      [
        `payment-${order.id}`,
        order.user_id,
        JSON.stringify({ amount: order.amount, currency: order.currency }),
        now,
      ],
    );
  }
}
export function paymentWebhook(db: DB): express.RequestHandler {
  return async (req, res) => {
    if (
      !Buffer.isBuffer(req.body) ||
      !validSignature(
        req.body,
        req.get('x-razorpay-signature') || '',
        process.env.RAZORPAY_WEBHOOK_SECRET,
      )
    )
      throw fail(400, 'Invalid webhook signature');
    let event: any;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      throw fail(400, 'Invalid webhook body');
    }
    const eventId =
      req.get('x-razorpay-event-id') || createHash('sha256').update(req.body).digest('hex');
    if (eventId.length > 200) throw fail(400, 'Invalid event identifier');
    await db.transaction(async (q) => {
      const inserted = await q(
        'INSERT INTO payment_webhook_events(id,provider,provider_event_id,received_at) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id',
        [randomUUID(), 'razorpay', eventId, new Date().toISOString()],
      );
      if (!inserted.length) return;
      if (['payment.captured', 'payment.failed', 'order.paid'].includes(event.event)) {
        const payment = event.payload?.payment?.entity;
        if (event.event === 'payment.failed' && payment?.status !== 'failed')
          throw fail(400, 'Invalid failure event');
        if (event.event !== 'payment.failed' && payment?.status !== 'captured')
          throw fail(400, 'Invalid captured event');
        await settle(q, payment);
      }
      await q(
        'UPDATE payment_webhook_events SET processed_at=$1 WHERE provider=$2 AND provider_event_id=$3',
        [new Date().toISOString(), 'razorpay', eventId],
      );
    });
    res.json({ ok: true });
  };
}
export function mountPayments(app: express.Express, db: DB, auth: express.RequestHandler) {
  app.get('/api/products/publish', async (_req, res) => {
    const p = await product(db.query);
    res.json({
      code: p.code,
      name: p.name,
      amount: p.price_amount,
      currency: p.currency,
      paymentRequired: paymentsRequired(),
    });
  });
  app.get('/api/projects/:id/entitlement', auth, async (req, res) => {
    if (
      !(
        await db.query('SELECT id FROM projects WHERE id=$1 AND owner_id=$2', [
          req.params.id,
          res.locals.user.id,
        ])
      ).length
    )
      throw fail(404, 'Game not found');
    res.json({
      entitled: await entitled(db.query, String(req.params.id), res.locals.user.id),
      paymentRequired: paymentsRequired(),
    });
  });
  app.post('/api/payments/order', auth, async (req, res) => {
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(req.body);
    const userId = res.locals.user.id;
    // Serialize simultaneous clicks; reuse an existing provider order.
    const checkout = await db.transaction(async (q) => {
      await q('UPDATE projects SET revision=revision WHERE id=$1 AND owner_id=$2', [
        projectId,
        userId,
      ]);
      if (
        !(await q('SELECT id FROM projects WHERE id=$1 AND owner_id=$2', [projectId, userId]))
          .length
      )
        throw fail(404, 'Game not found');
      if (await entitled(q, projectId, userId))
        throw fail(409, 'This game is already paid. Publish it now.');
      const p = await product(q);
      let [order] = await q(
        "SELECT * FROM orders WHERE project_id=$1 AND user_id=$2 AND status IN ('created','failed') AND provider_order_id IS NOT NULL ORDER BY created_at DESC LIMIT 1",
        [projectId, userId],
      );
      if (!order) {
        const id = randomUUID();
        const remote = await razorpay('orders', {
          amount: p.price_amount,
          currency: p.currency,
          receipt: id,
        });
        if (
          remote.amount !== Number(p.price_amount) ||
          remote.currency !== p.currency ||
          !/^order_[A-Za-z0-9]+$/.test(remote.id)
        )
          throw fail(502, 'Invalid payment provider order');
        await q(
          "INSERT INTO orders(id,user_id,project_id,product_id,amount,currency,provider,provider_order_id,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,'razorpay',$7,'created',$8)",
          [
            id,
            userId,
            projectId,
            p.id,
            p.price_amount,
            p.currency,
            remote.id,
            new Date().toISOString(),
          ],
        );
        order = { provider_order_id: remote.id, amount: p.price_amount, currency: p.currency };
      }
      return {
        key: process.env.RAZORPAY_KEY_ID,
        order_id: order.provider_order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Gamegift',
        description: p.name,
      };
    });
    res.json(checkout);
  });
  app.post('/api/payments/verify', auth, async (req, res) => {
    const input = z
      .object({
        razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
        razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
        razorpay_signature: z.string().max(128),
      })
      .parse(req.body);
    const [order] = await db.query(
      'SELECT * FROM orders WHERE provider_order_id=$1 AND user_id=$2',
      [input.razorpay_order_id, res.locals.user.id],
    );
    if (!order) throw fail(404, 'Order not found');
    if (
      !validSignature(
        `${order.provider_order_id}|${input.razorpay_payment_id}`,
        input.razorpay_signature,
        process.env.RAZORPAY_KEY_SECRET,
      )
    )
      throw fail(400, 'Invalid payment signature');
    const payment = await razorpay(`payments/${input.razorpay_payment_id}`);
    if (payment.id !== input.razorpay_payment_id || payment.order_id !== order.provider_order_id)
      throw fail(400, 'Payment does not match order');
    if (payment.status === 'authorized') {
      res.status(202).json({ pending: true });
      return;
    }
    await db.transaction((q) => settle(q, payment));
    res.json({ paid: payment.status === 'captured' });
  });
}
