"use client"
import { React, Suspense, useRef, useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { Environment, PerspectiveCamera } from '@react-three/drei'
import LightBulb from "../components/LightBulb";
import OrbitControls from "../components/OrbitControls";
import BaseMap from '../components/BaseMap'
import Character from "../components/Character";
import CharacterAI from "../components/CharacterAI";
import AIResponseDisplay from "../components/AIResponseDisplay";
import { ViewToggleButton, AIActionButton } from "../components/ActionButtons";

export default function Home() {
  const characterBodyRef = useRef(null);
  const startPosition = [0, 5, 0]; // Store initial position for reset
  const fallThreshold = -20; // Reset character if Y position is below this value
  const [isFirstPerson, setIsFirstPerson] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [capturingView, setCapturingView] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [triggerCapture, setTriggerCapture] = useState(() => () => {});
  const [toggleAutoMode, setToggleAutoMode] = useState(() => () => {});
  
  // Handle state changes from CharacterAI component
  const handleAIStateChange = useCallback((state) => {
    setAiResponse(state.aiResponse);
    setCapturingView(state.capturingView);
    setExecuting(state.executing);
    setAutoMode(state.autoMode || false);
    setTriggerCapture(() => state.triggerCapture);
    if (state.toggleAutoMode) {
      setToggleAutoMode(() => state.toggleAutoMode);
    }
  }, []);
  
  // Check if character is out of bounds
  useEffect(() => {
    const checkPosition = setInterval(() => {
      if (characterBodyRef.current) {
        const pos = characterBodyRef.current.translation();
        
        // If character falls below threshold, reset position
        if (pos.y < fallThreshold) {
          characterBodyRef.current.setTranslation({ 
            x: startPosition[0], 
            y: startPosition[1], 
            z: startPosition[2] 
          });
          
          // Reset velocity to prevent falling momentum
          characterBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 });
          characterBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 });
        }
      }
    }, 100); // Check every 100ms
    
    return () => clearInterval(checkPosition);
  }, []);

  // Toggle between first and third person views
  useEffect(() => {
    const handleKeyPress = (e) => {
      console.log("Key pressed:", e.key);
      
      if (e.key === 'v' || e.key === 'V') {
        console.log("View toggle requested");
        setIsFirstPerson(prev => !prev);
      }
      else if ((e.key === 'c' || e.key === 'C')) {
        console.log("Manual AI capture requested via key");
        if (!capturingView && !executing) {
          triggerCapture();
        } else {
          console.warn("Already capturing or executing, ignoring request");
        }
      }
      else if ((e.key === 'p' || e.key === 'P')) {
        console.log("Auto mode toggle requested via key");
        toggleAutoMode();
      }
    };
  
    // Use keydown for immediate response
    window.addEventListener('keydown', handleKeyPress);
    console.log("Key event listeners attached");
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      console.log("Key event listeners removed");
    };
  }, [capturingView, executing, triggerCapture, toggleAutoMode]);

  return (
    <div className="w-full h-screen">
      {/* UI Components */}
      <ViewToggleButton 
        isFirstPerson={isFirstPerson}
        toggleView={() => setIsFirstPerson(prev => !prev)}
      />
      
      {/* // Update the UI components section to allow buttons in third-person view */}
      <div className="absolute top-16 right-4 z-10 flex flex-col gap-2">
        <AIActionButton 
          isFirstPerson={true} // Always show this button by passing true
          capturingView={capturingView}
          executing={executing}
          triggerCapture={triggerCapture}
        />
        
        <button 
          className={`px-4 py-2 rounded-md ${
            autoMode 
              ? "bg-green-600 hover:bg-green-700" 
              : "bg-black bg-opacity-70 hover:bg-opacity-80"
          } text-white`}
          onClick={toggleAutoMode}
        >
          {autoMode ? "Auto Mode: ON" : "Auto Mode: OFF"}
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 z-10 bg-black bg-opacity-70 text-white p-3 rounded-md max-w-xs">
        <h3 className="font-bold mb-1">Controls</h3>
        <p className="text-sm">Press <span className="font-mono bg-gray-700 px-1 rounded">V</span> to toggle view</p>
        <p className="text-sm">Press <span className="font-mono bg-gray-700 px-1 rounded">C</span> for single action</p>
        <p className="text-sm">Press <span className="font-mono bg-gray-700 px-1 rounded">P</span> to toggle auto mode</p>
      </div>
      
      <AIResponseDisplay aiResponse={aiResponse} />
      
      <Canvas shadows>
        {/* Default third-person camera */}
        {!isFirstPerson && (
          <PerspectiveCamera
            makeDefault
            position={[-6, 7, 7]}
            fov={75}
          />
        )}
        
        <ambientLight color={"white"} intensity={0.3} />
        <LightBulb position={[0, 3, 0]} />
        <Suspense>
          <Physics debug gravity={[0, -20, 0]}>
            {/* --------- Character Setup -----------*/}
            <RigidBody
              ref={characterBodyRef}
              colliders={false}
              restitution={0}
              friction={0.5}
              linearDamping={0.5}
              angularDamping={100}
              lockRotations={true}
              position={startPosition}
            >
              <CharacterAI 
                characterBodyRef={characterBodyRef}
                isFirstPerson={isFirstPerson}
                onStateChange={handleAIStateChange}
              >
                {/* First-person camera */}
                {isFirstPerson && (
                  <PerspectiveCamera
                    makeDefault
                    position={[0.5, 3, 0]}
                    rotation={[0, Math.PI, 0]}
                    fov={100}
                  />
                )}
              </CharacterAI>
              
              <Suspense fallback={null}>
                <Character position={[0,0,0]} bodyRef={characterBodyRef} />
              </Suspense>
              <CuboidCollider 
                args={[0.4, 1.45, 0.4]}
                position={[0, 1.5, 0]}
              />
            </RigidBody>
            
            {/* Only show OrbitControls in third-person view */}
            {!isFirstPerson && <OrbitControls />}
            
            <RigidBody type="fixed" colliders={"trimesh"}>
              <BaseMap position={[0,-25,0]}/>
            </RigidBody>
          </Physics>
          <Environment preset="sunset" background />
        </Suspense>
      </Canvas>
    </div>
  );
}