# vCard Personal Portfolio — Fixture Notice

## Source

**Repository:** [codewithsadee/vcard-personal-portfolio](https://github.com/codewithsadee/vcard-personal-portfolio)  
**Pinned Commit:** `927f09a6ef894a24cc8aef7a2e51f8e93ac306f7`  
**License:** MIT (see `LICENSE` file in this folder)

## Vendored Assets

- `index.html` — HTML mock (full page with sidebar nav, portfolio sections, contact form)
- `assets/css/style.css` — CSS stylesheet (30738 bytes)
- `LICENSE` — MIT license text

## Remote References (Non-Blocking, Sanitized at Load Time)

The fixture's `index.html` contains remote references that the Layers loader sanitizes at load time:

1. **Google Fonts Poppins** — Lines 23-25
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
   ```
   **Fallback:** When network links are unavailable, the browser renders with system `sans-serif`.

2. **Ionicons Icon Library** — Lines 1196-1197
   ```html
   <script type="module" src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js"></script>
   <script nomodule src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js"></script>
   ```
   **Fallback:** Icons render as missing (`<ionicon>` custom elements without the library are inert).

3. **Google Maps Embed** — Line 1149
   ```html
   <iframe src="https://www.google.com/maps/embed?..."></iframe>
   ```
   **Fallback:** Iframe remains but cannot load embedded map.

These remote URLs are stripped by the loader's `dropRemoteUrls` function at load time, so no network requests are made outside localhost during fixture viewing.

## Excluded Assets (Cosmetic, Not Vendored)

The original repository includes images and JavaScript files that are not vendored in this fixture:

**Image files** (under `assets/images/`):
- `logo.ico` (favicon)
- `my-avatar.png`, `avatar-1.png` through `avatar-4.png`
- `blog-1.jpg` through `blog-6.jpg`
- `project-1.jpg` through `project-9.png`
- `logo-1-color.png` through `logo-6-color.png`
- `icon-app.svg`, `icon-dev.svg`, `icon-photo.svg`, `icon-quote.svg`

**JavaScript files:**
- `assets/js/script.js` (sidebar toggle, testimonials modal, form handling)

**Result:** Images render as broken (HTTP 404) in the fixture. JavaScript is stripped unconditionally by the Layers loader at load time (documented architectural rule: Layers never executes scripts for any fixture). The page displays its static HTML structure and CSS layout only — sidebar toggle, testimonials modal toggle, and form interactions do not function. This is consistent with batch 1 fixtures (`student-dashboard`, `plain-admin`, etc.), which also exclude interactive JavaScript.

## Verification

- ✓ HTML parses and loads without network errors (Google Fonts, Ionicons, Maps URLs stripped by loader)
- ✓ Static page structure and CSS layout render correctly (sidebar, navbar, content sections, footer)
- ✓ CSS resolves all selectors correctly to `assets/css/style.css`
- ✓ All inline styles and positioning display as intended
- ✗ Sidebar toggle button, testimonials modal, and contact form interactions do not function (JavaScript stripped at load time)
