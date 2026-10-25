# Ultimate Games Night

A game-show website for hosting games night on a TV. It runs in any modern browser,
needs no sign-up, and works offline after the first visit.

## Running it

- **Online:** open the published link (GitHub Pages, see below) on the laptop that's
  plugged into the TV. Visit it once before the night so it is saved for offline use.
- **On your own computer:** in this folder, run `python3 -m http.server 8000`, then open
  <http://localhost:8000>.

### Setting up the TV

The show runs in two windows:

- **The big screen** (the normal link) goes on the TV. Press **F** for full screen.
- **Host controls** (press **H**, or add `#host` to the end of the link) stay on the
  laptop. They show the answer before it's revealed, the timer, scoring and every round.
  Each press updates the TV straight away.

For the host window to stay private, set the laptop to **extend** the display to the TV,
not mirror it (Windows: <kbd>Win</kbd>+<kbd>P</kbd> → Extend. Mac: System Settings →
Displays → untick Mirror). If you mirror, run everything from the keyboard on the big
screen instead: it never shows an answer until you reveal it.

### Keys on the big screen

| Key | What it does |
|---|---|
| Space, →, Page Down, Enter | Next step (start timer → time's up → reveal → next question) |
| ←, Page Up | Back a step |
| P | Pause / resume the timer |
| T | Restart the timer |
| R | Reveal the answer now |
| X | Word scramble: shuffle the letters into a new order |
| A | Music: play the clip again |
| 1–4 | Give team 1–4 this round's points (Shift + number takes them away) |
| U | Undo the last score change |
| G | Show / hide the scoreboard |
| Esc | Leave the round, back to the running order |
| F | Full screen |
| M | Sound on/off |
| H | Open host controls |
| S | Settings (points, timers, animation, new game) |

Click a team's score at the bottom of the screen for +points, a custom amount or undo.
A presentation clicker sends Page Up/Page Down, so it works as a simple remote.
The buttons in the corners hide themselves after 3 seconds without mouse movement.

## Music clips

The music round plays official 30-second previews from Apple Music, found
automatically through Apple's free iTunes search. Nothing is hosted on this site.

- **Before the night:** open the host controls (press **H**) and press **Get clips ready**
  under *Music clips*. Every clip and album cover is saved in the browser, so the round
  still plays if the Wi-Fi drops. Use the same laptop and browser on the night.
- **Sound needs one click per window.** Browsers keep a page silent until someone clicks
  or presses a key in it. After opening or reloading the big screen, click it once: it
  shows a *Click to turn on sound* button until you do, and the host controls warn you too.
  Clips play from whichever window you pressed Play in, so the host's click is enough.
- **During the round:** press Space (or *Play clip*). The clip plays for the
  "Music: clip length" set in Settings (10 seconds), then the answer timer starts by itself.
  Press Space during a clip to cut it short and start the timer. **A** plays it again.
  On the reveal, the album cover turns over in the spiral and the clip plays once more.
- **Wrong version or wrong part of the song?** In the host controls, pick another
  *Version*, or set *Start at* to skip into the clip. Apple chooses which 30 seconds the
  preview covers, often the chorus.
- **Song not found?** Type a different search under *Music clips*, or play the song from
  your own phone. The round works the same either way.

## Mini games

Each challenge has its own screen. The winner gets the points (20) with one tap: in the
host controls under *Winner*, or a number key on the result screen.

- **Alphabet Sprint, Charades Relay (turn by turn):** teams play one at a time on their
  own clock. Space starts the next team's turn. Press Space again (or *Finished*) when
  they finish. After every team has played, the result suggests the fastest.
- **Wall Sit, One-Leg Stand (last one standing):** Space starts the clock. Press a team's
  *Out* button (or number key) as each one drops. When one team is left, the clock stops
  and that team is suggested as the winner.
- **Charades prompts** show only in the host controls: let the actor read them there.
  Press *Guessed!* as each one is guessed and it turns over on the TV.
  *Reset for the next team* starts again.
- **Memory Tray:** Space starts 20 seconds of looking (the tiles glow), then "Cover it!".
  Space again starts 45 seconds of writing. Choose and set out the 12 items yourself.

During a challenge, number keys mark a team finished or out (Shift + number undoes it), and
**P** starts or stops the race clock. On the result screen, a number key picks the winner.

## Category Bank, tie-breaker and finale

- **Category Bank:** Space starts the category, and the first team's 5-second turn begins
  (a different team starts each category). Space (or *✓ Valid answer*) gives the team
  their points and passes the turn on. **X** (or *✗ Out*) puts a team out for a repeat or a
  wrong answer, and running out of time puts them out automatically. The last team
  standing gets the bonus. *Bring back* undoes an out.
- **Tie-breaker:** only played if the top two teams are level after Round 5. Type each
  team's guess in the host controls. The reveal ranks the guesses, and you give the
  tie-break (+1 point) to the closest. The backup question is offered if still level.
- **Finale:** "And the winner is…", a drumroll, the winner in their colour, confetti and
  the final scores. *Play again with these teams* resets the scores. The host controls
  can replay the reveal any time, or show it early from the Rounds list.

## Decisions (from the deck)

The deck contradicted itself in a few places. This is what the show uses. Points and
timers can be changed in **Settings**.

- **Music:** 10 points for title and artist, 5 if only one is right.
- **Category Bank:** 10 points per valid answer, plus 20 bonus to the last team standing.
- **Tie-breaker:** closest answer wins (minutes in a week: 10,080). Backup if still tied:
  seconds in a day (86,400).
- **Word scramble:** CHOCOLATE and TELEVISION weren't scrambled in the deck. They are now,
  and the app refuses any scramble that matches the answer.
- **Memory Tray:** the host chooses the 12 items; the screen runs the timers.

## How it's built (for whoever edits it next)

Plain HTML, CSS and JavaScript. No build step, nothing to install.

- `index.html`: the page, which loads everything else
- `data/default-pack.js`: all the questions, songs, categories and points (the "game pack")
- `js/store.js`: teams, scores and settings, saved in the browser and shared with the host window
- `js/game.js`: the show's steps, the countdown and scoring
- `js/host.js`: the host controls window
- `js/sound.js`: sound effects (synthesised, no audio files)
- `js/screens/`: one file per screen
- `js/fx/`: the visual effects (liquid ripple, hanging cards, box grid, ASCII text)
- `js/ui/`: the score strip and pop-up messages
- `sw.js`: offline support. Add any new file to its list.
- `tools/build-single.mjs`: bundles everything into one HTML file
  (`node tools/build-single.mjs games-night.html`)

## Publishing

`.github/workflows/games-night-pages.yml` publishes this folder to GitHub Pages every time
it changes on `main`. One-time setup: in the repository on GitHub, go to
**Settings → Pages** and set **Source** to **GitHub Actions**.
