import { useState, useEffect } from 'react';
import { getCurrentUser } from '../utils/auth';
import { supabase } from '../utils/supabase';

export default function UserPreferences({ onClose }) {
  const [preferences, setPreferences] = useState({
    colorScheme: 'default',
    showContentOnFeed: false,
    showImagesOnFeed: true
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUserPreferences();
  }, []);
  
  const fetchUserPreferences = async () => {
    const user = getCurrentUser();
    
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check if user already has preferences saved
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {  // PGRST116 is "no rows returned" error
        throw error;
      }
      
      // If we found preferences, use them
      if (data) {
        setPreferences({
          colorScheme: data.color_scheme || 'default',
          showContentOnFeed: data.show_content_on_feed || false,
          showImagesOnFeed: data.show_images_on_feed || true
        });
      }
      
      // Apply color scheme immediately
      document.documentElement.setAttribute('data-theme', data?.color_scheme || 'default');
      
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const savePreferences = async () => {
    const user = getCurrentUser();
    
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          color_scheme: preferences.colorScheme,
          show_content_on_feed: preferences.showContentOnFeed,
          show_images_on_feed: preferences.showImagesOnFeed
        });
      
      if (error) throw error;
      
      // Apply color scheme immediately
      document.documentElement.setAttribute('data-theme', preferences.colorScheme);
      
      if (onClose) onClose(preferences);
      
    } catch (error) {
      console.error('Error saving user preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="preferences-modal">
      <div className="preferences-content">
        <h2>Customize Interface</h2>
        
        <div className="preferences-group">
          <label>Color Theme</label>
          <div className="color-scheme-options">
            <button 
              className={`color-scheme-option ${preferences.colorScheme === 'default' ? 'selected' : ''}`} 
              onClick={() => setPreferences({...preferences, colorScheme: 'default'})}
            >
              <span className="color-preview default"></span>
              <span>Default</span>
            </button>
            <button 
              className={`color-scheme-option ${preferences.colorScheme === 'dark' ? 'selected' : ''}`} 
              onClick={() => setPreferences({...preferences, colorScheme: 'dark'})}
            >
              <span className="color-preview dark"></span>
              <span>Dark</span>
            </button>
            <button 
              className={`color-scheme-option ${preferences.colorScheme === 'colorful' ? 'selected' : ''}`} 
              onClick={() => setPreferences({...preferences, colorScheme: 'colorful'})}
            >
              <span className="color-preview colorful"></span>
              <span>Colorful</span>
            </button>
          </div>
        </div>
        
        <div className="preferences-group">
          <label>Home Feed Settings</label>
          <div className="preference-toggle">
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={preferences.showContentOnFeed} 
                onChange={() => setPreferences({
                  ...preferences, 
                  showContentOnFeed: !preferences.showContentOnFeed
                })}
              />
              <span className="toggle-slider"></span>
            </label>
            <span>Show post content on feed</span>
          </div>
          
          <div className="preference-toggle">
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={preferences.showImagesOnFeed} 
                onChange={() => setPreferences({
                  ...preferences, 
                  showImagesOnFeed: !preferences.showImagesOnFeed
                })}
              />
              <span className="toggle-slider"></span>
            </label>
            <span>Show images on feed</span>
          </div>
        </div>
        
        <div className="preferences-actions">
          <button 
            className="secondary-button" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="primary-button" 
            onClick={savePreferences}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
