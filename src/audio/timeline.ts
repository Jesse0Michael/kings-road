import type { Game } from "../game/engine";
import { endTime, landingTime, reconcilePieces } from "../scene/motion";
import type { Piece, Transition } from "../scene/motion";

export const soundNames = [
  "wall-place",
  "wall-break",
  "army-place",
  "army-move",
  "army-fall",
  "castle",
  "runner-move",
  "score",
  "victory",
  "dice",
] as const;
export type SoundName = (typeof soundNames)[number];
export type SoundCue = {
  sound: SoundName;
  at: number;
  pan: number;
  rate?: number;
  offset?: number;
};

/** Uses the renderer's actual piece paths, including queued Runner moves. */
export class SoundTimeline {
  private pieces: Piece[] = [];
  private gameId: string | null = null;
  reset(game: Game | null) {
    this.gameId = game?.id ?? null;
    this.pieces = game ? reconcilePieces([], game) : [];
  }
  advance(t: Transition, reduced = false): SoundCue[] {
    if (this.gameId !== t.before.id) this.reset(t.before);
    const old = this.pieces
      .filter((p) => !p.gone || endTime(p) > t.at)
      .map((p) => (endTime(p) <= t.at ? { ...p, steps: [] } : p));
    this.pieces = reconcilePieces(old, t.after, t.before, t.at);
    const cues: SoundCue[] = [];
    const emit = (sound: SoundName, at: number, x = 0, offset = 0) =>
      cues.push({
        sound,
        at: reduced ? t.at : at,
        pan: Math.max(-0.45, Math.min(0.45, x / 8)),
        offset,
      });
    let arrival = t.at;
    let fall = t.at;
    let castle = t.at;
    for (const p of this.pieces) {
      if (p.kind === "coin") continue;
      const previous = old.find((v) => v.uid === p.uid);
      const fresh = p.steps.slice(previous?.steps.length ?? 0);
      for (const step of fresh) {
        if (step.kind === "place") {
          emit(
            p.kind === "wall" ? "wall-place" : "army-place",
            step.start + step.duration * 0.55,
            p.at[0],
          );
        } else if (step.kind === "move") {
          emit(
            p.kind === "runner" ? "runner-move" : "army-move",
            step.start,
            p.at[0],
            reduced ? 0.6 : 0,
          );
          const landing = landingTime(step);
          if (p.kind === "runner") arrival = landing;
          if (
            p.kind === "soldier" &&
            p.gone &&
            step.to[0] === 0 &&
            step.to[2] === 0
          ) {
            castle = Math.max(castle, landing);
            emit("castle", landing);
          }
        } else if (p.kind === "wall") {
          emit("wall-break", step.start, p.at[0]);
        } else if (p.kind === "soldier") {
          // Soldiers arriving at the castle score and disappear; they do not die.
          if (p.at[0] !== 0 || p.at[2] !== 0) {
            emit("army-fall", step.start, p.at[0]);
            fall = Math.max(fall, step.start);
          }
        }
      }
    }
    let scoreAt = t.at;
    for (const role of ["Builder", "Army", "Runner"] as const) {
      if (t.after.scores[role] <= t.before.scores[role]) continue;
      const when =
        (role === "Runner" ? arrival : role === "Army" ? castle : fall) + 85;
      emit("score", when);
      scoreAt = Math.max(scoreAt, when);
    }
    if (t.after.winner && !t.before.winner) emit("victory", scoreAt + 240);
    // A whole Army group or wall stack gets one cue, not a loud pile of identical sounds.
    const unique = new Map<string, SoundCue>();
    for (const cue of cues) {
      const key = `${cue.sound}:${Math.round(cue.at / 30)}`;
      if (!unique.has(key)) unique.set(key, cue);
    }
    return [...unique.values()].sort((a, b) => a.at - b.at);
  }
}
