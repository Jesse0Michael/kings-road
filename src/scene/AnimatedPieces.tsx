import { useLayoutEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Game } from "../game/engine";
import { Runner, Soldier, StoneWall } from "./Pieces";
import { MOTION_MS, Piece, reconcilePieces, sampleMotion } from "./motion";

function BrokenWall({ progress }: { progress: React.RefObject<number> }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const t = progress.current;
    ref.current.children.forEach((child, i) => {
      const side = i === 0 ? -1 : 1;
      child.position.set(
        side * (0.16 + t * 0.18),
        -0.12 * Math.min(1, t * 3),
        0,
      );
      child.rotation.set(
        t * 0.5,
        side * t * 0.3,
        side * Math.min(1, t * 2) * 1.3,
      );
    });
  });
  return (
    <group ref={ref}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.16, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.24, 0.2]} />
            <meshStandardMaterial
              color={side === 1 ? "#b7a77b" : "#aa9b70"}
              roughness={0.96}
            />
          </mesh>
          <mesh position={[0, 0.16, 0]} castShadow>
            <boxGeometry args={[0.13, 0.1, 0.21]} />
            <meshStandardMaterial color="#c4b385" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0, 0.104]}>
            <boxGeometry args={[0.3, 0.012, 0.005]} />
            <meshStandardMaterial color="#756c56" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function Dust({ progress }: { progress: React.RefObject<number> }) {
  const ref = useRef<THREE.Points>(null);
  const buffer = useRef(new Float32Array(36));
  useFrame(() => {
    if (!ref.current) return;
    const t = progress.current;
    for (let i = 0; i < 12; i++) {
      const a = i * 2.399;
      const r = (0.08 + t * 0.5) * (1 + (i % 3) * 0.2);
      buffer.current[i * 3] = Math.cos(a) * r;
      buffer.current[i * 3 + 1] = Math.max(
        -0.1,
        0.02 + Math.sin(t * Math.PI) * (0.12 + (i % 4) * 0.035) - t * 0.1,
      );
      buffer.current[i * 3 + 2] = Math.sin(a) * r * 0.6;
    }
    (
      ref.current.geometry.getAttribute("position") as THREE.BufferAttribute
    ).needsUpdate = true;
    (ref.current.material as THREE.PointsMaterial).opacity = (1 - t) * 0.32;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[buffer.current, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#bca88a"
        size={0.055}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
function AnimatedPiece({
  piece,
  onNode,
  onRoad,
  onDone,
  reduced,
}: {
  piece: Piece;
  onNode: (n: number) => void;
  onRoad: (n: number) => void;
  onDone: (p: Piece) => void;
  reduced: boolean;
}) {
  const ref = useRef<THREE.Group>(null),
    started = useRef(performance.now()),
    done = useRef(false),
    progress = useRef(0),
    materials = useRef<THREE.Material[]>([]);
  useLayoutEffect(() => {
    started.current = performance.now();
    done.current = false;
    materials.current = [];
    if (piece.gone)
      ref.current?.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of ms) {
            m.transparent = true;
            m.depthWrite = false;
            materials.current.push(m);
          }
        }
      });
  }, [piece.revision, piece.gone]);
  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const t = reduced
      ? 1
      : Math.min(1, (performance.now() - started.current) / MOTION_MS);
    progress.current = t;
    const broken = piece.kind === "wall" && piece.gone;
    const pose = sampleMotion(piece, t);
    group.position.fromArray(broken ? piece.at : pose.position);
    group.rotation.set(
      ...(broken
        ? ([0, piece.yaw, 0] as [number, number, number])
        : pose.rotation),
    );
    group.scale.setScalar(broken ? 1 : pose.scale);
    if (piece.gone)
      materials.current.forEach(
        (m) =>
          (m.opacity = broken
            ? 1 - Math.max(0, (t - 0.55) / 0.45)
            : pose.opacity),
      );
    if (t === 1 && !done.current && piece.motion !== "idle") {
      done.current = true;
      onDone(piece);
    }
  });
  return (
    <group
      ref={ref}
      position={
        piece.motion === "place"
          ? [piece.at[0], piece.at[1] + 0.72, piece.at[2]]
          : piece.from
      }
      rotation={[0, piece.yaw, 0]}
    >
      {piece.kind === "wall" ? (
        piece.gone ? (
          <>
            <BrokenWall progress={progress} />
            <Dust progress={progress} />
          </>
        ) : (
          <StoneWall position={[0, 0, 0]} onClick={() => onRoad(piece.node)} />
        )
      ) : piece.kind === "soldier" ? (
        <Soldier
          position={[0, 0, 0]}
          onClick={() => {
            if (!piece.gone) onNode(piece.node);
          }}
        />
      ) : (
        <Runner />
      )}
    </group>
  );
}
export function AnimatedPieces({
  game,
  onNode,
  onRoad,
}: {
  game: Game;
  onNode: (n: number) => void;
  onRoad: (n: number) => void;
}) {
  const [pieces, setPieces] = useState(() => reconcilePieces([], game));
  const previous = useRef(game);
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useLayoutEffect(() => {
    if (previous.current === game) return;
    const old = previous.current;
    setPieces((current) =>
      reconcilePieces(current, game, old).filter((p) => !reduced || !p.gone),
    );
    previous.current = game;
  }, [game]);
  function complete(piece: Piece) {
    setPieces((current) =>
      current.flatMap((p) =>
        p.id === piece.id &&
        p.revision === piece.revision &&
        p.gone === piece.gone
          ? p.gone
            ? []
            : [{ ...p, motion: "idle" as const, from: p.at }]
          : [p],
      ),
    );
  }
  return (
    <>
      {pieces
        .filter((p) => !reduced || !p.gone)
        .map((piece) => (
          <AnimatedPiece
            key={`${piece.id}-${piece.gone ? "ghost" : "live"}`}
            piece={piece}
            onNode={onNode}
            onRoad={onRoad}
            onDone={complete}
            reduced={reduced}
          />
        ))}
    </>
  );
}
