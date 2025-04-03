import React from 'react';
import * as THREE from 'three';

export default function FlatFloor(props) {
  // Create a flat plane with a simple texture
  const geometry = new THREE.PlaneGeometry(20, 20); // 20x20 units
  const material = new THREE.MeshStandardMaterial({ 
    color: '#78a679', // Green color for floor
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.DoubleSide
  });
  
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to be horizontal
      receiveShadow
      {...props}
    >
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
  );
}