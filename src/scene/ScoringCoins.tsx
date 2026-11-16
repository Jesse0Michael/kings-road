import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Game } from "../game/engine";
import { nodeSelectable } from "./boardLayout";
import { samplePiece, type Piece } from "./motion";

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
  piece,
  faces,
  reduced,
  onClick,
  onDone,
}: {
  piece: Piece;
  faces: THREE.CanvasTexture[];
  reduced: boolean;
  onClick: () => void;
  onDone: (p: Piece) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const done = useRef(false);
  const node = piece.node;
  useLayoutEffect(() => {
    done.current = false;
  }, [piece.steps]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = reduced ? 0 : clock.elapsedTime;
    const pose = samplePiece(piece, reduced ? Infinity : performance.now());
    ref.current.position.fromArray(pose.position);
    ref.current.position.y += reduced ? 0 : Math.sin(t * 1.8 + node) * 0.055;
    ref.current.rotation.set(-0.18, reduced ? 0.15 : t * 0.95 + node * 0.42, 0);
    ref.current.scale.setScalar(pose.scale);
    ref.current.visible = pose.opacity > 0;
    ref.current.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.depthWrite = pose.opacity === 1;
        material.opacity = pose.opacity;
      });
    });
    if (piece.gone && pose.done && !done.current) {
      done.current = true;
      onDone(piece);
    }
  });
  return (
    <group
      ref={ref}
      name={`scoring-coin-${node}`}
      position={piece.at}
      visible={
        samplePiece(piece, reduced ? Infinity : performance.now()).opacity > 0
      }
      onClick={(e) => {
        if (piece.gone || !ref.current?.visible) return;
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
  coins,
  reduced,
  onNode,
  onDone,
}: {
  game: Game;
  coins: Piece[];
  reduced: boolean;
  onNode: (n: number) => void;
  onDone: (p: Piece) => void;
}) {
  const faces = useMemo(() => [coinFace(false), coinFace(true)], []);
  useEffect(() => () => faces.forEach((face) => face.dispose()), [faces]);
  return coins.map((piece) => (
    <Coin
      key={piece.uid}
      piece={piece}
      faces={faces}
      reduced={reduced}
      onDone={onDone}
      onClick={() => {
        if (nodeSelectable(game, piece.node, null)) onNode(piece.node);
      }}
    />
  ));
}
