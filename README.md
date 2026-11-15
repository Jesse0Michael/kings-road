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
- Carved soldier figures, a distinct hooded Runner, and yellow walls perpendicular to roads.
- Role-colored polyhedral dice with physical tumbling and a controlled result reveal.
- Legal-action controls alongside direct board interaction.
- Automatic local saves, continue, completed-game chronicle with final scores, and JSON save export/import.
- Responsive layout, reduced-motion support, and optional fast computer turns.
- All game logic, models, procedural textures, fonts, and physics served with the app. No runtime CDN dependency.

## Playing

Choose a role on the home screen. Builder acts first, followed by Army and Runner. The first role to score 15 wins immediately.

- **Builder:** Roll, then click roads or road buttons to spend all available walls.
- **Army:** Select a location containing an unmoved soldier, then an adjacent destination. Repeat for each soldier, or hold all remaining soldiers. Then roll and deploy reinforcements by clicking perimeter locations. You cannot deploy on the Runner.
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
  scene/Table.tsx        # Board, carved pieces, labels, dice and physics
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
