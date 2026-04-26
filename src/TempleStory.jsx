import React from 'react';
import storyMr from './temple-story-mr.md?raw';
import storyEn from './temple-story-en.md?raw';

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
  // Split into paragraphs by double newlines safely across OS types
  const sections = mdText.split(/(?:\r?\n){2,}/);
  
  const renderedSections = [];
  let currentHelpSection = [];

  sections.forEach((section, idx) => {
    const trimmed = section.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('# ')) {
      // Main Page Title
      renderedSections.push(
        <div key={`header-${idx}`} className="home-header">
          <h2 className="home-title" style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--color-secondary)' }}>
            {parseInline(trimmed.replace('# ', ''))}
          </h2>
        </div>
      );
    } else if (trimmed.startsWith('### ')) {
      // Sub-headings (Groups paragraphs under a section)
      if (currentHelpSection.length > 0) {
        renderedSections.push(<div key={`section-wrapper-${idx}`} className="help-section">{currentHelpSection}</div>);
        currentHelpSection = [];
      }
      currentHelpSection.push(
        <h3 key={`h3-${idx}`}>
          <span>{parseInline(trimmed.replace('### ', ''))}</span>
          <span className="help-icon">🚩</span>
        </h3>
      );
    } else if (trimmed.startsWith('**[')) {
       // Photo placeholders
       if (currentHelpSection.length > 0) {
         renderedSections.push(<div key={`section-wrapper-${idx}`} className="help-section">{currentHelpSection}</div>);
         currentHelpSection = [];
       }
       renderedSections.push(
         <div key={`box-${idx}`} style={{ width: '100%', height: '200px', backgroundColor: 'var(--drawer-border-color)', borderRadius: '12px', margin: '2rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
           {parseInline(trimmed)}
         </div>
       );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // Bullet Points
      const items = trimmed.split(/\r?\n/).map(s => s.replace(/^[-*]\s/, ''));
      currentHelpSection.push(
        <ul key={`ul-${idx}`} className="solution-list" style={{ marginBottom: '1.5rem' }}>
          {items.map((item, i) => <li key={i}>{parseInline(item)}</li>)}
        </ul>
      );
    } else {
      // Standard Text Paragraphs
      if (renderedSections.length === 1 && currentHelpSection.length === 0 && !trimmed.startsWith('###')) {
         renderedSections.push(
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

  if (currentHelpSection.length > 0) {
    renderedSections.push(<div key={`section-wrapper-end`} className="help-section">{currentHelpSection}</div>);
  }
  return renderedSections;
}

export default function TempleStory({ script }) {
  const activeMarkdown = script === 'latin' ? storyEn : storyMr;
  return <article className="aarti-card help-container">{renderSimpleMarkdown(activeMarkdown)}</article>;
}