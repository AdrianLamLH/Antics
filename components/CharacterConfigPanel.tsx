import React, { useState } from 'react';

export default function CharacterConfigPanel({ 
  characterId, 
  initialConfig = {}, 
  onSave,
  onClose
}) {
  const [config, setConfig] = useState({
    personality: initialConfig.personality || '',
    biography: initialConfig.biography || '',
    goals: initialConfig.goals || '',
    speechStyle: initialConfig.speechStyle || '',
    customInstructions: initialConfig.customInstructions || '',
    ...initialConfig
  });
  
  const handleChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSave = () => {
    onSave(config);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Configure {characterId === 'character1' ? 'Character 1' : 'Character 2'}</h2>
          <button 
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-1">Personality</label>
            <input 
              type="text" 
              value={config.personality}
              onChange={(e) => handleChange('personality', e.target.value)}
              className="w-full bg-gray-700 p-2 rounded"
              placeholder="e.g. Friendly, curious, cautious"
            />
          </div>
          
          <div>
            <label className="block mb-1">Biography</label>
            <textarea 
              value={config.biography}
              onChange={(e) => handleChange('biography', e.target.value)}
              className="w-full bg-gray-700 p-2 rounded h-20"
              placeholder="Character's background story"
            />
          </div>
          
          <div>
            <label className="block mb-1">Goals</label>
            <input 
              type="text" 
              value={config.goals}
              onChange={(e) => handleChange('goals', e.target.value)}
              className="w-full bg-gray-700 p-2 rounded"
              placeholder="e.g. Explore the environment, help others"
            />
          </div>
          
          <div>
            <label className="block mb-1">Speech Style</label>
            <input 
              type="text" 
              value={config.speechStyle}
              onChange={(e) => handleChange('speechStyle', e.target.value)}
              className="w-full bg-gray-700 p-2 rounded"
              placeholder="e.g. Formal, casual, technical"
            />
          </div>
          
          <div>
            <label className="block mb-1">Custom Instructions</label>
            <textarea 
              value={config.customInstructions}
              onChange={(e) => handleChange('customInstructions', e.target.value)}
              className="w-full bg-gray-700 p-2 rounded h-32"
              placeholder="Additional instructions for the AI to follow when controlling this character"
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}