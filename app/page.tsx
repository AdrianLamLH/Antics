"use client"
import { React, Suspense } from "react";
// import ThreeScene from "../components/ThreeScene";
import Box from "../components/Box.tsx";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider, CapsuleCollider } from "@react-three/rapier";
import Floor from "../components/Floor";
import LightBulb from "../components/LightBulb";
import OrbitControls from "../components/OrbitControls";
import BaseMap from '../components/BaseMap'
import { Environment } from '@react-three/drei'
import Character from "../components/Character";




export default function Home() {
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
          <Physics debug>
            {/* --------- Character Setup -----------*/}
            <RigidBody   colliders={false} // Disable automatic colliders
              restitution={0}
              friction={0.7}
              linearDamping={0.5}
              angularDamping={100}
              position={[0, 5, 0]}> // Start higher up            
              <Suspense fallback={null}>
                  <Character position={[0,5,7]} />
              </Suspense>
              <CuboidCollider 
                args={[0.4, 0.9, 0.4]} // [halfWidth, halfHeight, halfDepth] - adjust to match your character dimensions
                position={[0, 5.9, 7]} // Position it at the center of the character
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
      {/* <ThreeScene/> */}
    </div>
  );
}