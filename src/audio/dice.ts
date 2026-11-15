import * as THREE from "three";
import type { DiceRoll } from "../scene/Dice";
import { dieFaces } from "../scene/diceMath";
import type { Sides } from "../scene/diceMath";
import paths from "../scene/dice-trajectories.json";
import type { SoundCue } from "./timeline";

const contacts = new Map<string, number[]>();
export function diceContacts(sides: Sides, value: number): number[] {
  const key = `${sides}:${value}`;
  if (contacts.has(key)) return contacts.get(key)!;
  const frames = (paths.rolls[sides] as Record<string, number[][]>)[value];
  const vertices = dieFaces(sides).flatMap((f) => f.vertices);
  const q = new THREE.Quaternion();
  let previous = Infinity;
  const hits: number[] = [];
  frames.forEach((f, i) => {
    q.set(f[3], f[4], f[5], f[6]);
    const bottom =
      f[1] + Math.min(...vertices.map((v) => v.clone().applyQuaternion(q).y));
    // The lowest vertex touches the table; whole-world yaw variation preserves its height.
    if (previous > 0.018 && bottom <= 0.018) hits.push(i / (frames.length - 1));
    previous = bottom;
  });
  contacts.set(key, hits);
  return hits;
}

export function diceCues(roll: DiceRoll): SoundCue[] {
  if (!roll.duration) return [{ sound: "dice", at: roll.started, pan: 0 }];
  const sides = roll.role === "Builder" ? 4 : roll.role === "Army" ? 6 : 8;
  const unique = new Map<number, SoundCue>();
  roll.values.forEach((value, i) => {
    for (const contact of diceContacts(sides, value)) {
      const at = roll.started + contact * roll.duration;
      const key = Math.round(at / 35);
      if (!unique.has(key))
        unique.set(key, {
          sound: "dice",
          at,
          pan: (i - (roll.values.length - 1) / 2) * 0.16,
          rate: 0.97 + i * 0.035,
        });
    }
  });
  return [...unique.values()].sort((a, b) => a.at - b.at);
}
