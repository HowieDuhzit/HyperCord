import React from 'react';

/**
 * Simple loading indicator component
 */
function LoadingIndicator() {
  return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Loading Hyperfy World...</p>
    </div>
  );
}

export default LoadingIndicator; 