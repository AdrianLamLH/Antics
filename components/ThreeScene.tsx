"use client"
import React from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

const ThreeScene: React.FC = () => {
  const meshRef = React.useRef<Mesh>(null);
  
  // This runs on every animation frame
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });
  
  return (
    <>
      {/* Ambient light to see the scene */}
      <ambientLight intensity={0.5} />
      {/* Directional light for shadows */}
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      {/* A simple green box */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="blue" />
      </mesh>
    </>
  );
};

export default ThreeScene;