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

import FlatFloor from '../components/FlatFloor';
import BoundaryWalls from '../components/BoundaryWalls';
import CharacterConfigPanel from '../components/CharacterConfigPanel';

import { ScreenshotButton } from "../components/ActionButtons";
import ScreenshotCapture from "../components/ScreenshotCapture";
import DrawingBoard from '../components/DrawingBoard';
import DrawnObject from '../components/DrawnObject';
import { Html } from "@react-three/drei";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import Draggable from '../components/Draggable';

interface CharacterConfig {
  personality: string;
  biography: string;
  goals: string;
  speechStyle: string;
  customInstructions: string;
}

interface ChatMessage {
  sender: string;
  text: string;
}

interface SharedMessage {
  sender: string;
  target: string;
  text: string;
  timestamp: number;
}

interface DrawnObject {
  geometry: THREE.ExtrudeGeometry;
  position: [number, number, number];
  scale?: [number, number, number];
  physicsProps: {
    mass: number;
    restitution: number;
    friction: number;
    linearDamping: number;
    angularDamping: number;
  };
}

export default function Home() {
  const characterBodyRef = useRef(null);
  const startPosition = [0, 5, 0]; // Store initial position for reset
  const fallThreshold = -100; // Reset character if Y position is below this value
  const [isFirstPerson, setIsFirstPerson] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [capturingView, setCapturingView] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [triggerCapture, setTriggerCapture] = useState(() => () => {});
  const [toggleAutoMode, setToggleAutoMode] = useState(() => () => {});
  
  // Add state for second character
  const character2BodyRef = useRef(null);
  const [character2AiResponse, setCharacter2AiResponse] = useState(null);
  const [character2CapturingView, setCharacter2CapturingView] = useState(false);
  const [character2Executing, setCharacter2Executing] = useState(false);
  const [character2AutoMode, setCharacter2AutoMode] = useState(false);
  const [character2Animation, setCharacter2Animation] = useState('idle');
  const [triggerCapture2, setTriggerCapture2] = useState(() => () => {});
  const [toggleAutoMode2, setToggleAutoMode2] = useState(() => () => {});
  const [character2UserMessage, setCharacter2UserMessage] = useState("");

  // Shared conversation history between characters
  const [sharedConversation, setSharedConversation] = useState<SharedMessage[]>([]);

  const [currentAnimation, setCurrentAnimation] = useState('idle');

  const [viewMode, setViewMode] = useState('thirdPerson'); // 'thirdPerson', 'firstPerson1', or 'firstPerson2'

  // Add these state variables to track whose turn it is
  const [conversationTurn, setConversationTurn] = useState('character1');
  const [turnInProgress, setTurnInProgress] = useState(false);
  const [autoDialogueMode, setAutoDialogueMode] = useState(false);

  // Add a state variable to track the last dialogue time
  const [lastDialogueTime, setLastDialogueTime] = useState(0);

  const [userMessage, setUserMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [characterAttributes, setCharacterAttributes] = useState({
    personality: 'Friendly and curious',
    biography: 'An AI explorer discovering this virtual world',
    attributes: [
      { name: 'Health', value: 100, max: 100 },
      { name: 'Energy', value: 100, max: 100 }
    ],
    customActions: []
  });

  const [showCharacter1Config, setShowCharacter1Config] = useState(false);
  const [showCharacter2Config, setShowCharacter2Config] = useState(false);
  const [character1Config, setCharacter1Config] = useState({
    personality: 'Friendly and curious',
    biography: 'An AI explorer discovering this virtual world',
    goals: 'Explore and learn about the environment',
    speechStyle: 'Casual and inquisitive',
    customInstructions: ''
  });
  const [character2Config, setCharacter2Config] = useState({
    personality: 'Analytical and cautious',
    biography: 'A scientific AI studying this digital realm',
    goals: 'Observe and document findings',
    speechStyle: 'Technical and precise',
    customInstructions: ''
  });

  // Add these handler functions
  const saveCharacter1Config = (newConfig: CharacterConfig) => {
    setCharacter1Config(newConfig);
    console.log('Saved Character 1 config:', newConfig);
  };
  
  const saveCharacter2Config = (newConfig: CharacterConfig) => {
    setCharacter2Config(newConfig);
    console.log('Saved Character 2 config:', newConfig);
  };

  // Add these new states
  const [captureChar1Screenshot, setCaptureChar1Screenshot] = useState(false);
  const [captureChar2Screenshot, setCaptureChar2Screenshot] = useState(false);
  

  // Add screenshot trigger functions
  const triggerChar1Screenshot = useCallback(() => {
    console.log("Triggering Character 1 screenshot");
    setCaptureChar1Screenshot(true);
  }, []);
  
  const triggerChar2Screenshot = useCallback(() => {
    console.log("Triggering Character 2 screenshot");
    setCaptureChar2Screenshot(true);
  }, []);

  // Add this function to handle turn transitions
  const advanceTurn = useCallback(() => {
    if (!autoDialogueMode) return;
    
    console.log("Advancing turn from", conversationTurn);
    
    // Reset turn in progress first, then change the turn
    setTurnInProgress(false);
    setConversationTurn(prev => (prev === 'character1' ? 'character2' : 'character1'));
  }, [autoDialogueMode]);
  
  // Separate effect to observe turn changes and trigger the next character
  useEffect(() => {
    if (!autoDialogueMode) return;
    
    console.log("Turn changed to:", conversationTurn, "turnInProgress:", turnInProgress);
    
    if (turnInProgress) return;
    
    // Set a timer to trigger the next character's response
    const timer = setTimeout(() => {
      console.log("Auto-triggering character:", conversationTurn);
      
      setTurnInProgress(true);
      
      if (conversationTurn === 'character1') {
        console.log("Triggering character 1");
        triggerCapture("Let's continue our conversation");
      } else {
        console.log("Triggering character 2");
        triggerCapture2("Let's continue our conversation");
      }
    }, 2000); // 2 second delay between turns
    
    return () => clearTimeout(timer);
  }, [conversationTurn, autoDialogueMode, turnInProgress, triggerCapture, triggerCapture2]);

  // Add a separate function for auto dialogue
  const startAutoDialogue = useCallback(() => {
    console.log("Starting auto dialogue between characters");
    
    // Set the mode
    setAutoDialogueMode(true);
    
    // Always start with character 1
    setConversationTurn('character1');
    
    // Trigger the first character with a prompt to start a conversation
    triggerCapture("You notice another character. Start a friendly conversation with them. Ask them a question about themselves or their experiences.");
  }, [triggerCapture]);

  // Stop auto dialogue
  const stopAutoDialogue = useCallback(() => {
    console.log("Stopping auto dialogue");
    setAutoDialogueMode(false);
  }, []);

  // Add a function to handle the dialogue turn switching
  const switchDialogueTurn = useCallback(() => {
    if (!autoDialogueMode) return;
    
    const now = Date.now();
    const elapsedSinceLastDialogue = now - lastDialogueTime;
    
    // If less than 10 seconds have passed since the last dialogue, wait
    if (elapsedSinceLastDialogue < 10000) {
      const remainingTime = 10000 - elapsedSinceLastDialogue;
      console.log(`Waiting ${remainingTime}ms to complete 10-second pause between turns`);
      
      // Schedule the switch after the remaining time
      const timer = setTimeout(() => {
        switchDialogueTurn();
      }, remainingTime);
      
      return () => clearTimeout(timer);
    }
    
    console.log("Switching dialogue turn after 10-second pause");
    
    // Update the last dialogue time
    setLastDialogueTime(now);
    
    // Switch turn
    const nextTurn = conversationTurn === 'character1' ? 'character2' : 'character1';
    setConversationTurn(nextTurn);
    
    // After switching, trigger the next character with a contextual prompt
    setTimeout(() => {
      if (nextTurn === 'character1') {
        triggerCapture("Continue the conversation with the other character");
      } else {
        triggerCapture2("Continue the conversation with the other character");
      }
    }, 500); // Short delay for state update
  }, [autoDialogueMode, conversationTurn, triggerCapture, triggerCapture2, lastDialogueTime]);  
  // Update the view toggle function
  const toggleView = () => {
    setViewMode(current => {
      switch(current) {
        case 'thirdPerson': return 'firstPerson1';
        case 'firstPerson1': return 'firstPerson2';
        case 'firstPerson2': return 'thirdPerson';
        default: return 'thirdPerson';
      }
    });
  };

  const handleUserMessage = (message: string) => {
    setUserMessage(message);
    setChatHistory(prev => [...prev, { sender: 'user', text: message }]);
    setSharedConversation(prev => [...prev, {
      sender: 'user',
      target: 'character1',
      text: message,
      timestamp: Date.now()
    }]);
  };

  // Handler for sending messages to character 2
  const handleSendMessage2 = useCallback(async (message) => {
    if (!message.trim()) return;
    
    // Add user message to shared conversation
    setSharedConversation(prev => [...prev, { 
      sender: 'user', 
      target: 'character2',
      text: message,
      timestamp: Date.now()
    }]);
    
    // Clear input field
    setCharacter2UserMessage("");
    
    // If not already capturing view, trigger a view capture
    if (!character2CapturingView && !character2Executing) {
      triggerCapture2(message);
    } else {
      console.warn("Character 2 is busy, please wait");
    }
  }, [character2CapturingView, character2Executing, triggerCapture2]);

  // Modify the existing handleAIStateChange function
  const handleAIStateChange = useCallback((state) => {
    setAiResponse(state.aiResponse);
    setCapturingView(state.capturingView);
    setExecuting(state.executing);
    setAutoMode(state.autoMode || false);
    setCurrentAnimation(state.currentAnimation || 'idle');
    
    setTriggerCapture(() => state.triggerCapture);
    if (state.toggleAutoMode) {
      setToggleAutoMode(() => state.toggleAutoMode);
    }
    
    // Add AI response to shared conversation
    if (state.aiResponse && state.aiResponse.speech) {
      setSharedConversation(prev => {
        // Check if this exact message is already in the conversation
        const isDuplicate = prev.some(msg => 
          msg.sender === 'character1' && 
          msg.text === state.aiResponse.speech &&
          // Consider messages within 2 seconds as duplicates
          Date.now() - msg.timestamp < 2000
        );
        
        // Only add if not a duplicate
        if (!isDuplicate) {
          return [...prev, {
            sender: 'character1',
            text: state.aiResponse.speech,
            timestamp: Date.now(),
            id: Date.now() + Math.random().toString(36).substr(2, 5) // Add unique ID
          }];
        }
        return prev;
      });
      
      // Also update chat history with deduplication
      setChatHistory(prev => {
        const lastMessage = prev.length > 0 ? prev[prev.length - 1] : null;
        if (!lastMessage || lastMessage.sender !== 'ai' || lastMessage.text !== state.aiResponse.speech) {
          return [...prev, { 
            sender: 'ai', 
            text: state.aiResponse.speech,
            id: Date.now() + Math.random().toString(36).substr(2, 5) // Add unique ID
          }];
        }
        return prev;
      });  
      // Check for auto dialogue conditions
      if (autoDialogueMode && 
          conversationTurn === 'character1' && 
          !state.executing && 
          !state.capturingView) {
        console.log("Character 1 finished speaking, switching dialogue turn");
        // Use a delay to ensure any actions are complete
        setTimeout(() => switchDialogueTurn(), 2000);
      }
      // When the character is completely done (not executing or capturing)
      if (!state.executing && !state.capturingView && autoDialogueMode && 
        conversationTurn === 'character1') {
      console.log("Character 1 finished speaking, advancing turn");
      setTimeout(() => advanceTurn(), 1500);
    }
  }
}, [autoDialogueMode, conversationTurn, advanceTurn]);


  // Handle state changes from second CharacterAI component
  const handleAI2StateChange = useCallback((state) => {
    setCharacter2AiResponse(state.aiResponse);
    setCharacter2CapturingView(state.capturingView);
    setCharacter2Executing(state.executing);
    setCharacter2AutoMode(state.autoMode || false);
    setCharacter2Animation(state.currentAnimation || 'idle');
    
    setTriggerCapture2(() => state.triggerCapture);
    if (state.toggleAutoMode) {
      setToggleAutoMode2(() => state.toggleAutoMode);
    }
    
    // Add AI response to shared conversation
    if (state.aiResponse && state.aiResponse.speech) {
      setSharedConversation(prev => {
        // Check if this exact message is already in the conversation
        const isDuplicate = prev.some(msg => 
          msg.sender === 'character2' && 
          msg.text === state.aiResponse.speech &&
          // Consider messages within 2 seconds as duplicates
          Date.now() - msg.timestamp < 2000
        );
        
        // Only add if not a duplicate
        if (!isDuplicate) {
          return [...prev, {
            sender: 'character2',
            text: state.aiResponse.speech,
            timestamp: Date.now(),
            id: Date.now() + Math.random().toString(36).substr(2, 5) // Add unique ID
          }];
        }
        return prev;
      });
      
      // Also update chat history with deduplication
      setChatHistory(prev => {
        const lastMessage = prev.length > 0 ? prev[prev.length - 1] : null;
        if (!lastMessage || lastMessage.sender !== 'ai' || lastMessage.text !== state.aiResponse.speech) {
          return [...prev, { 
            sender: 'ai', 
            text: state.aiResponse.speech,
            id: Date.now() + Math.random().toString(36).substr(2, 5) // Add unique ID
          }];
        }
        return prev;
      });  
        
      // Check for auto dialogue conditions
      if (autoDialogueMode && 
          conversationTurn === 'character2' && 
          !state.executing && 
          !state.capturingView) {
        console.log("Character 2 finished speaking, switching dialogue turn");
        // Use a delay to ensure any actions are complete
        setTimeout(() => switchDialogueTurn(), 2000);
      }
      
      // Check if it's character 2's turn and they're done speaking
      if (!state.executing && !state.capturingView && autoDialogueMode && 
        conversationTurn === 'character2') {
      console.log("Character 2 finished speaking, advancing turn");
      setTimeout(() => advanceTurn(), 1500);
    }
  }
}, [autoDialogueMode, conversationTurn, advanceTurn]);


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

  const [drawnObjects, setDrawnObjects] = useState<DrawnObject[]>([]);
  const [showDrawingBoard, setShowDrawingBoard] = useState(false);
  const [showObjectList, setShowObjectList] = useState(false);

  const sceneRef = useRef(null);

  const handleDrawingComplete = useCallback((geometries: { geometry: THREE.ExtrudeGeometry; color: string }[], physicsProps: {
    mass: number;
    restitution: number;
    friction: number;
    linearDamping: number;
    angularDamping: number;
  }) => {
    try {
      // Add the new object to the drawn objects state
      setDrawnObjects(prev => [...prev, {
        geometry: geometries[0].geometry,
        position: [0, 5, 0], // Start slightly above ground
        scale: [1, 1, 1],
        physicsProps
      }]);
    } catch (error) {
      console.error('Error creating 3D model:', error);
    }
  }, []);

  const deleteDrawnObject = (index: number) => {
    // Remove the mesh from the scene
    if (sceneRef.current) {
      const object = drawnObjects[index];
      const mesh = sceneRef.current.children.find(child => 
        child instanceof THREE.Mesh && 
        child.geometry === object.geometry
      );
      if (mesh) {
        sceneRef.current.remove(mesh);
        // Dispose of geometry and material to free up memory
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        } else if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => material.dispose());
        }
      }
    }
    
    // Update the state
    setDrawnObjects(prev => prev.filter((_, i) => i !== index));
  };

  const deleteAllDrawnObjects = () => {
    // Remove all meshes from the scene
    if (sceneRef.current) {
      drawnObjects.forEach(obj => {
        const mesh = sceneRef.current.children.find(child => 
          child instanceof THREE.Mesh && 
          child.geometry === obj.geometry
        );
        if (mesh) {
          sceneRef.current.remove(mesh);
          // Dispose of geometry and material to free up memory
          mesh.geometry.dispose();
          if (mesh.material instanceof THREE.Material) {
            mesh.material.dispose();
          } else if (Array.isArray(mesh.material)) {
            mesh.material.forEach(material => material.dispose());
          }
        }
      });
    }
    
    // Clear the state
    setDrawnObjects([]);
  };

  return (
    <div className="w-full h-screen">
      {/* View toggle button */}
      <ViewToggleButton 
        viewMode={viewMode}
        toggleView={toggleView}
      />

    <div className="absolute top-16 right-4 z-10 bg-black bg-opacity-70 text-white p-2 rounded-md">
      {viewMode === 'thirdPerson' 
        ? "Third Person View" 
        : viewMode === 'firstPerson1' 
          ? "Character 1 Perspective" 
          : "Character 2 Perspective"}
    </div>


      
      {/* <div className="absolute top-16 right-4 z-10 flex flex-col gap-2">
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
      </div> */}

      {/* Add UI for dual chat interfaces */}
      <div className="absolute bottom-20 left-4 z-10 grid grid-cols-2 gap-4 w-3/4 max-w-4xl">
        {/* Character 1 Chat Interface */}
        <div>
          <h3 className="text-white bg-black bg-opacity-70 p-2 rounded-t-md">Character 1</h3>
          <button 
              onClick={() => setShowCharacter1Config(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
            >
              Configure
            </button>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 mt-2">
              <AIActionButton 
                isFirstPerson={false}
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
              {/* Add screenshot button */}
              <ScreenshotButton 
                onClick={triggerChar1Screenshot} 
                characterId="character1" 
              />
            </div>
            
            <ChatInterface 
              onSendMessage={handleUserMessage}
              userMessage={userMessage}
              setUserMessage={setUserMessage}
              chatHistory={chatHistory}
              aiResponse={aiResponse}
              capturingView={capturingView}
              executing={executing}
              characterId="character1"
            />
          </div>
        </div>
        
        {/* Character 2 Chat Interface */}
        <div>
          <h3 className="text-white bg-black bg-opacity-70 p-2 rounded-t-md">Character 2</h3>
          <button 
              onClick={() => setShowCharacter2Config(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
            >
              Configure
          </button>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 mt-2">
              <AIActionButton 
                isFirstPerson={false}
                capturingView={character2CapturingView}
                executing={character2Executing}
                triggerCapture={() => triggerCapture2()} // No message, just observation
              />
              
              <button 
                className={`px-4 py-2 rounded-md ${
                  character2AutoMode 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-black bg-opacity-70 hover:bg-opacity-80"
                } text-white`}
                onClick={toggleAutoMode2}
              >
                {character2AutoMode ? "Auto Mode: ON" : "Auto Mode: OFF"}
              </button>
              {/* Add screenshot button */}
              <ScreenshotButton 
                onClick={triggerChar2Screenshot} 
                characterId="character2" 
              />
            </div>
            
            <ChatInterface 
              onSendMessage={handleSendMessage2}
              userMessage={character2UserMessage}
              setUserMessage={setCharacter2UserMessage}
              chatHistory={sharedConversation.filter(msg => 
                msg.sender === 'character2' || msg.target === 'character2'
              )}
              aiResponse={character2AiResponse}
              capturingView={character2CapturingView}
              executing={character2Executing}
              characterId="character2"
            />
          </div>
        </div>
      </div>

      {/* Configuration Panels */}
      {showCharacter1Config && (
        <CharacterConfigPanel
          characterId="character1"
          initialConfig={character1Config}
          onSave={saveCharacter1Config}
          onClose={() => setShowCharacter1Config(false)}
        />
      )}
      
      {showCharacter2Config && (
        <CharacterConfigPanel
          characterId="character2"
          initialConfig={character2Config}
          onSave={saveCharacter2Config}
          onClose={() => setShowCharacter2Config(false)}
        />
      )}

      {/* // Add this UI element near your other controls */}
      <div className="absolute top-40 right-4 z-10 flex flex-col gap-2">
        <button 
          className={`px-4 py-2 rounded-md ${
            autoDialogueMode 
              ? "bg-purple-600 hover:bg-purple-700" 
              : "bg-black bg-opacity-70 hover:bg-opacity-80"
          } text-white`}
          onClick={() => autoDialogueMode ? stopAutoDialogue() : startAutoDialogue()}
        >
          {autoDialogueMode ? "Stop Auto Dialogue" : "Start Auto Dialogue"}
        </button>
      </div>

      {/* Update instructions to remove key press references */}
      <div className="absolute bottom-4 right-4 z-10 bg-black bg-opacity-70 text-white p-3 rounded-md max-w-xs">
        <h3 className="font-bold mb-1">Controls</h3>
        <p className="text-sm">Use the buttons above to control the AI</p>
        <p className="text-sm">Chat with the AI using the message box</p>
      </div>
      
      {/* <AIResponseDisplay aiResponse={aiResponse} /> */}

      {/* Character 1 header */}
      <h3 className="text-white bg-black bg-opacity-70 p-2 rounded-t-md flex items-center">
        Character 1
        {autoDialogueMode && conversationTurn === 'character1' && (
          <span className="ml-2 px-2 py-1 text-xs bg-purple-600 rounded animate-pulse">
            Speaking
          </span>
        )}
      </h3>

      {/* Character 2 header */}
      <h3 className="text-white bg-black bg-opacity-70 p-2 rounded-t-md flex items-center">
        Character 2
        {autoDialogueMode && conversationTurn === 'character2' && (
          <span className="ml-2 px-2 py-1 text-xs bg-purple-600 rounded animate-pulse">
            Speaking
          </span>
        )}
      </h3>
      
      <Canvas shadows onCreated={({ scene }) => { sceneRef.current = scene; }}>
        {/* Default third-person camera */}
        {viewMode === 'thirdPerson' && (
          <PerspectiveCamera
            makeDefault
            position={[-8, 6, 8]}
            fov={75}
          />
        )}
        
        <ambientLight color={"white"} intensity={0.3} />
        <LightBulb position={[0, 3, 0]} />
        <Suspense>
          {/* Add OrbitControls only in third-person mode */}
          {viewMode === 'thirdPerson' && <OrbitControls />}
          <Physics debug gravity={[0, -20, 0]}>
          {/* First Character Setup */}
          <RigidBody
            ref={characterBodyRef}
            colliders={false}
            restitution={0}
            friction={1.0} // Increase
            linearDamping={3.0} // Increase
            angularDamping={100}
            lockRotations={true}
            position={startPosition}
          >
            <CharacterAI 
              characterBodyRef={characterBodyRef}
              isFirstPerson={viewMode === 'firstPerson1'}
              onStateChange={handleAIStateChange}
              sharedConversation={sharedConversation}
              characterId="character1"
              characterConfig={character1Config}
              isMyTurn={autoDialogueMode ? conversationTurn === 'character1' : true}
            >
              {/* First-person camera for character 1 */}
              {viewMode === 'firstPerson1' && (
                <>
                  <PerspectiveCamera
                    makeDefault
                    position={[0, 2, 0.2]} // Position at eye level looking forward
                    rotation={[0, Math.PI, 0]} // Rotate 180 degrees
                    fov={90}
                  />
                  <ScreenshotCapture 
                    characterId="character1" 
                    viewMode={viewMode}
                    triggerMode={captureChar1Screenshot}
                  />
                </>
              )}
            </CharacterAI>
            
            <Suspense fallback={null}>
              <Character 
                position={[0,0,0]} 
                bodyRef={characterBodyRef} 
                currentAnimation={currentAnimation}
                aiResponse={aiResponse}
                modelPath="/jinx.glb"
              />
            </Suspense>
            <CuboidCollider 
              args={[0.4, 1.45, 0.4]}
              position={[0, 1.5, 0]}
            />
          </RigidBody>
          
          {/* Second Character Setup */}
          <RigidBody
            ref={character2BodyRef}
            colliders={false}
            restitution={0}
            friction={1.0} // Increase
            linearDamping={3.0} // Increase
            angularDamping={100}
            lockRotations={true}
            position={[5, 1, 5]}
          >
            <CharacterAI 
              characterBodyRef={character2BodyRef}
              isFirstPerson={viewMode === 'firstPerson2'}
              onStateChange={handleAI2StateChange}
              sharedConversation={sharedConversation}
              characterId="character2"
              characterConfig={character2Config}
              isMyTurn={autoDialogueMode ? conversationTurn === 'character2' : true}
            >
              {/* First-person camera for character 2 */}
              {viewMode === 'firstPerson2' && (
                <>
                  <PerspectiveCamera
                    makeDefault
                    position={[0, 2.8, 0.3]} // Position at eye level looking forward
                    rotation={[0, Math.PI, 0]} // Rotate 180 degrees
                    fov={90}
                  />
                  <ScreenshotCapture 
                    characterId="character2" 
                    viewMode={viewMode}
                    triggerMode={captureChar2Screenshot}
                  />
                </>
              )}
            </CharacterAI>
            
            <Suspense fallback={null}>
              <Character 
                position={[0,0,0]} 
                bodyRef={character2BodyRef}
                currentAnimation={character2Animation}
                aiResponse={character2AiResponse}
                modelPath="/midoriya.glb"
                color="blue"
              />
            </Suspense>
            <CuboidCollider 
              args={[0.4, 1.45, 0.4]}
              position={[0, 1.5, 0]}
            />
          </RigidBody>
          
          {/* Floor and boundary walls */}
          <RigidBody type="fixed" colliders={"trimesh"} friction={0.7}>
            {/* <FlatFloor position={[0, 0, 0]} /> */}
            <BaseMap position={[0,-10,0]} />
          </RigidBody>
          <BoundaryWalls size={20} />
          
          {/* Render drawn objects */}
          {drawnObjects.map((obj, index) => (
            <Draggable
              key={index}
              onDragStart={() => {
                // Optional: Add any logic you want to execute when dragging starts
                console.log('Started dragging object', index);
              }}
              onDragEnd={() => {
                // Optional: Add any logic you want to execute when dragging ends
                console.log('Finished dragging object', index);
              }}
            >
              <RigidBody
                colliders="hull"
                mass={obj.physicsProps.mass}
                restitution={obj.physicsProps.restitution}
                friction={obj.physicsProps.friction}
                linearDamping={obj.physicsProps.linearDamping}
                angularDamping={obj.physicsProps.angularDamping}
                position={obj.position}
              >
                <mesh
                  geometry={obj.geometry}
                  scale={obj.scale || [1, 1, 1]}
                  castShadow
                  receiveShadow
                >
                  <meshStandardMaterial 
                    vertexColors
                    metalness={0.3}
                    roughness={0.4}
                  />
                </mesh>
              </RigidBody>
            </Draggable>
          ))}
        </Physics>
        <Environment preset="sunset" background/>
      </Suspense>
    </Canvas>

    {showDrawingBoard && (
      <div className="fixed top-0 right-0 p-4 bg-black bg-opacity-70 text-white rounded-lg shadow-lg z-50">
        <DrawingBoard 
          onDrawingComplete={handleDrawingComplete}
          onClear={() => {
            // Remove the last drawn object
            setDrawnObjects(prev => prev.slice(0, -1));
          }}
        />
        <div className="mt-4">
          <div className="mb-2">
            <button
              className="w-full px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded flex items-center justify-between"
              onClick={() => setShowObjectList(prev => !prev)}
            >
              <span className="font-semibold">3D Render Objects ({drawnObjects.length})</span>
              <span>{showObjectList ? '▼' : '▶'}</span>
            </button>
            {showObjectList && (
              <div className="mt-2 max-h-40 overflow-y-auto border rounded bg-white">
                {drawnObjects.map((_, index) => (
                  <div key={index} className="flex items-center justify-between py-1 px-2 hover:bg-gray-100">
                    <span>Object {index + 1}</span>
                    <button
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                      onClick={() => deleteDrawnObject(index)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {drawnObjects.length > 0 && (
            <button
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              onClick={deleteAllDrawnObjects}
            >
              Delete All Objects
            </button>
          )}
        </div>
        <button
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          onClick={() => setShowDrawingBoard(false)}
        >
          Close Drawing Board
        </button>
      </div>
    )}

    <div className="fixed bottom-4 right-4 z-50">
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        onClick={() => setShowDrawingBoard(true)}
      >
        Open Drawing Board
      </button>
    </div>
    </div>
  );
}