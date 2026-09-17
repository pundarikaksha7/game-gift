import type { DB } from './db';
/** Durable outbox with stable Resend idempotency keys; no stories or asset data in emails. */
export async function deliverEmails(db: DB) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return;
  const messages = await db.query(
    'SELECT email_outbox.*,users.email FROM email_outbox JOIN users ON users.id=email_outbox.user_id WHERE sent_at IS NULL AND attempts<8 ORDER BY created_at LIMIT 10',
  );
  for (const message of messages) {
    await db.query('UPDATE email_outbox SET attempts=attempts+1 WHERE id=$1', [message.id]);
    const payload = JSON.parse(message.payload);
    const origin = process.env.APP_ORIGIN;
    const content =
      message.kind === 'welcome'
        ? [
            'Welcome to Gamegift',
            `Make someone the main character. Create your first game at ${origin}/create`,
          ]
        : message.kind === 'payment'
          ? [
              'Gamegift payment confirmed',
              `Your payment of ${Number(payload.amount) / 100} ${payload.currency} is confirmed. Your game is ready to publish at ${origin}/my-games`,
            ]
          : message.kind === 'published'
            ? [
                'Your Gamegift is ready to share',
                `Your game is published: ${origin}/play/${encodeURIComponent(payload.ownerId)}/${encodeURIComponent(payload.publishedId)}`,
              ]
            : ['Gamegift account notification', 'Your account settings have changed.'];
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': message.id,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: message.email,
        subject: content[0],
        text: content[1],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Transactional email delivery failed');
    await db.query('UPDATE email_outbox SET sent_at=$1 WHERE id=$2', [
      new Date().toISOString(),
      message.id,
    ]);
  }
}
