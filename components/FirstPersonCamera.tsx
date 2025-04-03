import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

export default function FirstPersonCamera({ 
  characterBodyRef, 
  height = 1.8, 
  rotationOffset = 0, // Add rotation offset parameter
  modelOffset = [0, 0, 0] // Add model offset parameter for fine-tuning position
}) {
  const cameraRef = useRef();
  const { camera } = useThree();
  
  // Update camera position and rotation every frame
  useFrame(() => {
    if (!characterBodyRef.current || !cameraRef.current) return;
    
    // Get character position and rotation
    const position = characterBodyRef.current.translation();
    const rotation = characterBodyRef.current.rotation();
    
    // Create quaternion from character rotation
    const quaternion = new THREE.Quaternion(
      rotation.x, 
      rotation.y, 
      rotation.z, 
      rotation.w
    );
    
    // Apply rotation offset if needed
    if (rotationOffset !== 0) {
      const offsetQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        rotationOffset
      );
      quaternion.multiply(offsetQuat);
    }
    
    // Set camera position to be at character's head, with model-specific offset
    cameraRef.current.position.set(
      position.x + modelOffset[0], 
      position.y + height + modelOffset[1], 
      position.z + modelOffset[2]
    );
    
    // Set camera rotation to match character's rotation
    cameraRef.current.quaternion.copy(quaternion);
  });
  
  // Make this camera the default
  useEffect(() => {
    if (cameraRef.current) {
      camera.position.copy(cameraRef.current.position);
      camera.quaternion.copy(cameraRef.current.quaternion);
      camera.updateProjectionMatrix();
    }
    
    return () => {
      // Clean up if needed
    };
  }, [camera]);

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={90}
    />
  );
}