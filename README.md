# King’s Road

A browser-only adaptation of Khyriel’s asymmetric tavern game. Play **Builder**, **Army**, or **Runner** against two computer opponents on a carved wooden tabletop.

**[Play King’s Road → https://jesse0michael.github.io/kings-road/](https://jesse0michael.github.io/kings-road/)**

No account, backend, or installation is needed. Games save automatically in your browser.

![The carved board, stone walls, hooded Runner, Army figures, and numbered dice](docs/screenshots/tabletop.png)

## Run locally

Install Node.js **22.12 or newer** (the `.nvmrc` selects Node 22), then:

```sh
npm ci
npm run dev
```

Open the address printed by Vite. No environment variables, API keys, or backend services are required. Use a current browser with WebGL and hardware acceleration for the 3D tabletop.

```sh
npm run build           # Type check and create dist/
npm run preview         # Preview the production build
```

The `dist/` directory can be hosted by any static web server. Relative asset paths support subdirectories such as GitHub Pages. Serve it over HTTP; opening `index.html` directly from disk is unsupported.

## At the table

Choose a role; the other two become computer rivals. Turns run **Builder → Army → Runner**. The first to reach **15 points** wins immediately.

| Role    | Dice | Your turn                                                                                                                                                            | Scoring                                                                                                         |
| ------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Builder | 3d4  | Spend each pair of rolled points on a wall. Tap a highlighted road or an existing wall; each road holds five.                                                        | One point per soldier sacrificed against a wall.                                                                |
| Army    | 2d6  | Move ready soldiers as a group to an adjacent location, or hold them. Then roll and deploy, up to five soldiers per perimeter node, excluding the Runner’s location. | One point per soldier reaching the castle.                                                                      |
| Runner  | 1d8  | Spend movement on connected roads, removing walls and one soldier at each occupied destination. End movement whenever you like.                                      | One point per unique location entered that turn. Starting there gives no point; returning there can score once. |

Army soldiers that cannot fit at their destination stay ready at the origin and can try another road. A blocked crossing sacrifices one soldier per wall; surviving soldiers cross if there is room. An open road costs the Runner one movement point; a walled road costs two per wall, including the crossing. Repeated Runner visits never score again in the same turn, even after all six locations have been visited.

The **Roll** button appears on the table in your role’s color when you can roll. Army destinations and buildable roads light up when selectable. Roads have generous tap regions; existing walls are also clickable. The labeled controls beside the board provide the same actions.

Pieces drop, lift, glide, and settle without locking your next action. Computer placements overlap with a short stagger. Runner captures wait for the traveler to arrive. **Settings → Fast computer turns** shortens computer pauses and rolls; the app also respects your system’s reduced-motion preference.

**Settings → Sound at the table** has independent music and effects volume sliders. Music starts at 20%, effects at 40%; zero mutes either channel. Preferences are remembered in this browser. **Tavern Dance**, supplied by the game's creator, loops in the background after your first interaction. Audio pauses in a hidden tab. Quiet original effects accompany placements, movement, broken walls, fallen soldiers, castle arrivals, dice, points, and victory; their timing follows the piece animations.

## Saves and history

- Continue the current game from the home screen.
- The Chronicle keeps the most recent 100 completed games and their final scores.

Saves belong to this browser and web address. Starting a new game replaces the active game. Clearing browser storage removes saved games and the Chronicle; games do not transfer between browsers, devices, or web addresses.

Read the [original rules and current clarifications](docs/rules.md) and [implementation decisions](docs/design.md).

## Graphics and technology

React, TypeScript, Vite, and Three.js through React Three Fiber. A separate rules engine validates the same actions for humans and computers.

The scene uses low-poly soldiers with close-held swords and shields, a hooded traveler, and stone walls crossing the roads. Roman numerals, roads, and the central castle are engraved into one continuous wooden board. Generated WebP wood textures, fonts, and models are bundled locally; the game makes no runtime CDN or image-generation requests.

Dice have permanent face numbering. Their tumbles are recorded from real Rapier simulations during development, with a verified landing for every d4, d6, and d8 result. The browser replays the appropriate trajectory for the engine’s seeded roll. No number changes or forced orientation correction happen at the end, and no physics engine needs to download at runtime. Read a d4 at its upper tip; read d6 and d8 on their upward face.

```text
src/
  app/App.tsx            # Screens, turn orchestration, human controls
  game/                  # Rules engine, seeded dice, computer strategies
  persistence/           # Validated local saves and game history
  audio/                 # Saved volumes, playback, animation-aligned sound cues
  scene/                 # Board, models, hit testing, piece motion, dice
  ui/style.css           # Responsive interface styling
  main.tsx               # Entry point and locally bundled fonts
public/assets/textures/  # Bundled table and board wood textures
public/assets/audio/     # Web music copy and original short sound effects
public/icons/            # Carved Seal favicons, touch and home-screen icons
public/site.webmanifest  # Application identity and home-screen launch settings
assets/audio-source/     # Original song, excluded from the web build
assets/brand/            # Approved icon master, excluded from the web build
scripts/generate-dice.mjs # Development-only physics trajectory generator
docs/                    # Original rules and current design decisions
tests/browser/           # Playwright interaction tests
```

## Validation

```sh
npm test                         # Rules, AI games, persistence, motion, dice, hit targets
npm run build                    # Type check and production bundle
npx playwright install chromium  # Once, if no system Chromium is available
npm run test:browser              # Starts Vite automatically if needed
```

Browser tests cover all three roles, saves/reload, the winning score highlight, history, Runner scoring, Roman-numeral journal entries, overlapping placements, road taps, Army targets, audio controls, and mobile layout. Tests use system Chromium when available, otherwise Playwright’s bundled Chromium. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to override its location.

To regenerate the committed dice recordings, use Node **22.18 or newer**, run `npm run dice:generate`, then `npm test`. Ordinary development and deployment use the committed recordings and do not need this step.

Audio assets are also committed. Optional regeneration: `npm run sfx:generate` needs Python 3; `npm run music:prepare` additionally needs FFmpeg/ffprobe. See [audio credits and details](public/assets/audio/README.md).

**Carved Seal** is the selected icon for browser tabs, bookmarks, and home screens. The committed set covers ICO/PNG favicons, Apple touch icons, and Android regular/maskable icons. `npm run icons:generate` regenerates them from the [approved master](assets/brand/README.md) using ImageMagick 7. The web manifest supports a standalone home-screen launch; it does not add offline caching. [Original icon concepts and an effects preview](docs/mockups/README.md) remain available.

## GitHub Pages deployment

Pushing to `main` runs [Test and deploy to GitHub Pages](.github/workflows/pages.yml): install dependencies, run unit tests, build, and publish `dist/` with GitHub’s official Pages actions. The workflow also supports a manual run from the Actions tab.

The published site is **https://jesse0michael.github.io/kings-road/**. The deployment job links its result. Repository **Settings → Pages → Source** should remain set to **GitHub Actions**. No personal token or hosting secret is needed. Publishing a Codex cloud environment is separate from pushing commits and deploying Pages.

## Current limits

This is a playtestable prototype of intentionally asymmetric, unbalanced rules. Computer rivals use simple public-information strategies. There is no multiplayer, cloud synchronization, difficulty selector, or offline/PWA cache. All game logic runs in the browser, but reloading still requires access to the host unless the browser has retained the necessary assets. The camera is fixed, and figures are stylized procedural models.
