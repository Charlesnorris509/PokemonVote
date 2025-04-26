import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { getCurrentUser, isAuthor, verifySecretKey } from '../utils/auth';

export default function PostDetailPage({ context }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [referencedPost, setReferencedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [upvoteLoading, setUpvoteLoading] = useState(false);
  const [error, setError] = useState(null);
  const [secretKey, setSecretKey] = useState('');
  const [showSecretKeyModal, setShowSecretKeyModal] = useState(false);  const [secretKeyAction, setSecretKeyAction] = useState(null);
  const [videoEmbedHtml, setVideoEmbedHtml] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    image_url: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  // Get current user
  const user = context?.user || getCurrentUser();
  
  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [id]);
    useEffect(() => {
    // Load referenced post if exists
    if (post?.referenced_post_id) {
      fetchReferencedPost(post.referenced_post_id);
    }
    
    // Generate video embed code if needed
    if (post?.video_url) {
      generateVideoEmbed(post.video_url);
    }
    
    // Initialize edit form data when post changes
    if (post) {
      setEditFormData({
        title: post.title || '',
        content: post.content || '',
        image_url: post.image_url || ''
      });
    }
  }, [post]);

  async function fetchPost() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setPost(data);
    } catch (error) {
      console.error('Error fetching post:', error.message);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  }
  
  async function fetchReferencedPost(referencedId) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', referencedId)
        .single();
      
      if (error) throw error;
      
      setReferencedPost(data);
    } catch (error) {
      console.error('Error fetching referenced post:', error.message);
    }
  }

  async function fetchComments() {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error.message);
    }
  }

  const handleUpvote = async () => {
    try {
      setUpvoteLoading(true);
      
      // Update the post with a new upvote count
      const { data, error } = await supabase
        .from('posts')
        .update({ upvotes: (post.upvotes || 0) + 1 })
        .eq('id', post.id)
        .select();
      
      if (error) throw error;
      
      // Update local state
      setPost({
        ...post,
        upvotes: data[0].upvotes
      });
      
    } catch (error) {
      console.error('Error upvoting post:', error.message);
      alert('Failed to upvote post');
    } finally {
      setUpvoteLoading(false);
    }
  };
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    try {
      setCommentLoading(true);
      
      // Insert new comment - only include fields that exist in the database schema
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: post.id,
            content: newComment.trim()
            // Note: user_id, username, and secret_key are not in the schema
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Clear the input field
      setNewComment('');
      
      // Refresh comments
      fetchComments();
      
    } catch (error) {
      console.error('Error posting comment:', error.message);
      alert('Failed to post comment: ' + error.message);
    } finally {
      setCommentLoading(false);
    }
  };
  
  const handleDeletePost = () => {
    if (user.useSecretKey) {
      setSecretKeyAction({
        type: 'delete_post',
        id: post.id
      });
      setShowSecretKeyModal(true);
    } else if (isAuthor(post)) {
      confirmDeletePost();
    } else {
      alert('You do not have permission to delete this post');
    }
  };
  const handleDeleteComment = (commentId) => {
    // Since we don't have user authentication in the schema,
    // allow direct deletion of comments
    confirmDeleteComment(commentId);
  };
  
  // Handle changes to edit form inputs
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };
  
  // Handle image upload in edit mode
  const handleEditImageUpload = (url) => {
    setEditFormData({
      ...editFormData,
      image_url: url
    });
  };
  
  // Handle update post submission
  const handleUpdatePost = async (e) => {
    e.preventDefault();
    
    if (!editFormData.title.trim()) {
      alert('Post title is required');
      return;
    }
    
    try {
      setUpdateLoading(true);
      
      // Update the post in Supabase
      const { data, error } = await supabase
        .from('posts')
        .update({
          title: editFormData.title.trim(),
          content: editFormData.content.trim(),
          image_url: editFormData.image_url.trim()
        })
        .eq('id', post.id)
        .select();
      
      if (error) throw error;
      
      // Update the local post state with the updated data
      setPost({
        ...post,
        ...data[0]
      });
      
      // Exit edit mode
      setEditMode(false);
      
    } catch (error) {
      console.error('Error updating post:', error.message);
      alert('Failed to update post: ' + error.message);
    } finally {
      setUpdateLoading(false);
    }
  };
  
  const confirmDeletePost = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
      
      if (error) throw error;
      
      // Navigate back to home page
      navigate('/');
      
    } catch (error) {
      console.error('Error deleting post:', error.message);
      alert('Failed to delete post');
    } finally {
      setLoading(false);
    }
  };
  
  const confirmDeleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      
      // Refresh comments
      fetchComments();
      
    } catch (error) {
      console.error('Error deleting comment:', error.message);
      alert('Failed to delete comment');
    }
  };
  
  const handleSecretKeySubmit = async (e) => {
    e.preventDefault();
    
    if (!secretKey.trim() || !secretKeyAction) return;
    
    try {
      if (secretKeyAction.type === 'delete_post') {
        const isValid = await verifySecretKey(secretKeyAction.id, secretKey, 'posts');
        
        if (isValid) {
          setShowSecretKeyModal(false);
          confirmDeletePost();
        } else {
          alert('Invalid secret key');
        }
      } else if (secretKeyAction.type === 'delete_comment') {
        const isValid = await verifySecretKey(secretKeyAction.id, secretKey, 'comments');
        
        if (isValid) {
          setShowSecretKeyModal(false);
          confirmDeleteComment(secretKeyAction.id);
        } else {
          alert('Invalid secret key');
        }
      }
    } catch (error) {
      console.error('Error verifying secret key:', error);
      alert('Error verifying secret key');
    }
  };
  
  const generateVideoEmbed = (url) => {
    if (!url) return '';
    
    // Simple parsing for YouTube and Vimeo URLs
    let embedHtml = '';
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // Extract video ID from YouTube URL
      let videoId = '';
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1];
      }
      
      if (videoId) {
        // Remove additional parameters
        videoId = videoId.split('&')[0];
        embedHtml = `<iframe 
          width="560" 
          height="315" 
          src="https://www.youtube.com/embed/${videoId}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>`;
      }
    } else if (url.includes('vimeo.com')) {
      // Extract video ID from Vimeo URL
      const vimeoId = url.split('vimeo.com/')[1];
      if (vimeoId) {
        embedHtml = `<iframe 
          src="https://player.vimeo.com/video/${vimeoId}" 
          width="560" 
          height="315" 
          frameborder="0" 
          allow="autoplay; fullscreen; picture-in-picture" 
          allowfullscreen
        ></iframe>`;
      }
    }
    
    setVideoEmbedHtml(embedHtml);
  };

  // Format post flags for display
  const formatFlags = (flags) => {
    if (!flags || !Array.isArray(flags) || flags.length === 0) return null;
    
    return (
      <div className="post-flags">
        {flags.map((flag, index) => (
          <span key={index} className="post-flag" style={{ backgroundColor: '#6366f1' }}>
            {flag}
          </span>
        ))}
      </div>
    );
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
  if (error || !post) {
    return (
      <div className="error-container">
        <h1 className="error-title">Error</h1>
        <p className="error-message">{error || 'Post not found'}</p>
        <Link to="/" className="primary-button">Back to Home</Link>
      </div>
    );
  }  return (
    <div className="create-post-container post-detail-container">
      {/* Referenced Post (if this is a repost/thread) */}
      {referencedPost && (
        <div className="referenced-post">
          <h3>Referenced Post:</h3>
          <Link to={`/post/${referencedPost.id}`} className="referenced-post-link">
            <h4>{referencedPost.title}</h4>
            {referencedPost.username && <p className="referenced-author">By: {referencedPost.username}</p>}
          </Link>
        </div>
      )}
      
      {/* Edit Mode Form */}
      {editMode ? (
        <form onSubmit={handleUpdatePost} className="post-form">
          <div className="form-group">
            <label htmlFor="title">Title*</label>
            <input
              type="text"
              id="title"
              name="title"
              value={editFormData.title}
              onChange={handleEditInputChange}
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
              value={editFormData.content}
              onChange={handleEditInputChange}
              placeholder="Add some details to your post (optional)"
              className="form-textarea"
              rows="5"
            />
          </div>
          
          <div className="form-group">
            <label>Media</label>
            <MediaUploader
              onImageUpload={handleEditImageUpload}
              onVideoEmbed={(url) => {}} // Not supported in edit mode
            />
            
            {editFormData.image_url && (
              <div className="media-preview">
                <img 
                  src={editFormData.image_url} 
                  alt="Preview" 
                  className="image-preview" 
                />
                <button 
                  type="button" 
                  className="remove-media"
                  onClick={() => setEditFormData({...editFormData, image_url: ''})}
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => setEditMode(false)}
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
      ) : (
        <>
          {/* Main Post Content (only shown when not in edit mode) */}
          <div className="post-header">
            <h1 className="post-title">{post.title}</h1>
            
            {formatFlags(post.flags)}
            
            <div className="post-meta">
              {post.username && <span className="post-author">By {post.username}</span>}
              <span className="post-date">
                {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
          
          {post.pokemon_name && (
            <div className="post-pokemon-info">
              <img
                src={post.pokemon_image}
                alt={post.pokemon_name}
                className="pokemon-image"
              />
              <span className="pokemon-name">{post.pokemon_name}</span>
            </div>
          )}
            <div className="post-content">
            {post.content && <p>{post.content}</p>}
            
            {post.image_url && (
              <div className="post-image-container">
                <img
                  src={post.image_url}
                  alt="Post attachment"
                  className="post-image"
                />
              </div>
            )}
            
            {videoEmbedHtml && (
              <div 
                className="post-video-container"
                dangerouslySetInnerHTML={{ __html: videoEmbedHtml }}
              />
            )}
          </div>
        </>
      )}
      <div className="post-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="left-actions">
          <button
            className="primary-button upvote-button"
            onClick={handleUpvote}
            disabled={upvoteLoading}
            style={{ marginRight: "0.5rem" }}
          >
            ❤️ {post.upvotes || 0} Upvotes
          </button>
          
          <Link to={`/create`} state={{ repost: post.id }} className="secondary-button" style={{ marginLeft: "0.5rem" }}>
            Repost
          </Link>
        </div>
          <div className="right-actions">
          {(isAuthor(post) || user.useSecretKey) && (
            <>
              <button 
                className="secondary-button edit-button" 
                style={{ marginRight: "0.5rem" }}
                onClick={() => setEditMode(true)}
              >
                Edit
              </button>
              <button
                onClick={handleDeletePost}
                className="delete-button secondary-button"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
        <div className="comments-section">
        <h2 className="section-title" style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '1.5rem', borderBottom: '2px solid #6366f1', paddingBottom: '0.5rem' }}>Comments</h2>
          <form onSubmit={handleCommentSubmit} className="comment-form">
          <div className="form-group">
            <label htmlFor="commentText" style={{ fontSize: '1.1rem', fontWeight: '600' }}>Add a comment</label>
            <textarea
              id="commentText"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              className="form-textarea comment-textarea"
              rows="3"
              style={{ fontSize: '1rem', padding: '12px' }}
            />
          </div>
          <div className="form-actions">
            <button
              type="submit"
              disabled={commentLoading || !newComment.trim()}
              className="primary-button comment-button"
              style={{
                fontSize: '1rem',
                padding: '10px 20px',
                fontWeight: '600',
                marginTop: '10px',
                width: '100%',
                maxWidth: '200px'
              }}
            >
              {commentLoading ? 'Posting...' : 'Add Comment'}
            </button>
          </div>
        </form>
        
        <div className="comments-list" style={{ marginTop: '2rem' }}>
          {comments.length === 0 ? (
            <p className="no-comments" style={{ fontSize: '1.1rem', fontStyle: 'italic', color: '#666' }}>No comments yet. Be the first to add one!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="comment" style={{ 
                padding: '1rem', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <div className="comment-header" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '0.8rem',
                  borderBottom: '1px solid #e9ecef',
                  paddingBottom: '0.5rem'
                }}>
                  <span className="comment-author" style={{ 
                    fontWeight: '600', 
                    fontSize: '1.05rem',
                    color: '#3730a3'
                  }}>
                    Anonymous
                  </span>
                  <span className="comment-date" style={{ 
                    color: '#6c757d',
                    fontSize: '0.9rem'
                  }}>
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="comment-content" style={{ 
                  fontSize: '1.1rem', 
                  lineHeight: '1.5',
                  marginBottom: '1rem',
                  color: '#212529',
                  whiteSpace: 'pre-line'
                }}>
                  {comment.content}
                </p>
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="secondary-button delete-comment-button"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.9rem',
                      backgroundColor: '#f8d7da',
                      color: '#721c24',
                      border: '1px solid #f5c6cb',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ marginRight: '4px' }}>🗑️</span> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        {/* Secret Key Modal */}
      {showSecretKeyModal && (
        <div className="secret-key-modal">
          <div className="secret-key-content" style={{ maxWidth: "500px", margin: "0 auto" }}>
            {secretKeyAction ? (
              <>
                <h2>Enter Secret Key</h2>
                <p>Please enter the secret key to continue:</p>
                  <form onSubmit={handleSecretKeySubmit} className="post-form">
                  <div className="form-group">
                    <label htmlFor="modalSecretKey">Secret Key</label>
                    <input
                      id="modalSecretKey"
                      type="text"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="Enter your secret key"
                      className="form-input"
                      autoFocus
                    />
                  </div>
                  
                  <div className="modal-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSecretKeyModal(false);
                        setSecretKeyAction(null);
                      }}
                      className="secondary-button"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="primary-button">
                      Submit
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2>Comment Added Successfully!</h2>
                <p>Your secret key for editing this comment is:</p>
                <div className="secret-key-display">
                  {secretKey}
                </div>
                <p className="secret-key-warning">
                  Make sure to save this key! You'll need it to delete your comment.
                </p>
                <button 
                  className="primary-button"
                  onClick={() => setShowSecretKeyModal(false)}
                >
                  I've Saved My Key
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
