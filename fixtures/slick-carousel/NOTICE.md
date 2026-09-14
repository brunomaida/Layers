Source: https://github.com/kenwheeler/slick ("Slick Carousel")
Commit: 7b2b3a76def3309d235d9ad9683a8d82941896cd
License: MIT (see LICENSE in this folder; the file's own copyright line reads "(c) 2013-2024" with no named holder — Ken Wheeler is the repo author per GitHub, not asserted by the LICENSE text itself)

`slick.css` and `slick-theme.css` are vendored **verbatim, byte-for-byte**, from `slick/slick.css`
(1456 bytes) and `slick/slick-theme.css` (2800 bytes) at the pinned commit — NOT `dist/`, the
repo's built CSS lives directly under `slick/`.

`slick-theme.css` references `ajax-loader.gif` (a loading-spinner background image) and an icon
font (`@font-face` sources `slick.eot`/`.woff2`/`.woff`/`.ttf`, used for the prev/next arrow
glyphs) — neither is vendored here. The loading spinner never shows on a static mock (no live AJAX
loading state to trigger it). The icon font is fetched from this fixture's own `fonts/` folder
(`hoistFaces`) at load time, gets a localhost 404, and the face is dropped with a warning — there
is no broken-image fallback for fonts, the browser just falls back to the next font in the stack.
`.slick-prev:before`/`.slick-next:before` set `content: "←"`/`"→"` (literal Unicode, not a private
icon-font codepoint) at `color: white; opacity: 0.75`, so with the "slick" face missing the arrows
still render — as plain-font arrow glyphs, not icons — but white-on-white against this mock's
default background, effectively invisible; the dots (`content: "•"`, different color) stay visible.
The live demo's own page stylesheet (which styles `.slick-slide h3` and the numbered card content)
was not vendored either — out of scope, same as any page chrome around a captured widget.

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

`viewport` is `610×400` — close to the demo's own single-item layout (~560px slide + arrow
margins), so the current slide fills the visible `.slick-list` (which is `overflow: hidden`,
`slick.css:16`) without a large sliver of the next slide showing, matching what the Basic example
actually looks like live. `.slick-track`'s per-slide widths and the `translate3d` offset are fixed
inline from the capture and unaffected by viewport width either way. The `.slick-prev`/`.slick-next`
arrows (`left: -25px`/`right: -25px` relative to `.slick-list`, `slick-theme.css:61-62,75-76`) sit
partially outside the visible viewport at any width — an effect of the fixed negative offset
relative to the mock's default body margin, not something a wider or narrower viewport fixes.
