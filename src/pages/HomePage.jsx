import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import PokemonSlider from '../components/PokemonSlider';
import PostFlags from '../components/PostFlags';

export default function HomePage({ context }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('created_at');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedFlags, setSelectedFlags] = useState([]);
  const [allFlags, setAllFlags] = useState([]);
  const [loadingFlags, setLoadingFlags] = useState(true);
  
  // Get user preferences from context
  const userPrefs = context?.userPrefs || {
    showContentOnFeed: false,
    showImagesOnFeed: true
  };

  useEffect(() => {
    fetchPosts();
    fetchFlags();
  }, [sortBy, selectedPokemon, selectedFlags]);

  async function fetchFlags() {
    try {
      setLoadingFlags(true);
      const { data, error } = await supabase
        .from('post_flags')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setAllFlags(data || []);
    } catch (error) {
      console.error('Error fetching flags:', error.message);
    } finally {
      setLoadingFlags(false);
    }
  }

  async function fetchPosts() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('posts')
        .select('*');
      
      // Apply sorting
      query = query.order(sortBy, { ascending: sortBy === 'created_at' ? false : true });
      
      // Filter by selected Pokemon if one is selected
      if (selectedPokemon) {
        query = query.eq('pokemon_id', selectedPokemon.id);
      }
      
      // Filter by selected flags if any are selected
      if (selectedFlags.length > 0) {
        // Filter posts that have at least one of the selected flags
        const flagNames = selectedFlags.map(flag => flag.name);
        query = query.overlaps('flags', flagNames);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error.message);
      alert('Error fetching posts. Please check console for details.');
    } finally {
      setLoading(false);
    }
  }

  // Filter posts by search term
  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle Pokemon selection
  const handlePokemonSelect = (pokemon) => {
    if (selectedPokemon && selectedPokemon.id === pokemon.id) {
      // If clicking the same Pokemon again, deselect it
      setSelectedPokemon(null);
    } else {
      setSelectedPokemon(pokemon);
    }
  };
  
  // Handle flag selection for filtering
  const handleFlagSelect = (flags) => {
    setSelectedFlags(flags);
  };
  
  // Clear all active filters
  const clearAllFilters = () => {
    setSelectedPokemon(null);
    setSelectedFlags([]);
    setSearchTerm('');
  };
  
  // Format flag display
  const formatFlags = (flags) => {
    if (!flags || !Array.isArray(flags) || flags.length === 0) return null;
    
    return (
      <div className="post-flags">
        {flags.map((flag, index) => (
          <span 
            key={index} 
            className="post-flag"
            style={{ 
              backgroundColor: allFlags.find(f => f.name === flag)?.color || '#6366f1' 
            }}
          >
            {flag}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h1 className="page-title">Pokemon Vote Feed</h1>
        
        <div className="featured-section">
          <h2 className="section-title">
            {selectedPokemon 
              ? `Showing posts for ${selectedPokemon.name}` 
              : 'Featured Pokemon'}
          </h2>
          <div className="pokemon-slider-wrapper">
            <PokemonSlider 
              onSelect={handlePokemonSelect} 
              selectedPokemon={selectedPokemon}
            />
          </div>
        </div>
        
        <div className="filter-section">
          <div className="filter-header">
            <h3 className="filter-title">Filter by category</h3>
            {(selectedPokemon || selectedFlags.length > 0 || searchTerm) && (
              <button 
                className="clear-filter-button"
                onClick={clearAllFilters}
              >
                Clear All Filters
              </button>
            )}
          </div>
          
          {loadingFlags ? (
            <div className="flags-loading-indicator">
              <div className="loading-spinner"></div>
              <span>Loading categories...</span>
            </div>
          ) : (
            <div className="flags-container">
              <PostFlags 
                selectedFlags={selectedFlags}
                onChange={handleFlagSelect}
              />
            </div>
          )}
        </div>
        
        <div className="search-sort-container">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search posts by title..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="sort-container">
            <label htmlFor="sort" className="sort-label">Sort by:</label>
            <select
              id="sort"
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="created_at">Most Recent</option>
              <option value="upvotes">Most Upvotes</option>
            </select>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-animation">
            <div className="pokeball-loader"></div>
          </div>
          <p className="loading-text">Loading posts...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="empty-container">
          <p style={{ fontSize: '1.125rem' }}>
            {selectedPokemon || selectedFlags.length > 0
              ? `No posts found matching your filters.` 
              : 'No posts found.'}
          </p>
          <Link to="/create" className="create-button">
            Create your first post
          </Link>
        </div>
      ) : (        <div className="posts-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '24px',
          margin: '24px 0'
        }}>
          {filteredPosts.map(post => (
            <Link 
              key={post.id} 
              to={`/post/${post.id}`}
              className="post-card"
              style={{ 
                display: 'block',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                textDecoration: 'none',
                color: 'inherit',
                height: '100%',
                border: '1px solid #e0e0e0'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              }}
            >
              {/* Media Section - Always show image if available */}
              {post.image_url && (
                <div className="post-image-container" style={{ 
                  width: '100%',
                  height: '180px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <img 
                    src={post.image_url} 
                    alt={post.title} 
                    className="post-image"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block'
                    }}
                  />
                </div>
              )}

              {/* Pokemon Image */}
              {post.pokemon_image && (
                <div className="post-pokemon" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px 0',
                  position: post.image_url ? 'absolute' : 'relative',
                  top: post.image_url ? '10px' : 'auto',
                  left: post.image_url ? '10px' : 'auto',
                  backgroundColor: post.image_url ? 'rgba(255,255,255,0.9)' : 'transparent',
                  borderRadius: post.image_url ? '30px' : '0'
                }}>
                  <img 
                    src={post.pokemon_image} 
                    alt={post.pokemon_name || 'Pokemon'} 
                    className="post-pokemon-image"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      marginRight: '8px',
                      border: '2px solid #6366f1'
                    }}
                  />
                  {post.pokemon_name && (
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      color: '#4338ca'
                    }}>
                      {post.pokemon_name}
                    </span>
                  )}
                </div>
              )}

              <div className="post-content" style={{ 
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                height: post.image_url ? 'auto' : '100%'
              }}>
                {/* Post Flags */}
                {formatFlags(post.flags) && (
                  <div style={{ marginBottom: '8px' }}>
                    {formatFlags(post.flags)}
                  </div>
                )}
                
                {/* Title */}
                <h2 className="post-title" style={{ 
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  margin: '0 0 10px 0',
                  color: '#111827',
                  lineHeight: '1.3'
                }}>{post.title}</h2>
                
                {/* Content */}
                {post.content && (
                  <div className="post-excerpt" style={{
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    color: '#4b5563',
                    marginBottom: '12px',
                    display: '-webkit-box',
                    WebkitLineClamp: '3',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {post.content}
                  </div>
                )}
                
                {/* Post Metadata */}                <div className="post-meta" style={{ 
                  marginTop: 'auto',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  color: '#6b7280',
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {post.username && (
                      <span className="post-author" style={{ fontWeight: '500' }}>
                        By: {post.username}
                      </span>
                    )}
                    <span className="post-date">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="post-upvotes" style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      color: '#ef4444',
                      fontWeight: '600'
                    }}>
                      <span style={{ marginRight: '3px' }}>❤️</span> {post.upvotes || 0}
                    </span>
                    
                    {post.referenced_post_id && (
                      <span className="post-reference-badge" style={{
                        backgroundColor: '#6366f1',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        Thread
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
