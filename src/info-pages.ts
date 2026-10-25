export const SUPPORT_EMAIL = 'support@game-gift.shop';

export type InfoPage = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: [string, string][];
};

/** Shared by the React pages and the prerendered HTML so both always say the same thing. */
export const infoPages: Record<string, InfoPage> = {
  '/about': {
    title: 'About Game Gift',
    description:
      'Learn what Game Gift is and how the visual builder turns memories, characters and messages into personalized browser games.',
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
    title: 'Contact Game Gift',
    description:
      'Contact Game Gift support for help with the builder, published games, privacy requests, reports and payments.',
    h1: 'Contact Game Gift',
    intro: 'Need help with the builder, a published game, privacy or a payment?',
    sections: [
      [
        'Support',
        `Email ${SUPPORT_EMAIL} and include the email address you sign in with. For a published game, include its link. We aim to reply within two business days.`,
      ],
      [
        'Payments and refunds',
        `For a payment question or refund request, email ${SUPPORT_EMAIL} with your Razorpay payment ID from your receipt. See the refund policy for what qualifies.`,
      ],
      [
        'Report a published game',
        'Published games include a report option for inappropriate content, harassment, copyright or privacy concerns. Reports are reviewed by the service operator.',
      ],
    ],
  },
  '/privacy': {
    title: 'Game Gift Privacy',
    description:
      'Learn how Game Gift handles account information, private drafts, uploaded media, published games and service providers.',
    h1: 'Game Gift Privacy',
    intro:
      'This page explains the information Game Gift uses to provide creator accounts, saved projects and published games.',
    sections: [
      [
        'Account and project data',
        'Google sign-in supplies your name, email address and account identifier. Game Gift also asks for and stores your age, along with your projects, uploaded images and audio, recent version history and publication state, so you can save, edit and share your work.',
      ],
      [
        'Guest drafts',
        'If you build without signing in, your draft is kept only in your own browser storage. It is not sent to Game Gift until you sign in and save it.',
      ],
      [
        'Published games',
        'Drafts are private. When a creator publishes a game, anyone with its link can access that published version and the media it uses. Do not include information or media you do not have permission to share.',
      ],
      [
        'Service providers',
        'Game Gift uses Supabase for sign-in, the database and private media storage, and Vercel and Render for hosting. Razorpay processes payments when paid publishing is enabled; Game Gift records order and payment status, never card or bank details. Resend delivers account emails such as welcome, payment and publishing confirmations. If you use the optional creative assistant, the game content and request you send are sent to OpenAI to suggest changes, with response storage turned off.',
      ],
      [
        'Analytics and cookies',
        'Game Gift may record product events, such as visiting a page or starting a game, with PostHog to understand how the service is used. Analytics data is held in memory for the visit and does not set tracking cookies. Sign-in stores your session in your browser so you stay signed in.',
      ],
      [
        'Your choices',
        `You can unpublish games and delete your account from the application. Deleting your account removes your profile, games and version history, and queues your uploaded media and sign-in record for deletion. For any other privacy request, email ${SUPPORT_EMAIL}.`,
      ],
    ],
  },
  '/terms': {
    title: 'Game Gift Terms',
    description:
      'Read the terms for using the Game Gift creator, published games, payments and refunds.',
    h1: 'Game Gift Terms',
    intro:
      'These terms describe responsible use of the Game Gift creator and published-game service.',
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
        'When paid publishing is enabled, the price and currency are shown before checkout and payments are processed by Razorpay. Payment status is verified with Razorpay before publishing access is granted. Refunds follow the Game Gift refund policy.',
      ],
      ['Contact', `Questions about these terms can be sent to ${SUPPORT_EMAIL}.`],
    ],
  },
  '/refund-policy': {
    title: 'Game Gift Refund Policy',
    description:
      'Read when Game Gift refunds a paid publish, how to request a refund and how long refunds take.',
    h1: 'Refund Policy',
    intro:
      'Publishing a game is a one-time digital purchase for that game. This policy explains when you can get your money back.',
    sections: [
      [
        'Before you publish',
        'If you paid to publish a game but have not published it since paying, you can request a full refund within 7 days of payment.',
      ],
      [
        'After you publish',
        'Once the game has been published, the purchase has been delivered and is not refundable, including if you later unpublish or delete the game.',
      ],
      [
        'Payment problems',
        'If you were charged more than once for the same game, or you were charged but could not publish, we will refund the extra or failed payment at any time.',
      ],
      [
        'How to request a refund',
        `Email ${SUPPORT_EMAIL} from the address you sign in with and include your Razorpay payment ID. Approved refunds go back to the original payment method through Razorpay and usually arrive within 5–7 business days, depending on your bank.`,
      ],
    ],
  },
};
