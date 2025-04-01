import React, { useCallback, useState, useEffect, useRef } from 'react';
import ViewCapture from './ViewCapture';
import { requestAIActions } from '../utils/aiService';

export default function CharacterAI({ 
  characterBodyRef, 
  isFirstPerson,
  onStateChange,
  children
}) {
  const [capturingView, setCapturingView] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const actionsTimeoutRef = useRef(null);
  const continuousModeRef = useRef(null);

  const [currentUserMessage, setCurrentUserMessage] = useState("");
  
  // Create character controls
  const controls = useCallback(() => {
    return {
      moveForward: (steps) => {
        if (!characterBodyRef.current) return;
        console.log(`Moving forward ${steps} steps`);
        
        // Apply stronger impulse for dramatic movement
        // For very large steps, break it into multiple impulses
        const maxSingleImpulse = 8;
        const impulseStrength = Math.min(steps, maxSingleImpulse);
        const initialImpulse = { x: 0, y: 0, z: -impulseStrength };
        
        // Apply primary impulse
        characterBodyRef.current.applyImpulse(initialImpulse, true);
        
        // For larger movements, schedule follow-up impulses
        if (steps > maxSingleImpulse) {
          return new Promise(resolve => {
            const remainingStrength = steps - maxSingleImpulse;
            
            // Apply a second impulse after a short delay
            setTimeout(() => {
              if (characterBodyRef.current) {
                const followUpImpulse = { 
                  x: 0, 
                  y: 0, 
                  z: -Math.min(remainingStrength, maxSingleImpulse) 
                };
                characterBodyRef.current.applyImpulse(followUpImpulse, true);
                
                // If still more distance to cover, apply a third impulse
                if (remainingStrength > maxSingleImpulse) {
                  setTimeout(() => {
                    if (characterBodyRef.current) {
                      const finalImpulse = { 
                        x: 0, 
                        y: 0, 
                        z: -(remainingStrength - maxSingleImpulse) 
                      };
                      characterBodyRef.current.applyImpulse(finalImpulse, true);
                    }
                    resolve();
                  }, 200);
                } else {
                  resolve();
                }
              } else {
                resolve();
              }
            }, 200);
          });
        }
        
        return Promise.resolve();
      },
      moveBackward: (steps) => {
        if (!characterBodyRef.current) return;
        console.log(`Moving backward ${steps} steps`);
        
        // Apply stronger impulse for dramatic movement
        const maxSingleImpulse = 8;
        const impulseStrength = Math.min(steps, maxSingleImpulse);
        const impulse = { x: 0, y: 0, z: impulseStrength };
        
        characterBodyRef.current.applyImpulse(impulse, true);
        
        // For larger movements, apply follow-up impulse
        if (steps > maxSingleImpulse) {
          return new Promise(resolve => {
            setTimeout(() => {
              if (characterBodyRef.current) {
                const followUpImpulse = { 
                  x: 0, 
                  y: 0, 
                  z: steps - maxSingleImpulse 
                };
                characterBodyRef.current.applyImpulse(followUpImpulse, true);
              }
              resolve();
            }, 200);
          });
        }
        
        return Promise.resolve();
      },
      moveLeft: (steps) => {
        if (!characterBodyRef.current) return;
        console.log(`Moving left ${steps} steps`);
        
        // Apply stronger impulse for dramatic movement
        const maxSingleImpulse = 6;
        const impulseStrength = Math.min(steps, maxSingleImpulse);
        const impulse = { x: -impulseStrength, y: 0, z: 0 };
        
        characterBodyRef.current.applyImpulse(impulse, true);
        
        // For larger movements, apply follow-up impulse
        if (steps > maxSingleImpulse) {
          return new Promise(resolve => {
            setTimeout(() => {
              if (characterBodyRef.current) {
                const followUpImpulse = { 
                  x: -(steps - maxSingleImpulse), 
                  y: 0, 
                  z: 0 
                };
                characterBodyRef.current.applyImpulse(followUpImpulse, true);
              }
              resolve();
            }, 200);
          });
        }
        
        return Promise.resolve();
      },
      moveRight: (steps) => {
        if (!characterBodyRef.current) return;
        console.log(`Moving right ${steps} steps`);
        
        // Apply stronger impulse for dramatic movement
        const maxSingleImpulse = 6;
        const impulseStrength = Math.min(steps, maxSingleImpulse);
        const impulse = { x: impulseStrength, y: 0, z: 0 };
        
        characterBodyRef.current.applyImpulse(impulse, true);
        
        // For larger movements, apply follow-up impulse
        if (steps > maxSingleImpulse) {
          return new Promise(resolve => {
            setTimeout(() => {
              if (characterBodyRef.current) {
                const followUpImpulse = { 
                  x: steps - maxSingleImpulse, 
                  y: 0, 
                  z: 0 
                };
                characterBodyRef.current.applyImpulse(followUpImpulse, true);
              }
              resolve();
            }, 200);
          });
        }
        
        return Promise.resolve();
      },
      turn: (angle) => {
        if (!characterBodyRef.current) return;
        console.log(`Turning ${angle} radians`);
        
        // More dramatic turns, but still keep them controlled
        // If angle is large, break it into multiple smaller turns
        const maxSingleTurn = 0.8;
        
        if (Math.abs(angle) > maxSingleTurn) {
          // Break into multiple turns for smoother large rotations
          return new Promise(resolve => {
            const totalAngle = angle;
            const steps = Math.ceil(Math.abs(totalAngle) / maxSingleTurn);
            const anglePerStep = totalAngle / steps;
            
            // Function to apply sequential turns
            const applyTurn = (step) => {
              if (step >= steps || !characterBodyRef.current) {
                resolve();
                return;
              }
              
              const currentRotation = characterBodyRef.current.rotation();
              characterBodyRef.current.setRotation({
                x: currentRotation.x,
                y: currentRotation.y + anglePerStep,
                z: currentRotation.z,
                w: currentRotation.w
              }, true);
              
              setTimeout(() => applyTurn(step + 1), 100);
            };
            
            // Start the sequential turns
            applyTurn(0);
          });
        } else {
          // For smaller turns, just apply directly
          const currentRotation = characterBodyRef.current.rotation();
          characterBodyRef.current.setRotation({
            x: currentRotation.x,
            y: currentRotation.y + angle,
            z: currentRotation.z,
            w: currentRotation.w
          }, true);
          
          return Promise.resolve();
        }
      },
      jump: (height = 15) => {
        if (!characterBodyRef.current) return;
        console.log("Jumping with height", height);
        
        // Enhanced dramatic jump
        // Higher jumps with optional horizontal momentum
        const actualHeight = Math.max(height, 15); // Ensure minimum height of 15
        
        // Add slight horizontal momentum based on character's current facing direction
        const currentRotation = characterBodyRef.current.rotation();
        const yRotation = currentRotation.y;
        
        // Calculate forward direction based on rotation
        const forwardX = Math.sin(yRotation);
        const forwardZ = -Math.cos(yRotation);
        
        // Apply a more dramatic jump impulse with forward momentum
        const impulse = { 
          x: forwardX * 2,  // Small horizontal momentum in facing direction
          y: actualHeight,  // Vertical jump force
          z: forwardZ * 2   // Small horizontal momentum in facing direction
        };
        
        characterBodyRef.current.applyImpulse(impulse, true);
        
        // For very high jumps, add some spin for dramatic effect
        if (height > 20) {
          setTimeout(() => {
            if (characterBodyRef.current) {
              // Add slight angular velocity for a spin effect during high jumps
              characterBodyRef.current.setAngvel({ 
                x: 0, 
                y: 0.5, // Spin around y-axis
                z: 0 
              }, true);
            }
          }, 100);
        }
        
        return Promise.resolve();
      },
      wait: (duration) => {
        console.log(`Waiting for ${duration}ms`);
        
        // Dynamic waiting - for longer waits, add slight movement
        const limitedDuration = Math.min(duration, 3000);
        
        if (limitedDuration > 1000 && characterBodyRef.current) {
          // For longer waits, add a subtle look-around motion
          setTimeout(() => {
            if (characterBodyRef.current) {
              const currentRotation = characterBodyRef.current.rotation();
              characterBodyRef.current.setRotation({
                x: currentRotation.x,
                y: currentRotation.y + 0.2, // Small turn
                z: currentRotation.z,
                w: currentRotation.w
              }, true);
              
              // Turn back after a short delay
              setTimeout(() => {
                if (characterBodyRef.current) {
                  const newRotation = characterBodyRef.current.rotation();
                  characterBodyRef.current.setRotation({
                    x: newRotation.x,
                    y: newRotation.y - 0.2, // Return to original orientation
                    z: newRotation.z,
                    w: newRotation.w
                  }, true);
                }
              }, limitedDuration / 2);
            }
          }, 300);
        }
        
        // Return promise that resolves after the full wait time
        return new Promise(resolve => setTimeout(resolve, limitedDuration));
      }
    };
  }, [characterBodyRef]);

  const optimizeActionSequence = useCallback((actions) => {
    if (!actions || actions.length === 0) return [];
    
    const optimized = [...actions];
    
    // Enhance jump actions by adding forward momentum
    for (let i = 0; i < optimized.length; i++) {
      // If this is a jump and followed by a moveForward, combine them
      if (optimized[i].type === 'jump' && 
          i + 1 < optimized.length && 
          optimized[i + 1].type === 'moveForward') {
        
        // Increase jump height for more drama
        optimized[i].value = Math.max(optimized[i].value, 20);
        
        // Increase the forward movement that follows
        optimized[i + 1].value = Math.max(optimized[i + 1].value, 8);
      }
      
      // Make all turns more dramatic
      if (optimized[i].type === 'turn') {
        // Increase turn angle by 20% for more drama, preserving direction
        optimized[i].value = optimized[i].value * 1.2;
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
        if (continuousModeRef.current) {
          clearTimeout(continuousModeRef.current);
        }
        continuousModeRef.current = setTimeout(() => {
          console.log("Retry timeout fired");
          scheduleNextCapture(); // This will try again
        }, 1000);
      }
    }, 5000);
    
    console.log("Next capture scheduled with ID:", continuousModeRef.current);
  }, [autoMode, capturingView, executing]);

  // Toggle continuous mode
  const toggleAutoMode = useCallback(() => {
    console.log("Toggle auto mode function called");
    setAutoMode(prev => {
      const newMode = !prev;
      console.log("Auto mode changing to:", newMode);
      
      if (newMode) {
        // Start continuous mode
        console.log("Starting continuous mode");
        if (continuousModeRef.current) {
          clearTimeout(continuousModeRef.current);
        }
        
        // Trigger the first capture if not already busy
        if (!capturingView && !executing) {
          console.log("Auto mode enabled, triggering first capture");
          setTimeout(() => setCapturingView(true), 100);
        } else {
          // If busy, schedule for later
          console.log("System busy, scheduling first auto capture");
          setTimeout(() => {
            scheduleNextCapture();
          }, 1000);
        }
      } else {
        // Stop continuous mode
        console.log("Stopping continuous mode");
        if (continuousModeRef.current) {
          clearTimeout(continuousModeRef.current);
          continuousModeRef.current = null;
        }
      }
      return newMode;
    });
  }, [capturingView, executing, scheduleNextCapture]);

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
      console.warn("Already capturing view or executing actions");
      return;
    }
    
    // Store the user message
    setCurrentUserMessage(userMessage);
    
    // Set capturing view to true
    console.log(`Setting capturing view to true with message: "${userMessage}"`);
    setCapturingView(true);
  }, [capturingView, executing]);
  
  const executeAIActions = useCallback(async (actions) => {
    console.log("Executing actions:", actions);
    
    // Process actions sequentially with optimizations for dramatic movement
    const characterControls = controls();
    let totalExecutionTime = 0;
    
    // Optimize the action sequence for more dramatic movement
    const optimizedActions = optimizeActionSequence(actions);
    console.log("Optimized actions for dramatic movement:", optimizedActions);
    
    // Scale delay times to make movements snappier
    optimizedActions.forEach(action => {
      // Reduce delays for more responsive, dramatic movement
      action.delay = Math.floor(action.delay * 0.8);
    });
    
    // Execute the optimized actions
    for (const action of optimizedActions) {
      await new Promise(resolve => {
        actionsTimeoutRef.current = setTimeout(async () => {
          const { type, value, delay } = action;
          console.log(`Executing dramatic action: ${type}(${value})`);
          
          if (characterControls[type]) {
            await characterControls[type](value);
          } else {
            console.warn(`Unknown action type: ${type}`);
          }
          totalExecutionTime += delay || 500;
          resolve();
        }, action.delay || 400); // Use slightly reduced delays for snappier movement
      });
    }
    
    console.log(`Completed dramatic action sequence in ${totalExecutionTime}ms`);
  }, [controls, optimizeActionSequence]);


  // Update the handleCapturedView function to include the user message
  const handleCapturedView = useCallback(async (imageData) => {
    console.log("View captured, setting capturing view to false");
    setCapturingView(false);
    
    try {
      // Prepare control methods array for AI
      const controlMethods = Object.keys(controls());
      
      console.log("Setting executing to true");
      setExecuting(true);
      
      // Pass the user message along with the image data
      const aiResult = await requestAIActions(
        imageData,
        controlMethods,
        currentUserMessage // Pass the current user message
      );
      
      console.log("Received AI response:", aiResult);
      setAiResponse(aiResult);
      
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
  }, [controls, scheduleNextCapture, autoMode, optimizeActionSequence, currentUserMessage, executeAIActions]);


  // Notify parent component of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        aiResponse,  // Make sure this is included
        capturingView,
        executing,
        autoMode,
        toggleAutoMode,
        triggerCapture: (userMessage = "") => {
          if (!capturingView && !executing) {
            console.log("triggerCapture called from parent");
            setCurrentUserMessage(userMessage);  // Store the message
            setCapturingView(true);
          }
        }
      });
    }
  }, [aiResponse, capturingView, executing, autoMode, onStateChange, toggleAutoMode]);
  
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

  // Specifically monitor auto mode changes
  useEffect(() => {
    console.log("Auto mode state changed to:", autoMode);
    
    // When auto mode is turned on, start the cycle if it hasn't started yet
    if (autoMode && !continuousModeRef.current && !capturingView && !executing) {
      console.log("Auto mode ON: No existing schedule, starting now");
      setCapturingView(true);
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