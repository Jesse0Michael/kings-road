import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Game } from "../game/engine";
import { Runner, Soldier, StoneWall } from "./Pieces";
import { ScoringCoins } from "./ScoringCoins";
import {
  Piece,
  Transition,
  reconcilePieces,
  samplePiece,
  endTime,
} from "./motion";

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
    progress = useRef(0),
    done = useRef(false);
  const intact = useRef<THREE.Group>(null),
    debris = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    done.current = false;
  }, [piece.steps]);
  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const pose = samplePiece(piece, reduced ? Infinity : performance.now());
    progress.current = pose.breaking;
    const broken = piece.kind === "wall" && !!piece.gone && pose.breaking > 0;
    if (intact.current) intact.current.visible = !broken;
    if (debris.current) debris.current.visible = broken;
    group.position.fromArray(broken ? piece.at : pose.position);
    group.rotation.set(
      ...(broken
        ? ([0, piece.yaw, 0] as [number, number, number])
        : pose.rotation),
    );
    group.scale.setScalar(broken ? 1 : pose.scale);
    if (piece.gone)
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => {
            m.transparent = true;
            m.depthWrite = false;
            m.opacity = pose.opacity;
          });
        }
      });
    if (pose.done && !done.current && piece.steps.length) {
      done.current = true;
      onDone(piece);
    }
  });
  const initial = samplePiece(piece, performance.now());
  return (
    <group
      name={piece.id}
      ref={ref}
      position={initial.position}
      rotation={initial.rotation}
    >
      {piece.kind === "wall" ? (
        <>
          <group ref={intact}>
            <StoneWall
              position={[0, 0, 0]}
              onClick={() => {
                if (!piece.gone) onRoad(piece.node);
              }}
            />
          </group>
          {piece.gone && (
            <group ref={debris} visible={false}>
              <BrokenWall progress={progress} />
              <Dust progress={progress} />
            </group>
          )}
        </>
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
  transitions = [],
  onNode,
  onRoad,
}: {
  game: Game;
  transitions?: Transition[];
  onNode: (n: number) => void;
  onRoad: (n: number) => void;
}) {
  const [pieces, setPieces] = useState(() => reconcilePieces([], game));
  const previous = useRef(game),
    last = useRef(transitions.at(-1)?.id ?? 0);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useLayoutEffect(() => {
    if (previous.current === game) return;
    const pending = transitions.filter(
      (t) => t.id > last.current && t.after.id === game.id,
    );
    if (previous.current.id !== game.id || !pending.length)
      setPieces(reconcilePieces([], game));
    else
      setPieces((current) =>
        pending
          .reduce(
            (ps, t) => reconcilePieces(ps, t.after, t.before, t.at),
            current,
          )
          .filter((p) => !reduced || !p.gone),
      );
    last.current = transitions.at(-1)?.id ?? 0;
    previous.current = game;
  }, [game, transitions, reduced]);
  function complete(piece: Piece) {
    setPieces((current) =>
      current.flatMap((p) =>
        p.uid === piece.uid && endTime(p) === endTime(piece)
          ? p.gone
            ? []
            : [{ ...p, steps: [] }]
          : [p],
      ),
    );
  }
  return (
    <>
      {pieces
        .filter((p) => p.kind !== "coin")
        .map((piece) => (
          <AnimatedPiece
            key={piece.uid}
            piece={piece}
            onNode={onNode}
            onRoad={onRoad}
            onDone={complete}
            reduced={reduced}
          />
        ))}
      <ScoringCoins
        game={game}
        coins={pieces.filter((p) => p.kind === "coin")}
        reduced={reduced}
        onNode={onNode}
        onDone={complete}
      />
    </>
  );
}
