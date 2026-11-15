import { Action, Game, neighbors, roadBetween, roads, runCost } from "./engine";

export function aiAction(g: Game): Action {
  if (g.phase === "roll") return { type: "roll" };
  if (g.phase === "build") {
    let best = 5;
    let max = -Infinity;
    roads.forEach(([a, b], i) => {
      const pressure = g.units.filter(
        (u) => u.node === a || u.node === b,
      ).length;
      const score = (b === 5 ? 5 + pressure * 3 : pressure) - g.walls[i] * 4;
      if (score > max) {
        max = score;
        best = i;
      }
    });
    return { type: "wall", road: best };
  }
  if (g.phase === "move") {
    const u = g.units.find((u) => !g.moved.includes(u.id));
    if (!u) return { type: "end" };
    const direct = roadBetween(u.node, 5);
    if (!g.walls[direct] || g.walls[direct] === 1)
      return { type: "march", unit: u.id, node: 5 };
    const alternative = neighbors(u.node)
      .filter((n) => n !== 5)
      .sort(
        (a, b) =>
          g.walls[roadBetween(u.node, a)] +
          g.walls[roadBetween(a, 5)] -
          g.walls[roadBetween(u.node, b)] -
          g.walls[roadBetween(b, 5)],
      )[0];
    return { type: "march", unit: u.id, node: alternative };
  }
  if (g.phase === "deploy") {
    const choices = [0, 1, 2, 3, 4]
      .filter((n) => n !== g.runner)
      .sort(
        (a, b) =>
          g.walls[a + 5] - g.walls[b + 5] ||
          g.units.filter((u) => u.node === a).length -
            g.units.filter((u) => u.node === b).length,
      );
    return { type: "deploy", node: choices[0] };
  }
  const choices = neighbors(g.runner)
    .filter((n) => runCost(g, n) <= g.budget)
    .sort(
      (a, b) =>
        Number(g.scored.includes(a)) - Number(g.scored.includes(b)) ||
        runCost(g, a) - runCost(g, b),
    );
  return choices.length ? { type: "run", node: choices[0] } : { type: "end" };
}
