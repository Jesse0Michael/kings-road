# Gameplay analytics (GA4)

The published site sends events directly to **G-YJ0DEXPQ93** using the Google tag. The supplied GTM container (`GTM-KLMPR7FR`) is **not installed**: adding it with another GA4 configuration would risk counting visits twice. There is no backend, API secret, or npm analytics dependency.

## Finish setup in Google Analytics

1. In **Admin → Data streams → Web**, confirm the stream's Measurement ID is `G-YJ0DEXPQ93`. Enhanced measurement can stay enabled. The tag sends the initial `page_view`; internal app screens use the separate `screen_opened` event rather than extra page views.
2. In **Admin → Custom definitions**, create the event-scoped dimensions below. Display names are your choice; event parameter names must match exactly.
3. Create the custom metrics below with scope **Event**. Choose **Seconds** for `active_seconds`, and **Standard** for counts and scores.
4. Mark `game_completed` as a **key event**. Choose **once per event**, since a visitor can complete several games in one session.
5. Open the published game and inspect **Reports → Realtime**. Standard reports and custom definitions can take 24–48 hours to populate. Definitions are not retroactive, so register them early.

Recommended event-scoped dimensions:

| Parameter        | Meaning                                                        |
| ---------------- | -------------------------------------------------------------- |
| `human_role`     | Builder, Army, or Runner selected by the player                |
| `actor_role`     | Role taking a completed turn                                   |
| `controller`     | human or computer                                              |
| `winner_role`    | Winning role                                                   |
| `rules_version`  | Rules applied when events were recorded                        |
| `ai_version`     | Computer strategy version                                      |
| `screen_name`    | home, game, rules, history, or settings                        |
| `timing_partial` | 1 if timing began after the game's original start; otherwise 0 |
| `human_won`      | 1 for human victory, 0 for computer victory                    |

Recommended custom metrics: `total_rounds`, `active_seconds`, `builder_score`, `army_score`, `runner_score`, `roll_total`, `walls_built`, `soldiers_deployed`, `walls_destroyed`, `soldiers_sacrificed`, `castle_arrivals`, `coins_collected`, `soldiers_defeated`, `moves`, `soldiers_held`. Event `round` is the current round; `total_rounds` is provided on completed games. Register `round` as a metric too if you want turn-by-turn round analysis.

Do **not** register `game_id` as a custom dimension: unique IDs produce high-cardinality reports. It is sent for per-game analysis through an optional BigQuery export. No account identity, name, or email is sent by the game.

## Events

| Event            | When and contents                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role_selected`  | A role selector is clicked; `human_role`. The default role is also captured on game start.                                                                 |
| `game_started`   | A new game is actually created, after any replacement confirmation.                                                                                        |
| `game_resumed`   | An unfinished saved game is first opened in this page load. Returning from Settings does not produce another resume.                                       |
| `game_replaced`  | A new game replaces an unfinished one; reports the old game's role, round, scores, and measured time. Cancelling does not emit it.                         |
| `turn_completed` | A committed action ends a role's turn or wins the game. Includes actor/controller, round, roll total, scores, active seconds, and role-specific totals.    |
| `game_completed` | The committed winning action; winner, human role, human-won flag, all scores, rounds, and active seconds. Merely reopening a finished game never sends it. |
| `screen_opened`  | Entering an app screen; `screen_name`.                                                                                                                     |

Game lifecycle and turn events include `game_id`, `human_role`, `rules_version`, `ai_version`, and `round`. Events derive from actual outcomes, including capacity limits, sacrifices and victories that interrupt a march. An Army win before rolling has `roll_total: 0`. Army `moves` counts soldiers moved between perimeter nodes; castle arrivals and sacrifices have their own metrics. Runner `moves` counts roads crossed, including revisits; `coins_collected` counts only awarded points. A Builder's points are earned during Army turns and reflected in `soldiers_sacrificed` and the scoreboard metrics.

## Useful reports

- **Acquisition:** GA4's built-in reports show visitor sources, devices and approximate geography.
- **Role popularity:** filter to `game_started`, rows `human_role`, value Event count.
- **Outcomes:** filter to `game_completed`, rows `human_role`, columns `winner_role`, value Event count. This distinguishes human and computer wins.
- **Game length:** filter to `game_completed` and `timing_partial = 0`; use average active seconds and average total rounds. Do not sum scores or durations across different event types.
- **Balance:** filter to `turn_completed`; compare actor/controller, rules version, round and action totals.
- **Completion:** an Exploration funnel from `game_started` to `game_completed` gives a useful **user-based** approximation, not an exact per-game completion rate. Players can start several games or return on later dates. For exact per-game cohorts, use a BigQuery export and join events on `game_id` (BigQuery has its own usage/billing model).

Do not equate closing the tab with abandonment: the game may be resumed later. `game_replaced` provides an explicit unfinished outcome. Closing a tab does not emit a fake completion or abandonment event.

## Timing, delivery, and development

Active time counts while the unfinished game screen is visible, including thinking and dice animation time. It excludes hidden tabs, menus, and time between visits; it is not an idle-detection metric. A separate localStorage record (`kings-road.analytics.v1`) checkpoints duration on actions, screen changes, visibility changes, and page exit. Missing/old metadata marks durations as partial. Legacy string journals cannot reconstruct every action from before this integration. Rules and AI version constants identify the implementation recording the events; bump them when those behaviors change.

Normal local development and local production previews send nothing to Google. The tag loads only in a production build on `jesse0michael.github.io`. To inspect locally without sending traffic:

```sh
VITE_ANALYTICS_DEBUG=true npm run dev
```

Inspect `window.dataLayer` in the console. It contains standard `gtag` command arguments, but debug mode does not load Google's script. Playwright starts Vite in this mode; stop an existing non-debug dev server before running the analytics browser test.

The application does not wait for analytics requests. Blocked scripts, offline play, unavailable storage and lost browser requests do not stop gameplay. Delivery is best effort; refresh races, multiple tabs and blockers can affect counts. The game prevents normal reloads from repeating completed-game events but does not claim server-enforced exactly-once delivery.

GA4 uses its normal browser identification and measurement behavior. The configuration disables Google Signals and advertising personalization; it does not enable session recording. This implementation does not include a consent-management platform; configure consent handling appropriate to the site's audience before relying on consent-dependent collection.
