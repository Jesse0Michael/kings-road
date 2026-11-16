import type { Action, Game, Role } from "./engine";

type RoundEvent = { round: number };
export type GameEvent = RoundEvent &
  (
    | { kind: "build" | "deploy"; count: number }
    | {
        kind: "march";
        from: number;
        to: number;
        moved: number;
        walls: number;
        sacrificed: number;
        arrived: number;
        held: number;
      }
    | {
        kind: "run";
        path: number[];
        coins: number;
        walls: number;
        soldiers: number;
      }
    | { kind: "hold"; count: number }
    | { kind: "win"; role: Role }
  );
// Strings keep existing version-1 saves readable; new games record typed events.
export type LogEntry = GameEvent | string;

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
const location = (n: number) => ["I", "II", "III", "IV", "V", "the castle"][n];
const walls = (g: Game) => g.walls.reduce((sum, n) => sum + n, 0);

/** Record only committed outcomes, using the acting turn even if it just ended. */
export function recordAction(before: Game, after: Game, action: Action) {
  const round = before.round;
  const previous = after.log[0];
  const recent =
    typeof previous === "object" && previous.round === round ? previous : null;
  const add = (event: GameEvent, replace = false) => {
    after.log = [event, ...after.log.slice(replace ? 1 : 0)].slice(0, 60);
  };
  if (action.type === "wall" || action.type === "deploy") {
    const kind = action.type === "wall" ? "build" : "deploy";
    const total = recent?.kind === kind ? recent.count : 0;
    add({ kind, round, count: total + 1 }, total > 0);
  } else if (action.type === "march") {
    const from = before.units.find((u) => u.id === action.unit)!.node;
    const group = before.units.filter(
      (u) => u.node === from && !before.moved.includes(u.id),
    );
    add({
      kind: "march",
      round,
      from,
      to: action.node,
      moved: group.filter((u) =>
        after.units.some((v) => v.id === u.id && v.node === action.node),
      ).length,
      walls: walls(before) - walls(after),
      sacrificed: after.scores.Builder - before.scores.Builder,
      arrived: after.scores.Army - before.scores.Army,
      held: group.filter((u) =>
        after.units.some((v) => v.id === u.id && v.node === from),
      ).length,
    });
  } else if (action.type === "run") {
    const run = recent?.kind === "run" ? recent : null;
    add(
      {
        kind: "run",
        round,
        path: [...(run?.path ?? [before.runner]), after.runner],
        coins: (run?.coins ?? 0) + after.scores.Runner - before.scores.Runner,
        walls: (run?.walls ?? 0) + walls(before) - walls(after),
        soldiers:
          (run?.soldiers ?? 0) + before.units.length - after.units.length,
      },
      !!run,
    );
  } else if (action.type === "end" && before.phase === "move") {
    const held = before.units.filter(
      (u) => !before.moved.includes(u.id),
    ).length;
    if (held) add({ kind: "hold", round, count: held });
  }
  // The winning action stays below the victory announcement, including a
  // Builder victory that interrupts an Army group's march partway through.
  if (after.winner && !before.winner)
    add({ kind: "win", round, role: after.winner });
}

export function eventText(event: GameEvent): string {
  switch (event.kind) {
    case "build":
      return `Builder raised ${count(event.count, "wall")}.`;
    case "deploy":
      return `Army deployed ${count(event.count, "soldier")}.`;
    case "hold":
      return `Army held ${count(event.count, "soldier")} in place.`;
    case "win":
      return `${event.role} wins the King’s Road!`;
    case "run": {
      const outcomes = [`collected ${count(event.coins, "coin")}`];
      if (event.walls) outcomes.push(`destroyed ${count(event.walls, "wall")}`);
      if (event.soldiers)
        outcomes.push(`defeated ${count(event.soldiers, "soldier")}`);
      return `Runner moved ${event.path.map((n) => (n === 5 ? "Castle" : location(n))).join(" → ")}; ${outcomes.join(", ")}.`;
    }
    case "march": {
      const outcomes: string[] = [];
      if (event.walls) outcomes.push(`destroyed ${count(event.walls, "wall")}`);
      if (event.sacrificed)
        outcomes.push(`sacrificed ${count(event.sacrificed, "soldier")}`);
      if (event.arrived)
        outcomes.push(`${count(event.arrived, "soldier")} reached the castle`);
      if (event.moved) outcomes.push(`moved ${count(event.moved, "soldier")}`);
      if (event.held)
        outcomes.push(
          `${count(event.held, "soldier")} stayed at ${location(event.from)}`,
        );
      return `Army advanced ${location(event.from)} → ${event.to === 5 ? "Castle" : location(event.to)}; ${outcomes.join(", ")}.`;
    }
  }
}

export function journalRows(log: LogEntry[]) {
  const rows: { text: string; round?: number }[] = [];
  for (let i = 0; i < log.length; i++) {
    const entry = log[i];
    if (typeof entry !== "string") {
      rows.push({ text: eventText(entry), round: entry.round });
    } else if (entry === "Builder raised a wall.") {
      let total = 1;
      while (log[i + 1] === entry) {
        total++;
        i++;
      }
      rows.push({ text: `Builder raised ${count(total, "wall")}.` });
    } else if (
      !/ rolled |A new journey begins|available space|Unused construction/.test(
        entry,
      )
    ) {
      rows.push({
        text: entry.replace(
          /\blocation ([1-5])\b/g,
          (_match, n: string) => `location ${location(Number(n) - 1)}`,
        ),
      });
    }
  }
  return rows;
}

export function validLogEntry(value: unknown): value is LogEntry {
  if (typeof value === "string") return true;
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  const nonnegative = (n: unknown) =>
    typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
  const node = (n: unknown) => nonnegative(n) && (n as number) < 6;
  if (!nonnegative(e.round) || e.round === 0) return false;
  switch (e.kind) {
    case "build":
    case "deploy":
    case "hold":
      return nonnegative(e.count) && e.count !== 0;
    case "march":
      return (
        node(e.from) &&
        node(e.to) &&
        [e.moved, e.walls, e.sacrificed, e.arrived, e.held].every(nonnegative)
      );
    case "run":
      return (
        Array.isArray(e.path) &&
        e.path.length >= 2 &&
        e.path.every(node) &&
        [e.coins, e.walls, e.soldiers].every(nonnegative)
      );
    case "win":
      return ["Builder", "Army", "Runner"].includes(e.role as string);
    default:
      return false;
  }
}
