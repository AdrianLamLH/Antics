import React, { useState, useEffect } from 'react';
import styles from '../styles/CharacterCustomization.module.css';

export default function CharacterCustomization({ onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [characterConfig, setCharacterConfig] = useState({
    personality: '',
    biography: '',
    attributes: [
      { name: 'Health', value: 100, max: 100 },
      { name: 'Energy', value: 100, max: 100 }
    ],
    customActions: []
  });

  // Update parent component when config changes
  useEffect(() => {
    onUpdate(characterConfig);
  }, [characterConfig, onUpdate]);

  const handlePersonalityChange = (e) => {
    setCharacterConfig({...characterConfig, personality: e.target.value});
  };

  const handleBiographyChange = (e) => {
    setCharacterConfig({...characterConfig, biography: e.target.value});
  };

  const handleAttributeChange = (index, field, value) => {
    const updatedAttributes = [...characterConfig.attributes];
    updatedAttributes[index] = {...updatedAttributes[index], [field]: value};
    setCharacterConfig({...characterConfig, attributes: updatedAttributes});
  };

  const addAttribute = () => {
    setCharacterConfig({
      ...characterConfig,
      attributes: [...characterConfig.attributes, { name: '', value: 0, max: 100 }]
    });
  };

  const removeAttribute = (index) => {
    const updatedAttributes = [...characterConfig.attributes];
    updatedAttributes.splice(index, 1);
    setCharacterConfig({...characterConfig, attributes: updatedAttributes});
  };

  const addCustomAction = () => {
    setCharacterConfig({
      ...characterConfig,
      customActions: [...characterConfig.customActions, { name: '', description: '' }]
    });
  };

  const updateCustomAction = (index, field, value) => {
    const updatedActions = [...characterConfig.customActions];
    updatedActions[index] = {...updatedActions[index], [field]: value};
    setCharacterConfig({...characterConfig, customActions: updatedActions});
  };

  const removeCustomAction = (index) => {
    const updatedActions = [...characterConfig.customActions];
    updatedActions.splice(index, 1);
    setCharacterConfig({...characterConfig, customActions: updatedActions});
  };

  return (
    <div className={styles.customizationContainer}>
      <button 
        className={styles.toggleButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? 'Hide Character Settings' : 'Customize Character'}
      </button>
      
      {isOpen && (
        <div className={styles.customizationPanel}>
          <h2>Character Customization</h2>
          
          <div className={styles.section}>
            <h3>Personality</h3>
            <textarea 
              className={styles.textareaField}
              value={characterConfig.personality}
              onChange={handlePersonalityChange}
              placeholder="Describe the character's personality traits..."
              rows={3}
            />
          </div>
          
          <div className={styles.section}>
            <h3>Biography</h3>
            <textarea 
              className={styles.textareaField}
              value={characterConfig.biography}
              onChange={handleBiographyChange}
              placeholder="Write a short biography for the character..."
              rows={4}
            />
          </div>
          
          <div className={styles.section}>
            <h3>Attributes</h3>
            {characterConfig.attributes.map((attr, index) => (
              <div key={index} className={styles.attributeRow}>
                <input 
                  className={styles.inputField}
                  type="text"
                  value={attr.name}
                  onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                  placeholder="Attribute name"
                />
                <input 
                  className={styles.inputField}
                  type="number"
                  value={attr.value}
                  onChange={(e) => handleAttributeChange(index, 'value', parseInt(e.target.value))}
                  min="0"
                  max={attr.max}
                />
                <input 
                  className={styles.inputField}
                  type="number"
                  value={attr.max}
                  onChange={(e) => handleAttributeChange(index, 'max', parseInt(e.target.value))}
                  min="1"
                />
                <button 
                  className={styles.actionButton}
                  onClick={() => removeAttribute(index)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button 
              className={styles.addButton}
              onClick={addAttribute}
            >
              Add Attribute
            </button>
          </div>
          
          <div className={styles.section}>
            <h3>Custom Actions</h3>
            <p className={styles.note}>Define additional actions beyond the standard movement controls</p>
            
            {characterConfig.customActions.map((action, index) => (
              <div key={index} className={styles.actionRow}>
                <input 
                  className={styles.inputField}
                  type="text"
                  value={action.name}
                  onChange={(e) => updateCustomAction(index, 'name', e.target.value)}
                  placeholder="Action name (e.g., pickup, use, talk)"
                />
                <input 
                  className={styles.inputField}
                  type="text"
                  value={action.description}
                  onChange={(e) => updateCustomAction(index, 'description', e.target.value)}
                  placeholder="Description (e.g., Pick up nearby objects)"
                />
                <button 
                  className={styles.actionButton}
                  onClick={() => removeCustomAction(index)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button 
              className={styles.addButton}
              onClick={addCustomAction}
            >
              Add Custom Action
            </button>
          </div>
        </div>
      )}
    </div>
  );
}