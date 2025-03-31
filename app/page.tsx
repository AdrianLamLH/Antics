"use client"
import { React, Suspense, useRef, useEffect } from "react";
import Box from "../components/Box.tsx";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider, CapsuleCollider } from "@react-three/rapier";
import LightBulb from "../components/LightBulb";
import OrbitControls from "../components/OrbitControls";
import BaseMap from '../components/BaseMap'
import { Environment } from '@react-three/drei'
import Character from "../components/Character";


export default function Home() {
  const characterBodyRef = useRef(null);
  const startPosition = [0, 5, 0]; // Store initial position for reset
  const fallThreshold = -20; // Reset character if Y position is below this value
  
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

  return (
    <div className="w-full h-screen">
      <Canvas
        shadows
        camera={{
          position: [-6, 7, 7],
        }}
      >
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
              lockRotations={true} // Important to keep character upright
              position={startPosition}
            >
              <Suspense fallback={null}>
                  <Character position={[0,0,0]} bodyRef={characterBodyRef} />
              </Suspense>
              <CuboidCollider 
                args={[0.4, 1.45, 0.4]} // [halfWidth, halfHeight, halfDepth] - adjust to match your character dimensions
                position={[0, 1.5, 0]}
              />
            </RigidBody>
          <OrbitControls />
          <RigidBody type="fixed" colliders={"trimesh"}>
            <BaseMap position={[0,-25,0]}/>
            {/* <Floor position={[0, -1, 0]} /> */}
          </RigidBody>
          </Physics>
          <Environment preset="sunset" background />
        </Suspense>
      </Canvas>
    </div>
  );
}