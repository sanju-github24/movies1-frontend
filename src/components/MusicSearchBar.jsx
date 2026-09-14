import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

/**
 * The music section's own search field.
 *
 * The rail's search row already knows to send a query to /music/search while
 * you are in the music section, but it is a panel you have to open, two clicks
 * from a page whose whole subject is finding something to listen to. This puts
 * the field on the page itself.
 *
 * `initialQuery` seeds the box on the results page, so a search can be refined
 * where its results are rather than started over somewhere else.
 */
export default function MusicSearchBar({ initialQuery = '', autoFocus = false, accent = '94, 234, 212' }) {
  const [term, setTerm] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Follow the URL: arriving at a new results page, or going back to a previous
  // one, should leave the box showing the search you are actually looking at.
  useEffect(() => { setTerm(initialQuery); }, [initialQuery]);

  const submit = (e) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    inputRef.current?.blur();   // on a phone, drop the keyboard over the results
    navigate(`/music/search?find=${encodeURIComponent(q)}`);
  };

  const clear = () => {
    setTerm('');
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: focused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? `rgba(${accent}, 0.45)` : 'rgba(255,255,255,0.07)'}`,
        boxShadow: focused ? `0 0 0 3px rgba(${accent}, 0.10)` : 'none',
        borderRadius: 16, padding: '12px 14px',
        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
      }}
    >
      <Search size={16} style={{ color: `rgb(${accent})`, flexShrink: 0 }} aria-hidden="true" />

      <input
        ref={inputRef}
        type="search"
        value={term}
        autoFocus={autoFocus}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search songs, albums, artists…"
        aria-label="Search music"
        style={{
          flex: 1, minWidth: 0,
          background: 'none', border: 'none', outline: 'none',
          color: 'white', fontSize: 14, fontWeight: 500,
          // Safari draws its own clear button on type=search, next to ours.
          WebkitAppearance: 'none', appearance: 'none',
        }}
      />

      {term && (
        <button
          type="button" onClick={clear} aria-label="Clear search"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <X size={13} />
        </button>
      )}

      <button
        type="submit" disabled={!term.trim()} aria-label="Search"
        style={{
          flexShrink: 0, border: 'none', borderRadius: 11,
          padding: '8px 16px', fontSize: 12, fontWeight: 800,
          letterSpacing: '0.04em',
          background: term.trim() ? `rgb(${accent})` : 'rgba(255,255,255,0.07)',
          color: term.trim() ? '#06201c' : 'rgba(255,255,255,0.25)',
          cursor: term.trim() ? 'pointer' : 'default',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        Search
      </button>

      {/* Safari's own clear affordance on a type=search input, removed so it
          does not sit beside the one above. */}
      <style>{`
        input[type="search"]::-webkit-search-decoration,
        input[type="search"]::-webkit-search-cancel-button,
        input[type="search"]::-webkit-search-results-button,
        input[type="search"]::-webkit-search-results-decoration { -webkit-appearance: none; display: none; }
      `}</style>
    </form>
  );
}
