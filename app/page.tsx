"use client"
import { React, Suspense, useRef } from "react";
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
              position={[0, 5, 0]}
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