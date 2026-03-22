import { useState, useEffect } from 'react';

export function usePlaylists() {
  const [playlists, setPlaylists] = useState(() => {
    const saved = localStorage.getItem('puja_playlists');
    // Data structure: [{ id: '123', name: 'Evening Puja', aartiIds: ['ganpati', 'shankar'] }]
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('puja_playlists', JSON.stringify(playlists));
  }, [playlists]);

  const createPlaylist = (name) => {
    if (!name.trim()) return;
    const newPlaylist = { id: Date.now().toString(), name, aartiIds: [] };
    setPlaylists([...playlists, newPlaylist]);
  };

  const deletePlaylist = (id) => {
    setPlaylists(playlists.filter(p => p.id !== id));
  };

  const toggleAartiInPlaylist = (playlistId, aartiId) => {
    setPlaylists(playlists.map(playlist => {
      if (playlist.id === playlistId) {
        const exists = playlist.aartiIds.includes(aartiId);
        return {
          ...playlist,
          aartiIds: exists
            ? playlist.aartiIds.filter(id => id !== aartiId) // Remove if exists
            : [...playlist.aartiIds, aartiId] // Add if not
        };
      }
      return playlist;
    }));
  };

  return { playlists, createPlaylist, deletePlaylist, toggleAartiInPlaylist };
}