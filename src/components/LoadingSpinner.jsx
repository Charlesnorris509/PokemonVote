import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="loading-container">
      <div className="loading-animation">
        <div className="pokeball-loader"></div>
      </div>
      <p className="loading-text">{message}</p>
    </div>
  );
}
