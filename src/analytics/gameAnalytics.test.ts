import { expect, it } from "vitest";
import { act, createGame, type Game, type Action } from "../game/engine";
import { GameAnalytics, type Parameters } from "./gameAnalytics";

function fixture(saved = new Map<string, string>()) {
  const events: { name: string; params: Parameters }[] = [];
  let time = 0;
  const storage = {
    getItem: (k: string) => saved.get(k) ?? null,
    setItem: (k: string, v: string) => {
      saved.set(k, v);
    },
  };
  const tracker = new GameAnalytics(
    (name, params) => events.push({ name, params }),
    storage,
    () => time,
  );
  const apply = (g: Game, a: Action) => {
    const next = act(g, a);
    tracker.action(g, next, a);
    return next;
  };
  return {
    tracker,
    events,
    saved,
    apply,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

it("counts starts once and distinguishes reload resumes from navigation", () => {
  const f = fixture(),
    g = createGame("Runner", 17);
  f.tracker.start(g, null);
  f.tracker.screen("game", g);
  f.tracker.screen("settings", g);
  f.tracker.screen("game", g);
  expect(f.events.filter((e) => e.name === "game_started")).toHaveLength(1);
  expect(f.events.filter((e) => e.name === "game_resumed")).toHaveLength(0);
  const reload = fixture(f.saved);
  reload.tracker.screen("game", g);
  reload.tracker.screen("game", g);
  expect(reload.events.filter((e) => e.name === "game_resumed")).toHaveLength(
    1,
  );
});

it("preserves visible table time across reloads and excludes hidden tabs and menus", () => {
  const f = fixture();
  let g = createGame("Runner", 17);
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 2;
  g.scores.Runner = 14;
  f.tracker.start(g, null);
  f.tracker.screen("game", g);
  f.advance(2000);
  f.tracker.visibility(false);
  f.advance(60000);
  f.tracker.visibility(true);
  f.advance(1000);
  f.tracker.screen("settings", g);
  f.advance(30000);
  f.tracker.screen("game", g);
  f.advance(2000);
  f.tracker.checkpoint();
  const reload = fixture(f.saved);
  reload.tracker.screen("game", g);
  reload.advance(3000);
  const before = g;
  g = reload.apply(g, { type: "run", node: 1 });
  const completed = reload.events.find((e) => e.name === "game_completed")!;
  expect(completed.params).toMatchObject({
    active_seconds: 8,
    timing_partial: 0,
    human_won: 1,
    runner_score: 15,
    winner_role: "Runner",
    total_rounds: 1,
  });
  reload.tracker.action(before, g, { type: "run", node: 1 });
  expect(reload.events.filter((e) => e.name === "game_completed")).toHaveLength(
    1,
  );
  const again = fixture(reload.saved);
  again.tracker.screen("game", g);
  expect(again.events.map((e) => e.name)).toEqual(["screen_opened"]);
});

it("summarizes turns from actual outcomes, including sacrifices and an interrupted winning march", () => {
  const f = fixture();
  let g = createGame("Army", 17);
  g.turn = "Army";
  g.phase = "move";
  g.scores.Builder = 14;
  g.units = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, node: 0 }));
  g.walls[5] = 3;
  f.tracker.start(g, null);
  f.tracker.screen("game", g);
  g = f.apply(g, { type: "march", unit: 1, node: 5 });
  expect(
    f.events.find((e) => e.name === "turn_completed")!.params,
  ).toMatchObject({
    actor_role: "Army",
    controller: "human",
    walls_destroyed: 1,
    soldiers_sacrificed: 1,
    castle_arrivals: 0,
    builder_score: 15,
    roll_total: 0,
  });
  expect(
    f.events.find((e) => e.name === "game_completed")!.params,
  ).toMatchObject({ winner_role: "Builder", human_won: 0 });
});

it("records computer turns, legal placements, coins and roll totals without per-click events", () => {
  const f = fixture();
  let g = createGame("Runner", 17);
  f.tracker.start(g, null);
  f.tracker.screen("game", g);
  g = f.apply(g, { type: "roll" });
  const total = g.dice.reduce((a, b) => a + b, 0),
    walls = g.budget;
  while (g.turn === "Builder") g = f.apply(g, { type: "wall", road: 0 });
  expect(
    f.events.find((e) => e.name === "turn_completed")!.params,
  ).toMatchObject({
    actor_role: "Builder",
    controller: "computer",
    walls_built: walls,
    roll_total: total,
  });
  g = {
    ...g,
    turn: "Runner",
    phase: "run",
    runner: 0,
    budget: 5,
    dice: [5],
    walls: Array(10).fill(0),
    visited: [0],
    scored: [],
  };
  for (const node of [1, 0, 1, 5, 0]) g = f.apply(g, { type: "run", node });
  expect(
    f.events.filter((e) => e.name === "turn_completed").at(-1)!.params,
  ).toMatchObject({
    actor_role: "Runner",
    moves: 5,
    coins_collected: 2,
    roll_total: 5,
  });
  for (const event of f.events)
    expect(Object.keys(event.params).length).toBeLessThanOrEqual(24); // send_to also occupies one parameter.
});

it("distinguishes replacement from completion and marks preexisting saves as partial", () => {
  const f = fixture(),
    old = createGame("Builder", 17),
    fresh = createGame("Army", 18);
  old.round = 4;
  f.tracker.screen("game", old);
  f.advance(1000);
  f.tracker.start(fresh, old);
  expect(
    f.events.find((e) => e.name === "game_replaced")!.params,
  ).toMatchObject({
    game_id: old.id,
    round: 4,
    timing_partial: 1,
    active_seconds: 1,
  });
  expect(f.events.some((e) => e.name === "game_completed")).toBe(false);
});

it("ignores invalid actions and survives blocked analytics and unavailable or corrupt storage", () => {
  const broken = () => {
    throw new Error("blocked");
  };
  const tracker = new GameAnalytics(
    broken,
    { getItem: broken, setItem: broken },
    () => 0,
  );
  const g = createGame("Builder", 17);
  expect(() => {
    tracker.screen("game", g);
    tracker.start(g, null);
    tracker.action(g, act(g, { type: "roll" }), { type: "roll" });
    tracker.checkpoint();
  }).not.toThrow();
  const f = fixture(new Map([["kings-road.analytics.v1", "{invalid"]]));
  f.tracker.screen("game", g);
  const size = f.events.length;
  f.apply(g, { type: "wall", road: 0 });
  expect(f.events).toHaveLength(size);
});
