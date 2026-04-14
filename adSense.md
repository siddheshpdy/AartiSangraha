# 📈 Google AdSense Approval Plan

**Issue:** Rejected for "Low value content" and "Thin content".
**Root Cause:** The app aggregates public domain devotional lyrics without sufficient original textual content, lacks standard policy pages, and has pages with very low word counts.

## ⏳ Phase 0: User Experience & Landing Page
**Goal:** Create a welcoming, content-rich landing page for new users to improve user experience and provide clear, upfront value.

1.  **Implement "Home" Tab:** Create a new "Home" page that serves as the default landing view instead of the Aarti list.
2.  **Populate Home Page:** Add content summarizing the website's purpose (from the "About" page) and key usage guidelines (from the "Help" page).
3.  **Add Call-to-Action:** Include a prominent button on the Home page that navigates the user to the main "Aartya" collection.

## ⏳ Phase 1: Content Enrichment (The "Bhavarth" & History Update)
**Goal:** Prove to Google that this site offers unique value beyond just copying lyrics.

1.  **Update Markdown Frontmatter:** 
    Add new fields to the markdown files for your top 20-30 most popular Aartis/Stotras:
    *   `description`: A 50-100 word unique introduction.
    *   `meaning` (optional): The meaning/translation of the Aarti.
    *   `history` (optional): Information about the composer (e.g., Samarth Ramdas, Adi Shankaracharya).
2.  **Update Build Script (`prebuild.js`):** Ensure the new markdown frontmatter fields are parsed and included in `Aartya.json`.
3.  **Update `App.jsx` UI:** Modify the Aarti detail view (Focus Mode / `PujaPlayer`) to render these new `description` and `meaning` fields above or below the lyrics.

## ⏳ Phase 2: Resolve "Thin Content" for Shlokas
**Goal:** Prevent Googlebot from indexing pages with less than 100 words.

1.  **Group Short Items:** Instead of routing to individual 2-line Shlokas, create grouped articles like "10 Essential Morning Shlokas" or render the "Shloka" tab as a single continuous reading page rather than clickable individual cards that open empty focus modes.
2.  **Add Word Count Minimums:** For items that are too short, wrap them with rich descriptions of how and when to chant them.

## ✅ Phase 3: Essential "Trust" Pages
**Goal:** Meet AdSense publisher legal requirements.

1.  **Privacy Policy Page:**
    *   Add a new tab/component for "Privacy Policy".
    *   **Crucial:** Must explicitly state that third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites.
2.  **Terms of Service / Disclaimer:**
    *   Add a new tab/component for "Terms of Use".
    *   State that the application provides traditional texts for educational/devotional purposes.

## ⏳ Phase 4: Create an "Articles" or "Blog" Section (Optional but Highly Recommended)
**Goal:** Tip the scale of the site's overall content to be viewed as an "Original Creator".

1.  Add an `Articles` type to the JSON data.
2.  Write 5-7 purely original, 500+ word blog posts about Hindu spirituality, the significance of fasting, how to perform daily Puja, the history of the Warkari sect, etc.
3.  Add an "Articles" tab to `App.jsx` to render these posts.

## ⏳ Phase 5: Technical SEO Checklist (In Progress)
**Goal:** Ensure the Googlebot actually sees the text and not just an empty React `<div id="root">`.

1.  ✅ **Sitemap.xml:** Ensure you have a script generating a `sitemap.xml` with all your `/aarti/:id` routes.
2.  ✅ **Robots.txt:** Submit the sitemap in `robots.txt`.
3.  ✅ **Pre-rendering (If needed):** If Search Console shows your pages are blank, implement a Vite SSG plugin to pre-render the HTML at build time.

---

### 🚀 Next Steps for Implementation

- [x] *Step 1:* Start by updating `App.jsx` to include the **Privacy Policy** and **Terms of Use** tabs. (Phase 3 Completed)
- [ ] *Step 2:* Add the `description` rendering logic to the Aarti cards in `App.jsx` (Phase 1).
- [ ] *Step 3:* Go through `src/content/Aartya/` and write original descriptions for the most popular Aartis.