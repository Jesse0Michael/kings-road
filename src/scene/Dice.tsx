import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Role } from "../game/engine";
import { dieFaces, tetraVertexValue } from "./diceMath";
import type { Sides } from "./diceMath";
import paths from "./dice-trajectories.json";
export type DiceRoll = {
  id: number;
  role: Role;
  values: number[];
  started: number;
  duration: number;
  seed: number;
};
export const roleColors = {
  Builder: "#d2a845",
  Army: "#a63d49",
  Runner: "#2e9a8b",
};
export const sidesFor = (role: Role): Sides =>
  role === "Builder" ? 4 : role === "Army" ? 6 : 8;
export const ROLL_MS = 1900;
const records = paths.rolls as Record<string, Record<string, number[][]>>;

export function makeDieGeometry(sides: Sides) {
  const faces = dieFaces(sides);
  const points: number[] = [],
    uvs: number[] = [],
    groups: { start: number; count: number; materialIndex: number }[] = [];
  faces.forEach((face, index) => {
    const center = face.vertices
      .reduce((a, v) => a.add(v), new THREE.Vector3())
      .divideScalar(face.vertices.length);
    // Slightly inset faces over a dark solid core makes fine bevel seams at every edge.
    const vertices = face.vertices.map((v) =>
      v.clone().lerp(center, sides === 6 ? 0.1 : 0.045),
    );
    const uv =
      vertices.length === 4
        ? [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ]
        : [
            [0.06, 0.06],
            [0.94, 0.06],
            [0.5, 0.88],
          ];
    const order = vertices.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2];
    const start = points.length / 3;
    order.forEach((i) => {
      points.push(...vertices[i].toArray());
      uvs.push(...uv[i]);
    });
    groups.push({ start, count: order.length, materialIndex: index });
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  groups.forEach((g) => geometry.addGroup(g.start, g.count, g.materialIndex));
  return geometry;
}
function faceTexture(sides: Sides, index: number, color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = color;
  x.fillRect(0, 0, 256, 256);
  // Restrained ivory engraving: the same face labels are kept for every outcome.
  x.fillStyle = "#f3e4be";
  x.textAlign = "center";
  x.textBaseline = "middle";
  const face = dieFaces(sides)[index];
  if (sides === 4) {
    const corners = [
      [52, 207, Math.PI / 3],
      [204, 207, -Math.PI / 3],
      [128, 70, Math.PI],
    ];
    face.vertices.forEach((v, i) => {
      const [a, b, r] = corners[i];
      x.save();
      x.translate(a, b);
      x.rotate(r);
      x.font = "600 48px Georgia";
      x.fillText(String(tetraVertexValue(v)), 0, 0);
      x.restore();
    });
  } else {
    x.font = `600 ${sides === 6 ? 132 : 100}px Georgia`;
    x.fillText(String(face.value), 128, sides === 6 ? 137 : 155);
    if ([6, 9].includes(face.value)) {
      x.fillRect(105, sides === 6 ? 206 : 207, 46, 5);
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}
function Die({
  roll,
  value,
  index,
}: {
  roll: DiceRoll;
  value: number;
  index: number;
}) {
  const group = useRef<THREE.Group>(null);
  const sides = sidesFor(roll.role);
  const geometry = useMemo(() => makeDieGeometry(sides), [sides]);
  const core = useMemo(
    () =>
      sides === 4
        ? new THREE.TetrahedronGeometry(0.426)
        : sides === 8
          ? new THREE.OctahedronGeometry(0.426)
          : // Keep the core just below the numbered face planes to avoid depth fighting.
            new RoundedBoxGeometry(0.576, 0.576, 0.576, 2, 0.027),
    [sides],
  );
  const materials = useMemo(
    () =>
      dieFaces(sides).map(
        (_, i) =>
          new THREE.MeshStandardMaterial({
            map: faceTexture(sides, i, roleColors[roll.role]),
            roughness: 0.36,
            metalness: 0.12,
          }),
      ),
    [sides, roll.role],
  );
  const frames = records[sides][value];
  const qa = useMemo(() => new THREE.Quaternion(), []),
    qb = useMemo(() => new THREE.Quaternion(), []);
  const yaw = useMemo(() => {
    const mixed =
      Math.imul(roll.seed ^ Math.imul(index + 1, 0x9e3779b9), 0x85ebca6b) >>> 0;
    return (mixed / 4294967296) * Math.PI * 2;
  }, [roll.seed, index]);
  const turn = useMemo(
    () =>
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
    [yaw],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      core.dispose();
      materials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
    [geometry, core, materials],
  );
  useFrame(() => {
    if (!group.current) return;
    const t =
      roll.duration === 0
        ? 1
        : Math.max(
            0,
            Math.min(1, (performance.now() - roll.started) / roll.duration),
          );
    const frame = t * (frames.length - 1),
      i = Math.floor(frame),
      a = frames[i],
      b = frames[Math.min(i + 1, frames.length - 1)],
      mix = frame - i;
    // Rotate the whole recorded world around vertical, preserving both physics and the result.
    const shift =
      (index - (roll.values.length - 1) / 2) * (sides === 6 ? 1.85 : 1.5);
    const x = THREE.MathUtils.lerp(a[0], b[0], mix),
      z = THREE.MathUtils.lerp(a[2], b[2], mix);
    group.current.position.set(
      shift + x * Math.cos(yaw) + z * Math.sin(yaw),
      -0.205 + THREE.MathUtils.lerp(a[1], b[1], mix),
      3.65 - x * Math.sin(yaw) + z * Math.cos(yaw),
    );
    qa.set(a[3], a[4], a[5], a[6]);
    qb.set(b[3], b[4], b[5], b[6]);
    group.current.quaternion.copy(turn).multiply(qa.slerp(qb, mix));
  });
  return (
    <group ref={group}>
      <mesh castShadow geometry={core}>
        <meshStandardMaterial color={roleColors[roll.role]} roughness={0.38} />
      </mesh>
      <mesh castShadow geometry={geometry} material={materials} />
    </group>
  );
}
export function Dice({ roll }: { roll: DiceRoll | null }) {
  if (!roll) return null;
  return (
    <>
      {roll.values.map((v, i) => (
        <Die key={`${roll.role}-${i}`} value={v} index={i} roll={roll} />
      ))}
    </>
  );
}
