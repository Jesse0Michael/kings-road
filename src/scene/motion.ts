import { Game, roads } from "../game/engine";
export type Point = [number, number, number];
export type Motion = "idle" | "place" | "move" | "remove";
export type Piece = {
  id: string;
  kind: "soldier" | "wall" | "runner";
  node: number;
  slot: number;
  at: Point;
  from: Point;
  yaw: number;
  motion: Motion;
  revision: number;
  gone?: boolean;
};
export const MOTION_MS = 950;
export const positions: [number, number][] = Array.from(
  { length: 5 },
  (_, i) => [
    Math.sin((i * Math.PI * 2) / 5) * 3.05,
    -Math.cos((i * Math.PI * 2) / 5) * 3.05,
  ],
);
positions.push([0, 0]);
export function location(node: number, slot = 0): Point {
  return [
    positions[node][0] + ((slot % 3) - 1) * 0.25,
    0.3,
    positions[node][1] + Math.floor(slot / 3) * 0.27 - 0.1,
  ];
}
export function wallLocation(road: number, slot: number): Point {
  const [a, b] = roads[road];
  const dx = positions[b][0] - positions[a][0],
    dz = positions[b][1] - positions[a][1];
  const length = Math.hypot(dx, dz),
    offset = (slot - 2) * 0.27;
  return [
    (positions[a][0] + positions[b][0]) / 2 + (dx / length) * offset,
    0.35,
    (positions[a][1] + positions[b][1]) / 2 + (dz / length) * offset,
  ];
}
const runnerLocation = (g: Game): Point => [
  positions[g.runner][0],
  g.runner === 5 ? 0.17 : 0.3,
  positions[g.runner][1],
];
export function reconcilePieces(
  old: Piece[],
  g: Game,
  previous?: Game,
): Piece[] {
  const initial = !previous || previous.id !== g.id;
  const live = initial ? [] : old.filter((p) => !p.gone);
  const result: Piece[] = initial ? [] : old.filter((p) => p.gone);
  const add = (
    id: string,
    kind: Piece["kind"],
    node: number,
    slot: number,
    at: Point,
    yaw = 0,
  ) => {
    const was = live.find((p) => p.id === id),
      changed = was && was.at.some((v, i) => v !== at[i]);
    result.push({
      id,
      kind,
      node,
      slot,
      at,
      from: was && !changed ? was.from : (was?.at ?? at),
      yaw,
      motion: initial ? "idle" : !was ? "place" : changed ? "move" : was.motion,
      revision: !was || changed ? (was?.revision ?? 0) + 1 : was.revision,
    });
  };
  // Keep slots occupied by stationary soldiers, so a removed neighbor never makes the survivors hop.
  const used = new Map<number, Set<number>>();
  for (const u of g.units) {
    const p = live.find((p) => p.id === `army-${u.id}` && p.node === u.node);
    if (p) {
      if (!used.has(u.node)) used.set(u.node, new Set());
      used.get(u.node)!.add(p.slot);
    }
  }
  for (const u of g.units) {
    const was = live.find((p) => p.id === `army-${u.id}`);
    const slots = used.get(u.node) ?? new Set<number>();
    used.set(u.node, slots);
    let slot = was?.node === u.node ? was.slot : 0;
    while (slots.has(slot) && !(was?.node === u.node && was.slot === slot))
      slot++;
    slots.add(slot);
    add(`army-${u.id}`, "soldier", u.node, slot, location(u.node, slot));
  }
  g.walls.forEach((count, road) => {
    const [a, b] = roads[road];
    const yaw = Math.atan2(
      positions[b][0] - positions[a][0],
      positions[b][1] - positions[a][1],
    );
    for (let j = 0; j < Math.min(count, 7); j++)
      add(`wall-${road}-${j}`, "wall", road, j, wallLocation(road, j), yaw);
  });
  add("runner", "runner", g.runner, 0, runnerLocation(g), -0.2);
  for (const was of live) {
    if (result.some((p) => p.id === was.id)) continue;
    let at = was.at;
    if (
      was.kind === "soldier" &&
      previous?.turn === "Army" &&
      previous.phase === "move"
    ) {
      const road = roads.findIndex(
        ([a, b], i) =>
          previous.walls[i] > g.walls[i] && (a === was.node || b === was.node),
      );
      // Sacrifices travel to the breached road; scoring soldiers enter the castle.
      const lostOnRoad = road >= 0 ? previous.walls[road] - g.walls[road] : 0;
      const casualties = previous.units.filter(
        (u) =>
          u.node === was.node &&
          !previous.moved.includes(u.id) &&
          !g.units.some((v) => v.id === u.id),
      );
      const isSacrifice =
        casualties.findIndex((u) => `army-${u.id}` === was.id) < lostOnRoad;
      if (road >= 0 && isSacrifice) at = wallLocation(road, 2);
      else if (previous.scores.Army < g.scores.Army) at = [0, 0.19, 0];
    }
    result.push({
      ...was,
      from: was.at,
      at,
      motion: "remove",
      gone: true,
      revision: was.revision + 1,
    });
  }
  return result;
}
export function sampleMotion(piece: Piece, t: number) {
  t = Math.max(0, Math.min(1, t));
  const smooth = (x: number) => x * x * (3 - 2 * x);
  if (piece.motion === "idle" || (t === 1 && piece.motion !== "remove"))
    return {
      position: piece.at,
      rotation: [0, piece.yaw, 0] as Point,
      scale: 1,
      opacity: 1,
    };
  const removing = piece.motion === "remove",
    placing = piece.motion === "place";
  const progress = smooth(Math.max(0, Math.min(1, (t - 0.16) / 0.57)));
  let y = 0,
    rock = 0;
  if (placing) {
    const fall = Math.min(1, t / 0.49);
    y = 0.72 * (1 - fall * fall);
    rock = 0.035 * (1 - fall) + Math.sin(t * 9) * 0.03 * (1 - fall);
    if (t > 0.49) {
      const s = (t - 0.49) / 0.51;
      y = Math.abs(Math.sin(s * Math.PI * 3)) * 0.065 * Math.exp(-s * 4);
      rock = Math.sin(s * 16) * 0.08 * Math.exp(-s * 4);
    }
  } else {
    y =
      t < 0.18
        ? smooth(t / 0.18) * 0.6
        : t < 0.7
          ? 0.6
          : (1 - smooth(Math.min(1, (t - 0.7) / 0.18))) * 0.6;
    rock = Math.sin(t * 15) * 0.065 * (t < 0.7 ? 1 : Math.exp(-(t - 0.7) * 10));
  }
  const fade = removing ? 1 - smooth(Math.max(0, (t - 0.72) / 0.28)) : 1;
  return {
    position: [
      piece.from[0] + (piece.at[0] - piece.from[0]) * progress,
      (placing
        ? piece.at[1]
        : piece.from[1] + (piece.at[1] - piece.from[1]) * progress) + y,
      piece.from[2] + (piece.at[2] - piece.from[2]) * progress,
    ] as Point,
    rotation: [
      rock,
      piece.yaw + Math.sin(t * Math.PI * 2) * 0.045,
      rock * 0.7,
    ] as Point,
    scale: removing ? 0.6 + 0.4 * fade : 1,
    opacity: fade,
  };
}
