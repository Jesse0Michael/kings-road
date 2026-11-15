# King’s Road

A browser-only adaptation of Khyriel’s asymmetric tavern game. Play **Builder**, **Army**, or **Runner** against two computer opponents on a carved 3D wooden tabletop.

## Run locally

Install Node.js **22.12 or newer** (the `.nvmrc` selects Node 22), then from this repository:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. No environment variables, accounts, API keys, or backend services are required. Use a current browser with WebGL and hardware acceleration enabled for the 3D tabletop.

For a production build:

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` directory to static hosting. Asset paths are relative, supporting deployments in a subdirectory such as GitHub Pages. Serve it over HTTP; do not open `index.html` directly from disk.

## What’s in the MVP

- All three playable roles, each with two computer rivals.
- Five perimeter locations, central castle, and ten roads.
- Armored soldier figures with tucked swords and shields, a hooded thief Runner, and low-poly stone walls perpendicular to roads. The castle is engraved into the board.
- Role-colored polyhedral dice with physical tumbling and a controlled result reveal.
- Legal-action controls alongside direct board interaction.
- Automatic local saves, continue, completed-game chronicle with final scores, and JSON save export/import.
- Responsive layout, reduced-motion support, and optional fast computer turns.
- All game logic, models, procedural textures, fonts, and physics served with the app. No runtime CDN dependency.

## Playing

Choose a role on the home screen. Builder acts first, followed by Army and Runner. The first role to score 15 wins immediately.

- **Builder:** Roll, then click roads or road buttons to spend all available walls.
- **Army:** Select a location containing an unmoved soldier, then an adjacent destination. Ready soldiers move as a group; excess stay ready at the origin if the destination is full. You may hold all remaining soldiers. Then roll and deploy reinforcements by clicking perimeter locations. You cannot deploy on the Runner.
- **Runner:** Roll, then choose connected destinations within your movement budget. You may end movement early.

The scoreboard and action panel explain the current phase. Location I is the top node; II–V run clockwise. The castle is marked ♜. Large groups and wall stacks show numeric counts rather than drawing every piece.

Saves are specific to this browser, origin, and device. Export a backup before clearing storage, changing hosts/ports, or replacing a game. Import that JSON file from the home screen to resume elsewhere. The chronicle retains the most recent 100 completed games.

Read the [original rules and author clarifications](docs/rules.md) and [implementation decisions](docs/design.md).

## Technology and organization

React, TypeScript, Vite, Three.js / React Three Fiber, and Rapier. The rules engine is independent of React and rendering. Humans and computer opponents submit the same validated actions. Seeded dice results are determined by the engine; physics provides presentation and settles to the authoritative result, so animations cannot alter a saved game’s rules outcome.

```text
src/
  app/App.tsx            # Screens, turn orchestration, human controls
  game/engine.ts         # State, actions, movement, scoring, seeded dice
  game/ai.ts             # Public-information computer strategies
  persistence/           # Versioned save validation and result history
  scene/                 # Board, pieces, procedural surfaces, dice and physics
  ui/style.css           # Responsive interface styling
  main.tsx               # Entry point and locally bundled fonts

docs/                    # Rules and design decisions
tests/browser/           # Playwright interaction tests
```

## Validation

```sh
npm test                 # Rules, complete computer games, save/history tests
npm run build            # Type check and production bundle
npx playwright install chromium  # Once, if no system Chromium is available
npm run test:browser      # Starts Vite automatically if needed
```

Browser tests cover the three roles’ controls, autosave/reload, mobile layout, import/export, immediate victory, and history. Tests use installed Chromium when available, otherwise Playwright’s bundled Chromium. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to override its location.

## MVP boundaries

The original rules are intentionally not balanced. Computer rivals use straightforward heuristics, not deep search. The camera is fixed for readability. The board and pieces are procedural stylized models, rather than bespoke sculpted assets. Army movement resolves one selected soldier at a time; unlimited unit and wall counts are represented compactly. Sound, online multiplayer, cloud synchronization, installable offline/PWA caching, and a difficulty selector are outside this MVP. Serving all assets locally does not guarantee the app can reload without a connection to its host.

## GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` tests and builds on pushes to `main`, then deploys `dist/` using GitHub’s official Pages artifact/deployment actions. It can also be run manually from the Actions tab. No personal token or hosting secret is needed.

One-time repository setup: open **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**, then run **Test and deploy to GitHub Pages** from Actions (or push another commit). Repository Actions must be enabled; any `github-pages` environment approval policy also applies. Pages availability for private repositories depends on your GitHub plan.

Expected project URL after a successful deployment: `https://jesse0michael.github.io/kings-road/`. The deployment job reports the actual URL. GitHub Pages publishes the app to the web; cloud environment publication is separate.

Current playtest caps: five walls per road, five soldiers per perimeter node. Army groups move together, leaving excess soldiers ready at their origin. Capacity can discard reinforcements when no valid deployment space remains. See `docs/design.md` for full sequencing details.
