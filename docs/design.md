# King’s Road implementation decisions

## Product

A static, browser-only game: one human chooses any role and plays against two computer rivals. The rules remain asymmetric and unbalanced as designed. There is no backend or account system. The compact scoreboard sits above the playing surface and shows each role's score. The winning card is labeled and pulses gently; reduced-motion mode keeps a static highlight. The role-colored Roll button appears on the table for the human’s roll phase. Audio preferences live in Settings. The journal uses the board's Roman numerals, including when displaying older saved entries.

A role-colored counter in the upper-right corner of the tabletop shows walls left to build, soldiers left to deploy, or movement points left. During Army movement, it counts soldiers still ready to move. It updates without waiting for piece animations. The counter also shows computer turns and stays on the table at mobile sizes; it is hidden during the roll phase and after victory.

The Runner's End movement and Army's Hold remaining soldiers controls live directly beneath their counters, so they remain in the board view on mobile. During Runner turns, silver coins with a crown and a five-road reverse rotate above locations that can still score. `runnerCanScore` drives these coins, the labeled +1 destinations, scoring, and AI preferences. The starting location has no coin; visited locations lose theirs when the traveler arrives. Unvisited coins remain until the turn ends and its queued movement finishes. Colored rings still indicate affordable connected moves. Reduced motion keeps the coins still.

The landing page pairs role selection with a gameplay preview; header navigation provides How to play and Return to table. How to play uses three role cards with small, silent MP4 examples of the real renderer and rules engine. Each card includes its relevant movement costs or capacity limits. Clips use static JPEG posters for reduced motion, have pause/play controls, and pause when offscreen or when the document is hidden. The development-only capture stage and generator are under `scripts/`; only compressed videos and posters ship. No extra WebGL contexts run on the learning pages.

## Art direction and input

The carved tabletop uses a semi-realistic timber table texture and a quieter continuous wood texture on the pentagonal board. Both are generated, bundled WebP assets. Canvas-drawn engravings and a matching bump map add the roads, Roman numerals I–V, borders, and central castle emblem directly to the board surface. The castle is part of the board; node labels and soldier counts do not float over the scene.

Faceted Army soldiers carry close-held swords and crimson kite shields, with steel helmets and shoulder armor. The Runner is a distinct teal hooded traveler with a visible face, cloak, leather accessories, and a small dagger. Warm stone walls cross roads perpendicularly. Role colors carry through dice, scores, input highlights, and controls. Fonts are bundled locally.

Buildable roads have a soft gold highlight only on the human Builder’s turn. A broad board-plane hit test selects the nearest road, excluding node junctions and rejecting ambiguous taps between adjacent edges. Clicking an existing wall builds on that same road. Army origins and legal destinations have subtle crimson rings; the selected origin turns gold. Deployment highlights honor capacity and the Runner’s protected node. The same validation drives labeled controls beside the board.

## Rules and capacity

Author confirmations supersede the relevant wording in the [original rules](rules.md):

- Army soldiers may remain in place. Holding remaining soldiers ends movement; reinforcements follow.
- Each road holds five walls. Each perimeter node holds five soldiers.
- Selecting an Army origin moves all ready soldiers as a group. On a blocked road, one soldier sacrifices per wall. Survivors cross up to destination capacity. Excess soldiers stay ready at their origin and can try another road. A soldier that crosses cannot move again that turn; new reinforcements wait until the next Army turn.
- Castle arrivals score and leave immediately, so castle occupancy does not accumulate.
- Deployments cannot use the Runner’s node. If every eligible placement is full, leftover reinforcements or construction are discarded. Older over-cap saves are not trimmed; additions wait until below the cap.
- The Runner may end movement early. A blocked crossing costs two movement points per wall, including the crossing. It must clear every wall to cross; partial destruction is unavailable.
- Entering an occupied location costs one extra movement point and removes exactly one soldier, with no Builder point. Crossing an open road into soldiers therefore costs two points; one wall plus soldiers costs three, and two walls plus soldiers costs five. The surcharge applies once per entry, regardless of group size, and disappears when the last soldier is gone. The Runner must afford the full crossing and capture before moving. Human controls, board highlights, and computer choices share this calculation.
- The Runner scores once per new location **entered during that turn**, excluding the location where that turn began. Leaving and returning to the start earns no point. Repeated visits earn nothing further that turn. Visiting all six never resets scoring mid-turn. At most five locations can score per turn. Eligibility resets at the next Runner turn; total scores accumulate.
- Victory is immediate at 15, including Builder points earned during an Army turn.
- The Builder spends all purchased walls and the Army deploys all placeable reinforcements. Only Army movement and Runner movement have an optional early end.

## State and persistence

Version 1 stores the complete serializable game state: random seed, turn phase, budget, individual soldiers and movement eligibility, visited/scored nodes, scores, and recent event log. Only committed actions are saved. Reloading during a dice animation restores the state before that roll, and rolling again yields the same result. Reloading during piece motion restores the latest game state with pieces at rest.

`visited` records physical visits, including the turn’s starting location, and excludes them from scoring. `scored` records locations that actually earned a point and starts empty. Both sets guard eligibility, including on resumed saves. Existing cumulative scores are retained; the starting location and all previously visited locations remain ineligible for subsequent actions under the current rule.

Browser localStorage keeps one active game and the latest 100 completed results. Save failures explain that progress will last only while the tab stays open. Saved state is shape-validated on load; unsupported or corrupt saved games are ignored on startup. Players resume through Return to table in the header. Starting a new game replaces the active save; there is no manual file import/export.

## Computer players

The Builder prioritizes pressured castle approaches, with diminishing value for stacking walls on a single road. The Army prefers the castle and seeks lower-wall alternatives when heavily blocked. The Runner favors affordable destinations that can still score, with lower movement costs breaking ties. The excluded starting location offers no scoring preference but remains a legal route to other locations. These baseline strategies use public information and the same validated actions as the human.

Computer actions are spaced by 210 ms. They do not wait for placement or movement to settle. Dice finish before their budget becomes available. There is no speed setting.

## Piece motion

Presentation consumes committed state transitions while gameplay proceeds immediately. New placements take 600 ms; lifted movement takes 720 ms; removal takes 430 ms. Independent pieces animate concurrently. Repeated commands for the same piece append to its path, so a quickly tapped Runner route still visits every selected location. The renderer retains intermediate transitions even when React batches inputs.

Stationary soldiers keep their slots when neighbors leave. Army groups travel together; scoring soldiers reach the castle before fading, and sacrificed soldiers travel to the breached road. Runner victims remain intact until the traveler reaches their location, including on queued paths. Broken walls become two falling chunks and a subtle dust puff. A rebuilt wall can coexist briefly with the fading remains of its predecessor because each visible incarnation has its own identity.

Coins share the Runner's motion queue. Each collection fades over 180 ms from that move's landing, including the final or winning move. Ending movement clears unvisited coins only after the last queued move settles. A following Runner turn's coins wait for the old set to finish clearing. Restored games show only their current eligible coins; reduced motion settles the piece and its collections together.

These controlled presentation animations do not affect rules or block controls. Reduced-motion users skip presentation. New games cancel pending roll timers and restore the appropriate scene.

## Dice

Each die has permanent face numbering, including conventional opposite faces on d6/d8 and apex-readable numbers on d4. `scripts/generate-dice.mjs` uses Rapier during development to simulate convex dice under gravity, friction, and restitution, collecting a settled trajectory for every result. These recordings are checked into the repository. Unit tests verify the final orientation and d4 upper-tip labels.

The rules engine determines a seeded roll. The browser interpolates the corresponding recorded positions and quaternions; there is no face relabeling or correction after landing. Seeded yaw variation keeps repeated results from looking identical. Dice roll directly on the wooden table in separated lanes to avoid interpenetration. Results remain on the table until the next roll. Human and computer rolls take 1.9 seconds. Reduced-motion users see the final pose immediately.

Rapier is a development dependency only. The production app needs no physics WebAssembly download or network service. Assets use Vite’s base URL so they load from the GitHub Pages project subdirectory.

## Audio

The original Suno song is preserved outside `public/`; a normalized MP3 copy streams through an HTML audio element on repeat. Web Audio gain nodes provide independent music/effects levels, including on mobile browsers that do not support changing a media element's volume directly. Defaults are 20% music and 40% effects, persisted separately from game saves. Audio initializes after a pointer or keyboard gesture, so the browser's autoplay policy is respected. Zero music pauses the stream; zero effects cancels outstanding cues. A hidden tab pauses music, suspends the audio context, and drops queued effects. Returning resumes the music without replaying missed actions.

Effects are original, offline-generated PCM samples. `SoundTimeline` consumes the same `reconcilePieces` paths as the renderer, so placements sound at contact and queued Runner captures sound at arrival. Army groups and wall stacks coalesce into a single cue per action. Castle arrivals have a distinct sound instead of a death sound; score changes play one short chime per scoring role/action. Reduced-motion mode skips the movement delay. No sound is replayed for restored state. Leaving the table or replacing a game cancels pending effects.

Dice clacks are scheduled at actual table contacts detected from the recorded physical trajectories, scaled to the current roll duration. Simultaneous contacts coalesce to avoid multiplying the volume. The audio buffers are loaded after the first interaction. Missing/blocked audio does not affect gameplay. A small compressor controls overlapping effects; sounds do not block actions. Releasing the effects slider, including a keyboard adjustment, previews the selected volume. Dragging is silent; zero stays muted. A new preview replaces any previous preview.

## Rendering limits

The fixed camera and small piece counts keep the scene practical for modern desktop and mobile browsers. The app still requires WebGL for the tabletop; a rendering failure leaves the labeled controls available. Three.js produces a sizeable initial JavaScript bundle and Vite’s standard large-chunk warning. There is no PWA service worker or guaranteed offline reload support.
