import React from 'react';
import './HelloMessage.css';

const HelloMessage = ({ greeting, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="hello-message loading">
        <div className="spinner"></div>
        <p>Loading message from server...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hello-message error">
        <div className="error-icon">!</div>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="hello-message">
      <div className="message-container">
        <h2>{greeting.message}</h2>
        <p className="timestamp">Received at: {new Date(greeting.timestamp).toLocaleString()}</p>
      </div>
    </div>
  );
};

export default HelloMessage;