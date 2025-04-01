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
import ChatInterface from "../components/ChatInterface";
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
  
  const [currentAnimation, setCurrentAnimation] = useState('idle');

  const [userMessage, setUserMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [characterAttributes, setCharacterAttributes] = useState({
    personality: 'Friendly and curious',
    biography: 'An AI explorer discovering this virtual world',
    attributes: [
      { name: 'Health', value: 100, max: 100 },
      { name: 'Energy', value: 100, max: 100 }
    ],
    customActions: []
  });

  const handleSendMessage = useCallback(async (message) => {
    if (!message.trim()) return;
    
    // Add user message to chat history
    setChatHistory(prev => [...prev, { sender: 'user', text: message }]);
    
    // Clear input field
    setUserMessage("");
    
    // If not already capturing view, trigger a view capture
    // This will send the current view to the AI along with the user's message
    if (!capturingView && !executing) {
      // We'll modify triggerCapture to accept a message parameter
      triggerCapture(message);
    } else {
      console.warn("Already processing a request, please wait");
    }
  }, [capturingView, executing, triggerCapture]);


  // Handle state changes from CharacterAI component
  const handleAIStateChange = useCallback((state) => {
    // Store previous response to check if it's new
    const previousResponse = aiResponse;
    
    // Update state from CharacterAI component
    setAiResponse(state.aiResponse);
    setCapturingView(state.capturingView);
    setExecuting(state.executing);
    setAutoMode(state.autoMode || false);
    setTriggerCapture(() => state.triggerCapture);
    
    // Update current animation if provided
    if (state.currentAnimation) {
      setCurrentAnimation(state.currentAnimation);
    }
    
    if (state.toggleAutoMode) {
      setToggleAutoMode(() => state.toggleAutoMode);
    }

    
    // If there's a new AI response with speech, add it to chat history
    if (state.aiResponse && state.aiResponse.speech) {
      const aiSpeech = state.aiResponse.speech;
      
      // Check the last message in chat history to avoid duplication
      const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
      
      // Only add to chat history if it's not already the last message
      if (!lastMessage || lastMessage.sender !== 'ai' || lastMessage.text !== aiSpeech) {
        setChatHistory(prev => [...prev, { 
          sender: 'ai', 
          text: aiSpeech 
        }]);
      }
    }
  }, [chatHistory]);
  
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

  // // Toggle between first and third person views
  // useEffect(() => {
  //   const handleKeyPress = (e) => {
  //     console.log("Key pressed:", e.key);
      
  //     if (e.key === 'v' || e.key === 'V') {
  //       console.log("View toggle requested");
  //       setIsFirstPerson(prev => !prev);
  //     }
  //     else if ((e.key === 'c' || e.key === 'C')) {
  //       console.log("Manual AI capture requested via key");
  //       if (!capturingView && !executing) {
  //         triggerCapture();
  //       } else {
  //         console.warn("Already capturing or executing, ignoring request");
  //       }
  //     }
  //     else if ((e.key === 'p' || e.key === 'P')) {
  //       console.log("Auto mode toggle requested via key");
  //       toggleAutoMode();
  //     }
  //   };
  
  //   // Use keydown for immediate response
  //   window.addEventListener('keydown', handleKeyPress);
  //   console.log("Key event listeners attached");
    
  //   return () => {
  //     window.removeEventListener('keydown', handleKeyPress);
  //     console.log("Key event listeners removed");
  //   };
  // }, [capturingView, executing, triggerCapture, toggleAutoMode]);

  return (
    <div className="w-full h-screen">
      {/* View toggle button */}
      <ViewToggleButton 
        isFirstPerson={isFirstPerson}
        toggleView={() => setIsFirstPerson(prev => !prev)}
      />
      
      <div className="absolute top-16 right-4 z-10 flex flex-col gap-2">
        <AIActionButton 
          isFirstPerson={true}
          capturingView={capturingView}
          executing={executing}
          triggerCapture={() => triggerCapture()} // No message, just observation
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

      {/* Add Chat Interface */}
      <ChatInterface 
        onSendMessage={handleSendMessage}
        userMessage={userMessage}
        setUserMessage={setUserMessage}
        chatHistory={chatHistory}
        aiResponse={aiResponse}
        capturingView={capturingView}
        executing={executing}
      />

      {/* Update instructions to remove key press references */}
      <div className="absolute bottom-4 right-4 z-10 bg-black bg-opacity-70 text-white p-3 rounded-md max-w-xs">
        <h3 className="font-bold mb-1">Controls</h3>
        <p className="text-sm">Use the buttons above to control the AI</p>
        <p className="text-sm">Chat with the AI using the message box</p>
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
            {/* Character Setup */}
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
                <Character 
                  position={[0,0,0]} 
                  bodyRef={characterBodyRef} 
                  currentAnimation={currentAnimation} // Pass the current animation
                />
              </Suspense>
              <CuboidCollider 
                args={[0.4, 1.45, 0.4]}
                position={[0, 1.5, 0]}
              />
            </RigidBody>
            
            {/* Only show OrbitControls in third-person view */}
            {!isFirstPerson && <OrbitControls />}
            
            <RigidBody type="fixed" colliders={"hull"}>
              <BaseMap position={[0,-25,0]}/>
            </RigidBody>
          </Physics>
          <Environment preset="sunset" background />
        </Suspense>
      </Canvas>
    </div>
  );
}