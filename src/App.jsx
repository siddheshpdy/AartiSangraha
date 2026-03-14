// src/App.jsx
import React, { useState, useEffect } from 'react';
import aartiData from './data/aartis.json'; // Direct import

function highlightText(text, highlight) {
  if (!text) return null;
  if (!highlight || !highlight.trim()) return text;
  
  text = String(text);
  
  // Escape special regex characters to prevent errors
  const escapedHighlight = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match start of string or any non-letter/number/mark character, followed by the search query
  const regex = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])(${escapedHighlight})`, 'giu');
  
  const parts = text.split(regex);
  
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    // Every 3rd element starting from index 2 is the actual matched text
    if (i % 3 === 2) {
      result.push(
        <mark key={i} style={{ backgroundColor: 'var(--color-border)', padding: '0 2px', borderRadius: '3px', color: 'inherit' }}>
          {parts[i]}
        </mark>
      );
    } else if (parts[i]) {
      // Push prefix or surrounding text
      result.push(parts[i]);
    }
  }
  
  return result;
}

const deityOrder = [
  "Ganpati",
  "shankar",
  "Devi",
  "Vitthal",
  "Datta",
  "Vishnu",
  "Krishna",
  "Ram",
  "Maruti",
  "Panchayatan",
  "Dnyaneshwar",
  "Others",
  "Gajanan Maharaj",
  "Mahalasa Narayani"
];

const sortedAartiData = [...(aartiData || [])].sort((a, b) => {
  const indexA = deityOrder.indexOf(a.deity);
  const indexB = deityOrder.indexOf(b.deity);
  const weightA = indexA === -1 ? 999 : indexA;
  const weightB = indexB === -1 ? 999 : indexB;
  return weightA - weightB;
});

const categories = ["All", ...Array.from(new Set(sortedAartiData.map(a => a.deity).filter(Boolean)))];

function App() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const searchQuery = query.trim();
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Word boundary for Unicode: Start of string or any non-word character (not letter, mark, or number)
  const searchRegex = searchQuery ? new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])` + escapedQuery, 'iu') : null;

  // Filter against the pre-sorted data
  const filtered = sortedAartiData.filter(a => {
    const matchesQuery = !searchRegex || (
      (a.title && searchRegex.test(a.title)) || 
      (a.deity && searchRegex.test(a.deity)) ||
      (a.lyrics && searchRegex.test(a.lyrics))
    );
    const matchesCategory = selectedCategory === "All" || a.deity === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  if (sortedAartiData.length === 0) {
    return <div>Loading aartis or no aartis found... Check src/content/ folder.</div>;
  }

  return (
    <div className="app-container">
      <header className="sticky-header">
        <h1>Aarti Sangraha</h1>
        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
          <input 
            type="text" 
            placeholder="Search deity, title, or lyrics..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            style={query ? { paddingRight: '40px' } : {}}
          />
          {query && (
            <button 
              onClick={() => setQuery("")}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#888'
              }}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
        <div className="filter-chips">
          {categories.map(category => (
            <button
              key={category}
              className={`filter-chip ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </header>
      <div className="aarti-list">
        {filtered.map(aarti => (
          <article key={aarti.id} className="aarti-card">
            <h2 className="aarti-title">{highlightText(aarti.title, searchQuery)}</h2>
            {aarti.deity && <h3 className="aarti-deity">{highlightText(aarti.deity, searchQuery)}</h3>}
            <div className="aarti-lyrics">{highlightText(aarti.lyrics, searchQuery)}</div>
          </article>
        ))}
        {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>No aartis found matching "{query}"</p>}
      </div>
    </div>
  );
}

export default App;