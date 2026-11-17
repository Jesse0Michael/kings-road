import { rollDice, type Action, type Game } from "../game/engine";

export type Parameters = Record<string, string | number>;
export type Send = (event: string, parameters: Parameters) => void;
export const RULES_VERSION = "2026-11-runner-start-excluded";
export const AI_VERSION = "1";
const key = "kings-road.analytics.v1";
type Clock = {
  id: string;
  activeMs: number;
  turnMs: number;
  turn: string;
  complete: boolean;
  partial: boolean;
};
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
const turnKey = (g: Game) => `${g.round}:${g.turn}`;

/** Observes committed actions only. Analytics never changes game rules or saves. */
export class GameAnalytics {
  private clock: Clock | null = null;
  private last: number;
  private playing = false;
  private visible = true;
  private opened = new Set<string>();
  constructor(
    private send: Send,
    private storage?: Storage,
    private now = () => performance.now(),
  ) {
    this.last = now();
  }
  private emit(name: string, parameters: Parameters) {
    try {
      this.send(name, parameters);
    } catch {
      // A blocked or unavailable analytics provider must not affect play.
    }
  }
  private base(g: Game): Parameters {
    return {
      game_id: g.id,
      human_role: g.human,
      rules_version: RULES_VERSION,
      ai_version: AI_VERSION,
      round: g.round,
    };
  }
  private attach(g: Game, fresh = false) {
    if (this.clock?.id === g.id) return;
    let saved: Clock | null = null;
    try {
      const value = JSON.parse(this.storage?.getItem(key) ?? "null");
      if (
        !fresh &&
        value?.id === g.id &&
        [value.activeMs, value.turnMs].every(
          (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
        ) &&
        typeof value.turn === "string" &&
        typeof value.complete === "boolean" &&
        typeof value.partial === "boolean"
      )
        saved = value;
    } catch {
      /* Storage may be disabled. */
    }
    this.clock = saved ?? {
      id: g.id,
      activeMs: 0,
      turnMs: 0,
      turn: turnKey(g),
      complete: !!g.winner,
      partial: !fresh,
    };
    if (this.clock.turn !== turnKey(g)) {
      this.clock.turn = turnKey(g);
      this.clock.turnMs = 0;
      this.clock.partial = true;
    }
    this.last = this.now();
  }
  checkpoint() {
    const time = this.now();
    if (this.clock && this.playing && this.visible && !this.clock.complete) {
      const elapsed = Math.max(0, time - this.last);
      this.clock.activeMs += elapsed;
      this.clock.turnMs += elapsed;
    }
    this.last = time;
    try {
      if (this.clock) this.storage?.setItem(key, JSON.stringify(this.clock));
    } catch {
      /* Gameplay remains available without analytics storage. */
    }
  }
  visibility(visible: boolean) {
    this.checkpoint();
    this.visible = visible;
  }
  screen(name: string, g: Game | null) {
    this.checkpoint();
    this.playing = name === "game" && !!g && !g.winner;
    this.emit("screen_opened", { screen_name: name });
    if (g && this.playing) {
      this.attach(g);
      if (!this.opened.has(g.id)) {
        this.opened.add(g.id);
        this.emit("game_resumed", { ...this.base(g), ...this.result(g) });
      }
    }
    this.checkpoint();
  }
  role(role: string) {
    this.emit("role_selected", { human_role: role });
  }
  start(g: Game, previous: Game | null) {
    this.checkpoint();
    if (previous && !previous.winner) {
      this.attach(previous);
      this.emit("game_replaced", {
        ...this.base(previous),
        ...this.result(previous),
      });
    }
    this.attach(g, true);
    this.opened.add(g.id);
    this.emit("game_started", this.base(g));
    this.checkpoint();
  }
  private result(g: Game): Parameters {
    return {
      builder_score: g.scores.Builder,
      army_score: g.scores.Army,
      runner_score: g.scores.Runner,
      active_seconds: Math.round((this.clock?.activeMs ?? 0) / 1000),
      timing_partial: this.clock?.partial ? 1 : 0,
    };
  }
  action(before: Game, after: Game, action: Action) {
    if (before === after || before.winner) return;
    this.attach(before);
    if (this.clock!.complete) return;
    this.checkpoint();
    if (
      before.turn !== after.turn ||
      before.round !== after.round ||
      after.winner
    ) {
      const totals: Parameters = {
        walls_built: 0,
        soldiers_deployed: 0,
        walls_destroyed: 0,
        soldiers_sacrificed: 0,
        castle_arrivals: 0,
        coins_collected: 0,
        soldiers_defeated: 0,
        moves: 0,
        soldiers_held: 0,
      };
      for (const e of after.log) {
        if (typeof e === "string" || e.round !== before.round) continue;
        if (before.turn === "Builder" && e.kind === "build")
          totals.walls_built = e.count;
        if (before.turn === "Army") {
          if (e.kind === "deploy") totals.soldiers_deployed = e.count;
          if (e.kind === "hold") totals.soldiers_held = e.count;
          if (e.kind === "march") {
            totals.walls_destroyed = Number(totals.walls_destroyed) + e.walls;
            totals.soldiers_sacrificed =
              Number(totals.soldiers_sacrificed) + e.sacrificed;
            totals.castle_arrivals = Number(totals.castle_arrivals) + e.arrived;
            totals.moves = Number(totals.moves) + e.moved;
          }
        }
        if (before.turn === "Runner" && e.kind === "run") {
          totals.coins_collected = e.coins;
          totals.walls_destroyed = e.walls;
          totals.soldiers_defeated = e.soldiers;
          totals.moves = e.path.length - 1;
        }
      }
      const dice = action.type === "roll" ? rollDice(before).dice : before.dice;
      this.emit("turn_completed", {
        ...this.base(before),
        actor_role: before.turn,
        controller: before.human === before.turn ? "human" : "computer",
        roll_total: dice.reduce((a, b) => a + b, 0),
        active_seconds: Math.round(this.clock!.turnMs / 1000),
        timing_partial: this.clock!.partial ? 1 : 0,
        builder_score: after.scores.Builder,
        army_score: after.scores.Army,
        runner_score: after.scores.Runner,
        ...totals,
      });
      this.clock!.turnMs = 0;
      this.clock!.turn = turnKey(after);
    }
    if (after.winner && !this.clock!.complete) {
      this.emit("game_completed", {
        ...this.base(after),
        ...this.result(after),
        winner_role: after.winner,
        human_won: after.winner === after.human ? 1 : 0,
        total_rounds: after.round,
      });
      this.clock!.complete = true;
      this.playing = false;
    }
    this.checkpoint();
  }
}
