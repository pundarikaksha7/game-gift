import { useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Gamepad2,
  Layers3,
  Menu,
  Music2,
  Play,
  Share2,
  Users,
  X,
} from 'lucide-react';

const modes = [
  {
    label: 'World explorer',
    title: 'Build a platform adventure',
    text: 'Shape open levels with moving platforms, rivals, power-ups and a finish portal.',
    image: '/screenshots/world-explorer.webp',
    alt: 'Gamegift World Explorer live preview with a hero, rival and platform level',
    color: 'clay',
  },
  {
    label: 'Story journey',
    title: 'Turn a message into a journey',
    text: 'Create a relaxed, combat-free game where each chapter reveals another part of your story.',
    image: '/screenshots/story-journey.webp',
    alt: 'Gamegift Story Journey live preview in a sunset level',
    color: 'blue',
  },
  {
    label: 'Arcade challenge',
    title: 'Make the challenge theirs',
    text: 'Tune movement and difficulty, add enemies and finish with a custom boss battle.',
    image: '/screenshots/arcade-challenge.webp',
    alt: 'Gamegift Arcade Challenge live preview in a midnight level',
    color: 'butter',
  },
];

const builderTools = [
  {
    icon: Users,
    title: 'Characters',
    text: 'Pick a cast, customize each look and choose their role.',
  },
  {
    icon: Layers3,
    title: 'Levels',
    text: 'Build chapters with themes, platforms, hazards and encounters.',
  },
  {
    icon: BookOpen,
    title: 'Story',
    text: 'Write the opening, chapter moments and final reveal in your voice.',
  },
  {
    icon: Music2,
    title: 'Sound & motion',
    text: 'Add music, effects and animation that fit the person you made it for.',
  },
];

const faqs = [
  {
    question: 'Do I need to know how to code?',
    answer:
      'No. Gamegift is a visual game builder. Start from a game mode, edit the story and world, then playtest as you build.',
  },
  {
    question: 'What can I personalize?',
    answer:
      'You can customize the title, recipient, characters, chapter themes, platforms, enemies, story, movement, sounds and animations.',
  },
  {
    question: 'How does someone play the finished gift?',
    answer:
      'Publish your game and send the link. It opens in a browser with keyboard and touch controls, so there is nothing to install.',
  },
];

function Wordmark() {
  return (
    <span className="wordmark-lockup">
      <span className="wordmark-star" aria-hidden="true">
        ✦
      </span>
      <span>gamegift</span>
    </span>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Gamegift home">
          <Wordmark />
        </a>
        <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
          <a href="#examples" onClick={() => setMenuOpen(false)}>
            Game examples
          </a>
          <a href="#builder" onClick={() => setMenuOpen(false)}>
            What you can build
          </a>
          <a href="#how" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>
            FAQ
          </a>
          <a className="nav-cta" href="/studio">
            Open the builder <ArrowUpRight size={16} />
          </a>
        </nav>
        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="kicker">
              <span className="kicker-dot" /> Personalized game maker
            </p>
            <h1>
              Build a game from
              <br />
              <em>your memories.</em>
            </h1>
            <p className="hero-sub">
              Gamegift is a no-code game builder for birthdays, anniversaries and every person who
              deserves more than another card. Create the characters, levels and story, then share a
              playable link.
            </p>
            <div className="hero-actions">
              <a className="button button-dark" href="/studio">
                Make a game gift <ArrowUpRight size={17} />
              </a>
              <a className="watch-button" href="#examples">
                <span className="play-icon">
                  <Play size={12} fill="currentColor" />
                </span>
                See real game previews
              </a>
            </div>
            <div className="hero-proof" aria-label="Gamegift highlights">
              <span>No coding</span>
              <span>Live playtesting</span>
              <span>Shareable game link</span>
            </div>
          </div>

          <div className="hero-preview" id="preview">
            <div className="preview-window">
              <div className="preview-bar">
                <span className="preview-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>LIVE GAME PREVIEW</span>
                <Gamepad2 size={16} />
              </div>
              <div className="preview-media">
                <img
                  className="preview-gif"
                  src="/screenshots/gameplay-preview.gif"
                  alt="Super Ananya, a personalized platform game with named characters and a custom IIT Guwahati level"
                  width="480"
                  height="270"
                  fetchPriority="high"
                />
                <img
                  className="preview-static"
                  src="/screenshots/gameplay-preview.webp"
                  alt=""
                  width="1280"
                  height="720"
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="preview-note note-story">Your story</div>
            <div className="preview-note note-cast">Your cast</div>
            <div className="preview-stamp">
              Made for
              <br />
              <strong>one person</strong>
            </div>
          </div>
        </section>

        <section className="product-strip" aria-label="Gamegift builder features">
          <div>
            characters <span>✦</span> levels <span>✦</span> story <span>✦</span> sounds{' '}
            <span>✦</span> animations <span>✦</span> playtesting <span>✦</span> characters
          </div>
        </section>

        <section className="examples-section" id="examples">
          <div className="section-heading">
            <div>
              <p className="section-label">01 / REAL GAME PREVIEWS</p>
              <h2>
                Start with a mode.
                <br />
                <em>Make every part yours.</em>
              </h2>
            </div>
            <p>
              These are live previews captured from Gamegift—not stock art or concept mockups. Each
              mode is fully editable in the same visual builder.
            </p>
          </div>

          <div className="feature-grid">
            {modes.map((mode) => (
              <article className={`feature-card ${mode.color}`} key={mode.title}>
                <div className="feature-image">
                  <div className="feature-media">
                    <img src={mode.image} alt={mode.alt} width="609" height="343" loading="lazy" />
                  </div>
                  <span>{mode.label}</span>
                </div>
                <h3>{mode.title}</h3>
                <p>{mode.text}</p>
                <a href="/studio" aria-label={`Build a ${mode.label} game`}>
                  Try this mode <ArrowUpRight size={17} />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="builder-section" id="builder">
          <div className="builder-heading">
            <p className="section-label">02 / THE GAMEGIFT BUILDER</p>
            <h2>
              The details make it
              <br />
              <em>their game.</em>
            </h2>
            <p>
              Build in the browser and watch every change appear in the live game preview beside
              your editor.
            </p>
          </div>
          <div className="tool-grid">
            {builderTools.map((tool) => (
              <article className="tool-card" key={tool.title}>
                <tool.icon size={22} aria-hidden="true" />
                <h3>{tool.title}</h3>
                <p>{tool.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="process-section" id="how">
          <div className="section-heading process-heading">
            <div>
              <p className="section-label">03 / HOW IT WORKS</p>
              <h2>
                From idea to
                <br />
                <em>playable gift.</em>
              </h2>
            </div>
            <p>No downloads and no code. Build, test and send the finished experience online.</p>
          </div>
          <ol className="steps">
            <li>
              <span>01</span>
              <div>
                <h3>Choose a game mode</h3>
                <p>Begin with an adventure, a story-led journey or an arcade challenge.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Personalize the world</h3>
                <p>Add your recipient, characters, chapters, memories, music and game rules.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Playtest and share</h3>
                <p>Try the full game, refine the details and publish a link they can play.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="faq-section" id="faq">
          <div>
            <p className="section-label">04 / QUESTIONS</p>
            <h2>
              Before you press
              <br />
              <em>start.</em>
            </h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-section">
          <div className="final-card">
            <div>
              <p className="kicker">
                <span className="kicker-dot" /> Ready when you are
              </p>
              <h2>
                Make their next gift
                <br />
                <em>playable.</em>
              </h2>
            </div>
            <div>
              <p>
                Open the Gamegift builder, choose a mode and create a little world that could only
                have come from you.
              </p>
              <a className="button button-light" href="/studio">
                Open the builder <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <a className="wordmark" href="#top" aria-label="Gamegift home">
          <Wordmark />
        </a>
        <p>Create personalized game gifts in your browser.</p>
        <div>
          <a href="#examples">Examples</a>
          <a href="#builder">Builder</a>
          <a href="#faq">FAQ</a>
          <a href="/studio">
            <Share2 size={13} /> Make a game
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
