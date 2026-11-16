import { expect, it } from "vitest";
import { act, createGame, type Game } from "./engine";
import { journalRows, type GameEvent } from "./journal";
import { validGame } from "../persistence";

const text = (g: Game) => journalRows(g.log).map((row) => row.text);

it("summarizes Builder placements live, including across reloads, without logging rolls", () => {
  let g = act(createGame("Builder", 17), { type: "roll" });
  expect(g.log).toEqual([]);
  g = act(g, { type: "wall", road: 0 });
  expect(text(g)).toEqual(["Builder raised 1 wall."]);
  g = JSON.parse(JSON.stringify(g));
  g = act(g, { type: "wall", road: 1 });
  expect(text(g)).toEqual(["Builder raised 2 walls."]);
  expect(validGame(g)).toBe(true);
  const old = g;
  g = { ...g, round: 2, turn: "Builder", phase: "build", budget: 1 };
  g = act(g, { type: "wall", road: 2 });
  expect(text(g)).toEqual([
    "Builder raised 1 wall.",
    "Builder raised 2 walls.",
  ]);
  expect(text(old)).toEqual(["Builder raised 2 walls."]);
  expect(g.log[0]).toMatchObject({ round: 2 });
});

it("counts actual deployments across locations, even when the last one ends the turn", () => {
  let g = createGame("Army", 17);
  g.turn = "Army";
  g.phase = "deploy";
  g.budget = 3;
  for (const node of [1, 2, 1]) g = act(g, { type: "deploy", node });
  expect(g.turn).toBe("Runner");
  expect(text(g)).toEqual(["Army deployed 3 soldiers."]);
  expect(g.log[0]).toMatchObject({ round: 1 });
});

it("logs group sacrifices, destroyed walls and castle arrivals from the actual result", () => {
  const g = createGame("Army", 17);
  g.turn = "Army";
  g.phase = "move";
  g.units = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, node: 0 }));
  g.walls[5] = 2;
  const next = act(g, { type: "march", unit: 1, node: 5 });
  expect(text(next)).toEqual([
    "Army advanced I → Castle; destroyed 2 walls, sacrificed 2 soldiers, 3 soldiers reached the castle.",
  ]);
  expect(next.log[0]).toMatchObject({ moved: 0, held: 0 });
});

it("reports capacity overflow and the remaining soldiers' subsequent move separately", () => {
  let g = createGame("Army", 17);
  g.turn = "Army";
  g.phase = "move";
  g.units = [
    ...Array.from({ length: 5 }, (_, i) => ({ id: i + 1, node: 0 })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: i + 6, node: 1 })),
  ];
  g = act(g, { type: "march", unit: 1, node: 1 });
  expect(text(g)).toEqual([
    "Army advanced I → II; moved 2 soldiers, 3 soldiers stayed at I.",
  ]);
  g = act(g, { type: "march", unit: 3, node: 4 });
  expect(text(g)).toEqual([
    "Army advanced I → V; moved 3 soldiers.",
    "Army advanced I → II; moved 2 soldiers, 3 soldiers stayed at I.",
  ]);
});

it("logs only the portion of a march completed before an immediate victory", () => {
  const g = createGame("Army", 17);
  g.turn = "Army";
  g.phase = "move";
  g.units = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, node: 0 }));
  g.walls[5] = 3;
  g.scores.Builder = 14;
  expect(text(act(g, { type: "march", unit: 1, node: 5 }))).toEqual([
    "Builder wins the King’s Road!",
    "Army advanced I → Castle; destroyed 1 wall, sacrificed 1 soldier, 4 soldiers stayed at I.",
  ]);
  g.walls[5] = 0;
  g.scores.Army = 14;
  expect(text(act(g, { type: "march", unit: 1, node: 5 }))).toEqual([
    "Army wins the King’s Road!",
    "Army advanced I → Castle; 1 soldier reached the castle, 4 soldiers stayed at I.",
  ]);
});

it("keeps the full Runner route and totals real coins, walls and defeated soldiers", () => {
  let g = createGame("Runner", 17);
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 8;
  g.walls[0] = 1;
  g.units = [
    { id: 1, node: 1 },
    { id: 2, node: 1 },
  ];
  for (const node of [1, 0, 1, 5]) g = act(g, { type: "run", node });
  expect(text(g)).toEqual([
    "Runner moved I → II → I → II → Castle; collected 2 coins, destroyed 1 wall, defeated 2 soldiers.",
  ]);
  const ended = act(g, { type: "end" });
  expect(ended.round).toBe(2);
  expect(ended.log[0]).toMatchObject({ round: 1, coins: 2 });
});

it("records zero-coin moves and puts a winning collection below the victory", () => {
  const g = createGame("Runner", 17);
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 3;
  g.visited = [0, 1];
  expect(text(act(g, { type: "run", node: 1 }))).toEqual([
    "Runner moved I → II; collected 0 coins.",
  ]);
  g.visited = [0];
  g.scores.Runner = 14;
  expect(text(act(g, { type: "run", node: 1 }))).toEqual([
    "Runner wins the King’s Road!",
    "Runner moved I → II; collected 1 coin.",
  ]);
});

it("does not count illegal actions, full placements, or held soldiers as moves", () => {
  let g = createGame("Army", 17);
  g.turn = "Army";
  g.phase = "move";
  g.units = [
    { id: 1, node: 0 },
    { id: 2, node: 1 },
  ];
  g.moved = [2];
  expect(act(g, { type: "march", unit: 2, node: 5 })).toBe(g);
  g = act(g, { type: "end" });
  expect(text(g)).toEqual(["Army held 1 soldier in place."]);
  g.phase = "deploy";
  g.budget = 4;
  g.units = [1, 2, 3, 4].flatMap((node) =>
    Array.from({ length: 5 }, (_, i) => ({ id: node * 10 + i, node })),
  );
  expect(act(g, { type: "deploy", node: 1 })).toBe(g);
  g.units.pop();
  g.nextId = 99;
  g = act(g, { type: "deploy", node: 4 });
  expect(text(g)[0]).toBe("Army deployed 1 soldier.");
});

it("reads legacy saves without roll chatter, preserves turn boundaries and Roman numerals", () => {
  const g = createGame("Builder", 17);
  g.log = [
    "Builder raised a wall.",
    "Builder raised a wall.",
    "Builder rolled 2 + 1 + 1. 2 walls available.",
    "Builder raised a wall.",
    "Runner explored location 5.",
    "A new journey begins on the King’s Road.",
  ];
  expect(validGame(g)).toBe(true);
  expect(text(g)).toEqual([
    "Builder raised 2 walls.",
    "Builder raised 1 wall.",
    "Runner explored location V.",
  ]);
});

it("validates stored events and caps the log without merging distinct rounds", () => {
  let g = createGame("Builder", 17);
  for (let round = 1; round <= 65; round++) {
    g = {
      ...g,
      round,
      turn: "Builder",
      phase: "build",
      walls: Array(10).fill(0),
      budget: 1,
    };
    g = act(g, { type: "wall", road: 0 });
  }
  expect(g.log).toHaveLength(60);
  expect(g.log.at(-1)).toMatchObject({ round: 6 });
  expect(validGame(JSON.parse(JSON.stringify(g)))).toBe(true);
  for (const event of [
    { kind: "build", round: 1, count: -1 },
    { kind: "run", round: 1, path: [0, 8], coins: 1, walls: 0, soldiers: 0 },
    { kind: "march", round: 1, from: 0, to: 1 },
    { kind: "win", round: 1, role: "Unknown" },
  ]) {
    expect(validGame({ ...g, log: [event as GameEvent] })).toBe(false);
  }
});
