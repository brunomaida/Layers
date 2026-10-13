# 5 fixtures reais (batch 2: HTML/CSS/JS/TS/JSX, casos diferentes) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vendorizar mais 5 fixtures reais (MIT) no loader do Layers, um por extensão pedida (`.html`/`.css`/`.js`/`.ts`/`.jsx`), cobrindo shapes/casos que o batch 1 (issue #8/PR #9, já mergeado em `develop`) não cobriu: página única densa com HTML nativo, CSS classless/custom-properties/dark-mode, widget JS sem dropdown (carousel), app TS sem Shadow DOM, JSX com CSS Modules (classname hash).

**Architecture:** Mesmo pipeline do batch 1 — vendor direto para slots com HTML/CSS estático já commitado no repo-fonte (Tasks 1-2), captura via browser (snapshot manual do DOM renderizado, adaptado de `tools/layers-snapshot.js` — sem usar o gatilho de download `<a download>`, que falha silenciosamente neste ambiente de automação; o HTML construído é lido como string via `javascript_tool` e gravado direto com `Write`) para slots onde o DOM final só existe depois de JS/TS/JSX rodar (Tasks 3-5). Cada fixture ganha `layers.json` (contrato em `docs/layers-json.md`) + `NOTICE.md` (proveniência/licença) + `LICENSE` copiada.

**Tech Stack:** Nenhuma nova — Layers é HTML/CSS/JS estático, sem bundler. Vitest para o gate de commit (`npm test`, baseline 61/61 verde nesta branch). `tools/layers-snapshot.js` como referência de lógica (não executado literalmente por causa do download).

**Spec:** Ver contexto/decisões acima nesta conversa (issue [#10](https://github.com/brunomaida/Layers/issues/10)); mesmo contrato de `docs/layers-json.md` usado pelo plano do batch 1 em `C:\Users\bruno\.claude\plans\com-objetivo-de-melhorar-linear-hinton.md`.

## Global Constraints

- Zero rede: todo asset (CSS, fonte, imagem) vendorizado localmente na pasta do fixture; nenhum `<link>`/`@import`/`url()` remoto pode sobreviver no `mock`/CSS final. Verificar Network tab (`localhost:5182` apenas) por fixture antes de fechar a task.
- `fonts[]` só resolve contra `fonts/projects.css` local do Layers (Geist, JetBrains Mono, Newsreader) — família ausente é aviso + fallback, nunca fetch. Documentar em `NOTICE.md` quando aplicável.
- Usar `rules` (não `root`) sempre que o `<body>` do mock tiver mais de 1 filho — achado do batch 1 (`index.html:1077` resolve isso; `root` só atribui limpo com filho único).
- `NOTICE.md` obrigatório por fixture: repo origem, commit SHA pinado, licença (decompor sublicenças se o CSS vendorizado embutir terceiros).
- Commit gate: `npm test` verde (baseline 61/61) depois de cada task.
- `changelog.d/<slug>.md`: PT-BR, `###` (h3), sem seção "Commits" — convenção real do projeto (não o template genérico da skill `changelog-draft`).
- Branch `feature/260914-10-fixtures-reais-batch-2`, base `develop` pós-merge de PR #9 (commit `3b515dd`).

---

## Task 1: `.html` — vcard-personal-portfolio (vendor direto)

**Files:**
- Create: `fixtures/vcard-portfolio/index.html`
- Create: `fixtures/vcard-portfolio/assets/css/style.css`
- Create: `fixtures/vcard-portfolio/LICENSE`
- Create: `fixtures/vcard-portfolio/NOTICE.md`
- Create: `fixtures/vcard-portfolio/layers.json`

**Interfaces:**
- Produces: fixture loadable via `#layers=fixtures/vcard-portfolio/` — single-page dense HTML (sidebar nav, testimonials modal via JS class toggle, contact form), contrasting with batch 1's `student-dashboard` (multi-page).

- [ ] **Step 1: Fetch source files at pinned commit**

Repo: `codewithsadee/vcard-personal-portfolio`, commit `927f09a6ef894a24cc8aef7a2e51f8e93ac306f7` (MIT license, confirmed via `gh api repos/codewithsadee/vcard-personal-portfolio` → `license.spdx_id: MIT`).

```bash
mkdir -p fixtures/vcard-portfolio/assets/css
curl -sL "https://raw.githubusercontent.com/codewithsadee/vcard-personal-portfolio/927f09a6ef894a24cc8aef7a2e51f8e93ac306f7/index.html" -o fixtures/vcard-portfolio/index.html
curl -sL "https://raw.githubusercontent.com/codewithsadee/vcard-personal-portfolio/927f09a6ef894a24cc8aef7a2e51f8e93ac306f7/assets/css/style.css" -o fixtures/vcard-portfolio/assets/css/style.css
curl -sL "https://raw.githubusercontent.com/codewithsadee/vcard-personal-portfolio/927f09a6ef894a24cc8aef7a2e51f8e93ac306f7/LICENSE" -o fixtures/vcard-portfolio/LICENSE
```

Expected sizes: `index.html` ~ dense (has full sidebar/nav/testimonials/portfolio/contact sections), `assets/css/style.css` = 30738 bytes.

- [ ] **Step 2: Inspect fetched `index.html` for remote references**

Grep for `<script src="https`, `<link` pointing off-domain, and any Google Fonts `@import` inside `style.css` (this template is known to self-host fonts under `assets/`, but verify — do not assume). If a remote font/icon link exists, leave it in place but note it in `NOTICE.md` per the "non-blocking fallback" rule (same pattern as `student-dashboard`'s Cairo/Poppins note in batch 1) — do not strip it manually, the loader's own sanitizer (`dropRemoteUrls`) handles that at load time.

```bash
grep -n "http" fixtures/vcard-portfolio/index.html | grep -iv "schema.org\|w3.org" | head -20
grep -n "@import\|url(http" fixtures/vcard-portfolio/assets/css/style.css | head -20
```

- [ ] **Step 3: Author `layers.json`**

```json
{
  "name": "vCard Personal Portfolio",
  "base": "",
  "viewport": { "width": 1280, "height": 2400 },
  "mock": "index.html",
  "styles": ["assets/css/style.css"],
  "fonts": []
}
```

`fonts` starts empty — fill it in only if Step 2 found a real `@import`/font-service link naming specific families; otherwise leave `[]`. `viewport.height` is a starting estimate (single dense page) — correct it in Step 5 using the mock's real `scrollHeight` once loaded.

- [ ] **Step 4: Write `NOTICE.md`**

Must state: source URL, pinned commit SHA, license (MIT, LICENSE file in this folder), which assets were vendored vs. excluded (any images under `assets/images/` referenced by `index.html` but not vendored are broken-image, cosmetic-only — same documented caveat pattern as batch 1's `student-dashboard`/`plain-admin`), and any font-fallback note from Step 2.

- [ ] **Step 5: Load and verify in the running dev server**

```bash
npm run dev
```

Open `http://localhost:<port>/index.html#layers=fixtures/vcard-portfolio/` (or use the cache-busting `?cbust=N` pattern if re-testing a fix) in Chrome via the `mcp__claude-in-chrome__*` tools. Confirm:
- Mock renders (sidebar, nav tabs, sections, contact form all visible).
- Layer panel resolves `data-src` for several elements to `assets/css/style.css|<selector>|<line>` (no orphaned `data-src`).
- Network tab: zero requests outside `localhost`.
- Correct `viewport.height` from `document.documentElement.scrollHeight` (via `javascript_tool`) — update `layers.json` if the Step 3 estimate was off.

- [ ] **Step 6: Run tests and commit**

```bash
npm test
git add fixtures/vcard-portfolio/
git commit -m "feat: add vcard-portfolio fixture (.html slot, vendored from codewithsadee/vcard-personal-portfolio)"
```

---

## Task 2: `.css` — Pico CSS (vendor direto)

**Files:**
- Create: `fixtures/pico-css/index.html`
- Create: `fixtures/pico-css/css/pico.min.css`
- Create: `fixtures/pico-css/LICENSE`
- Create: `fixtures/pico-css/NOTICE.md`
- Create: `fixtures/pico-css/layers.json`

**Interfaces:**
- Produces: fixture loadable via `#layers=fixtures/pico-css/` — classless CSS framework (custom properties, `prefers-color-scheme` dark mode, semantic-selector styling: `article`, `nav`, `table` unstyled by class), contrasting with batch 1's `plain-admin` (utility-class-heavy Bootstrap).

- [ ] **Step 1: Fetch the demo HTML and the real vendored CSS**

Demo repo: `picocss/examples`, commit `fb8bc72839f3b0f3c0eb0075978c7779ca124f4e`, path `v2-html/index.html` (16468 bytes, MIT). CSS repo: `picocss/pico`, commit `1039a4788d6abc368d5485ae6bac84a8f0e3096f`, path `css/pico.min.css` (83319 bytes, MIT) — this is the exact file the demo's `<link>` already points to (via CDN), so vendoring it keeps 1:1 fidelity.

```bash
mkdir -p fixtures/pico-css/css
curl -sL "https://raw.githubusercontent.com/picocss/examples/fb8bc72839f3b0f3c0eb0075978c7779ca124f4e/v2-html/index.html" -o fixtures/pico-css/index.html
curl -sL "https://raw.githubusercontent.com/picocss/pico/1039a4788d6abc368d5485ae6bac84a8f0e3096f/css/pico.min.css" -o fixtures/pico-css/css/pico.min.css
curl -sL "https://raw.githubusercontent.com/picocss/pico/1039a4788d6abc368d5485ae6bac84a8f0e3096f/LICENSE.md" -o fixtures/pico-css/LICENSE
```

- [ ] **Step 2: Rewrite the CDN `<link>` to the vendored local path**

`index.html` currently has:
```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@picocss/pico@2.1.1/css/pico.min.css"
>
```
Rewrite the `href` to `css/pico.min.css` (relative, matching the vendored file's location) — this is a direct, documented edit to the mock (not silent), record it in `NOTICE.md` (Step 4). Also check for a `<script>` tag near the end of the file (the demo has a small theme-switcher script) — leave it in place, the loader strips `<script>` entirely on load, no action needed.

- [ ] **Step 3: Author `layers.json`**

```json
{
  "name": "Pico CSS — Pure HTML Example",
  "base": "",
  "viewport": { "width": 1024, "height": 1600 },
  "mock": "index.html",
  "styles": ["css/pico.min.css"],
  "fonts": []
}
```

`viewport.height` is a starting estimate — this demo page has a Preview section, form grid, buttons showcase, table, and a `<dialog>` example; correct the height in Step 5 against real `scrollHeight`.

- [ ] **Step 4: Write `NOTICE.md`**

Must state: two-repo provenance (`picocss/examples` for the HTML shell at its pinned commit, `picocss/pico` for the CSS at its own pinned commit — they're independently released, pin both separately, same "decompose, don't flatten" spirit as batch 1's `plain-admin`/`todomvc-react`), both MIT, and the CDN→local `href` rewrite from Step 2 (this is the one direct edit to vendored mock content in this fixture — document why: zero-network rule, and it doesn't change what's tested since it's byte-identical CSS from the same package version).

- [ ] **Step 5: Load and verify**

Confirm the mock renders Pico's default light theme (the demo also has a theme-switcher `<details class="dropdown">` in the header — clicking it is optional, static rendering is what's being tested). Verify:
- `<dialog>`, `<table>`, `<form>`, `<details>/<summary>` elements are all present and the layer panel resolves them.
- CSS custom properties (`var(--pico-...)`) are visibly applied (not raw/unstyled text) — Pico's `:root`→`:host` scoping rewrite (per `docs/layers-json.md` § 2) must not break custom-property inheritance; if it renders unstyled, this is a real loader finding — stop and report it in the task rather than silently working around it.
- Network tab: zero requests outside `localhost` (confirms Step 2's CDN rewrite worked).

- [ ] **Step 6: Run tests and commit**

```bash
npm test
git add fixtures/pico-css/
git commit -m "feat: add pico-css fixture (.css slot, vendored from picocss/pico + picocss/examples)"
```

---

## Task 3: `.js` — Slick Carousel (snapshot)

**Files:**
- Create: `fixtures/slick-carousel/layers/mock.html`
- Create: `fixtures/slick-carousel/slick.css`
- Create: `fixtures/slick-carousel/slick-theme.css`
- Create: `fixtures/slick-carousel/LICENSE`
- Create: `fixtures/slick-carousel/NOTICE.md`
- Create: `fixtures/slick-carousel/layers.json`

**Interfaces:**
- Produces: fixture loadable via `#layers=fixtures/slick-carousel/` — carousel widget (repeated slide DOM, dots, arrows, `aria-hidden` per slide), contrasting with batch 1's `choices-js` (single dropdown, no repeated-element pattern).

- [ ] **Step 1: Vendor the real dist CSS**

Repo `kenwheeler/slick`, commit `7b2b3a76def3309d235d9ad9683a8d82941896cd` (MIT). Real files at `slick/slick.css` (1456 bytes) and `slick/slick-theme.css` (2800 bytes) — NOT `dist/`, the repo's built CSS lives directly under `slick/`.

```bash
mkdir -p fixtures/slick-carousel/layers
curl -sL "https://raw.githubusercontent.com/kenwheeler/slick/7b2b3a76def3309d235d9ad9683a8d82941896cd/slick/slick.css" -o fixtures/slick-carousel/slick.css
curl -sL "https://raw.githubusercontent.com/kenwheeler/slick/7b2b3a76def3309d235d9ad9683a8d82941896cd/slick/slick-theme.css" -o fixtures/slick-carousel/slick-theme.css
curl -sL "https://raw.githubusercontent.com/kenwheeler/slick/7b2b3a76def3309d235d9ad9683a8d82941896cd/LICENSE" -o fixtures/slick-carousel/LICENSE
```

`slick-theme.css` references `ajax-loader.gif` and an icon font (`slick.woff`/`.ttf`) via `@font-face` — do NOT vendor those (cosmetic loading-spinner/arrow-icon assets); the loader's own `@font-face` `url()` neutralization + broken-image fallback handles this the same way batch 1's `coffee-masters` handled its icon-font gap. Note it in `NOTICE.md`.

- [ ] **Step 2: Capture the live demo's rendered DOM**

Open `https://kenwheeler.github.io/slick/` in Chrome via `mcp__claude-in-chrome__*` tools. Navigate to the "Basic" example section (first carousel on the page — a `<div class="slick-slider">` wrapper Slick generates from a plain `<div>` of `<div>` children after `$(...).slick()` runs). Use `javascript_tool` to extract ONLY that one carousel's outer HTML plus its loaded stylesheets, adapting the logic in `tools/layers-snapshot.js` (same file this repo ships) — do NOT trigger its `<a download>` (unreliable in this harness); instead return the constructed HTML string directly from `javascript_tool` and write it with the `Write` tool.

```js
// Run via javascript_tool against the live demo tab — adapted from tools/layers-snapshot.js,
// scoped to one carousel instead of the whole body, no <a download> trigger.
(() => {
  const el = document.querySelector('.slick-slider'); // first Basic-example carousel
  const clone = el.cloneNode(true);
  clone.querySelectorAll('script, noscript, template, iframe, link, style').forEach(e => e.remove());
  clone.querySelectorAll('*').forEach(e => [...e.attributes].forEach(a => { if (/^on/i.test(a.name)) e.removeAttribute(a.name); }));
  return clone.outerHTML;
})();
```

Wrap the returned HTML in a full mock document (`<!doctype html><html><head><meta charset="utf-8"></head><body>...</body></html>`), save as `fixtures/slick-carousel/layers/mock.html`.

- [ ] **Step 3: Author `layers.json`**

```json
{
  "name": "Slick Carousel (Basic)",
  "base": "",
  "viewport": { "width": 900, "height": 400 },
  "mock": "layers/mock.html",
  "styles": ["slick.css", "slick-theme.css"],
  "fonts": [],
  "rules": {}
}
```

No `root` — Slick's generated markup nests the slide track inside `.slick-slider > .slick-list > .slick-track`, several plausible "root" candidates; leave `rules: {}` (empty, same pattern as batch 1's `choices-js`) unless Step 5 surfaces a specific element worth pinning.

- [ ] **Step 4: Write `NOTICE.md`**

State: source repo + pinned commit, MIT license, live demo URL used for the DOM capture, the excluded `ajax-loader.gif`/icon-font assets (cosmetic, loader fallback handles it), and which one example (Basic) was captured out of the demo page's several carousel variants.

- [ ] **Step 5: Load and verify**

Confirm slides render with real widths/positions (not collapsed), dots and arrows visible, layer panel resolves `data-src` into `slick.css`/`slick-theme.css` rules. Network tab: zero requests outside `localhost`.

- [ ] **Step 6: Run tests and commit**

```bash
npm test
git add fixtures/slick-carousel/
git commit -m "feat: add slick-carousel fixture (.js slot, snapshot from kenwheeler/slick live demo)"
```

---

## Task 4: `.ts` — mobile-select (snapshot)

**Files:**
- Create: `fixtures/mobile-select/layers/mock.html`
- Create: `fixtures/mobile-select/mobile-select.css`
- Create: `fixtures/mobile-select/src/ms-core.ts`
- Create: `fixtures/mobile-select/LICENSE`
- Create: `fixtures/mobile-select/NOTICE.md`
- Create: `fixtures/mobile-select/layers.json`

**Interfaces:**
- Produces: fixture loadable via `#layers=fixtures/mobile-select/` — TS class-based wheel picker rendering to plain light DOM, NO Shadow DOM/Custom Elements (contrast to batch 1's `coffee-masters`, which required shadow-piercing).

- [ ] **Step 1: Vendor the real dist CSS and the TS source (read-only reference)**

Repo `onlyhom/mobile-select`, commit `c27b1f0dc2e6b3d9930b64e3d0bc5d4c99d99b7a` (MIT). CSS at `dist/style/mobile-select.css` (3303 bytes). TS source at `src/ms-core.ts` (26991 bytes) — `export default class MobileSelect {` at line 10 (confirmed, no `shadowRoot`/`customElements` anywhere in the file).

```bash
mkdir -p fixtures/mobile-select/layers fixtures/mobile-select/src
curl -sL "https://raw.githubusercontent.com/onlyhom/mobile-select/c27b1f0dc2e6b3d9930b64e3d0bc5d4c99d99b7a/dist/style/mobile-select.css" -o fixtures/mobile-select/mobile-select.css
curl -sL "https://raw.githubusercontent.com/onlyhom/mobile-select/c27b1f0dc2e6b3d9930b64e3d0bc5d4c99d99b7a/src/ms-core.ts" -o fixtures/mobile-select/src/ms-core.ts
curl -sL "https://raw.githubusercontent.com/onlyhom/mobile-select/c27b1f0dc2e6b3d9930b64e3d0bc5d4c99d99b7a/LICENSE" -o fixtures/mobile-select/LICENSE
```

- [ ] **Step 2: Capture the live demo's rendered DOM with the picker open**

Open `https://onlyhom.github.io/mobile-select/demo.html` in Chrome. Trigger the picker open (click whatever button/input invokes `MobileSelect` — inspect the demo page first via `read_page`/`get_page_text` to find it) so the wheel-column markup (`MobileSelect` injects its own container, typically appended to `document.body`, not inside the trigger element — verify via `document.querySelector` before assuming a selector) exists in the DOM. Use `javascript_tool` to clone that container (same adapted-from-`layers-snapshot.js` pattern as Task 3: strip `script`/`style`/`link`/`on*` attributes, return the HTML string directly, no `<a download>`), wrap in a full HTML document, save as `fixtures/mobile-select/layers/mock.html`.

If the live picker's generated class names or structure differ from what `ms-core.ts` suggests, trust the live DOM — it's the ground truth for the mock; note any surprises in `NOTICE.md`.

- [ ] **Step 3: Author `layers.json`**

```json
{
  "name": "Mobile Select (wheel picker)",
  "base": "",
  "viewport": { "width": 375, "height": 500 },
  "mock": "layers/mock.html",
  "styles": ["mobile-select.css"],
  "fonts": [],
  "rules": { ".mobile-select-mask": "src/ms-core.ts|MobileSelect|10" }
}
```

`viewport` starts mobile-sized (this is a mobile picker component) — adjust to the real captured container's bounding box in Step 5. The `rules` selector (`.mobile-select-mask` or whatever the real root class turns out to be from Step 2's live inspection) replaces `root` because the picker's real DOM is not a single clean subtree under one obvious element — confirm the actual top-level class name against the live capture before finalizing this line, don't assume it matches without checking.

- [ ] **Step 4: Write `NOTICE.md`**

State: source repo + pinned commit, MIT license, `src/ms-core.ts` vendored as read-only reference only (Layers never executes `.ts`), confirmation that this component has no Shadow DOM/Custom Elements (explicit contrast to `coffee-masters`, no shadow-piercing was needed here), and the live demo URL + what state was captured (picker open, which column values selected).

- [ ] **Step 5: Load and verify**

Confirm the wheel-picker columns render with real content (not empty), layer panel resolves `data-src` into `mobile-select.css` rules and the `rules` entry resolves to `ms-core.ts` line 10. Network tab: zero requests outside `localhost`.

- [ ] **Step 6: Run tests and commit**

```bash
npm test
git add fixtures/mobile-select/
git commit -m "feat: add mobile-select fixture (.ts slot, snapshot from onlyhom/mobile-select live demo)"
```

---

## Task 5: `.jsx` — e-commerce (CSS Modules, snapshot)

**Files:**
- Create: `fixtures/ecommerce-jsx/layers/mock.html`
- Create: `fixtures/ecommerce-jsx/app.css`
- Create: `fixtures/ecommerce-jsx/src/components/Header/Header.jsx` (or the real component path found in Step 1 — see note)
- Create: `fixtures/ecommerce-jsx/LICENSE`
- Create: `fixtures/ecommerce-jsx/NOTICE.md`
- Create: `fixtures/ecommerce-jsx/layers.json`

**Interfaces:**
- Produces: fixture loadable via `#layers=fixtures/ecommerce-jsx/` — React app styled with CSS Modules (hashed classnames like `_header_4qxqm_9`, confirmed live), contrasting with batch 1's `todomvc-react` (plain unhashed CSS).

- [ ] **Step 1: Vendor the REAL BUILT css, not the `.module.scss` source**

CSS Modules compile to hashed classnames only at build time — the source `.module.scss` files in the repo (`Moamal-2000/e-commerce`, commit `ab4deb1d8e7ac828fff10ea8552a3de79b7c98bd`, MIT) do NOT contain the hashes that appear in the live DOM. The real, already-built CSS is served directly by the live deployment:

```bash
mkdir -p fixtures/ecommerce-jsx/layers fixtures/ecommerce-jsx/src/components
curl -sL "https://e-commerce.moamalalaa.com/assets/index-CZvRiTLv.css" -o fixtures/ecommerce-jsx/app.css
curl -sL "https://raw.githubusercontent.com/Moamal-2000/e-commerce/ab4deb1d8e7ac828fff10ea8552a3de79b7c98bd/LICENSE" -o fixtures/ecommerce-jsx/LICENSE
```

Confirmed live (`javascript_tool`, this session): `document.querySelectorAll('[class*="_"]')` on the deployed site returns classnames like `_header_4qxqm_9`, `_container_4qxqm_19` — real CSS Modules hashing, 149624 bytes total in `app.css`, uses modern syntax (`@media (width<=992px)` range syntax, `:where()`) — good stress test for `css-tree`. This built asset URL is content-addressed (hashed filename) and may change on redeploy; if `curl` 404s at task time, re-fetch the live page and re-read `document.styleSheets[0].href` to find the current hash.

Pick ONE real `.jsx` component file from the repo to vendor as read-only reference for `rules` (e.g. `src/components/Header/Header.jsx` if that's the real path — list `src/components/` via `gh api repos/Moamal-2000/e-commerce/contents/src/components` first, do not guess the path) and fetch it alongside its `.module.scss` (for provenance in `NOTICE.md`, not for `styles[]` — SCSS modules aren't vendorable per the zero-transpile rule).

- [ ] **Step 2: Capture the live demo's rendered DOM**

Open `https://e-commerce.moamalalaa.com` in Chrome (confirmed rendering this session: full storefront — header, category sidebar, hero banner, flash-sales product grid). Use `javascript_tool` to clone `document.body`, strip `script`/`noscript`/`template`/`iframe`/`link`/`style`/`on*` (same adapted-from-`layers-snapshot.js` pattern as Tasks 3-4, no `<a download>`), return the HTML string, wrap in a full document, save as `fixtures/ecommerce-jsx/layers/mock.html`. The page is a full storefront (long scroll) — either capture the full body or scope to one self-contained section (e.g. header + hero + flash-sales grid) if the full page proves too large for a single `javascript_tool` return; if scoping down, say so explicitly in `NOTICE.md`.

- [ ] **Step 3: Author `layers.json`**

```json
{
  "name": "E-Commerce (React + CSS Modules)",
  "base": "",
  "viewport": { "width": 1280, "height": 900 },
  "mock": "layers/mock.html",
  "styles": ["app.css"],
  "fonts": [],
  "rules": {}
}
```

Fill `rules` with an entry pointing at the vendored `.jsx` component from Step 1 once its real rendered selector is known from the Step 2 capture (e.g. `{"header": "src/components/Header/Header.jsx|Header|<line>"}`) — `<body>` will have multiple top-level children (header, sidebar, main content), so use `rules`, not `root`, per Global Constraints.

- [ ] **Step 4: Write `NOTICE.md`**

Must explain clearly: (a) the CSS vendored is the **built/hashed bundle**, not repo source, and why (CSS Modules only produce real hashes at build time — same "vendor what's real, not what's convenient" principle as batch 1's `coffee-masters` shadow-DOM note); (b) the bundle URL is content-hashed and may go stale — how to re-derive it if so; (c) provenance of the one `.jsx`/`.module.scss` pair vendored as reference; (d) source repo + pinned commit + MIT license for the source; the live deployment itself has no separate license grant beyond the repo's.

- [ ] **Step 5: Load and verify**

Confirm the mock renders styled (hashed classnames resolving against `app.css`, not raw/unstyled), layer panel resolves `data-src` into `app.css` rules for several elements. Network tab: zero requests outside `localhost` — this is the one fixture in this batch where the CSS itself came from a live third-party host, so double-check nothing in the vendored `app.css` still references remote `url()`s (e.g. hashed image/font assets) that would need the loader's existing neutralization to kick in; note any such `url()` in `NOTICE.md`.

- [ ] **Step 6: Run tests and commit**

```bash
npm test
git add fixtures/ecommerce-jsx/
git commit -m "feat: add ecommerce-jsx fixture (.jsx slot, snapshot from Moamal-2000/e-commerce, CSS Modules)"
```

---

## Task 6: Docs + changelog

**Files:**
- Modify: `docs/RELEASE-CHECKLIST.md`
- Create: `changelog.d/feature-260914-10-fixtures-reais-batch-2.md`

**Interfaces:**
- Consumes: final fixture names/descriptions from Tasks 1-5 (this task runs last, after all 5 are committed).

- [ ] **Step 1: Update `docs/RELEASE-CHECKLIST.md`**

Find the paragraph added by batch 1 under "## E. Testes" listing `student-dashboard`/`plain-admin`/`choices-js`/`todomvc-react`/`coffee-masters`. Append a new paragraph immediately after it, same one-line-per-fixture style, listing `vcard-portfolio`, `pico-css`, `slick-carousel`, `mobile-select`, `ecommerce-jsx` with what each exercises (dense single-page HTML; classless/dark-mode/native-elements CSS; carousel/repeated-DOM JS; non-Shadow-DOM TS; CSS-Modules JSX).

- [ ] **Step 2: Write the changelog fragment**

Follow the project's real convention (h3, PT-BR, no "Commits" section — verified against `changelog.d/feature-260914-8-fixtures-reais-html-css-js-ts-jsx.md` from batch 1, not the generic `changelog-draft` skill template). Structure:

```markdown
### Adicionado

- 5 fixtures vendorizados de projetos públicos reais (MIT), mesma extensão do batch 1
  mas casos diferentes — `vcard-portfolio` (.html, página única densa), `pico-css` (.css,
  classless/custom-properties/dark-mode), `slick-carousel` (.js, carousel via snapshot),
  `mobile-select` (.ts, wheel picker sem Shadow DOM), `ecommerce-jsx` (.jsx, React + CSS
  Modules com classname hash) — cada um com `NOTICE.md` (repo, commit, licença).
- `docs/RELEASE-CHECKLIST.md` (checklist E) atualizado com a lista dos 5 fixtures novos.

### Perf

- **N/A** — cold path only (nenhum arquivo tocado está em `path-tiers.json`; o projeto não
  tem esse arquivo, todos os arquivos tratados como cold).
```

Add an `### Achado registrado` section only if Tasks 1-5 actually surfaced a new loader finding (e.g. the Pico custom-property scoping check in Task 2 Step 5, or the CSS Modules hash-collision risk in Task 5) — mirror batch 1's pattern of documenting real findings, don't invent one if none occurred.

- [ ] **Step 3: Run full test suite and commit**

```bash
npm test
git add docs/RELEASE-CHECKLIST.md changelog.d/feature-260914-10-fixtures-reais-batch-2.md
git commit -m "docs: list the 5 new fixtures in RELEASE-CHECKLIST and add changelog fragment"
```

---

## Verificação

- Cada um dos 5 fixtures carrega sem erro em `#layers=fixtures/<nome>/` (sem empty/error state).
- Painel de seleção resolve `data-src` pra arquivo/linha reais em cada fixture, nenhum órfão.
- `npm run test` (Vitest) permanece verde (61/61 + qualquer teste novo) depois de cada task.
- Nenhuma requisição de rede fora de `localhost` no Network tab, para os 5 fixtures novos carregados.
- `docs/RELEASE-CHECKLIST.md` e `changelog.d/` atualizados (Task 6).

## Model Routing

Mesmo perfil do batch 1 — vendor/snapshot de conteúdo + autoria de `layers.json` seguindo contrato já documentado, sem lógica nova nem hot path.

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| Vendor/snapshot + autoria `layers.json` (5 fixtures) | Generator | Standard | Sonnet 5 | Cópia de conteúdo + preenchimento de contrato já documentado (`docs/layers-json.md`); requer uso de browser automation pra captura de DOM nos slots snapshot-based |
| Task 6 (docs/changelog) | Generator | Cheap/Standard | Sonnet 5 | Edição mecânica de docs seguindo padrão já estabelecido pelo batch 1 |
| Revisão de cada task (diff `layers.json`/`NOTICE.md`/mock) | Verifier | Standard (≥ generator) | `code-review` skill (Sonnet 5) | Verificador na mesma tier do gerador satisfaz "verifier ≥ generator" — mudança não é Architectural-or-higher |
| Revisão final whole-branch | Verifier | Most capable available | Opus (adversarial-reviewer se aplicável) | Mesmo padrão do batch 1 — pega achados cross-cutting (ex.: consistência de `rules` vs `root`, achados de loader) antes do merge |

> [!DECISION] gh-issue-gate
> Executado de verdade (sessão normal, não plan-mode do harness) — issue **[#10](https://github.com/brunomaida/Layers/issues/10)** criada
> (`feat: add 5 more real-world fixtures with different shapes per extension`, label `enhancement`), marker gravado em
> `~/.claude/.cache/gh-issue-gate/layers.json` escopado ao branch `feature/260914-10-fixtures-reais-batch-2`.

> [!DECISION] phase-intake
> Mesmo caso do batch 1: sem proto config para `Layers` em `~/.claude/design/proto/` → gate pulado silenciosamente
> por regra própria da skill ("Skip silently when: the project has no proto config"). Rastreio de progresso segue
> via `docs/RELEASE-CHECKLIST.md` (checklist E), não via `/roadmap`.
