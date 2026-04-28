import React, { useState, useEffect, useRef } from 'react';
import storyMr from './temple-story-mr.md?raw';
import storyEn from './temple-story-en.md?raw';

function ImageWithFallback({ src, alt }) {
  const [error, setError] = useState(false);
  
  if (error) {
    return (
      <div style={{ width: '100%', height: '200px', backgroundColor: 'var(--drawer-border-color)', borderRadius: '12px', margin: '2rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', padding: '1rem', textAlign: 'center' }}>
        [ {alt} ]
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      onError={() => setError(true)}
      style={{ width: '100%', minHeight: '200px', borderRadius: '12px', margin: '2rem 0', backgroundColor: 'var(--drawer-border-color)' }} 
    />
  );
}

function AnimatedTimelineItem({ dateText, descText, children }) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target); // Unobserve after fading in once
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    if (domRef.current) observer.observe(domRef.current);
    return () => { if (domRef.current) observer.unobserve(domRef.current); };
  }, []);

  return (
    <div className={`timeline-item ${isVisible ? 'visible' : ''}`} ref={domRef}>
      {dateText && descText ? (
        <>
          <div className="timeline-marker"></div>
          <div className="timeline-content">
            <div className="timeline-date">{parseInline(dateText)}</div>
            <div className="timeline-text">{parseInline(descText)}</div>
          </div>
        </>
      ) : children}
    </div>
  );
}

function parseInline(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderSimpleMarkdown(mdText) {
  if (!mdText) return null;
  
  // Split by horizontal rule first to create major sections
  const majorSections = mdText.split(/\n---\n/);
  
  const finalRender = [];

  majorSections.forEach((majorSection, majorIndex) => {
    // Then split each major section into paragraphs/blocks
    const blocks = majorSection.trim().split(/(?:\r?\n){2,}/);
    
    const renderedBlocks = [];
    let currentHelpSection = [];

    const flushHelpSection = () => {
      if (currentHelpSection.length > 0) {
        renderedBlocks.push(<div key={`section-wrapper-${renderedBlocks.length}`} className="help-section">{currentHelpSection}</div>);
        currentHelpSection = [];
      }
    };

    blocks.forEach((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return;

      const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)/);

      if (trimmed.startsWith('# ')) {
        flushHelpSection();
        renderedBlocks.push(
          <div key={`header-${idx}`} className="home-header">
            <h2 className="home-title" style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--color-secondary)' }}>
              {parseInline(trimmed.replace('# ', ''))}
            </h2>
          </div>
        );
      } else if (trimmed.startsWith('### ')) {
        flushHelpSection();
        currentHelpSection.push(
          <h3 key={`h3-${idx}`}>
            <span>{parseInline(trimmed.replace('### ', ''))}</span>
            <span className="help-icon">🚩</span>
          </h3>
        );
      } else if (imageMatch) {
        flushHelpSection();
        renderedBlocks.push(
          <ImageWithFallback key={`img-${idx}`} src={imageMatch[2]} alt={imageMatch[1]} />
        );
      } else if (trimmed.startsWith('**[')) {
         flushHelpSection();
         renderedBlocks.push(
           <div key={`box-${idx}`} style={{ width: '100%', height: '200px', backgroundColor: 'var(--drawer-border-color)', borderRadius: '12px', margin: '2rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
             {parseInline(trimmed)}
           </div>
         );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split(/\r?\n/).map(s => s.replace(/^[-*]\s+/, '').trim());
        
        // Detect if this list is a timeline (checks if the first item starts with bold text like **1960:**)
        const isTimeline = items.length > 0 && items[0].match(/^\*\*(.*?)\*\*(.*)/);

        if (isTimeline) {
          currentHelpSection.push(
            <div key={`timeline-${idx}`} className="timeline-container">
              {items.map((item, i) => {
                const match = item.match(/^\*\*(.*?)\*\*(.*)/);
                if (match) {
                  const dateText = match[1].replace(/:$/, '').trim();
                  const descText = match[2].replace(/^:\s*/, '').trim();
                  return (
                    <AnimatedTimelineItem key={i} dateText={dateText} descText={descText} />
                  );
                }
                return <AnimatedTimelineItem key={i}>{parseInline(item)}</AnimatedTimelineItem>;
              })}
            </div>
          );
        } else {
          currentHelpSection.push(
            <ul key={`ul-${idx}`} className="solution-list" style={{ marginBottom: '1.5rem', paddingLeft: '20px' }}>
              {items.map((item, i) => <li key={i}>{parseInline(item)}</li>)}
            </ul>
          );
        }
      } else {
        // This is a paragraph
        if (renderedBlocks.length === 1 && currentHelpSection.length === 0) {
           // This is the subtitle right after the main title
           renderedBlocks.push(
             <p key={`subtitle-${idx}`} className="home-subtitle" style={{ fontSize: '1.1rem', lineHeight: '1.6', fontStyle: 'italic', textAlign: 'justify', marginBottom: '2rem' }}>
               {parseInline(trimmed)}
             </p>
           );
        } else {
           currentHelpSection.push(
             <p key={`p-${idx}`} style={{ marginBottom: '1rem' }}>{parseInline(trimmed)}</p>
           );
        }
      }
    });

    flushHelpSection(); // Flush any remaining paragraphs
    
    finalRender.push(<div key={`major-section-${majorIndex}`}>{renderedBlocks}</div>);

    // Add HR if it's not the last part
    if (majorIndex < majorSections.length - 1) {
      finalRender.push(<hr key={`hr-${majorIndex}`} style={{ border: 'none', borderTop: '1px dashed var(--drawer-border-color)', margin: '3rem 0' }} />);
    }
  });

  return finalRender;
}

export default function TempleStory({ script }) {
  const activeMarkdown = script === 'latin' ? storyEn : storyMr;
  return <article className="aarti-card help-container">{renderSimpleMarkdown(activeMarkdown)}</article>;
}