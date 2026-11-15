// Development-only: record real Rapier tumbles. No physics runtime is shipped to players.
import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { dieVertices, readDie } from "../src/scene/diceMath.ts";
import { writeFileSync } from "node:fs";
await RAPIER.init();
let seed = 18638;
const rand = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const output = { fps: 60, rolls: {} };
for (const sides of [4, 6, 8]) {
  const results = {};
  let attempts = 0;
  while (Object.keys(results).length < sides && attempts++ < 2000) {
    const world = new RAPIER.World({ x: 0, y: -20, z: 0 });
    world.timestep = 1 / 120;
    const floor = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(10, 0.1, 10)
        .setFriction(0.75)
        .setRestitution(0.3),
      floor,
    );
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28),
    );
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(
          (rand() - 0.5) * 0.12,
          1.1 + rand() * 0.3,
          (rand() - 0.5) * 0.12,
        )
        .setRotation(q)
        .setLinearDamping(0.6)
        .setAngularDamping(0.5),
    );
    world.createCollider(
      RAPIER.ColliderDesc.convexHull(dieVertices(sides))
        .setRestitution(0.3)
        .setFriction(0.8)
        .setDensity(1),
      body,
    );
    body.setLinvel(
      { x: (rand() - 0.5) * 0.55, y: rand(), z: (rand() - 0.5) * 0.4 },
      true,
    );
    body.setAngvel(
      { x: rand() * 12 - 6, y: rand() * 8 - 4, z: rand() * 14 - 7 },
      true,
    );
    const frames = [];
    let quiet = 0;
    for (let i = 0; i < 420; i++) {
      world.step();
      const p = body.translation(),
        r = body.rotation();
      if (i % 2 === 0)
        frames.push(
          [p.x, p.y, p.z, r.x, r.y, r.z, r.w].map((v) => +v.toFixed(5)),
        );
      const v = body.linvel(),
        a = body.angvel();
      quiet =
        Math.hypot(v.x, v.y, v.z) < 0.025 && Math.hypot(a.x, a.y, a.z) < 0.025
          ? quiet + 1
          : 0;
      if (quiet > 36) break;
    }
    const last = frames.at(-1);
    const winner = readDie(sides, new THREE.Quaternion(...last.slice(3))); // Keep only settled, contained trajectories.
    if (
      quiet > 36 &&
      !results[winner] &&
      frames.every((f) => Math.abs(f[0]) < 0.38 && Math.abs(f[2]) < 0.38)
    )
      results[winner] = frames;
    world.free();
  }
  if (Object.keys(results).length !== sides)
    throw Error(`Missing d${sides} results after ${attempts} attempts`);
  output.rolls[sides] = results;
  console.log(
    `d${sides}: ${attempts} attempts, ${Object.keys(results).length} verified outcomes`,
  );
}
writeFileSync("src/scene/dice-trajectories.json", JSON.stringify(output));
