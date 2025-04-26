import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { getCurrentUser, verifySecretKey, isAuthor } from '../utils/auth';
import PokemonSlider from '../components/PokemonSlider';
import MediaUploader from '../components/MediaUploader';
import PostFlags from '../components/PostFlags';

export default function EditPostPage({ context }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    video_url: ''
  });
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedFlags, setSelectedFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState(null);
  const [secretKey, setSecretKey] = useState('');
  const [secretKeyVerified, setSecretKeyVerified] = useState(false);
  const [allFlags, setAllFlags] = useState([]);

  // Get current user
  const user = context?.user || getCurrentUser();

  useEffect(() => {
    fetchPost();
    fetchFlags();
  }, [id]);

  async function fetchFlags() {
    try {
      const { data, error } = await supabase
        .from('post_flags')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setAllFlags(data || []);
    } catch (error) {
      console.error('Error fetching flags:', error.message);
    }
  }

  async function fetchPost() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Check if user is authorized to edit this post
      if (user.useSecretKey) {
        // In secret key mode, we'll verify the key before allowing edits
        setSecretKeyVerified(false);
      } else if (!isAuthor(data)) {
        // In user ID mode, verify if the current user is the author
        setError('You are not authorized to edit this post');
        return;
      }
      
      setFormData({
        title: data.title || '',
        content: data.content || '',
        image_url: data.image_url || '',
        video_url: data.video_url || ''
      });
      
      // Set selected Pokemon
      if (data.pokemon_id) {
        setSelectedPokemon({
          id: data.pokemon_id,
          name: data.pokemon_name,
          image: data.pokemon_image
        });
      }
      
      // Set selected flags
      if (data.flags && Array.isArray(data.flags)) {
        // We need to fetch the flag objects based on their names
        const flagObjects = allFlags.filter(flag => data.flags.includes(flag.name));
        setSelectedFlags(flagObjects);
      }
      
    } catch (error) {
      console.error('Error fetching post:', error.message);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
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

  const handleVerifySecretKey = async (e) => {
    e.preventDefault();
    
    if (!secretKey.trim()) return;
    
    try {
      setUpdateLoading(true);
      const isValid = await verifySecretKey(id, secretKey, 'posts');
      
      if (isValid) {
        setSecretKeyVerified(true);
      } else {
        alert('Invalid secret key');
      }
    } catch (error) {
      console.error('Error verifying secret key:', error);
      alert('Error verifying secret key');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      setError('Post title is required');
      return;
    }

    try {
      setUpdateLoading(true);
      setError(null);
      
      // Build update object
      const updates = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        image_url: formData.image_url,
        video_url: formData.video_url,
        updated_at: new Date(),
        flags: selectedFlags.map(flag => flag.name)
      };
      
      // Only update Pokemon data if a Pokemon is selected
      if (selectedPokemon) {
        updates.pokemon_id = selectedPokemon.id;
        updates.pokemon_name = selectedPokemon.name;
        updates.pokemon_image = selectedPokemon.image;
      }

      // Update the post in Supabase
      const { error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      // Navigate to the updated post page
      navigate(`/post/${id}`);
      
    } catch (error) {
      console.error('Error updating post:', error.message);
      setError(`Error updating post: ${error.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-animation">
          <div className="pokeball-loader"></div>
        </div>
        <p className="loading-text">Loading post...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h1 className="error-title">Error</h1>
        <p className="error-message">{error}</p>
        <Link to={`/post/${id}`} className="primary-button">Back to Post</Link>
      </div>
    );
  }
  // If using secret key mode and not verified yet, show verification form
  if (user.useSecretKey && !secretKeyVerified) {
    return (
      <div className="create-post-container">
        <h1 className="page-title">Verify Secret Key</h1>
        <p>Please enter the secret key for this post to continue:</p>
        
        <form onSubmit={handleVerifySecretKey} className="post-form">
          <div className="form-group">
            <label htmlFor="secretKey">Secret Key</label>
            <input
              type="text"
              id="secretKey"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter your secret key"
              className="form-input"
              required
              autoFocus
            />
          </div>
          
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(`/post/${id}`)}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={updateLoading}
            >
              {updateLoading ? 'Verifying...' : 'Verify Key'}
            </button>
          </div>
        </form>
      </div>
    );
  }  return (
    <div className="create-post-container">
      <h1 className="page-title">Edit Post</h1>
      
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
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={() => navigate(`/post/${id}`)}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-button"
            disabled={updateLoading}
          >
            {updateLoading ? 'Saving...' : 'Update Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
