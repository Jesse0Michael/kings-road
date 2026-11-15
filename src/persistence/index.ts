import { Game, roles } from "../game/engine";
export type Result = {
  id: string;
  winner: string;
  human: string;
  round: number;
  scores: Game["scores"];
  date: string;
};
export function validGame(v: unknown): v is Game {
  if (!v || typeof v !== "object") return false;
  const g = v as Game;
  return (
    g.version === 1 &&
    typeof g.id === "string" &&
    roles.includes(g.human) &&
    roles.includes(g.turn) &&
    ["roll", "build", "move", "deploy", "run"].includes(g.phase) &&
    Number.isInteger(g.seed) &&
    Number.isInteger(g.round) &&
    g.round > 0 &&
    Number.isInteger(g.budget) &&
    g.budget >= 0 &&
    Array.isArray(g.walls) &&
    g.walls.length === 10 &&
    g.walls.every((n) => Number.isInteger(n) && n >= 0) &&
    Array.isArray(g.units) &&
    g.units.every(
      (u) =>
        Number.isInteger(u.id) &&
        Number.isInteger(u.node) &&
        u.node >= 0 &&
        u.node < 5,
    ) &&
    Number.isInteger(g.nextId) &&
    Number.isInteger(g.runner) &&
    g.runner >= 0 &&
    g.runner < 6 &&
    [g.visited, g.scored].every(
      (a) =>
        Array.isArray(a) &&
        a.every((n) => Number.isInteger(n) && n >= 0 && n < 6),
    ) &&
    Array.isArray(g.moved) &&
    Array.isArray(g.dice) &&
    g.dice.every((n) => Number.isInteger(n) && n >= 1 && n <= 8) &&
    Array.isArray(g.log) &&
    g.log.every((s) => typeof s === "string") &&
    !!g.scores &&
    roles.every((r) => Number.isInteger(g.scores[r]) && g.scores[r] >= 0) &&
    (g.winner === null || roles.includes(g.winner))
  );
}
export function loadGame(): Game | null {
  try {
    const v = JSON.parse(localStorage.getItem("kings-road.game.v1") || "null");
    return validGame(v) ? v : null;
  } catch {
    return null;
  }
}
export function history(): Result[] {
  try {
    const v = JSON.parse(localStorage.getItem("kings-road.history.v1") || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function save(g: Game) {
  localStorage.setItem("kings-road.game.v1", JSON.stringify(g));
  if (g.winner) {
    const list = history();
    if (!list.some((r) => r.id === g.id)) {
      list.unshift({
        id: g.id,
        winner: g.winner,
        human: g.human,
        round: g.round,
        scores: g.scores,
        date: new Date().toISOString(),
      });
      localStorage.setItem(
        "kings-road.history.v1",
        JSON.stringify(list.slice(0, 100)),
      );
    }
  }
}
