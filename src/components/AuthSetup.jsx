import { useState, useEffect } from 'react';
import { getCurrentUser, createUserSession } from '../utils/auth';

export default function AuthSetup({ onComplete }) {
  const [authMethod, setAuthMethod] = useState('random');
  const [username, setUsername] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    // Check if user already exists
    const user = getCurrentUser();
    if (user) {
      setIsComplete(true);
      if (onComplete) onComplete(user);
    }
  }, [onComplete]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const useSecretKey = authMethod === 'secret';
    const user = createUserSession(useSecretKey);
    
    // Store username if provided
    if (username) {
      const updatedUser = { ...user, username };
      localStorage.setItem('pokemon_vote_user', JSON.stringify(updatedUser));
    }
    
    setIsComplete(true);
    if (onComplete) onComplete(user);
  };
  
  if (isComplete) return null;
  
  return (
    <div className="auth-setup-overlay">
      <div className="auth-setup-modal">
        <h2>Welcome to PokemonVote!</h2>
        <p>Choose how you want to identify yourself:</p>
        
        <form onSubmit={handleSubmit}>
          <div className="auth-method-options">
            <label className="auth-option">
              <input
                type="radio"
                name="authMethod"
                value="random"
                checked={authMethod === 'random'}
                onChange={() => setAuthMethod('random')}
              />
              <div className="auth-option-content">
                <h3>Random ID</h3>
                <p>Get assigned a random user ID that will be linked to all your posts and comments.</p>
              </div>
            </label>
            
            <label className="auth-option">
              <input
                type="radio"
                name="authMethod"
                value="secret"
                checked={authMethod === 'secret'}
                onChange={() => setAuthMethod('secret')}
              />
              <div className="auth-option-content">
                <h3>Secret Key</h3>
                <p>Set a secret key for each post or comment to allow editing/deletion.</p>
              </div>
            </label>
          </div>
          
          <div className="form-group">
            <label htmlFor="username">Display Name (optional):</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter a display name"
              className="form-input"
            />
          </div>
          
          <button type="submit" className="auth-submit-btn">
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
}
