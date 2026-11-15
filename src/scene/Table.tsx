import { woodSurface, castleEngraving } from "./materials";
import { AnimatedPieces } from "./AnimatedPieces";
import { positions } from "./motion";
import { Suspense } from "react";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  RapierRigidBody,
} from "@react-three/rapier";
import { Canvas, useFrame } from "@react-three/fiber";
import { Component, ReactNode, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Game, roads } from "../game/engine";
export const colors = {
  Builder: "#ddb446",
  Army: "#a83b42",
  Runner: "#35a99b",
};
function dieTexture(value: number, color: string) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(255,235,190,.25)";
  ctx.strokeRect(5, 5, 118, 118);
  ctx.fillStyle = "#fff0cf";
  ctx.font = "bold 66px Georgia";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(value), 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function Die({
  sides,
  value,
  index,
  color,
  rolling,
}: {
  sides: number;
  value: number;
  index: number;
  color: string;
  rolling: boolean;
}) {
  const body = useRef<RapierRigidBody>(null);
  const geometry = useMemo(() => {
    if (sides === 6) return new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const g =
      sides === 4
        ? new THREE.TetrahedronGeometry(0.45)
        : new THREE.OctahedronGeometry(0.45);
    const p = g.getAttribute("position");
    const a = new THREE.Vector3().fromBufferAttribute(p, 0),
      b = new THREE.Vector3().fromBufferAttribute(p, 1),
      c = new THREE.Vector3().fromBufferAttribute(p, 2);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        normal,
        new THREE.Vector3(0, 1, 0),
      ),
    );
    const uv = [];
    g.clearGroups();
    for (let i = 0; i < p.count / 3; i++) {
      uv.push(0.1, 0.12, 0.9, 0.12, 0.5, 0.9);
      g.addGroup(i * 3, 3, i);
    }
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    return g;
  }, [sides]);
  const materials = useMemo(
    () =>
      Array.from({ length: sides }, (_, i) => {
        const face = sides === 6 ? 2 : 0;
        const number = 1 + ((i - face + value - 1 + sides) % sides);
        return new THREE.MeshStandardMaterial({
          map: dieTexture(number, color),
          roughness: 0.42,
        });
      }),
    [sides, value, color],
  );
  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  useEffect(
    () => () => {
      materials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
    [materials],
  );
  useEffect(() => {
    const r = body.current;
    if (!r) return;
    r.setBodyType(rolling ? 0 : 2, true);
    if (rolling) {
      r.setTranslation(
        { x: -2 + index * 0.72, y: 1.2 + index * 0.25, z: 4.1 },
        true,
      );
      r.setLinvel({ x: 2.7 - index * 0.3, y: 1.2, z: 0.05 }, true);
      r.setAngvel({ x: 8 + index, y: 6 - index, z: 9 }, true);
    }
  }, [rolling, index]);
  useFrame((_, dt) => {
    const r = body.current;
    if (!r || rolling) return;
    const p = r.translation();
    const blend = 1 - Math.exp(-12 * dt);
    r.setNextKinematicTranslation({
      x: THREE.MathUtils.lerp(p.x, -0.8 + index * 0.8, blend),
      y: THREE.MathUtils.lerp(p.y, 0.2, blend),
      z: THREE.MathUtils.lerp(p.z, 4.05, blend),
    });
    const q = r.rotation();
    const next = new THREE.Quaternion(q.x, q.y, q.z, q.w).slerp(
      new THREE.Quaternion(),
      blend,
    );
    r.setNextKinematicRotation(next);
  });
  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders="hull"
      restitution={0.35}
      friction={0.8}
      position={[-0.8 + index * 0.8, 0.2, 4.05]}
    >
      <mesh castShadow geometry={geometry} material={materials} />
    </RigidBody>
  );
}
function Marker({
  text,
  position,
}: {
  text: string;
  position: [number, number, number];
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 96;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(34,22,14,.9)";
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 96, 18);
    ctx.fill();
    ctx.fillStyle = "#ead1a2";
    ctx.font = "500 48px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 50);
    return new THREE.CanvasTexture(c);
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[0.72, 0.27, 1]}>
      <spriteMaterial map={texture} depthTest={false} />
    </sprite>
  );
}
function Scene({
  game,
  onNode,
  onRoad,
  selected,
  rolling,
}: {
  game: Game;
  onNode: (n: number) => void;
  onRoad: (n: number) => void;
  selected: number | null;
  rolling: boolean;
}) {
  const wood = useMemo(() => woodSurface(), []);
  const table = useMemo(() => woodSurface(true), []);
  const engraving = useMemo(castleEngraving, []);
  useEffect(
    () => () => {
      wood.dispose();
      table.dispose();
      engraving.dispose();
    },
    [wood, table, engraving],
  );
  return (
    <>
      <color attach="background" args={["#211713"]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#d9e3e7", "#483323", 1.35]} />
      <directionalLight
        castShadow
        position={[-4, 10, 4]}
        intensity={3.1}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-normalBias={0.025}
        shadow-radius={4}
      />
      <pointLight position={[5, 4, -4]} intensity={14} color="#f4b965" />
      <mesh receiveShadow position={[0, -0.4, 0]}>
        <boxGeometry args={[200, 0.3, 200]} />
        <meshStandardMaterial
          map={table.map}
          bumpMap={table.bump}
          bumpScale={0.035}
          color="#a99d8e"
          roughness={0.73}
        />
      </mesh>
      <mesh
        receiveShadow
        castShadow
        position={[0, -0.05, 0]}
        rotation={[0, Math.PI, 0]}
      >
        <cylinderGeometry args={[4.05, 4.12, 0.4, 5]} />
        <meshStandardMaterial
          map={wood.map}
          bumpMap={wood.bump}
          bumpScale={0.012}
          color="#d9c5a8"
          roughness={0.48}
        />
      </mesh>
      <mesh
        receiveShadow
        position={[0, 0.16, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      >
        <ringGeometry args={[3.7, 3.73, 5]} />
        <meshStandardMaterial color="#dab77a" />
      </mesh>
      {roads.map(([a, b], i) => {
        const [ax, az] = positions[a],
          [bx, bz] = positions[b];
        const angle = Math.atan2(bx - ax, bz - az);
        const length = Math.hypot(ax - bx, az - bz);
        return (
          <group
            key={i}
            position={[(ax + bx) / 2, 0.18, (az + bz) / 2]}
            rotation={[0, angle, 0]}
          >
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onRoad(i);
              }}
            >
              <boxGeometry args={[0.3, 0.06, length - 0.6]} />
              <meshStandardMaterial
                color={
                  game.phase === "build" && game.human === game.turn
                    ? "#b59156"
                    : "#4b2d1c"
                }
              />
            </mesh>
          </group>
        );
      })}
      {positions.map(([x, z], n) => (
        <group key={n} position={[x, n === 5 ? 0.075 : 0.2, z]}>
          <mesh
            receiveShadow
            castShadow
            onClick={(e) => {
              e.stopPropagation();
              onNode(n);
            }}
          >
            <cylinderGeometry
              args={[n === 5 ? 0.68 : 0.52, n === 5 ? 0.73 : 0.57, 0.17, 32]}
            />
            <meshStandardMaterial
              map={wood.map}
              bumpMap={wood.bump}
              bumpScale={0.012}
              color={
                selected === n
                  ? "#f5ca70"
                  : game.visited.includes(n)
                    ? "#b49764"
                    : "#dfb880"
              }
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.091, 0]}>
            <ringGeometry
              args={[n === 5 ? 0.57 : 0.43, n === 5 ? 0.59 : 0.45, 32]}
            />
            <meshStandardMaterial color="#694a2b" />
          </mesh>
          {n === 5 && (
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.091, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onNode(5);
              }}
            >
              <planeGeometry args={[1.27, 1.27]} />
              <meshStandardMaterial
                map={engraving}
                transparent
                roughness={1}
                polygonOffset
                polygonOffsetFactor={-2}
              />
            </mesh>
          )}
        </group>
      ))}
      <AnimatedPieces game={game} onNode={onNode} onRoad={onRoad} />
      {positions.map(([x, z], n) => (
        <Marker
          key={n}
          text={`${n === 5 ? "CASTLE" : ["I", "II", "III", "IV", "V"][n]}${game.units.some((u) => u.node === n) ? ` · ${game.units.filter((u) => u.node === n).length}` : ""}`}
          position={[x, 0.35, z + 0.65]}
        />
      ))}
      {roads.map(([a, b], i) =>
        game.walls[i] > 7 ? (
          <Marker
            key={i}
            text={`${game.walls[i]} walls`}
            position={[
              (positions[a][0] + positions[b][0]) / 2,
              0.85,
              (positions[a][1] + positions[b][1]) / 2,
            ]}
          />
        ) : null,
      )}
      <Suspense fallback={null}>
        <Physics gravity={[0, -18, 0]}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[12, 0.1, 12]} position={[0, -0.35, 0]} />
          </RigidBody>
          {(game.dice.length
            ? game.dice
            : Array(
                game.turn === "Builder" ? 3 : game.turn === "Army" ? 2 : 1,
              ).fill(1)
          ).map((v, i) => (
            <Die
              key={`${game.turn}-${i}`}
              value={v}
              sides={game.turn === "Builder" ? 4 : game.turn === "Army" ? 6 : 8}
              index={i}
              color={colors[game.turn]}
              rolling={rolling}
            />
          ))}
        </Physics>
      </Suspense>
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
          You can still play using the labeled controls beside the board. Try
          enabling hardware acceleration for the 3D view.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function Table(props: Parameters<typeof Scene>[0]) {
  return (
    <SceneBoundary>
      <Canvas
        shadows
        camera={{ position: [0, 8.7, 9.3], fov: 46 }}
        dpr={[1, 1.8]}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0.1)}
      >
        <Scene {...props} />
      </Canvas>
    </SceneBoundary>
  );
}
