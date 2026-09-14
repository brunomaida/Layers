Source: https://github.com/codewithsadee/vcard-personal-portfolio
Commit: 927f09a6ef894a24cc8aef7a2e51f8e93ac306f7
License: MIT (see LICENSE in this folder)

`index.html` (full page: sidebar nav, testimonials modal, portfolio, contact form) and
`assets/css/style.css` (30738 bytes) are vendored verbatim from the pinned commit.

`layers.json`'s `fonts` lists `"Poppins"` — the template loads it from Google Fonts
(`index.html`, `<link>` to `fonts.googleapis.com`). Poppins is not in this project's local
`fonts/projects.css` catalog (Geist, JetBrains Mono, Newsreader only) — per contract this is a
non-blocking warning + system `sans-serif` fallback, never a fetch, same pattern as batch 1's
`student-dashboard`/`plain-admin`.

Three remote references in `index.html` are handled by the loader at load time, none of them
survive to render or to the network:
- The Google Fonts `<link>` (preconnect + stylesheet) goes through `useLocalFaces` (`index.html:1034`)
  the same as the `fonts` entry above — resolves against the local catalog, doesn't fetch.
- The Ionicons `<script type="module">`/`<script nomodule>` tags (22 `<ion-icon>` elements in the
  markup) are removed outright by the loader's element-removal pass
  (`doc.querySelectorAll('script, link, iframe, ...').forEach(e => e.remove())`, `index.html:1035`)
  before any `src` is ever resolved — with no library loaded, `<ion-icon>` is an inert unknown
  element and its icons don't render.
- The Google Maps `<iframe src="https://www.google.com/maps/embed?...">` is removed by that same
  pass, not left in place — the loader strips `iframe` unconditionally.

Excluded (cosmetic, not vendored) — images under `assets/images/`: `logo.ico`, `my-avatar.png`,
`avatar-1.png`–`avatar-4.png`, `blog-1.jpg`–`blog-6.jpg`, `project-1.jpg`–`project-9.png`,
`logo-1-color.png`–`logo-6-color.png`, `icon-app.svg`, `icon-design.svg`, `icon-dev.svg`,
`icon-photo.svg`, `icon-quote.svg` — these render as broken images (404 against this fixture's
folder), cosmetic only. `assets/js/script.js` (sidebar toggle, testimonials modal, form handling)
is also excluded; unlike `student-dashboard`, which does vendor its interactive JS
(`app.js`/`timeTable.js`), this fixture has none — all interactivity here comes from the one
excluded `script.js`, so sidebar toggle, modal, and form handling don't function regardless.

The page has no `<footer>` element. `style.css:211-216` shows only one `<article>` at a time
(`.active` class, toggled by the excluded `script.js`) — with JS stripped, only the About section
is visible; Resume/Portfolio/Blog/Contact stay hidden. CSS resolution against `style.css` works for
the elements the loader's heuristic actually targets — the first class opening each top-level rule
(`index.html:1076`, `lib/layers-core.js:136`) — not a claim that every selector in the sheet
resolves.

Vendored for: Layers loader fixture (.html slot) — see plan at
docs/superpowers/plans/2026-09-14-fixtures-reais-batch-2.md
