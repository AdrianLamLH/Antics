import React, { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function ViewCapture({ onCapture, active = false, characterId = "character", characterBodyRef = null }) {
  const { gl, scene, camera: mainCamera } = useThree();
  const [viewCaptured, setViewCaptured] = useState(false);
  
  // Create a temporary camera for character's perspective
  const characterCameraRef = useRef(new THREE.PerspectiveCamera(90, 1, 0.1, 1000));
  
  useEffect(() => {
    if (active && !viewCaptured) {
      console.log("ViewCapture is active, capturing...");
      
      // Set up the camera based on character's position and orientation
      const camera = characterCameraRef.current;
      
      // Get character position and rotation from the rigid body if available
      if (characterBodyRef && characterBodyRef.current) {
        const position = characterBodyRef.current.translation();
        const rotation = characterBodyRef.current.rotation();
        
        // Create quaternion from character's rotation
        const quaternion = new THREE.Quaternion(
          rotation.x, 
          rotation.y, 
          rotation.z, 
          rotation.w
        );
        
        // Create a forward vector based on character's orientation
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
        
        // Position camera slightly above and in front of the character
        // Higher eye height (2.0 instead of 1.7)
        // Shifted 0.7 units forward in the character's facing direction
        camera.position.set(
          position.x + forward.x * 0.7, 
          position.y + 2.0,  // Higher position
          position.z + forward.z * 0.7
        );
        
        // Apply rotation to camera
        camera.quaternion.copy(quaternion);
        
        // Angle the camera slightly downward to see more of the scene
        const downwardTilt = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),  // X axis for pitch
          0.15  // About 8.6 degrees downward
        );
        
        camera.quaternion.multiply(downwardTilt);
        
        console.log(`Capturing from elevated position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
      } else {
        // Fallback position for when character body isn't available
        console.warn("Character body reference not available, using default camera position");
        camera.position.set(0, 2.0, 0.7);  // Higher and forward
        camera.lookAt(0, 1.7, -1);
      }
      
      // Simple capture process
      try {
        // Create a renderer with higher resolution for better image quality
        const captureWidth = 640;  // Increased from 512
        const captureHeight = 480;  // Adjusted for more natural aspect ratio
        
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
        renderer.shadowMap.enabled = true;  // Enable shadows for better image quality
        
        // Render scene using the character's camera
        renderer.render(scene, camera);
        
        // Get image as data URL with higher quality
        const dataURL = canvas.toDataURL('image/jpeg', 0.85);  // Increased quality
        
        // Mark as captured
        setViewCaptured(true);
        
        // Save the image locally
        // saveImageLocally(dataURL, characterId);
        
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
  }, [active, scene, onCapture, viewCaptured, characterId, characterBodyRef]);
  
  // Function to save the image locally
  const saveImageLocally = (dataURL, characterId) => {
    try {
      // Create a link element to download the image
      const link = document.createElement('a');
      link.href = dataURL;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `${characterId}-view-${timestamp}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show visual feedback
      const feedback = document.createElement('div');
      feedback.style.position = 'fixed';
      feedback.style.top = '20%';
      feedback.style.left = '50%';
      feedback.style.transform = 'translate(-50%, -50%)';
      feedback.style.background = 'rgba(0,0,0,0.7)';
      feedback.style.color = 'white';
      feedback.style.padding = '15px';
      feedback.style.borderRadius = '5px';
      feedback.style.zIndex = '1000';
      feedback.textContent = `Image saved: ${characterId}-view-${timestamp}.jpg`;
      document.body.appendChild(feedback);
      
      // Remove feedback after a few seconds
      setTimeout(() => {
        if (document.body.contains(feedback)) {
          document.body.removeChild(feedback);
        }
      }, 3000);
      
      console.log(`Image saved locally as ${characterId}-view-${timestamp}.jpg`);
    } catch (error) {
      console.error('Error saving image locally:', error);
    }
  };
  
  return null;
}