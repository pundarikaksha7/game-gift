import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { OG_IMAGE, SITE_URL, labels, seoPages, type SeoPage } from '../src/seo';

const dist = path.resolve('dist');
const shell = await readFile(path.join(dist, 'index.html'), 'utf8');
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

type Meta = {
  path: string;
  title: string;
  description: string;
  robots?: string;
  body: string;
  schema?: unknown[];
};
function document(meta: Meta) {
  const canonical = `${SITE_URL}${meta.path === '/' ? '' : meta.path}`;
  const head = `<title>${escape(meta.title)}</title>
    <meta name="description" content="${escape(meta.description)}">
    <meta name="robots" content="${meta.robots || 'index, follow, max-image-preview:large'}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website"><meta property="og:site_name" content="Game Gift">
    <meta property="og:title" content="${escape(meta.title)}"><meta property="og:description" content="${escape(meta.description)}">
    <meta property="og:url" content="${canonical}"><meta property="og:image" content="${OG_IMAGE}"><meta property="og:image:width" content="1280"><meta property="og:image:height" content="720"><meta property="og:image:alt" content="A personalized Gamegift adventure in live playtest">
    <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(meta.title)}"><meta name="twitter:description" content="${escape(meta.description)}"><meta name="twitter:image" content="${OG_IMAGE}">
    ${(meta.schema || []).map((item) => `<script type="application/ld+json">${json(item)}</script>`).join('\n')}`;
  return shell
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(
      /\s*<meta\s+(?:name|property)="(?:description|robots|keywords|og:[^"]+|twitter:[^"]+)"[\s\S]*?>/g,
      '',
    )
    .replace(/\s*<link rel="canonical"[^>]*>/g, '')
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    .replace('</head>', `${head}</head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"><div class="prerender-shell" data-prerendered>${meta.body}</div></div>`,
    );
}
function breadcrumbs(page: SeoPage) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: page.h1, item: `${SITE_URL}${page.path}` },
    ],
  };
}
function pageBody(page: SeoPage) {
  return `<header><nav aria-label="Main navigation"><a href="/">Game Gift</a> <a href="/examples">Examples</a> <a href="/studio">Create your game</a></nav></header><main><nav aria-label="Breadcrumb"><a href="/">Home</a> / ${escape(page.h1)}</nav><section><p>${escape(page.eyebrow)}</p><h1>${escape(page.h1)}</h1><p>${escape(page.intro)}</p><a href="/studio">Create your game</a> <a href="/examples">See game examples</a></section>${page.sections.map((s) => `<section><h2>${escape(s.title)}</h2><p>${escape(s.body)}</p></section>`).join('')}<section><h2>How Game Gift works</h2><ol><li>Choose a starting game mode.</li><li>Personalize the characters, story, levels and sound.</li><li>Playtest, publish and share the link.</li></ol></section><section><h2>Frequently asked questions</h2>${page.faqs.map(([q, a]) => `<h3>${escape(q)}</h3><p>${escape(a)}</p>`).join('')}</section><nav aria-label="Related gift ideas">${page.related.map((p) => `<a href="${p}">${escape(labels[p])}</a> `).join('')}</nav></main><footer><a href="/about">About</a> <a href="/contact">Contact</a> <a href="/privacy">Privacy</a> <a href="/terms">Terms</a></footer>`;
}
async function save(route: string, html: string) {
  const dir = path.join(dist, route.replace(/^\//, ''));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), html);
}

const organization = {
  '@type': 'Organization',
  name: 'Game Gift',
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
};
const website = { '@type': 'WebSite', name: 'Game Gift', url: SITE_URL };
const app = {
  '@type': 'SoftwareApplication',
  name: 'Game Gift',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description:
    'A visual builder for creating personalized browser games as gifts with custom characters, levels, stories, images and music.',
};
const homeBody = `<header><nav><a href="/">Game Gift</a> <a href="/examples">Examples</a> <a href="/personalized-game-gift">Gift ideas</a> <a href="/studio">Start creating</a></nav></header><main><section><h1>Create a Personalized Game as a Gift</h1><p>Build a one-of-one browser adventure for someone you love. Personalize the characters, world, memories, music and story, then share the finished game by link.</p><a href="/studio">Make a game gift</a></section><section><h2>Turn Your Memories Into a Game</h2><p>Choose a playable starting mode and shape it around shared places, inside jokes and favorite people.</p></section><section><h2>A Birthday Gift They Can Actually Play</h2><p>Create chapters, messages and a final surprise for birthdays, anniversaries and other special occasions.</p></section><section><h2>How Game Gift Works</h2><ol><li>Choose a starting point.</li><li>Personalize the cast, story, world and soundtrack.</li><li>Playtest and send the published link.</li></ol></section><section><h2>Frequently Asked Questions</h2><h3>Do I need to code?</h3><p>No. The visual builder starts with a working game.</p><h3>Does the recipient install anything?</h3><p>No. Published games open in a modern browser.</p></section></main><footer><a href="/about">About</a> <a href="/contact">Contact</a> <a href="/privacy">Privacy</a> <a href="/terms">Terms</a></footer>`;
await writeFile(
  path.join(dist, 'index.html'),
  document({
    path: '/',
    title: 'Game Gift – Create Personalized Games as Gifts',
    description:
      'Create personalized interactive games with custom characters, photos, music, stories and memories for birthdays, anniversaries and special occasions.',
    body: homeBody,
    schema: [{ '@context': 'https://schema.org', '@graph': [organization, website, app] }],
  }),
);

for (const page of seoPages) {
  const graph = [
    {
      '@type': 'WebPage',
      name: page.h1,
      url: `${SITE_URL}${page.path}`,
      description: page.description,
    },
    breadcrumbs(page),
    {
      '@type': 'FAQPage',
      mainEntity: page.faqs.map(([name, text]) => ({
        '@type': 'Question',
        name,
        acceptedAnswer: { '@type': 'Answer', text },
      })),
    },
  ];
  await save(
    page.path,
    document({
      path: page.path,
      title: page.title,
      description: page.description,
      body: pageBody(page),
      schema: [{ '@context': 'https://schema.org', '@graph': graph }],
    }),
  );
}

const examplesBody = `<header><nav><a href="/">Game Gift</a> <a href="/studio">Create your game</a></nav></header><main><h1>Personalized Game Gift Examples</h1><p>Explore birthday adventures, story journeys for partners and arcade challenges for best friends. These sample directions use product screenshots and do not expose private user games.</p><article><h2>Birthday adventure</h2><p>Build chapters from shared places, favorite people and birthday wishes.</p></article><article><h2>A story for your partner</h2><p>Turn relationship memories into a gentle journey with a personal ending.</p></article><article><h2>Best-friend arcade challenge</h2><p>Make a playful challenge from inside jokes and familiar rivals.</p></article><a href="/studio">Create your game</a></main>`;
await save(
  '/examples',
  document({
    path: '/examples',
    title: 'Personalized Game Gift Examples | Game Gift',
    description:
      'Explore personalized game ideas for birthdays, partners, anniversaries, best friends and celebrations, then create your own playable gift.',
    body: examplesBody,
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Examples', item: `${SITE_URL}/examples` },
        ],
      },
    ],
  }),
);

const infoPages: [string, string, string, string][] = [
  [
    '/about',
    'About Game Gift',
    'Learn what Game Gift is and how the visual builder turns memories, characters and messages into personalized browser games.',
    'Game Gift helps people create a small playable world for someone they care about, without writing code. Creators customize a game, playtest it and publish only when it is ready.',
  ],
  [
    '/contact',
    'Contact Game Gift',
    'Find help with the Game Gift builder, published games, privacy concerns, reports and purchases.',
    'For account or purchase help, use the support details in your account or receipt. Published games include a report option for inappropriate content, copyright or privacy concerns.',
  ],
  [
    '/privacy',
    'Game Gift Privacy',
    'Learn how Game Gift handles account information, private drafts, uploaded media, published games and service providers.',
    'Google sign-in supplies basic account identity. Draft projects and media stay private until a creator publishes a game. Published games are accessible to anyone with their link. Creators can unpublish games and delete their account.',
  ],
  [
    '/terms',
    'Game Gift Terms',
    'Read the basic terms for responsible use of the Game Gift creator and published-game service.',
    'Only upload and publish content you have the right to use. Do not create unlawful, abusive, privacy-invasive or infringing games. Published games may be reported and disabled.',
  ],
];
for (const [route, title, description, copy] of infoPages)
  await save(
    route,
    document({
      path: route,
      title: `${title} | Game Gift`,
      description,
      body: `<header><nav><a href="/">Game Gift</a></nav></header><main><h1>${title}</h1><p>${copy}</p></main><footer><a href="/privacy">Privacy</a> <a href="/terms">Terms</a></footer>`,
    }),
  );

const privateDoc = document({
  path: '/studio',
  title: 'Game Gift Studio',
  description: 'Create and manage your personalized game gift.',
  robots: 'noindex, nofollow, noarchive',
  body: '<main aria-busy="true"><h1>Game Gift Studio</h1><p>Loading the private game creator…</p></main>',
}).replace(`<link rel="canonical" href="${SITE_URL}/studio">`, '');
await writeFile(path.join(dist, 'private.html'), privateDoc);

const sitemapRoutes = [
  '/',
  ...seoPages.map((p) => p.path),
  '/examples',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map((route) => `  <url><loc>${SITE_URL}${route === '/' ? '' : route}</loc></url>`).join('\n')}\n</urlset>\n`,
);
