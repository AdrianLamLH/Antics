import React, { useRef, useEffect } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'

export default function Character(props) {
    const group = useRef(null)
    const { scene, animations } = useGLTF('/low_poly_boy.glb')
    const { actions, names } = useAnimations(animations, group)
    console.log("Available animations:", names)
  // Function to handle jump animation
  const handleJump = () => {
    // Stop any current animation
    Object.values(actions).forEach(action => action.stop())
    
    // Play jump animation
    if (actions.jump) {
      actions.jump.reset().play()
      
      // After jump animation completes, return to idle
      const duration = actions.jump.getClip().duration * 1000
      setTimeout(() => {
        actions.jump.stop()
        if (actions.idle) actions.idle.reset().fadeIn(0.3).play()
      }, duration)
    }
  }
  
  // Play idle animation by default
  useEffect(() => {
    if (actions.idle) {
      actions.idle.reset().fadeIn(0.5).play()
    }
  }, [actions])
  
  return (
    <group ref={group} position={props.position} onClick={(e) => {
      e.stopPropagation()
      handleJump()
    }}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/low_poly_boy.glb')