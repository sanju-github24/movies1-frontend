import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Music } from 'lucide-react';

export default function MusicNavbar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/music/search?find=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <>
      {/* Fixed navbar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        background: 'linear-gradient(90deg, #1d4ed8 0%, #1e40af 100%)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: 68, maxWidth: 1280, margin: '0 auto', gap: 16,
        }}>
          <Link to="/music" style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <img src="/logo_3.png" alt="logo" style={{ height: 52, objectFit: 'contain' }} />
          </Link>

          <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: 480, display: 'flex' }}>
            <input
              type="text"
              placeholder="Search Albums, Songs, Artists..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.12)',
                borderRight: 'none', borderRadius: '10px 0 0 10px', padding: '8px 14px',
                fontSize: 13, color: 'white', outline: 'none', transition: 'all 0.2s',
              }}
              onFocus={e => { e.target.style.background = 'white'; e.target.style.color = '#000'; }}
              onBlur={e => { e.target.style.background = 'rgba(255,255,255,0.13)'; e.target.style.color = 'white'; }}
            />
            <button type="submit" style={{
              background: '#1d4ed8', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '0 10px 10px 0', padding: '8px 18px',
              color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
              onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}
            >Search</button>
          </form>

          {/* Quick links — desktop only */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}
            className="hidden-mobile">
            <Link to="/" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
            >Home</Link>
            <Link to="/watch" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
            >Movies</Link>
            <Link to="/sports" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
            >Sports</Link>
            <Link to="/music" style={{ color: '#86efac', textDecoration: 'none', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Music size={14} /> Music
            </Link>
          </div>
        </div>

        <style>{`
          @media (max-width: 640px) {
            .hidden-mobile { display: none !important; }
          }
        `}</style>
      </nav>

      {/* Spacer so content starts below fixed navbar */}
      <div style={{ height: 68 }} />
    </>
  );
}