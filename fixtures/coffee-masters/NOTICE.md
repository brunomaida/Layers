Source: https://github.com/flaviodelgrosso/vanilla-typescript-spa ("Coffee Masters")
Commit: bdffb75becb16d51f813e31abd8b32d6a8b37676
License: MIT (see LICENSE in this folder, copyright 2023 Flavio Del Grosso)

`home.css` is vendored verbatim from `src/pages/home/home.css`. `app.css` is vendored from
`src/styles/app.css` with **one rule deliberately removed**: `ul { display: none; padding: 0; }`
— see "Why one global CSS rule had to go" below, this is not a silent edit. `src/styles/index.css`
was NOT vendored — its only content is `@import "./app.css";`, contributing no rules of its own.

`src/pages/home/index.ts` is vendored as read-only reference only (Layers never
transpiles/executes `.ts`) — `layers.json`'s `root.src` points to it: `export default class Home
extends HTMLElement` at line 12, decorated `@CustomElement({ selector: "app-home", ..., shadow:
true })`.

`data/images/*.png` and `images/logo.svg` are vendored product photos and the header logo from
`public/data/images/` and `public/images/` — cosmetic assets; the loader doesn't specially
resolve non-CSS asset paths against the fixture base, so these may render as broken-image icons
depending on how the mock is loaded (harmless, not a fixture failure — same caveat noted by the
other fixtures' briefs).

## Why `layers/mock.html` required piercing a Shadow DOM (important finding)

This app renders the Home page's product list inside `<app-home>`'s **open Shadow DOM**
(explicit `shadow: true` in the `@CustomElement` decorator) — the page's own `<main id="app">`
light DOM only ever contains an empty `<app-home></app-home>` tag; the actual `<section>` full of
`<product-item>` cards lives inside `app-home.shadowRoot`, entirely invisible to anything that
only clones/serializes `document.body` without descending into shadow roots.

`tools/layers-snapshot.js` (as currently written) does exactly that: `document.body.cloneNode`
with no shadow-root traversal. Run unmodified against this app, it would have produced a mock
with an empty `<app-home>` tag and none of the actual menu — a fixture that "loads" but shows
nothing. This is a real, reproducible gap in the documented snapshot tool, not a hypothetical one;
this fixture is what surfaced it. Vendoring here worked around it by manually piercing
`app-home.shadowRoot` and flattening its content into the mock's light DOM (`main#app > app-home >
section...`), since Layers' own mock format has no shadow-DOM concept — the loader wraps the
*whole* mock in its own single outer shadow root regardless, so flattening the source app's
internal shadow boundary is a correct, lossless-enough adaptation for this fixture's purpose — it
does mean `home.css`'s and `app.css`'s bare-tag selectors (`ul`, `h3`, `button`...), which relied
on the *source* app's Shadow DOM for scoping rather than BEM class names, now apply mock-wide
instead of just to the home section. In one case (`app.css`'s `ul { display: none }`) this
collision wasn't harmless — see "Why one global CSS rule had to go" below.

Fixing `tools/layers-snapshot.js` itself (e.g. recursively serializing open shadow roots) is out
of scope for this vendoring task — flagged here for whoever picks up loader/tooling work next.

## Why one global CSS rule had to go

`app.css` has `ul { display: none; padding: 0; }` and `section.page { display: none; }` — the
real app's client-side router hides all page containers by default and only shows the active
route (both rules are outside any Shadow DOM, so in the real app they only ever match the
router's own page-wrapper elements — never `#menu`, which lives safely inside `app-home`'s
shadow root and is never touched by them).

Flattening `#menu` into light DOM (see above) exposes it to that same global `ul` selector for
the first time — something that never happens in the real, running app. With the rule intact, the
fixture loaded but rendered **empty**: `#menu` collapsed to `display:none`, which zeroed its
parent `<section>`'s box, which zeroed `<app-home>`, which zeroed `<main>` — `walk()`
(`index.html:1259`, `if (r.width === 0 || r.height === 0) return`) prunes a subtree the instant a
node has no layout box, so nothing under `<main>` ever reached the layer tree (confirmed via
`getBoundingClientRect()` on each ancestor in the live loader before and after this fix).

Keeping the rule would misrepresent this fixture as broken when it isn't — the breakage is purely
an artifact of the flattening this vendoring method requires, not of the loader or of the real
app. Removing it is the smaller, more honest edit than inventing a synthetic wrapper selector that
never existed in the source. `section.page { display: none; }` was left untouched — nothing in
this mock has a `.page` class, so it doesn't match anything here.

Vendored for: Layers loader fixture (.ts slot) — see plan at
C:\Users\bruno\.claude\plans\com-objetivo-de-melhorar-linear-hinton.md
