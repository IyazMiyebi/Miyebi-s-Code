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
    memoryWriteSeconds: 45,
    // The games in the library (picked on "Pick the games").
    trueFalse: 5,
    trueFalseSeconds: 15,
    higherLower: 5,
    higherLowerSeconds: 15,
    lyrics: 10,
    lyricsSeconds: 20,
    oddOne: 10,
    oddOneSeconds: 20,
    emoji: 10,
    emojiSeconds: 30,
    whoSaid: 10,
    whoSaidSeconds: 20,
    nameFive: 20,
    nameFiveSeconds: 30
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
      blurb: "Physical challenges, team against team.",
      howTo: [
        "Physical challenges, team against team.",
        "Clear a safe space and get your props ready."
      ],
      points: "20 points per win",
      items: [
        { name: "Alphabet Sprint", mode: "stopwatch", turns: true, text: "Teams take turns. Name an animal for every letter from A to Z, in order, as a team. Skip Q, X and Z. Fastest team wins.", note: "No props. One team at a time: the host stops the clock at Y." },
        { name: "Wall Sit", mode: "last-standing", text: "One player per team holds a wall sit. Last one holding wins.", note: "Stop if it hurts. No pushing." },
        { name: "One-Leg Stand", mode: "last-standing", text: "Stand on one leg, hands on head. Last player standing wins.", note: "No hopping, no contact." },
        { name: "Charades Relay", mode: "stopwatch", turns: true, text: "One teammate acts out 5 prompts without speaking. Fastest team to guess all five wins.", prompts: ["Brushing teeth", "Flying a plane", "Changing a tyre", "Walking a dog", "Making popcorn"] },
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

    /* ---------- The game library ----------
       Games with no round number aren't in the classic running order: pick them on the
       "Pick the games" screen. They're all question games ("quiz"), with extras:
       rulesKey  their own points and timer (rules.trueFalse, rules.trueFalseSeconds)
       noun      what one question is called ("Statement 03 / 10")
       choices   multiple choice: `options` per question, or one set for the round;
                 `correct` is the right option, counting from 1
       style     "emoji": the question is shown huge
       turns     one team per question, taking turns
       tint      the game's colour on the setup screen */
    {
      id: "truefalse",
      kind: "quiz",
      number: null,
      name: "True or False",
      blurb: "Fact or fiction? Decide together.",
      rulesKey: "trueFalse",
      noun: "Statement",
      choices: true,
      options: ["True", "False"],
      tint: "#5ce1ff",
      howTo: [
        "A statement appears on screen.",
        "Each team writes down True or False before time runs out."
      ],
      points: "5 points per statement",
      items: [
        { q: "A group of flamingos is called a flamboyance.", correct: 1, a: "It really is." },
        { q: "Goldfish have a three-second memory.", correct: 2, a: "They can remember things for months." },
        { q: "Bananas are berries.", correct: 1, a: "To a botanist, yes. Strawberries aren't." },
        { q: "The Great Wall of China can be seen from space with the naked eye.", correct: 2, a: "It's far too narrow. Astronauts say they can't see it." },
        { q: "An octopus has three hearts.", correct: 1, a: "Two pump blood to the gills, one to the body." },
        { q: "Lightning never strikes the same place twice.", correct: 2, a: "The Empire State Building is hit many times a year." },
        { q: "Venus is the hottest planet in our solar system.", correct: 1, a: "Hotter than Mercury, thanks to its thick clouds." },
        { q: "Bulls charge at the colour red.", correct: 2, a: "They charge at the cape's movement, not its colour." },
        { q: "A day on Venus is longer than a year on Venus.", correct: 1, a: "One spin takes 243 Earth days; one orbit takes 225." },
        { q: "Sharks are mammals.", correct: 2, a: "They're fish. Whales and dolphins are the mammals." },
        { q: "Honey can stay edible for thousands of years.", correct: 1, a: "Sealed honey keeps almost for ever." },
        { q: "Napoleon was unusually short.", correct: 2, a: "He was about 1.69 m, average for his time." }
      ]
    },
    {
      id: "higherlower",
      kind: "quiz",
      number: null,
      name: "Higher or Lower",
      blurb: "Is the real number higher or lower?",
      rulesKey: "higherLower",
      noun: "Guess",
      choices: true,
      options: ["Higher", "Lower"],
      tint: "#ffb020",
      howTo: [
        "A number appears on screen.",
        "Teams write down whether the real answer is higher or lower."
      ],
      points: "5 points per guess",
      items: [
        { q: "The Eiffel Tower is 200 metres tall.", correct: 1, a: "About 330 metres." },
        { q: "There are 150 countries in the world.", correct: 1, a: "About 195." },
        { q: "Mount Everest is 10,000 metres high.", correct: 2, a: "8,849 metres." },
        { q: "An adult human has 300 bones.", correct: 2, a: "206 bones." },
        { q: "The Titanic sank in 1925.", correct: 2, a: "1912." },
        { q: "A piano has 100 keys.", correct: 2, a: "88 keys." },
        { q: "Sunlight takes 30 minutes to reach Earth.", correct: 2, a: "About 8 minutes." },
        { q: "The River Amazon is 2,000 km long.", correct: 1, a: "About 6,400 km." },
        { q: "The first iPhone came out in 2010.", correct: 2, a: "2007." },
        { q: "Usain Bolt's 100 m world record is 9.9 seconds.", correct: 2, a: "9.58 seconds." },
        { q: "The Moon is 100,000 km from Earth.", correct: 1, a: "About 384,000 km." },
        { q: "A blue whale's heart weighs 50 kg.", correct: 1, a: "About 180 kg." }
      ]
    },
    {
      id: "lyrics",
      kind: "quiz",
      number: null,
      name: "Finish the Lyric",
      blurb: "Sing the words that come next.",
      rulesKey: "lyrics",
      noun: "Lyric",
      tint: "var(--neon)",
      howTo: [
        "The start of a famous lyric appears on screen.",
        "Teams write down (or sing) how it ends."
      ],
      points: "10 points per lyric",
      items: [
        { hint: "Queen · Bohemian Rhapsody", q: "“Is this the real life? Is this just…”", a: "…fantasy?" },
        { hint: "Adele · Hello", q: "“Hello from the…”", a: "…other side" },
        { hint: "The Black Eyed Peas · I Gotta Feeling", q: "“I gotta feeling that tonight's gonna be a…”", a: "…good night" },
        { hint: "Taylor Swift · Shake It Off", q: "“The players gonna play, play, play, and the haters gonna…”", a: "…hate, hate, hate" },
        { hint: "Journey · Don't Stop Believin'", q: "“Just a small-town girl, livin' in a…”", a: "…lonely world" },
        { hint: "Carly Rae Jepsen · Call Me Maybe", q: "“Hey, I just met you, and this is crazy, but here's my number, so…”", a: "…call me, maybe" },
        { hint: "Rick Astley · Never Gonna Give You Up", q: "“We're no strangers to…”", a: "…love" },
        { hint: "Neil Diamond · Sweet Caroline", q: "“Sweet Caroline, ba ba ba…”", a: "Good times never seemed so good" },
        { hint: "Miley Cyrus · Wrecking Ball", q: "“I came in like a…”", a: "…wrecking ball" },
        { hint: "Queen · We Will Rock You", q: "“We will, we will…”", a: "…rock you" },
        { hint: "Justin Bieber · Baby", q: "“Baby, baby, baby, oh, like baby, baby, baby…”", a: "…no" }
      ]
    },
    {
      id: "oddoneout",
      kind: "quiz",
      number: null,
      name: "Odd One Out",
      blurb: "Four things. One doesn't belong.",
      rulesKey: "oddOne",
      noun: "Puzzle",
      choices: true,
      tint: "#c6ff3d",
      howTo: [
        "Four things appear on screen. One doesn't belong.",
        "Teams write down the odd one out."
      ],
      points: "10 points per puzzle",
      items: [
        { q: "Which is the odd one out?", options: ["Mercury", "Venus", "Pluto", "Mars"], correct: 3, a: "Pluto is a dwarf planet." },
        { q: "Which is the odd one out?", options: ["Tomato", "Cucumber", "Carrot", "Pepper"], correct: 3, a: "Carrot: the others are fruits." },
        { q: "Which is the odd one out?", options: ["Dolphin", "Shark", "Whale", "Seal"], correct: 2, a: "Shark: the others are mammals." },
        { q: "Which is the odd one out?", options: ["Python", "Cobra", "Gecko", "Anaconda"], correct: 3, a: "Gecko: a lizard, not a snake." },
        { q: "Which is the odd one out?", options: ["Paris", "Rome", "Sydney", "Madrid"], correct: 3, a: "Sydney isn't a capital. Canberra is." },
        { q: "Which is the odd one out?", options: ["Guitar", "Violin", "Harp", "Trumpet"], correct: 4, a: "Trumpet: no strings." },
        { q: "Which is the odd one out?", options: ["Square", "Triangle", "Circle", "Rectangle"], correct: 3, a: "Circle: no straight sides." },
        { q: "Which is the odd one out?", options: ["Ruby", "Emerald", "Pearl", "Sapphire"], correct: 3, a: "Pearl: grown by an oyster, not mined." },
        { q: "Which is the odd one out?", options: ["Lagos", "Accra", "Nairobi", "Kinshasa"], correct: 1, a: "Lagos isn't a capital. Abuja is." },
        { q: "Which is the odd one out?", options: ["Penguin", "Ostrich", "Eagle", "Emu"], correct: 3, a: "Eagle: the others can't fly." }
      ]
    },
    {
      id: "emoji",
      kind: "quiz",
      number: null,
      name: "Guess the Emoji",
      blurb: "Films and songs, told in emojis.",
      rulesKey: "emoji",
      noun: "Emoji",
      style: "emoji",
      tint: "#ffd84d",
      howTo: [
        "A film, song or thing is spelled out in emojis.",
        "Teams write down what it is."
      ],
      points: "10 points per emoji",
      items: [
        { hint: "Film", q: "🦁 👑", a: "The Lion King" },
        { hint: "Film", q: "❄️ 👸 👸", a: "Frozen" },
        { hint: "Film", q: "🚢 🧊 💔", a: "Titanic" },
        { hint: "Film", q: "🕷️ 🧑", a: "Spider-Man" },
        { hint: "Film", q: "🧙‍♂️ 💍 🌋", a: "The Lord of the Rings" },
        { hint: "Film", q: "🦈 🌊 😱", a: "Jaws" },
        { hint: "Film", q: "🍫 🏭 🎫", a: "Charlie and the Chocolate Factory" },
        { hint: "Film", q: "👻 🚫 🔫", a: "Ghostbusters" },
        { hint: "Film", q: "🏴‍☠️ 🌊 ⚓", a: "Pirates of the Caribbean" },
        { hint: "Film", q: "🐠 🔍", a: "Finding Nemo" },
        { hint: "Song", q: "☔ 🌂", a: "Umbrella (Rihanna)" },
        { hint: "Celebration", q: "🎃 👻 🍬", a: "Halloween" }
      ]
    },
    {
      id: "whosaid",
      kind: "quiz",
      number: null,
      name: "Who Said It?",
      blurb: "Famous words. Who said them?",
      rulesKey: "whoSaid",
      noun: "Quote",
      choices: true,
      tint: "#ff7ab8",
      howTo: [
        "A famous line appears with three names.",
        "Teams write down who said it."
      ],
      points: "10 points per quote",
      items: [
        { q: "“I have a dream.”", options: ["Nelson Mandela", "Martin Luther King Jr.", "Barack Obama"], correct: 2, a: "Washington, 1963." },
        { q: "“That's one small step for man, one giant leap for mankind.”", options: ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong"], correct: 3, a: "On the Moon, 1969." },
        { q: "“Float like a butterfly, sting like a bee.”", options: ["Muhammad Ali", "Mike Tyson", "Usain Bolt"], correct: 1, a: "The boxer's famous boast." },
        { q: "“I'll be back.”", options: ["Rocky", "James Bond", "The Terminator"], correct: 3, a: "The Terminator, 1984." },
        { q: "“To infinity and beyond!”", options: ["Woody", "Buzz Lightyear", "Shrek"], correct: 2, a: "Toy Story." },
        { q: "“Education is the most powerful weapon which you can use to change the world.”", options: ["Nelson Mandela", "Mahatma Gandhi", "Malala Yousafzai"], correct: 1 },
        { q: "“Life is like a box of chocolates.”", options: ["Willy Wonka", "Forrest Gump", "Mr Bean"], correct: 2, a: "Forrest Gump, 1994." },
        { q: "“Why so serious?”", options: ["Darth Vader", "Batman", "The Joker"], correct: 3, a: "The Dark Knight, 2008." },
        { q: "“I'm the king of the world!”", options: ["Jack in Titanic", "Simba", "Elvis Presley"], correct: 1, a: "Titanic, 1997." },
        { q: "“Elementary, my dear Watson.”", options: ["Hercule Poirot", "Sherlock Holmes", "James Bond"], correct: 2, a: "Though never in those exact words in the books." }
      ]
    },
    {
      id: "namefive",
      kind: "quiz",
      number: null,
      name: "Name 5",
      subtitle: "in 30 seconds",
      blurb: "Five answers before the clock runs out.",
      rulesKey: "nameFive",
      noun: "Turn",
      turns: true,
      tint: "#ff4a1c",
      howTo: [
        "Teams take turns. Each turn is a new topic.",
        "Shout out five answers before time runs out to win the points."
      ],
      points: "20 points if the team names five",
      items: [
        { q: "Name 5 red fruits", a: "Strawberry, cherry, raspberry, apple, pomegranate, cranberry…" },
        { q: "Name 5 countries in Europe", a: "France, Spain, Italy, Germany, Portugal, Greece…" },
        { q: "Name 5 Disney films", a: "Frozen, The Lion King, Moana, Aladdin, Encanto…" },
        { q: "Name 5 things you find in a kitchen", a: "Fridge, kettle, oven, sink, toaster…" },
        { q: "Name 5 sea creatures", a: "Shark, octopus, dolphin, jellyfish, crab…" },
        { q: "Name 5 capital cities", a: "London, Paris, Abuja, Tokyo, Nairobi…" },
        { q: "Name 5 things that are yellow", a: "Banana, sun, lemon, sweetcorn, a school bus…" },
        { q: "Name 5 superheroes", a: "Superman, Batman, Black Panther, Spider-Man, Wonder Woman…" },
        { q: "Name 5 board games", a: "Monopoly, Scrabble, Ludo, Chess, Cluedo…" },
        { q: "Name 5 football clubs", a: "Arsenal, Barcelona, Real Madrid, Chelsea, Liverpool…" }
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
