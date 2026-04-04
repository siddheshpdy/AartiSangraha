// src/App.jsx
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './App.css';
 
import { usePlaylists } from '../usePlaylists';
const PujaPlayer = React.lazy(() => import('../PujaPlayer'));
const BackupRestoreSettings = React.lazy(() => import('../BackupRestoreSettings'));

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

function getYouTubeVideoId(url) {
    if (!url) return null;
    // This regex should handle most common YouTube URL formats
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    if (match && match[1]) {
        return match[1];
    }
    return null;
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
        return <mark key={i} className="highlight">{part}</mark>;
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
            <mark key={matchIdx} className="highlight">{text.slice(highlightStart, highlightEnd + 1)}</mark>
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
  "mahalasa narayani"
];

function MonetagAdUnit({ zoneId, containerStyle }) {
  const adRef = useRef(null);

  useEffect(() => {
    // Return if the ad container isn't ready, or if the script is already there.
    // This prevents re-injection on re-renders.
    if (!adRef.current || adRef.current.querySelector('script')) {
      return;
    }

    const script = document.createElement('script');
    script.dataset.zone = zoneId;
    script.src = 'https://nap5k.com/tag.min.js';
    script.async = true;

    adRef.current.appendChild(script);
  }, [zoneId]);

  return <div ref={adRef} style={containerStyle} />;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function LyricsPreview({ fontSize, showContent, children }) {
  const [isOverflowing, setIsOverflowing] = useState(true);
  const contentRef = useRef(null);

  useIsomorphicLayoutEffect(() => {
    if (!contentRef.current) return;
    const checkOverflow = () => {
      // .lyrics-preview has max-height: 120px. 
      // We check if the natural height is strictly greater than 125px (allowing a small 5px buffer)
      setIsOverflowing(contentRef.current.scrollHeight > 125);
    };
    checkOverflow();
    
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [fontSize, children, showContent]);

  return (
    <>
      <div className={!showContent ? 'lyrics-preview' : ''}>
        <div className="aarti-lyrics" ref={contentRef} style={{ fontSize: `${fontSize}px` }}>
          {children}
        </div>
        {!showContent && isOverflowing && <div className="aarti-fade-out" />}
      </div>
      {!showContent && isOverflowing && (
        <div className="open-indicator-container">
          <span className="open-indicator">
            Open ⤢
          </span>
        </div>
      )}
    </>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sortedAartiData, setSortedAartiData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [query, setQuery] = useState("");
  const [contentType, setContentType] = useState("Aartya");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isScrolled, setIsScrolled] = useState(false);
  const [fontSize, setFontSize] = useState(18); // Default 18px (1.125rem)
  const [theme, setTheme] = useState("system"); // Default for SSR
  const [script, setScript] = useState("devanagari"); // Default for SSR
  const [favorites, setFavorites] = useState([]); // Default for SSR
  const [isMounted, setIsMounted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const wakeLockRef = useRef(null);
  const userWantsWakeLock = useRef(false);
  const [focusedAartiId, setFocusedAartiId] = useState(null); // New state for focus mode

  const { playlists, createPlaylist, deletePlaylist, toggleAartiInPlaylist, moveAartiInPlaylist } = usePlaylists();
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [isMobile, setIsMobile] = useState(false); // Default for SSR
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const searchContainerRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Lazy loading state and observer
  const [visibleCount, setVisibleCount] = useState(20);
  useEffect(() => {
    setVisibleCount(20); // Reset limit when filters change
  }, [contentType, selectedCategory, query]);
  
  const observerRef = useRef(null);
  const loadMoreRef = useCallback(node => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(prev => prev + 20);
    });
    if (node) observerRef.current.observe(node);
  }, []);

  // Fetch, sort, and process Aarti data asynchronously
  useEffect(() => {
    let isMounted = true;
    import('./data/Aartya.json')
      .then(module => {
        if (!isMounted) return;
        const rawData = module.default || module;
        const dataArray = Array.isArray(rawData) ? rawData : [];
        
        // Spread into a new array to prevent mutating a read-only ES module
        const sorted = [...dataArray].sort((a, b) => {
          const deityA = (a.deityEng || "others").toLowerCase().trim();
          const deityB = (b.deityEng || "others").toLowerCase().trim();
          const indexA = deityOrder.indexOf(deityA);
          const indexB = deityOrder.indexOf(deityB);
          const weightA = indexA === -1 ? 999 : indexA;
          const weightB = indexB === -1 ? 999 : indexB;
          
          if (weightA !== weightB) return weightA - weightB;
          return (a.title || "").localeCompare(b.title || "");
        });

        sorted.forEach(a => {
          a._searchSkeleton = getSearchSkeleton((a.title || "") + " " + (a.deity || "") + " " + (a.lyrics || ""));
        });
        
        setSortedAartiData(sorted);
      })
      .catch(err => console.error("Error loading Aarti data:", err))
      .finally(() => {
        if (isMounted) setIsLoadingData(false);
      });
      
    return () => { isMounted = false; };
  }, []);

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
    "Stotra": script === 'latin' ? "Stotra Sangraha" : "स्तोत्र संग्रह",
    "Mantra": script === 'latin' ? "Mantra Sangraha" : "मंत्र संग्रह",
    "Shloka": script === 'latin' ? "Shloka Sangraha" : "श्लोक संग्रह",
    "Playlists": script === 'latin' ? "My Playlists" : "माझी प्लेलिस्ट",
    "Help": script === 'latin' ? "Help & Usage" : "मदत आणि वापर",
    "About": script === 'latin' ? "About Us" : "आमच्याबद्दल"
  }), [script]);

  // Dynamic Page Title for SEO and Bookmarking
  useEffect(() => {
    if (focusedAartiId) {
      const aarti = sortedAartiData.find(a => a.id === focusedAartiId);
      if (aarti) {
        const title = script === 'latin' ? (aarti.titleEng || aarti.title) : aarti.title;
        const baseTitle = titleMap[aarti.type || 'Aartya'] || 'Aarti Sangraha';
        document.title = `${title} | ${baseTitle}`;
        } else {
          document.title = script === 'latin' ? "404 Not Found | Aarti Sangraha" : "४०४ सापडले नाही | आरती संग्रह";
      }
    } else {
      document.title = titleMap[contentType] || "Aarti Sangraha";
    }
    // titleMap is derived from script, but including both for clarity as they are used
    // in different parts of the effect.
  }, [focusedAartiId, contentType, script, titleMap, sortedAartiData]);

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
    setIsMounted(true);
    setIsMobile(window.innerWidth < 1024);

    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) setTheme(storedTheme);

    const storedScript = localStorage.getItem("script");
    if (storedScript) setScript(storedScript);

    try {
      const storedFavs = localStorage.getItem("favorites");
      if (storedFavs) setFavorites(JSON.parse(storedFavs));
    } catch {}
  }, []);

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
    if (["Help", "About"].includes(contentType)) return [];
    
    const itemsInTab = sortedAartiData.filter(a => (a.type || "Aartya") === contentType);
    
    const availableDeities = Array.from(new Set(
      itemsInTab.map(a => a.deity).filter(Boolean)
    ));

    const hasFavorites = itemsInTab.some(a => favorites.includes(a.id));
    
    const chips = [];
    if (itemsInTab.length > 0) chips.push("All");
    if (hasFavorites) chips.push("Favorites");
    
    return [...chips, ...availableDeities];
  }, [contentType, playlists, favorites, sortedAartiData]);

  // Fallback to "All" if the currently selected category or playlist disappears (e.g. deleted or un-favorited)
  useEffect(() => {
    if (contentType === "Playlists" && selectedCategory.startsWith("playlist-")) {
      const exists = playlists.some(p => `playlist-${p.id}` === selectedCategory);
      if (!exists) setSelectedCategory(playlists.length > 0 ? `playlist-${playlists[0].id}` : "All");
    } else if (contentType !== "Playlists") {
      if (selectedCategory !== "All" && categories.length > 0 && !categories.includes(selectedCategory)) {
        setSelectedCategory("All");
      }
    }
  }, [playlists, selectedCategory, contentType, categories]);

  const searchQuery = query.trim();

  // Autocomplete suggestions
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const querySkeleton = getSearchSkeleton(searchQuery);
    const isFuzzyEligible = querySkeleton.length >= 3;
    const seen = new Set();
    const newSuggestions = [];

    const itemsInTab = sortedAartiData.filter(a => (a.type || "Aartya") === contentType);

    for (const aarti of itemsInTab) {
      if (newSuggestions.length >= 7) break; // Limit total suggestions

      const titleLocal = script === 'latin' ? (aarti.titleEng || aarti.title) : aarti.title;
      const titleMatch = (aarti.title && aarti.title.toLowerCase().includes(lowerQuery)) ||
                         (aarti.titleEng && aarti.titleEng.toLowerCase().includes(lowerQuery)) ||
                         (isFuzzyEligible && aarti._searchSkeleton && aarti._searchSkeleton.includes(querySkeleton));
      if (titleMatch && !seen.has(titleLocal)) {
        newSuggestions.push(titleLocal);
        seen.add(titleLocal);
      }

      if (newSuggestions.length >= 7) break;

      const deityLocal = script === 'latin' ? (aarti.deityEng || aarti.deity) : aarti.deity;
      const deityMatch = (aarti.deity && aarti.deity.toLowerCase().includes(lowerQuery)) ||
                         (aarti.deityEng && aarti.deityEng.toLowerCase().includes(lowerQuery));
      if (deityMatch && deityLocal && !seen.has(deityLocal)) {
        newSuggestions.push(deityLocal);
        seen.add(deityLocal);
      }
    }
    setSuggestions(newSuggestions);
  }, [searchQuery, contentType, script, sortedAartiData]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchContainerRef]);

  const { searchRegex, querySkeleton, isFuzzyEligible } = useMemo(() => {
    let regex = null;
    let skeleton = "";
    let fuzzy = false;
    if (searchQuery) {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try {
        regex = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])` + escapedQuery, 'iu');
      } catch (e) {
        regex = new RegExp(`(^|\\W)` + escapedQuery, 'i');
      }
      skeleton = getSearchSkeleton(searchQuery);
      fuzzy = skeleton.length >= 3;
    }
    return { searchRegex: regex, querySkeleton: skeleton, isFuzzyEligible: fuzzy };
  }, [searchQuery]);

  // Filter against the pre-sorted data
  const filtered = useMemo(() => {
    let result = sortedAartiData.filter(a => {
      if (["Help", "About"].includes(contentType)) return false;

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
        result.sort((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id));
      } else if (contentType === "Playlists" && selectedCategory.startsWith("playlist-")) {
        const activeP = playlists.find(p => `playlist-${p.id}` === selectedCategory);
        if (activeP) {
          result.sort((a, b) => activeP.aartiIds.indexOf(a.id) - activeP.aartiIds.indexOf(b.id));
        }
      }
    }
    return result;
  }, [contentType, playlists, selectedCategory, searchQuery, searchRegex, querySkeleton, isFuzzyEligible, favorites, sortedAartiData]);

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const newFavs = prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id];
      if (isMounted) localStorage.setItem("favorites", JSON.stringify(newFavs));
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
          if (isMounted) localStorage.setItem("favorites", JSON.stringify(newFavs));
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
    if (isMounted) {
      localStorage.setItem("theme", theme);
    }

    // Listen for OS-level theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme();
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("script", script);
    }
  }, [script, isMounted]);

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
      
      setShowBackToTop(currentScrollY > 400);
      
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
      setIsMobile(window.innerWidth < 1024);
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
    "Stotra": script === 'latin' ? "Stotra" : "स्तोत्रे",
    "Mantra": script === 'latin' ? "Mantra" : "मंत्र",
    "Shloka": script === 'latin' ? "Shloka" : "श्लोक",
    "Playlists": script === 'latin' ? "Playlists" : "प्लेलिस्ट",
    "Help": script === 'latin' ? "Help" : "मदत",
    "About": script === 'latin' ? "About" : "बद्दल"
  };

  if (isLoadingData) {
    return (
      <div className="pwa-splash-screen">
        <div className="loading-spinner"></div>
        <div className="pwa-splash-title">Loading...</div>
      </div>
    );
  }

  const aarti = focusedAartiId ? sortedAartiData.find(a => a.id === focusedAartiId) : null;
  const isNotFound = focusedAartiId && !aarti;
  const currentTitle = isNotFound ? (script === 'latin' ? "404 Not Found" : "४०४ सापडले नाही") : (aarti ? (script === 'latin' ? (aarti.titleEng || aarti.title) : aarti.title) : (titleMap[contentType] || "Aarti Sangraha"));
  const currentUrl = `https://aartisangraha.co.in${focusedAartiId ? `/aarti/${focusedAartiId}` : ''}`;
  const currentDescription = isNotFound ? "The requested Aarti could not be found." : (aarti ? `Read the lyrics for ${currentTitle} in Marathi and English on Aarti Sangraha.` : "Offline capable Marathi Aarti Sangraha");

  const structuredData = aarti ? {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": currentTitle,
    "text": script === 'latin' ? (aarti.lyricsEng || aarti.lyrics) : aarti.lyrics,
    "inLanguage": "mr",
    "about": script === 'latin' ? (aarti.deityEng || aarti.deity) : aarti.deity
  } : null;

  // Ensure reorderable tabs render fully so index shifts don't break up/down movement
  const isReorderableList = (selectedCategory === "Favorites" || contentType === "Playlists") && !searchQuery;
  const displayedAartya = (focusedAartiId || isReorderableList) ? filtered : filtered.slice(0, visibleCount);

  return (
    <main className="app-container">
      <Helmet>
        <title>{`${currentTitle}${focusedAartiId ? " - Aarti Sangraha" : ""}`}</title>
        <meta name="description" content={currentDescription} />
        <link rel="canonical" href={currentUrl} />
        <meta property="og:title" content={`${currentTitle}${focusedAartiId ? " - Aarti Sangraha" : ""}`} />
        <meta property="og:description" content={currentDescription} />
        <meta property="og:url" content={currentUrl} />
        <meta name="twitter:title" content={`${currentTitle}${focusedAartiId ? " - Aarti Sangraha" : ""}`} />
        <meta name="twitter:description" content={currentDescription} />
        {structuredData && (
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        )}
      </Helmet>
      {/* DESKTOP ONLY: Far Left Pane for Monetag Ad (commented out as per request) */}
      {!isMobile && focusedAartiId === null && (
        <div className="far-left-pane">
          {/* <MonetagAdUnit zoneId="10786137" containerStyle={{ margin: '20px auto', width: '100%', minHeight: '250px', display: "flex", justifyContent: "center" }} /> */}
        </div>
      )}
      
      {/* MOBILE DRAWER (Rendered outside header to avoid stacking/clipping issues) */}
      {isMobile && (
        <>
          {isMenuOpen && (
            <div className="mobile-drawer-overlay" onClick={() => setIsMenuOpen(false)} />
          )}
            <div className={`mobile-drawer ${isMenuOpen ? 'open' : ''}`}>
            <div className="drawer-header">
               <h2>Menu</h2>
               <button onClick={() => setIsMenuOpen(false)} className="close-drawer-btn">✖</button>
            </div>
            
            <div className="header-actions">
              <div className="header-actions-row">
                <button className="theme-toggle" onClick={() => setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light')} title={`Theme: ${theme}`}>
                  {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
                </button>
                <button className="theme-toggle script-toggle" onClick={() => setScript(prev => prev === 'devanagari' ? 'latin' : 'devanagari')} title={script === 'devanagari' ? "Read in English" : "Read in Marathi"}>
                  {script === 'devanagari' ? 'A' : 'अ'}
                </button>
                <button className={`theme-toggle wakelock-toggle ${isWakeLockActive ? 'active' : ''}`} onClick={toggleWakeLock}>
                  {isWakeLockActive ? '💡' : '💤'}
                </button>
              </div>
              <div className="header-actions-row">
                <button className="add-btn" onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfp0rSScIkrGEkXX_v45_TWAizAIlICU7A0U7Ebt1p0HPlRAQ/viewform', '_blank', 'noopener,noreferrer')} title="Submit New Aarti"><span className="add-icon">+</span> Add</button>
                {installPrompt && <button onClick={handleInstallClick} className="install-btn">📥 Install</button>}
              </div>
            </div>
            
            <div className="content-type-tabs">
              {["Aartya", "Bhovtya", "Pradakshina", "Stotra", "Mantra", "Shloka", "Playlists", "Help", "About"].map(type => (
                <button key={type} className={`tab-btn ${contentType === type ? 'active' : ''}`} onClick={() => { setContentType(type); setIsMenuOpen(false); navigate('/'); }}>
                  {tabLabelMap[type]}
                </button>
              ))}
            </div>

            <div className="drawer-section">
              <React.Suspense fallback={<div className="loading-spinner" style={{ width: '24px', height: '24px', margin: '0 auto' }}></div>}>
                <BackupRestoreSettings theme={theme} />
              </React.Suspense>
            </div>
          </div>
         </>
      )}

      <header className={`sticky-header ${isScrolled ? 'scrolled' : ''}`}>
        {isMobile && (
          <div className="mobile-header">
            <button 
              className="hamburger-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle Menu"
            >
              ☰
            </button>
            <h1 className="mobile-title">
              {titleMap[contentType] || "Aarti Sangraha"}
            </h1>
          </div>
        )}
      </header>
        
        {/* DESKTOP ONLY: Sidebar Left Pane */}
        {!isMobile && (
          <div className="sidebar-left-pane">
            <div className="header-actions">
              <div className="header-actions-row">
                <button className="theme-toggle" onClick={() => setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light')} title={`Theme: ${theme}`}>
                  {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
                </button>
                <button className="theme-toggle script-toggle" onClick={() => setScript(prev => prev === 'devanagari' ? 'latin' : 'devanagari')} title={script === 'devanagari' ? "Read in English" : "Read in Marathi"}>
                  {script === 'devanagari' ? 'A' : 'अ'}
                </button>
                <button className={`theme-toggle wakelock-toggle ${isWakeLockActive ? 'active' : ''}`} onClick={toggleWakeLock}>
                  {isWakeLockActive ? '💡' : '💤'}
                </button>
              </div>
              <div className="header-actions-row">
                <button className="add-btn" onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSfp0rSScIkrGEkXX_v45_TWAizAIlICU7A0U7Ebt1p0HPlRAQ/viewform', '_blank', 'noopener,noreferrer')} title="Submit New Aarti"><span className="add-icon">+</span> Add</button>
                {installPrompt && <button onClick={handleInstallClick} className="install-btn">📥 Install</button>}
              </div>
            </div>
            <div className="content-type-tabs">
              {["Aartya", "Bhovtya", "Pradakshina", "Stotra", "Mantra", "Shloka", "Playlists", "Help", "About"].map(type => (
                <button key={type} className={`tab-btn ${contentType === type ? 'active' : ''}`} onClick={() => { setContentType(type); navigate('/'); }}>
                  {tabLabelMap[type]}
                </button>
              ))}
            </div>

            <div className="sidebar-section">
              <React.Suspense fallback={<div className="loading-spinner" style={{ width: '24px', height: '24px', margin: '0 auto' }}></div>}>
                <BackupRestoreSettings theme={theme} />
              </React.Suspense>
            </div>
          </div>
        )}
        
      {!isMobile && !focusedAartiId && (
        <div className="header-title-container desktop-title">
          {titleMap[contentType] || "Aarti Sangraha"}
        </div>
      )}
      
      <div className={`sidebar-right-pane ${focusedAartiId ? 'hidden-in-focus-mode' : ''}`}>
        {!["Playlists", "Help", "About"].includes(contentType) && (
          <div className={`search-container ${query ? 'has-query' : ''}`} ref={searchContainerRef}>
            <input 
              type="text" 
              placeholder="Search deity, title, or lyrics..." 
              value={query}
              onChange={(e) => { setQuery(e.target.value); navigate('/'); }}
              className="search-input"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestions.length > 0}
              aria-controls="autocomplete-list"
            />
            {query && (
              <button 
                onClick={() => { setQuery(""); navigate('/'); }}
                className="clear-search-btn"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
            {suggestions.length > 0 && (
              <ul id="autocomplete-list" className="autocomplete-suggestions" role="listbox">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    role="option"
                    className="suggestion-item"
                    onMouseDown={(e) => { // Use onMouseDown to fire before input's onBlur
                      e.preventDefault();
                      setQuery(suggestion);
                      setSuggestions([]);
                      navigate('/');
                    }}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {/* Render Playlists and Categories in main view for all devices */}
        {contentType === "Playlists" && (
          <div className="playlist-container">
            <div className="playlist-header">
              <span className="playlist-title">My Playlists</span>
              <button 
                onClick={() => {
                  const name = window.prompt("Enter new playlist name:");
                  if (name && name.trim()) {
                    createPlaylist(name);
                  }
                }}
                className="playlist-create-btn"
                title="Create New Playlist"
              >
                &#10011;
              </button>
            </div>
            
            <div className="playlist-list">
              {playlists.length === 0 ? (
                <span className="empty-playlist-message">No playlists yet. Create one above!</span>
              ) : (
                playlists.map(p => (
                  <div 
                    key={p.id} 
                    className={`playlist-item ${selectedCategory === `playlist-${p.id}` ? 'active' : ''}`}
                    onClick={() => { setSelectedCategory(`playlist-${p.id}`); navigate('/'); }}
                  >
                    <div className="playlist-item-details">
                      <strong className="playlist-item-name">{p.name}</strong>
                      <span className="playlist-item-count">{p.aartiIds.length} items</span>
                    </div>
                    <div className="playlist-item-actions">
                      <button 
                        onClick={(e) => { e.stopPropagation(); if (p.aartiIds.length > 0) setActivePlaylist(p); }}
                        disabled={p.aartiIds.length === 0}
                        className="playlist-play-btn"
                        title="Play"
                      >▶</button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this playlist?')) deletePlaylist(p.id); }} 
                        className="playlist-delete-btn"
                        title="Delete"
                      >🗑</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {!["Playlists", "Help", "About"].includes(contentType) && (
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
                  className={`chip ${selectedCategory === category ? 'active' : ''} ${script === 'latin' && !["All", "Favorites"].includes(category) ? 'text-latin' : ''}`} 
                  onClick={() => { setSelectedCategory(category); navigate('/'); }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div> 
      {/* Render only the selected content */}
      <div className={`aarti-list ${focusedAartiId ? 'focused-list' : ''}`}>
        {contentType === "Help" && (
          <article className="aarti-card help-container">
            <h2 className="help-title">{script === 'latin' ? "How to use Aarti Sangraha?" : "आरती संग्रह कसे वापरावे?"}</h2>
            
            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>☀️/🌙</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Dark Mode" : "डार्क मोड"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Toggle between Light, Dark, and System themes using the top-left sun/moon icon." : "डाव्या बाजूच्या आयकॉनचा वापर करून लाईट किंवा डार्क थीम निवडा."}</p>
              </div>
            </div>
            
            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>A/अ</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Transliteration" : "लिप्यांतरण"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Switch between English (Latin) and Marathi (Devanagari) scripts instantly to read comfortably." : "इंग्रजी (लॅटिन) आणि मराठी (देवनागरी) लिपींमध्ये त्वरित बदल करा."}</p>
              </div>
            </div>
            
            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>A- / A+</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Font Resizer" : "फॉन्ट आकार"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Increase or decrease the lyrics text size on any Aarti card to suit your reading preference." : "तुमच्या वाचनाच्या सोयीनुसार कोणत्याही आरती कार्डवर मजकुराचा आकार कमी किंवा जास्त करा."}</p>
              </div>
            </div>
            
            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>▶</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Custom Playlists & Puja Player" : "कस्टम प्लेलिस्ट आणि पूजा प्लेयर"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Create custom sequences (e.g., 'Morning Puja'). Add Aartis to them and use the Puja Player to navigate sequentially without distractions." : "तुमच्या आवडीनुसार प्लेलिस्ट तयार करा (उदा. 'सकाळची पूजा'). यात आरत्या जोडा आणि विनाव्यत्यय एकापाठोपाठ एक आरती वाचण्यासाठी पूजा प्लेयर वापरा."}</p>
              </div>
            </div>
            
            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>⤢</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Focus Mode" : "फोकस मोड"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Tap on any Aarti card to enter distraction-free mode. It expands the card, hiding menus and other items." : "कोणत्याही आरतीवर क्लिक केल्यास ती पूर्ण स्क्रीनवर दिसेल, जेणेकरून तुम्ही लक्ष केंद्रित करून वाचू शकाल."}</p>
              </div>
            </div>

            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>💡/💤</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Wake Lock" : "वेक लॉक"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Keep your screen awake while reading or performing puja by toggling the bulb/zzz icon in the menu." : "वाचत असताना किंवा पूजा करताना तुमची स्क्रीन चालू ठेवण्यासाठी मेनूमधील बल्ब आयकॉनवर क्लिक करा."}</p>
              </div>
            </div>

            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>🔍</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Search & Filters" : "शोध आणि फिल्टर्स"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Search across titles and lyrics in English or Marathi. Use the top chips to quickly find Aartya by deity." : "इंग्रजी किंवा मराठीत शीर्षक आणि मजकूर शोधा. विशिष्ट देवांच्या आरत्या लवकर शोधण्यासाठी वरील चिप्सचा वापर करा."}</p>
              </div>
            </div>

            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>❤️</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Favorites" : "आवडत्या आरत्या"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Tap the heart icon on any Aarti to save it to your Favorites list. You can reorder them using the Up/Down arrows." : "कोणतीही आरती तुमच्या 'आवडत्या' यादीत जोडण्यासाठी हार्ट आयकॉनवर टॅप करा. तुम्ही त्यांना वर/खाली बाणांचा वापर करून क्रमवारी लावू शकता."}</p>
              </div>
            </div>

            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>📥</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Offline Use & Install" : "ऑफलाइन आणि इन्स्टॉल"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Install the app on your home screen via the menu to read Aartya completely offline without internet." : "इंटरनेटशिवाय आरत्या वाचण्यासाठी मेनूमधून हे ॲप तुमच्या होम स्क्रीनवर इन्स्टॉल करा."}</p>
              </div>
            </div>

            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>🔗</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Share" : "शेअर करा"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Send your favorite Aartya directly to friends and family on WhatsApp or other apps using the share icon." : "तुमच्या आवडत्या आरत्या मित्र आणि कुटुंबासोबत WhatsApp किंवा इतर ॲप्सवर थेट पाठवण्यासाठी शेअर आयकॉनचा वापर करा."}</p>
              </div>
            </div>

            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>💾</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Backup & Restore" : "बॅकअप आणि रिस्टोअर"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Use the menu to export your playlists, favorites, and settings, keeping them safe if you change devices." : "तुमच्या प्लेलिस्ट, आवडत्या आरत्या आणि सेटिंग्ज सुरक्षित ठेवण्यासाठी किंवा नवीन फोनवर घेण्यासाठी मेनूमधून बॅकअप आणि रिस्टोअर वापरा."}</p>
              </div>
            </div>
          </article>
        )}
        {contentType === "About" && (
          <article className="aarti-card help-container">
            <h2 className="help-title">{script === 'latin' ? "About Aarti Sangraha" : "आरती संग्रहाबद्दल"}</h2>
            
            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>ℹ️</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Purpose" : "उद्देश"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "Aarti Sangraha is a free, open-source, offline-capable digital collection of Marathi devotional texts. It aims to preserve and make accessible traditional Aartya, Stotras, and Mantras for daily spiritual practice without distractions." : "आरती संग्रह हा मराठी भक्ती साहित्याचा एक विनामूल्य, ओपन-सोर्स आणि ऑफलाइन चालणारा डिजिटल संग्रह आहे. पारंपरिक आरत्या, स्तोत्रे आणि मंत्र दैनंदिन उपासनेसाठी विनाव्यत्यय उपलब्ध करून देणे हा यामागील मुख्य उद्देश आहे."}</p>
              </div>
            </div>

            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>📱</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Offline Capabilities (PWA)" : "ऑफलाइन सुविधा (PWA)"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "This application is built as a Progressive Web App (PWA). Once you open it, it caches the text data so you can read all your favorite Aartya even without an active internet connection or while in Airplane mode." : "हे ॲप्लिकेशन प्रोग्रेसिव्ह वेब ॲप (PWA) म्हणून तयार केले आहे. एकदा हे उघडल्यानंतर, ते सर्व डेटा सेव्ह करते, जेणेकरून तुम्ही इंटरनेट कनेक्शन नसताना किंवा एअरप्लेन मोडमध्येही आरत्या वाचू शकता."}</p>
              </div>
            </div>

            <div className="help-section" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div className="help-icon" style={{ flex: '0 0 75px', textAlign: 'center', fontSize: '1.5rem', whiteSpace: 'nowrap' }}>🤝</div>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{script === 'latin' ? "Contribute & Contact" : "योगदान आणि संपर्क"}</h3>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{script === 'latin' ? "We welcome contributions! If you notice any corrections or wish to add new Aartya, you can use the '+' button in the menu. For support or feedback, please reach out via the provided Google Form." : "आम्ही तुमच्या योगदानाचे स्वागत करतो! जर तुम्हाला काही सुधारणा सुचवायच्या असतील किंवा नवीन आरत्या जोडायच्या असतील, तर तुम्ही मेनूमधील '+' बटण वापरू शकता. मदत किंवा अभिप्रायासाठी, कृपया दिलेल्या गुगल फॉर्मद्वारे संपर्क साधा."}</p>
              </div>
            </div>
          </article>
        )}
        
        {isNotFound && (
          <article className="aarti-card help-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h2 className="help-title" style={{ fontSize: '2rem', marginBottom: '15px' }}>
              {script === 'latin' ? "404 - Not Found" : "४०४ - सापडले नाही"}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '30px', fontSize: '1.1rem' }}>
              {script === 'latin' 
                ? "The requested Aarti could not be found or has been removed." 
                : "तुम्ही शोधत असलेली आरती सापडली नाही किंवा काढून टाकण्यात आली आहे."}
            </p>
            <button className="add-btn" onClick={() => navigate('/')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
              {script === 'latin' ? "🏠 Return to Home" : "🏠 मुख्य पानावर जा"}
            </button>
          </article>
        )}

        {displayedAartya.map((aarti, index) => {
          const isFocused = focusedAartiId === aarti.id;
          const showContent = isFocused || !!searchQuery;
          const videoId = getYouTubeVideoId(aarti.link);
          
          return (focusedAartiId === null || focusedAartiId === aarti.id) && (
          <article 
            key={aarti.id} 
            className={`aarti-card ${isFocused ? 'focused-aarti-card' : ''}`}
            style={!isFocused ? { animationDelay: `${(index % 20) * 0.05}s` } : {}}
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
        <div className="aarti-card-actions">
          <div className="playlist-dropdown" onClick={(e) => e.stopPropagation()}>
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
            >
              <option value="" disabled>+ Add to Playlist...</option>
              <option value="CREATE_NEW" className="opt-create-new">➕ Create New Playlist</option>
              {playlists.map(p => (
                <option key={p.id} value={p.id} className="opt-black">
                  {p.aartiIds.includes(aarti.id) ? '✓ Remove from' : '+ Add to'} {p.name}
                </option>
              ))}
            </select>
          </div>
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
        </div>
            <h2 className={`aarti-title ${script === 'latin' ? 'text-latin' : ''}`}>
              {isFocused ? (
                <span>{highlightText(script === 'latin' ? (aarti.titleEng || aarti.title) : aarti.title, searchQuery, querySkeleton)}</span>
              ) : (
                <Link to={`/aarti/${aarti.id}`} className="seo-link" onClick={(e) => e.stopPropagation()}>
                  {highlightText(script === 'latin' ? (aarti.titleEng || aarti.title) : aarti.title, searchQuery, querySkeleton)}
                </Link>
              )}
            </h2>
            {aarti.deity && <h3 className={`aarti-deity ${script === 'latin' ? 'text-latin' : ''}`}>{highlightText(script === 'latin' ? (aarti.deityEng || aarti.deity) : aarti.deity, searchQuery, querySkeleton)}</h3>}
            
            {videoId && (
              <div className="youtube-player">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>
            )}

            <LyricsPreview fontSize={fontSize} showContent={showContent}>
              {highlightText(script === 'latin' ? (aarti.lyricsEng || aarti.lyrics) : aarti.lyrics, searchQuery, querySkeleton)}
            </LyricsPreview>
          </article>
          );
        })}
        {!focusedAartiId && visibleCount < filtered.length && !isReorderableList && !["Help", "About"].includes(contentType) && (
          <div ref={loadMoreRef} className="load-more-container">
            <div className="loading-spinner load-more-spinner"></div>
          </div>
        )}
        {!focusedAartiId && visibleCount >= filtered.length && filtered.length > 0 && !isReorderableList && !["Help", "About"].includes(contentType) && (
          <div className="end-of-list-message">
            {script === 'latin' ? "~ You have reached the end ~" : "~ तुम्ही यादीच्या शेवटी पोहोचलात ~"}
          </div>
        )}
        {filtered.length === 0 && !focusedAartiId && !["Help", "About"].includes(contentType) && (
          <p className="no-results">
            {contentType === "Playlists" 
              ? (playlists.length === 0 ? "No playlists yet." : "This playlist is empty. Add Aartya from other tabs!")
              : `No Aartya found matching "${query}"`}
          </p>
        )}
      </div>

      {/* Puja Player Fullscreen Overlay */}
      {activePlaylist && (
        <React.Suspense fallback={<div className="pwa-splash-screen" style={{ position: 'fixed', zIndex: 9999 }}><div className="loading-spinner"></div></div>}>
        <PujaPlayer 
          playlist={activePlaylist} 
          allAartya={sortedAartiData} 
          onExit={() => setActivePlaylist(null)} 
          theme={theme}
          setTheme={setTheme}
          script={script}
          setScript={setScript}
          AartiDetailComponent={({ aarti }) => {
            const videoId = getYouTubeVideoId(aarti.link);
            return (
              <article className="aarti-card focused-aarti-card puja-player-card">
                <h2 className={`aarti-title ${script === 'latin' ? 'text-latin' : ''}`}>{script === 'latin' ? (aarti.titleEng || aarti.title) : aarti.title}</h2>
                {aarti.deity && <h3 className={`aarti-deity ${script === 'latin' ? 'text-latin' : ''}`}>{script === 'latin' ? (aarti.deityEng || aarti.deity) : aarti.deity}</h3>}
                {videoId && (
                  <div className="youtube-player">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
                <div className="aarti-lyrics" style={{ fontSize: `${fontSize}px` }}>{script === 'latin' ? (aarti.lyricsEng || aarti.lyrics) : aarti.lyrics}</div>
              </article>
            );
          }}
        />
        </React.Suspense>
      )}

      {showBackToTop && !focusedAartiId && !activePlaylist && (
        <button 
          className="back-to-top-btn" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          title="Back to top"
        >
          ↑
        </button>
      )}
      
      {/* DESKTOP ONLY: Far Right Pane for Monetag Ad */}
      {/* {!isMobile && (
        <div className="far-right-pane">
          <MonetagAdUnit zoneId="10786137" containerStyle={{ margin: '20px auto', width: '100%', minHeight: '250px' }} />
        </div>
      )} */}

      {/* MOBILE ONLY: Bottom Ad Space */}
      {/* {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '200px',
          width: '100%',
          backgroundColor: 'var(--color-cream)',
          borderTop: `1px solid var(--color-border)`,
          zIndex: 51, // Above sticky header's z-index (50) but below drawer/modals
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <MonetagAdUnit zoneId="10790266" containerStyle={{ width: '100%', height: '100%' }} />
        </div>
      )} */}
    </main>
  );
}

export default App;
