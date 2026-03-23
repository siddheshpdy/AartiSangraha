📋 Aarti Web-App: Feature Implementation File
Current Stack: React + Vite + Markdown-to-JSON Build Script.
Goal: Transform the static list into a high-utility, mobile-first devotional tool.

🎨 UI & UX (User Interface & User Experience)
✅ Feature 1.1: Mobile-First Layout - COMPLETED

Implement a sticky header with the search bar.
Use a clean, readable Marathi font (e.g., 'Mukta').
Success Metric: Search bar remains accessible while scrolling lyrics.

✅ Feature 1.2: Category Filter Chips - COMPLETED

Add horizontal scrolling chips at the top (e.g., "All", "Ganpati", "Devi", "Shankar").
Success Metric: Clicking "Ganpati" filters the list instantly without typing.

✅ Feature 1.3: Dark/Devotional Theme - COMPLETED

Create a theme toggle (Light/Dark). Use "Saffron/Deep Maroon" accents for light and "Dark Grey/Gold" for dark.

✅ Feature 1.4: Focus / Zen Mode - COMPLETED

When a user taps on an Aarti card, expand it to take up the full screen (hiding the search bar, filter chips, and other Aartya).
Success Metric: User is presented with a distraction-free view containing only the title, deity, and lyrics.


⚙️ Personalization & User Data
✅ Feature 2.1: Favorites System (LocalStorage) - COMPLETED

Add a heart icon to each Aarti.
Create a "My Favorites" category that persists even after closing the browser.
Success Metric: User can see their 5 most-used Aartya at the top.

✅ Feature 2.2: Favorites list sequencing based on user preference - COMPLETED

Add a favorite item moving up and down functionality.
Success Metric: User can move their favorites up and down in the list.

✅ Feature 2.3: Custom "Puja Playlists" - COMPLETED

Instead of just one "Favorites" list, allow users to create specific sequences (e.g., "Daily Evening Puja", "Ganesh Chaturthi Sequence"). Add a "Start Puja" button that shows them one Aarti at a time with a "Next Aarti" button at the bottom.
Success Metric: User can navigate sequentially through their selected list of Aartya without going back to the main menu.

✅ Feature 2.4: Backup & Restore Settings - COMPLETED

Since `localStorage` can be cleared by the browser or lost when switching phones, add an option to "Export" and "Import" their favorites and settings as a small JSON file.
Success Metric: User can download their configuration, clear their browser data, and fully restore their favorites by uploading the file.


📖 Reading & Accessibility Enhancements
✅ Feature 3.1: Font Resizer & Line Height - COMPLETED

Add [ A- ] and [ A+ ] buttons inside the Aarti detail view.
Success Metric: Text size increases/decreases without breaking the layout.

✅ Feature 3.2: English Transliteration Toggle - COMPLETED

Add a toggle (A/अ) that converts the Devanagari text into English transliteration (Latin script).
Success Metric: User can click a button and instantly read "जय देव जय देव" as "Jai Dev Jai Dev".

✅ Feature 3.3: Cross-Script Search (English/Devanagari) - COMPLETED

Allow users to type search queries in English (Latin script) and match against actual Devanagari contents (lyrics, title, deity). This can be achieved by pre-building romanized search fields during the build step.
Success Metric: Typing "sukha" or "सुख" both correctly return the "Sukhakarta Dukhaharta" Aarti by searching the lyrics.


📱 PWA & Device Integration
✅ Feature 4.1: PWA Implementation - COMPLETED

Configure vite-plugin-pwa.
Add a manifest file and service worker for offline caching.
Success Metric: Website works and displays Aartya when Airplane Mode is on.

✅ Feature 4.2: Wake Lock API - COMPLETED

Implement the screen.keepAwake (Wake Lock API) toggle.
Success Metric: The phone screen does not dim or lock while an Aarti is expanded.


🌐 Content & Social Features
⏳ Feature 5.1: YouTube Video Playback - PENDING

Add an optional frontmatter field `youtubeUrl` in the markdown files. Display an embedded mini YouTube player or a "Watch Video" button on the card if the URL exists.
Success Metric: User can play and listen to the tune of the Aarti via YouTube while reading the lyrics.

⏳ Feature 5.2: Share Button - PENDING

Add a share icon to each Aarti that uses the native Web Share API (`navigator.share`). It can share a deep-link to the app or copy the lyrics/title as text.
Success Metric: User can click share and send the Aarti lyrics directly to a family WhatsApp group.


🚀 Implementation Protocol (Instruction for Gemini)
"Please implement Feature [X.X] from the Feature Implementation File.

Provide only the code for this specific feature.

Explain where to insert it in the existing structure.

Verify it does not break the prebuild.js logic."