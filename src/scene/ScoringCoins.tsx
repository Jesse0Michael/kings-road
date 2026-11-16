import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Game, runnerCanScore } from "../game/engine";
import { nodeSelectable, positions } from "./boardLayout";

// Two lightly engraved faces: a crown on the obverse, five roads on the reverse.
function coinFace(tails: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#bfcbd0";
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = "#788b94";
  c.lineWidth = 4;
  c.beginPath();
  c.arc(128, 128, 110, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    c.fillStyle = "#ecf0eb";
    c.beginPath();
    c.arc(128 + Math.cos(a) * 99, 128 + Math.sin(a) * 99, 2, 0, Math.PI * 2);
    c.fill();
  }
  c.save();
  c.shadowColor = "#f2f5ef";
  c.shadowOffsetY = 2;
  c.fillStyle = "#7c8f98";
  c.strokeStyle = "#7c8f98";
  c.lineWidth = 7;
  if (tails) {
    const points = Array.from({ length: 5 }, (_, i) => {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      return [128 + Math.cos(a) * 61, 128 + Math.sin(a) * 61];
    });
    points.forEach(([x, y], i) => {
      c.beginPath();
      c.moveTo(128, 128);
      c.lineTo(x, y);
      c.lineTo(...(points[(i + 1) % 5] as [number, number]));
      c.stroke();
      c.beginPath();
      c.arc(x, y, 9, 0, Math.PI * 2);
      c.fill();
    });
    c.fillRect(113, 113, 30, 30);
  } else {
    c.beginPath();
    c.moveTo(75, 155);
    c.lineTo(64, 92);
    c.lineTo(100, 116);
    c.lineTo(128, 70);
    c.lineTo(156, 116);
    c.lineTo(192, 92);
    c.lineTo(181, 155);
    c.closePath();
    c.fill();
    c.fillRect(76, 165, 104, 13);
  }
  c.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Coin({
  node,
  faces,
  reduced,
  onClick,
}: {
  node: number;
  faces: THREE.CanvasTexture[];
  reduced: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [x, z] = positions[node];
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = reduced ? 0 : clock.elapsedTime;
    ref.current.position.y =
      1.25 + (reduced ? 0 : Math.sin(t * 1.8 + node) * 0.055);
    ref.current.rotation.set(-0.18, reduced ? 0.15 : t * 0.95 + node * 0.42, 0);
  });
  return (
    <group
      ref={ref}
      name={`scoring-coin-${node}`}
      position={[x, 1.25, z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.235, 0.235, 0.055, 48]} />
        <meshStandardMaterial
          color="#c4d0d4"
          metalness={0.65}
          roughness={0.3}
        />
      </mesh>
      {[1, -1].map((side, i) => (
        <group
          key={side}
          position={[0, 0, side * 0.029]}
          rotation={[0, i * Math.PI, 0]}
        >
          <mesh>
            <circleGeometry args={[0.213, 48]} />
            <meshStandardMaterial
              map={faces[i]}
              bumpMap={faces[i]}
              bumpScale={0.012}
              metalness={0.5}
              roughness={0.38}
            />
          </mesh>
          <mesh>
            <torusGeometry args={[0.222, 0.01, 6, 48]} />
            <meshStandardMaterial
              color="#e0e7e5"
              metalness={0.65}
              roughness={0.24}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function ScoringCoins({
  game,
  onNode,
}: {
  game: Game;
  onNode: (n: number) => void;
}) {
  const faces = useMemo(() => [coinFace(false), coinFace(true)], []);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => () => faces.forEach((face) => face.dispose()), [faces]);
  if (game.winner || game.turn !== "Runner") return null;
  return positions.map(
    (_, node) =>
      runnerCanScore(game, node) && (
        <Coin
          key={node}
          node={node}
          faces={faces}
          reduced={reduced}
          onClick={() => {
            if (nodeSelectable(game, node, null)) onNode(node);
          }}
        />
      ),
  );
}
