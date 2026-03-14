📋 Aarti Web-App: Feature Implementation File
Current Stack: React + Vite + Markdown-to-JSON Build Script.
Goal: Transform the static list into a high-utility, mobile-first devotional tool.

🟢 Phase 1: Core UI & Search (The Foundation)
✅ Feature 1.1: Mobile-First Layout - COMPLETED

Implement a sticky header with the search bar.

Use a clean, readable Marathi font (e.g., 'Mukta').

Success Metric: Search bar remains accessible while scrolling lyrics.

✅ Feature 1.2: Category Filter Chips - COMPLETED

Add horizontal scrolling chips at the top (e.g., "All", "Ganpati", "Devi", "Shankar").

Success Metric: Clicking "Ganpati" filters the list instantly without typing.

🟡 Phase 2: User Experience (The "Puja" Mode)
⏳ Feature 2.1: Font Resizer & Line Height - PENDING

Add [ A- ] and [ A+ ] buttons inside the Aarti detail view.

Success Metric: Text size increases/decreases without breaking the layout.

⏳ Feature 2.2: Dark/Devotional Theme - PENDING

Create a theme toggle (Light/Dark). Use "Saffron/Deep Maroon" accents for light and "Dark Grey/Gold" for dark.

🔴 Phase 3: Personalization & Offline (The "App" Experience)
⏳ Feature 3.1: Favorites System (LocalStorage) - PENDING

Add a heart icon to each Aarti.

Create a "My Favorites" category that persists even after closing the browser.

Success Metric: User can see their 5 most-used Aartis at the top.

⏳ Feature 3.2: PWA Implementation - PENDING

Configure vite-plugin-pwa.

Add a manifest file and service worker for offline caching.

Success Metric: Website works and displays Aartis when Airplane Mode is on.

⏳ Feature 3.3: Wake Lock API - PENDING

Implement the screen.keepAwake (Wake Lock API) toggle.

Success Metric: The phone screen does not dim or lock while an Aarti is expanded.


🔴 Phase 4: Update Favorites behavior
⏳ Feature 34.1: Favorites list sequencing based on user preference - PENDING

Add a favorite item moving up and down functionality.
Success Metric: User can move their favorites up and down in the list.



🚀 Implementation Protocol (Instruction for Gemini)
"Please implement Feature [X.X] from the Feature Implementation File.

Provide only the code for this specific feature.

Explain where to insert it in the existing structure.

Verify it does not break the prebuild.js logic."