// User authentication utilities
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';

// Check if a user session exists in local storage
export const getUserSession = () => {
  const session = localStorage.getItem('pokemon_vote_user');
  return session ? JSON.parse(session) : null;
};

// Create a new user session and save it
export const createUserSession = (useSecretKey = false) => {
  const userId = uuidv4();
  const sessionData = {
    id: userId,
    createdAt: new Date().toISOString(),
    useSecretKey,
  };
  
  localStorage.setItem('pokemon_vote_user', JSON.stringify(sessionData));
  return sessionData;
};

// Get the current user, creating one if none exists
export const getCurrentUser = () => {
  let user = getUserSession();
  
  if (!user) {
    user = createUserSession();
  }
  
  return user;
};

// Check if the current user is the author of a post/comment
export const isAuthor = (item) => {
  const user = getCurrentUser();
  return item && user && item.user_id === user.id;
};

// Generate a secret key for a post or comment
export const generateSecretKey = () => {
  // Generate a 6-character alphanumeric key
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Verify a secret key against a post or comment
export const verifySecretKey = async (itemId, secretKey, type = 'posts') => {
  try {
    const { data, error } = await supabase
      .from(type)
      .select('secret_key')
      .eq('id', itemId)
      .single();
      
    if (error) throw error;
    
    return data && data.secret_key === secretKey;
  } catch (error) {
    console.error(`Error verifying secret key:`, error);
    return false;
  }
};
