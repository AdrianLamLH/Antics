import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useThree } from '@react-three/fiber';

export default function ScreenshotCapture({ characterId, viewMode, triggerMode }) {
  const { gl, scene, camera } = useThree();
  const lastCaptureTimeRef = useRef(0);
  const lastTriggerRef = useRef(null);
  
  const captureScreenshot = useCallback(() => {
    console.log(`Attempting to capture screenshot for ${characterId}...`);
    
    if (!gl || !scene || !camera) {
      console.error('Missing required Three.js components for screenshot');
      return;
    }
    
    // Don't capture too frequently (limit to once per second)
    const now = Date.now();
    if (now - lastCaptureTimeRef.current < 1000) {
      console.log('Screenshot throttled (too frequent)');
      return;
    }
    lastCaptureTimeRef.current = now;
    
    // Make sure we're in the correct view mode for this character
    const isCorrectViewMode = 
      (characterId === 'character1' && viewMode === 'firstPerson1') ||
      (characterId === 'character2' && viewMode === 'firstPerson2');
    
    if (!isCorrectViewMode) {
      console.warn(`Wrong view mode for ${characterId}: ${viewMode}`);
      alert(`Please switch to ${characterId} view before capturing`);
      return;
    }
    
    try {
      // Force a render of the current frame
      gl.render(scene, camera);
      
      // Convert to data URL
      const dataURL = gl.domElement.toDataURL('image/png');
      
      // Create a link element to download the image
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `${characterId}-pov-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`Screenshot captured for ${characterId}`);
      
      // Show visual feedback
      const feedback = document.createElement('div');
      feedback.style.position = 'fixed';
      feedback.style.top = '50%';
      feedback.style.left = '50%';
      feedback.style.transform = 'translate(-50%, -50%)';
      feedback.style.background = 'rgba(0,0,0,0.7)';
      feedback.style.color = 'white';
      feedback.style.padding = '15px';
      feedback.style.borderRadius = '5px';
      feedback.style.zIndex = '1000';
      feedback.textContent = `Screenshot saved: ${characterId}-pov.png`;
      document.body.appendChild(feedback);
      
      setTimeout(() => {
        document.body.removeChild(feedback);
      }, 2000);
      
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert(`Error capturing screenshot: ${error.message}`);
    }
  }, [gl, scene, camera, characterId, viewMode]);
  
  // Set up key event listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Capture with F2 key for Character 1, F3 key for Character 2
      if ((characterId === 'character1' && e.key === 'F2') || 
          (characterId === 'character2' && e.key === 'F3')) {
        console.log(`Key pressed for ${characterId} screenshot`);
        captureScreenshot();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [characterId, captureScreenshot]);
  
  // Trigger on manual request from button
  useEffect(() => {
    // Only trigger if triggerMode value has changed
    if (triggerMode !== null && triggerMode !== lastTriggerRef.current) {
      console.log(`Screenshot button pressed for ${characterId}`);
      lastTriggerRef.current = triggerMode;
      captureScreenshot();
    }
  }, [triggerMode, captureScreenshot]);
  
  // This component doesn't render anything visible
  return null;
}