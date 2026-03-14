📋 Aarti Web-App: Feature Implementation File
Current Stack: React + Vite + Markdown-to-JSON Build Script.
Goal: Transform the static list into a high-utility, mobile-first devotional tool.

🟢 Phase 1: Core UI & Search (The Foundation)
Feature 1.1: Mobile-First Layout

Implement a sticky header with the search bar.

Use a clean, readable Marathi font (e.g., 'Mukta').

Success Metric: Search bar remains accessible while scrolling lyrics.

Feature 1.2: Category Filter Chips

Add horizontal scrolling chips at the top (e.g., "All", "Ganpati", "Devi", "Shankar").

Success Metric: Clicking "Ganpati" filters the list instantly without typing.

🟡 Phase 2: User Experience (The "Puja" Mode)
Feature 2.1: Font Resizer & Line Height

Add [ A- ] and [ A+ ] buttons inside the Aarti detail view.

Success Metric: Text size increases/decreases without breaking the layout.

Feature 2.2: Wake Lock API

Implement the screen.keepAwake (Wake Lock API) toggle.

Success Metric: The phone screen does not dim or lock while an Aarti is expanded.

Feature 2.3: Dark/Devotional Theme

Create a theme toggle (Light/Dark). Use "Saffron/Deep Maroon" accents for light and "Dark Grey/Gold" for dark.

🔴 Phase 3: Personalization & Offline (The "App" Experience)
Feature 3.1: Favorites System (LocalStorage)

Add a heart icon to each Aarti.

Create a "My Favorites" category that persists even after closing the browser.

Success Metric: User can see their 5 most-used Aartis at the top.

Feature 3.2: PWA Implementation

Configure vite-plugin-pwa.

Add a manifest file and service worker for offline caching.

Success Metric: Website works and displays Aartis when Airplane Mode is on.

🚀 Implementation Protocol (Instruction for Gemini)
"Please implement Feature [X.X] from the Feature Implementation File.

Provide only the code for this specific feature.

Explain where to insert it in the existing structure.

Verify it does not break the prebuild.js logic."