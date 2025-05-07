"use client"
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ExtrudeGeometry, MeshStandardMaterial, Mesh } from 'three';

interface DrawnObjectProps {
  geometry: ExtrudeGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

const DrawnObject: React.FC<DrawnObjectProps> = ({
  geometry,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1]
}) => {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      // Add any animation or interaction logic here
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial vertexColors />
    </mesh>
  );
};

export default DrawnObject; 