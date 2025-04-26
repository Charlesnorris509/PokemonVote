// Database setup script for Supabase
// Run this in the Supabase SQL Editor

-- Update the existing posts table with new fields
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS secret_key VARCHAR(10),
ADD COLUMN IF NOT EXISTS flags TEXT[], -- Array of flags like 'Question', 'Opinion', etc.
ADD COLUMN IF NOT EXISTS referenced_post_id UUID REFERENCES posts(id), -- For reposting functionality
ADD COLUMN IF NOT EXISTS color_scheme VARCHAR(20), -- For UI customization
ADD COLUMN IF NOT EXISTS video_url TEXT, -- For embedding web videos
ADD COLUMN IF NOT EXISTS username VARCHAR(50); -- Display name for the user

-- Update the comments table
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS secret_key VARCHAR(10),
ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- Create a new table for user preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  color_scheme VARCHAR(50) DEFAULT 'default',
  show_content_on_feed BOOLEAN DEFAULT false,
  show_images_on_feed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a new table for post flags (categories)
CREATE TABLE IF NOT EXISTS post_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default flags
INSERT INTO post_flags (name, description, color)
VALUES 
  ('Question', 'A question about Pokémon', '#3B82F6'),
  ('Opinion', 'Personal opinion or review', '#10B981'),
  ('News', 'Latest updates about Pokémon', '#F59E0B'),
  ('Discussion', 'Start a discussion with the community', '#8B5CF6'),
  ('Funny', 'Humorous content', '#EC4899'),
  ('Art', 'Fan art and creative content', '#6366F1')
ON CONFLICT (name) DO NOTHING;

-- Create a function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_posts') THEN
    CREATE TRIGGER set_timestamp_posts
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_comments') THEN
    CREATE TRIGGER set_timestamp_comments
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_user_preferences') THEN
    CREATE TRIGGER set_timestamp_user_preferences
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp();
  END IF;
END
$$;
