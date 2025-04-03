/**
 * Animation mapping for different character models
 * Maps standard animation names to model-specific animation names
 */

const ANIMATION_MAPPINGS = {
  // Midoriya model animations
  "midoriya": {
    "idle": "Idle",
    "walk": "Walk",
    "run": "Run",
    "jump": "Jump",
    "attack": "Attack"
  },
  // Jinx model animations
  "jinx": {
    "idle": "Idle",
    "walk": "Walking",
    "run": "Running",
    "jump": "Jump",
    "attack": "Attack1", 
    "dance": "Dance"
  },
  // Maxwell model animations
  "maxwell": {
    "idle": "Idle",
    "walk": "Walking",
    "run": "Running",
    "jump": "Jump"
  },
  // Low poly character animations
  "low_poly": {
    "idle": "Idle",
    "walk": "Walking",
    "run": "Running",
    "jump": "Jump"
  },
  // Default mappings when no specific model is specified
  "default": {
    "idle": "idle",
    "walk": "walk",
    "run": "run",
    "jump": "jump"
  }
};

/**
 * Get the appropriate animation name for a given model and standard animation
 * @param {string} modelName - The name of the model (e.g., 'midoriya', 'jinx')
 * @param {string} standardAnim - The standard animation name (e.g., 'idle', 'walk')
 * @returns {string} The model-specific animation name
 */
export function getAnimationName(modelName, standardAnim) {
  // Extract model base name from path if needed
  if (modelName.includes('/')) {
    modelName = modelName.split('/').pop();
  }
  
  // Remove file extension if present
  if (modelName.endsWith('.glb') || modelName.endsWith('.gltf')) {
    modelName = modelName.substring(0, modelName.lastIndexOf('.'));
  }
  
  // Check if we have mappings for this model
  const modelMappings = ANIMATION_MAPPINGS[modelName.toLowerCase()] || ANIMATION_MAPPINGS.default;
  
  // Return the mapped animation name or the standard name if no mapping exists
  return modelMappings[standardAnim.toLowerCase()] || standardAnim;
}

export default ANIMATION_MAPPINGS;