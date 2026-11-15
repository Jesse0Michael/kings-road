import { useMemo } from "react";
import * as THREE from "three";
type Point = [number, number, number];
const steel = "#8e9b9c",
  darkSteel = "#465354",
  gold = "#c3a069",
  red = "#8b3440";
function Buckle({ position }: { position: Point }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.055, 0.045, 0.02]} />
      <meshStandardMaterial color={gold} metalness={0.5} roughness={0.4} />
    </mesh>
  );
}
function Sword({
  position,
  short = false,
}: {
  position: Point;
  short?: boolean;
}) {
  return (
    <group position={position} rotation={[0, 0, -0.08]}>
      <mesh castShadow position={[0, short ? 0.06 : 0.16, 0]}>
        <cylinderGeometry args={[0.009, 0.03, short ? 0.16 : 0.36, 4]} />
        <meshStandardMaterial
          color="#d0d8d5"
          metalness={0.65}
          roughness={0.33}
        />
      </mesh>
      <mesh position={[0, -0.035, 0]}>
        <boxGeometry args={[0.115, 0.026, 0.038]} />
        <meshStandardMaterial color={gold} metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.09, 6]} />
        <meshStandardMaterial color="#3f3028" />
      </mesh>
      <mesh position={[0, -0.145, 0]}>
        <sphereGeometry args={[0.029, 6, 4]} />
        <meshStandardMaterial color={gold} metalness={0.4} />
      </mesh>
    </group>
  );
}
function Shield() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.145, 0.17);
    s.lineTo(0.145, 0.17);
    s.lineTo(0.13, -0.015);
    s.quadraticCurveTo(0.09, -0.12, 0, -0.19);
    s.quadraticCurveTo(-0.09, -0.12, -0.13, -0.015);
    s.closePath();
    return s;
  }, []);
  return (
    <group position={[-0.09, 0.32, 0.15]} rotation={[0, -0.18, 0.08]}>
      <mesh castShadow>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.035,
              bevelEnabled: true,
              bevelSize: 0.008,
              bevelThickness: 0.008,
              bevelSegments: 1,
              steps: 1,
            },
          ]}
        />
        <meshStandardMaterial color={gold} metalness={0.32} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.045]} scale={[0.86, 0.86, 1]}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color={red} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0, 0.048]}>
        <boxGeometry args={[0.022, 0.26, 0.007]} />
        <meshStandardMaterial color="#dfc18c" />
      </mesh>
      <mesh position={[0, 0.035, 0.05]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.075, 0.075, 0.012]} />
        <meshStandardMaterial color="#dfc18c" />
      </mesh>
    </group>
  );
}
export function Soldier({
  position,
  onClick,
}: {
  position: Point;
  onClick: () => void;
}) {
  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh receiveShadow castShadow position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.175, 0.19, 0.07, 12]} />
        <meshStandardMaterial color="#5a2930" roughness={0.6} />
      </mesh>
      {[-1, 1].map((i) => (
        <group key={i}>
          <mesh castShadow position={[i * 0.064, 0.115, 0.055]}>
            <boxGeometry args={[0.086, 0.12, 0.14]} />
            <meshStandardMaterial color="#2f3434" />
          </mesh>
          <mesh castShadow position={[i * 0.063, 0.21, 0]}>
            <cylinderGeometry args={[0.052, 0.045, 0.18, 6]} />
            <meshStandardMaterial
              color={darkSteel}
              metalness={0.3}
              roughness={0.6}
            />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.115, 0.15, 0.22, 8]} />
        <meshStandardMaterial color={red} flatShading roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.405, 0.01]} scale={[1, 0.95, 0.68]}>
        <icosahedronGeometry args={[0.155, 0]} />
        <meshStandardMaterial color={steel} metalness={0.5} roughness={0.44} />
      </mesh>
      <mesh castShadow position={[0, 0.34, -0.085]} rotation={[-0.08, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.16, 0.34, 6, 1, true, 0, Math.PI]} />
        <meshStandardMaterial
          color="#702b34"
          side={THREE.DoubleSide}
          roughness={0.95}
        />
      </mesh>
      {[-1, 1].map((i) => (
        <mesh
          castShadow
          key={i}
          position={[i * 0.143, 0.44, 0.005]}
          scale={[1, 0.65, 1]}
        >
          <icosahedronGeometry args={[0.095, 0]} />
          <meshStandardMaterial
            color={darkSteel}
            metalness={0.4}
            roughness={0.45}
          />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.59, 0]}>
        <sphereGeometry args={[0.119, 8, 6]} />
        <meshStandardMaterial color={steel} metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.565, 0.105]}>
        <boxGeometry args={[0.155, 0.085, 0.04]} />
        <meshStandardMaterial color={darkSteel} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.592, 0.13]}>
        <boxGeometry args={[0.145, 0.018, 0.008]} />
        <meshStandardMaterial color="#172020" />
      </mesh>
      <mesh position={[0, 0.565, 0.14]}>
        <boxGeometry args={[0.018, 0.08, 0.018]} />
        <meshStandardMaterial color={gold} metalness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.68, -0.02]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.04, 0.1, 0.17]} />
        <meshStandardMaterial color="#ab4d53" roughness={0.8} />
      </mesh>
      <Sword position={[0.14, 0.35, 0.1]} />
      <Shield />
    </group>
  );
}
function Cloak() {
  const geometry = useMemo(() => {
    const rings = [
      { y: 0.17, r: 0.24, z: -0.055 },
      { y: 0.37, r: 0.2, z: -0.04 },
      { y: 0.56, r: 0.135, z: 0 },
    ];
    const data: number[] = [];
    const vertex = (r: number, a: number) => {
      const ring = rings[r],
        theta = -Math.PI * 0.12 + (a / 7) * Math.PI * 1.24;
      return [
        Math.cos(theta) * ring.r,
        ring.y + (r === 0 ? (a % 2) * 0.022 : 0),
        -Math.sin(theta) * ring.r + ring.z,
      ];
    };
    for (let r = 0; r < 2; r++)
      for (let a = 0; a < 7; a++)
        data.push(
          ...vertex(r, a),
          ...vertex(r + 1, a),
          ...vertex(r, a + 1),
          ...vertex(r, a + 1),
          ...vertex(r + 1, a),
          ...vertex(r + 1, a + 1),
        );
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(data, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh castShadow geometry={geometry}>
      <meshStandardMaterial
        color="#277c70"
        flatShading
        side={THREE.DoubleSide}
        roughness={0.96}
      />
    </mesh>
  );
}
export function Runner() {
  const hood = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.17, -0.09);
    shape.lineTo(-0.18, 0.065);
    shape.quadraticCurveTo(-0.14, 0.18, 0, 0.23);
    shape.quadraticCurveTo(0.13, 0.18, 0.18, 0.065);
    shape.lineTo(0.16, -0.09);
    shape.lineTo(0.1, -0.12);
    shape.lineTo(-0.1, -0.12);
    shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-0.1, -0.055);
    hole.lineTo(0.1, -0.055);
    hole.lineTo(0.108, 0.052);
    hole.quadraticCurveTo(0.08, 0.12, 0, 0.15);
    hole.quadraticCurveTo(-0.08, 0.12, -0.108, 0.052);
    hole.closePath();
    shape.holes.push(hole);
    return shape;
  }, []);
  return (
    <group rotation={[0, -0.13, 0]}>
      <mesh castShadow position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.215, 0.235, 0.07, 12]} />
        <meshStandardMaterial color="#194b43" roughness={0.7} />
      </mesh>
      {[-1, 1].map((i) => (
        <group key={i}>
          <mesh
            castShadow
            position={[i * 0.075, 0.13, 0.04]}
            rotation={[0.1, 0, i * 0.06]}
          >
            <boxGeometry args={[0.095, 0.19, 0.135]} />
            <meshStandardMaterial color="#3f352b" roughness={0.9} />
          </mesh>
          <mesh position={[i * 0.075, 0.235, 0]}>
            <cylinderGeometry args={[0.055, 0.045, 0.12, 6]} />
            <meshStandardMaterial color="#42443b" />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[0, 0.36, 0.005]}>
        <cylinderGeometry args={[0.135, 0.16, 0.28, 8]} />
        <meshStandardMaterial color="#3a5d50" flatShading roughness={0.92} />
      </mesh>
      <Cloak />
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[0.164, 0.164, 0.05, 8]} />
        <meshStandardMaterial color="#624830" />
      </mesh>
      <Buckle position={[0.025, 0.31, 0.16]} />
      <mesh castShadow position={[-0.18, 0.29, 0.025]} scale={[0.8, 1, 1]}>
        <icosahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color="#9a7748" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.46, 0.125]} rotation={[0, 0, 0.52]}>
        <boxGeometry args={[0.035, 0.24, 0.025]} />
        <meshStandardMaterial color="#7d6040" />
      </mesh>
      <mesh position={[0, 0.56, 0.065]}>
        <sphereGeometry args={[0.092, 8, 6]} />
        <meshStandardMaterial color="#bd9d76" flatShading />
      </mesh>
      <mesh position={[0, 0.545, 0.14]}>
        <boxGeometry args={[0.135, 0.065, 0.03]} />
        <meshStandardMaterial color="#325a4b" />
      </mesh>
      <mesh castShadow position={[0, 0.64, 0.06]}>
        <sphereGeometry args={[0.168, 8, 6]} />
        <meshStandardMaterial color="#205e54" flatShading roughness={0.94} />
      </mesh>
      <mesh position={[0, 0.655, 0.202]}>
        <circleGeometry args={[0.12, 8]} />
        <meshStandardMaterial color="#232c26" />
      </mesh>
      <mesh castShadow position={[0, 0.65, 0.15]} rotation={[0.08, 0, 0]}>
        <extrudeGeometry
          args={[
            hood,
            {
              depth: 0.045,
              bevelEnabled: true,
              bevelSegments: 1,
              bevelSize: 0.008,
              bevelThickness: 0.008,
              steps: 1,
            },
          ]}
        />
        <meshStandardMaterial color="#28695e" flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.653, 0.205]} scale={[0.75, 1, 0.35]}>
        <sphereGeometry args={[0.095, 7, 6]} />
        <meshStandardMaterial color="#b59871" flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.681, 0.237]}>
        <boxGeometry args={[0.105, 0.012, 0.005]} />
        <meshStandardMaterial color="#3b352b" />
      </mesh>
      <mesh position={[0, 0.617, 0.238]}>
        <boxGeometry args={[0.16, 0.055, 0.023]} />
        <meshStandardMaterial color="#487e69" />
      </mesh>
      {[-1, 1].map((i) => (
        <mesh
          castShadow
          key={i}
          position={[i * 0.155, 0.415, 0.045]}
          rotation={[0, 0, i * 0.15]}
        >
          <cylinderGeometry args={[0.06, 0.047, 0.23, 6]} />
          <meshStandardMaterial color="#286d60" flatShading />
        </mesh>
      ))}
      <Sword position={[0.19, 0.31, 0.12]} short />
    </group>
  );
}
export function StoneWall({
  position,
  onClick,
}: {
  position: Point;
  onClick: () => void;
}) {
  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh castShadow receiveShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[0.67, 0.06, 0.19]} />
        <meshStandardMaterial color="#756d57" roughness={0.95} />
      </mesh>
      {[0, 1].flatMap((row) =>
        [0, 1, 2].map((col) => (
          <mesh
            castShadow
            receiveShadow
            key={`${row}-${col}`}
            position={[
              (col - 1) * 0.205 + (row ? 0.012 : 0),
              row * 0.11 - 0.045,
              0,
            ]}
            rotation={[0, (col - 1) * 0.035, 0]}
          >
            <boxGeometry args={[0.196, 0.103, 0.19 + (col % 2) * 0.02]} />
            <meshStandardMaterial
              color={["#b1a382", "#c3b38a", "#a59b80"][(row + col) % 3]}
              roughness={0.94}
            />
          </mesh>
        )),
      )}
      {[0, 1, 2].map((i) => (
        <mesh castShadow key={i} position={[(i - 1) * 0.23, 0.16, 0]}>
          <boxGeometry args={[0.13, 0.1, 0.21]} />
          <meshStandardMaterial color="#c9b991" roughness={0.93} />
        </mesh>
      ))}
      <mesh position={[0, -0.008, 0.103]}>
        <boxGeometry args={[0.075, 0.17, 0.012]} />
        <meshStandardMaterial color="#c9a64a" roughness={0.6} />
      </mesh>
    </group>
  );
}
