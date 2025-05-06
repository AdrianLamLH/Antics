'use client';

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import * as THREE from 'three';

interface DraggableProps {
  children: React.ReactNode;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function Draggable({ children, onDragStart, onDragEnd }: DraggableProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl, scene } = useThree();
  const dragControlsRef = useRef<DragControls | null>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    // Get all meshes in the group
    const meshes: THREE.Mesh[] = [];
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });

    // Initialize drag controls
    const dragControls = new DragControls(meshes, camera, gl.domElement);
    dragControlsRef.current = dragControls;

    // Add event listeners
    dragControls.addEventListener('dragstart', () => {
      // Disable orbit controls when dragging starts
      scene.orbitControls?.enabled = false;
      onDragStart?.();
    });

    dragControls.addEventListener('dragend', () => {
      // Re-enable orbit controls when dragging ends
      scene.orbitControls?.enabled = true;
      onDragEnd?.();
    });

    // Cleanup
    return () => {
      dragControls.removeEventListener('dragstart', () => {});
      dragControls.removeEventListener('dragend', () => {});
      dragControls.dispose();
    };
  }, [camera, gl, scene, onDragStart, onDragEnd]);

  return <group ref={groupRef}>{children}</group>;
} 