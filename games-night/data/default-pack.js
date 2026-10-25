/*
 * The default game pack: everything from the "Ultimate Games Night – 6 Players" deck,
 * with the deck's contradictions settled (see README "Decisions").
 *
 * A pack is plain data. The content editor (Stage 8) will read and write this same shape,
 * so nothing in here should ever need code to change.
 */
window.GN = window.GN || {};

GN.defaultPack = {
  id: "ultimate-games-night",
  title: "Ultimate Games Night",
  tagline: "The Ultimate Showdown",
  strapline: "5 rounds • one winning team",

  houseRules: [
    "Pick a team name and a captain.",
    "Rotate speakers and players so everyone takes part.",
    "No phones. Answers are revealed only when time is up."
  ],

  // Points and timers. The settings panel edits a copy of these for the current game.
  rules: {
    musicBoth: 10,          // title AND artist right
    musicOne: 5,            // only one of the two right
    scramble: 10,
    brain: 10,
    mini: 20,
    categoryAnswer: 10,     // each valid answer
    categoryBonus: 20,      // last team standing
    musicSeconds: 10,
    musicClipSeconds: 10,   // how much of each song to play
    scrambleSeconds: 20,
    brainSeconds: 30,
    categoryTurnSeconds: 5,
    memoryShowSeconds: 20,
    memoryWriteSeconds: 45
  },

  rounds: [
    {
      id: "music",
      kind: "music",
      number: 1,
      name: "Music Challenge",
      blurb: "Name that tune from the first few seconds.",
      howTo: [
        "The host plays the first 5–10 seconds of a song.",
        "Each team writes down the title AND the artist.",
        "10 seconds to answer once the clip stops."
      ],
      points: "10 points for both · 5 for one",
      items: [
        { title: "Crazy in Love", artist: "Beyoncé ft. Jay-Z" },
        { title: "Yeah!", artist: "Usher ft. Lil Jon & Ludacris" },
        { title: "Water", artist: "Tyla" },
        { title: "Calm Down", artist: "Rema" },
        { title: "Dynamite", artist: "BTS" },
        { title: "Shape of You", artist: "Ed Sheeran" },
        { title: "Last Last", artist: "Burna Boy" },
        { title: "Umbrella", artist: "Rihanna ft. Jay-Z" },
        { title: "Ojuelegba", artist: "Wizkid" },
        { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars" }
      ]
    },
    {
      id: "scramble",
      kind: "scramble",
      number: 2,
      name: "Nauseous",
      subtitle: "Word Scramble",
      blurb: "Unscramble the letters into a real word.",
      howTo: [
        "Unscramble the letters into a real word.",
        "20 seconds per word."
      ],
      points: "10 points per word",
      // `scrambled` is optional. If it is missing or invalid, the app makes a fresh one.
      items: [
        { answer: "NAUSEOUS", scrambled: "SUAENOUS" },
        { answer: "AIRPORT", scrambled: "TROPAIR" },
        { answer: "CHOCOLATE", scrambled: "COLHECOTA" },
        { answer: "TREASURE", scrambled: "TRAUSERE" },
        { answer: "CAMERA", scrambled: "RACEMA" },
        { answer: "CAPTAIN", scrambled: "NAITCAP" },
        { answer: "TELEVISION", scrambled: "ESILVOTNIE" },
        { answer: "UMBRELLA", scrambled: "ERBMULLA" }
      ]
    },
    {
      id: "brain",
      kind: "quiz",
      number: 3,
      name: "Brain Games",
      blurb: "Logic, riddles and a little maths.",
      howTo: [
        "Logic, riddles and a little maths.",
        "30 seconds per question."
      ],
      points: "10 points per question",
      items: [
        { q: "A recipe needs 2½ cups of flour for 20 cookies. How much for 32 cookies?", a: "4 cups" },
        { q: "What comes next? 2, 6, 12, 20, 30, __", a: "42" },
        { q: "A bat and ball cost £1.10. The bat costs £1 more than the ball. How much is the ball?", a: "5p" },
        { q: "If five machines make five items in five minutes, how long for 100 machines to make 100 items?", a: "5 minutes" },
        { q: "What has keys but cannot open locks?", a: "A piano (or keyboard)" },
        { q: "You overtake the runner in second place. What position are you in?", a: "Second" },
        { q: "Which is heavier: 1 kg of feathers or 1 kg of bricks?", a: "Neither. Both weigh 1 kg" },
        { q: "A farmer has 17 sheep. All but 9 run away. How many remain?", a: "9" },
        { q: "What has many teeth but cannot bite?", a: "A comb" },
        { q: "If yesterday was Monday, what day is tomorrow?", a: "Wednesday" }
      ]
    },
    {
      id: "mini",
      kind: "mini",
      number: 4,
      name: "Mini Games",
      blurb: "Five physical challenges.",
      howTo: [
        "Five physical challenges.",
        "Clear a safe space and get your props ready."
      ],
      points: "20 points per win",
      items: [
        { name: "Cup Stack Sprint", mode: "stopwatch", text: "Each team stacks 10 plastic cups into a pyramid, then back into one stack. Fastest wins.", note: "Props: 10 cups per team." },
        { name: "Wall Sit", mode: "last-standing", text: "One player per team holds a wall sit. Last one holding wins.", note: "Stop if it hurts. No pushing." },
        { name: "One-Leg Stand", mode: "last-standing", text: "Stand on one leg, hands on head. Last player standing wins.", note: "No hopping, no contact." },
        { name: "Charades Relay", mode: "stopwatch", text: "One teammate acts out 5 prompts without speaking. Fastest team to guess all five wins.", prompts: ["Brushing teeth", "Flying a plane", "Changing a tyre", "Walking a dog", "Making popcorn"] },
        { name: "Memory Tray", mode: "memory", text: "12 household items are shown for 20 seconds, then covered. Teams have 45 seconds to write down as many as they can. Most correct wins." }
      ]
    },
    {
      id: "category",
      kind: "category",
      number: 5,
      name: "Category Bank",
      blurb: "Teams take turns naming things in a category.",
      howTo: [
        "Teams take turns naming an item in the category.",
        "5 seconds per turn. No repeats. No phones."
      ],
      points: "10 per answer · 20 bonus to the last team standing",
      items: [
        "Fast food restaurants",
        "Countries in Africa",
        "Sports",
        "Car brands",
        "Things in a refrigerator",
        "Musical instruments",
        "Fruits",
        "Things smaller than your phone",
        "Things with wheels",
        "Celebrities with one-word stage names"
      ]
    },
    {
      id: "tiebreak",
      kind: "tiebreak",
      number: null,
      name: "Tie-breaker",
      blurb: "Only if the scores are level.",
      howTo: [
        "Each team writes down one number.",
        "Closest answer wins. Still tied? Use the backup question."
      ],
      points: "Closest answer wins",
      items: [
        { q: "How many minutes are there in one week?", a: "10,080", value: 10080 },
        { q: "Backup: how many seconds are there in one day?", a: "86,400", value: 86400 }
      ]
    }
  ]
};
