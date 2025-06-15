// fetchMovies.js
import { supabase } from './supabaseClient';

export const fetchMovies = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false }); // 🔁 get full list
  
    if (error) {
      console.error('Supabase fetch error:', error.message);
      return [];
    }
  
    return data;
  };
  
