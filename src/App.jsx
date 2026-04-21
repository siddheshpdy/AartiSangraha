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
  const [isFadingSplash, setIsFadingSplash] = useState(false);
  const [query, setQuery] = useState("");
  
  const [contentType, setContentType] = useState(() => {
    const path = location.pathname;
    const match = path.match(/^\/([a-zA-Z]+)\/?$/);
    if (match && match[1]) {
      const routeCategory = match[1].toLowerCase();
      const validTypes = ["Home", "Aartya", "Bhovtya", "Pradakshina", "Stotra", "Mantra", "Shloka", "Playlists", "Help", "Contact", "Privacy", "Terms"];
      const matchedType = validTypes.find(t => t.toLowerCase() === routeCategory);
      if (matchedType) return matchedType;
    }
    return "Home";
  });
  
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
        const sorted = dataArray.map((item, index) => ({ ...item, _originalIndex: index })).sort((a, b) => {
          const deityA = (a.deityEng || "others").toLowerCase().trim();
          const deityB = (b.deityEng || "others").toLowerCase().trim();
          const indexA = deityOrder.indexOf(deityA);
          const indexB = deityOrder.indexOf(deityB);
          const weightA = indexA === -1 ? 999 : indexA;
          const weightB = indexB === -1 ? 999 : indexB;
          
          if (weightA !== weightB) return weightA - weightB;
          // Preserve original markdown file sequence instead of sorting alphabetically
          return a._originalIndex - b._originalIndex;
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
        
        // Sync contentType based on URL if not in focus mode
        const categoryMatch = location.pathname.match(/^\/([a-zA-Z]+)\/?$/);
        if (categoryMatch && categoryMatch[1]) {
          const routeCategory = categoryMatch[1].toLowerCase();
          const validTypes = ["Home", "Aartya", "Bhovtya", "Pradakshina", "Stotra", "Mantra", "Shloka", "Playlists", "Help", "Contact", "Privacy", "Terms"];
          const matchedType = validTypes.find(t => t.toLowerCase() === routeCategory);
          if (matchedType && matchedType !== contentType) {
            setContentType(matchedType);
          }
        } else if (location.pathname === '/' && contentType !== "Home") {
          setContentType("Home");
        }
    }
    }, [location.pathname, contentType]);

  const titleMap = useMemo(() => ({
    "Home": script === 'latin' ? "Home | Aarti Sangraha" : "मुख्यपृष्ठ | आरती संग्रह",
    "Aartya": script === 'latin' ? "Aarti Sangraha" : "आरती संग्रह",
    "Bhovtya": script === 'latin' ? "Bhovti Sangraha" : "भोवती संग्रह",
    "Pradakshina": script === 'latin' ? "Pradakshina Sangraha" : "प्रदक्षिणा संग्रह",
    "Stotra": script === 'latin' ? "Stotra Sangraha" : "स्तोत्र संग्रह",
    "Mantra": script === 'latin' ? "Mantra Sangraha" : "मंत्र संग्रह",
    "Shloka": script === 'latin' ? "Shloka Sangraha" : "श्लोक संग्रह",
    "Playlists": script === 'latin' ? "My Playlists" : "माझी प्लेलिस्ट",
    "Help": script === 'latin' ? "Help & Usage" : "मदत आणि वापर",
    "Contact": script === 'latin' ? "Contact Us" : "संपर्क",
    "Privacy": script === 'latin' ? "Privacy Policy" : "गोपनीयता धोरण",
    "Terms": script === 'latin' ? "Terms of Use" : "वापराच्या अटी"
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

  const getBaseUrl = () => contentType === 'Home' ? '/' : `/${contentType.toLowerCase()}`;

  const handleCloseFocus = () => {
    navigate(getBaseUrl());
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
    if (contentType === "Playlists" && playlists.length > 0) {
      setSelectedCategory(playlists.length > 0 ? `playlist-${playlists[0].id}` : "All");
    } else {
      setSelectedCategory("All");
    }
  }, [contentType]);

  const categories = useMemo(() => {
    if (contentType === "Playlists") {
      return playlists.map(p => `playlist-${p.id}`);
    }
    if (["Home", "Help", "Contact", "Privacy", "Terms"].includes(contentType)) return [];
    
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
      if (["Home", "Help", "Contact", "Privacy", "Terms"].includes(contentType)) return false;

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
    "Home": script === 'latin' ? "Home" : "मुख्यपृष्ठ",
    "Aartya": script === 'latin' ? "Aartya" : "आरत्या",
    "Bhovtya": script === 'latin' ? "Bhovtya" : "भोवत्या",
    "Pradakshina": script === 'latin' ? "Pradakshina" : "प्रदक्षिणा",
    "Stotra": script === 'latin' ? "Stotra" : "स्तोत्रे",
    "Mantra": script === 'latin' ? "Mantra" : "मंत्र",
    "Shloka": script === 'latin' ? "Shloka" : "श्लोक",
    "Playlists": script === 'latin' ? "Playlists" : "प्लेलिस्ट",
    "Help": script === 'latin' ? "Help" : "मदत",
    "Contact": script === 'latin' ? "Contact" : "संपर्क",
    "Privacy": script === 'latin' ? "Privacy" : "गोपनीयता",
    "Terms": script === 'latin' ? "Terms" : "अटी"
  };

  if (isLoadingData) {
    return (
      <>
        <div key="splash" className="pwa-splash-screen">
          <div className="loading-spinner"></div>
          <div className="pwa-splash-title">Aarti Sangraha</div>
        </div>
      </>
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
    <>
      {isFadingSplash && (
        <div key="splash" className="pwa-splash-screen fade-out">
          <div className="loading-spinner"></div>
          <div className="pwa-splash-title">Aarti Sangraha</div>
        </div>
      )}
      <main key="main" className="app-container">
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
              {["Home", "Aartya", "Bhovtya", "Pradakshina", "Stotra", "Mantra", "Shloka", "Playlists", "Help", "Contact", "Privacy", "Terms"].map(type => (
                <button key={type} className={`tab-btn ${contentType === type ? 'active' : ''}`} onClick={() => { setContentType(type); setIsMenuOpen(false); navigate(type === 'Home' ? '/' : `/${type.toLowerCase()}`); }}>
                  {tabLabelMap[type]}
                </button>
              ))}
            </div>

            <div className="drawer-section">
              <React.Suspense fallback={<div className="loading-spinner small-spinner"></div>}>
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
              {["Home", "Aartya", "Bhovtya", "Pradakshina", "Stotra", "Mantra", "Shloka", "Playlists", "Help", "Contact", "Privacy", "Terms"].map(type => (
                <button key={type} className={`tab-btn ${contentType === type ? 'active' : ''}`} onClick={() => { setContentType(type); navigate(type === 'Home' ? '/' : `/${type.toLowerCase()}`); }}>
                  {tabLabelMap[type]}
                </button>
              ))}
            </div>

            <div className="sidebar-section">
              <React.Suspense fallback={<div className="loading-spinner small-spinner"></div>}>
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
        {!["Home", "Playlists", "Help", "Contact", "Privacy", "Terms"].includes(contentType) && (
          <div className={`search-container ${query ? 'has-query' : ''}`} ref={searchContainerRef}>
            <input 
              type="text" 
              placeholder="Search deity, title, or lyrics..." 
              value={query}
              onChange={(e) => { setQuery(e.target.value); navigate(getBaseUrl()); }}
              className="search-input"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestions.length > 0}
              aria-controls="autocomplete-list"
            />
            {query && (
              <button 
                onClick={() => { setQuery(""); navigate(getBaseUrl()); }}
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
                      navigate(getBaseUrl());
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
                    onClick={() => { setSelectedCategory(`playlist-${p.id}`); navigate(getBaseUrl()); }}
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
        {!["Home", "Playlists", "Help", "Contact", "Privacy", "Terms"].includes(contentType) && (
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
                  onClick={() => { setSelectedCategory(category); navigate(getBaseUrl()); }}
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
        {contentType === "Home" && (
          <article className="aarti-card help-container">
            <div className="home-header">
              <h2 className="home-title">{script === 'latin' ? "Welcome to Aarti Sangraha" : "आरती संग्रहामध्ये आपले स्वागत आहे"}</h2>
              <p className="home-subtitle">
                {script === 'latin' 
                  ? "Your daily companion for peace and devotion. A complete collection of authentic Marathi Aartis, Stotras, and Mantras, carefully curated for your daily spiritual practice." 
                  : "तुमच्या दैनंदिन साधनेसाठी एक हक्काचा सोबती. अस्सल आणि पारंपरिक आरत्या, स्तोत्रे आणि मंत्रांचा एक परिपूर्ण संग्रह, जो तुम्हाला भक्तीचा आनंद देतो."}
              </p>
            </div>
            
            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Our Story" : "आमची प्रेरणा"}</span>
                <span className="help-icon">🪔</span>
              </h3>
              <p>{script === 'latin' ? "The idea for Aarti Sangraha was born from a simple, shared experience during the Maghi Ganpati festival at our village temple. With only one or two physical prayer books available, it was difficult for everyone to read and sing along together. Over the years, our family tried many solutions. Decades ago, my grandfather lovingly created xeroxed copies, but they eventually tore and faded. More recently, we cousins compiled a PDF, which was a step forward, but it was still hard to search. Seeing this, I realized I could use my skills to build a better way—a true digital home for our traditions." : "‘आरती संग्रह’ची कल्पना आमच्या गावातील मंदिरात, माघी गणपती उत्सवादरम्यानच्या एका साध्या, कौटुंबिक गरजेतून जन्माला आली. आरतीच्या वेळी फक्त एक-दोन छापील पुस्तकं उपलब्ध असल्यामुळे, सर्वांना एकत्र आरत्या म्हणणं कठीण जायचं. गेल्या काही वर्षांत, आमच्या कुटुंबाने यावर अनेक उपाय करून पाहिले. दशकांपूर्वी, माझ्या आजोबांनी काही आरत्या कागदावर लिहून त्याच्या झेरॉक्स प्रती काढल्या होत्या, पण कालांतराने त्या फाटल्या. अलीकडे, आम्ही भावंडांनी मिळून एक PDF तयार केली, पण ती शोधायला अवघड होती. हे सर्व पाहून, मला माझ्या कौशल्याचा वापर करून एक चांगला उपाय तयार करावासा वाटला - आपल्या परंपरांसाठी एक खरंखुरं डिजिटल घर."}</p>
            </div>

            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Our Solution" : "आमचे समाधान"}</span>
                <span className="help-icon">💡</span>
              </h3>
              <p>{script === 'latin' ? "That's when Aarti Sangraha was created. It's a reliable digital platform designed to be in your pocket whenever you need it. We focused on solving the real-world problems we faced:" : "तेव्हाच ‘आरती संग्रह’ची निर्मिती झाली. हे एक असं डिजिटल व्यासपीठ आहे जे तुम्हाला गरज असेल तेव्हा तुमच्या खिशात तयार असेल. आम्ही प्रत्यक्ष अनुभवातील समस्यांवर लक्ष केंद्रित केले:"}</p>
              <ul className="solution-list">
                <li><strong>{script === 'latin' ? "Works Perfectly Offline:" : "ऑफलाइन चालते:"}</strong> {script === 'latin' ? "Built for places like our village temple where the internet is unreliable. Once you visit the site, it saves the content so you can use it anywhere, anytime." : "हे ॲप खास आमच्या गावातील मंदिरासारख्या ठिकाणांसाठी बनवले आहे, जिथे इंटरनेटची सुविधा उपलब्ध नसते. एकदा तुम्ही वेबसाइट उघडली की, सर्व आरत्या तुमच्या फोनमध्ये सेव्ह होतात."}</li>
                <li><strong>{script === 'latin' ? "Instant Search:" : "सहज शोधा:"}</strong> {script === 'latin' ? "Find any Aarti, Stotra, or Mantra in seconds, without flipping through pages." : "कोणतीही आरती, स्तोत्र किंवा मंत्र काही सेकंदात शोधा, पानं उलटण्याची गरज नाही."}</li>
                <li><strong>{script === 'latin' ? "English Transliteration:" : "इंग्रजी लिपी:"}</strong> {script === 'latin' ? "To help the younger generation and our friends living abroad, we added an instant English script toggle so they can read, chant, and feel connected to their roots." : "नवीन पिढीला आणि परदेशात राहणाऱ्या आमच्या मित्रांना सहजपणे आरत्या वाचता याव्यात आणि आपल्या संस्कृतीशी जोडलेले राहाता यावे, यासाठी आम्ही इंग्रजी लिपीचा पर्याय दिला आहे."}</li>
              </ul>
            </div>

            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "What is an 'App-like' Website?" : "'ॲप' सारखी वेबसाइट म्हणजे काय?"}</span>
                <span className="help-icon">📱</span>
              </h3>
              <p>{script === 'latin' ? "You might notice our website acts like an app you'd get from an app store. This is a 'Progressive Web App' (PWA). It means you can add it to your phone's home screen, and once you do, it works completely offline, just like a native app. It's fast, reliable, and always there for you." : "तुम्ही हे ॲप तुमच्या फोनच्या होम स्क्रीनवर 'इन्स्टॉल' करू शकता. याला 'प्रोग्रेसिव्ह वेब ॲप' (PWA) म्हणतात. एकदा इन्स्टॉल केल्यावर, हे ॲप स्टोअरमधून डाउनलोड केलेल्या ॲपप्रमाणेच इंटरनेटशिवाय पूर्णपणे काम करते."}</p>
            </div>

            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Explore Our Collection" : "आमचा संग्रह"}</span>
                <span className="help-icon">📚</span>
              </h3>
              <div className="category-links">
                <button className="category-link-btn" onClick={() => { setContentType('Aartya'); navigate('/aartya'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{tabLabelMap['Aartya']}</button>
                <button className="category-link-btn" onClick={() => { setContentType('Stotra'); navigate('/stotra'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{tabLabelMap['Stotra']}</button>
                <button className="category-link-btn" onClick={() => { setContentType('Mantra'); navigate('/mantra'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{tabLabelMap['Mantra']}</button>
                <button className="category-link-btn" onClick={() => { setContentType('Shloka'); navigate('/shloka'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{tabLabelMap['Shloka']}</button>
                <button className="category-link-btn" onClick={() => { setContentType('Bhovtya'); navigate('/bhovtya'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{tabLabelMap['Bhovtya']}</button>
                <button className="category-link-btn" onClick={() => { setContentType('Pradakshina'); navigate('/pradakshina'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{tabLabelMap['Pradakshina']}</button>
              </div>
            </div>
          </article>
        )}
        {contentType === "Help" && (
          <article className="aarti-card help-container">
            <h2 className="help-title">{script === 'latin' ? "How to use Aarti Sangraha?" : "आरती संग्रह कसे वापरावे?"}</h2>
            
            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Dark Mode" : "डार्क मोड"}</span>
                <span className="help-icon">☀️/🌙</span>
              </h3>
              <p>{script === 'latin' ? "Toggle between Light, Dark, and System themes using the top-left sun/moon icon." : "डाव्या बाजूच्या आयकॉनचा वापर करून लाईट किंवा डार्क थीम निवडा."}</p>
            </div>
            
            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Transliteration" : "लिप्यांतरण"}</span>
                <span className="help-icon">A/अ</span>
              </h3>
              <p>{script === 'latin' ? "Switch between English (Latin) and Marathi (Devanagari) scripts instantly to read comfortably." : "इंग्रजी (लॅटिन) आणि मराठी (देवनागरी) लिपींमध्ये त्वरित बदल करा."}</p>
            </div>
            
            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Font Resizer" : "फॉन्ट आकार"}</span>
                <span className="help-icon">A- / A+</span>
              </h3>
              <p>{script === 'latin' ? "Increase or decrease the lyrics text size on any Aarti card to suit your reading preference." : "तुमच्या वाचनाच्या सोयीनुसार कोणत्याही आरती कार्डवर मजकुराचा आकार कमी किंवा जास्त करा."}</p>
            </div>
            
            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Custom Playlists & Puja Player" : "कस्टम प्लेलिस्ट आणि पूजा प्लेयर"}</span>
                <span className="help-icon">▶</span>
              </h3>
              <p>{script === 'latin' ? "Create custom sequences (e.g., 'Morning Puja'). Add Aartis to them and use the Puja Player to navigate sequentially without distractions." : "तुमच्या आवडीनुसार प्लेलिस्ट तयार करा (उदा. 'सकाळची पूजा'). यात आरत्या जोडा आणि विनाव्यत्यय एकापाठोपाठ एक आरती वाचण्यासाठी पूजा प्लेयर वापरा."}</p>
            </div>
            
            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Focus Mode" : "फोकस मोड"}</span>
                <span className="help-icon">⤢</span>
              </h3>
              <p>{script === 'latin' ? "Tap on any Aarti card to enter distraction-free mode. It expands the card, hiding menus and other items." : "कोणत्याही आरतीवर क्लिक केल्यास ती पूर्ण स्क्रीनवर दिसेल, जेणेकरून तुम्ही लक्ष केंद्रित करून वाचू शकाल."}</p>
            </div>

            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Wake Lock" : "वेक लॉक"}</span>
                <span className="help-icon">💡/💤</span>
              </h3>
              <p>{script === 'latin' ? "Keep your screen awake while reading or performing puja by toggling the bulb/zzz icon in the menu." : "वाचत असताना किंवा पूजा करताना तुमची स्क्रीन चालू ठेवण्यासाठी मेनूमधील बल्ब आयकॉनवर क्लिक करा."}</p>
            </div>

            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Search & Filters" : "शोध आणि फिल्टर्स"}</span>
                <span className="help-icon">🔍</span>
              </h3>
              <p>{script === 'latin' ? "Search across titles and lyrics in English or Marathi. Use the top chips to quickly find Aartya by deity." : "इंग्रजी किंवा मराठीत शीर्षक आणि मजकूर शोधा. विशिष्ट देवांच्या आरत्या लवकर शोधण्यासाठी वरील चिप्सचा वापर करा."}</p>
            </div>

            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Favorites" : "आवडत्या आरत्या"}</span>
                <span className="help-icon">❤️</span>
              </h3>
              <p>{script === 'latin' ? "Tap the heart icon on any Aarti to save it to your Favorites list. You can reorder them using the Up/Down arrows." : "कोणतीही आरती तुमच्या 'आवडत्या' यादीत जोडण्यासाठी हार्ट आयकॉनवर टॅप करा. तुम्ही त्यांना वर/खाली बाणांचा वापर करून क्रमवारी लावू शकता."}</p>
            </div>

            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Offline Use & Install" : "ऑफलाइन आणि इन्स्टॉल"}</span>
                <span className="help-icon">📥</span>
              </h3>
              <p>{script === 'latin' ? "Install the app on your home screen via the menu to read Aartya completely offline without internet." : "इंटरनेटशिवाय आरत्या वाचण्यासाठी मेनूमधून हे ॲप तुमच्या होम स्क्रीनवर इन्स्टॉल करा."}</p>
            </div>

            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Share" : "शेअर करा"}</span>
                <span className="help-icon">🔗</span>
              </h3>
              <p>{script === 'latin' ? "Send your favorite Aartya directly to friends and family on WhatsApp or other apps using the share icon." : "तुमच्या आवडत्या आरत्या मित्र आणि कुटुंबासोबत WhatsApp किंवा इतर ॲप्सवर थेट पाठवण्यासाठी शेअर आयकॉनचा वापर करा."}</p>
            </div>

            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Backup & Restore" : "बॅकअप आणि रिस्टोअर"}</span>
                <span className="help-icon">💾</span>
              </h3>
              <p>{script === 'latin' ? "Use the menu to export your playlists, favorites, and settings, keeping them safe if you change devices." : "तुमच्या प्लेलिस्ट, आवडत्या आरत्या आणि सेटिंग्ज सुरक्षित ठेवण्यासाठी किंवा नवीन फोनवर घेण्यासाठी मेनूमधून बॅकअप आणि रिस्टोअर वापरा."}</p>
            </div>
          </article>
        )}
        
        {contentType === "Contact" && (
          <article className="aarti-card help-container">
            <h2 className="help-title">{script === 'latin' ? "Contact Us" : "संपर्क"}</h2>
            
            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Get in Touch" : "आमच्याशी संपर्क साधा"}</span>
                <span className="help-icon">📧</span>
              </h3>
              <p>
                {script === 'latin' 
                  ? "For any updates or issues write email to " 
                  : "कोणत्याही अपडेट्स किंवा समस्यांसाठी येथे ईमेल लिहा: "}
                <a href="mailto:siddheshpdy@gmail.com" className="help-link">{"siddheshpdy@gmail.com"}</a>
              </p>
            </div>
          </article>
        )}
        
        {contentType === "Privacy" && (
          <article className="aarti-card help-container">
            <h2 className="help-title">{script === 'latin' ? "Privacy Policy" : "गोपनीयता धोरण"}</h2>
            
            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Cookies and Advertising" : "कुकीज आणि जाहिराती"}</span>
                <span className="help-icon">🍪</span>
              </h3>
              <p>{script === 'latin' ? "Third-party vendors, including Google, use cookies to serve ads based on your prior visits to our website or other websites." : "Google सह तृतीय-पक्ष विक्रेते (Third-party vendors), तुमच्या या किंवा इतर वेबसाइटवरील मागील भेटींवर आधारित जाहिराती दाखवण्यासाठी कुकीज (cookies) वापरतात."}</p>
              <p>{script === 'latin' ? "Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to our site and/or other sites on the Internet." : "Google च्या जाहिरात कुकीजच्या वापरामुळे, ते आणि त्यांचे भागीदार इंटरनेटवरील इतर साइट्सवरील तुमच्या भेटीवर आधारित जाहिराती दाखवू शकतात."}</p>
              <p>{script === 'latin' ? "You may opt out of personalized advertising by visiting " : "तुम्ही वैयक्तिकृत जाहिरातींमधून बाहेर पडण्यासाठी येथे भेट देऊ शकता: "} <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="help-link">Ads Settings</a>.</p>
            </div>
            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Local Storage & User Data" : "स्थानिक संचय आणि वापरकर्ता डेटा"}</span>
                <span className="help-icon">🔒</span>
              </h3>
              <p>{script === 'latin' ? "We do not collect or store any personally identifiable information on our servers. User preferences, playlists, and favorite Aartis are stored completely locally on your device via your browser's local storage." : "आम्ही आमच्या सर्व्हरवर कोणतीही वैयक्तिक माहिती गोळा करत नाही. वापरकर्त्याच्या पसंती, प्लेलिस्ट आणि आवडत्या आरत्या तुमच्या ब्राउझरद्वारे तुमच्या डिव्हाइसवर स्थानिकरित्या (Locally) साठवल्या जातात."}</p>
            </div>
          </article>
        )}
        {contentType === "Terms" && (
          <article className="aarti-card help-container">
            <h2 className="help-title">{script === 'latin' ? "Terms of Use" : "वापराच्या अटी"}</h2>
            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Application Purpose" : "ॲपचा उद्देश"}</span>
                <span className="help-icon">📜</span>
              </h3>
              <p>{script === 'latin' ? "Aarti Sangraha is provided \"as is\" for educational, cultural, and spiritual purposes. While we strive to ensure the accuracy of the traditional texts, we do not guarantee that all lyrics are error-free." : "आरती संग्रह शैक्षणिक, सांस्कृतिक आणि आध्यात्मिक हेतूंसाठी प्रदान केले आहे. आम्ही पारंपरिक मजकूर अचूक ठेवण्याचा प्रयत्न करतो, परंतु सर्व शब्द 100% त्रुटीमुक्त असतील याची आम्ही हमी देत नाही."}</p>
            </div>
            <div className="help-section">
              <h3>
                <span>{script === 'latin' ? "Intellectual Property" : "बौद्धिक संपदा"}</span>
                <span className="help-icon">©️</span>
              </h3>
              <p>{script === 'latin' ? "The devotional lyrics and texts are in the public domain. However, the specific layout, offline functionality, transliteration algorithms, and custom features of this application are proprietary to Aarti Sangraha." : "भक्ती साहित्य आणि मजकूर सार्वजनिक डोमेनमध्ये (Public Domain) आहेत. तथापि, या ॲपची रचना, ऑफलाइन कार्यक्षमता, लिप्यांतरण आणि इतर वैशिष्ट्ये आमच्या मालकीची आहेत."}</p>
            </div>
          </article>
        )}

        {isNotFound && (
          <article className="aarti-card help-container not-found-container">
            <h2 className="help-title not-found-title">
              {script === 'latin' ? "404 - Not Found" : "४०४ - सापडले नाही"}
            </h2>
            <p className="not-found-text">
              {script === 'latin' 
                ? "The requested Aarti could not be found or has been removed." 
                : "तुम्ही शोधत असलेली आरती सापडली नाही किंवा काढून टाकण्यात आली आहे."}
            </p>
            <button className="add-btn return-home-btn" onClick={() => navigate('/')}>
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

            {aarti.description && (
              <p className="aarti-description">{highlightText(script === 'latin' ? (aarti.descriptionEng || aarti.description) : aarti.description, searchQuery, querySkeleton)}</p>
            )}
          </article>
          );
        })}
          {!focusedAartiId && visibleCount < filtered.length && !isReorderableList && !["Home", "Help", "Contact", "Privacy", "Terms"].includes(contentType) && (
          <div ref={loadMoreRef} className="load-more-container">
            <div className="loading-spinner load-more-spinner"></div>
          </div>
        )}
          {!focusedAartiId && visibleCount >= filtered.length && filtered.length > 0 && !isReorderableList && !["Home", "Help", "Contact", "Privacy", "Terms"].includes(contentType) && (
          <div className="end-of-list-message">
            {script === 'latin' ? "~ You have reached the end ~" : "~ तुम्ही यादीच्या शेवटी पोहोचलात ~"}
          </div>
        )}
          {filtered.length === 0 && !focusedAartiId && !["Home", "Help", "Contact", "Privacy", "Terms"].includes(contentType) && (
          <p className="no-results">
            {contentType === "Playlists" 
              ? (playlists.length === 0 ? "No playlists yet." : "This playlist is empty. Add Aartya from other tabs!")
              : `No Aartya found matching "${query}"`}
          </p>
        )}
      </div>

      {/* Puja Player Fullscreen Overlay */}
      {activePlaylist && (
        <React.Suspense fallback={
          <div className="pwa-splash-screen fullscreen-overlay-splash">
            <div className="loading-spinner"></div>
            <div className="pwa-splash-title">Aarti Sangraha</div>
          </div>
        }>
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
            {aarti.description && (
              <p className="aarti-description">{script === 'latin' ? (aarti.descriptionEng || aarti.description) : aarti.description}</p>
            )}
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
    </>
  );
}

export default App;
