import React, { useState } from 'react';

/**
 * Component for selecting which Hyperfy world to connect to
 * @param {Object} props - Component properties
 * @param {Array} props.worlds - List of available worlds
 * @param {string} props.selectedWorld - ID of the currently selected world
 * @param {Function} props.onSelect - Function to call when a world is selected
 * @param {Function} props.onCustomUrlChange - Function to call when custom URL changes
 */
function WorldSelector({ worlds, selectedWorld, onSelect, onCustomUrlChange }) {
  const [customUrl, setCustomUrl] = useState('');
  
  const handleSelectChange = (e) => {
    const value = e.target.value;
    onSelect(value);
  };
  
  const handleCustomUrlChange = (e) => {
    const url = e.target.value;
    setCustomUrl(url);
    if (onCustomUrlChange) {
      onCustomUrlChange(url);
    }
  };
  
  return (
    <div className="world-selector">
      <div>
        <label htmlFor="world-select">Select World:</label>
        <select 
          id="world-select"
          value={selectedWorld}
          onChange={handleSelectChange}
          className="world-select-dropdown"
        >
          {worlds.map((world) => (
            <option key={world.id} value={world.id}>
              {world.name}
            </option>
          ))}
        </select>
      </div>
      
      {selectedWorld === 'custom' && (
        <div className="custom-url-input">
          <label htmlFor="custom-url">Custom URL:</label>
          <input
            type="url"
            id="custom-url"
            placeholder="https://your-hyperfy-world.com"
            value={customUrl}
            onChange={handleCustomUrlChange}
            className="custom-url-field"
          />
        </div>
      )}
    </div>
  );
}

export default WorldSelector; 