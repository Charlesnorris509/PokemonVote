import { useState } from 'react';
import { supabase } from '../utils/supabase';

// Function to generate a unique ID without relying on the uuid package
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export default function MediaUploader({ onImageUpload, onVideoEmbed }) {
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('image');

  const handleImageUpload = async (event) => {
    try {
      setUploading(true);
      setUploadProgress(0);
      
      const file = event.target.files[0];
      if (!file) return;
      
      // Validate file type
      const fileExt = file.name.split('.').pop();
      const validFileTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      
      if (!validFileTypes.includes(fileExt.toLowerCase())) {
        throw new Error('Invalid file type. Please upload a JPG, PNG, GIF, or WEBP image.');
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File is too large. Maximum size is 5MB.');
      }        // Create a unique file name using our custom ID generator
      const fileName = `${generateUniqueId()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
        // Upload file to Supabase Storage      // First, check if the bucket exists and create it if necessary
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === 'Images');
      
      if (!bucketExists) {
        try {
          // Create the bucket if it doesn't exist
          await supabase.storage.createBucket('Images', {
            public: true,
            fileSizeLimit: 5242880 // 5MB in bytes
          });
        } catch (bucketError) {
          console.warn('Error creating bucket:', bucketError);
          // Continue anyway, it might already exist
        }
      }      const { error: uploadError } = await supabase.storage
        .from('Images')
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
        
      if (uploadError) throw uploadError;
      
      // Get the public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('Images')
        .getPublicUrl(filePath);
        
      // Pass the public URL to the parent component
      if (onImageUpload) onImageUpload(publicUrl);
      
    } catch (error) {
      console.error('Error uploading image:', error.message);
      alert(`Error uploading image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleVideoEmbed = () => {
    if (!videoUrl.trim()) return;
    
    // Simple validation for common video URLs
    const isYouTube = videoUrl.includes('youtube.com/') || videoUrl.includes('youtu.be/');
    const isVimeo = videoUrl.includes('vimeo.com/');
    
    if (!isYouTube && !isVimeo) {
      alert('Please enter a valid YouTube or Vimeo URL.');
      return;
    }
    
    // Pass the video URL to the parent component
    if (onVideoEmbed) onVideoEmbed(videoUrl);
    setVideoUrl('');
  };

  return (
    <div className="media-uploader">
      <div className="media-tabs">
        <button 
          className={`media-tab ${activeTab === 'image' ? 'active' : ''}`} 
          onClick={() => setActiveTab('image')}
        >
          Upload Image
        </button>
        <button 
          className={`media-tab ${activeTab === 'video' ? 'active' : ''}`} 
          onClick={() => setActiveTab('video')}
        >
          Embed Video
        </button>
      </div>
      
      <div className="media-content">
        {activeTab === 'image' ? (
          <div className="image-upload">
            <label className="file-input-label">
              <input 
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="file-input"
              />
              <span className="upload-icon">📁</span>
              <span>{uploading ? 'Uploading...' : 'Choose an image file'}</span>
            </label>
            
            {uploading && (
              <div className="upload-progress">
                <div 
                  className="progress-bar" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                <span className="progress-text">{uploadProgress}%</span>
              </div>
            )}
          </div>
        ) : (
          <div className="video-embed">
            <input
              type="text"
              placeholder="Paste YouTube or Vimeo URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="video-input"
            />
            <button 
              onClick={handleVideoEmbed} 
              className="video-button"
              disabled={!videoUrl.trim()}
            >
              Embed Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
