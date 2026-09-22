import { ArrowRight, Check, Gamepad2, Gift, Music2, Sparkles } from 'lucide-react';
import { giftGuides, guideByPath, type GiftGuide } from './gift-guides';
import { labels, pageByPath, type SeoPage } from './seo';
import { Brand } from './components/Brand';

const featureIcons = [Gamepad2, Gift, Music2];

function Header() {
  return (
    <header className="seo-header">
      <a className="seo-brand" href="/" aria-label="Game Gift home">
        <Brand />
      </a>
      <nav aria-label="Main navigation">
        <a href="/examples">Examples</a>
        <a href="/gift-ideas">Gift ideas</a>
        <a href="/personalized-game-gift">What you can make</a>
        <a className="seo-nav-cta" href="/studio" data-analytics="create_game_clicked">
          Create your game
        </a>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="seo-footer">
      <div>
        <a className="seo-brand" href="/">
          <Brand />
        </a>
        <p>Personalized browser games made from the stories you share.</p>
      </div>
      <nav aria-label="Gift ideas">
        <a href="/personalized-game-gift">Personalized game gift</a>
        <a href="/birthday-game-gift">Birthday game gift</a>
        <a href="/anniversary-game-gift">Anniversary game</a>
        <a href="/couples-game-gift">Couples game gift</a>
        <a href="/examples">Examples</a>
      </nav>
      <nav aria-label="Resources">
        <a href="/gift-ideas">Gift ideas</a>
        <a href="/gift-ideas/how-to-make-a-personalized-game">Making a game gift</a>
        <a href="/gift-ideas/digital-gift-ideas">Digital gift ideas</a>
      </nav>
      <nav aria-label="Company">
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </nav>
    </footer>
  );
}

function Breadcrumb({ current }: { current: string }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <a href="/">Home</a>
        </li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}

export function IntentPage({ page }: { page: SeoPage }) {
  return (
    <div className="seo-shell">
      <Header />
      <main>
        <section className="seo-hero">
          <Breadcrumb current={page.h1} />
          <div className="seo-hero-grid">
            <div>
              <p className="seo-eyebrow">
                <Sparkles size={16} />
                {page.eyebrow}
              </p>
              <h1>{page.h1}</h1>
              <p className="seo-lede">{page.intro}</p>
              <div className="seo-actions">
                <a className="seo-button" href="/studio" data-analytics="create_game_clicked">
                  Create your game <ArrowRight size={18} />
                </a>
                <a className="seo-button secondary" href="/examples">
                  See game examples
                </a>
              </div>
              <ul className="seo-checks">
                <li>
                  <Check />
                  No coding
                </li>
                <li>
                  <Check />
                  Live playtesting
                </li>
                <li>
                  <Check />
                  Share by link
                </li>
              </ul>
            </div>
            <img
              src="/screenshots/gameplay-preview.webp"
              width="1280"
              height="720"
              alt="A personalized platform game being played in Game Gift"
              fetchPriority="high"
            />
          </div>
        </section>
        <section className="seo-content" aria-label="About this gift">
          {page.sections.map((section, i) => {
            const Icon = featureIcons[i % featureIcons.length];
            return (
              <article key={section.title}>
                <Icon aria-hidden="true" />
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </article>
            );
          })}
        </section>
        <section className="seo-steps">
          <p className="seo-kicker">How Game Gift works</p>
          <h2>From your idea to a playable surprise</h2>
          <ol>
            <li>
              <span>1</span>
              <h3>Choose a starting mode</h3>
              <p>Begin with a playable world, story journey or arcade challenge.</p>
            </li>
            <li>
              <span>2</span>
              <h3>Add the personal details</h3>
              <p>Customize the characters, memories, levels, words and sound.</p>
            </li>
            <li>
              <span>3</span>
              <h3>Playtest and share</h3>
              <p>Try every chapter, publish when it is ready and send the link.</p>
            </li>
          </ol>
        </section>
        <section className="seo-faq">
          <div>
            <p className="seo-kicker">Good to know</p>
            <h2>Frequently asked questions</h2>
          </div>
          <div>
            {page.faqs.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="seo-related">
          <h2>Explore more gift ideas</h2>
          <div>
            {page.related.map((path) => (
              <a href={path} key={path}>
                {labels[path]} <ArrowRight size={16} />
              </a>
            ))}
          </div>
        </section>
        <section className="seo-final">
          <p>Start with a playable game. Make every detail theirs.</p>
          <h2>Create a gift they can step inside.</h2>
          <a className="seo-button light" href="/studio" data-analytics="create_game_clicked">
            Create your game <ArrowRight size={18} />
          </a>
        </section>
      </main>
      <Footer />
    </div>
  );
}

const examples = [
  [
    'Birthday adventure',
    'Turn favorite people, shared places and birthday wishes into a platform journey with a personal ending.',
    '/screenshots/world-explorer.webp',
  ],
  [
    'A story for your partner',
    'Build a gentler chapter-by-chapter experience around how you met, trips you remember and what comes next.',
    '/screenshots/story-journey.webp',
  ],
  [
    'Best-friend arcade challenge',
    'Create a faster challenge full of familiar rivals, inside jokes and a final message for your friend.',
    '/screenshots/arcade-challenge.webp',
  ],
];
export function ExamplesPage() {
  return (
    <div className="seo-shell">
      <Header />
      <main>
        <section className="seo-hero compact">
          <Breadcrumb current="Examples" />
          <p className="seo-eyebrow">
            <Sparkles size={16} />
            Ways to make it personal
          </p>
          <h1>Personalized Game Gift Examples</h1>
          <p className="seo-lede">
            Every Game Gift begins with a working game mode. These examples show different
            directions you can take without exposing anyone’s private game or personal information.
          </p>
        </section>
        <section className="example-grid">
          {examples.map(([title, body, image]) => (
            <article key={title}>
              <img
                src={image}
                width="609"
                height="343"
                loading="lazy"
                alt={`${title} example in Game Gift`}
              />
              <h2>{title}</h2>
              <p>{body}</p>
              <a href="/studio" data-analytics="create_game_clicked">
                Create this kind of game <ArrowRight size={16} />
              </a>
            </article>
          ))}
        </section>
        <section className="seo-final">
          <p>Your story will make the game unique.</p>
          <h2>Choose a starting point and make it yours.</h2>
          <a className="seo-button light" href="/studio">
            Create your game <ArrowRight size={18} />
          </a>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function GiftIdeasPage() {
  return (
    <div className="seo-shell">
      <Header />
      <main>
        <section className="seo-hero compact">
          <Breadcrumb current="Gift ideas" />
          <p className="seo-eyebrow">
            <Gift size={16} />
            Useful ideas, thoughtfully chosen
          </p>
          <h1>Personal Gift Ideas for the People You Know Best</h1>
          <p className="seo-lede">
            Practical guides for choosing gifts around a person, relationship and occasion—not a
            generic shopping list. Find ideas you can adapt, plus ways to turn shared memories into
            an interactive gift.
          </p>
        </section>
        <section className="guide-grid" aria-label="Gift idea guides">
          {giftGuides.map((guide) => (
            <article key={guide.path}>
              <p className="seo-kicker">Gift guide</p>
              <h2>{guide.h1}</h2>
              <p>{guide.description}</p>
              <a href={guide.path}>
                Read the guide <ArrowRight size={16} />
              </a>
            </article>
          ))}
        </section>
        <section className="seo-final">
          <p>Want to make the gift itself?</p>
          <h2>Turn your shared story into a game.</h2>
          <a className="seo-button light" href="/studio" data-analytics="create_game_clicked">
            Create your game <ArrowRight size={18} />
          </a>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function GiftGuidePage({ guide }: { guide: GiftGuide }) {
  return (
    <div className="seo-shell">
      <Header />
      <main>
        <article className="guide-article">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <ol>
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/gift-ideas">Gift ideas</a>
              </li>
              <li aria-current="page">{guide.h1}</li>
            </ol>
          </nav>
          <header>
            <p className="seo-eyebrow">
              <Sparkles size={16} />
              Thoughtful gifting guide
            </p>
            <h1>{guide.h1}</h1>
            <p className="seo-lede">{guide.intro}</p>
          </header>
          <div className="guide-body">
            {guide.sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
                {section.ideas ? (
                  <ul>
                    {section.ideas.map((idea) => (
                      <li key={idea}>{idea}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>
        <section className="seo-related">
          <h2>Keep exploring</h2>
          <div>
            {guide.related.map((path) => (
              <a href={path} key={path}>
                {labels[path] || guideByPath.get(path)?.h1 || 'Related guide'}
                <ArrowRight size={16} />
              </a>
            ))}
          </div>
        </section>
        <section className="seo-final">
          <p>A personal story can become something playable.</p>
          <h2>Build a game gift in your own words.</h2>
          <a className="seo-button light" href="/studio" data-analytics="create_game_clicked">
            Create your game <ArrowRight size={18} />
          </a>
        </section>
      </main>
      <Footer />
    </div>
  );
}

const info: Record<string, { h1: string; intro: string; sections: [string, string][] }> = {
  '/about': {
    h1: 'About Game Gift',
    intro:
      'Game Gift is a visual builder for turning memories, characters and messages into a personalized browser game.',
    sections: [
      [
        'Why it exists',
        'Some stories deserve more than a card or slideshow. Game Gift helps people make a small playable world for someone they care about, without needing to write code.',
      ],
      [
        'How it works',
        'Creators choose a game mode, customize the cast and story, playtest their work and publish a link when the gift is ready. Drafts stay private until the creator publishes them.',
      ],
    ],
  },
  '/contact': {
    h1: 'Contact Game Gift',
    intro: 'Need help with the builder, a published game, privacy or a payment?',
    sections: [
      [
        'Support',
        'Use the contact details shown in your Game Gift account or purchase receipt. If those are unavailable, contact the person who shared the Game Gift link so they can reach support from their creator account.',
      ],
      [
        'Report a published game',
        'Published games include a report option for inappropriate content, harassment, copyright or privacy concerns. Reports are reviewed by the service operator.',
      ],
    ],
  },
  '/privacy': {
    h1: 'Game Gift Privacy',
    intro:
      'This page explains the information Game Gift uses to provide creator accounts, saved projects and published games.',
    sections: [
      [
        'Account and project data',
        'Google sign-in supplies basic account identity. Game Gift also asks for and stores your name and age, along with projects, uploaded media, revision history and publication state, so creators can save, edit and share their work.',
      ],
      [
        'Published games',
        'Drafts are private. When a creator publishes a game, anyone with its link can access that published version and the media it uses. Do not include information or media you do not have permission to share.',
      ],
      [
        'Service providers',
        'Game Gift uses Supabase for authentication, database and private media storage. Production hosting may use Vercel and Render. Payment information, when checkout is enabled, is processed by Razorpay; Game Gift records order and payment status rather than card details.',
      ],
      [
        'Your choices',
        'Creators can unpublish games and delete their account from the application. Account deletion removes application records and queues associated stored media and authentication records for deletion.',
      ],
    ],
  },
  '/terms': {
    h1: 'Game Gift Terms',
    intro:
      'These basic terms describe responsible use of the Game Gift creator and published-game service.',
    sections: [
      [
        'Your content',
        'Only upload or publish text, images and audio you have the right to use. You are responsible for the games you create and share.',
      ],
      [
        'Acceptable use',
        'Do not use Game Gift for unlawful, abusive, harassing, privacy-invasive or infringing content, or to interfere with the service. Published games may be reported and disabled.',
      ],
      [
        'Availability and changes',
        'The service may change as the product develops. Keep your own copy of important material and playtest a game before sharing it.',
      ],
      [
        'Payments',
        'When paid publishing is enabled, the price and currency are shown before checkout. Payment status is verified with the payment provider before publishing access is granted. Any refund terms presented during checkout or in your receipt apply to that purchase.',
      ],
    ],
  },
};
export function InfoPage({ path }: { path: string }) {
  const page = info[path];
  return (
    <div className="seo-shell">
      <Header />
      <main>
        <section className="seo-hero compact">
          <Breadcrumb current={page.h1} />
          <h1>{page.h1}</h1>
          <p className="seo-lede">{page.intro}</p>
        </section>
        <section className="info-content">
          {page.sections.map(([h, b]) => (
            <section key={h}>
              <h2>{h}</h2>
              <p>{b}</p>
            </section>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function MarketingRoute() {
  const path = location.pathname.replace(/\/$/, '') || '/';
  const page = pageByPath.get(path);
  if (page) return <IntentPage page={page} />;
  if (path === '/examples') return <ExamplesPage />;
  if (path === '/gift-ideas') return <GiftIdeasPage />;
  const guide = guideByPath.get(path);
  if (guide) return <GiftGuidePage guide={guide} />;
  if (info[path]) return <InfoPage path={path} />;
  return null;
}
