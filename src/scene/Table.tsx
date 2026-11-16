import { Suspense, Component, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { Game, roads } from "../game/engine";
import { AnimatedPieces } from "./AnimatedPieces";
import type { Transition } from "./motion";
import { Dice, roleColors } from "./Dice";
import type { DiceRoll } from "./Dice";
import {
  BOARD_RADIUS,
  canBuild,
  nodeSelectable,
  pickRoad,
  positions,
} from "./boardLayout";
import { engravedBoard, tabletopTexture, texturePaths } from "./materials";
export const colors = roleColors;
export type TableProps = {
  game: Game;
  onNode: (n: number) => void;
  onRoad: (n: number) => void;
  selected: number | null;
  transitions?: Transition[];
  diceRoll?: DiceRoll | null;
  example?: boolean;
};
function boardTop() {
  const points: number[] = [],
    uv: number[] = [];
  for (let i = 0; i < 5; i++) {
    const a = positions[i],
      b = positions[(i + 1) % 5];
    for (const [x, z] of [
      [0, 0],
      [(b[0] * BOARD_RADIUS) / 3.05, (b[1] * BOARD_RADIUS) / 3.05],
      [(a[0] * BOARD_RADIUS) / 3.05, (a[1] * BOARD_RADIUS) / 3.05],
    ]) {
      points.push(x, 0.17, z);
      uv.push(0.5 + x / (BOARD_RADIUS * 2), 0.5 - z / (BOARD_RADIUS * 2));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
function Scene({
  game,
  onNode,
  onRoad,
  selected,
  transitions,
  diceRoll,
}: TableProps) {
  const [tableSource, boardSource] = useLoader(THREE.TextureLoader, [
    texturePaths.table,
    texturePaths.board,
  ]);
  const board = useMemo(() => engravedBoard(boardSource.image), [boardSource]);
  const table = useMemo(() => tabletopTexture(tableSource), [tableSource]);
  const top = useMemo(boardTop, []);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(
    () => () => {
      board.dispose();
      table.dispose();
      top.dispose();
    },
    [board, table, top],
  );
  const builder =
    game.turn === "Builder" &&
    game.human === "Builder" &&
    game.phase === "build" &&
    !game.winner;
  return (
    <>
      <color attach="background" args={["#211b16"]} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#d7e2ea", "#392b21", 1.2]} />
      <directionalLight
        castShadow
        position={[-3, 8, 3]}
        intensity={2.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-normalBias={0.015}
        shadow-radius={5}
      />
      <directionalLight position={[4, 5, -3]} intensity={0.8} color="#d4e1ed" />
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.23, 0]}
      >
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial map={table} roughness={0.86} color="#c3b8ad" />
      </mesh>
      <mesh
        receiveShadow
        castShadow
        position={[0, -0.035, 0]}
        rotation={[0, Math.PI, 0]}
      >
        <cylinderGeometry args={[4.12, 4.16, 0.4, 5]} />
        <meshStandardMaterial color="#63412b" roughness={0.5} />
      </mesh>
      <mesh receiveShadow geometry={top}>
        <meshStandardMaterial
          map={board.map}
          bumpMap={board.bump}
          bumpScale={0.038}
          roughness={0.58}
          color="#acb4b1"
        />
      </mesh>
      {/* Narrow lights trace the engraved roads; the much wider input region is resolved centrally. */}
      {roads.map(([a, b], i) => {
        if (!canBuild(game, i)) return null;
        const [ax, az] = positions[a],
          [bx, bz] = positions[b];
        return (
          <group
            key={i}
            position={[(ax + bx) / 2, 0.179, (az + bz) / 2]}
            rotation={[0, Math.atan2(bx - ax, bz - az), 0]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry
                args={[
                  hover === i ? 0.25 : 0.14,
                  Math.hypot(bx - ax, bz - az) - 1.35,
                ]}
              />
              <meshBasicMaterial
                color="#efd383"
                transparent
                opacity={hover === i ? 0.55 : 0.24}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
      {positions.map(([x, z], n) => {
        const enabled = nodeSelectable(game, n, selected);
        const chosen =
          selected === n && game.phase === "move" && game.human === game.turn;
        return (
          <group key={n} position={[x, 0.185, z]}>
            {(enabled || chosen) && (
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.56, 0.65, 64]} />
                <meshBasicMaterial
                  color={chosen ? "#f5d794" : roleColors[game.turn]}
                  transparent
                  opacity={chosen ? 0.8 : 0.48}
                  depthWrite={false}
                />
              </mesh>
            )}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                if (enabled) onNode(n);
              }}
            >
              <circleGeometry args={[0.66, 32]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
      {builder && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.181, 0]}
          onPointerMove={(e) => {
            const r = pickRoad(e.point.x, e.point.z);
            setHover(r !== null && canBuild(game, r) ? r : null);
          }}
          onPointerOut={() => setHover(null)}
          onClick={(e) => {
            e.stopPropagation();
            const road = pickRoad(e.point.x, e.point.z);
            if (road !== null && canBuild(game, road)) onRoad(road);
          }}
        >
          <planeGeometry args={[9, 9]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <AnimatedPieces
        game={game}
        transitions={transitions}
        onNode={onNode}
        onRoad={onRoad}
      />
      <Dice roll={diceRoll ?? null} />
    </>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <h2>The tabletop needs WebGL</h2>
        <p>
          Enable WebGL and hardware acceleration, then reload to play on the
          board. Your saved game will be here when you return.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function Table(props: TableProps) {
  return (
    <SceneBoundary>
      <Canvas
        shadows
        camera={{ position: [0, 8.8, 9.1], fov: props.example ? 36 : 42 }}
        dpr={[1, 1.6]}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0.15)}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  );
}
