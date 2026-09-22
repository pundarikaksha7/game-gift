export type GiftGuide = {
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: { title: string; body: string; ideas?: string[] }[];
  related: string[];
};

export const giftGuides: GiftGuide[] = [
  {
    path: '/gift-ideas/unique-birthday-gifts-for-girlfriend',
    title: 'Unique Birthday Gifts for Your Girlfriend | Game Gift',
    description:
      'Thoughtful birthday gift ideas for your girlfriend, with practical ways to personalize each one around your relationship and shared memories.',
    h1: 'Unique Birthday Gifts for Your Girlfriend That Feel Personal',
    intro:
      'The best birthday gift is not necessarily the biggest one. It is the one that shows you noticed what she loves, remembers what you share and gives her a story to tell afterward. Start with one specific detail—an ambition, ritual, trip or running joke—and build the gift around it.',
    sections: [
      {
        title: 'Choose an experience with a personal thread',
        body: 'A planned day becomes memorable when its stops connect to your relationship. Revisit where you met, book a workshop related to something she wants to learn, or create a small route through favorite cafés and parks. Include a note at each stop explaining why you chose it.',
        ideas: [
          'A self-guided memory walk',
          'A class you can take together',
          'A surprise day built around her favorite low-key activities',
        ],
      },
      {
        title: 'Make a keepsake she will actually return to',
        body: 'A short photo book, recipe collection or set of voice notes can work better than a generic engraved object. Edit ruthlessly: choose the moments that carry a real story, add dates or context, and leave room for the next chapter rather than trying to document everything.',
      },
      {
        title: 'Turn your memories into something playable',
        body: 'For a gift with a reveal, create a personalized browser game starring familiar people and places. Each level can unlock a message or memory before the final birthday note. It combines the care of a handmade gift with an activity she can explore.',
      },
      {
        title: 'A simple way to decide',
        body: 'Choose the idea that sounds most like her, not the one that performs best on social media. Check the practical details—time, accessibility, privacy and whether she enjoys surprises—then pair the main gift with a sincere message in your own words.',
      },
    ],
    related: [
      '/game-for-girlfriend',
      '/birthday-game-gift',
      '/gift-ideas/last-minute-personalized-gifts',
    ],
  },
  {
    path: '/gift-ideas/birthday-gifts-for-boyfriend',
    title: 'Birthday Gifts for Your Boyfriend: Personal Ideas | Game Gift',
    description:
      'Find personal birthday gifts for your boyfriend, from shared experiences and hobby upgrades to a custom game built around your memories.',
    h1: 'Birthday Gifts for Your Boyfriend With a Story Behind Them',
    intro:
      'A useful way to avoid generic birthday gifts is to choose one of three directions: improve something he already enjoys, plan time around a shared interest, or make something only you could have made. The right choice depends more on his habits than on a trend list.',
    sections: [
      {
        title: 'Upgrade a hobby without guessing',
        body: 'Look for the friction in a hobby he already practices: worn equipment, awkward storage, a missing accessory or a class that would help him improve. If technical preferences matter, ask a friend who shares the hobby or give him a planned shopping date rather than gambling on specifications.',
        ideas: [
          'A considered upgrade to something he uses weekly',
          'Tickets tied to a favorite team, artist or creator',
          'A workshop with enough time to enjoy it together',
        ],
      },
      {
        title: 'Build an experience around the way he has fun',
        body: 'Competitive people may enjoy a tournament night; curious people may prefer an escape room or food trail; homebodies may value an uninterrupted evening with favorite snacks and a thoughtfully chosen game. The personal part is the fit, not the price.',
      },
      {
        title: 'Create a game full of your inside jokes',
        body: 'A custom game gift can cast him as the hero and turn familiar stories into levels. Add friends as characters, shape a challenge around his play style and finish with a birthday message. Because it opens in a browser, the reveal can happen in person or from far away.',
      },
      {
        title: 'Pair the gift with context',
        body: 'Tell him why you picked it. A brief note connecting the gift to a moment you noticed often matters more than elaborate wrapping. Keep the message specific: name the memory, quality or future plan that made this gift feel right.',
      },
    ],
    related: ['/game-for-boyfriend', '/birthday-game-gift', '/gift-ideas/digital-gift-ideas'],
  },
  {
    path: '/gift-ideas/anniversary-gift-ideas',
    title: 'Anniversary Gift Ideas Built Around Your Story | Game Gift',
    description:
      'Meaningful anniversary gift ideas for couples, including memory-led keepsakes, shared experiences and an interactive game about your story.',
    h1: 'Anniversary Gift Ideas That Celebrate Your Actual Story',
    intro:
      'An anniversary gift works best when it marks both where you have been and where you are going. Choose a few moments that changed the relationship, then decide whether your partner would most enjoy revisiting them, displaying them or experiencing them in a new form.',
    sections: [
      {
        title: 'Revisit a meaningful place',
        body: 'Return to a first-date location, recreate a favorite meal or plan a day around a place you have talked about revisiting. If travel is not practical, bring the details home through music, food and photographs, and explain the memory you wanted to recreate.',
      },
      {
        title: 'Create a timeline with room for the future',
        body: 'Choose a small set of relationship milestones and pair each with a short note about what changed. A printed accordion book, private audio series or set of letters works well. End with a blank page, planned date or promise for the year ahead.',
      },
      {
        title: 'Make your history interactive',
        body: 'Turn the timeline into a couples game gift. Each chapter can represent a place, challenge or turning point, with dialogue written in your voice and a final anniversary message. Play it together for a relaxed date-night reveal.',
      },
      {
        title: 'Respect your partner’s style',
        body: 'Some people love a public surprise; others value privacy and calm. Decide how the gift should be delivered before deciding what it should be. A thoughtful idea presented in the wrong setting can miss the feeling you intended.',
      },
    ],
    related: [
      '/anniversary-game-gift',
      '/couples-game-gift',
      '/gift-ideas/long-distance-relationship-gifts',
    ],
  },
  {
    path: '/gift-ideas/digital-gift-ideas',
    title: 'Digital Gift Ideas That Still Feel Personal | Game Gift',
    description:
      'Personal digital gift ideas for birthdays, relationships and long-distance celebrations, with tips for making an online gift feel intentional.',
    h1: 'Digital Gift Ideas That Do Not Feel Generic',
    intro:
      'Digital gifts are useful when time, distance or shipping makes a physical present difficult. Their weakness is not the format—it is the lack of context. Add a personal sequence, message or shared moment and an online gift can feel more considered than something delivered in a box.',
    sections: [
      {
        title: 'Create something they can keep',
        body: 'Edit a short audio letter, a private video, a digital zine or a carefully captioned photo collection. Keep the files organized and easy to open. A concise, intentional collection is more enjoyable than a huge folder the recipient has to sort through.',
      },
      {
        title: 'Give access to a shared experience',
        body: 'Choose a remote class, game night, watch-along or subscription you will actually use together. Set the date when you give it, and include the link and any setup instructions so the recipient is not left with planning work.',
        ideas: [
          'A scheduled online workshop',
          'A co-op game and a planned evening',
          'A digital membership matched to an existing interest',
        ],
      },
      {
        title: 'Build an interactive surprise',
        body: 'A personalized game can combine photos, music, characters, memories and a message in one browser experience. It is especially useful when you want the unwrapping itself to feel like an event rather than sending a code or attachment.',
      },
      {
        title: 'Make delivery part of the gift',
        body: 'Avoid dropping an unexplained link into a chat. Write a short introduction, choose a time when they can enjoy it, and offer to experience it together. Confirm that the format works on their device and never share private media without permission.',
      },
    ],
    related: [
      '/personalized-digital-gift',
      '/custom-video-game-gift',
      '/gift-ideas/last-minute-personalized-gifts',
    ],
  },
  {
    path: '/gift-ideas/long-distance-relationship-gifts',
    title: 'Long-Distance Relationship Gifts for Feeling Closer | Game Gift',
    description:
      'Long-distance relationship gift ideas designed for connection, shared rituals and personal memories—not just shipping something far away.',
    h1: 'Long-Distance Relationship Gifts That Create Connection',
    intro:
      'A useful long-distance gift reduces the feeling that you are living in separate timelines. The strongest ideas create something to anticipate, something to do together or a reminder that fits naturally into an ordinary day.',
    sections: [
      {
        title: 'Create a shared ritual',
        body: 'Send paired journals, choose a weekly recipe, build a recurring playlist exchange or plan a short monthly challenge. Keep the ritual light enough to survive busy weeks. Consistency creates more connection than a complicated plan used once.',
      },
      {
        title: 'Plan the next moment, not only the next package',
        body: 'A countdown calendar, future-date envelope or contribution to a visit gives the relationship a visible next chapter. Be concrete about dates and constraints; avoid making a promise the two of you have not discussed.',
      },
      {
        title: 'Share an experience at the same time',
        body: 'Build a private game from your memories, then open it together during a call. One partner can play while the other watches, or you can take turns. A browser link keeps setup simple across different locations.',
      },
      {
        title: 'Choose privacy over performance',
        body: 'Personal media and messages should stay between the people they are intended for. Ask before using photos, avoid public posts as a default and choose tools with clear sharing controls. The gift should feel safe as well as affectionate.',
      },
    ],
    related: ['/couples-game-gift', '/anniversary-game-gift', '/gift-ideas/digital-gift-ideas'],
  },
  {
    path: '/gift-ideas/last-minute-personalized-gifts',
    title: 'Last-Minute Personalized Gifts You Can Make Today | Game Gift',
    description:
      'Thoughtful last-minute personalized gift ideas you can create and deliver today, with a practical plan for choosing the right level of effort.',
    h1: 'Last-Minute Personalized Gifts That Still Feel Thoughtful',
    intro:
      'When time is short, narrow the scope instead of pretending you have more time. One well-chosen memory with a clear presentation feels more personal than a rushed collection of everything. Pick a format you can finish, test and deliver confidently.',
    sections: [
      {
        title: 'If you have less than an hour',
        body: 'Record a focused voice note, write a letter around one vivid memory, or make a three-song playlist with an explanation for each track. Add a specific promise—such as a planned meal or call—only if you can put it on the calendar immediately.',
      },
      {
        title: 'If you have an evening',
        body: 'Create a short photo story, assemble a digital scavenger hunt or customize a small playable game. Limit yourself to three chapters: an opening that establishes the memory, a playful middle and a sincere final message.',
      },
      {
        title: 'Use a template without sounding templated',
        body: 'Templates save production time, but the words and choices should still come from you. Replace generic messages, remove sections that do not fit and test every link or file on the recipient’s likely device before sending.',
      },
      {
        title: 'Deliver it with intention',
        body: 'Choose a quiet moment and explain why you made it. If the main present will arrive later, say so plainly; the personalized piece should stand on its own instead of feeling like an apology for shipping.',
      },
    ],
    related: [
      '/personalized-digital-gift',
      '/birthday-game-gift',
      '/gift-ideas/how-to-make-a-personalized-game',
    ],
  },
  {
    path: '/gift-ideas/how-to-make-a-personalized-game',
    title: 'How to Make a Personalized Game as a Gift | Game Gift',
    description:
      'A practical guide to planning and making a personalized game gift, from choosing memories and a game style to playtesting the final surprise.',
    h1: 'How to Make a Personalized Game as a Gift',
    intro:
      'A good personalized game does not need a long plot or advanced mechanics. It needs a clear emotional thread, recognizable details and a finish that rewards the person playing. Plan those pieces first, then use a playable starting mode to keep the build manageable.',
    sections: [
      {
        title: '1. Choose one sentence for the experience',
        body: 'Write the idea in plain language: “a funny birthday adventure through our university memories” or “a gentle anniversary journey from our first date to today.” This sentence helps you reject details that are meaningful but do not belong in this particular game.',
      },
      {
        title: '2. Pick three to five recognizable moments',
        body: 'List places, people, objects and phrases the recipient will understand immediately. Arrange them in an order that creates movement: an introduction, a few discoveries or challenges, and a final reveal. Ask permission before using anyone else’s private photos or recordings.',
      },
      {
        title: '3. Match the mechanics to the recipient',
        body: 'Use a platform adventure for active play, a story journey for a relaxed experience or an arcade challenge for someone competitive. Keep difficulty below the recipient’s normal comfort ceiling—the goal is to reach the message, not prove mastery.',
      },
      {
        title: '4. Build, then playtest like the recipient',
        body: 'Customize the cast, chapters, words and soundtrack, then start from the beginning on the device they are likely to use. Check controls, spelling, volume, image crops and every transition. Ask a trusted person to test without explaining what to do.',
      },
      {
        title: '5. Plan the reveal',
        body: 'Publish only after the full test. Send the browser link when the recipient has time to play, or open it together. A short introduction is enough; let the game carry the story and save the most important words for the ending.',
      },
    ],
    related: ['/personalized-game-gift', '/custom-video-game-gift', '/examples'],
  },
];

export const guideByPath = new Map(giftGuides.map((guide) => [guide.path, guide]));
