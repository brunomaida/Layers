Source: https://github.com/flaviodelgrosso/vanilla-typescript-spa ("Coffee Masters")
Commit: bdffb75becb16d51f813e31abd8b32d6a8b37676
License: MIT (see LICENSE in this folder, copyright 2023 Flavio Del Grosso)

`home.css` and `app.css` are vendored **verbatim, byte-for-byte**, from `src/pages/home/home.css`
and `src/styles/app.css` — no edits. `src/styles/index.css` was NOT vendored — its only content is
`@import "./app.css";`, contributing no rules of its own. See "A mock-side override, not a CSS
edit" below for how a vendoring-only artifact of `app.css`'s `ul` rule was neutralized without
touching the vendored file.

`src/pages/home/index.ts` is vendored as read-only reference only (Layers never
transpiles/executes `.ts`) — `layers.json`'s `rules` maps the `app-home` tag to it: `export default
class Home extends HTMLElement` at line 13, decorated `@CustomElement({ selector: "app-home", ...,
shadow: true })` (lines 8-12). `rules` rather than `root` because the mock's `<body>` has two
children (`<app-header>`, `<main id="app">`) — the loader only attributes `root.name`/`root.src`
cleanly when `<body>` has exactly one; `rules` reaches the actual `<app-home>` element directly
instead of mislabeling the synthetic two-child wrapper as `app-home`.

`data/images/*.png` and `images/logo.svg` are vendored product photos and the header logo from
`public/data/images/` and `public/images/` — cosmetic assets; the loader doesn't specially
resolve non-CSS asset paths against the fixture base, so these may render as broken-image icons
depending on how the mock is loaded (harmless, not a fixture failure — same caveat noted by the
other fixtures' briefs).

Icon-font note: `layers.json`'s `fonts` lists `"Material Symbols Outlined"` (the header's
`local_cafe`/`shopping_cart` icons), but no icon font ships in this repo's `fonts/` catalog. Per
contract this is a non-blocking warning + fallback, never a fetch — the visible effect is that
those two nav links render their literal ligature text (`local_cafe`, `shopping_cart`) instead of
icon glyphs when loaded without the real font available.

Capture-state note: upstream ships `<span id="badge" hidden></span>` (empty cart). The captured
mock has `<span id="badge">1</span>` — one item was added to the cart through the real UI before
capturing, for a more realistic state (also exercises the `#badge` styling rules in `app.css`,
which an empty/hidden badge wouldn't).

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
collision wasn't harmless — see "A mock-side override, not a CSS edit" below.

Fixing `tools/layers-snapshot.js` itself (e.g. recursively serializing open shadow roots) is out
of scope for this vendoring task — flagged here for whoever picks up loader/tooling work next.

## A mock-side override, not a CSS edit

`app.css` has `ul { display: none; padding: 0; }`. **This rule is vestigial in the real app, not
a router mechanism** — checked directly against `src/router/index.ts`: routing removes the
current page's custom element from `#app` and appends the next one (`document.createElement`);
it creates no wrapper elements and hides nothing via CSS. There is, in fact, no `<ul>` anywhere in
the real app's light DOM at all — every `<ul>` (`#menu` here, `#order-list` in the Order page)
lives inside a `shadow: true` component. So this rule (like `body > header { position: fixed }`,
which also can't match `body > app-header > header`, and `section.page { display: none }`, which
matches no element the router ever creates) is leftover CSS from an earlier, non-shadow-DOM
version of this app's styling and matches nothing upstream, period.

Flattening `app-home`'s content into light DOM (see above) exposes every `<ul>` inside it — the
outer `#menu` *and* each category's `<ul class="category">` — to that dormant selector for the
first time, something that never happens in the real, running app. With the rule as-is and no
counter-measure, the fixture loaded but rendered **near-empty**: `#menu` and every `.category`
collapsed to `display:none`, zeroing their container boxes up through `<app-home>` to `<main>` —
`walk()` (`index.html:1259`, `if (r.width === 0 || r.height === 0) return`) prunes a subtree the
instant a node has no layout box, so nothing under a zeroed ancestor ever reached the layer tree
(confirmed via `getBoundingClientRect()` on each ancestor in the live loader, before and after the
fix below — the first attempt only neutralized `#menu` and missed the nested `.category` lists,
caught by re-checking the rendered element/layer count after the fix).

Rather than edit the vendored `app.css` (which stays byte-identical to upstream), the counter is a
`<style>main#app ul{display:block}</style>` block inside `layers/mock.html` itself — an ordinary
part of the mock format (`docs/layers-json.md` documents inline `<style>` in the mock being scoped
alongside `styles`), and `mock.html` is already this fixture's own hand-assembled artifact, not
claimed third-party content. `main#app ul`'s specificity (one ID + two type selectors) beats the
bare `ul` type selector regardless of sheet load order, so it neutralizes the flattening artifact —
for every `<ul>` under the flattened subtree, not just `#menu` — without touching provenance. Only
the `display` half of the original rule needed countering: `home.css` sets `ul { padding: 0px 12px;
padding-bottom: 10px; }` at equal specificity, later in load order, so the original rule's
`padding: 0` was already dead in this fixture either way. `section.page { display: none; }` needed
no counter-measure — nothing in this mock has a `.page` class, so it never matches.

Vendored for: Layers loader fixture (.ts slot) — see plan at
C:\Users\bruno\.claude\plans\com-objetivo-de-melhorar-linear-hinton.md
