# King’s Road — A Traditional Tavern Game

King’s Road is a three-player asymmetric strategy game played in taverns, inns, and households throughout Khyriel. Its origins trace back to the early age of kingdoms and territorial expansion, when fortification, conquest, and control of roads were central to warfare.

The game represents a struggle between three competing roles: the Builder, Army, and Runner. Each uses different dice, follows different mechanics, and earns points through different objectives.

King’s Road is played with polyhedral dice, a small board, and wooden playing pieces.

## Board and setup

- Five perimeter nodes surrounding a central castle: six locations total.
- Ten roads: five connecting adjacent perimeter nodes and five connecting the perimeter to the castle.
- Walls can be constructed on any road, with no stacking limit.
- Walls remain until destroyed.
- The Runner starts at perimeter node 1 (top).
- The Army begins with no units on the board.

## Roles

| Player | Role    | Dice | Objective                                  |
| ------ | ------- | ---- | ------------------------------------------ |
| 1      | Builder | 3d4  | Construct defenses and destroy Army units. |
| 2      | Army    | 2d6  | Invade the central castle.                 |
| 3      | Runner  | 1d8  | Explore the board and disrupt opponents.   |

## 1. Builder’s turn

Roll 3d4 and add the results. Every 2 points allows construction of one wall on any road. Construction points that cannot purchase another wall are discarded.

## 2. Army’s turn

First, move existing Army units one connected location each.

A unit reaching the central castle scores 1 point for the Army and is removed.

A unit encountering a wall may sacrifice itself to destroy one wall, awarding 1 point to the Builder.

After movement, roll 2d6. Deploy that many new units across any perimeter nodes.

Army units cannot be deployed on a node currently occupied by the Runner.

## 3. Runner’s turn

Roll 1d8 to determine available movement points.

Traveling an unobstructed road costs 1 movement point.

Crossing a road containing a wall costs 2 movement points, destroys that wall, and includes crossing the road. Each additional wall requires another 2 movement points.

Entering a node occupied by Army units destroys one Army unit, without awarding the Builder points.

Earn 1 point for each unique node visited, excluding the Runner’s starting node.

Previously visited nodes do not score again until all six locations have been visited, at which point visited-node scoring resets.

## Winning

The first player to reach 15 points wins. Scores accumulate between rounds. Turns repeat Builder → Army → Runner.

## Playtesting notes

King’s Road is a playable early prototype, but its mechanics are not yet balanced.

- Builder: Has difficulty scoring consistently because points depend on Army units sacrificing themselves against walls.
- Army: Can concentrate or distribute forces to create openings toward the castle.
- Runner: Scores relatively easily through movement and can strategically destroy walls or Army units.
- Walls: Unlimited construction creates meaningful defensive strategies but can make certain routes expensive to traverse.
- Future considerations: Revisit Builder scoring, Runner movement costs (particularly whether destroying a wall should also require an additional movement point), the scoring reset for visited nodes, and overall balance.

## Place in Khyriel

King’s Road is an established pastime that has spread through soldiers, merchants, and travelers over generations. Its military themes evoke the political conflicts and territorial struggles of Khyriel’s early kingdoms, although its precise origin is uncertain.

Boards range from simple patterns scratched into tavern tables to finely carved wooden sets owned by wealthy households. Regional variations and informal wagers are common, making King’s Road both a casual diversion and a competitive game of strategy.

The game’s three asymmetric roles are its defining feature: one player builds, one invades, and one navigates, with each player’s actions influencing the opportunities available to the others.

## Confirmed clarifications

The original rules above are retained as supplied. Subsequent author clarifications:

- Army units may stay in place instead of moving.
- The Runner may end its turn early, leaving movement points unused.
- Returning to the Runner’s original starting space counts for scoring. The starting-space exclusion in the original text above is superseded by this clarification.

For the current scoring and sequencing details used by the browser game, see [implementation decisions](design.md).

## Current browser playtest revision

- Each road holds at most five walls.
- Each perimeter node holds at most five Army soldiers.
- Ready Army soldiers move together as a group. Excess soldiers that cannot fit remain at the origin and may attempt another road. Soldiers that moved cannot move again that turn.
- On blocked roads, each wall consumes one soldier; surviving soldiers cross up to the destination’s capacity.
- Unplaceable reinforcements or construction are discarded only when every valid placement is full.

These playtest revisions supersede the original unlimited stacking and individual movement rules in the browser game.

## Latest Runner scoring clarification

Runner points are awarded per unique node **entered during that Runner turn**, rather than per exploration circuit. Starting on a node gives no point. If the Runner leaves and returns to that starting node, it earns one point for that entry. Further visits to any node already scored that turn earn nothing.

For example, I → II → I → II → I earns two points: one for entering II and one for returning to I. Scoring eligibility resets at the next Runner turn, even if not all six locations were reached. Visiting all six never resets it within a turn. Accumulated scores are retained. This supersedes the original circuit-reset rule and confirms that a return to the starting space can score once per turn.
