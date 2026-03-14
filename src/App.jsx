// src/App.jsx
import React, { useState, useEffect } from 'react';
import aartiData from './data/aartis.json'; // Direct import

function App() {
  const [query, setQuery] = useState("");

  // Ensure aartiData exists and is an array before filtering
  const filtered = (aartiData || []).filter(a => 
    a.title?.toLowerCase().includes(query.toLowerCase()) || 
    a.deity?.toLowerCase().includes(query.toLowerCase())
  );

  if (!aartiData || aartiData.length === 0) {
    return <div>Loading aartis or no aartis found... Check src/content/ folder.</div>;
  }

  return (
    <div className="app-container">
      <header className="sticky-header">
        <h1>Aarti Sangraha</h1>
        <input 
          type="text" 
          placeholder="Search deity or title..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
      </header>
      <div className="aarti-list">
        {filtered.map(aarti => (
          <article key={aarti.id} className="aarti-card">
            <h2 className="aarti-title">{aarti.title}</h2>
            {aarti.deity && <h3 className="aarti-deity">{aarti.deity}</h3>}
            <div className="aarti-lyrics">{aarti.lyrics}</div>
          </article>
        ))}
        {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>No aartis found matching "{query}"</p>}
      </div>
    </div>
  );
}

export default App;