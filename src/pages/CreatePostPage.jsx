import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import PokemonSlider from '../components/PokemonSlider';
import MediaUploader from '../components/MediaUploader';
import PostFlags from '../components/PostFlags';
import { getCurrentUser, generateSecretKey } from '../utils/auth';

export default function CreatePostPage({ context }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    video_url: ''
  });
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedFlags, setSelectedFlags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [secretKey, setSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isReferencing, setIsReferencing] = useState(false);
  const [referencedPostData, setReferencedPostData] = useState(null);
  const [createdPostId, setCreatedPostId] = useState(null);
  
  // Get user from context
  const user = context?.user || getCurrentUser();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // If user is entering a post ID to reference, try to load it
    if (name === 'referenced_post_id' && value.length > 20) {
      fetchReferencedPost(value);
    }
  };
  
  const fetchReferencedPost = async (postId) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
        
      if (error) {
        setReferencedPostData(null);
        return;
      }
      
      setReferencedPostData(data);
    } catch (error) {
      console.error('Error fetching referenced post:', error);
      setReferencedPostData(null);
    }
  };
  
  const handleImageUpload = (url) => {
    setFormData({
      ...formData,
      image_url: url
    });
  };
  
  const handleVideoEmbed = (url) => {
    setFormData({
      ...formData,
      video_url: url
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      setError('Post title is required');
      return;
    }
      // Not validating referenced post since the database doesn't support it

    try {
      setLoading(true);
      setError(null);
      
      // Generate a secret key if user is in secret key mode
      const postSecretKey = user.useSecretKey ? generateSecretKey() : null;      // Insert the new post into Supabase
      const { data, error } = await supabase
        .from('posts')
        .insert([
          { 
            title: formData.title.trim(),
            content: formData.content.trim(),
            image_url: formData.image_url.trim(),
            upvotes: 0,
            pokemon_id: selectedPokemon?.id || null,
            pokemon_name: selectedPokemon?.name || null,
            pokemon_image: selectedPokemon?.image || null,
            flags: selectedFlags.length > 0 ? JSON.stringify(selectedFlags.map(flag => flag.name)) : null
          }
        ])
        .select();

      if (error) throw error;
      
      // If we have a secret key, show it to the user
      if (postSecretKey) {
        setSecretKey(postSecretKey);
        setShowSecretKey(true);
        // Save the created post ID for later navigation
        setCreatedPostId(data[0].id);
      } else {
        // Navigate to the new post page
        navigate(`/post/${data[0].id}`);
      }
    } catch (error) {
      console.error('Error creating post:', error.message);
      setError(`Error creating post: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle closing the secret key modal
  const handleCloseSecretModal = () => {
    setShowSecretKey(false);
    if (createdPostId) {
      navigate(`/post/${createdPostId}`);
    } else {
      navigate('/');
    }
  };
  
  return (
    <div className="create-post-container">
      <h1 className="page-title">Create Post</h1>
      
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="post-form">
        <div className="form-group">
          <label htmlFor="title">Title*</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter a title for your post"
            className="form-input"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Add some details to your post (optional)"
            className="form-textarea"
            rows="5"
          />
        </div>
        
        <div className="form-group">
          <label>Post Flags</label>
          <p className="form-description">Select categories for your post</p>
          <PostFlags
            selectedFlags={selectedFlags}
            onChange={setSelectedFlags}
          />
        </div>
        
        <div className="form-group">
          <label>Select a Pokemon</label>
          <PokemonSlider
            onSelect={setSelectedPokemon}
            selectedPokemon={selectedPokemon}
          />
          {selectedPokemon && (
            <div className="selected-pokemon-info">
              <p>Selected: <strong>{selectedPokemon.name}</strong></p>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label>Media</label>
          <MediaUploader
            onImageUpload={handleImageUpload}
            onVideoEmbed={handleVideoEmbed}
          />
          
          {formData.image_url && (
            <div className="media-preview">
              <img 
                src={formData.image_url} 
                alt="Preview" 
                className="image-preview" 
              />
              <button 
                type="button" 
                className="remove-media"
                onClick={() => setFormData({...formData, image_url: ''})}
              >
                Remove Image
              </button>
            </div>
          )}
          
          {formData.video_url && (
            <div className="media-preview">
              <div className="video-embed-preview">
                <p>Video URL: {formData.video_url}</p>
              </div>
              <button 
                type="button" 
                className="remove-media"
                onClick={() => setFormData({...formData, video_url: ''})}
              >
                Remove Video
              </button>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <div className="form-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isReferencing}
                onChange={() => setIsReferencing(!isReferencing)}
              />
              <span className="toggle-slider round"></span>
            </label>
            <span>Reference another post</span>
          </div>
          
          {isReferencing && (
            <div className="reference-post-section">
              <input
                type="text"
                id="referenced_post_id"
                name="referenced_post_id"
                value={formData.referenced_post_id}
                onChange={handleChange}
                placeholder="Enter the ID of the post you want to reference"
                className="form-input"
              />
              
              {referencedPostData && (
                <div className="referenced-post-preview">
                  <h4>Referenced Post:</h4>
                  <p><strong>{referencedPostData.title}</strong></p>
                  <p className="reference-author">By: {referencedPostData.username || 'Anonymous'}</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Posting...' : 'Create Post'}
          </button>
        </div>
      </form>
      
      {/* Secret Key Modal */}
      {showSecretKey && (
        <div className="secret-key-modal">
          <div className="secret-key-content">
            <h2>Post Created Successfully!</h2>
            <p>Your secret key for editing this post is:</p>
            <div className="secret-key-display">
              {secretKey}
            </div>
            <p className="secret-key-warning">
              Make sure to save this key! You'll need it to edit or delete your post.
            </p>
            <button 
              className="primary-button"
              onClick={handleCloseSecretModal}
            >
              I've Saved My Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
