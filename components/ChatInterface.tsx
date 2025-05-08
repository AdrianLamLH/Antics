import React, { useEffect, useRef, useState } from 'react';

export default function ChatInterface({ 
  onSendMessage, 
  userMessage, 
  setUserMessage, 
  chatHistory,
  aiResponses,
  capturingViews,
  executings,
  characterIds = ["character1", "character2"]
}) {
  const chatEndRef = useRef(null);
  const [selectedRecipient, setSelectedRecipient] = useState("everyone");
  
  // Auto-scroll to the bottom when chat history updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, aiResponses]);
  
  // Handle input submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userMessage.trim()) return;
    
    onSendMessage(userMessage, selectedRecipient);
  };

  // Get the color for the message based on sender/recipient
  const getMessageColor = (msg) => {
    if (msg.sender === 'user') return 'bg-blue-800 bg-opacity-50 ml-8';
    if (msg.sender === 'character1') return 'bg-purple-800 bg-opacity-50 mr-8';
    if (msg.sender === 'character2') return 'bg-green-800 bg-opacity-50 mr-8';
    return 'bg-gray-800 bg-opacity-50 mr-8';
  };
  
  // Get the sender display name
  const getSenderName = (sender) => {
    if (sender === 'user') return 'You';
    if (sender === 'character1') return 'Character 1';
    if (sender === 'character2') return 'Character 2';
    return 'Unknown';
  };

  // Get message prefix based on target
  const getMessagePrefix = (msg) => {
    if (msg.sender === 'user' && msg.target && msg.target !== 'everyone') {
      return <span className="text-xs text-gray-400">[to {msg.target === 'character1' ? 'Character 1' : 'Character 2'}]</span>;
    }
    return null;
  };

  // Check if any characters are busy
  const isAnyCharacterBusy = Object.values(capturingViews).some(value => value) || 
                            Object.values(executings).some(value => value);

  return (
    <div className="bg-black bg-opacity-70 rounded-md p-3 max-h-60 overflow-y-auto w-full">
      <div className="flex mb-2 gap-2">
        <select 
          value={selectedRecipient}
          onChange={(e) => setSelectedRecipient(e.target.value)}
          className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700"
        >
          <option value="everyone">Everyone</option>
          <option value="character1">Character 1</option>
          <option value="character2">Character 2</option>
        </select>
        <div className="text-xs text-gray-400 flex items-center">
          {selectedRecipient === "everyone" ? "Message will be sent to all characters" : 
           `Message will be sent privately to ${selectedRecipient === "character1" ? "Character 1" : "Character 2"}`}
        </div>
      </div>
      
      <div className="space-y-2 mb-2 border-t border-gray-700 pt-2">
        {/* Display chat history */}
        {chatHistory.map((msg, index) => (
          <div 
            key={msg.id || `msg-${index}-${msg.timestamp || Date.now()}`} 
            className={`px-2 py-1 rounded ${getMessageColor(msg)}`}
          >
            <p className="text-sm text-gray-300 flex items-center gap-2">
              {getSenderName(msg.sender)}:
              {getMessagePrefix(msg)}
            </p>
            <p className="text-white">{msg.text}</p>
          </div>
        ))}
        
        {/* Auto-scroll anchor */}
        <div ref={chatEndRef} />
      </div>
      
      {/* Chat input form */}
      <form onSubmit={handleSubmit} className="flex bg-black bg-opacity-70 rounded-b-md overflow-hidden mt-2">
        <input
          type="text"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder={`Type a message to ${selectedRecipient === "everyone" ? "everyone" : selectedRecipient === "character1" ? "Character 1" : "Character 2"}...`}
          className="flex-grow bg-transparent border-none outline-none px-3 py-2 text-white"
          disabled={isAnyCharacterBusy}
        />
        <button
          type="submit"
          className={`px-4 py-2 ${
            isAnyCharacterBusy 
              ? 'bg-gray-700 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
          disabled={isAnyCharacterBusy}
        >
          {isAnyCharacterBusy ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );
}