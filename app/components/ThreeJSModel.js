'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as THREE from 'three';

export default function ThreeJSModel({ threeCode }) {
  const { scene, camera, gl } = useThree();
  const controlsRef = useRef(null);

  useEffect(() => {
    // Set up scene
    scene.background = new THREE.Color(0x000000);
    
    // Set up camera
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);
    
    // Set up orbit controls
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
    };
    animate();
    
    // Try to execute the provided Three.js code
    try {
      if (typeof threeCode === 'function') {
        threeCode(scene, camera, renderer);
      }
    } catch (error) {
      console.error('Error executing Three.js code:', error);
      // Create a fallback geometry if the code fails
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
    }
    
    // Cleanup
    return () => {
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      scene.clear();
    };
  }, [scene, camera, gl, threeCode]);

  return null;
} 