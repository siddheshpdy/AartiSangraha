import React, { useState, useEffect } from 'react';

export default function PujaPlayer({ playlist, allAartya, onExit, AartiDetailComponent, theme, setTheme, script, setScript }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const currentAartiId = playlist.aartiIds[currentIndex];
  // Locate the specific Aarti data from your main JSON array
  const currentAarti = allAartya.find(a => a.id === currentAartiId || a.slug === currentAartiId);

  const handleNext = () => {
    if (currentIndex < playlist.aartiIds.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo(0, 0); // Reset scroll position for next Aarti
    } else {
      onExit(); // Finish puja sequence
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  // Dynamically calculate the active theme colors instead of relying on missing CSS variables
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) || document.body.classList.contains('dark');
  const bgColor = isDark ? '#111827' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const barBgColor = isDark ? '#1f2937' : '#f3f4f6';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  if (!playlist.aartiIds || playlist.aartiIds.length === 0) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: bgColor, color: textColor }}>
        <p style={{ fontSize: '1.2rem', marginBottom: '16px' }}>This sequence is empty.</p>
        <button onClick={onExit} style={{ padding: '8px 16px', background: '#e65100', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', backgroundColor: bgColor, color: textColor, overflowY: 'auto' }}>
      {/* Top Navigation Bar */}
      <div style={{ position: 'sticky', top: 0, background: barBgColor, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderColor}`, zIndex: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', margin: 0, color: '#e65100' }}>{playlist.name}</h2>
          <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            Aarti {currentIndex + 1} of {playlist.aartiIds.length}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setTheme(prev => {
              if (prev === 'light') return 'dark';
              if (prev === 'dark') return 'system';
              return 'light';
            })}
            aria-label="Toggle Theme"
            title={`Theme: ${theme}`}
            style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
          >
            {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
          </button>
          <button
            onClick={() => setScript(prev => prev === 'devanagari' ? 'latin' : 'devanagari')}
            aria-label="Toggle Script"
            title={script === 'devanagari' ? "Read in English" : "Read in Marathi"}
            style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', padding: '4px', color: 'inherit' }}
          >
            {script === 'devanagari' ? 'A' : 'अ'}
          </button>
          <button onClick={onExit} style={{ color: '#ef4444', fontWeight: 'bold', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', marginLeft: '5px' }}>✖ Exit</button>
        </div>
      </div>

      {/* Dynamic Aarti Content Rendering */}
      <div style={{ flexGrow: 1, padding: '16px', paddingBottom: '80px' }}>
        {currentAarti ? <AartiDetailComponent aarti={currentAarti} /> : <p>Aarti not found.</p>}
      </div>

      {/* Bottom Sequential Controls */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: barBgColor, padding: '16px', display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${borderColor}`, boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' }}>
        <button onClick={handlePrev} disabled={currentIndex === 0} 
          style={{ padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', background: currentIndex === 0 ? borderColor : '#ffcc80', color: currentIndex === 0 ? '#888' : '#e65100' }}>
          ◀ Previous
        </button>
        <button onClick={handleNext} 
          style={{ padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: '#e65100', color: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
          {currentIndex === playlist.aartiIds.length - 1 ? 'Finish Puja 🕉️' : 'Next Aarti ▶'}
        </button>
      </div>
    </div>
  );
}