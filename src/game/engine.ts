export const roles = ["Builder", "Army", "Runner"] as const;
export type Role = (typeof roles)[number];
export const roads = Array.from({ length: 5 }, (_, i) => [
  i,
  (i + 1) % 5,
]).concat(Array.from({ length: 5 }, (_, i) => [i, 5]));
export const WALL_CAP = 5;
export const NODE_CAP = 5;
export const unitCount = (g: Game, n: number) =>
  g.units.filter((u) => u.node === n).length;
export const deploymentAvailable = (g: Game) =>
  [0, 1, 2, 3, 4].some((n) => n !== g.runner && unitCount(g, n) < NODE_CAP);
export type Unit = { id: number; node: number };
export type Game = {
  version: 1;
  id: string;
  human: Role;
  turn: Role;
  round: number;
  phase: "roll" | "build" | "move" | "deploy" | "run";
  scores: Record<Role, number>;
  walls: number[];
  units: Unit[];
  nextId: number;
  moved: number[];
  runner: number;
  visited: number[];
  scored: number[];
  budget: number;
  dice: number[];
  seed: number;
  winner: Role | null;
  log: string[];
};
export type Action =
  | { type: "roll" }
  | { type: "wall"; road: number }
  | { type: "march"; unit: number; node: number }
  | { type: "deploy"; node: number }
  | { type: "run"; node: number }
  | { type: "end" };
export function createGame(human: Role, seed = Date.now() >>> 0): Game {
  return {
    version: 1,
    id: crypto.randomUUID(),
    human,
    turn: "Builder",
    round: 1,
    phase: "roll",
    scores: { Builder: 0, Army: 0, Runner: 0 },
    walls: Array(10).fill(0),
    units: [],
    nextId: 1,
    moved: [],
    runner: 0,
    visited: [0],
    scored: [],
    budget: 0,
    dice: [],
    seed: seed || 1,
    winner: null,
    log: ["A new journey begins on the King’s Road."],
  };
}
export const roadBetween = (a: number, b: number) =>
  roads.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
export const neighbors = (n: number) =>
  roads.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : []));
export const runCost = (g: Game, n: number) => {
  const r = roadBetween(g.runner, n);
  return r < 0 ? Infinity : g.walls[r] ? 2 * g.walls[r] : 1;
};
function note(g: Game, s: string) {
  g.log = [s, ...g.log].slice(0, 60);
}
function point(g: Game, r: Role) {
  g.scores[r]++;
  if (g.scores[r] >= 15) {
    g.winner = r;
    note(g, `${r} wins the King’s Road!`);
  }
}
function random(g: Game, sides: number) {
  g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
  return 1 + Math.floor((g.seed / 4294967296) * sides);
}
export function rollDice(state: Game) {
  const g = { ...state };
  const sides = g.turn === "Builder" ? 4 : g.turn === "Army" ? 6 : 8;
  const dice = Array.from(
    { length: g.turn === "Builder" ? 3 : g.turn === "Army" ? 2 : 1 },
    () => random(g, sides),
  );
  return { dice, seed: g.seed };
}
function next(g: Game) {
  g.budget = 0;
  g.dice = [];
  g.moved = [];
  if (g.turn === "Builder") {
    g.turn = "Army";
    g.phase = "move";
    if (!g.units.length) g.phase = "roll";
  } else if (g.turn === "Army") {
    g.turn = "Runner";
    g.phase = "roll";
    g.visited = [g.runner];
    g.scored = [];
  } else {
    g.turn = "Builder";
    g.round++;
    g.phase = "roll";
  }
}
export function act(state: Game, a: Action): Game {
  if (state.winner) return state;
  const g = structuredClone(state);
  if (a.type === "roll" && g.phase === "roll") {
    if (g.turn === "Runner") {
      g.visited = [g.runner];
      g.scored = [];
    }
    const rolled = rollDice(g);
    g.dice = rolled.dice;
    g.seed = rolled.seed;
    const total = g.dice.reduce((a, b) => a + b, 0);
    g.budget = g.turn === "Builder" ? Math.floor(total / 2) : total;
    g.phase =
      g.turn === "Builder" ? "build" : g.turn === "Army" ? "deploy" : "run";
    note(
      g,
      `${g.turn} rolled ${g.dice.join(" + ")}. ${g.budget} ${g.turn === "Builder" ? "walls" : g.turn === "Army" ? "reinforcements" : "movement points"} available.`,
    );
  } else if (
    a.type === "wall" &&
    g.phase === "build" &&
    g.budget > 0 &&
    Number.isInteger(a.road) &&
    a.road >= 0 &&
    a.road < 10 &&
    g.walls[a.road] < WALL_CAP
  ) {
    g.walls[a.road]++;
    g.budget--;
    note(g, "Builder raised a wall.");
    if (!g.budget) next(g);
  } else if (a.type === "march" && g.phase === "move") {
    const u = g.units.find((u) => u.id === a.unit);
    if (!u || g.moved.includes(u.id)) return state;
    const r = roadBetween(u.node, a.node);
    if (r < 0) return state;
    const group = g.units.filter(
      (v) => v.node === u.node && !g.moved.includes(v.id),
    );
    let changed = false;
    for (const soldier of group) {
      if (!g.walls[r] && a.node !== 5 && unitCount(g, a.node) >= NODE_CAP)
        break;
      changed = true;
      g.moved.push(soldier.id);
      if (g.walls[r]) {
        g.walls[r]--;
        g.units = g.units.filter((v) => v.id !== soldier.id);
        point(g, "Builder");
      } else if (a.node === 5) {
        g.units = g.units.filter((v) => v.id !== soldier.id);
        point(g, "Army");
      } else soldier.node = a.node;
      if (g.winner) break;
    }
    if (!changed) return state;
    note(
      g,
      "Army group advanced; soldiers without space remain ready at their origin.",
    );
    if (g.units.every((u) => g.moved.includes(u.id))) g.phase = "roll";
  } else if (
    a.type === "deploy" &&
    g.phase === "deploy" &&
    g.budget > 0 &&
    Number.isInteger(a.node) &&
    a.node >= 0 &&
    a.node < 5 &&
    a.node !== g.runner &&
    unitCount(g, a.node) < NODE_CAP
  ) {
    g.units.push({ id: g.nextId++, node: a.node });
    g.budget--;
    if (!g.budget) next(g);
  } else if (
    a.type === "run" &&
    g.phase === "run" &&
    runCost(g, a.node) <= g.budget
  ) {
    const r = roadBetween(g.runner, a.node);
    g.budget -= runCost(g, a.node);
    g.walls[r] = 0;
    g.runner = a.node;
    const victim = g.units.find((u) => u.node === a.node);
    if (victim) {
      g.units = g.units.filter((u) => u.id !== victim.id);
      note(g, "Runner removed one soldier.");
    }
    if (!g.scored.includes(a.node)) {
      g.scored.push(a.node);
      point(g, "Runner");
      note(
        g,
        `Runner explored ${a.node === 5 ? "the castle" : `location ${a.node + 1}`}.`,
      );
    }
    if (!g.visited.includes(a.node)) g.visited.push(a.node);
    if (!g.budget && !g.winner) next(g);
  } else if (a.type === "end") {
    if (g.phase === "move") {
      g.phase = "roll";
      g.moved = g.units.map((u) => u.id);
      note(g, "Remaining soldiers hold position.");
    } else if (g.phase === "run") {
      next(g);
    } else return state;
  } else return state;
  if (!g.winner && g.phase === "build" && g.walls.every((n) => n >= WALL_CAP)) {
    note(
      g,
      "All roads are at their wall limit. Unused construction is discarded.",
    );
    next(g);
  }
  if (!g.winner && g.phase === "deploy" && !deploymentAvailable(g)) {
    note(g, `${g.budget} reinforcements could not deploy: no available space.`);
    next(g);
  }
  return g;
}
