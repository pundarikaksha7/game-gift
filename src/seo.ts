export const SITE_URL = 'https://game-gift.shop';
export const OG_IMAGE = `${SITE_URL}/screenshots/gameplay-preview.webp`;

export type SeoPage = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  sections: { title: string; body: string }[];
  faqs: [string, string][];
  related: string[];
};

export const seoPages: SeoPage[] = [
  {
    path: '/personalized-game-gift',
    title: 'Personalized Game Gift – Build a Playable Surprise | Game Gift',
    description:
      'Create a personalized game gift with custom characters, memories, levels, music and a story, then share the finished surprise by link.',
    eyebrow: 'A gift made from your memories',
    h1: 'Create a Personalized Game Gift',
    intro:
      'Turn the people, places and stories you share into a browser game made for one important person. Game Gift gives you a visual builder, live playtesting and a private link to share when the surprise is ready.',
    sections: [
      {
        title: 'What makes the game personal?',
        body: 'Choose the cast, shape their look, write messages in your own voice and build chapters around shared memories. Add a soundtrack and tune the challenge so it feels right for the person receiving it.',
      },
      {
        title: 'A keepsake they can explore',
        body: 'Instead of opening one more image or card, your recipient moves through a world you made. Each checkpoint can reveal a memory, joke or message, with a final moment that brings the story together.',
      },
      {
        title: 'Make it without writing code',
        body: 'Start from a playable mode and customize it in seven guided steps. A live preview stays beside the editor, so you can test every change before publishing.',
      },
    ],
    faqs: [
      [
        'Can I add my own photos?',
        'Yes. You can upload images for supported character and story elements in the builder.',
      ],
      [
        'Can I add music?',
        'Yes. Choose from the included soundtrack options or upload supported audio.',
      ],
      [
        'How do I send the gift?',
        'Publish the finished game and share its browser link. The recipient does not need to install an app.',
      ],
    ],
    related: ['/birthday-game-gift', '/personalized-digital-gift', '/examples'],
  },
  {
    path: '/custom-video-game-gift',
    title: 'Custom Video Game Gift – Build Their Own Adventure | Game Gift',
    description:
      'Build a custom video game gift with a personalized hero, story, levels, music and final message. Playtest it and share the finished game by link.',
    eyebrow: 'A video game built around one person',
    h1: 'Build a Custom Video Game Gift',
    intro:
      'Give them a game where the hero, setting and story feel familiar from the first screen. Start with a working browser game, then reshape it around their personality and the memories you share.',
    sections: [
      {
        title: 'Make them the main character',
        body: 'Create a recognizable hero, add friends or rivals to the cast and choose the roles each person plays. The game feels personal because its characters come from their world.',
      },
      {
        title: 'Design a story they will recognize',
        body: 'Turn a favorite trip, running joke or shared milestone into levels and story beats. Use your own words for the messages between challenges and at the ending.',
      },
      {
        title: 'Start with a game that already works',
        body: 'Choose a platform adventure, story journey or arcade challenge, then customize and playtest it visually. You do not need to program the controls or game engine.',
      },
    ],
    faqs: [
      [
        'Do I have to build the game from scratch?',
        'No. You begin with a playable mode and personalize the parts that make the gift meaningful.',
      ],
      [
        'Can I change the difficulty?',
        'Yes. The builder includes mechanics and level controls that you can adjust while playtesting.',
      ],
      [
        'How does the recipient play?',
        'Send the published link. The finished game opens in a modern desktop or mobile browser.',
      ],
    ],
    related: [
      '/personalized-game-gift',
      '/examples',
      '/gift-ideas/how-to-make-a-personalized-game',
    ],
  },
  {
    path: '/birthday-game-gift',
    title: 'Birthday Game Gift – Make a Personalized Birthday Game | Game Gift',
    description:
      'Make a personalized birthday game with characters, photos, music, memories and a final birthday message. Build, playtest and share it online.',
    eyebrow: 'A birthday surprise they can play',
    h1: 'Make a Personalized Birthday Game',
    intro:
      'Build a birthday adventure around the moments that define your friendship or relationship. Turn trips, inside jokes, favorite people and birthday wishes into a game that unfolds one chapter at a time.',
    sections: [
      {
        title: 'Build the birthday story',
        body: 'Give the game a title, choose a hero and rival, and use levels to revisit meaningful places or funny moments. End with a personal birthday message rather than a generic win screen.',
      },
      {
        title: 'Choose their kind of fun',
        body: 'Use a platform adventure for an energetic surprise, a story journey for something warm and relaxed, or an arcade challenge for someone competitive.',
      },
      {
        title: 'Ready for the birthday reveal',
        body: 'Play the complete game before sharing, polish any tricky moments, then send the private link by message when it is time for the surprise.',
      },
    ],
    faqs: [
      [
        'How long does a birthday game take to make?',
        'A thoughtful first version can be made in about 15 minutes. More detailed chapters take longer.',
      ],
      [
        'Can it include a birthday message?',
        'Yes. You can write story text and a final message in your own words.',
      ],
      [
        'Will it work on a phone?',
        'Published games open in a modern browser and support keyboard and touch controls.',
      ],
    ],
    related: ['/game-for-girlfriend', '/game-for-boyfriend', '/examples'],
  },
  {
    path: '/game-for-girlfriend',
    title: 'Personalized Game for Your Girlfriend – A Playable Gift | Game Gift',
    description:
      'Create a personalized game for your girlfriend using your shared memories, characters, photos, music and messages. Share the surprise by link.',
    eyebrow: 'Made from the story only you two share',
    h1: 'Create a Personalized Game for Your Girlfriend',
    intro:
      'Make a romantic, funny or adventurous gift around the moments she will recognize immediately. You decide the tone: a gentle story through shared memories, a playful challenge, or a full platform adventure.',
    sections: [
      {
        title: 'Use the details that matter to her',
        body: 'Recreate recognizable characters, name chapters after meaningful moments and write the messages yourself. The strongest surprises feel specific, not expensive.',
      },
      {
        title: 'For birthdays, anniversaries or just because',
        body: 'A game can build toward a birthday wish, an anniversary message or a small unexpected thank-you. You control the story and when the link is shared.',
      },
      {
        title: 'Preview every moment first',
        body: 'Playtest beside the editor to check the pacing, controls and story. Nothing is published until you choose to publish it.',
      },
    ],
    faqs: [
      [
        'Can I make it romantic without making it cheesy?',
        'Yes. Use your own voice, choose the memories that matter and keep the game as playful or heartfelt as your relationship.',
      ],
      [
        'Can I use photos of us?',
        'The builder supports image uploads for supported visual elements. Only use photos you have permission to share.',
      ],
      [
        'Does she need a Game Gift account?',
        'No. A published game is opened from its browser link.',
      ],
    ],
    related: ['/anniversary-game-gift', '/birthday-game-gift', '/personalized-game-gift'],
  },
  {
    path: '/game-for-boyfriend',
    title: 'Personalized Game for Your Boyfriend – A Custom Gift | Game Gift',
    description:
      'Build a custom game for your boyfriend with shared memories, characters, levels, music and a personal ending. No coding required.',
    eyebrow: 'An inside joke turned into an adventure',
    h1: 'Make a Custom Game Gift for Your Boyfriend',
    intro:
      'Create a game that feels unmistakably his: cast familiar people, build levels inspired by your story, add the jokes only he will get and finish with a message in your own words.',
    sections: [
      {
        title: 'Pick a challenge that fits him',
        body: 'Choose a world to explore, a story-led journey or a faster arcade challenge. Adjust the mechanics and difficulty after trying the game yourself.',
      },
      {
        title: 'Turn memories into levels',
        body: 'Use chapters to revisit a first meeting, a favorite trip, a shared routine or a chaotic story you still laugh about.',
      },
      {
        title: 'Send more than a card',
        body: 'Publish when the game is ready and share one browser link. The experience combines the message and the activity in the same surprise.',
      },
    ],
    faqs: [
      [
        'Do I need game-design experience?',
        'No. The builder starts with working game modes and guides you through the editable parts.',
      ],
      [
        'Can I add our favorite music?',
        'You can choose included music or upload supported audio when you have the right to use it.',
      ],
      [
        'Can I test it before he sees it?',
        'Yes. Live playtesting is available throughout creation.',
      ],
    ],
    related: ['/birthday-game-gift', '/anniversary-game-gift', '/examples'],
  },
  {
    path: '/anniversary-game-gift',
    title: 'Anniversary Game Gift – Turn Your Story Into a Game | Game Gift',
    description:
      'Create an interactive anniversary gift from your shared story, with personalized characters, memories, music and a message at the end.',
    eyebrow: 'Your story, made playable',
    h1: 'Create an Anniversary Game for Two',
    intro:
      'Celebrate how your story has grown by turning meaningful chapters into an interactive journey. Build it for your partner, play it together, or send the link as the start of an anniversary surprise.',
    sections: [
      {
        title: 'Tell the story in chapters',
        body: 'Move from how you met to the places, people and moments that shaped the relationship. Each level can carry a different memory and mood.',
      },
      {
        title: 'Make the ending yours',
        body: 'Write a final message that says what a store-bought gift cannot. The recipient reaches it after playing through the memories you chose.',
      },
      {
        title: 'Create together or keep it secret',
        body: 'Build privately, preview as often as you need and publish only when the timing is right.',
      },
    ],
    faqs: [
      [
        'Is this only for wedding anniversaries?',
        'No. It works for relationship milestones, friendship anniversaries and any shared date worth celebrating.',
      ],
      [
        'Can we play it together?',
        'Yes. You can open the published game on a phone or computer and play through the story together.',
      ],
      [
        'Is anything public while I build?',
        'No. Drafts are private, and you choose when to publish a shareable game.',
      ],
    ],
    related: ['/game-for-girlfriend', '/game-for-boyfriend', '/personalized-digital-gift'],
  },
  {
    path: '/couples-game-gift',
    title: 'Couples Game Gift – Create a Game About Your Story | Game Gift',
    description:
      'Create a couples game gift from shared memories, favorite places and inside jokes. Build a playful relationship story and share it by link.',
    eyebrow: 'A game for the two of you',
    h1: 'Create a Couples Game Gift From Your Story',
    intro:
      'Turn the small details of your relationship into something you can play together. Build chapters around how you met, the places you return to and the jokes that need no explanation.',
    sections: [
      {
        title: 'Choose a shared point of view',
        body: 'Make one partner the hero, place both of you in the cast or build a journey that moves between your perspectives. The structure can be romantic, funny or quietly nostalgic.',
      },
      {
        title: 'Create a date-night reveal',
        body: 'Play the finished game together on a laptop or share the link before a video call. It works as the main surprise or as the first clue leading to another plan.',
      },
      {
        title: 'Keep the details in your voice',
        body: 'Write the dialogue and final message yourself, choose the soundtrack and test the pacing before sharing. Specific memories make the experience feel like yours.',
      },
    ],
    faqs: [
      [
        'Is this only for anniversaries?',
        'No. A couples game can mark a birthday, long-distance visit, proposal, ordinary date night or a just-because surprise.',
      ],
      [
        'Can we play it together?',
        'Yes. Open the published link on a phone or computer and take turns or play through the story side by side.',
      ],
      [
        'Can I keep the game private while creating it?',
        'Yes. Drafts remain private until you choose to publish a shareable version.',
      ],
    ],
    related: [
      '/anniversary-game-gift',
      '/game-for-girlfriend',
      '/gift-ideas/long-distance-relationship-gifts',
    ],
  },
  {
    path: '/personalized-digital-gift',
    title: 'Personalized Digital Gift – Create a Game They Can Play | Game Gift',
    description:
      'Make a personalized digital gift that combines a game, story, characters, photos, music and memories in one shareable browser experience.',
    eyebrow: 'A digital gift that feels deeply personal',
    h1: 'Create a Personalized Digital Gift',
    intro:
      'Game Gift turns your message into an experience. It is delivered online, but the people, places and stories inside come directly from your relationship with the recipient.',
    sections: [
      {
        title: 'Personal without shipping',
        body: 'Create from anywhere and share at the right moment. The recipient follows a link in their browser, with no app installation or parcel delivery required.',
      },
      {
        title: 'More expressive than a slideshow',
        body: 'Combine custom characters, playable levels, story text, images, music and a final message instead of sending disconnected files.',
      },
      {
        title: 'Useful for more than birthdays',
        body: 'Build for anniversaries, partners, best friends, congratulations or an unexpected online surprise.',
      },
    ],
    faqs: [
      ['How is the gift delivered?', 'You publish the finished game and send its browser link.'],
      [
        'Can I keep editing it?',
        'You can save and playtest drafts while creating. Publishing creates the version your recipient can open.',
      ],
      [
        'What devices are supported?',
        'The published experience is designed for modern desktop and mobile browsers.',
      ],
    ],
    related: ['/personalized-game-gift', '/birthday-game-gift', '/anniversary-game-gift'],
  },
];

export const pageByPath = new Map(seoPages.map((page) => [page.path, page]));
export const labels: Record<string, string> = {
  '/personalized-game-gift': 'Personalized game gifts',
  '/custom-video-game-gift': 'Custom video game gifts',
  '/birthday-game-gift': 'Birthday game gifts',
  '/game-for-girlfriend': 'Games for your girlfriend',
  '/game-for-boyfriend': 'Games for your boyfriend',
  '/anniversary-game-gift': 'Anniversary game gifts',
  '/couples-game-gift': 'Couples game gifts',
  '/personalized-digital-gift': 'Personalized digital gifts',
  '/gift-ideas': 'Gift ideas and guides',
  '/gift-ideas/anniversary-gift-ideas': 'Anniversary gift ideas',
  '/gift-ideas/how-to-make-a-personalized-game': 'How to make a personalized game',
  '/gift-ideas/long-distance-relationship-gifts': 'Long-distance relationship gifts',
  '/examples': 'Examples',
  '/about': 'About',
  '/contact': 'Contact',
  '/privacy': 'Privacy',
  '/terms': 'Terms',
};
