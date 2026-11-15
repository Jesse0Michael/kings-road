import { expect, it } from "vitest";
import * as THREE from "three";
import { dieFaces, readDie, tetraVertexValue } from "./diceMath";
import type { Sides } from "./diceMath";
import paths from "./dice-trajectories.json";
it("every physics recording finishes on its requested fixed face", () => {
  for (const sides of [4, 6, 8] as Sides[]) {
    const outcomes = paths.rolls[sides];
    for (const [value, frames] of Object.entries(outcomes)) {
      const end = frames.at(-1)!;
      const q = new THREE.Quaternion(end[3], end[4], end[5], end[6]);
      const normal = dieFaces(sides).find(
        (f) => f.value === Number(value),
      )!.normal;
      expect(
        normal.applyQuaternion(q).y * (sides === 4 ? -1 : 1),
      ).toBeGreaterThan(0.999);
      for (const yaw of [0, 0.71, 2.4, 5.8]) {
        const rotated = new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
          .multiply(q);
        expect(readDie(sides, rotated)).toBe(Number(value));
      }
      expect(frames.length).toBeGreaterThan(30);
      expect(frames.every((f) => f.every(Number.isFinite))).toBe(true);
    }
  }
});
it("the d4 apex labels match the result opposite its resting face", () => {
  for (const [value, frames] of Object.entries(paths.rolls[4])) {
    const f = frames.at(-1)!,
      q = new THREE.Quaternion(f[3], f[4], f[5], f[6]);
    const vertices = dieFaces(4).flatMap((f) => f.vertices);
    const apex = vertices.reduce((best, v) =>
      v.clone().applyQuaternion(q).y > best.clone().applyQuaternion(q).y
        ? v
        : best,
    );
    expect(tetraVertexValue(apex)).toBe(Number(value));
  }
});
it("d6 and d8 opposite face numbering is conventional", () => {
  for (const sides of [6, 8] as Sides[]) {
    const faces = dieFaces(sides);
    expect(new Set(faces.map((f) => f.value)).size).toBe(sides);
    for (const face of faces)
      expect(
        face.value +
          faces.find((f) => f.normal.dot(face.normal) < -0.99)!.value,
      ).toBe(sides + 1);
  }
});
