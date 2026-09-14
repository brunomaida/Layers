Source: https://github.com/kenwheeler/slick ("Slick Carousel")
Commit: 7b2b3a76def3309d235d9ad9683a8d82941896cd
License: MIT (see LICENSE in this folder, copyright 2013 Ken Wheeler)

`slick.css` and `slick-theme.css` are vendored **verbatim, byte-for-byte**, from `slick/slick.css`
(1456 bytes) and `slick/slick-theme.css` (2800 bytes) at the pinned commit — NOT `dist/`, the
repo's built CSS lives directly under `slick/`.

`slick-theme.css` references `ajax-loader.gif` (a loading-spinner background image) and an icon
font (`slick.woff`/`slick.ttf`/`slick.svg` via `@font-face`, used for the prev/next arrow glyphs)
— neither is vendored here. Both are cosmetic: the loading spinner never shows on a static mock
(no live AJAX loading state to trigger it), and the arrow glyphs fall back to the loader's
`@font-face` `url()` neutralization + broken-image fallback the same way batch 1's
`coffee-masters` fixture handled its own icon-font gap (see that fixture's `NOTICE.md`). The
arrows remain clickable/visible as plain buttons; only their icon glyph is absent.

## Snapshot fixture — captured DOM, not vendored markup

Slick Carousel has no static markup of its own: `$(el).slick()` transforms a plain `<div>` of
`<div>` children into the `.slick-slider` structure (`.slick-list > .slick-track > .slick-slide`,
plus `.slick-prev`/`.slick-next` arrows and a `.slick-dots` list) entirely at runtime. Since Layers
never executes `<script>` (architectural rule — the loader strips all `<script>` tags at load
time), there is no JS to vendor and run; instead `layers/mock.html` is a **snapshot** of the
already-rendered DOM, captured live and saved as static HTML.

Captured from the live demo at https://kenwheeler.github.io/slick/ (the project's own GitHub Pages
site, same commit lineage as the pinned CSS), using `document.querySelector('.slick-slider')` —
the first `.slick-slider` element in document order. The demo page embeds all ~15 example variants
(Multiple Items, Responsive, Variable Width, Center Mode, Fade, Autoplay, synced sliders, etc.)
concatenated under one `#features` section; the first in DOM order is the **Basic** example
(`class="slider single-item"`, a single-item, dot-navigated, infinite-loop carousel with 6
numbered slides `1`–`6`). No other example was captured.

Capture method: clone the element, strip `script`/`noscript`/`template`/`iframe`/`link`/`style`
descendants and any `on*` attributes (adapted from `tools/layers-snapshot.js`'s logic, scoped to
this one element instead of the whole `<body>`), then wrap the resulting fragment in a minimal
`<!doctype html>` document. The captured markup preserves Slick's live runtime state as rendered:
`slick-initialized`/`slick-dotted` classes, inline `style="width: …px"` per slide and the
`transform: translate3d(...)` track offset, `aria-hidden`/`tabindex` per slide, the two
`slick-cloned` slides Slick appends for infinite-loop wraparound (indices `-1` and `6`, duplicating
slides `6` and `1`), and the `.slick-dots` list with one active dot. Nothing was hand-edited beyond
the strip/wrap steps above.

`viewport` is `900×400` (wider than the demo's own layout) so all six ~560px-wide cloned+real
slides in the `4480px`-wide track have room to lay out without the container clipping the capture's
already-computed `translate3d` offset in an unrepresentative way.
