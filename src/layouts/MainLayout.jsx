import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

export default function MainLayout({ context }) {
  const { user, openPreferences } = context || {};
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Get user data if not provided in context
  const userData = user || getCurrentUser();
  
  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
      <header className="header">
        <div className="header-container container">
          <Link to="/" className="site-title">
            <span>🐾</span>
            PokemonVote
          </Link>
          <nav className="nav">
            <Link to="/" className="nav-link">
              Home
            </Link>
            <Link to="/create" className="nav-link">
              Create Post
            </Link>
            
            <div className="user-menu-container">
              <button 
                className="user-button" 
                onClick={toggleUserMenu}
                aria-label="User menu"
              >
                <span className="user-icon">👤</span>
                {userData?.username && <span className="user-name">{userData.username}</span>}
              </button>
              
              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-info">
                    <p className="user-id">ID: {userData?.id?.substring(0, 8)}...</p>
                    {userData?.useSecretKey ? (
                      <span className="auth-badge secret">Secret Key Mode</span>
                    ) : (
                      <span className="auth-badge user-id">User ID Mode</span>
                    )}
                  </div>
                  <button 
                    className="dropdown-item preferences-button" 
                    onClick={() => {
                      openPreferences();
                      setShowUserMenu(false);
                    }}
                  >
                    Customize Interface
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
      
      <main className="container main-content" style={{ flex: '1 0 auto' }}>
        <Outlet />
      </main>
      
      <footer className="footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} PokemonVote - Share and vote for your favorite Pokemon posts</p>
        </div>
      </footer>
    </div>
  );
}
