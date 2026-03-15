// src/App.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import aartiData from './data/Aartya.json'; // Direct import

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

function App() {
  const [query, setQuery] = useState("");
  const [contentType, setContentType] = useState("Aartya");
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

  useEffect(() => {
    setSelectedCategory("All");
  }, [contentType]);

  const categories = useMemo(() => {
    const availableDeities = Array.from(new Set(
      sortedAartiData
        .filter(a => (a.type || "Aartya") === contentType)
        .map(a => a.deity)
        .filter(Boolean)
    ));
    return ["All", "Favorites", ...availableDeities];
  }, [contentType]);

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
  let filtered = sortedAartiData.filter(a => {
    const itemType = a.type || "Aartya";
    if (itemType !== contentType) return false;

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

  if (selectedCategory === "Favorites" && !searchQuery) {
    filtered.sort((a, b) => {
      return favorites.indexOf(a.id) - favorites.indexOf(b.id);
    });
  }

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const newFavs = prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id];
      localStorage.setItem("favorites", JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const moveFavorite = (id, direction) => {
    const performMove = () => {
      setFavorites(prev => {
        // Filter the global favorites to only those visible in the current tab
        const currentTabFavorites = prev.filter(favId => {
          const aarti = sortedAartiData.find(a => a.id === favId);
          if (!aarti) return false;
          const itemType = aarti.type || "Aartya";
          return itemType === contentType;
        });

        const currentIdx = currentTabFavorites.indexOf(id);
        if (currentIdx < 0) return prev;

        const swapIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
        if (swapIdx < 0 || swapIdx >= currentTabFavorites.length) return prev;

        const swapId = currentTabFavorites[swapIdx];

        const newFavs = [...prev];
        const i1 = newFavs.indexOf(id);
        const i2 = newFavs.indexOf(swapId);

        if (i1 >= 0 && i2 >= 0) {
          [newFavs[i1], newFavs[i2]] = [newFavs[i2], newFavs[i1]];
          localStorage.setItem("favorites", JSON.stringify(newFavs));
        }
        return newFavs;
      });
    };

    // Use the native View Transitions API if supported
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => {
          performMove();
        });
      });
    } else {
      performMove(); // Fallback for older browsers
    }
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

  const titleMap = {
    "Aartya": "Aarti Sangraha",
    "Bhovtya": "Bhovti Sangraha",
    "Pradakshina": "Pradakshina Sangraha"
  };

  if (sortedAartiData.length === 0) {
    return <div>Loading Aartya or no Aartya found... Check src/content/ folder.</div>;
  }

  return (
    <div className="app-container">
      <header className={`sticky-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="sidebar-left-pane">
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
          <div className="content-type-tabs">
            {["Aartya", "Bhovtya", "Pradakshina"].map(type => (
              <button
                key={type}
                className={`tab-btn ${contentType === type ? 'active' : ''}`}
                onClick={() => setContentType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="sidebar-right-pane">
        <div className="header-title-container">
          {titleMap[contentType] || "Aarti Sangraha"}
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
      </div>
      <div className="aarti-list">
        {filtered.map((aarti, index) => (
          <article 
            key={aarti.id} 
            className="aarti-card" 
            style={selectedCategory === "Favorites" && !searchQuery ? { viewTransitionName: `card-${aarti.id.replace(/[^a-zA-Z0-9]/g, '')}` } : undefined}
          >
            <div className="font-resizer">
              {selectedCategory === "Favorites" && !searchQuery && (
                <>
                  <button 
                    className="font-btn" 
                    onClick={() => moveFavorite(aarti.id, 'up')} 
                    disabled={index === 0}
                    aria-label="Move Favorite Up"
                  >▲</button>
                  <button 
                    className="font-btn" 
                    onClick={() => moveFavorite(aarti.id, 'down')} 
                    disabled={index === filtered.length - 1}
                    aria-label="Move Favorite Down"
                  >▼</button>
                </>
              )}
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
        {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>No Aartya found matching "{query}"</p>}
      </div>
    </div>
  );
}

export default App;