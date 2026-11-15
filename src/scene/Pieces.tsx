import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Point = [number, number, number];
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
      <mesh castShadow position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.17, 0.19, 0.09, 10]} />
        <meshStandardMaterial color="#762e32" roughness={0.65} />
      </mesh>
      {[-1, 1].map((i) => (
        <mesh castShadow key={i} position={[i * 0.065, 0.15, 0.015]}>
          <boxGeometry args={[0.09, 0.16, 0.12]} />
          <meshStandardMaterial
            color="#393b3d"
            roughness={0.62}
            metalness={0.3}
          />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.14, 0.115, 0.26, 6]} />
        <meshStandardMaterial color="#a34a48" flatShading roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.35, -0.075]}>
        <boxGeometry args={[0.22, 0.25, 0.05]} />
        <meshStandardMaterial color="#682b30" />
      </mesh>
      {[-1, 1].map((i) => (
        <mesh castShadow key={i} position={[i * 0.14, 0.41, 0]}>
          <sphereGeometry args={[0.095, 6, 4]} />
          <meshStandardMaterial
            color="#73777a"
            flatShading
            metalness={0.55}
            roughness={0.45}
          />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.56, 0]}>
        <sphereGeometry args={[0.125, 8, 6]} />
        <meshStandardMaterial
          color="#888b89"
          flatShading
          roughness={0.42}
          metalness={0.55}
        />
      </mesh>
      <mesh position={[0, 0.55, 0.113]}>
        <boxGeometry args={[0.15, 0.035, 0.025]} />
        <meshStandardMaterial color="#252726" />
      </mesh>
      <mesh castShadow position={[0, 0.67, -0.015]}>
        <boxGeometry args={[0.045, 0.13, 0.15]} />
        <meshStandardMaterial color="#9b3b3e" />
      </mesh>
      {/* Shield and upright sword are tucked against the body, keeping a pawn silhouette. */}
      <group position={[-0.085, 0.3, 0.13]} rotation={[0, 0, 0.12]}>
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.25]}>
          <cylinderGeometry args={[0.14, 0.14, 0.045, 6]} />
          <meshStandardMaterial color="#9c4143" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0, 0.028]}>
          <boxGeometry args={[0.022, 0.24, 0.016]} />
          <meshStandardMaterial color="#d0ad6d" metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[0.22, 0.022, 0.016]} />
          <meshStandardMaterial color="#d0ad6d" metalness={0.4} />
        </mesh>
      </group>
      <group position={[0.14, 0.3, 0.12]} rotation={[0, 0, 0.08]}>
        <mesh castShadow position={[0, 0.11, 0]}>
          <boxGeometry args={[0.035, 0.32, 0.025]} />
          <meshStandardMaterial
            color="#c0c8c8"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.285, 0]}>
          <coneGeometry args={[0.024, 0.06, 4]} />
          <meshStandardMaterial color="#c0c8c8" metalness={0.7} />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <boxGeometry args={[0.12, 0.025, 0.04]} />
          <meshStandardMaterial color="#b99b63" metalness={0.5} />
        </mesh>
        <mesh position={[0, -0.09, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.09, 6]} />
          <meshStandardMaterial color="#302723" />
        </mesh>
      </group>
    </group>
  );
}
export function Runner({
  node,
  positions,
}: {
  node: number;
  positions: [number, number][];
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.position.x = THREE.MathUtils.damp(
        ref.current.position.x,
        positions[node][0],
        8,
        dt,
      );
      ref.current.position.z = THREE.MathUtils.damp(
        ref.current.position.z,
        positions[node][1],
        8,
        dt,
      );
    }
  });
  return (
    <group
      ref={ref}
      position={[positions[node][0], 0.3, positions[node][1]]}
      rotation={[0, -0.2, 0]}
    >
      <mesh castShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.22, 0.25, 0.08, 12]} />
        <meshStandardMaterial color="#17574f" />
      </mesh>
      {[-1, 1].map((i) => (
        <mesh
          castShadow
          key={i}
          position={[i * 0.085, 0.16, 0.05]}
          rotation={[0.15, 0, i * 0.1]}
        >
          <boxGeometry args={[0.1, 0.22, 0.16]} />
          <meshStandardMaterial color="#292a28" />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.35, 0]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.2, 0.34, 7]} />
        <meshStandardMaterial color="#23685e" flatShading roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 0.43, -0.1]} rotation={[-0.2, 0, 0]}>
        <coneGeometry args={[0.23, 0.5, 7]} />
        <meshStandardMaterial color="#1c514c" flatShading roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 0.64, 0.05]} rotation={[0.3, 0, 0]}>
        <sphereGeometry args={[0.185, 7, 6]} />
        <meshStandardMaterial color="#287d70" flatShading roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.62, 0.195]} rotation={[0.12, 0, 0]}>
        <circleGeometry args={[0.12, 7]} />
        <meshStandardMaterial color="#161f1e" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.56, 0.205]}>
        <boxGeometry args={[0.17, 0.06, 0.025]} />
        <meshStandardMaterial color="#35524a" />
      </mesh>
      <mesh position={[0, 0.29, 0.01]}>
        <cylinderGeometry args={[0.16, 0.16, 0.055, 8]} />
        <meshStandardMaterial color="#674b31" />
      </mesh>
      <mesh castShadow position={[-0.18, 0.28, 0.06]}>
        <sphereGeometry args={[0.085, 6, 5]} />
        <meshStandardMaterial color="#9a7648" flatShading />
      </mesh>
      <mesh castShadow position={[0.19, 0.36, 0.08]} rotation={[0, 0, -0.55]}>
        <boxGeometry args={[0.08, 0.23, 0.09]} />
        <meshStandardMaterial color="#205c54" />
      </mesh>
      <mesh castShadow position={[0.22, 0.29, 0.16]} rotation={[0, 0, -0.6]}>
        <coneGeometry args={[0.035, 0.19, 4]} />
        <meshStandardMaterial color="#bac2bc" metalness={0.6} roughness={0.4} />
      </mesh>
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
      <mesh receiveShadow castShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[0.67, 0.06, 0.19]} />
        <meshStandardMaterial color="#665e4b" roughness={1} />
      </mesh>
      {[0, 1].flatMap((row) =>
        [0, 1, 2].map((col) => (
          <mesh
            receiveShadow
            castShadow
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
              color={["#aa9b70", "#bdad7f", "#968d73"][(row + col) % 3]}
              roughness={0.94}
              flatShading
            />
          </mesh>
        )),
      )}
      {[0, 1, 2].map((i) => (
        <mesh castShadow key={i} position={[(i - 1) * 0.23, 0.16, 0]}>
          <boxGeometry args={[0.13, 0.1, 0.21]} />
          <meshStandardMaterial color="#c4b385" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, -0.008, 0.103]}>
        <boxGeometry args={[0.075, 0.17, 0.012]} />
        <meshStandardMaterial
          color="#d3af4d"
          metalness={0.25}
          roughness={0.55}
        />
      </mesh>
    </group>
  );
}
