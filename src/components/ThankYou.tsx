import { useState } from 'react';
import { ExternalLink, Gamepad2, Link, Share2 } from 'lucide-react';

/** Only same-site play links are accepted, so this page cannot be used as an open redirect. */
export function publishedLinkFrom(search: string) {
  const play = new URLSearchParams(search).get('play') || '';
  return /^\/play\/[^/?#\\]+\/[^/?#\\]+$/.test(play) ? play : null;
}

export function ThankYou() {
  const path = publishedLinkFrom(location.search);
  const link = path ? `${location.origin}${path}` : '';
  const [status, setStatus] = useState('');
  return (
    <main className="public-page thank-you">
      <a className="brand" href="/">
        <span className="brand-mark">✦</span>
        <span className="brand-word">
          game<span>gift</span>
        </span>
      </a>
      <div className="publish-art">
        <Gamepad2 size={45} />
        <span>✦</span>
      </div>
      <h1>{path ? 'Your game gift is live' : 'Find your share link'}</h1>
      {path ? (
        <>
          <p>
            Send this link to the person it's for. They can play in any modern browser, with nothing
            to install. Edits you make next stay private until you publish again.
          </p>
          <div className="share-link">
            <input readOnly aria-label="Published game link" value={link} />
            <button
              className="icon-btn"
              aria-label="Copy game link"
              onClick={() =>
                navigator.clipboard
                  .writeText(link)
                  .then(() => setStatus('Link copied'))
                  .catch(() => setStatus('Select and copy the link above.'))
              }
            >
              <Link size={16} />
            </button>
          </div>
          <div className="thank-you-actions">
            {'share' in navigator ? (
              <button
                className="primary"
                onClick={() =>
                  navigator.share({ title: 'A game made for you', url: link }).catch(() => {})
                }
              >
                <Share2 size={15} />
                Share link
              </button>
            ) : null}
            <a className="secondary" href={path} target="_blank" rel="noreferrer">
              <ExternalLink size={15} />
              Play it yourself
            </a>
            <a className="secondary" href="/studio">
              Back to the studio
            </a>
          </div>
        </>
      ) : (
        <>
          <p>Find the share link for any published game under My games in the studio.</p>
          <div className="thank-you-actions">
            <a className="primary" href="/studio">
              Open the studio
            </a>
          </div>
        </>
      )}
      <p role="status">{status}</p>
    </main>
  );
}
