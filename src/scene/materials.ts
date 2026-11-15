import * as THREE from "three";
import { BOARD_RADIUS, positions } from "./boardLayout";
import { roads } from "../game/engine";
export const texturePaths = {
  table: `${import.meta.env.BASE_URL}assets/textures/tavern-table.webp`,
  board: `${import.meta.env.BASE_URL}assets/textures/board-wood.webp`,
};

/** One continuous wood surface. Color and height maps share the exact engraving strokes. */
export function engravedBoard(image: CanvasImageSource) {
  const size = 2048,
    scale = size / (BOARD_RADIUS * 2);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, size, size);
  const height = document.createElement("canvas");
  height.width = height.height = size;
  const hc = height.getContext("2d")!;
  hc.fillStyle = "#aaa";
  hc.fillRect(0, 0, size, size);
  const px = (x: number) => (x + BOARD_RADIUS) * scale;
  function groove(
    draw: (c: CanvasRenderingContext2D) => void,
    width: number,
    fill = false,
  ) {
    for (const [c, color, offset] of [
      [ctx, "#d6ac71", 1.5],
      [ctx, "#352419", 0],
      [hc, "#444", 0],
    ] as const) {
      c.save();
      c.translate(offset, offset);
      c.strokeStyle = color;
      c.fillStyle = color;
      c.lineWidth = width * scale;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      draw(c);
      if (fill) c.fill();
      else c.stroke();
      c.restore();
    }
  }
  // Double etched roads, terminated at the engraved node borders.
  for (const [a, b] of roads) {
    const [ax, az] = positions[a],
      [bx, bz] = positions[b];
    const len = Math.hypot(bx - ax, bz - az),
      dx = (bx - ax) / len,
      dz = (bz - az) / len;
    for (const offset of [-0.045, 0.045])
      groove((c) => {
        c.moveTo(
          px(ax + dx * 0.63 - dz * offset),
          px(az + dz * 0.63 + dx * offset),
        );
        c.lineTo(
          px(bx - dx * 0.63 - dz * offset),
          px(bz - dz * 0.63 + dx * offset),
        );
      }, 0.022);
  }
  for (let i = 0; i < 6; i++) {
    const [x, z] = positions[i];
    for (const radius of [0.58, 0.64])
      groove((c) => c.arc(px(x), px(z), radius * scale, 0, Math.PI * 2), 0.018);
    if (i < 5) {
      const label = ["I", "II", "III", "IV", "V"][i];
      for (const [c, col, offset] of [
        [ctx, "#d6ac71", 1.3],
        [ctx, "#38261a", 0],
        [hc, "#444", 0],
      ] as const) {
        c.save();
        c.font = `600 ${0.42 * scale}px Georgia`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = col;
        c.fillText(label, px(x) + offset, px(z + 0.28) + offset);
        c.restore();
      }
    }
  }
  // A shallow carved heraldic castle at the same height as the node numerals.
  groove(
    (c) => {
      const shape = [
        [-0.34, 0.26],
        [-0.34, -0.2],
        [-0.24, -0.2],
        [-0.24, -0.12],
        [-0.15, -0.12],
        [-0.15, -0.2],
        [-0.07, -0.2],
        [-0.07, -0.34],
        [0, -0.41],
        [0.07, -0.34],
        [0.07, -0.2],
        [0.15, -0.2],
        [0.15, -0.12],
        [0.24, -0.12],
        [0.24, -0.2],
        [0.34, -0.2],
        [0.34, 0.26],
        [0.08, 0.26],
        [0.08, 0.06],
        [-0.08, 0.06],
        [-0.08, 0.26],
      ];
      shape.forEach(([x, z], i) =>
        i ? c.lineTo(px(x), px(z)) : c.moveTo(px(x), px(z)),
      );
      c.closePath();
    },
    0.01,
    true,
  );
  for (const r of [3.86, 3.91])
    groove((c) => {
      positions
        .slice(0, 5)
        .forEach(([x, z], i) =>
          i
            ? c.lineTo(px((x * r) / 3.05), px((z * r) / 3.05))
            : c.moveTo(px((x * r) / 3.05), px((z * r) / 3.05)),
        );
      c.closePath();
    }, 0.013);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(height);
  bump.anisotropy = 8;
  return {
    map,
    bump,
    dispose() {
      map.dispose();
      bump.dispose();
    },
  };
}
export function tabletopTexture(original: THREE.Texture) {
  const map = original.clone();
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(5, 5);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.needsUpdate = true;
  return map;
}
