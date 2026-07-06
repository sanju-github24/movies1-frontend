import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function MusicRowItem({ track }) {
  const navigate = useNavigate();

  const handleRowClick = () => {
    navigate(`/music/track/${track.id}`);
  };

  return (
    <div 
      onClick={handleRowClick}
      className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex items-center space-x-4 cursor-pointer hover:border-slate-700 hover:bg-slate-900/60 transition-all group"
    >
      <img 
        src={track.poster} 
        alt={track.title} 
        className="w-16 h-16 object-cover rounded-md border border-slate-800 group-hover:scale-105 transition-transform"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-200 truncate group-hover:text-teal-400 transition-colors">
          {track.title} <span className="text-xs text-slate-500 font-normal">{track.subtitle || ''}</span>
        </h3>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{track.artist}</p>
        <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          {track.tracks || '1 Track'}
        </span>
      </div>
    </div>
  );
}