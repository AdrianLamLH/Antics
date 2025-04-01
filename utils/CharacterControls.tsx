export function createCharacterControls(characterBodyRef) {
    return {
      moveForward: (steps) => {
        if (!characterBodyRef.current) return;
        const impulse = { x: 0, y: 0, z: -steps };
        characterBodyRef.current.applyImpulse(impulse, true);
      },
      moveBackward: (steps) => {
        if (!characterBodyRef.current) return;
        const impulse = { x: 0, y: 0, z: steps };
        characterBodyRef.current.applyImpulse(impulse, true);
      },
      moveLeft: (steps) => {
        if (!characterBodyRef.current) return;
        const impulse = { x: -steps, y: 0, z: 0 };
        characterBodyRef.current.applyImpulse(impulse, true);
      },
      moveRight: (steps) => {
        if (!characterBodyRef.current) return;
        const impulse = { x: steps, y: 0, z: 0 };
        characterBodyRef.current.applyImpulse(impulse, true);
      },
      turn: (angle) => {
        if (!characterBodyRef.current) return;
        const currentRotation = characterBodyRef.current.rotation();
        const newRotation = { 
          x: currentRotation.x, 
          y: currentRotation.y + angle, 
          z: currentRotation.z, 
          w: currentRotation.w 
        };
        characterBodyRef.current.setRotation(newRotation, true);
      },
      jump: () => {
        if (!characterBodyRef.current) return;
        characterBodyRef.current.applyImpulse({ x: 0, y: 15, z: 0 }, true);
      }
    };
  }