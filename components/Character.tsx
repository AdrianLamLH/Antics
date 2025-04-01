import React, { useRef, useEffect, useState } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function Character({ bodyRef, currentAnimation = 'idle', ...props }) {
    const group = useRef(null)
    const { scene, animations } = useGLTF('/midoriya.glb')
    const { actions, names } = useAnimations(animations, group)
    const [activeAnimation, setActiveAnimation] = useState('idle')
    const { camera } = useThree()
    
    // Animation controls
    const controls = useRef({
        key: [0, 0, 0], // [forward/back, left/right, run]
        current: 'idle',
        velocity: 1, // Base velocity
        direction: new THREE.Vector3(), // Movement direction
        jumping: false
    }).current

    // Watch for animation changes from props
    useEffect(() => {
        if (currentAnimation && currentAnimation !== activeAnimation) {
            playAnimation(currentAnimation);
        }
    }, [currentAnimation, activeAnimation]);
    
    
    // Handle movement in every frame
    useFrame(() => {
        if (!bodyRef.current) return
        
        // If any movement keys are pressed
        if (controls.key[0] !== 0 || controls.key[1] !== 0) {
            // Calculate movement speed (faster when running)
            const speed = controls.key[2] ? controls.velocity * 2 : controls.velocity
            
            // Calculate movement direction vector
            controls.direction.set(controls.key[1], 0, controls.key[0])
            controls.direction.normalize().multiplyScalar(speed)
            
            // Apply movement impulse to RigidBody
            bodyRef.current.applyImpulse({
                x: controls.direction.x,
                y: 0,
                z: controls.direction.z
            }, true)
            
            // Rotate character to face movement direction
            if (controls.direction.length() > 0) {
                const angle = Math.atan2(controls.direction.x, controls.direction.z)
                const currentRotation = new THREE.Quaternion()
                currentRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)
                bodyRef.current.setRotation(currentRotation, true)
            }
        }
    })
    
    // Set up keyboard controls
    // useEffect(() => {
    //     const onKeyDown = (event) => {
    //         const key = controls.key
    //         switch (event.code) {
    //             case 'ArrowUp': case 'KeyW': case 'KeyZ': key[0] = -1; break
    //             case 'ArrowDown': case 'KeyS': key[0] = 1; break
    //             case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[1] = -1; break
    //             case 'ArrowRight': case 'KeyD': key[1] = 1; break
    //             case 'ShiftLeft': case 'ShiftRight': key[2] = 1; break
    //             case 'Space': 
    //                 if (!controls.jumping) handleJump(); 
    //                 break
    //         }
    //         updateCurrentAnimation()
    //     }
        
    //     const onKeyUp = (event) => {
    //         const key = controls.key
    //         switch (event.code) {
    //             case 'ArrowUp': case 'KeyW': case 'KeyZ': key[0] = key[0]<0 ? 0:key[0]; break
    //             case 'ArrowDown': case 'KeyS': key[0] = key[0]>0 ? 0:key[0]; break
    //             case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[1] = key[1]<0 ? 0:key[1]; break
    //             case 'ArrowRight': case 'KeyD': key[1] = key[1]>0 ? 0:key[1]; break
    //             case 'ShiftLeft': case 'ShiftRight': key[2] = 0; break
    //         }
    //         updateCurrentAnimation()
    //     }
        
    //     const updateCurrentAnimation = () => {
    //         const key = controls.key
    //         const active = key[0] !== 0 || key[1] !== 0
    //         const newAnim = active ? (key[2] ? 'run' : 'walk') : 'idle'
            
    //         if (controls.current !== newAnim && !controls.jumping) {
    //             controls.current = newAnim
    //             playAnimation(newAnim)
    //         }
    //     }
        
    //     document.addEventListener('keydown', onKeyDown)
    //     document.addEventListener('keyup', onKeyUp)
        
    //     return () => {
    //         document.removeEventListener('keydown', onKeyDown)
    //         document.removeEventListener('keyup', onKeyUp)
    //     }
    // }, [actions, names])
    
    // Function to play a specific animation
    const playAnimation = (animName) => {
        console.log(`Playing animation: ${animName}`);
        let action = actions[animName]
        
        if (!action && names.length > 0) {
            // Find animation by partial match
            const match = names.find(name => 
                name.toLowerCase().includes(animName.toLowerCase())
            ) || names[0]
            
            action = actions[match]
        }
        
        if (action) {
            Object.values(actions).forEach(a => a.fadeOut(0.5))
            action.reset().fadeIn(0.5).play()
            setActiveAnimation(animName)
        } else {
            console.warn(`Animation not found: ${animName}. Available animations:`, names);
        }
    }
    
    // Function to handle jump animation and physical jump
    const handleJump = () => {
        if (!bodyRef.current || controls.jumping) return
        
        // Find jump animation
        const jumpAnim = names.find(name => name.toLowerCase().includes('jump'))
        
        if (jumpAnim) {
            // Set jumping flag
            controls.jumping = true
            
            // Play jump animation
            playAnimation(jumpAnim)
            
            // Apply vertical impulse for physical jump
            bodyRef.current.applyImpulse({ x: 0, y: 15, z: 0 }, true)
            
            // Reset jumping state after animation
            const duration = actions[jumpAnim].getClip().duration * 1000
            setTimeout(() => {
                controls.jumping = false
                playAnimation(controls.current)
            }, duration)
        }
    }
    
    // Play idle animation by default
    useEffect(() => {
        if (names.length > 0) {
            const idleAnim = names.find(name => name.toLowerCase().includes('idle')) || names[0]
            playAnimation(idleAnim)
        }
        
        // Log available animations for debugging
        console.log("Available animations:", names);
    }, [actions, names]);
    
    return (
        <group ref={group} position={props.position} onClick={(e) => {
            e.stopPropagation()
            handleJump()
        }}>
            <primitive object={scene} />
        </group>
    )
}

useGLTF.preload('/midoriya.glb')