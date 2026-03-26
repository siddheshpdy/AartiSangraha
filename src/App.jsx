// src/App.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import aartiData from './data/Aartya.json'; // Direct import

import { usePlaylists } from '../usePlaylists'; // Adjust path if you moved this to src/hooks/
import PujaPlayer from '../PujaPlayer';         // Adjust path if you moved this to src/components/
import BackupRestoreSettings from '../BackupRestoreSettings';

// Transliteration Map for Cross-Script "Phonetic Equivalence" Search
const phoneticMap = {
  // Velar (K/G)
  'क':'k', 'ख':'k', 'ग':'k', 'घ':'k', 'k':'k', 'g':'k', 'q':'k',
  // Palatal (C/J)
  'च':'c', 'छ':'c', 'ज':'c', 'झ':'c', 'c':'c', 'j':'c', 'z':'c',
  // Retroflex & Dental (T/D)
  'ट':'t', 'ठ':'t', 'ड':'t', 'ढ':'t', 'त':'t', 'थ':'t', 'द':'t', 'ध':'t', 't':'t', 'd':'t',
  // Labial (P/B/F)
  'प':'p', 'फ':'p', 'ब':'p', 'भ':'p', 'p':'p', 'b':'p', 'f':'p',
  // Nasals (N/M)
  'ङ':'n', 'ञ':'n', 'ण':'n', 'न':'n', 'n':'n', 'म':'m', 'm':'m',
  // Sibilants (S/Sh)
  'श':'s', 'ष':'s', 'स':'s', 's':'s',
  // Liquids & Glides (R/L/V/W/Y)
  'र':'r', 'ल':'l', 'व':'v', 'ळ':'l', 'r':'r', 'l':'l', 'v':'v', 'w':'v', 'य':'y', 'y':'y',
  // Conjuncts & Special
  'क्ष':'ks', 'x':'ks', 
  'ज्ञ':'tny', // Marathi pronunciation 'dnya' -> t+n+y
  'ं':'n', 'ँ':'n', 'ृ':'ri', 'ऋ':'ri',
  
  // Vowel Signature (all non-schwa vowels map to 'i' placeholder)
  // Enforces precise matching rhythm while tolerating i/e/u/o typos
  'इ':'i', 'ई':'i', 'ि':'i', 'ी':'i', 'i':'i',
  'उ':'i', 'ऊ':'i', 'ु':'i', 'ू':'i', 'u':'i',
  'ए':'i', 'ऐ':'i', 'े':'i', 'ै':'i', 'e':'i',
  'ओ':'i', 'औ':'i', 'ो':'i', 'ौ':'i', 'o':'i'
  // Note: 'a' and 'h' are intentionally omitted to avoid Schwa/Aspiration mismatch.
};

function getSearchSkeleton(str) {
  if (!str) return "";
  let normalized = "";
  let lastChar = '';
  for (let char of str.toLowerCase()) {
    let mappedChar = null;
    if (phoneticMap[char] !== undefined) {
      mappedChar = phoneticMap[char];
    } else if (/[\n\r।॥,.;:!?]/.test(char)) {
      mappedChar = ' '; // Sentence boundaries prevent cross-sentence false positives
    }

    if (mappedChar) {
      for (let i = 0; i < mappedChar.length; i++) {
        let c = mappedChar[i];
        if (c !== lastChar) {
          normalized += c;
          lastChar = c;
        }
      }
    }
  }
  return normalized;
}

function getSkeletonMapping(str) {
  if (!str) return { skeleton: "", mapping: [] };
  let skeleton = "";
  let mapping = [];
  
  let lastSkeletonChar = '';
  for (let i = 0; i < str.length; i++) {
    let char = str.charAt(i).toLowerCase();
    let mappedChar = null;
    
    if (phoneticMap[char] !== undefined) {
      mappedChar = phoneticMap[char];
    } else if (/[\n\r।॥,.;:!?]/.test(char)) {
      mappedChar = ' ';
    }
    
    if (mappedChar) {
      for (let j = 0; j < mappedChar.length; j++) {
        let c = mappedChar[j];
        if (c !== lastSkeletonChar) {
          skeleton += c;
          mapping.push(i);
          lastSkeletonChar = c;
        }
      }
    }
  }
  return { skeleton, mapping };
}

function highlightText(text, highlight, querySkeleton) {
  if (!text) return null;
  if (!highlight || !highlight.trim()) return text;
  
  text = String(text);
  
  // 1. Literal match (e.g., if you searched using actual Devanagari)
  const escapedHighlight = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);
  
  if (parts.length > 1) {
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <mark key={i} style={{ backgroundColor: 'var(--color-border)', padding: '0 2px', borderRadius: '3px', color: 'inherit' }}>
            {part}
          </mark>
        );
      }
      return part;
    });
  }

  // 2. Cross-script skeleton match
  if (querySkeleton && querySkeleton.length >= 3) {
    const { skeleton, mapping } = getSkeletonMapping(text);
    let matchIdx = skeleton.indexOf(querySkeleton);
    
    if (matchIdx !== -1) {
      let wordRegex;
      try {
        wordRegex = /^[\p{L}\p{M}\p{N}]+$/u;
      } catch (e) {
        wordRegex = /^\w+$/;
      }

      const result = [];
      let lastEnd = 0;

      while (matchIdx !== -1) {
        const startCharIdx = mapping[matchIdx];
        const endCharIdx = mapping[matchIdx + querySkeleton.length - 1];
        
        let highlightStart = startCharIdx;
        while (highlightStart > 0 && wordRegex.test(text[highlightStart - 1])) {
          highlightStart--;
        }
        
        let highlightEnd = endCharIdx;
        while (highlightEnd < text.length - 1 && wordRegex.test(text[highlightEnd + 1])) {
          highlightEnd++;
        }
        
        if (highlightStart < lastEnd) {
           highlightStart = lastEnd;
        }

        if (highlightStart > lastEnd) {
          result.push(text.slice(lastEnd, highlightStart));
        }
        
        if (highlightEnd >= highlightStart) {
          result.push(
            <mark key={matchIdx} style={{ backgroundColor: 'var(--color-border)', padding: '0 2px', borderRadius: '3px', color: 'inherit' }}>
              {text.slice(highlightStart, highlightEnd + 1)}
            </mark>
          );
        }
        
        lastEnd = highlightEnd + 1;
        matchIdx = skeleton.indexOf(querySkeleton, matchIdx + 1);
      }

      if (lastEnd < text.length) {
        result.push(text.slice(lastEnd));
      }

      return result.length > 0 ? result : text;
    }
  }
  
  return text;
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

// Pre-calculate search skeletons once on app load
sortedAartiData.forEach(a => {
  a._searchSkeleton = getSearchSkeleton((a.title || "") + " " + (a.deity || "") + " " + (a.lyrics || ""));
});

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [contentType, setContentType] = useState("Aartya");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isScrolled, setIsScrolled] = useState(false);
  const [fontSize, setFontSize] = useState(18); // Default 18px (1.125rem)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "system";
  });
  const [script, setScript] = useState(() => {
    return localStorage.getItem("script") || "devanagari";
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
  const [focusedAartiId, setFocusedAartiId] = useState(null); // New state for focus mode

  const { playlists, createPlaylist, deletePlaylist, toggleAartiInPlaylist, moveAartiInPlaylist } = usePlaylists();
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Sync route with focusedAartiId for direct links
  useEffect(() => {
    const match = location.pathname.match(/^\/aarti\/(.+)$/);
    if (match && match[1]) {
      setFocusedAartiId(match[1]);
    } else {
      setFocusedAartiId(null);
    }
  }, [location.pathname]);

  const titleMap = useMemo(() => ({
    "Aartya": script === 'latin' ? "Aarti Sangraha" : "आरती संग्रह",
    "Bhovtya": script === 'latin' ? "Bhovti Sangraha" : "भोवती संग्रह",
    "Pradakshina": script === 'latin' ? "Pradakshina Sangraha" : "प्रदक्षिणा संग्रह",
    "Playlists": script === 'latin' ? "My Playlists" : "माझी प्लेलिस्ट"
  }), [script]);

  // Dynamic Page Title for SEO and Bookmarking
  useEffect(() => {
    if (focusedAartiId) {
      const aarti = sortedAartiData.find(a => a.id === focusedAartiId);
      if (aarti) {
        const title = script === 'latin' ? (aarti.titleEng || aarti.title) : aarti.title;
        const baseTitle = titleMap[aarti.type || 'Aartya'] || 'Aarti Sangraha';
        document.title = `${title} | ${baseTitle}`;
      }
    } else {
      document.title = titleMap[contentType] || "Aarti Sangraha";
    }
    // titleMap is derived from script, but including both for clarity as they are used
    // in different parts of the effect.
  }, [focusedAartiId, contentType, script, titleMap]);

  const handleFocusAarti = (id) => {
    navigate(`/aarti/${id}`);
  };

  const handleCloseFocus = () => {
    navigate(`/`);
  };

  const handleShare = async (e, aarti) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/aarti/${aarti.id}`;
    const shareData = {
      title: `Aarti Sangraha - ${aarti.title}`,
      text: `Read the ${aarti.title} on Aarti Sangraha!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Ignore AbortError which fires if the user closes the native share sheet
        if (error.name !== "AbortError") {
          console.error("Error sharing the Aarti:", error);
        }
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard! You can now paste it in WhatsApp or elsewhere.");
    }
  };

  const isScrolledRef = useRef(isScrolled);
  isScrolledRef.current = isScrolled;

  useEffect(() => {
    setQuery(""); // Clear search when switching tabs
    if (contentType === "Playlists") {
      setSelectedCategory(playlists.length > 0 ? `playlist-${playlists[0].id}` : "All");
    } else {
      setSelectedCategory("All");
    }
  }, [contentType]);

  const categories = useMemo(() => {
    if (contentType === "Playlists") {
      return playlists.map(p => `playlist-${p.id}`);
    }
    const availableDeities = Array.from(new Set(
      sortedAartiData
        .filter(a => (a.type || "Aartya") === contentType)
        .map(a => a.deity)
        .filter(Boolean)
    ));
    return ["All", "Favorites", ...availableDeities];
  }, [contentType, playlists]);

  // Fallback to "All" if the currently selected playlist gets deleted
  useEffect(() => {
    if (contentType === "Playlists" && selectedCategory.startsWith("playlist-")) {
      const exists = playlists.some(p => `playlist-${p.id}` === selectedCategory);
      if (!exists) setSelectedCategory(playlists.length > 0 ? `playlist-${playlists[0].id}` : "All");
    }
  }, [playlists, selectedCategory]);

  const searchQuery = query.trim();
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let searchRegex = null;
  let querySkeleton = "";
  let isFuzzyEligible = false;
  if (searchQuery) {
    try {
      // Word boundary for Unicode: Start of string or any non-word character (not letter, mark, or number)
      searchRegex = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])` + escapedQuery, 'iu');
    } catch (e) {
      searchRegex = new RegExp(`(^|\\W)` + escapedQuery, 'i');
    }
    querySkeleton = getSearchSkeleton(searchQuery);
    isFuzzyEligible = querySkeleton.length >= 3;
  }

  // Filter against the pre-sorted data
  let filtered = sortedAartiData.filter(a => {
    if (contentType === "Playlists") {
      if (!selectedCategory.startsWith("playlist-")) return false;
      const activeP = playlists.find(p => `playlist-${p.id}` === selectedCategory);
      if (!activeP || !activeP.aartiIds.includes(a.id)) return false;
      
      const matchesQuery = !searchRegex || (
        (a.title && searchRegex.test(a.title)) || 
        (a.deity && searchRegex.test(a.deity)) ||
        (a.lyrics && searchRegex.test(a.lyrics)) ||
        (a.titleEng && searchRegex.test(a.titleEng)) ||
        (a.deityEng && searchRegex.test(a.deityEng)) ||
        (a.lyricsEng && searchRegex.test(a.lyricsEng)) ||
        (isFuzzyEligible && a._searchSkeleton && a._searchSkeleton.includes(querySkeleton))
      );
      return matchesQuery;
    }

    const itemType = a.type || "Aartya";
    if (itemType !== contentType) return false;

    const matchesQuery = !searchRegex || (
      (a.title && searchRegex.test(a.title)) || 
      (a.deity && searchRegex.test(a.deity)) ||
      (a.lyrics && searchRegex.test(a.lyrics)) ||
      (a.titleEng && searchRegex.test(a.titleEng)) ||
      (a.deityEng && searchRegex.test(a.deityEng)) ||
      (a.lyricsEng && searchRegex.test(a.lyricsEng)) ||
      (isFuzzyEligible && a._searchSkeleton && a._searchSkeleton.includes(querySkeleton))
    );
    const matchesCategory = selectedCategory === "All" 
      || (selectedCategory === "Favorites" && favorites.includes(a.id))
      || a.deity === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  if (!searchQuery) {
    if (selectedCategory === "Favorites") {
      filtered.sort((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id));
    } else if (contentType === "Playlists" && selectedCategory.startsWith("playlist-")) {
      const activeP = playlists.find(p => `playlist-${p.id}` === selectedCategory);
      if (activeP) {
        filtered.sort((a, b) => activeP.aartiIds.indexOf(a.id) - activeP.aartiIds.indexOf(b.id));
      }
    }
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

  const handleMoveInPlaylist = (id, direction) => {
    const playlistId = selectedCategory.replace('playlist-', '');
    const performMove = () => {
      moveAartiInPlaylist(playlistId, id, direction);
    };
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => {
          performMove();
        });
      });
    } else {
      performMove(); 
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

  useEffect(() => {
    localStorage.setItem("script", script);
  }, [script]);

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, isMenuOpen]);

  const tabLabelMap = {
    "Aartya": script === 'latin' ? "Aartya" : "आरत्या",
    "Bhovtya": script === 'latin' ? "Bhovtya" : "भोवत्या",
    "Pradakshina": script === 'latin' ? "Pradakshina" : "प्रदक्षिणा",
    "Playlists": script === 'latin' ? "Playlists" : "प्लेलिस्ट"
  };

  if (sortedAartiData.length === 0) {
    return <div>Loading Aartya or no Aartya found... Check src/content/ folder.</div>;
  }

  // Dynamically calculate the active theme colors for inline styling where CSS vars fail
  const isDarkTheme = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) || (typeof document !== 'undefined' && document.body.classList.contains('dark'));
  const drawerBgColor = isDarkTheme ? '#1f2937' : '#ffffff';
  const drawerBgColorTransparent = isDarkTheme ? 'rgba(31, 41, 55, 0)' : 'rgba(255, 255, 255, 0)';
  const drawerTextColor = isDarkTheme ? '#f9fafb' : '#000000';
  const drawerBorderColor = isDarkTheme ? '#374151' : '#e5e7eb';

  return (
    <main className="app-container">
      {/* MOBILE DRAWER (Rendered outside header to avoid stacking/clipping issues) */}
      {isMobile && (
        <>
          {isMenuOpen && (
            <div 
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, touchAction: 'none' }} 
              onClick={() => setIsMenuOpen(false)}
            />
          )}
          <div 
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', maxWidth: '85vw',
              backgroundColor: drawerBgColor, color: drawerTextColor,
              boxShadow: '2px 0 15px rgba(0,0,0,0.5)', zIndex: 10000, 
              transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
              padding: '20px 15px', 
              overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain',
              boxSizing: 'border-box', display: 'block'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
               <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Menu</h2>
               <button onClick={() => setIsMenuOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'inherit' }}>✖</button>
            </div>
            
            <div className="header-actions" style={{ marginBottom: '15px', boxSizing: 'border-box' }}>
              <div className="header-actions-row">
                <button className="theme-toggle" onClick={() => setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light')} title={`Theme: ${theme}`}>
                  {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
                </button>
                <button className="theme-toggle" onClick={() => setScript(prev => prev === 'devanagari' ? 'latin' : 'devanagari')} style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {script === 'devanagari' ? 'A' : 'अ'}
                </button>
                <button className="theme-toggle" onClick={toggleWakeLock} style={{ opacity: isWakeLockActive ? 1 : 0.6 }}>
                  {isWakeLockActive ? '💡' : '💤'}
                </button>
              </div>
              <div className="header-actions-row">
                <button className="add-btn" onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfp0rSScIkrGEkXX_v45_TWAizAIlICU7A0U7Ebt1p0HPlRAQ/viewform', '_blank', 'noopener,noreferrer')}>➕ Add</button>
                {installPrompt && <button className="install-btn" onClick={handleInstallClick}>📥 Install</button>}
              </div>
            </div>

            <div className="content-type-tabs" style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px', boxSizing: 'border-box' }}>
              {["Aartya", "Bhovtya", "Pradakshina", "Playlists"].map(type => (
                <button key={type} className={`tab-btn ${contentType === type ? 'active' : ''}`} onClick={() => { setContentType(type); setIsMenuOpen(false); }}>
                  {tabLabelMap[type]}
                </button>
              ))}
            </div>

            <div style={{ padding: '0 15px', boxSizing: 'border-box' }}>
              <BackupRestoreSettings theme={theme} />
            </div>
          </div>
        </>
      )}

      <header className={`sticky-header ${isScrolled ? 'scrolled' : ''} ${focusedAartiId ? 'hidden-in-focus-mode' : ''}`}>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '60px', padding: '0 15px', backgroundColor: drawerBgColor, borderBottom: `1px solid ${drawerBorderColor}` }}>
            <button 
              className="hamburger-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle Menu"
              style={{ background: 'transparent', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: 'inherit', marginRight: '15px' }}
            >
              ☰
            </button>
            <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold', color: drawerTextColor }}>
              {titleMap[contentType] || "Aarti Sangraha"}
            </h1>
          </div>
        )}
        
        {/* DESKTOP ONLY: Sidebar Left Pane */}
        {!isMobile && (
          <div className="sidebar-left-pane">
            <div className="header-actions">
              <div className="header-actions-row">
                <button className="theme-toggle" onClick={() => setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light')} title={`Theme: ${theme}`}>
                  {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
                </button>
                <button className="theme-toggle" onClick={() => setScript(prev => prev === 'devanagari' ? 'latin' : 'devanagari')} title={script === 'devanagari' ? "Read in English" : "Read in Marathi"} style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {script === 'devanagari' ? 'A' : 'अ'}
                </button>
                <button className="theme-toggle" onClick={toggleWakeLock} title={isWakeLockActive ? "Screen Awake: ON" : "Screen Awake: OFF"} style={{ opacity: isWakeLockActive ? 1 : 0.6 }}>
                  {isWakeLockActive ? '💡' : '💤'}
                </button>
              </div>
              <div className="header-actions-row">
                <button className="add-btn" onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfp0rSScIkrGEkXX_v45_TWAizAIlICU7A0U7Ebt1p0HPlRAQ/viewform', '_blank', 'noopener,noreferrer')} title="Submit New Aarti">➕ Add</button>
                {installPrompt && <button onClick={handleInstallClick} className="install-btn">📥 Install</button>}
              </div>
            </div>
            <div className="content-type-tabs">
              {["Aartya", "Bhovtya", "Pradakshina", "Playlists"].map(type => (
                <button key={type} className={`tab-btn ${contentType === type ? 'active' : ''}`} onClick={() => setContentType(type)}>
                  {tabLabelMap[type]}
                </button>
              ))}
            </div>

            <div style={{ padding: '15px', boxSizing: 'border-box' }}>
              <BackupRestoreSettings theme={theme} />
            </div>
          </div>
        )}
      </header> 
      {/* Hide sidebar-right-pane when in focus mode */}
      <div className={`sidebar-right-pane ${focusedAartiId ? 'hidden-in-focus-mode' : ''}`}>
        {!isMobile && (
          <div className="header-title-container">
            {titleMap[contentType] || "Aarti Sangraha"}
          </div>
        )}
        {contentType !== "Playlists" && (
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
        )}
        
        {/* Render Playlists and Categories in main view for all devices */}
        {contentType === "Playlists" && (
          <div style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '10px', background: drawerBgColor, borderBottom: `1px solid ${drawerBorderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>My Playlists</span>
              <button 
                onClick={() => {
                  const name = window.prompt("Enter new playlist name:");
                  if (name && name.trim()) {
                    createPlaylist(name);
                  }
                }} 
                style={{ padding: '8px 12px', background: '#10b981', color: 'white', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                title="Create New Playlist"
              >
                &#10011;
              </button>
            </div>
            
            <div style={{ maxHeight: isMobile ? '200px' : 'none', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {playlists.length === 0 ? (
                <span style={{ padding: '8px 0', fontSize: '0.9rem', opacity: 0.7 }}>No playlists yet. Create one above!</span>
              ) : (
                playlists.map(p => (
                  <div 
                    key={p.id} 
                    style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '10px', borderRadius: '6px', border: `1px solid ${drawerBorderColor}`,
                      background: selectedCategory === `playlist-${p.id}` ? drawerBorderColor : 'transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedCategory(`playlist-${p.id}`)}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '1rem' }}>{p.name}</strong>
                      <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>{p.aartiIds.length} items</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if (p.aartiIds.length > 0) setActivePlaylist(p); }}
                        disabled={p.aartiIds.length === 0}
                        style={{ padding: '6px 12px', background: p.aartiIds.length === 0 ? '#ccc' : '#10b981', color: 'white', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: p.aartiIds.length === 0 ? 'not-allowed' : 'pointer' }}
                        title="Play"
                      >▶</button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this playlist?')) deletePlaylist(p.id); }} 
                        style={{ padding: '6px 10px', background: '#ef4444', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                        title="Delete"
                      >🗑</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {contentType !== "Playlists" && (
          <div className="filter-chips">
            {categories.map(category => {
              let label = category;
              if (category === "All") label = script === 'latin' ? "All" : "सर्व";
              else if (category === "Favorites") label = script === 'latin' ? "Favorites" : "आवडते";
              else if (script === 'latin') {
                const match = sortedAartiData.find(a => a.deity === category);
                if (match && match.deityEng) label = match.deityEng;
              }
              return (
                <button
                  key={category}
                  className={`filter-chip ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                  style={{ textTransform: script === 'latin' && !["All", "Favorites"].includes(category) ? 'capitalize' : 'none' }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div> 
      {/* Render only the focused Aarti if focusedAartiId is set */}
      <div className={`aarti-list ${focusedAartiId ? 'focused-list' : ''}`}>
        {filtered.map((aarti, index) => {
          const isFocused = focusedAartiId === aarti.id;
          const showContent = isFocused || !!searchQuery;
          
          return (focusedAartiId === null || focusedAartiId === aarti.id) && (
          <article 
            key={aarti.id} 
            className={`aarti-card ${isFocused ? 'focused-aarti-card' : ''}`}
            style={(selectedCategory === "Favorites" || selectedCategory.startsWith("playlist-")) && !searchQuery ? { viewTransitionName: `card-${aarti.id.replace(/[^a-zA-Z0-9]/g, '')}` } : undefined}
            onClick={() => {
              if (!isFocused) {
                handleFocusAarti(aarti.id);
              }
            }}
          >
            {isFocused && (
              <button 
                className="close-focus-mode-btn" 
                onClick={(e) => { e.stopPropagation(); handleCloseFocus(); }}
                aria-label="Exit Focus Mode"
                title="Exit Focus Mode"
              >
                ✕
              </button>
            )}
            <div className="font-resizer">
              <button className="font-btn" onClick={(e) => handleShare(e, aarti)} aria-label="Share Aarti" title="Share Aarti">🔗</button>
              {(selectedCategory === "Favorites" || contentType === "Playlists") && !searchQuery && (
                <>
                  <button 
                    className="font-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedCategory === "Favorites") moveFavorite(aarti.id, 'up');
                      else handleMoveInPlaylist(aarti.id, 'up');
                    }} 
                    disabled={index === 0}
                    aria-label="Move Up"
                  >▲</button>
                  <button 
                    className="font-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedCategory === "Favorites") moveFavorite(aarti.id, 'down');
                      else handleMoveInPlaylist(aarti.id, 'down');
                    }} 
                    disabled={index === filtered.length - 1}
                    aria-label="Move Down"
                  >▼</button>
                </>
              )}
              <button className="favorite-btn" onClick={(e) => { e.stopPropagation(); toggleFavorite(aarti.id); }} aria-label="Toggle favorite">
                {favorites.includes(aarti.id) ? '❤️' : '🤍'}
              </button>
              <button className="font-btn" onClick={(e) => { e.stopPropagation(); setFontSize(f => Math.max(14, f - 2)); }} aria-label="Decrease font size">A-</button>
              <button className="font-btn" onClick={(e) => { e.stopPropagation(); setFontSize(f => Math.min(32, f + 2)); }} aria-label="Increase font size">A+</button>
            </div>
            <div className="playlist-dropdown" style={{ marginBottom: '10px' }} onClick={(e) => e.stopPropagation()}>
              <select 
                aria-label="Select a playlist to add this Aarti"
                onChange={(e) => {
                  if (e.target.value === 'CREATE_NEW') {
                    const name = window.prompt("Enter new playlist name:");
                    if (name && name.trim()) {
                      createPlaylist(name, aarti.id);
                    }
                  } else if (e.target.value) {
                    toggleAartiInPlaylist(e.target.value, aarti.id);
                  }
                  e.target.value = ""; 
                }} 
                defaultValue=""
                style={{ padding: '4px', borderRadius: '4px', fontSize: '0.85rem', width: '100%', border: `1px solid ${drawerBorderColor}`, background: 'transparent', color: 'inherit' }}
              >
                <option value="" disabled>+ Add to Playlist...</option>
                <option value="CREATE_NEW" style={{ color: 'black', fontWeight: 'bold' }}>➕ Create New Playlist</option>
                {playlists.map(p => (
                  <option key={p.id} value={p.id} style={{ color: 'black' }}>
                    {p.aartiIds.includes(aarti.id) ? '✓ Remove from' : '+ Add to'} {p.name}
                  </option>
                ))}
              </select>
            </div>
            <h2 className="aarti-title" style={{ textTransform: script === 'latin' ? 'capitalize' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{highlightText(script === 'latin' ? (aarti.titleEng || aarti.title) : aarti.title, searchQuery, querySkeleton)}</span>
            </h2>
            {aarti.deity && <h3 className="aarti-deity" style={{ textTransform: script === 'latin' ? 'capitalize' : 'none' }}>{highlightText(script === 'latin' ? (aarti.deityEng || aarti.deity) : aarti.deity, searchQuery, querySkeleton)}</h3>}
            
            <div style={!showContent ? { maxHeight: '120px', overflow: 'hidden', position: 'relative' } : undefined}>
              <div className="aarti-lyrics" style={{ fontSize: `${fontSize}px` }}>{highlightText(script === 'latin' ? (aarti.lyricsEng || aarti.lyrics) : aarti.lyrics, searchQuery, querySkeleton)}</div>
              {!showContent && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: `linear-gradient(to bottom, ${drawerBgColorTransparent}, ${drawerBgColor})` }} />
              )}
            </div>
            {!showContent && (
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#CC4800', fontWeight: 'bold', fontSize: '0.95rem', padding: '6px 16px', border: '1px solid #CC4800', borderRadius: '999px', backgroundColor: 'rgba(204, 72, 0, 0.05)' }}>
                  Open ⤢
                </span>
              </div>
            )}
          </article>
          );
        })}
        {filtered.length === 0 && !focusedAartiId && (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>
            {contentType === "Playlists" 
              ? (categories.length === 0 ? "Create a playlist above to get started!" : "This playlist is empty. Add Aartya from other tabs!")
              : `No Aartya found matching "${query}"`}
          </p>
        )}
      </div>

      {/* Puja Player Fullscreen Overlay */}
      {activePlaylist && (
        <PujaPlayer 
          playlist={activePlaylist} 
          allAartya={sortedAartiData} 
          onExit={() => setActivePlaylist(null)} 
          theme={theme}
          setTheme={setTheme}
          script={script}
          setScript={setScript}
          AartiDetailComponent={({ aarti }) => (
            <article className="aarti-card focused-aarti-card" style={{ margin: '0 auto', maxWidth: '800px', boxShadow: 'none' }}>
              <h2 className="aarti-title" style={{ textTransform: script === 'latin' ? 'capitalize' : 'none' }}>{script === 'latin' ? (aarti.titleEng || aarti.title) : aarti.title}</h2>
              {aarti.deity && <h3 className="aarti-deity" style={{ textTransform: script === 'latin' ? 'capitalize' : 'none' }}>{script === 'latin' ? (aarti.deityEng || aarti.deity) : aarti.deity}</h3>}
              <div className="aarti-lyrics" style={{ fontSize: `${fontSize}px` }}>{script === 'latin' ? (aarti.lyricsEng || aarti.lyrics) : aarti.lyrics}</div>
            </article>
          )} 
        />
      )}
    </main>
  );
}

export default App;