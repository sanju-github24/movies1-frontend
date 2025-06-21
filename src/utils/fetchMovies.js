// fetchMovies.js
import { supabase } from './supabaseClient';

/**
 * Fetch movies from Supabase.
 *
 * @param {Object} opts
 * @param {boolean} opts.homepage   – if true, return only movies that should show on the home page
 * @param {number}  opts.limit      – max rows to return (ignored when homepage=false)
 * @returns {Promise<Array>}        – list of movie rows
 */
export const fetchMovies = async (opts = {}) => {
  const {
    homepage = false,   // set to true to fetch homepage “featured” movies
    limit = 10,         // only applies when homepage=true
  } = opts;

  // 📥 base query
  let query = supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false });

  // 🏠 homepage filter
  if (homepage) {
    query = query.eq('showOnHomepage', true).limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase fetch error:', error.message);
    return [];
  }

  return data ?? [];
};

