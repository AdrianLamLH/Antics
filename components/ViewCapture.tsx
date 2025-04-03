import React, { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function ViewCapture({ onCapture, active = false }) {
  const { gl, scene } = useThree();
  const [viewCaptured, setViewCaptured] = useState(false);
  
  // Create a temporary camera for character's perspective
  const characterCameraRef = useRef(new THREE.PerspectiveCamera(75, 1, 0.1, 1000));
  
  useEffect(() => {
    if (active && !viewCaptured) {
      console.log("ViewCapture is active, capturing...");
      
      // Set up the camera
      const camera = characterCameraRef.current;
      
      // Position camera looking forward
      camera.position.set(0, 1.7, 0);
      camera.lookAt(0, 1.7, -1);
      
      // Simple capture process
      try {
        // Create a renderer
        const captureWidth = 512;
        const captureHeight = 512;
        
        // Render to canvas directly
        const canvas = document.createElement('canvas');
        canvas.width = captureWidth;
        canvas.height = captureHeight;
        
        // Configure renderer
        const renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          antialias: true,
          alpha: true
        });
        renderer.setSize(captureWidth, captureHeight);
        
        // Render scene using the camera
        renderer.render(scene, camera);
        
        // Get image as data URL
        const dataURL = canvas.toDataURL('image/jpeg', 0.7);
        
        // Mark as captured
        setViewCaptured(true);
        
        // Call the onCapture callback
        if (onCapture) {
          console.log("Calling onCapture with dataURL length:", dataURL.length);
          onCapture(dataURL);
        }
        
        // Clean up
        renderer.dispose();
      } catch (error) {
        console.error("Error capturing view:", error);
        setViewCaptured(true); // Mark as captured to prevent loops
      }
    }
    
    return () => {
      setViewCaptured(false);
    };
  }, [active, scene, onCapture, viewCaptured]);
  
  return null;
}