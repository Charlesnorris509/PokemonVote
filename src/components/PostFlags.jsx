import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function PostFlags({ selectedFlags = [], onChange, multiSelect = true }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlags();
  }, []);

  async function fetchFlags() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('post_flags')
        .select('*')
        .order('name');

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error('Error fetching flags:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleFlagClick = (flag) => {
    if (multiSelect) {
      // For multi-select, toggle the selected flag
      const isSelected = selectedFlags.some(f => f.id === flag.id);
      const newSelected = isSelected
        ? selectedFlags.filter(f => f.id !== flag.id)
        : [...selectedFlags, flag];
      onChange(newSelected);
    } else {
      // For single-select, just select the clicked flag
      onChange([flag]);
    }
  };

  if (loading) {
    return <div className="skeleton-loader flags-loader"></div>;
  }

  return (
    <div className="post-flags-container">
      {flags.map(flag => (
        <button
          key={flag.id}
          className={`flag-button ${selectedFlags.some(f => f.id === flag.id) ? 'selected' : ''}`}
          style={{ 
            '--flag-color': flag.color || '#6366f1',
            '--flag-bg': `${flag.color}15` || '#6366f115'
          }}
          onClick={() => handleFlagClick(flag)}
          type="button"
        >
          {flag.name}
        </button>
      ))}
    </div>
  );
}
