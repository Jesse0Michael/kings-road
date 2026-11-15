# King’s Road MVP decisions

## Product

A static, browser-only game: one human chooses any role and plays against two computer rivals. The rules remain asymmetric and unbalanced as designed. There is no backend or account system.

## Art direction

The selected direction is the carved tabletop concept: warm wood, a fixed shallow overhead perspective, muted crimson soldiers, golden-yellow Builder walls, and a unique teal hooded traveler with a staff for the Runner. Roads are dark grooves connecting the six nodes. Walls cross these roads perpendicularly. Dice and interface accents follow role colors.

The board, castle, figures, dice, and wood grain are generated in code. Fonts are bundled locally. Numeric labels retain readable counts when forces or wall stacks grow large. Up to five soldiers and seven walls per location/road are modeled, with exact counts in labels and controls. The Runner animates between nodes; soldiers currently resolve their moves immediately.

## Rules interpretations

Author confirmations supersede the relevant wording in the original rules:

- An Army soldier may remain in place. Holding remaining soldiers ends the movement phase, not the entire Army turn; reinforcements follow.
- The Runner may end movement early.
- Returning to the initial starting space counts for scoring. It starts in the visited set for completing a circuit, but not the scored set.

Implementation decisions where the prototype did not prescribe the detail:

- At a circuit reset, the Runner’s current location starts the next circuit already visited and scored. Every other location, including the original start, can score again on entry.
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
