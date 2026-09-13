import { writeFileSync } from 'node:fs';
const url = new URL(process.argv[2]);
if (url.protocol !== 'https:' || url.origin !== process.argv[2]) throw new Error('Pass an exact HTTPS backend origin without a trailing slash.');
const config = {
  framework: 'vite', buildCommand: 'npm run build', outputDirectory: 'dist',
  rewrites: [{ source: '/api/:path*', destination: `${url.origin}/api/:path*` }, { source: '/play/:path*', destination: '/index.html' }],
  headers: [{ source: '/(.*)', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" },
  ]}],
};
writeFileSync('vercel.json', JSON.stringify(config, null, 2) + '\n');
console.log(`Configured the frontend API proxy to ${url.origin}`);
