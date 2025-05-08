import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export default function BaseMap(props) {
  const { scene } = useGLTF('/minecraft.glb')
  return (
    <primitive
      object={scene}
      scale={[10,10,10]}
      {...props} />
  )
}

useGLTF.preload('/minecraft.glb')
