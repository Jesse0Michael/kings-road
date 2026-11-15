# King’s Road MVP decisions

## Product

A static, browser-only game: one human chooses any role and plays against two computer rivals. The rules remain asymmetric and unbalanced as designed. There is no backend or account system.

## Art direction

The selected direction is the carved tabletop concept: warm wood, a fixed shallow overhead perspective, muted crimson soldiers, warm stone Builder walls with gold ownership accents, and a unique teal hooded thief with a dagger and belt pouch for the Runner. The Army wears faceted steel helmets and carries crimson shields with swords tucked close. The castle is an engraved emblem inset into the board rather than a separate playing piece. Roads are dark grooves connecting the six nodes. Walls cross these roads perpendicularly. Dice and interface accents follow role colors.

The board, castle engraving, figures, dice, and wood grain are generated in code. Wood uses separate color and bump textures with plank seams, knots, pores and worn varnish; the table has its own darker surface. Fonts are bundled locally. Numeric labels retain readable counts when forces or wall stacks grow large. Up to five soldiers and seven walls per location/road are modeled, with exact counts in labels and controls. The Runner and soldiers retain stable visual identities while moving between nodes. They lift, glide with a small rotation, and settle; new walls and soldiers drop onto the board with a damped bounce.

## Rules interpretations

Author confirmations supersede the relevant wording in the original rules:

- An Army soldier may remain in place. Holding remaining soldiers ends the movement phase, not the entire Army turn; reinforcements follow.
- The Runner may end movement early.
- Runner scoring is now per turn: the starting location is already visited, and each other unique node entered earns one point. Repeated visits earn nothing until the next Runner turn.

Implementation decisions where the prototype did not prescribe the detail:

- Exploration resets only at the start of the next Runner turn, never after visiting all six locations. Total scores are cumulative.
- Army movement resolves sequentially in the chosen order. Each existing soldier moves at most once; newly deployed soldiers wait until the next Army turn.
- A soldier attempting a blocked road is sacrificed at that road. It destroys exactly one wall and does not cross or score a castle arrival.
- A blocked Runner crossing requires enough points to clear every wall: two movement points per wall, with no additional crossing cost. Partial destruction without crossing is unavailable.
- Entering an occupied location removes exactly one soldier, even if others remain.
- Victory is immediate at 15, including Builder points earned during an Army turn.
- The Builder spends all purchased walls; the Army deploys its full rolled reinforcements. Neither has an optional phase skip. Only Army movement and Runner movement can end early.

## State and persistence

Version 1 stores the complete serializable game state, including the random seed, turn phase, available budget, individual soldiers and movement eligibility, exploration sets, scores, and recent event log. Only committed actions are saved; reloading during a dice animation restores the last committed state. A roll from that state yields the same result.

Browser localStorage keeps one active game and the latest 100 completed results. Save failures display a warning with export guidance. Imports are size-limited and shape-validated. Export/import transports the active game; it does not merge completed-game history. Unsupported/corrupt saved games are ignored on startup.

## Computer players

The Builder prioritizes pressured castle approaches, with diminishing value for stacking walls on a single road. The Army prefers the castle and seeks lower-wall alternatives when heavily blocked. The Runner prioritizes unscored affordable destinations. These are baseline public-information strategies; no computer receives extra dice or hidden information.

## Rendering and dice

The engine determines seeded dice results. Rapier supplies gravity, collision, and tumbling; after the roll interval, dice transition to a readable authoritative result. Physical settling does not determine randomness. Reduced-motion users skip the rolling interval. A WebGL failure shows a fallback message while labeled game controls remain usable.

The fixed camera and compact piece counts keep the scene suitable for modern desktop and mobile browsers. Geometry, textures, and fonts do not require external runtime requests. Rapier increases the initial bundle size; the production build currently warns about large JavaScript chunks.

## Capacity playtest revision

All ten roads now hold at most five walls. Perimeter nodes hold at most five Army soldiers. Movement selects all ready soldiers at the origin as a group: one soldier sacrifices per wall, then survivors cross up to the available destination capacity. Excess soldiers remain at the origin and stay eligible to try another road. Soldiers that moved cannot move again that turn. Castle arrivals score and leave immediately, so castle occupancy does not accumulate.

Deployments cannot exceed capacity or use the Runner’s node. If no eligible spaces remain, unused reinforcements are discarded. If every road is full, unused construction is discarded. Older saved games are not destructively trimmed: existing over-cap groups/walls remain, but cannot receive additions until below the cap.

Fast computer turns is now a browser-persisted preference in Settings, rather than a control beside the board.

## Per-turn exploration and consolidated scores

The scoreboard is a compact three-role strip above the board on both desktop and mobile. Runner exploration now tracks unique nodes within one Runner turn (one turn per round). The turn starts with its current node already visited. Every other node may score once, and visiting all six does not reset eligibility. Save/resume retains the current turn’s visited set. Existing accumulated scores are retained; earlier exploration sets are replaced when the next Runner turn begins.

## Piece motion

The scene reconciles committed game states into persistent visual pieces. Placement and movement take roughly 950 ms, with gentle tilt and damped settling. Stationary soldiers keep their slots when a neighbor leaves. Army groups travel together; scoring soldiers move into the castle before fading, sacrifices move to the breached road, and Runner victims are removed at their location. Destroyed walls persist as two falling chunks plus a small fading dust puff, then are disposed. These are controlled presentation animations, rather than dynamic rigid bodies that can move gameplay pieces out of place.

Player controls and AI actions wait until the settling interval completes. Fast computer turns still shortens pauses and dice rolls, while retaining readable piece motion. Reduced-motion users skip piece animation and its delay. Existing saves restore pieces at rest rather than replaying old placements; only committed game state is saved. New games/imports cancel outstanding presentation timers.
