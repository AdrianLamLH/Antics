import React, { useCallback, useState, useEffect, useRef } from 'react';
import ViewCapture from './ViewCapture';
import { requestAIActions } from '../utils/aiService';
import * as THREE from 'three'; // Add this import


export default function CharacterAI({ 
  characterBodyRef, 
  isFirstPerson,
  onStateChange,
  sharedConversation = [],
  characterId = "character1",
  characterConfig = {}, // Add this prop
  isMyTurn = true, // Add this prop
  children
}) {
  const [capturingView, setCapturingView] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const actionsTimeoutRef = useRef(null);
  const continuousModeRef = useRef(null);

  const [currentUserMessage, setCurrentUserMessage] = useState("");

  // Add a new state for the current animation
  const [currentAnimation, setCurrentAnimation] = useState('idle');
  

  // Create character controls
  const controls = useCallback(() => {
    // Add this function to check boundaries
    const calculateForwardVector = (rotation) => {
      const quaternion = new THREE.Quaternion(
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w
      );
      
      // Forward vector - FLIPPED from negative Z to positive Z
      const forwardVec = new THREE.Vector3(0, 0, 1); // Changed from -1 to 1
      forwardVec.applyQuaternion(quaternion);
      forwardVec.normalize();
      
      return forwardVec;
    };
    
    // Define the missing checkBoundaries function
    const checkBoundaries = (position, impulse) => {
      // Simply return the original impulse for now - remove boundary checks
      return impulse;
    };


    return {
      // For moveForward:
      moveForward: (steps) => {
        if (!characterBodyRef.current) return;
        console.log(`Moving forward ${steps} steps`);
        
        // Calculate forward vector based on current rotation
        const currentRotation = characterBodyRef.current.rotation();
        const forwardVec = calculateForwardVector(currentRotation);
        
        // Scale steps to make movement more dramatic
        const impulseStrength = Math.min(steps * 3, 50); // Prevent extreme values
        
        // Create impulse vector
        let impulse = { 
          x: forwardVec.x * impulseStrength,
          y: 0,
          z: forwardVec.z * impulseStrength 
        };
        
        // Check boundaries before applying impulse
        const currentPosition = characterBodyRef.current.translation();
        impulse = checkBoundaries(currentPosition, impulse);
        
        // Only apply impulse if not zero
        if (impulse.x !== 0 || impulse.z !== 0) {
          characterBodyRef.current.applyImpulse(impulse, true);
        }
        
        return new Promise(resolve => setTimeout(resolve, 600));
      },
      moveBackward: (steps) => {
        if (!characterBodyRef.current) return;
        console.log(`Moving backward ${steps} steps`);
        
        const currentRotation = characterBodyRef.current.rotation();
        const quaternion = new THREE.Quaternion(
          currentRotation.x,
          currentRotation.y,
          currentRotation.z,
          currentRotation.w
        );
        
        // UPDATED: invert the backward vector as well
        const backwardVec = new THREE.Vector3(0, 0, -1); // Changed from 1 to -1
        backwardVec.applyQuaternion(quaternion);
        backwardVec.normalize();
        
        const maxSingleImpulse = 10;
        const impulseStrength = Math.min(steps, maxSingleImpulse) * 3;
        
        const impulse = { 
          x: backwardVec.x * impulseStrength,
          y: 0,
          z: backwardVec.z * impulseStrength 
        };
        
        console.log(`Applying backward impulse: x=${impulse.x}, z=${impulse.z}`);
        characterBodyRef.current.applyImpulse(impulse, true);
        
        return new Promise(resolve => setTimeout(resolve, 600));
      },
      moveLeft: (steps) => {
        if (!characterBodyRef.current) return;
        console.log(`Moving left ${steps} steps`);
        
        const currentRotation = characterBodyRef.current.rotation();
        const quaternion = new THREE.Quaternion(
          currentRotation.x,
          currentRotation.y,
          currentRotation.z,
          currentRotation.w
        );
        
        const leftVec = new THREE.Vector3(-1, 0, 0);
        leftVec.applyQuaternion(quaternion);
        leftVec.normalize();
        
        // Increase impulse strength
        const maxSingleImpulse = 10;
        const impulseStrength = Math.min(steps, maxSingleImpulse) * 3;
        
        const impulse = { 
          x: leftVec.x * impulseStrength,
          y: 0,
          z: leftVec.z * impulseStrength 
        };
        
        characterBodyRef.current.applyImpulse(impulse, true);
        
        return new Promise(resolve => setTimeout(resolve, 600));
      },
      moveRight: (steps) => {
        if (!characterBodyRef.current) return;
        console.log(`Moving right ${steps} steps`);
        
        const currentRotation = characterBodyRef.current.rotation();
        const quaternion = new THREE.Quaternion(
          currentRotation.x,
          currentRotation.y,
          currentRotation.z,
          currentRotation.w
        );
        
        const rightVec = new THREE.Vector3(1, 0, 0);
        rightVec.applyQuaternion(quaternion);
        rightVec.normalize();
        
        // Increase impulse strength
        const maxSingleImpulse = 10;
        const impulseStrength = Math.min(steps, maxSingleImpulse) * 3;
        
        const impulse = { 
          x: rightVec.x * impulseStrength,
          y: 0,
          z: rightVec.z * impulseStrength 
        };
        
        characterBodyRef.current.applyImpulse(impulse, true);
        
        return new Promise(resolve => setTimeout(resolve, 600));
      },
      turn: (angle) => {
        if (!characterBodyRef.current) return;
        console.log(`Turning ${angle} radians (relative turn)`);
        
        // Get current rotation as a quaternion
        const currentRotation = characterBodyRef.current.rotation();
        const currentQuat = new THREE.Quaternion(
          currentRotation.x, 
          currentRotation.y, 
          currentRotation.z, 
          currentRotation.w
        );
        
        // Create a quaternion for the relative rotation around Y axis
        const turnQuat = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), 
          angle
        );
        
        // Apply the relative rotation by multiplying quaternions
        // This properly combines rotations in 3D space
        currentQuat.multiply(turnQuat);
        
        // Apply the new combined rotation
              characterBodyRef.current.setRotation({
          x: currentQuat.x,
          y: currentQuat.y,
          z: currentQuat.z,
          w: currentQuat.w
              }, true);
              
        // Return a promise that resolves after a delay to ensure the turn completes
        return new Promise(resolve => setTimeout(resolve, 400));
      },
      jump: (height = 10) => { // Reduced default height
        if (!characterBodyRef.current) return;
        console.log("Jumping with height", height);
        
        // More controlled jump with reduced height
        const actualHeight = Math.max(height, 10); // Reduced minimum height
        
        // Apply a more controlled jump impulse
        const impulse = { 
          x: 0,  // No horizontal momentum
          y: actualHeight * 0.8,  // Reduced height
          z: 0   // No horizontal momentum
        };
        
        characterBodyRef.current.applyImpulse(impulse, true);
        
        return Promise.resolve();
      },
      wait: (duration) => {
        console.log(`Waiting for ${duration}ms`);
        
        // Keep the wait duration as is, or even increase it for slower overall movement
        return new Promise(resolve => setTimeout(resolve, duration));
      }
    };
  }, [characterBodyRef]);

  const optimizeActionSequence = useCallback((actions) => {
    if (!actions || actions.length === 0) return [];
    
    const optimized = [...actions];
    
    // Enhance all movement actions to be faster and more dramatic
    for (let i = 0; i < optimized.length; i++) {
      // Make all movements more dramatic
      if (optimized[i].type.includes('move')) {
        // Increase movement values by 50-100%
        optimized[i].value = optimized[i].value * 2;
      }
      
      // Make turns more dramatic
      if (optimized[i].type === 'turn') {
        // Increase turn angle by 30% for more drama
        optimized[i].value = optimized[i].value * 1.3;
      }
      
      // Enhance jumps
      if (optimized[i].type === 'jump') {
        // Higher jumps
        optimized[i].value = Math.max(optimized[i].value * 1.5, 25);
      }
      
      // Shorten delays for faster actions
      if (optimized[i].delay) {
        // Reduce delays by 30% for snappier movements
        optimized[i].delay = Math.floor(optimized[i].delay * 0.7);
      }
    }
    
    return optimized;
  }, []);
  
  // Schedule the next capture after current actions complete
  const scheduleNextCapture = useCallback(() => {
    if (!autoMode) {
      console.log("Auto mode is off, not scheduling next capture");
      return;
    }
    
    console.log("Scheduling next capture in 5 seconds (auto mode)");
    
    // Clear any existing timeout
    if (continuousModeRef.current) {
      clearTimeout(continuousModeRef.current);
      continuousModeRef.current = null;
    }
    
    // Set a new timeout
    continuousModeRef.current = setTimeout(() => {
      console.log("Auto mode timeout fired, checking status");
      if (!capturingView && !executing) {
        console.log("Auto mode triggering next capture");
        setCapturingView(true);
      } else {
        console.log("System busy, trying again in 1 second");
        // Try again in 1 second
        setTimeout(() => {
          console.log("Retry timeout fired");
          scheduleNextCapture(); // This will try again
        }, 1000);
      }
    }, 5000);
    
    console.log("Next capture scheduled with ID:", continuousModeRef.current);
  }, [autoMode, capturingView, executing]);


  const [autoModeInterval, setAutoModeInterval] = useState(null);

  const [actionCounter, setActionCounter] = useState(0);
const [actionThreshold, setActionThreshold] = useState(5); // Call LLM every 5-6 actions

// Define preset generic actions for when we don't call the LLM
const genericActions = useCallback(() => {
  // Create an array of preset action sequences
  const actions = [
    // Walking around sequence
    [
      { type: 'moveForward', value: 10, delay: 1200 },
      { type: 'turn', value: 0.5, delay: 800 },
      { type: 'moveForward', value: 8, delay: 1000 },
      { type: 'wait', value: 500, delay: 500 },
      { type: 'turn', value: -0.3, delay: 600 },
      { type: 'moveForward', value: 6, delay: 900 },
    ],
    // Look around sequence
    [
      { type: 'turn', value: 0.7, delay: 800 },
      { type: 'wait', value: 800, delay: 800 },
      { type: 'turn', value: -0.4, delay: 600 },
      { type: 'wait', value: 500, delay: 500 },
      { type: 'turn', value: -0.5, delay: 700 },
      { type: 'wait', value: 600, delay: 600 },
    ],
    // Jump and move sequence
    [
      { type: 'jump', value: 18, delay: 1000 },
      { type: 'moveForward', value: 8, delay: 800 },
      { type: 'turn', value: 0.3, delay: 500 },
      { type: 'moveForward', value: 6, delay: 700 },
    ],
    // Idle and look sequence
    [
      { type: 'wait', value: 1000, delay: 1000 },
      { type: 'turn', value: 0.4, delay: 600 },
      { type: 'wait', value: 800, delay: 800 },
      { type: 'turn', value: -0.6, delay: 700 },
      { type: 'wait', value: 600, delay: 600 },
    ],
    // Explore sequence
    [
      { type: 'moveForward', value: 7, delay: 900 },
      { type: 'moveLeft', value: 5, delay: 700 },
      { type: 'turn', value: -0.3, delay: 500 },
      { type: 'moveForward', value: 9, delay: 1100 },
      { type: 'turn', value: 0.5, delay: 700 },
    ],
  ];
  
  // Return a random action sequence
  return actions[Math.floor(Math.random() * actions.length)];
}, []);

// Modify toggleAutoMode to randomize the threshold
  const toggleAutoMode = useCallback(() => {
  console.log("Toggle auto mode called");
  
  setAutoMode(prevAutoMode => {
    const newAutoMode = !prevAutoMode;
    console.log("Auto mode changing to:", newAutoMode);
    
    // Clear any existing timers regardless of state change
    if (autoModeInterval) {
      console.log("Clearing existing interval:", autoModeInterval);
      clearInterval(autoModeInterval);
      setAutoModeInterval(null);
    }
    
        if (continuousModeRef.current) {
      console.log("Clearing existing timeout:", continuousModeRef.current);
          clearTimeout(continuousModeRef.current);
      continuousModeRef.current = null;
    }
    
    // If turning on auto mode, set up a new interval
    if (newAutoMode) {
      console.log("Setting up new auto mode interval");
      
      // Reset action counter
      setActionCounter(0);
      
      // Randomize the threshold (5-6 actions)
      setActionThreshold(Math.floor(5 + Math.random() * 2));
      
      // Trigger first capture immediately if not busy
      if (!capturingView && !executing) {
        console.log("Triggering initial capture");
        setCapturingView(true);
      }
      
      // Use an interval to check every second if we can trigger a new action
      const interval = setInterval(() => {
        console.log("Auto mode interval check - capturing:", capturingView, "executing:", executing);
        
        if (!capturingView && !executing) {
          // Increment the action counter
          setActionCounter(prevCounter => {
            const newCounter = prevCounter + 1;
            console.log(`Action counter: ${newCounter}/${actionThreshold}`);
            
            // If we've reached the threshold, trigger LLM
            if (newCounter >= actionThreshold) {
              console.log("Counter reached threshold, triggering LLM capture");
              setCapturingView(true);
              
              // Reset counter and randomize next threshold
              return 0;
            } else {
              // Otherwise execute generic actions
              console.log("Using generic actions");
              executeGenericActions();
              return newCounter;
            }
          });
        } else {
          console.log("System busy, skipping this interval check");
        }
      }, 8000); // Check every 8 seconds
      
      setAutoModeInterval(interval);
      console.log("Auto mode interval set:", interval);
    }
    
    return newAutoMode;
  });
}, [capturingView, executing]);

  useEffect(() => {
    return () => {
      // Clean up interval on component unmount
      if (autoModeInterval) {
        console.log("Component unmounting, clearing interval");
        clearInterval(autoModeInterval);
      }
    };
  }, [autoModeInterval]);

  // Define the startContinuousMode function
  const startContinuousMode = useCallback(() => {
    console.log("Starting continuous mode");
    if (continuousModeRef.current) {
      clearTimeout(continuousModeRef.current);
    }
    
    // Trigger the first capture immediately if not already busy
    if (!capturingView && !executing) {
      console.log("Triggering initial auto-mode capture");
      setCapturingView(true);
    } else {
      // If busy, schedule for later
      console.log("System busy, scheduling first auto-mode capture");
      continuousModeRef.current = setTimeout(() => {
        if (!capturingView && !executing) {
          setCapturingView(true);
        } else {
          scheduleNextCapture();
        }
      }, 1000);
    }
  }, [capturingView, executing, scheduleNextCapture]);

const stopContinuousMode = useCallback(() => {
    console.log("Stopping continuous mode");
    if (continuousModeRef.current) {
      clearTimeout(continuousModeRef.current);
      continuousModeRef.current = null;
    }
  }, []);
  
  // Modify the triggerViewCapture to accept an optional user message
  const triggerViewCapture = useCallback((userMessage = "") => {
    if (capturingView || executing) {
      console.warn(`${characterId}: Already capturing view or executing actions`);
      return;
    }
    
    // Log the character state and turn information
    console.log(`${characterId} triggered with message: "${userMessage}"`, {
      isMyTurn,
      characterId,
      autoConversation: userMessage === "Let's continue our conversation"
    });
    
    // Proceed with capture
    setCurrentUserMessage(userMessage);
    setCapturingView(true);
  }, [capturingView, executing, characterId, isMyTurn]);
  
  
  const executeAIActions = useCallback(async (actions) => {
    console.log("Executing actions:", actions);
    
    // Set executing state
    setExecuting(true);
    
    // Process actions sequentially with optimizations for dramatic movement
    const characterControls = controls();
    let totalExecutionTime = 0;
    
    // Optimize the action sequence for dramatic movement
    const optimizedActions = optimizeActionSequence(actions);
    console.log("Optimized actions for dramatic movement:", optimizedActions);
    
    // Scale delay times to make movements snappier
    optimizedActions.forEach(action => {
      // Reduce delays by 50% for much more responsive, dramatic movement
      action.delay = Math.floor(action.delay * 0.5);
    });
    
    // Store the original rotation for consistent movement
    let originalRotation = null;
    if (optimizedActions.some(a => a.type.includes('move')) && characterBodyRef.current) {
      originalRotation = characterBodyRef.current.rotation();
    }
    
    try {
      // Execute the optimized actions
      for (const action of optimizedActions) {
        // For movement actions, ensure we're still facing the original direction
        if (action.type.includes('move') && originalRotation && characterBodyRef.current) {
          // Reset to original rotation before each movement to maintain straight line
          characterBodyRef.current.setRotation(originalRotation, true);
        }
        
        // Set animation based on action type
        if (action.type === 'moveForward' || action.type === 'moveBackward' || 
            action.type === 'moveLeft' || action.type === 'moveRight') {
          setCurrentAnimation(action.value > 8 ? 'run' : 'walk');
        } else if (action.type === 'jump') {
          setCurrentAnimation('jump');
        } else if (action.type === 'wait') {
          setCurrentAnimation('idle');
        }
        
        // Execute the action
        await new Promise(resolve => {
          actionsTimeoutRef.current = setTimeout(async () => {
            const { type, value, delay } = action;
            console.log(`Executing dramatic action: ${type}(${value})`);
            
            if (characterControls[type]) {
              await characterControls[type](value);
            } else {
              console.warn(`Unknown action type: ${type}`);
            }
            
            totalExecutionTime += delay || 300;
            resolve();
          }, action.delay || 300);
        });
        
        // Wait a bit after jumping before changing animation
        if (action.type === 'jump') {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } finally {
      // Reset animation to idle when done
      setCurrentAnimation('idle');
      setExecuting(false);
      console.log(`Completed dramatic action sequence in ${totalExecutionTime}ms`);
    }
  }, [controls, optimizeActionSequence]);

  // Add a function to execute generic actions
  const executeGenericActions = useCallback(async () => {
    console.log("Executing generic action sequence");
    setExecuting(true);
    
    try {
      // Get a random generic action sequence
      const actions = genericActions();
      console.log("Selected generic actions:", actions);
      
      // Execute the generic actions
      await executeAIActions(actions);
      
    } catch (error) {
      console.error("Error executing generic actions:", error);
    } finally {
      setExecuting(false);
    }
  }, [executeAIActions, genericActions]);

  // Add state to keep track of message history
  const [messageHistory, setMessageHistory] = useState([]);
  const maxHistoryLength = 3; // Keep last 3 interactions for context

  // Modify the handleCapturedView function to include message history
  const handleCapturedView = useCallback(async (imageData) => {
    console.log(`${characterId} view captured, processing...`);
    setCapturingView(false);
    
    try {
      // Prepare control methods array for AI
      const controlMethods = Object.keys(controls());
      
      console.log(`${characterId} setting executing to true`);
      setExecuting(true);
      
      // Create context summary from shared conversation
      let contextSummary = "";
      if (sharedConversation.length > 0) {
        contextSummary = "Recent conversation:\n";
        // Get the last 5 messages for context
        const recentMessages = sharedConversation.slice(-5);
        recentMessages.forEach(msg => {
          if (msg.sender === 'user') {
            contextSummary += `User to ${msg.target || 'everyone'}: "${msg.text}"\n`;
          } else if (msg.sender === characterId) {
            contextSummary += `You said: "${msg.text}"\n`;
          } else {
            contextSummary += `Other character said: "${msg.text}"\n`;
          }
        });
      }
      
      console.log("Context summary for API call:", contextSummary);
      
      // Add character configuration to the AI request
      const aiResult = await requestAIActions(
        imageData,
        controlMethods,
        currentUserMessage,
        contextSummary,
        characterId,
        characterConfig // Pass the config to the AI
      );
        
      console.log("Received AI response:", aiResult);
      
      // Set the AI response ONCE, before executing any actions
      setAiResponse(aiResult);
      
      // Update message history with new interaction
      setMessageHistory(prev => {
        // Create new history item
        const newItem = {
          userMessage: currentUserMessage,
          aiResponse: {
            thought: aiResult.thought,
            speech: aiResult.speech
          },
          actions: aiResult.actions
        };
        
        // Add to history and limit length
        const updatedHistory = [...prev, newItem].slice(-maxHistoryLength);
        return updatedHistory;
      });
        
      // Execute AI actions if any
      if (aiResult.actions && aiResult.actions.length > 0) {
        await executeAIActions(aiResult.actions);
      } else {
        console.warn("No actions received from AI");
      }
      
      // Clear the current user message after processing
      setCurrentUserMessage("");
      
    } catch (error) {
      console.error("Error handling captured view:", error);
      setExecuting(false);
      setCurrentUserMessage("");
    } finally {
      // Always set executing to false when done
      console.log("Setting executing to false in finally block");
      setExecuting(false);
      
      // Schedule next capture if auto mode is on
      if (autoMode) {
        console.log("Auto mode is on, scheduling next capture");
        // Small delay to ensure state is updated properly
        setTimeout(() => {
          scheduleNextCapture();
        }, 100);
      } else {
        console.log("Auto mode is off, not scheduling next capture");
      }
    }
  }, [
    controls, scheduleNextCapture, autoMode, 
    currentUserMessage, executeAIActions, 
    sharedConversation, characterId, characterConfig
  ]);


  // Notify parent component of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        aiResponse,
        capturingView,
        executing,
        autoMode,
        currentAnimation, // Include the animation state
        toggleAutoMode,
        triggerCapture: (userMessage = "") => {
          if (!capturingView && !executing) {
            console.log("triggerCapture called from parent");
            setCurrentUserMessage(userMessage);
            setCapturingView(true);
          }
        }
      });
    }
  }, [aiResponse, capturingView, executing, autoMode, currentAnimation, onStateChange, toggleAutoMode]);
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (actionsTimeoutRef.current) {
        clearTimeout(actionsTimeoutRef.current);
      }
      if (continuousModeRef.current) {
        clearTimeout(continuousModeRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // When auto mode is turned on, ensure there's an active timeout
    if (autoMode && !executing && !capturingView) {
      console.log("Auto mode monitoring: Ensuring continuous loop is active");
      
      // Only schedule if we don't already have an active timeout
      if (!continuousModeRef.current) {
        console.log("No active auto mode timeout found, scheduling a new one");
        scheduleNextCapture();
      } else {
        console.log("Auto mode timeout already active:", continuousModeRef.current);
      }
    }
    
    // Clean up when auto mode is turned off
    if (!autoMode && continuousModeRef.current) {
      console.log("Auto mode turned off, clearing timeout");
      clearTimeout(continuousModeRef.current);
      continuousModeRef.current = null;
    }
    
    // When component unmounts or dependencies change
    return () => {
      if (continuousModeRef.current) {
        console.log("Cleaning up auto mode timeout");
        clearTimeout(continuousModeRef.current);
        continuousModeRef.current = null;
      }
    };
  }, [autoMode, executing, capturingView, scheduleNextCapture]);

  // Specifically monitor auto mode changes
  useEffect(() => {
    console.log("Auto mode state changed to:", autoMode);
    
    // When auto mode is turned on, start the cycle if it hasn't started yet
    if (autoMode && !continuousModeRef.current && !capturingView && !executing) {
      console.log("Auto mode ON: No existing schedule, starting now");
      setCapturingView(true);
    }
    // Important: make sure when autoMode turns off, it clears the timeout
    if (!autoMode && continuousModeRef.current) {
      clearTimeout(continuousModeRef.current);
      continuousModeRef.current = null;
    }
  }, [autoMode, capturingView, executing]);

  // Return the component
  return (
    <>
      {/* Capture view whenever capturingView is true */}
      {capturingView && (
        <ViewCapture 
          onCapture={handleCapturedView} 
          active={capturingView} 
        />
      )}
      
      {children}
    </>
  );
}
