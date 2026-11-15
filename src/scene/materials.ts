import * as THREE from "three";

/** Seeded grain, pores and plank joints; generated locally, with no image service. */
export function woodSurface(table = false) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  let seed = table ? 83 : 29;
  const rand = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  ctx.fillStyle = table ? "#675040" : "#a0784e";
  ctx.fillRect(0, 0, 1024, 1024);
  for (let plank = 0; plank < 4; plank++) {
    const y = plank * 256;
    const gradient = ctx.createLinearGradient(0, y, 0, y + 256);
    gradient.addColorStop(0, table ? "#382a22" : "#75563b");
    gradient.addColorStop(0.5, table ? "#514035" : "#9b7851");
    gradient.addColorStop(1, table ? "#443024" : "#856142");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, 1024, 256);
    for (let j = 0; j < 360; j++) {
      const v = y + rand() * 256;
      const wave = rand() * 28;
      ctx.strokeStyle = `rgba(${rand() > 0.55 ? "233,205,156" : "37,22,14"},${0.025 + rand() * 0.07})`;
      ctx.lineWidth = 0.3 + rand() * 1.7;
      ctx.beginPath();
      ctx.moveTo(0, v);
      ctx.bezierCurveTo(250, v + wave, 700, v - wave, 1024, v);
      ctx.stroke();
    }
    if (plank % 2 === 0) {
      const knotX = 180 + rand() * 650,
        knotY = y + 75 + rand() * 90;
      for (let ring = 1; ring < 12; ring++) {
        ctx.strokeStyle = `rgba(30,19,12,${0.12 - ring * 0.007})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.ellipse(knotX, knotY, ring * 5, ring * 1.4, 0.02, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (table) {
      ctx.fillStyle = "#261c16";
      ctx.fillRect(0, y, 1024, 3);
      ctx.fillStyle = "#aa8260";
      ctx.fillRect(0, y + 3, 1024, 1);
    }
  }
  for (let i = 0; i < 27000; i++) {
    const value = rand() > 0.5 ? "245,220,175" : "20,12,8";
    ctx.fillStyle = `rgba(${value},${rand() * 0.1})`;
    ctx.fillRect(
      rand() * 1024,
      rand() * 1024,
      rand() * 2 + 0.2,
      rand() * 0.7 + 0.2,
    );
  }
  // Fine scratches in the varnish, rather than uniform polished plastic.
  for (let i = 0; i < 80; i++) {
    ctx.strokeStyle = "rgba(230,207,170,.09)";
    const x = rand() * 1024,
      y = rand() * 1024;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 10 + rand() * 80, y + rand() * 3);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  if (table) map.repeat.set(25, 25);
  map.anisotropy = 8;
  const bump = map.clone();
  bump.colorSpace = THREE.NoColorSpace;
  bump.needsUpdate = true;
  return {
    map,
    bump,
    dispose() {
      map.dispose();
      bump.dispose();
    },
  };
}
export function castleEngraving() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const c = canvas.getContext("2d")!;
  c.strokeStyle = "#3c291c";
  c.lineWidth = 10;
  c.lineJoin = "miter";
  c.beginPath();
  c.arc(256, 256, 227, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 3;
  c.beginPath();
  c.arc(256, 256, 208, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = "#4d3624";
  // A heraldic fortress engraved into the board, with no freestanding towers.
  c.beginPath();
  c.moveTo(125, 350);
  c.lineTo(125, 172);
  c.lineTo(155, 172);
  c.lineTo(155, 202);
  c.lineTo(181, 202);
  c.lineTo(181, 172);
  c.lineTo(211, 172);
  c.lineTo(211, 242);
  c.lineTo(231, 242);
  c.lineTo(231, 128);
  c.lineTo(260, 100);
  c.lineTo(289, 128);
  c.lineTo(289, 242);
  c.lineTo(310, 242);
  c.lineTo(310, 172);
  c.lineTo(340, 172);
  c.lineTo(340, 202);
  c.lineTo(366, 202);
  c.lineTo(366, 172);
  c.lineTo(396, 172);
  c.lineTo(396, 350);
  c.closePath();
  c.fill();
  c.globalCompositeOperation = "destination-out";
  c.beginPath();
  c.roundRect(235, 285, 48, 82, [24, 24, 0, 0]);
  c.fill();
  for (const x of [150, 335]) c.fillRect(x, 245, 15, 29);
  c.globalCompositeOperation = "source-over";
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
