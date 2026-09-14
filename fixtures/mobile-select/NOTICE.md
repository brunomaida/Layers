Source: https://github.com/onlyhom/mobile-select
Commit: c27b1f0dc2e6b3d9930b64e3d0bc5d4c99d99b7a
License: MIT (see LICENSE in this folder, copyright 2017-present LIHONG OU (onlyhom))

`mobile-select.css` is vendored **verbatim, byte-for-byte**, from `dist/style/mobile-select.css`
(3303 bytes) — no edits.

`src/ms-core.ts` is vendored as read-only reference only (Layers never transpiles/executes `.ts`,
26991 bytes, no edits) — `layers.json`'s `root` maps the component root to it: `export default
class MobileSelect {` at line 10.

## No Shadow DOM / Custom Elements (contrast to `coffee-masters`)

Confirmed by source grep against `src/ms-core.ts`: no `shadowRoot`, `attachShadow`, or
`customElements` anywhere in the file. `MobileSelect` is a plain TS class that builds its DOM with
`document.createElement`/`innerHTML` and appends it directly to `document.body` as light DOM — no
shadow-piercing was needed to capture it, unlike batch 1's `coffee-masters` (`<app-home>`, `shadow:
true`), which required flattening an open shadow root into the mock by hand.

## Root class confirmation

The brief's draft `layers.json` guessed `.mobile-select-mask` for the `rules` selector. That class
does not exist anywhere in the real `mobile-select.css` or in the live-captured DOM. The real
top-level class, confirmed both in `mobile-select.css` (`.ms-mobile-select { position: fixed; ... }`,
first rule in the file) and in the live demo's DOM (`document.querySelector('.ms-mobile-select')`),
is `.ms-mobile-select`. `layers.json` uses `.ms-mobile-select`, not the brief's guess.

**`root`, not `rules`, deviating from the brief's draft template.** The brief's draft used `rules`
because it assumed "the picker's real DOM is not a single clean subtree under one obvious element."
That assumption doesn't hold for this capture: `layers/mock.html`'s `<body>` has exactly one child
(`.ms-mobile-select`), the textbook case `docs/layers-json.md` documents `root` for (identical in
shape to the Traval example: `"root": { "name": ".shell", "src": "src/ui/shell.ts|.shell|3" }`).
`layers.json` uses `"root": { "name": ".ms-mobile-select", "src": "src/ms-core.ts|MobileSelect|10" }`
instead. Verified empirically (see Finding below) that `root` and `rules` produce byte-identical
resolution behavior for both L0 and every descendant here — the switch is purely for using the
more idiomatic/documented mechanism for a single-child-body mock, not a functional difference.

**Finding — every descendant inherits the root's `ms-core.ts` mapping, not a `mobile-select.css`
line, and L0 itself only resolves when explicitly told to.** Confirmed by a live A/B test in the
loader (temporarily toggling `layers.json` between no root/rules, `rules`-only, and `root`-only,
reloading between each):
- With no `root`/`rules` at all: **L0 shows no source whatsoever** — not even
  `mobile-select.css|.ms-mobile-select|7`, despite that being a real, bare, top-level rule in the
  sheet (`mobile-select.css:7`). So the loader's per-element CSS heuristic does not appear to run
  against the auto-detected root at all; only an explicit `root` (or a `rules` selector that
  happens to match it) sets L0's source.
- With `root` (or, equivalently, `rules`) set on `.ms-mobile-select` → `ms-core.ts|MobileSelect|10`:
  L0 shows exactly that. Every descendant checked (e.g. `.ms-cancel`) shows the *same* source
  (`src/ms-core.ts` / `MobileSelect · L10`), not its own `mobile-select.css` line — confirmed this
  happens identically whether the mapping came from `root` or from `rules`, so it's a general
  ancestor→descendant inheritance/cascade for elements that have no resolution of their own, not
  something specific to either field.
- Root cause of why descendants never get their *own* `mobile-select.css` line, confirmed by
  grepping every `^\.` (top-level) selector in `mobile-select.css`: the *only* bare top-level class
  rule in the whole file is `.ms-mobile-select` itself (line 7) plus an unrelated
  `.ms-default-trigger` (line 157, not present in this mock) — every other rule
  (`.ms-gray-layer`, `.ms-content`, `.ms-cancel`, `.ms-title`, `.ms-wheels`, `.ms-wheel`, …) is
  written as a descendant compound selector scoped under `.ms-mobile-select` (e.g.
  `.ms-mobile-select .ms-cancel { ... }`, line 77), never as a bare top-level rule of its own — so
  none of them can ever independently qualify for the heuristic's "first class that opens a
  top-level rule" match, regardless of which mechanism sets the root's source.

This is expected behavior given this file's real-world CSS structure (BEM-ish namespacing with no
per-part top-level rule), not a fixture defect: `mobile-select.css` is still correctly loaded and
its rules are applied to the rendered styling (verified visually — overlay, panel background,
wheel borders all render per the sheet); it just never surfaces as a distinct `data-src` for any
individual descendant in this particular component, only for the root via `root`.

## Capture details

Captured from the live demo at https://onlyhom.github.io/mobile-select/demo.html. The demo page
renders five trigger rows (single/double/multi-select, a "nearby" range picker, a car-model
picker); `MobileSelect` instantiates its container once on page load and appends it as a direct
child of `document.body` (sibling of the demo page's own `.contain` wrapper) — confirmed via
`document.body.children` inspection before and after triggering, it is not nested inside any
trigger element.

The first row's trigger ("单项选择" / "Single select", `#trigger1`) was clicked to open the picker
(`.ms-mobile-select` gains the `ms-show` class, `opacity: 1`, `visibility: visible`). The captured
state is this single-select weekday wheel, unmodified from its opened default: one `.ms-wheel`
column listing 周日/周一/周二/周三/周四/周五/周六 (Sun–Sat), no selection changed from the wheel's
initial position, cancel/title/confirm bar showing "取消 / 单项选择 / 确认" ("Cancel / Single select
/ Confirm").

The container was cloned via `outerHTML` directly from the live DOM (no `script`/`style`/`link`
tags or `on*` attributes present in the captured subtree — nothing needed stripping) and wrapped in
a full `<!doctype html>` document at `fixtures/mobile-select/layers/mock.html`.

Vendored for: Layers loader fixture (.ts slot) — batch 2 of the fixtures-reais plan.
