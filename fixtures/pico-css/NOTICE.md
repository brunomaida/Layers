Source: https://github.com/picocss/examples (HTML shell) + https://github.com/picocss/pico (CSS framework)
Commit: picocss/examples `fb8bc72839f3b0f3c0eb0075978c7779ca124f4e` (HTML) — picocss/pico `1039a4788d6abc368d5485ae6bac84a8f0e3096f` (CSS)
License: MIT for both repos (see `LICENSE` in this folder, copied from picocss/pico)

This fixture combines two independently versioned Pico CSS repositories, each pinned separately —
`v2-html/index.html` from `picocss/examples` (16419 bytes vendored, after the CDN-href rewrite
below; 16468 bytes upstream) and `css/pico.min.css` from `picocss/pico` (83319 bytes,
byte-identical to the file the demo's original CDN `<link>` already pointed to, so vendoring it
keeps 1:1 fidelity with what the demo was actually testing).

`index.html` originally loaded the CSS via CDN:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2.1.1/css/pico.min.css">
```
Rewritten to the local vendor path:
```html
<link rel="stylesheet" href="css/pico.min.css">
```
This is the one direct edit to vendored mock content in this fixture — required by the zero-network
rule, and it changes nothing being tested since it's byte-identical CSS from the same package
version.

`index.html` also references `js/minimal-theme-switcher.js` and `js/modal.js` via local relative
`<script src>` — neither is vendored (no `js/` folder in this fixture). Not "external": these are
plain local paths that would 404 against this fixture's own folder if the loader tried to fetch
them, but it never does — `<script>` elements are removed wholesale at load time before any `src`
resolution happens, same as every other fixture.

Custom-property check (Task 2 Step 5 of the batch-2 plan): Pico scopes almost everything through
`:root`/`:host` custom properties, so this fixture stress-tests the loader's `:root`→`:host`
selector rewrite (`scopeAst`, `lib/layers-core.js`). Verified passing — `scopeAst` rewrites every
`:root` compound per selector part (0 unrewritten `:root` occurrences, 6 `:host(:not(...))`
rewrites for this sheet), and Pico 2.1.1 already ships its own
`:host(:not([data-theme=dark]))`-style dark-mode selectors, so the rewrite composes cleanly with
the framework's own scoping instead of fighting it.

`index.html` references one asset that was not vendored and is a known broken-image in this
fixture: `img/aleksandar-jason-a562ZEFKW8I-unsplash-2000x1000.jpg` (an Unsplash photo in the
"Medias" section, cosmetic only, unrelated to the CSS layout/typography/form/table/modal/accordion
behavior this fixture exercises) — same excluded-cosmetic-asset pattern as `plain-admin`'s
logo icon and `student-dashboard`'s decorative images.

Vendored for: Layers loader fixture (.css slot) — see plan at
docs/superpowers/plans/2026-09-14-fixtures-reais-batch-2.md
