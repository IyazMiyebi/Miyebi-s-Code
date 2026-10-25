# Ultimate Games Night

A game-show website for hosting games night on a TV. It runs in any modern browser,
needs no sign-up, and works offline after the first visit.

## Running it

- **Online:** open the published link (GitHub Pages, see below) on the laptop that's
  plugged into the TV. Visit it once before the night so it is saved for offline use.
- **On your own computer:** in this folder, run `python3 -m http.server 8000`, then open
  <http://localhost:8000>.

### Keys for the host

| Key | What it does |
|---|---|
| Space, →, Page Down | Next screen |
| ←, Page Up | Previous screen |
| F | Full screen |
| M | Sound on/off |
| S | Settings (points, timers, animation, new game) |
| Esc | Close settings |

A presentation clicker sends Page Up/Page Down, so it works as a simple remote.
The buttons in the corners hide themselves after 3 seconds without mouse movement.

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
- `js/store.js`: teams, scores and settings, saved in the browser
- `js/screens/`: one file per screen
- `js/fx/`: the visual effects (liquid ripple, hanging cards, box grid)
- `sw.js`: offline support. Add any new file to its list.
- `tools/build-single.mjs`: bundles everything into one HTML file
  (`node tools/build-single.mjs games-night.html`)

## Publishing

`.github/workflows/games-night-pages.yml` publishes this folder to GitHub Pages every time
it changes on `main`. One-time setup: in the repository on GitHub, go to
**Settings → Pages** and set **Source** to **GitHub Actions**.
