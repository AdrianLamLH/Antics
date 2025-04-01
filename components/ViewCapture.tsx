import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

export default function ViewCapture({ onCapture, active }) {
  const { gl, scene, camera } = useThree();
  
  // Capture the current view when triggered
  useEffect(() => {
    if (active) {
      console.log("ViewCapture activated, preparing to capture");
      // Wait a frame to ensure camera position is updated
      const timeoutId = setTimeout(() => {
        try {
          // Render and capture the current view
          gl.render(scene, camera);
          const dataURL = gl.domElement.toDataURL('image/jpeg', 0.7); // Adding quality parameter
          console.log("Image captured, size:", dataURL.length);
          onCapture(dataURL);
        } catch (error) {
          console.error("Error capturing view:", error);
          onCapture(null); // Signal failure
        }
      }, 150); // Give more time for the scene to stabilize
      
      return () => clearTimeout(timeoutId);
    }
  }, [active, gl, scene, camera, onCapture]);
  
  return null;
}