import { Game, roads, runnerCanScore } from "../game/engine";
import { positions } from "./boardLayout";
export { positions } from "./boardLayout";
export type Point = [number, number, number];
export type Motion = "place" | "move" | "remove";
export type Step = {
  kind: Motion;
  from: Point;
  to: Point;
  start: number;
  duration: number;
};
export type Piece = {
  uid: number;
  id: string;
  kind: "soldier" | "wall" | "runner" | "coin";
  node: number;
  slot: number;
  at: Point;
  yaw: number;
  steps: Step[];
  showAt?: number;
  gone?: boolean;
};
export type Transition = { id: number; before: Game; after: Game; at: number };
export const MOTION_MS = 720,
  PLACE_MS = 600,
  REMOVE_MS = 430,
  COIN_COLLECT_MS = 180;
// Movement reaches the destination and finishes lowering at 90% of its path.
export const landingTime = (step: Step) => step.start + step.duration * 0.9;
export const endTime = (p: Piece) =>
  p.steps.length
    ? p.steps[p.steps.length - 1].start + p.steps[p.steps.length - 1].duration
    : 0;
export function location(node: number, slot = 0): Point {
  return [
    positions[node][0] + ((slot % 3) - 1) * 0.27,
    0.175,
    positions[node][1] + Math.floor(slot / 3) * 0.28 - 0.15,
  ];
}
export function wallLocation(road: number, slot: number): Point {
  const [a, b] = roads[road];
  const dx = positions[b][0] - positions[a][0],
    dz = positions[b][1] - positions[a][1],
    len = Math.hypot(dx, dz);
  const order = [0, -1, 1, -2, 2, -3, 3];
  const offset = (order[slot] ?? slot) * 0.27;
  return [
    (positions[a][0] + positions[b][0]) / 2 + (dx / len) * offset,
    0.305,
    (positions[a][1] + positions[b][1]) / 2 + (dz / len) * offset,
  ];
}
const runnerLocation = (g: Game): Point => [
  positions[g.runner][0],
  0.175,
  positions[g.runner][1] - 0.03,
];
export function reconcilePieces(
  old: Piece[],
  g: Game,
  previous?: Game,
  now = 0,
): Piece[] {
  const initial = !previous || previous.id !== g.id;
  const live = initial ? [] : old.filter((p) => !p.gone),
    result: Piece[] = initial ? [] : old.filter((p) => p.gone);
  let serial = old.reduce((n, p) => Math.max(n, p.uid), 0);
  const add = (
    id: string,
    kind: Piece["kind"],
    node: number,
    slot: number,
    at: Point,
    yaw = 0,
    showAt?: number,
  ) => {
    const was = live.find((p) => p.id === id),
      changed = was && was.at.some((v, i) => Math.abs(v - at[i]) > 0.001);
    const steps = was ? [...was.steps] : [];
    if (!initial && kind !== "coin" && (!was || changed))
      steps.push({
        kind: was ? "move" : "place",
        from: was?.at ?? at,
        to: at,
        start: Math.max(now, was ? endTime(was) : 0),
        duration: was ? MOTION_MS : PLACE_MS,
      });
    result.push({
      uid: was?.uid ?? ++serial,
      id,
      kind,
      node,
      slot,
      at,
      yaw,
      steps,
      ...(kind === "coin" ? { showAt: was?.showAt ?? showAt ?? 0 } : {}),
    });
  };
  const used = new Map<number, Set<number>>();
  for (const u of g.units) {
    const p = live.find((p) => p.id === `army-${u.id}` && p.node === u.node);
    if (p) {
      if (!used.has(u.node)) used.set(u.node, new Set());
      used.get(u.node)!.add(p.slot);
    }
  }
  for (const u of g.units) {
    const was = live.find((p) => p.id === `army-${u.id}`),
      slots = used.get(u.node) ?? new Set<number>();
    used.set(u.node, slots);
    let slot = was?.node === u.node ? was.slot : 0;
    while (slots.has(slot) && !(was?.node === u.node && was.slot === slot))
      slot++;
    slots.add(slot);
    add(`army-${u.id}`, "soldier", u.node, slot, location(u.node, slot));
  }
  g.walls.forEach((count, road) => {
    const [a, b] = roads[road],
      yaw = Math.atan2(
        positions[b][0] - positions[a][0],
        positions[b][1] - positions[a][1],
      );
    for (let j = 0; j < Math.min(count, 7); j++)
      add(`wall-${road}-${j}`, "wall", road, j, wallLocation(road, j), yaw);
  });
  add("runner", "runner", g.runner, 0, runnerLocation(g), -0.16);
  const runner = result.find((p) => p.id === "runner")!;
  const runnerMove = previous?.runner !== g.runner;
  const runnerStep = runner.steps.at(-1);
  if (g.turn === "Runner" && !g.winner) {
    // A following turn can begin before the previous turn's visual path is done.
    const showAt = initial
      ? 0
      : Math.max(
          now,
          endTime(runner),
          ...old.filter((p) => p.kind === "coin" && p.gone).map(endTime),
        );
    positions.forEach(([x, z], node) => {
      if (runnerCanScore(g, node))
        add(
          `coin-${g.round}-${node}`,
          "coin",
          node,
          0,
          [x, 1.25, z],
          0,
          showAt,
        );
    });
  }
  const march = previous?.turn === "Army" && previous.phase === "move";
  for (const was of live) {
    if (result.some((p) => !p.gone && p.id === was.id)) continue;
    const steps = [...was.steps];
    let start = Math.max(now, endTime(was));
    let at = was.at;
    if (was.kind === "coin") {
      const collected =
        runnerMove &&
        was.node === g.runner &&
        g.scores.Runner > (previous?.scores.Runner ?? g.scores.Runner);
      // Collected coins follow their own arrival; uncollected coins wait for the
      // last queued move before clearing at turn end, early stop, or victory.
      start = Math.max(
        start,
        collected && runnerStep ? landingTime(runnerStep) : endTime(runner),
      );
    }
    if (was.kind === "soldier" && march) {
      const road = roads.findIndex(
        ([a, b], i) =>
          previous!.walls[i] > g.walls[i] && (a === was.node || b === was.node),
      );
      const casualties = previous!.units.filter(
        (u) =>
          u.node === was.node &&
          !previous!.moved.includes(u.id) &&
          !g.units.some((v) => v.id === u.id),
      );
      const sacrifice =
        road >= 0 &&
        casualties.findIndex((u) => `army-${u.id}` === was.id) <
          previous!.walls[road] - g.walls[road];
      if (sacrifice) at = wallLocation(road, 0);
      else if (previous!.scores.Army < g.scores.Army) at = [0, 0.175, 0];
      steps.push({
        kind: "move",
        from: was.at,
        to: at,
        start,
        duration: MOTION_MS,
      });
      start += MOTION_MS;
    } else if (was.kind === "soldier" && runnerMove && runnerStep) {
      start = Math.max(start, runnerStep.start + MOTION_MS * 0.84);
    }
    if (was.kind === "wall") {
      if (runnerMove && runnerStep)
        start = Math.max(start, runnerStep.start + MOTION_MS * 0.42);
      else if (march) start = Math.max(start, now + MOTION_MS * 0.7);
    }
    steps.push({
      kind: "remove",
      from: at,
      to: at,
      start,
      duration: was.kind === "coin" ? COIN_COLLECT_MS : REMOVE_MS,
    });
    result.push({ ...was, at, steps, gone: true });
  }
  return result;
}
const smooth = (v: number) => {
  const x = Math.max(0, Math.min(1, v));
  return x * x * (3 - 2 * x);
};
export function samplePiece(piece: Piece, now: number) {
  const step =
    piece.steps.find((s) => now < s.start + s.duration) ?? piece.steps.at(-1);
  if (!step || now < (piece.showAt ?? 0))
    return {
      position: piece.at,
      rotation: [0, piece.yaw, 0] as Point,
      opacity: now < (piece.showAt ?? 0) ? 0 : 1,
      scale: 1,
      breaking: 0,
      done: now >= (piece.showAt ?? 0),
    };
  const t = Math.max(0, Math.min(1, (now - step.start) / step.duration));
  let position = [...step.from] as Point,
    rock = 0,
    opacity = 1,
    scale = 1;
  if (step.kind === "place") {
    const fall = Math.min(1, t / 0.55);
    const settle = Math.max(0, (t - 0.55) / 0.45);
    position = [
      step.to[0],
      step.to[1] +
        0.65 * (1 - fall * fall) +
        Math.abs(Math.sin(settle * 11)) * 0.045 * Math.exp(-settle * 4),
      step.to[2],
    ];
    rock =
      0.04 * (1 - fall) + Math.sin(settle * 15) * 0.065 * Math.exp(-settle * 4);
  }
  if (step.kind === "move") {
    const progress = smooth((t - 0.16) / 0.56),
      lift = t < 0.18 ? smooth(t / 0.18) : 1 - smooth((t - 0.72) / 0.18);
    position = step.from.map(
      (v, i) => v + (step.to[i] - v) * progress + (i === 1 ? 0.55 * lift : 0),
    ) as Point;
    rock =
      Math.sin(t * 13) * 0.055 * (t < 0.75 ? 1 : Math.exp(-(t - 0.75) * 10));
  }
  if (step.kind === "remove") {
    if (piece.kind === "coin") {
      opacity = 1 - smooth(t);
      scale = 1 - smooth(t) * 0.25;
      position[1] += smooth(t) * 0.12;
    } else {
      opacity = 1 - smooth((t - 0.2) / 0.8);
      scale = 1 - t * 0.15;
      rock = t * 1.25;
      position[1] -= t * 0.09;
    }
  }
  if (t === 1 && step.kind !== "remove") {
    position = step.to;
    rock = 0;
  }
  return {
    position,
    rotation: [
      rock,
      piece.yaw +
        (step.kind === "move" ? Math.sin(t * Math.PI * 2) * 0.035 : 0),
      rock * 0.65,
    ] as Point,
    opacity,
    scale,
    breaking: step.kind === "remove" ? t : 0,
    done: now >= endTime(piece),
  };
}
