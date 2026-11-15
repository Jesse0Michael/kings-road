import {
  Game,
  neighbors,
  NODE_CAP,
  roadBetween,
  roads,
  runCost,
  unitCount,
  WALL_CAP,
} from "../game/engine";
export const positions: [number, number][] = Array.from(
  { length: 5 },
  (_, i) => [
    Math.sin((i * Math.PI * 2) / 5) * 3.05,
    -Math.cos((i * Math.PI * 2) / 5) * 3.05,
  ],
);
positions.push([0, 0]);
export const BOARD_RADIUS = 4.12;
export function canBuild(g: Game, road: number) {
  return (
    !g.winner &&
    g.human === g.turn &&
    g.phase === "build" &&
    g.walls[road] < WALL_CAP &&
    g.budget > 0
  );
}
export function nodeSelectable(g: Game, n: number, selected: number | null) {
  if (g.winner || g.human !== g.turn) return false;
  if (g.phase === "deploy")
    return n < 5 && n !== g.runner && unitCount(g, n) < NODE_CAP;
  if (g.phase === "run") return runCost(g, n) <= g.budget;
  if (g.phase !== "move") return false;
  const ready = (at: number) =>
    g.units.some((u) => u.node === at && !g.moved.includes(u.id));
  if (ready(n)) return true;
  if (selected === null || !ready(selected) || !neighbors(selected).includes(n))
    return false;
  return (
    n === 5 ||
    unitCount(g, n) < NODE_CAP ||
    g.walls[roadBetween(selected, n)] > 0
  );
}
// Pick the nearest road in board coordinates, ignoring the congested node junctions.
// An ambiguous tap between roads does nothing instead of placing on the wrong edge.
export function pickRoad(x: number, z: number): number | null {
  if (positions.some(([nx, nz]) => Math.hypot(nx - x, nz - z) < 0.66))
    return null;
  const candidates = roads
    .map(([a, b], road) => {
      const [ax, az] = positions[a],
        [bx, bz] = positions[b];
      const dx = bx - ax,
        dz = bz - az;
      const t = Math.max(
        0,
        Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)),
      );
      return {
        road,
        distance: Math.hypot(x - (ax + t * dx), z - (az + t * dz)),
      };
    })
    .sort((a, b) => a.distance - b.distance);
  return candidates[0].distance <= 0.45 &&
    candidates[1].distance - candidates[0].distance > 0.1
    ? candidates[0].road
    : null;
}
