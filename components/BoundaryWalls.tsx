import React from 'react';
import { RigidBody } from '@react-three/rapier';

export default function BoundaryWalls({ size = 20 }) {
  // Calculate half of the floor size for wall placement
  const halfSize = size / 2;
  const wallHeight = 4; // Height of invisible walls
  const wallThickness = 0.5; // Thickness of walls
  
  return (
    <>
      {/* North Wall (positive Z) */}
      <RigidBody type="fixed" position={[0, wallHeight/2, halfSize + wallThickness/2]}>
        <mesh>
          <boxGeometry args={[size + wallThickness*2, wallHeight, wallThickness]} />
          <meshStandardMaterial transparent opacity={0.0} /> {/* Invisible material */}
        </mesh>
      </RigidBody>
      
      {/* South Wall (negative Z) */}
      <RigidBody type="fixed" position={[0, wallHeight/2, -halfSize - wallThickness/2]}>
        <mesh>
          <boxGeometry args={[size + wallThickness*2, wallHeight, wallThickness]} />
          <meshStandardMaterial transparent opacity={0.0} />
        </mesh>
      </RigidBody>
      
      {/* East Wall (positive X) */}
      <RigidBody type="fixed" position={[halfSize + wallThickness/2, wallHeight/2, 0]}>
        <mesh>
          <boxGeometry args={[wallThickness, wallHeight, size + wallThickness*2]} />
          <meshStandardMaterial transparent opacity={0.0} />
        </mesh>
      </RigidBody>
      
      {/* West Wall (negative X) */}
      <RigidBody type="fixed" position={[-halfSize - wallThickness/2, wallHeight/2, 0]}>
        <mesh>
          <boxGeometry args={[wallThickness, wallHeight, size + wallThickness*2]} />
          <meshStandardMaterial transparent opacity={0.0} />
        </mesh>
      </RigidBody>
    </>
  );
}