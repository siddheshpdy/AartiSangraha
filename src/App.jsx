// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import aartiData from './data/aartis.json'; // Direct import

function highlightText(text, highlight) {
  if (!text) return null;
  if (!highlight || !highlight.trim()) return text;
  
  text = String(text);
  
  // Escape special regex characters to prevent errors
  const escapedHighlight = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let regex;
  try {
    // Match start of string or any non-letter/number/mark character, followed by the search query
    regex = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])(${escapedHighlight})`, 'giu');
  } catch (e) {
    // Fallback for older mobile browsers that do not support unicode property escapes
    regex = new RegExp(`(^|\\W)(${escapedHighlight})`, 'gi');
  }
  
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
  "ganpati",
  "shankar",
  "devi",
  "vitthal",
  "datta",
  "vishnu",
  "krishna",
  "ram",
  "maruti",
  "panchayatan",
  "dnyaneshwar",
  "others",
  "gajanan maharaj",
  "mahalasa Narayani"
];

const sortedAartiData = [...(aartiData || [])].sort((a, b) => {
  const indexA = deityOrder.indexOf(a.deity.toLowerCase());
  const indexB = deityOrder.indexOf(b.deity.toLowerCase());
  const weightA = indexA === -1 ? 999 : indexA;
  const weightB = indexB === -1 ? 999 : indexB;
  return weightA - weightB;
});

const categories = ["All", "Favorites", ...Array.from(new Set(sortedAartiData.map(a => a.deity).filter(Boolean)))];

function App() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isScrolled, setIsScrolled] = useState(false);
  const [fontSize, setFontSize] = useState(18); // Default 18px (1.125rem)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "system";
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favorites") || "[]");
    } catch {
      return [];
    }
  });
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const wakeLockRef = useRef(null);
  const userWantsWakeLock = useRef(false);

  const isScrolledRef = useRef(isScrolled);
  isScrolledRef.current = isScrolled;

  const searchQuery = query.trim();
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let searchRegex = null;
  if (searchQuery) {
    try {
      // Word boundary for Unicode: Start of string or any non-word character (not letter, mark, or number)
      searchRegex = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])` + escapedQuery, 'iu');
    } catch (e) {
      searchRegex = new RegExp(`(^|\\W)` + escapedQuery, 'i');
    }
  }

  // Filter against the pre-sorted data
  const filtered = sortedAartiData.filter(a => {
    const matchesQuery = !searchRegex || (
      (a.title && searchRegex.test(a.title)) || 
      (a.deity && searchRegex.test(a.deity)) ||
      (a.lyrics && searchRegex.test(a.lyrics))
    );
    const matchesCategory = selectedCategory === "All" 
      || (selectedCategory === "Favorites" && favorites.includes(a.id))
      || a.deity === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const newFavs = prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id];
      localStorage.setItem("favorites", JSON.stringify(newFavs));
      return newFavs;
    });
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the browser from automatically showing the prompt
      e.preventDefault();
      // Stash the event so we can trigger it later when the user clicks our button
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  useEffect(() => {
    const applyTheme = () => {
      const isDark = 
        theme === "dark" || 
        (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.body.classList.toggle("dark", isDark);
    };

    applyTheme();
    localStorage.setItem("theme", theme);

    // Listen for OS-level theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme();
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setIsWakeLockActive(false);
        });
      }
    } catch (err) {
      console.error(`${err.name}, ${err.message}`);
    }
  };

  const toggleWakeLock = async () => {
    if (isWakeLockActive) {
      userWantsWakeLock.current = false;
      if (wakeLockRef.current) await wakeLockRef.current.release();
    } else {
      userWantsWakeLock.current = true;
      await requestWakeLock();
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userWantsWakeLock.current) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let isTransitioning = false;
    let transitionTimeout;

    const handleScroll = () => {
      if (isTransitioning) return;

      const currentScrollY = window.scrollY;
      
      if (currentScrollY <= 0) {
        if (isScrolledRef.current) {
          setIsScrolled(false);
          startTransition(currentScrollY);
        } else {
          lastScrollY = currentScrollY;
        }
      } else if (currentScrollY > lastScrollY + 10 && currentScrollY > 50) {
        if (!isScrolledRef.current) {
          setIsScrolled(true);
          startTransition(currentScrollY);
        } else {
          lastScrollY = currentScrollY;
        }
      } else if (currentScrollY < lastScrollY - 10) {
        if (isScrolledRef.current) {
          setIsScrolled(false);
          startTransition(currentScrollY);
        } else {
          lastScrollY = currentScrollY;
        }
      }
    };

    const startTransition = (scrollY) => {
      isTransitioning = true;
      lastScrollY = scrollY;
      clearTimeout(transitionTimeout);
      // Pause scroll tracking during the 0.3s CSS transition to avoid layout-shift bouncing
      transitionTimeout = setTimeout(() => {
        isTransitioning = false;
        lastScrollY = window.scrollY; 
      }, 350);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(transitionTimeout);
    };
  }, []);

  if (sortedAartiData.length === 0) {
    return <div>Loading aartis or no aartis found... Check src/content/ folder.</div>;
  }

  return (
    <div className="app-container">
      <header className={`sticky-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-title-container">
          <h1>Aarti Sangraha</h1>
          <div className="header-actions">
            <button
              className="theme-toggle"
              onClick={() => setTheme(prev => {
                if (prev === 'light') return 'dark';
                if (prev === 'dark') return 'system';
                return 'light';
              })}
              aria-label="Toggle Theme"
              title={`Theme: ${theme}`}
            >
              {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
            </button>
            <button
              className="theme-toggle"
              onClick={toggleWakeLock}
              aria-label="Toggle Wake Lock"
              title={isWakeLockActive ? "Screen Awake: ON" : "Screen Awake: OFF"}
              style={{ opacity: isWakeLockActive ? 1 : 0.6 }}
            >
              {isWakeLockActive ? '💡' : '💤'}
            </button>
            {installPrompt && (
              <button
                onClick={handleInstallClick}
                className="install-btn"
                aria-label="Install App"
              >
                📥 Install
              </button>
            )}
          </div>
        </div>
        <div className={`search-container ${query ? 'has-query' : ''}`}>
          <input 
            type="text" 
            placeholder="Search deity, title, or lyrics..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          {query && (
            <button 
              onClick={() => setQuery("")}
              className="clear-search-btn"
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
            <div className="font-resizer">
              <button className="favorite-btn" onClick={() => toggleFavorite(aarti.id)} aria-label="Toggle favorite">
                {favorites.includes(aarti.id) ? '❤️' : '🤍'}
              </button>
              <button className="font-btn" onClick={() => setFontSize(f => Math.max(14, f - 2))} aria-label="Decrease font size">A-</button>
              <button className="font-btn" onClick={() => setFontSize(f => Math.min(32, f + 2))} aria-label="Increase font size">A+</button>
            </div>
            <h2 className="aarti-title">{highlightText(aarti.title, searchQuery)}</h2>
            {aarti.deity && <h3 className="aarti-deity">{highlightText(aarti.deity, searchQuery)}</h3>}
            <div className="aarti-lyrics" style={{ fontSize: `${fontSize}px` }}>{highlightText(aarti.lyrics, searchQuery)}</div>
          </article>
        ))}
        {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>No aartis found matching "{query}"</p>}
      </div>
    </div>
  );
}

export default App;