/** Operator-only recovery. Verify the person's identity out of band first. */
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { openDatabase } from './db';
const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error('Usage: npm run account:reset -- user@example.com');
const db = await openDatabase();
try {
  const password = randomBytes(24).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const hash = `${salt}:${((await promisify(scrypt)(password, salt, 64)) as Buffer).toString('hex')}`;
  await db.transaction(async (q) => {
    const rows = await q('UPDATE users SET password=$1 WHERE email=$2 RETURNING id', [hash, email]);
    if (!rows.length) throw new Error('Account not found');
    await q('DELETE FROM sessions WHERE user_id=$1', [rows[0].id]);
  });
  console.log(
    `New password (deliver privately; ask the user to change it in Account settings): ${password}`,
  );
} finally {
  await db.close();
}
