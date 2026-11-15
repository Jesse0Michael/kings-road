import * as THREE from "three";
export type Sides = 4 | 6 | 8;
export type Face = {
  vertices: THREE.Vector3[];
  normal: THREE.Vector3;
  value: number;
};
export function dieFaces(sides: Sides): Face[] {
  if (sides === 6) {
    const specs: [number, number, number, number][] = [
      [1, 0, 0, 1],
      [-1, 0, 0, 6],
      [0, 1, 0, 2],
      [0, -1, 0, 5],
      [0, 0, 1, 3],
      [0, 0, -1, 4],
    ];
    return specs.map(([x, y, z, value]) => {
      const normal = new THREE.Vector3(x, y, z);
      const up =
        Math.abs(y) > 0.5
          ? new THREE.Vector3(0, 0, -1)
          : new THREE.Vector3(0, 1, 0);
      const right = up.clone().cross(normal);
      const center = normal.clone().multiplyScalar(0.29);
      return {
        normal,
        value,
        vertices: [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([a, b]) =>
          center
            .clone()
            .addScaledVector(right, a * 0.29)
            .addScaledVector(up, b * 0.29),
        ),
      };
    });
  }
  const raw =
    sides === 4
      ? new THREE.TetrahedronGeometry(0.43)
      : new THREE.OctahedronGeometry(0.43);
  const p = raw.getAttribute("position");
  const faces: Face[] = [];
  for (let i = 0; i < p.count; i += 3) {
    const vertices = [0, 1, 2].map((n) =>
      new THREE.Vector3().fromBufferAttribute(p, i + n),
    );
    const normal = vertices[1]
      .clone()
      .sub(vertices[0])
      .cross(vertices[2].clone().sub(vertices[0]))
      .normalize();
    faces.push({ vertices, normal, value: faces.length + 1 });
  }
  if (sides === 8) {
    const available = [1, 2, 3, 4];
    for (let i = 0; i < faces.length; i++) {
      if (faces[i].value < 0) continue;
      const value = available.shift()!;
      const opposite = faces.findIndex(
        (f) => f.normal.dot(faces[i].normal) < -0.99,
      );
      faces[i].value = -value;
      faces[opposite].value = -(9 - value);
    }
    faces.forEach((f) => (f.value = -f.value));
  }
  raw.dispose();
  return faces;
}
export function readDie(sides: Sides, q: THREE.Quaternion) {
  const faces = dieFaces(sides);
  return faces.reduce((best, f) => {
    const dot = f.normal.clone().applyQuaternion(q).y;
    const current = best.normal.clone().applyQuaternion(q).y;
    return (sides === 4 ? dot < current : dot > current) ? f : best;
  }).value;
}
export function dieVertices(sides: Sides) {
  return new Float32Array(
    dieFaces(sides).flatMap((f) => f.vertices.flatMap((v) => v.toArray())),
  );
}
export function tetraVertexValue(vertex: THREE.Vector3) {
  const face = dieFaces(4).find(
    (f) => !f.vertices.some((v) => v.distanceTo(vertex) < 0.001),
  );
  return face!.value;
}
