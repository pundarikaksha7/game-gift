import { useEffect, useRef, useState } from 'react';
import {
  Gamepad2,
  Users,
  Layers3,
  BookOpen,
  Music2,
  WandSparkles,
  Settings2,
  ChevronRight,
  ChevronDown,
  Play,
  Upload,
  Undo2,
  Redo2,
  Grid2X2,
  Maximize2,
  Monitor,
  Check,
  ArrowUpRight,
  Sparkles,
  FolderOpen,
  LogOut,
  Download,
  History,
  Plus,
  Link,
  ExternalLink,
  ShieldCheck,
  LoaderCircle,
  Heart,
} from 'lucide-react';
import {
  gameSchema,
  applyProposal,
  type Game,
  type Project,
  type Proposal,
} from '../shared/schema';
import { createTemplate, createStarter, starters, type StarterId } from '../shared/template';
import { api } from './api';
import { GameCanvas } from './components/GameCanvas';
import { PlayGame } from './components/PlayModal';
import { Modal, Field, UploadButton } from './components/UI';
import {
  CharactersEditor,
  LevelsEditor,
  StoryEditor,
  SoundsEditor,
  AnimationsEditor,
  SettingsEditor,
} from './components/Editors';
const navigation = [
  { id: 'settings', label: 'Game settings', icon: Settings2 },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'levels', label: 'Levels', icon: Layers3 },
  { id: 'story', label: 'Story', icon: BookOpen },
  { id: 'sounds', label: 'Sounds', icon: Music2 },
  { id: 'animations', label: 'Animations', icon: WandSparkles },
  { id: 'review', label: 'Review & share', icon: Check },
] as const;
type Tab = (typeof navigation)[number]['id'];
type User = { id: string; name: string; email: string };
function initial() {
  try {
    const raw = localStorage.getItem('playcraft-draft-v2');
    return raw ? gameSchema.parse(JSON.parse(raw)) : createTemplate();
  } catch {
    return createTemplate();
  }
}
export default function App() {
  const [game, setGame] = useState<Game>(initial),
    [tab, setTab] = useState<Tab>('settings'),
    [level, setLevel] = useState(0),
    [grid, setGrid] = useState(false),
    [camera, setCamera] = useState(0),
    [placing, setPlacing] = useState(false),
    [user, setUser] = useState<User | null>(null),
    [project, setProject] = useState<Project | null>(null),
    [saved, setSaved] = useState(''),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(''),
    [modal, setModal] = useState<
      'templates' | 'play' | 'auth' | 'projects' | 'publish' | 'ai' | 'history' | 'account' | null
    >(null),
    [projects, setProjects] = useState<Project[]>([]),
    [versions, setVersions] = useState<{ revision: number; created_at: string }[]>([]),
    [authMode, setAuthMode] = useState<'register' | 'login'>('register'),
    [authError, setAuthError] = useState(''),
    [proposal, setProposal] = useState<Proposal | null>(null),
    [proposalBase, setProposalBase] = useState(''),
    [prompt, setPrompt] = useState(''),
    [googleEnabled, setGoogleEnabled] = useState(false),
    [aiEnabled, setAiEnabled] = useState(false),
    [registrationCodeRequired, setRegistrationCodeRequired] = useState(false),
    [undo, setUndo] = useState<Game[]>([]),
    [redo, setRedo] = useState<Game[]>([]);
  const [cloudUnavailable, setCloudUnavailable] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<(() => void) | null>(null);
  function switchSafely(action: () => void) {
    if (undo.length && dirty) setPendingSwitch(() => action);
    else action();
  }
  const [publicGame, setPublicGame] = useState<Game | null>(null),
    [publicError, setPublicError] = useState('');
  const publicId = location.pathname.startsWith('/play/') ? location.pathname.split('/')[2] : null;
  const draftEpoch = useRef(0);
  const gameRef = useRef(game);
  gameRef.current = game;
  const validRef = useRef(game);
  const validation = gameSchema.safeParse(game);
  if (validation.success) validRef.current = game;
  const [previewGame, setPreviewGame] = useState(game);
  useEffect(() => {
    if (!validation.success) return;
    const timer = setTimeout(() => setPreviewGame(game), 250);
    return () => clearTimeout(timer);
  }, [game]);
  const dirty = JSON.stringify(game) !== saved;
  const notify = (text: string) => setToast(text);
  useEffect(() => {
    if (publicId) {
      api(`/play/${publicId}`)
        .then((d) => setPublicGame(gameSchema.parse(d.game)))
        .catch((e) => setPublicError(e.message));
      return;
    }
    const oauthError = new URLSearchParams(location.search).get('authError');
    if (oauthError) {
      setAuthError(oauthError);
      setModal('auth');
      history.replaceState(null, '', location.pathname);
    }
    api('/auth/me')
      .then(async (d) => {
        setUser(d.user);
        try {
          const id = localStorage.getItem(`playcraft-last-${d.user.id}`);
          if (id) {
            const p = await api<Project>(`/projects/${id}`);
            load(p);
          }
        } catch {
          /* A removed project or unavailable storage leaves the guest template available. */
        }
      })
      .catch(() => {});
    api('/config')
      .then((d) => {
        setAiEnabled(d.aiEnabled);
        setGoogleEnabled(d.googleEnabled);
        setRegistrationCodeRequired(d.registrationCodeRequired);
      })
      .catch(() => setCloudUnavailable(true));
  }, [publicId]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (publicId || project || user) return;
    if (gameSchema.safeParse(game).success)
      try {
        localStorage.setItem('playcraft-draft-v2', JSON.stringify(game));
      } catch {
        notify('Browser storage is full. Export your game to keep a copy.');
      }
  }, [game, project, user, publicId]);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (user && dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [user, dirty]);
  function change(fn: (g: Game) => void) {
    const current = gameRef.current;
    const next = structuredClone(current);
    fn(next);
    setUndo((u) => [...u.slice(-39), current]);
    gameRef.current = next;
    setRedo([]);
    setGame(next);
  }
  function load(p: Project) {
    draftEpoch.current++;
    try {
      if (user) localStorage.setItem(`playcraft-last-${user.id}`, p.id);
    } catch {}
    setGame(p.game);
    setProject(p);
    setSaved(JSON.stringify(p.game));
    setUndo([]);
    setRedo([]);
    setLevel(0);
    setCamera(0);
    setModal(null);
  }
  async function save(): Promise<Project | undefined> {
    if (!user) {
      setModal('auth');
      return;
    }
    if (project && !dirty) return project;
    const parsed = gameSchema.safeParse(game);
    if (!parsed.success) {
      notify(parsed.error.issues.map((i) => i.message).join(' · '));
      return;
    }
    const epoch = draftEpoch.current;
    setBusy(true);
    try {
      const p = await api<Project>(project ? `/projects/${project.id}` : '/projects', {
        method: project ? 'PUT' : 'POST',
        body: JSON.stringify({ game, revision: project?.revision }),
      });
      if (epoch !== draftEpoch.current) return;
      setProject(p);
      try {
        localStorage.setItem(`playcraft-last-${user.id}`, p.id);
      } catch {}
      setSaved(JSON.stringify(game));
      notify('Your adventure is saved');
      return p;
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function showProjects() {
    if (!user) {
      setModal('auth');
      return;
    }
    setBusy(true);
    try {
      const data = await api('/projects');
      setProjects(data.projects);
      setModal('projects');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function showHistory() {
    if (!project) {
      notify('Save your game to start its version history.');
      return;
    }
    try {
      const d = await api(`/projects/${project.id}/revisions`);
      setVersions(d.revisions);
      setModal('history');
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function publish() {
    const p = await save();
    if (p) setModal('publish');
  }
  function exportGame() {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' }),
      url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${game.title.replace(/[^a-z0-9-]/gi, '-').slice(0, 60) || 'experience'}.playcraft.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Game data exported. Uploaded media remains on this server.');
  }
  function startProject(id: StarterId) {
    switchSafely(() => {
      draftEpoch.current++;
      setGame(createStarter(id));
      setProject(null);
      setSaved('');
      setUndo([]);
      setRedo([]);
      setLevel(0);
      setCamera(0);
      setTab('settings');
      setModal(null);
    });
  }
  const props = { game, change, notify, authed: !!user };
  if (publicId)
    return (
      <div className="public-page">
        <a className="brand" href="/">
          <span className="brand-mark">
            <Gamepad2 size={23} />
          </span>
          playcraft<span className="brand-dot">studio</span>
        </a>
        {publicGame ? (
          <>
            <h1>{publicGame.title}</h1>
            <p>{publicGame.description}</p>
            <PlayGame game={publicGame} />
            <p className="muted">
              A little world, made for {publicGame.recipient || 'you'} with <Heart size={12} />{' '}
              Playcraft.
            </p>
          </>
        ) : (
          <p role="status">{publicError || 'Opening your adventure…'}</p>
        )}
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <Gamepad2 size={22} />
          </span>
          playcraft<span className="brand-dot">studio</span>
        </a>
        <button className="workspace-picker" onClick={showProjects}>
          <span className="workspace-icon">{user?.name[0].toUpperCase() || 'P'}</span>
          <span>
            Creator workspace<small>Experience builder</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <span className="nav-label">YOUR WORKSPACE</span>
        <button className="nav-item project-nav" onClick={showProjects}>
          <FolderOpen size={18} />
          My games
          <ChevronRight size={14} />
        </button>
        <button className="nav-item" onClick={() => setModal('templates')}>
          <Plus size={18} />
          New experience
        </button>
        <div className="nav-divider" />
        <span className="nav-label">BUILD YOUR GAME</span>
        <nav>
          {navigation.map((n, index) => (
            <button
              key={n.id}
              className={`nav-item ${tab === n.id ? 'active' : ''}`}
              aria-current={tab === n.id ? 'page' : undefined}
              onClick={() => {
                setTab(n.id);
                setPlacing(false);
              }}
            >
              <n.icon size={18} aria-hidden="true" />
              {n.label}
              {n.id === 'characters' || n.id === 'levels' ? (
                <span className="nav-count">{game[n.id].length}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <button
          className="nav-item mobile-ai"
          aria-label="AI sidekick"
          onClick={() => setModal('ai')}
        >
          <Sparkles size={18} />
          AI sidekick
        </button>
        <button className="ai-card" onClick={() => setModal('ai')}>
          <span className="ai-card-icon">
            <Sparkles size={19} />
          </span>
          <strong>
            Creative assistant <ArrowUpRight size={15} />
          </strong>
          <p>
            Describe a change.
            <br />
            Review it before applying.
          </p>
          <span>
            Creative assistant <ChevronRight size={13} />
          </span>
        </button>
        <div className="sidebar-bottom">
          <span className="tiny-flower">✳</span>
          <p>
            Your ideas.
            <br />
            Playable.
          </p>
        </div>
        <button className="profile" onClick={() => (user ? showProjects() : setModal('auth'))}>
          <span className="avatar">{user?.name[0].toUpperCase() || 'Y'}</span>
          <span>
            {user?.name || 'Your creative space'}
            <small>{user ? 'Personal workspace' : 'Sign in to save & share'}</small>
          </span>
          <ChevronRight size={15} />
        </button>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>My games</span>
            <ChevronRight size={13} />
            <strong>{game.title}</strong>
            <span className="draft-badge">{project?.publishedId ? 'Published' : 'Draft'}</span>
          </div>
          <div className="top-actions">
            <span className="save-status">
              <span className={`status-dot ${project && dirty ? 'unsaved' : ''}`} />
              {project
                ? dirty
                  ? 'Unsaved changes'
                  : 'All changes saved'
                : user
                  ? 'Not saved yet'
                  : 'Saved on this browser'}
            </span>
            <button className="secondary save-button" disabled={busy} onClick={save}>
              {busy ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}Save
            </button>
            <button className="primary" disabled={busy || !validation.success} onClick={publish}>
              <Upload size={15} />
              Publish game
            </button>
          </div>
        </header>
        <main>
          {cloudUnavailable && (
            <div className="connection-notice" role="status">
              <span>
                Cloud services are unavailable. You can edit, playtest, and export your draft on
                this device.
              </span>
              <button onClick={() => location.reload()}>Reconnect</button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> EXPERIENCE BUILDER
              </div>
              <h1>
                Your next experience starts here<span>.</span>
              </h1>
              <p>Design, playtest, and publish interactive worlds from one workspace.</p>
            </div>
            <button
              className="help-link"
              onClick={() => {
                setModal('play');
              }}
            >
              Open playtest <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="project-strip">
            <span className="project-icon">
              <Gamepad2 size={21} />
            </span>
            <div>
              <strong>{game.title}</strong>
              <span>
                {game.levels.length} chapters <span>·</span> {game.characters.length} characters{' '}
                <span>·</span> {project ? `Version ${project.revision}` : 'New project'}
              </span>
            </div>
            <div className="project-tools">
              <button
                aria-label="Undo"
                className="icon-btn"
                disabled={!undo.length}
                onClick={() => {
                  setRedo((r) => [game, ...r]);
                  setGame(undo.at(-1)!);
                  setUndo(undo.slice(0, -1));
                  setLevel(0);
                }}
              >
                <Undo2 size={17} />
              </button>
              <button
                aria-label="Redo"
                className="icon-btn"
                disabled={!redo.length}
                onClick={() => {
                  setUndo([...undo, game]);
                  setGame(redo[0]);
                  setRedo(redo.slice(1));
                  setLevel(0);
                }}
              >
                <Redo2 size={17} />
              </button>
              <span />
              <button aria-label="Version history" className="icon-btn" onClick={showHistory}>
                <History size={17} />
              </button>
              <button aria-label="Export game data" className="icon-btn" onClick={exportGame}>
                <Download size={17} />
              </button>
            </div>
          </div>
          <div className="studio-grid">
            <section className="editor-panel">
              <div className="wizard-heading">
                <span>
                  STEP {navigation.findIndex((n) => n.id === tab) + 1} OF {navigation.length}
                </span>
                <strong>{navigation.find((n) => n.id === tab)?.label}</strong>
                <progress
                  aria-label="Builder progress"
                  value={navigation.findIndex((n) => n.id === tab) + 1}
                  max={navigation.length}
                />
              </div>
              <div className="editor-content">
                {tab === 'characters' ? (
                  <CharactersEditor {...props} />
                ) : tab === 'levels' ? (
                  <LevelsEditor
                    {...props}
                    level={Math.min(level, game.levels.length - 1)}
                    setLevel={(n) => {
                      setLevel(n);
                      setCamera(0);
                    }}
                    placing={placing}
                    setPlacing={setPlacing}
                  />
                ) : tab === 'story' ? (
                  <StoryEditor {...props} />
                ) : tab === 'sounds' ? (
                  <SoundsEditor {...props} />
                ) : tab === 'animations' ? (
                  <AnimationsEditor {...props} />
                ) : tab === 'review' ? (
                  <div className="form-card">
                    <h2>Ready for your first player?</h2>
                    <p>
                      {game.title} · {game.levels.length} chapters · {game.characters.length}{' '}
                      characters
                    </p>
                    <p>
                      Play every chapter, check your jumps and messages, then save and publish a
                      shareable link.
                    </p>
                    <button
                      className="secondary"
                      disabled={!validation.success}
                      onClick={() => setModal('play')}
                    >
                      Playtest from selected chapter
                    </button>
                    <button
                      className="primary"
                      disabled={busy || !validation.success}
                      onClick={publish}
                    >
                      Save & publish
                    </button>
                  </div>
                ) : (
                  <SettingsEditor {...props} />
                )}
              </div>
              <div className="wizard-actions">
                <button
                  className="secondary"
                  disabled={tab === 'settings'}
                  onClick={() => {
                    setTab(navigation[navigation.findIndex((n) => n.id === tab) - 1].id);
                    setPlacing(false);
                  }}
                >
                  Back
                </button>
                <span>Your draft stays with you between steps.</span>
                <button
                  className="primary"
                  disabled={tab === 'review' || !validation.success}
                  onClick={() => {
                    setTab(navigation[navigation.findIndex((n) => n.id === tab) + 1].id);
                    setPlacing(false);
                  }}
                >
                  Next step <ChevronRight size={16} />
                </button>
              </div>
            </section>
            <aside className="preview-column">
              <div className="preview-panel">
                <div className="preview-heading">
                  <div>
                    <span className="live-dot" />
                    Live preview
                  </div>
                  <span>YOUR WORLD, COMING TO LIFE</span>
                </div>
                <div className={`preview-canvas ${placing ? 'placing' : ''}`}>
                  <GameCanvas
                    game={previewGame}
                    levelIndex={level}
                    camera={camera}
                    grid={grid}
                    onPlatform={
                      placing
                        ? (x, y) => {
                            change((g) => {
                              const l = g.levels[level] || g.levels[0];
                              l.platforms.push({
                                id: crypto.randomUUID(),
                                x: Math.max(0, Math.min(l.width - 180, Math.round(x / 10) * 10)),
                                y: Math.max(160, Math.min(440, Math.round(y / 10) * 10)),
                                width: 180,
                                motion: 'none',
                              });
                            });
                            setPlacing(false);
                          }
                        : undefined
                    }
                  />
                  <span className="preview-level">
                    CHAPTER {String(level + 1).padStart(2, '0')}{' '}
                    <span>{game.levels[level]?.name}</span>
                  </span>
                </div>
                <div className="preview-toolbar">
                  <span>
                    <Monitor size={14} /> Desktop <ChevronDown size={12} />
                  </span>
                  <div>
                    <button
                      className={`icon-btn ${grid ? 'toggled' : ''}`}
                      aria-label="Toggle grid"
                      onClick={() => setGrid(!grid)}
                    >
                      <Grid2X2 size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Expand playtest"
                      onClick={() => setModal('play')}
                    >
                      <Maximize2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="preview-assets" aria-label="Character asset preview">
                  {game.characters.map((c) => (
                    <button key={c.id} onClick={() => setTab('characters')}>
                      <span className="asset-avatar" style={{ color: c.color }}>
                        {c.sprite ? <img src={c.sprite} alt={c.name} /> : <Users size={26} />}
                      </span>
                      <span>{c.name}</span>
                      <small>{c.role}</small>
                    </button>
                  ))}
                </div>
                <div className="preview-bottom">
                  <button
                    className="play-button"
                    onClick={() => setModal('play')}
                    disabled={!validation.success}
                  >
                    <Play size={16} fill="currentColor" />
                    Playtest your game
                  </button>
                  <span>Keyboard and touch controls supported.</span>
                </div>
                {
                  <div className="world-scroll">
                    <Field label="Explore the world">
                      <input
                        type="range"
                        min={0}
                        max={Math.max(0, (game.levels[level] || game.levels[0]).width - 960)}
                        value={camera}
                        onChange={(e) => setCamera(Number(e.target.value))}
                      />
                    </Field>
                  </div>
                }
              </div>
              <div className="chapter-switch">
                <span>JUMP TO CHAPTER</span>
                <div>
                  {game.levels.map((l, i) => (
                    <button
                      key={l.id}
                      title={l.name}
                      className={level === i ? 'active' : ''}
                      onClick={() => {
                        setLevel(i);
                        setCamera(0);
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tip-card">
                <span>✧</span>
                <div>
                  <h3>Build. Play. Refine.</h3>
                  <p>
                    Start with a template, customize every chapter, and test the full journey before
                    publishing.
                  </p>
                </div>
              </div>
              <div className="safety-note">
                <ShieldCheck size={15} />
                <span>Your latest 100 saved versions are available in history.</span>
              </div>
              {!validation.success && (
                <div className="validation-error" role="alert">
                  <strong>A few things need a tweak</strong>
                  {validation.error.issues.map((i, n) => (
                    <p key={n}>
                      {i.path.join(' → ')}: {i.message}
                    </p>
                  ))}
                  <small>The preview shows your last valid changes.</small>
                </div>
              )}
            </aside>
          </div>
          <footer className="studio-footer">
            <span>
              <Heart size={12} /> Playcraft Studio
            </span>
            <span>Create something worth playing.</span>
          </footer>
        </main>
      </div>
      {modal === 'templates' && (
        <Modal title="Create an experience" onClose={() => setModal(null)} wide>
          <p className="modal-copy">
            Choose a starting point. Every character, chapter, and rule is yours to change.
          </p>
          <div className="template-grid">
            {starters.map((starter) => (
              <button
                className="template-card"
                key={starter.id}
                onClick={() => startProject(starter.id)}
              >
                <div className={`template-art ${starter.theme}`}>
                  <span />
                  <i />
                  <Gamepad2 size={44} />
                  <b>{starter.tag}</b>
                </div>
                <strong>{starter.name}</strong>
                <p>{starter.description}</p>
                <span>
                  Use template <ArrowUpRight size={15} />
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {pendingSwitch && (
        <Modal title="Save your changes?" onClose={() => setPendingSwitch(null)}>
          <p className="modal-copy">
            You have unsaved changes. Save them before opening another adventure.
          </p>
          <button
            className="primary full-width"
            disabled={busy}
            onClick={async () => {
              const p = await save();
              if (p) {
                pendingSwitch();
                setPendingSwitch(null);
              }
            }}
          >
            Save and continue
          </button>
          <button
            className="text-button"
            onClick={() => {
              pendingSwitch();
              setPendingSwitch(null);
            }}
          >
            Continue without saving
          </button>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {modal === 'play' && (
        <Modal title="Playtest experience" wide onClose={() => setModal(null)}>
          <PlayGame
            game={validRef.current}
            startLevel={Math.min(level, validRef.current.levels.length - 1)}
          />
        </Modal>
      )}
      {modal === 'auth' && (
        <Modal
          title={authMode === 'register' ? 'Your creative space awaits' : 'Welcome back'}
          onClose={() => setModal(null)}
        >
          <p className="modal-copy">
            Save your worlds, upload your own art, and share a game made just for them.
          </p>
          {googleEnabled && (
            <p className="modal-copy">
              For a new Google account, choose a recovery password below. You can use it for account
              settings and password sign-in.
            </p>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setAuthError('');
              setBusy(true);
              const data = Object.fromEntries(new FormData(e.currentTarget));
              try {
                const result = await api(`/auth/${authMode}`, {
                  method: 'POST',
                  body: JSON.stringify(data),
                });
                setUser(result.user);
                setModal(null);
                notify('Signed in. Save your adventure whenever you’re ready.');
              } catch (e) {
                setAuthError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {googleEnabled && (
              <button
                type="button"
                className="secondary full-width"
                disabled={busy}
                onClick={async (e) => {
                  const data = new FormData(e.currentTarget.form!);
                  setBusy(true);
                  setAuthError('');
                  try {
                    const result = await api('/auth/google/start', {
                      method: 'POST',
                      body: JSON.stringify(
                        authMode === 'register'
                          ? {
                              password: data.get('password'),
                              registrationCode: data.get('registrationCode') || undefined,
                            }
                          : {},
                      ),
                    });
                    location.assign(result.url);
                  } catch (err) {
                    setAuthError((err as Error).message);
                    setBusy(false);
                  }
                }}
              >
                Continue with Google
              </button>
            )}
            {authMode === 'register' && (
              <Field label="Your name">
                <input name="name" required maxLength={60} autoComplete="name" />
              </Field>
            )}
            {authMode === 'register' && registrationCodeRequired && (
              <Field label="Invitation code" hint="Ask the site owner for an invitation.">
                <input
                  name="registrationCode"
                  type="password"
                  required
                  maxLength={256}
                  autoComplete="off"
                />
              </Field>
            )}
            <Field label="Email address">
              <input name="email" type="email" required autoComplete="email" />
            </Field>
            <Field label="Password" hint="At least 10 characters.">
              <input
                name="password"
                type="password"
                minLength={10}
                maxLength={128}
                required
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              />
            </Field>
            {authError && (
              <p className="error" role="alert">
                {authError}
              </p>
            )}
            <button className="primary full-width" disabled={busy}>
              {busy ? 'One moment…' : authMode === 'register' ? 'Create your account' : 'Sign in'}
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setAuthMode(authMode === 'register' ? 'login' : 'register');
              setAuthError('');
            }}
          >
            {authMode === 'register'
              ? 'Already have an account? Sign in'
              : 'New here? Create an account'}
          </button>
        </Modal>
      )}
      {modal === 'projects' && (
        <Modal title="Your projects" onClose={() => setModal(null)}>
          <p className="modal-copy">Save your current changes before switching projects.</p>
          <button className="primary full-width" onClick={() => setModal('templates')}>
            <Plus size={16} />
            New experience
          </button>
          <div className="projects-list">
            {projects.length === 0 ? (
              <p className="empty-state">No saved projects yet. Save your draft to see it here.</p>
            ) : (
              projects.map((p) => (
                <div key={p.id}>
                  <button className="project-open" onClick={() => switchSafely(() => load(p))}>
                    <span className="project-icon">
                      <Gamepad2 size={20} />
                    </span>
                    <div>
                      <strong>{p.game.title}</strong>
                      <small>
                        Version {p.revision} · {new Date(p.updatedAt).toLocaleDateString()}
                      </small>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete “${p.game.title}” and its history? Its published link will stop working.`,
                        )
                      )
                        return;
                      setBusy(true);
                      try {
                        await api(`/projects/${p.id}`, { method: 'DELETE' });
                        setProjects((previous) => previous.filter((item) => item.id !== p.id));
                        if (project?.id === p.id) {
                          setProject(null);
                          setSaved('');
                        }
                        notify('Game deleted');
                      } catch (error) {
                        notify((error as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Delete game
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="modal-bottom">
            <button className="text-button" onClick={() => setModal('account')}>
              Account settings
            </button>
            <UploadButton
              label="Import game data"
              accept="application/json,.json"
              onFile={async (f) => {
                try {
                  if (f.size > 1024 * 1024) throw new Error('Game data must be under 1 MB');
                  const imported = gameSchema.parse(JSON.parse(await f.text()));
                  change((g) => Object.assign(g, imported));
                  setLevel(0);
                  setModal(null);
                  notify('Game data imported into your current draft');
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            />
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await api('/auth/logout', { method: 'POST' });
                  setUser(null);
                  setProject(null);
                  setSaved('');
                  setGame(initial());
                  setLevel(0);
                  setUndo([]);
                  setRedo([]);
                  setModal(null);
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </Modal>
      )}
      {modal === 'account' && user && (
        <Modal title="Account settings" onClose={() => setModal(null)}>
          <p className="modal-copy">
            {user.email}. Changing your password signs out your other sessions. If you cannot sign
            in, contact the site owner for account recovery.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              setBusy(true);
              try {
                await api('/auth/password', {
                  method: 'POST',
                  body: JSON.stringify(Object.fromEntries(new FormData(form))),
                });
                form.reset();
                notify('Password changed. Other sessions have been signed out.');
              } catch (error) {
                notify((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Current password">
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                minLength={10}
                maxLength={128}
                required
              />
            </Field>
            <Field label="New password">
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
              />
            </Field>
            <button className="primary" disabled={busy}>
              Change password
            </button>
          </form>
          <hr />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !window.confirm(
                  'Permanently delete your account, all games, published links, and uploaded media? This cannot be undone.',
                )
              )
                return;
              setBusy(true);
              try {
                await api('/auth/account', {
                  method: 'DELETE',
                  body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
                });
                try {
                  localStorage.removeItem(`playcraft-last-${user.id}`);
                } catch {
                  /* Storage may be disabled. */
                }
                setUser(null);
                setProject(null);
                setProjects([]);
                setGame(createTemplate());
                setSaved('');
                setUndo([]);
                setRedo([]);
                setLevel(0);
                setModal(null);
                notify('Account deleted. Uploaded files will be removed within a few minutes.');
              } catch (error) {
                notify((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Confirm password to delete account">
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                minLength={10}
                maxLength={128}
              />
            </Field>
            <button className="text-button" disabled={busy}>
              Delete account permanently
            </button>
          </form>
        </Modal>
      )}
      {modal === 'publish' && project && (
        <Modal title="Publish your experience" onClose={() => setModal(null)}>
          <div className="publish-art">
            <Gamepad2 size={45} />
            <span>✦</span>
          </div>
          <h3 className="center">{game.title}</h3>
          <p className="modal-copy center">
            Publish a playable link. Anyone with the link can play and access its media. Your next
            edits stay private until you publish again.
          </p>
          <button
            className="primary full-width"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const d = await api(`/projects/${project.id}/publish`, {
                  method: 'POST',
                  body: JSON.stringify({ revision: project.revision }),
                });
                setProject({ ...project, publishedId: d.publishedId });
                notify('Your game is published. The adventure is ready to share.');
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Upload size={16} />
            {project.publishedId ? 'Update published game' : 'Publish this adventure'}
          </button>
          {project.publishedId && (
            <>
              <div className="share-link">
                <input
                  readOnly
                  aria-label="Published game link"
                  value={`${location.origin}/play/${project.publishedId}`}
                />
                <button
                  className="icon-btn"
                  aria-label="Copy game link"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(`${location.origin}/play/${project.publishedId}`)
                      .then(() => notify('Link copied'))
                      .catch(() => notify('Select and copy the link above.'))
                  }
                >
                  <Link size={16} />
                </button>
                <a
                  href={`/play/${project.publishedId}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open published game"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
              <button
                className="text-button danger"
                onClick={async () => {
                  try {
                    await api(`/projects/${project.id}/publish`, { method: 'DELETE' });
                    setProject({ ...project, publishedId: null });
                    notify('Game unpublished');
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                Unpublish game
              </button>
            </>
          )}
        </Modal>
      )}
      {modal === 'history' && (
        <Modal title="Version history" onClose={() => setModal(null)}>
          <p className="modal-copy">
            Restore a previous save into your draft. Save it to create a new version.
          </p>
          <div className="projects-list">
            {versions.map((v) => (
              <button
                key={v.revision}
                onClick={async () => {
                  try {
                    const d = await api(`/projects/${project!.id}/revisions/${v.revision}`);
                    change((g) => Object.assign(g, gameSchema.parse(d.game)));
                    setLevel(0);
                    setModal(null);
                    notify(`Version ${v.revision} restored to draft`);
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                <History size={20} />
                <div>
                  <strong>Version {v.revision}</strong>
                  <small>{new Date(v.created_at).toLocaleString()}</small>
                </div>
                <span>Restore</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === 'ai' && (
        <Modal title="Creative assistant" onClose={() => setModal(null)}>
          <p className="modal-copy">
            Describe the feeling. Get a proposal. You decide what becomes part of your world.
          </p>
          {!aiEnabled && (
            <div className="ai-notice">
              AI isn’t connected yet. Your server administrator can enable it with an API key and
              model. All manual editors are ready to use.
            </div>
          )}
          <Field label="What are you imagining?">
            <textarea
              rows={4}
              maxLength={2000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Make the first chapter a dreamy sunset, give our hero a floaty jump, and write a surprising final chapter…"
            />
          </Field>
          <div className="prompt-chips">
            {[
              'Make the game easier',
              'Give the story a space exploration theme',
              'Turn the first level into midnight',
            ].map((s) => (
              <button key={s} onClick={() => setPrompt(s)}>
                {s}
              </button>
            ))}
          </div>
          <button
            className="primary full-width"
            disabled={busy || !aiEnabled || prompt.length < 4 || !validation.success}
            onClick={async () => {
              if (!user) {
                setModal('auth');
                return;
              }
              setBusy(true);
              setProposal(null);
              try {
                const d = await api<Proposal>('/ai/propose', {
                  method: 'POST',
                  body: JSON.stringify({ game, prompt }),
                });
                applyProposal(game, d);
                setProposal(d);
                setProposalBase(JSON.stringify(game));
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Sparkles size={16} />
            {busy ? 'Dreaming up your changes…' : 'Suggest changes'}
          </button>
          {proposal && (
            <div className="proposal">
              <h3>{proposal.summary}</h3>
              <ul>
                {proposal.changes.map((c, i) => (
                  <li key={i}>
                    <code>{c.path}</code>
                    <span>→ {String(c.value)}</span>
                  </li>
                ))}
              </ul>
              <button
                className="primary full-width"
                onClick={() => {
                  try {
                    if (proposalBase !== JSON.stringify(game))
                      throw new Error('Your draft has changed. Generate a fresh proposal.');
                    const next = applyProposal(game, proposal);
                    change((g) => Object.assign(g, next));
                    setProposal(null);
                    setModal(null);
                    notify('Proposal applied. Playtest it, or undo at any time.');
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                <Check size={15} />
                Apply {proposal.changes.length} reviewed changes
              </button>
            </div>
          )}
          <p className="safety-note">
            <ShieldCheck size={16} />
            Validated game changes. No arbitrary code execution.
          </p>
        </Modal>
      )}
    </div>
  );
}
