# 🤖 Agent Context: Aarti Web-App

This document provides a high-level overview of the Aarti Web-App project for engineering assistants.

## 1. Project Objective

The goal is to create a high-utility, mobile-first, offline-capable progressive web app (PWA) for reading and organizing Marathi devotional texts. The primary content type is "Aarti," but it is designed to be extensible for other types like "Stotra," "Mantra," and "Shloka."

## 2. Core Technologies

- **Framework:** React
- **Build Tool:** Vite
- **Styling:** The app uses a combination of inline styles and a CSS-in-JS approach defined in `App.jsx`. The `styles.md` file outlines a design system (Glassmorphism with Saffron/Maroon colors) intended to be used with a utility-class framework like Tailwind CSS, though this is not fully implemented.
- **Styling:** The app is transitioning from a mix of inline styles and CSS-in-JS towards a dedicated stylesheet (`App.css`). The `styles.md` file outlines a design system (Glassmorphism with Saffron/Maroon colors). **All new styling must be added to a `.css` file and not implemented inline.**
- **State Management:** Primarily uses React's built-in hooks (`useState`, `useEffect`, `useMemo`). User data (favorites, playlists) is persisted in `localStorage`.

## 3. Architecture & File Structure

*   `src/App.jsx`: The monolithic main component. It handles routing, state management, data fetching/filtering, and renders the entire UI, including the main list, sidebars, and mobile drawer.
*   `src/data/Aartya.json`: The primary content source. It's a JSON array of all devotional texts.
*   `src/components/PujaPlayer.jsx`: A fullscreen component that allows users to navigate sequentially through a custom playlist of Aartis.
*   `src/hooks/usePlaylists.js`: A custom hook that encapsulates all logic for creating, deleting, and managing custom user playlists stored in `localStorage`.
*   `FeatureImplementation.md`: A markdown file tracking the status of all planned and completed features.

## 4. Key Features

The application has a rich feature set, as documented in `FeatureImplementation.md`.

### UI & UX
- **Mobile-First & PWA:** Designed for mobile use with offline capabilities via a service worker.
- **Dark/Light/System Theme:** Theme toggling is supported and persists in `localStorage`.
- **Filtering & Search:** Users can filter content by deity/category using chips and perform a cross-script (Devanagari/Latin) search on titles, deities, and lyrics.
- **Focus Mode:** Tapping an Aarti card expands it to a distraction-free, full-width view.

### Personalization
- **Favorites:** Users can mark items as favorites, which are saved locally.
- **Custom Playlists (`usePlaylists.js`):** Users can create multiple, re-orderable playlists (e.g., "Morning Puja").
- **Puja Player (`PujaPlayer.jsx`):** A special mode to step through a playlist one item at a time.
- **Backup & Restore:** Users can export and import their settings, favorites, and playlists as a JSON file.

### Content & Accessibility
- **Multiple Content Types:** The app supports "Aartya," "Bhovtya," "Pradakshina," "Stotra," "Mantra," and "Shloka," filterable via tabs.
- **Transliteration:** A toggle allows users to switch between the original Devanagari script and an English (Latin) transliteration.
- **Font Resizing:** Users can increase or decrease the font size for readability.
- **Video Integration:** Items can have an associated `link` (YouTube URL) which is rendered as an embedded video player.

## 5. Implementation Guidelines

### Styling Convention

To improve maintainability and adhere to best practices, all new styling should be implemented using CSS classes in a dedicated `.css` file (e.g., `src/App.css`). Avoid using inline `style` attributes for new components or UI elements.

**Constraint:** When adding new UI or elements, CSS must be added to a `.css` file and referenced via `className`. Do not add styles directly to components using the `style` attribute.

## 6. Data Structure (`Aartya.json`)

The content is sourced from a single JSON file, `Aartya.json`. Each object in the array represents a devotional text and follows this schema:

```json
{
  "id": "string",         // Unique identifier
  "type": "string",       // e.g., "Aartya", "Stotra"
  "title": "string",      // Title in Devanagari
  "deity": "string",      // Deity in Devanagari
  "titleEng": "string",   // Title in Latin script
  "deityEng": "string",   // Deity in Latin script
  "lyricsEng": "string",  // Lyrics in Latin script
  "link": "string",       // YouTube URL (optional)
  "lyrics": "string"      // Lyrics in Devanagari
}
```

This centralized data model allows for easy filtering, searching, and rendering across the application.

## 7. AI Agent Directives & Constraints

To ensure codebase stability, predictability, and high code quality, all AI agents and coding assistants MUST adhere to the following strict constraints when generating responses, updating code, or designing functionality:

### 7.1. Plan-First Approach
* **Always formulate a plan first.** Before writing or outputting any code modifications, you must explicitly outline a clear, step-by-step plan of action based on the user's request.
* Think step-by-step about how the requested changes interact with the existing architecture outlined in this document before proposing diffs.
* **Explain the "Why".** For every code modification or architecture change proposed in your plan, you must explicitly explain *why* it is necessary to fulfill the user's request. Avoid arbitrary or unexplained refactors.

### 7.2. Strict Scope Containment (No Unnecessary Changes)
* **Modify only what is requested.** Do not refactor, rewrite, reformat, or "clean up" adjacent code that falls outside the explicit scope of the user's prompt.
* Do not alter existing logic, variable names, or file structures unless it is absolutely necessary to fulfill the prompt.
* Keep code diffs as minimal, localized, and targeted as possible.

### 7.3. Anti-Hallucination & Reality Check
* **Do not guess or assume.** If a necessary file, component, API, or piece of context is missing from your current view, do not hallucinate its implementation. Explicitly ask the user to provide the missing file.
* Ensure all code suggestions use the exact variable names, routing structures, and data models (e.g., `Aartya.json` schema) provided in the context.

### 7.4. Styling Adherence
* When adding new elements, adhere to the `App.css` rule established in Section 5. However, **do not** unsolicitedly refactor existing inline styles into CSS classes unless the user specifically asks for a styling refactor.

### 7.5. Mandatory Documentation Checks
* **Consult the Design System:** Before implementing any UI changes or new components, you MUST check `styles.md` to ensure compliance with the official color palette, typography, and component styling guidelines.
* **Follow Feature Protocols:** Always reference `FeatureImplementation.md` to understand the current state of features. Ensure your proposed changes do not conflict with "COMPLETED" features and strictly follow the "Implementation Protocol" outlined at the bottom of that document.