import { useState } from 'react';
import { ArrowUpRight, Check, Menu, Play, Sparkles, X } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Gather the good stuff',
    text: 'Add photos, voice notes, inside jokes, keepsakes and the little details only you know.',
  },
  {
    number: '02',
    title: 'Shape the adventure',
    text: 'Turn your memories into a playable world with puzzles, quests and surprise reveals.',
  },
  {
    number: '03',
    title: 'Send them somewhere',
    text: 'Share a one-of-a-kind game they can keep, replay and pass around forever.',
  },
];

const featureCards = [
  { label: 'Memory map', title: 'Every detail has a place.', color: 'clay', art: 'map' },
  {
    label: 'Playable stories',
    title: 'Not just a message. A whole world.',
    color: 'blue',
    art: 'story',
  },
  { label: 'Made together', title: 'The gift is in the making.', color: 'butter', art: 'together' },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Gamegift home">
          <span className="wordmark-star">✦</span> gamegift
        </a>
        <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a href="#why">Why gamegift</a>
          <a href="#stories">Stories</a>
          <a href="#faq">FAQ</a>
          <a className="nav-cta" href="/studio">
            Make a game <ArrowUpRight size={15} />
          </a>
        </nav>
        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="kicker">
              <span className="kicker-dot" /> A new kind of keepsake
            </p>
            <h1>
              Give them a<br />
              <em>world</em> of your own.
            </h1>
            <p className="hero-sub">
              Gamegift turns your memories into a playable adventure — made for one person, and no
              one else.
            </p>
            <div className="hero-actions" id="start">
              <a className="button button-dark" href="/studio">
                Make your first game <ArrowUpRight size={17} />
              </a>
              <button className="watch-button" onClick={() => setDemoOpen(true)}>
                <span className="play-icon">
                  <Play size={12} fill="currentColor" />
                </span>{' '}
                See how it works
              </button>
            </div>
            <div className="trust-row">
              <div className="avatars">
                <span>J</span>
                <span>M</span>
                <span>A</span>
                <span>+</span>
              </div>
              <span>Loved by 2,400+ thoughtful people</span>
            </div>
          </div>
          <div className="hero-art" aria-label="A collage of personal memories and game pieces">
            <div className="art-sun" />
            <div className="art-note note-one">
              <span>
                for the
                <br />
                adventurer
              </span>
              <b>♥</b>
            </div>
            <div className="art-note note-two">
              press
              <br />
              <strong>start</strong>
            </div>
            <div className="photo-card">
              <img
                src="/hero-memory-collage.png"
                alt="A tactile collection of photographs and game keepsakes"
              />
            </div>
            <div className="art-sticker">
              made
              <br />
              <strong>with love</strong>
            </div>
            <div className="art-star">✦</div>
            <p className="art-caption">
              A little world,
              <br />
              <i>made for them.</i>
            </p>
          </div>
        </section>

        <section className="marquee" aria-label="Gamegift features">
          <div>
            memories <span>✦</span> inside jokes <span>✦</span> wild adventures <span>✦</span>{' '}
            little things <span>✦</span> memories <span>✦</span> inside jokes
          </div>
        </section>

        <section className="intro-section" id="why">
          <div className="section-label">01 / WHY GAMEGIFT</div>
          <div className="intro-content">
            <h2>
              The best gifts
              <br />
              <em>feel like you.</em>
            </h2>
            <div>
              <p>
                Some things are too personal for a card. Gamegift is a playful way to say{' '}
                <strong>“I know you.”</strong>
              </p>
              <p>
                Build an experience from the places, people, moments and wonderfully weird details
                that make your relationship yours.
              </p>
              <a className="text-link" href="#how">
                Discover the magic <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
        </section>

        <section className="feature-grid" id="stories">
          {featureCards.map((card, index) => (
            <article className={`feature-card ${card.color}`} key={card.title}>
              <div className={`feature-art ${card.art}`}>
                <span className="art-shape shape-one" />
                <span className="art-shape shape-two" />
                {index === 0 && (
                  <>
                    <span className="map-path" />
                    <span className="map-pin">♥</span>
                  </>
                )}
                {index === 1 && (
                  <>
                    <span className="story-window">✦</span>
                    <span className="story-character">⌁</span>
                  </>
                )}
                {index === 2 && (
                  <>
                    <span className="together-flower">✿</span>
                    <span className="together-note">you + me</span>
                  </>
                )}
              </div>
              <p>{card.label}</p>
              <h3>{card.title}</h3>
              <a href="#how" aria-label={`Learn about ${card.title}`}>
                <ArrowUpRight size={18} />
              </a>
            </article>
          ))}
        </section>

        <section className="process-section" id="how">
          <div className="section-label">02 / HOW IT WORKS</div>
          <div className="process-heading">
            <h2>
              Make something
              <br />
              <em>only you could make.</em>
            </h2>
            <p>
              No templates. No generic greetings. Just your memories, turned into a tiny universe.
            </p>
          </div>
          <div className="steps">
            {steps.map((step) => (
              <div className="step" key={step.number}>
                <span>{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="quote-section">
          <div className="quote-mark">“</div>
          <blockquote>
            It felt like giving them
            <br />
            <em>our whole story</em> back.
          </blockquote>
          <p>— Maya, made a birthday game for Sam</p>
          <div className="quote-doodle">✦</div>
        </section>

        <section className="final-section" id="faq">
          <div className="final-card">
            <div>
              <p className="kicker">
                <span className="kicker-dot" /> Your next gift is here
              </p>
              <h2>
                Make it
                <br />
                <em>unforgettable.</em>
              </h2>
            </div>
            <div>
              <p>
                Start with a memory. We’ll help you turn it into an adventure they’ll never see
                coming.
              </p>
              <a className="button button-light" href="/studio">
                Start making <ArrowUpRight size={17} />
              </a>
            </div>
            <Sparkles className="final-sparkle" size={42} />
          </div>
        </section>
      </main>

      <footer>
        <a className="wordmark" href="#top">
          <span className="wordmark-star">✦</span> gamegift
        </a>
        <p>Made for the people who mean everything.</p>
        <div>
          <a href="#how">How it works</a>
          <a href="#why">About</a>
          <a href="#faq">Help</a>
        </div>
      </footer>
      {demoOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDemoOpen(false)}>
          <div
            className="demo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setDemoOpen(false)} aria-label="Close">
              <X />
            </button>
            <div className="demo-screen">
              <Sparkles size={34} />
              <p>
                Every great game
                <br />
                <em>starts with a memory.</em>
              </p>
              <span>✦</span>
            </div>
            <h2 id="demo-title">A tiny preview of the magic.</h2>
            <p>Gather a moment, add a little imagination, and make it playable.</p>
            <button className="button button-dark" onClick={() => setDemoOpen(false)}>
              Got it <Check size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
