import {
  Accordion,
  AppBar,
  Badge,
  Button,
  Card,
  Container,
  Eyebrow,
  Grid,
  Heading,
  HStack,
  Image,
  Paragraph,
  Section,
  Stack,
  Surface,
  VStack,
} from '@flowstack-ui/brick';
import '@flowstack-ui/brick/reset.css';
import '@flowstack-ui/brick/styles.css';
import {
  ArrowRight,
  BookOpen,
  Check,
  Gamepad2,
  Gift,
  Layers3,
  Menu,
  Music2,
  Play,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';

const modes = [
  {
    label: 'Best for birthdays',
    eyebrow: 'World explorer',
    title: 'Build a platform adventure',
    text: 'Turn shared places, inside jokes and favorite people into a world they can explore.',
    image: '/screenshots/world-explorer.webp',
    alt: 'Personalized platform adventure with a hero, rival and custom level',
    className: 'mode-coral',
  },
  {
    label: 'Easy & heartfelt',
    eyebrow: 'Story journey',
    title: 'Tell your story in chapters',
    text: 'Create a relaxed journey where every checkpoint reveals a memory or message.',
    image: '/screenshots/story-journey.webp',
    alt: 'Story-led personalized game set in a sunset world',
    className: 'mode-blue',
  },
  {
    label: 'For competitive friends',
    eyebrow: 'Arcade challenge',
    title: 'Make a challenge only they can beat',
    text: 'Tune the difficulty, add rivals and finish with a custom final showdown.',
    image: '/screenshots/arcade-challenge.webp',
    alt: 'Arcade-style personalized game set in a midnight level',
    className: 'mode-yellow',
  },
];

const tools = [
  [
    Users,
    'Cast the people they love',
    'Choose characters, customize their look and give everyone a role.',
  ],
  [
    Layers3,
    'Recreate your places',
    'Build chapters inspired by trips, campus, home or somewhere only you know.',
  ],
  [
    BookOpen,
    'Write in your voice',
    'Add memories, jokes and a final message that lands at exactly the right moment.',
  ],
  [
    Music2,
    'Set the feeling',
    'Choose music, sound effects and motion that make the whole gift feel alive.',
  ],
] as const;

const faqs = [
  [
    'Do I need to know how to code?',
    'Not at all. Pick a starting mode, then edit the people, story and world with simple visual controls.',
  ],
  [
    'How long does it take?',
    'You can make a thoughtful first version in about 15 minutes. Add more chapters and detail whenever you want.',
  ],
  [
    'Can I try it before sharing?',
    'Yes. Live playtesting stays beside the editor, so you can play every change before anyone else sees it.',
  ],
  [
    'How do they receive it?',
    'Publish when it feels right and send the private game link. It opens in a browser on desktop or mobile—nothing to install.',
  ],
];

function Wordmark() {
  return (
    <span className="brand-lockup">
      <span className="brand-gem" aria-hidden="true">
        ✦
      </span>
      <span className="brand-word">
        game<span>gift</span>
      </span>
    </span>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="landing-shell" data-brick-appearance="light">
      <AppBar.Root className="landing-header" variant="surface" bordered blurred>
        <Container measure="wide" gutter="lg">
          <AppBar.Toolbar className="landing-toolbar" inset="none">
            <AppBar.Start>
              <a className="brand-link" href="#top" aria-label="Gamegift home">
                <Wordmark />
              </a>
            </AppBar.Start>
            <AppBar.Center>
              <nav
                className={menuOpen ? 'landing-nav is-open' : 'landing-nav'}
                aria-label="Main navigation"
              >
                <a href="/examples" onClick={() => setMenuOpen(false)}>
                  Examples
                </a>
                <a href="#personalize" onClick={() => setMenuOpen(false)}>
                  What you can make
                </a>
                <a href="#how" onClick={() => setMenuOpen(false)}>
                  How it works
                </a>
                <a href="#faq" onClick={() => setMenuOpen(false)}>
                  FAQ
                </a>
              </nav>
            </AppBar.Center>
            <AppBar.End>
              <Button
                className="desktop-cta"
                href="/studio"
                data-analytics="create_game_clicked"
                tone="accent"
                size="md"
                endIcon={<ArrowRight size={16} />}
              >
                Start creating
              </Button>
              <Button
                className="menu-button"
                variant="ghost"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X /> : <Menu />}
              </Button>
            </AppBar.End>
          </AppBar.Toolbar>
        </Container>
      </AppBar.Root>

      <main id="top">
        <Section className="hero" spacing={{ initial: 'lg', md: '2xl' }}>
          <Container measure="wide" gutter="lg">
            <Grid.Root columns={{ initial: 1, lg: 2 }} gap={{ initial: 10, lg: 14 }} align="center">
              <VStack gap={7} className="hero-copy">
                <Badge className="hero-badge" variant="soft" tone="accent">
                  <Sparkles size={14} /> The gift they get to play
                </Badge>
                <Heading
                  level={1}
                  variant={{ initial: 'display-sm', md: 'display-lg' }}
                  wrap="balance"
                >
                  Create a Personalized Game <span className="serif-accent">as a Gift.</span>
                </Heading>
                <Paragraph variant="body-lg" tone="secondary" className="hero-lede">
                  Build a one-of-one adventure for someone you love. Personalize the cast, world and
                  story—then send a link they’ll never expect.
                </Paragraph>
                <Stack
                  direction={{ initial: 'column', sm: 'row' }}
                  gap={3}
                  align={{ initial: 'stretch', sm: 'center' }}
                >
                  <Button href="/studio" data-analytics="create_game_clicked" tone="accent" size="lg" endIcon={<ArrowRight size={18} />}>
                    Make a game gift
                  </Button>
                  <Button
                    href="/examples"
                    variant="outline"
                    size="lg"
                    startIcon={<Play size={16} />}
                  >
                    Watch it come alive
                  </Button>
                </Stack>
                <HStack className="trust-row" as="ul" gap={4} wrap>
                  {['No coding', 'Start free', 'Share by link'].map((item) => (
                    <li key={item}>
                      <Check size={15} />
                      {item}
                    </li>
                  ))}
                </HStack>
              </VStack>
              <div className="hero-art" aria-label="Live personalized game preview">
                <div className="hero-art-backdrop" />
                <Surface.Root
                  className="game-window"
                  level="raised"
                  elevation="high"
                  radius="surface"
                >
                  <HStack className="window-bar" justify="between" align="center" gap={3}>
                    <HStack gap={2}>
                      <span className="window-dot" />
                      <span className="window-dot" />
                      <span className="window-dot" />
                    </HStack>
                    <span>LIVE PLAYTEST</span>
                    <Gamepad2 size={15} />
                  </HStack>
                  <Image.Root
                    className="game-image"
                    src="/screenshots/gameplay-preview.webp"
                    ratio={16 / 9}
                    frame="subtle"
                    radius="none"
                  >
                    <Image.Content
                      alt="A personalized Gamegift platform adventure in live playtest"
                      width={480}
                      height={270}
                      fetchPriority="high"
                    />
                    <Image.Fallback>Loading your adventure…</Image.Fallback>
                  </Image.Root>
                </Surface.Root>
                <div className="memory-chip chip-one">
                  <span>
                    Chapter 2<br />
                    <strong>3rd year in College 🌴</strong>
                  </span>
                </div>
                <div className="memory-chip chip-two">
                  <Gift size={18} />
                  <span>
                    Made just for
                    <br />
                    <strong>Ananya</strong>
                  </span>
                </div>
              </div>
            </Grid.Root>
          </Container>
        </Section>

        <div className="promise-rail" aria-label="Creation journey">
          <Container measure="wide" gutter="lg">
            <HStack as="ol" gap={2} justify="between">
              {[
                'Choose a starting point',
                'Make it personal',
                'Playtest together',
                'Send the surprise',
              ].map((item, index) => (
                <li key={item}>
                  <span>0{index + 1}</span>
                  {item}
                  {index < 3 && <ArrowRight size={14} aria-hidden="true" />}
                </li>
              ))}
            </HStack>
          </Container>
        </div>

        <Section id="examples" spacing="2xl">
          <Container measure="wide" gutter="lg">
            <VStack gap={10}>
              <div className="section-intro">
                <VStack gap={4}>
                  <Eyebrow tone="accent">Choose your starting point</Eyebrow>
                  <Heading level={2} variant="display-md" wrap="balance">
                    Start with their kind of fun.
                  </Heading>
                </VStack>
                <Paragraph variant="body-lg" tone="secondary">
                  Every mode is ready to play from the start. Pick the closest fit, then change
                  absolutely everything that makes it theirs.
                </Paragraph>
              </div>
              <Grid.Root as="ul" columns={{ initial: 1, md: 3 }} gap={5}>
                {modes.map((mode) => (
                  <Card.Root
                    as="li"
                    className={`mode-card ${mode.className}`}
                    key={mode.title}
                    size="lg"
                    variant="outline"
                  >
                    <Image.Root
                      className="mode-image"
                      src={mode.image}
                      ratio={609 / 343}
                      frame="subtle"
                      radius="lg"
                    >
                      <Image.Content alt={mode.alt} width={609} height={343} loading="lazy" />
                    </Image.Root>
                    <Card.Header className="mode-header">
                      <HStack justify="between" align="center" gap={3}>
                        <Eyebrow>{mode.eyebrow}</Eyebrow>
                        <Badge size="sm" variant="soft">
                          {mode.label}
                        </Badge>
                      </HStack>
                      <Card.Title className="mode-title" as="h3">
                        {mode.title}
                      </Card.Title>
                      <Card.Description className="mode-description">{mode.text}</Card.Description>
                    </Card.Header>
                    <Card.Footer className="mode-footer">
                      <Button href="/studio" variant="outline" endIcon={<ArrowRight size={16} />}>
                        Choose this mode
                      </Button>
                    </Card.Footer>
                  </Card.Root>
                ))}
              </Grid.Root>
              <Paragraph align="center" tone="muted">
                Not sure? Start with World explorer—you can switch direction any time.
              </Paragraph>
            </VStack>
          </Container>
        </Section>

        <Surface.Root className="personalize-band" tone="accent" radius="none">
          <Section id="personalize" spacing="2xl">
            <Container measure="wide" gutter="lg">
              <Grid.Root
                columns={{ initial: 1, lg: 2 }}
                gap={{ initial: 10, lg: 16 }}
                align="center"
              >
                <VStack gap={5} className="personalize-copy">
                  <Eyebrow tone="inherit">Made from the details only you know</Eyebrow>
                  <Heading level={2} variant="display-md" tone="inherit" wrap="balance">
                    This is where a template becomes{' '}
                    <span className="serif-accent">their world.</span>
                  </Heading>
                  <Paragraph variant="body-lg" tone="inherit">
                    Build beside a live preview, so every name, memory and tiny joke becomes
                    instantly playable.
                  </Paragraph>
                  <Button
                    className="personalize-action"
                    href="/studio"
                    size="lg"
                    variant="soft"
                    endIcon={<ArrowRight size={17} />}
                  >
                    Open the live builder
                  </Button>
                </VStack>
                <Grid.Root columns={{ initial: 1, sm: 2 }} gap={3}>
                  {tools.map(([Icon, title, text], index) => (
                    <Card.Root className="tool-card-new" key={title} variant="subtle">
                      <Card.Header className="tool-card-header">
                        <span className="tool-number">0{index + 1}</span>
                        <Icon size={23} />
                        <Card.Title className="tool-card-title" as="h3">
                          {title}
                        </Card.Title>
                        <Card.Description className="tool-card-description">
                          {text}
                        </Card.Description>
                      </Card.Header>
                    </Card.Root>
                  ))}
                </Grid.Root>
              </Grid.Root>
            </Container>
          </Section>
        </Surface.Root>

        <Section id="how" className="how-section" spacing="2xl">
          <Container measure="wide" gutter="lg">
            <VStack gap={10}>
              <div className="section-intro">
                <VStack gap={4}>
                  <Eyebrow tone="accent">A thoughtful gift, without the overwhelm</Eyebrow>
                  <Heading level={2} variant="display-md">
                    From blank page to “you made this?!”
                  </Heading>
                </VStack>
                <Paragraph variant="body-lg" tone="secondary">
                  A guided seven-step builder keeps you moving. Your work saves as you go, and
                  nothing is public until you say so.
                </Paragraph>
              </div>
              <Grid.Root as="ol" columns={{ initial: 1, md: 3 }} gap={4}>
                {[
                  [
                    '01',
                    'Pick the vibe',
                    'Choose a mode and name the game. You have a playable foundation immediately.',
                  ],
                  [
                    '02',
                    'Add the magic',
                    'Personalize the cast, memories, levels and soundtrack with guidance at every step.',
                  ],
                  [
                    '03',
                    'Play, polish, surprise',
                    'Test the full adventure, make the last tweaks and send their private link.',
                  ],
                ].map(([number, title, text]) => (
                  <li className="step-card" key={number}>
                    <span>{number}</span>
                    <Heading level={3} variant="title-md">
                      {title}
                    </Heading>
                    <Paragraph tone="secondary">{text}</Paragraph>
                  </li>
                ))}
              </Grid.Root>
            </VStack>
          </Container>
        </Section>

        <Section id="faq" className="faq-band" spacing="2xl">
          <Container measure="wide" gutter="lg">
            <Grid.Root columns={{ initial: 1, lg: 2 }} gap={{ initial: 8, lg: 16 }}>
              <VStack gap={4}>
                <Eyebrow tone="accent">Good to know</Eyebrow>
                <Heading level={2} variant="display-sm">
                  Questions before you press start?
                </Heading>
                <Paragraph tone="secondary">
                  The builder is designed for first-timers. You can explore before signing in.
                </Paragraph>
              </VStack>
              <Accordion.Root className="faq-accordion" type="multiple" defaultValue={['faq-0']}>
                {faqs.map(([question, answer], index) => (
                  <Accordion.Item value={`faq-${index}`} key={question}>
                    <Accordion.Header as="h3">
                      <Accordion.Trigger className="faq-trigger">
                        {question}
                        <Accordion.Indicator />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content landmark={false}>
                      <Accordion.ContentInner className="faq-content">
                        <Paragraph tone="secondary">{answer}</Paragraph>
                      </Accordion.ContentInner>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </Grid.Root>
          </Container>
        </Section>

        <Section spacing="lg">
          <Container measure="wide" gutter="lg">
            <Surface.Root
              className="final-cta"
              tone="accent"
              radius="surface"
              inset={{ initial: 'lg', md: '2xl' }}
            >
              <VStack align="center" gap={6}>
                <Badge variant="soft">Ready when you are</Badge>
                <Heading
                  level={2}
                  variant={{ initial: 'display-sm', md: 'display-md' }}
                  tone="inherit"
                  align="center"
                  wrap="balance"
                >
                  Make the gift they’ll talk about for years.
                </Heading>
                <Paragraph variant="body-lg" tone="inherit" align="center">
                  Your first playable version is closer than you think.
                </Paragraph>
                <Button href="/studio" size="xl" variant="soft" endIcon={<ArrowRight size={18} />}>
                  Start your game gift
                </Button>
              </VStack>
            </Surface.Root>
          </Container>
        </Section>
      </main>

      <footer className="landing-footer">
        <Container measure="wide" gutter="lg">
          <Stack
            direction={{ initial: 'column', md: 'row' }}
            gap={5}
            align={{ initial: 'start', md: 'center' }}
            justify="between"
          >
            <a className="brand-link" href="#top">
              <Wordmark />
            </a>
            <Paragraph tone="muted">A little world, made for one very important person.</Paragraph>
            <HStack gap={5}>
              <a href="/examples">Examples</a>
              <a href="#faq">FAQ</a>
              <a href="/personalized-game-gift">Gift ideas</a>
              <a href="/about">About</a>
              <a href="/privacy">Privacy</a>
              <a href="/studio">Start creating</a>
            </HStack>
          </Stack>
        </Container>
      </footer>
    </div>
  );
}
