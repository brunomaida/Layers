---
title: "S3.2 Menu Open Pattern Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-14
---

# S3.2 Menu Open Pattern Implementation Plan

Add `LayersCore.menuStep` (`lib/layers-core.js`) and route the four menus of `index.html` (Projetos, Aparência ⚙, Interagir, Ações ▾) through it, so every menu opens on hover and pins on click; prove it with `e2e/menu-open.spec.js` and a pixel-identical `e2e/menu-visual.spec.js`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

Checklist C item "Padrão único de abertura de menus (decidir: hover+fixar em todos ou clique em todos)" ([RELEASE-CHECKLIST.md](../../RELEASE-CHECKLIST.md) § C, line 36) and roadmap leaf S3.2 ([roadmap.md](../../roadmap.md)). **Product decision (user, 2026-10-14): every menu uses hover opens + click pins.** Not re-opened here. S3.2 heads the chain S3.2 → S3.4 (single source of appearance); S3.4 is out of scope.

Verified inventory (worktree base `53b271c`; every line read, none guessed):

| # | Surface | Markup | Logic | Opens | Closes today |
|---|---|---|---|---|---|
| 1 | **Projetos** dropdown (`cbOpen === 'hist'`) | `index.html:42-89` (root `histRef` :42, trigger :43, popover :45) | `cbToggle` :1088, model :2262-2272, `onDocDown` :1522-1523 | click only | trigger click; `mousedown` outside (bubble, `document`); `cbOpen: null` inside actions (:1198, :1206, :1229, :1232, :1233, :1392, :1410, :1435, :2260); **not** Escape |
| 2 | **Aparência ⚙** (`menu === 'apar'`) | `index.html:94-109` (root `gearRef` :94, trigger :95, fixed popover :97) | `gear` :2173-2176, `gearAnchorNow` :1454 | hover, 0 ms; click pins | leave + 260 ms grace if unpinned; trigger click when pinned; **not** outside click, **not** Escape |
| 3 | **Interagir** (`menu === 'inter'`) | trigger root `interTrigRef` :168-170, popover `interDdRef` :173-203 (sibling of the top bar, not inside the root) | `mk('inter')` :2140-2142, `interAnchorNow` :1453, resize `interDrag` :1084 (forces `menuPin: true`), no-op `interDdDown` :1087 | hover, 0 ms; click pins | leave + 260 ms unless pinned or `interResizing`; trigger click when pinned; **not** outside click, **not** Escape |
| 4 | **Ações ▾** in Ajustes (`menuOpen`) | `index.html:343-352` (wrapper :343 with `onClick={stop}`, trigger :344, popover :346) | `toggleMenu` :2251, `escape()` :1705, items close at :1932 (`openDiff`, after async reads), :1936 (`exportFull`, only after `readOnlyBlock`/`utilityBlock` pass), :2274 (`openSave`, only with changes) | click only | trigger click; Escape; item actions (partially, see left); **not** outside click |
| 5 | Value pickers (custom comboboxes, `cbOpen = 'cfg:*' \| 'p:*' \| 'u:*'`) | Aparência rows :100-103; property enum :645; property unit :650 | `cbToggle` :1088, `cbBlur` (120 ms) :1450, `preventBlur` :1451, options :2039, :2049, :2178-2181 | click | pick; blur; **not** Escape |

Not menus (left alone): slider value hints `hovSl` (:120-164, :2123; tooltip-like, S3.3 territory), box-model hover `bmHover` (:594-607, :2198), rail chips (:233), tree rows, nav widget (:210-224), modals (`shortcuts` :700, `prompt` :686, `diff`, `modal`) which already close through `escape()`.

Findings that shape the design:

- Two of four menus already ship hover+pin with a 0 ms open and a 260 ms close grace. Keeping those numbers means no perceived timing change on ⚙ and Interagir; Projetos and Ações adopt them. One deliberate behavior change on ⚙/Interagir: today hovering the other trigger steals a pinned menu (`:2141`, `:2175` set `menu: k, menuPin: false` unconditionally); with `[!DECISION] pinned-hover` A a pinned menu no longer switches on hover.
- The top bar wrapper (`:116`) calls `stop` on `mousedown`; React's `stopPropagation` stops the native event at the React root, so a bubbling `document` listener never sees clicks there. The outside-close listener must be **capture-phase** on `document`.
- `support.js` maps `onpointerenter/onpointerleave/onpointerdown` to React props (`support.js:339-341`) and passes `aria-*`/`data-*` through for DOM nodes (`support.js:433-440`), so pointer events and ARIA need no runtime change (`support.js` stays untouched).
- `interDrag` (`:1084`) calls `e.stopPropagation()` on `mousedown`, so the popover's `onMouseDown` never sees a resize start; `pointerdown` fires earlier and is not stopped. Pinning from the popover on `pointerdown` makes the `menuPin: true` inside `interDrag` redundant.
- React 18 batches continuous events (pointer enter/leave); reading `this.state` in two back-to-back handlers can see a stale render. A synchronous mirror (`this.menuCur`) is the reducer's input; `state.menu`/`menuPin` stay the render source.
- Existing e2e specs open menus by `click()` (`e2e/folder-helpers.js:38-43`, `e2e/stale-banner.spec.js:28-33`, `e2e/dead-interactions.spec.js:13,20`, `e2e/apply-flow.spec.js:29,50`, `e2e/undo-redo.spec.js:95`, `e2e/write-log-hash.spec.js:34-107`). Under the new pattern a Playwright click on a closed or hover-open menu is enter (open) + click (pin): open. The "click twice if hidden" fallback in the folder helper stays **needed**: when the menu is already pinned (e.g. after "Registrar repositório", or S5.7's `openProjects` reusing it), one click closes it and the second reopens it.
- The Projetos items are `<div onClick>` (not focusable) and stay so: S3.2 gives keyboard open/close for every menu, not item navigation inside Projetos.

Reuses: the `mk()` factory and `menu`/`menuPin` state (`:1071`, `:2140-2142`); `interAnchorNow`/`gearAnchorNow`; the `escape()` chain (`:1703-1707`); `histRef`/`gearRef`/`interTrigRef`/`interDdRef`; the `LayersCore` `api` export pattern next to `viewCuller` (`lib/layers-core.js:522`, export `:1214`); `readNodes` (`e2e/tree-helpers.js`); the stage locator from `e2e/viewport-culling.spec.js:29-37`; fixture `plain-css`.
Out of scope: comboboxes' opening mode (see `[!DECISION] combobox-scope`); tooltip/title texts of the triggers (S3.3, which will edit lines 43, 95, 169, 344 after this leaf); Aparência contents and host tweaks (S3.4); keyboard item navigation (arrow keys) inside menus; Escape while focus is on an `<input>` inside a menu (see Behavior spec); the "click twice" fallback in `e2e/folder-helpers.js`/`e2e/stale-banner.spec.js` (still needed, kept); the now-redundant `cbOpen: null` at the nine Projetos action sites (they still close any open combobox, kept); `docs/shortcuts.md` (S7.4); the counter line `docs/RELEASE-CHECKLIST.md:8` (counter recounted by the integration task).

## Design: Architecture & Flows

One component (`index.html`) plus one pure reducer in `lib/layers-core.js`. Every menu event becomes `menuGo(ev)`; the reducer decides, the adapter owns the single timer and `setState`.

### Topology (micro)

```
 index.html (component)                                  lib/layers-core.js
┌───────────────────────────────────────────────┐       ┌──────────────────────────────┐
│ triggers / roots / popovers (4 menus)          │       │ MENU_TIMING  [NEW]           │
│  hist :42-45  apar :94-97  inter :168,174       │       │ { openDelay:0, closeGrace:260}│
│  acoes :343-346                                 │       │                              │
│   onPointerEnter/Leave ─┐                      │       │ menuStep(cur, ev, timing)    │
│   onClick (trigger)  ───┤                      │       │  [NEW, pure]                 │
│   onPointerDown(popover)┤  menuEv(k) [NEW]     │       │  ev: enter|leave|timer|click │
│   onBlur (root)      ───┤                      │       │      |inside|close           │
│ document pointerdown ───┤ (capture) onDocDown  │       │  → {menu,pin,timer} | null   │
│ escape() :1703 ─────────┤ menuEscape [NEW]     │       └──────────────▲───────────────┘
│ item actions ───────────┘ menuAct(fn) [NEW]    │                      │
│              ▼                                  │   menuStep(menuCur,ev)
│ menuGo(ev) [NEW] ───────────────────────────────┼──────────────────────┘
│   clearTimeout(menuT); anchor(inter|apar)       │
│   menuCur = {menu,pin}; setState({menu,menuPin})│
│   timer? → setTimeout(menuGo({type:'timer'}))   │
│              ▼                                  │
│ render: histOpen / gearOpen / interOpen /       │
│         menuOpen(acoes) = state.menu === k      │
└───────────────────────────────────────────────┘
```

### Flow: state machine per menu `k` (one menu open at a time)

```
                 enter(k) mouse/pen, no button down
                 [nothing open → open now (delay 0, tunable)]
                 [other UNPINNED open → switch now]
                 [other PINNED open → ignored]
   ┌────────┐ ─────────────────────────────────────▶ ┌──────────────┐
   │ CLOSED │                                        │ OPEN (hover) │◀─┐ enter(k) again:
   │        │ ◀───── timer(close) after 260 ms ───── │  unpinned    │──┘ cancels the grace
   └────────┘        (started by leave(k))           └──────┬───────┘
     ▲  │                                                   │ click(trigger) or
     │  │ click(trigger) / Enter / Space / touch tap        │ pointerdown inside popover
     │  └───────────────────────────────▶ ┌──────────┐ ◀────┘
     │                                     │ PINNED   │  leave(k): ignored
     └──── click(trigger) again ────────── │          │  hover on other trigger: ignored
     └──── pointerdown outside (capture) ─ │          │
     └──── Escape (innermost first) ────── │          │
     └──── focus moves outside the root ── │          │
     └──── action item activated ───────── └──────────┘
  touch: pointerenter/leave with pointerType 'touch' are ignored; a tap is a click.
  drag: enter with e.buttons ≠ 0 is ignored (orbit/pan/splitter drags never open a menu).
```

### Mockup: dock, top bar and Ajustes (no pixel changes)

```
┌─ dock ──────────────────────────────────────────────────────────────────────────┐
│ [▤ Nenhum projeto ▾]  ...           LAYERS            [⚙] [?] [Cancelar] [Aplicar]│
│   └ Projetos: hover opens, click pins (was click only)  <-- behavior only         │
│                                          ⚙ Aparência: unchanged pattern, + outside/Esc close │
└──────────────────────────────────────────────────────────────────────────────────┘
   ┌─ top bar ─────────────────────────────────────────────────────────┐
   │ [Explodir] [Medir] frames─○ dist─○ persp─○ [Foco] ...  [⚡ INTERAGIR ▾]│
   │                         Interagir: unchanged pattern, + outside/Esc close │
   └────────────────────────────────────────────────────────────────────┘
┌─ Ajustes ─────────────────────┐
│ ▾ AJUSTES   3     [Ações ▾]   │  Ações: hover opens upward, click pins (was click only)
└───────────────────────────────┘
All colors, sizes, borders and texts stay byte-identical; only attributes
(onPointer*, onBlur, ref, data-menu, aria-*) are added. Proved by e2e/menu-visual.spec.js.
```

### Behavior spec (the single shared pattern)

| Rule | Value / behavior | Rationale |
|---|---|---|
| Hover open delay | **0 ms** (`MENU_TIMING.openDelay`, tunable) | already shipped on ⚙/Interagir; raise to ~120 ms if accidental opens on Projetos annoy (the reducer already supports a delay) |
| Close grace after leave | **260 ms** (`MENU_TIMING.closeGrace`, tunable) | shipped value; covers the 5 px overlap between trigger and fixed popover and the trigger → Interagir popover jump |
| Hover over another trigger | switches at once if the open menu is unpinned; ignored if it is pinned | menubar convention; see `[!DECISION] pinned-hover` |
| Click on trigger | closed/unpinned → open pinned; pinned → close | shipped `*Pin` semantics, now on all four |
| Pointerdown inside the popover | pins (interacting commits) | keeps Projetos' repo input, Aparência's comboboxes and Interagir's resize open after the pointer leaves |
| Pointerdown outside every root | closes, pinned or not; the event is **not** consumed | see `[!DECISION] outside-passthrough` |
| Escape | innermost first: combobox (`cbOpen`) → menu; focus returns to the trigger (`[data-menu]`) when it was inside the menu, so the trigger shows its `:focus-visible` ring (intentional a11y change, declared in the changelog). **Not** while focus is on an `<input>` (e.g. the Fonte range slider `:104`): the global `onKey` returns for INPUT/TEXTAREA/SELECT at `:1511` and S3.2 keeps that guard; Tab out of the input, click outside or Escape again after Tab closes the menu | modal chain unchanged above it; widening the `:1511` guard would change every shortcut's typing contract for one slider, out of this leaf |
| Focus leaves the root (`focusout` with a `relatedTarget` outside) | closes | keyboard users never leave a pinned menu behind; `relatedTarget: null` (window blur, file picker) is ignored |
| Action item activated | closes (Projetos: open/demo/connect/zip/export/import/reset/reload; Ações: all three) | panel menus (Aparência, Interagir) stay open while toggling |
| Only one menu open | single `state.menu` key | Projetos and Ações move from `cbOpen`/`menuOpen` to `menu` |
| Keyboard | triggers are native `<button>`s: Enter/Space = click (pins); Tab enters the popover (DOM order); `aria-expanded` on every trigger; `aria-haspopup="menu"` on Projetos/Ações (lists of actions), `aria-haspopup="dialog"` on Aparência/Interagir (panels of controls, not `role=menu`) | no new key bindings |
| Touch (no hover) | `pointerType === 'touch'` enter/leave ignored; tap = click → open pinned; tap outside closes | touch `pointerleave` fires right after `pointerup`, before `click`; ignoring it avoids a race |
| Nested | comboboxes inside Aparência live in the `aparRef` subtree, so they count as inside; Escape closes the combobox first | — |
| Canvas drag | `enter` with `e.buttons ≠ 0` ignored; a stage pointerdown closes the open menu and the orbit starts on the same pointerdown; Interagir resize pins via its popover pointerdown | — |

> [!DECISION] combobox-scope
> The value pickers (Aparência's Tema/Cor de seleção/Cores de origem/Cabeçalho, and the per-property enum/unit dropdowns in the properties panel; inventory row 5) are form controls nested in or next to menus. Hover-opening them would pop a dropdown for every row the pointer crosses in the properties panel.
> - **Option A** (recommended): not "menus". They keep click-to-open and blur-to-close, and only gain Escape-closes-innermost. This plan implements A.
> - **Option B**: treat them as menus too (hover+pin). Adds a Task: route `cbToggle`/`cbBlur` through `menuStep` with a second, nested key; e2e for the properties panel.

> [!DECISION] pinned-hover
> Today, hovering Interagir while ⚙ is pinned switches to Interagir and drops the pin. One rule is needed for all four.
> - **Option A** (recommended): a pinned menu wins; hover on another trigger is ignored until the pin is released (click elsewhere, Escape, or click the other trigger). Pin means "stay".
> - **Option B**: keep today's ⚙/Interagir behavior: hover always switches, even away from a pinned menu. Changes one reducer line (`if (open && pin) return null;` removed) and flips `HoverOther_WhilePinned` in Tasks 3-4.

> [!DECISION] outside-passthrough
> A pointerdown outside an open menu (often on the canvas) closes it.
> - **Option A** (recommended): the same pointerdown also does its normal job (select a plane, start an orbit). Matches today's Projetos outside-close; one gesture fewer.
> - **Option B**: the first outside pointerdown only closes (swallowed). Needs `preventDefault`/`stopPropagation` in the capture listener plus a click-suppression flag; `PinnedMenu_StageDrag_ClosesAndOrbits` flips.

> [!DECISION] visual-baselines
> "No visual change" is proved by Playwright `toHaveScreenshot` with `maxDiffPixels: 0`, baselines taken from the unmodified `index.html` (Task 2). At `53b271c` `playwright.config.js` has no `projects`, so files are named `{arg}-{platform}` (`menu-closed-win32.png`); S5.7 merges first (order S5.7 → S4.4b → S3.2 → S4.6) and adds a `snapshotPathTemplate` that keeps `{arg}-{platform}`; if S3.2 ever lands before S5.7, S5.7 must `git mv` any committed PNGs to its template.
> - **Option A**: commit the five PNGs as a permanent guard. Requires a `@visual` tag excluded from the regression run and a regeneration rule in `docs/LOCAL-SETUP.md`; fragile across GPU/driver/Playwright bumps, and the `--update-snapshots` reflex silently empties the guard.
> - **Option B** (recommended, implemented here): the spec is committed but runs only with `LAYERS_VISUAL=1`; PNGs stay local and untracked, the 0 px diff is proved on the branch (Task 5 Step 9) and recorded in the implementation report, and the PNGs are deleted in Task 7. The regression run never includes it.

## File Structure

| File | Responsibility |
|---|---|
| `lib/layers-core.js` | `MENU_TIMING`, `menuStep` (pure), exported on `LayersCore` |
| `test/layers-core.test.js` | `describe('MenuStep')` truth table |
| `index.html` | adapter (`menuCur`, `menuGo`, `menuEv`, `menuAct`, `menuEscape`, `menuRoots`, `menuHas`, `acoesRef`), four menus wired, `escape()`, capture `onDocDown` |
| `e2e/menu-open.spec.js` | behavior of the shared pattern on the four menus |
| `e2e/menu-visual.spec.js` (PNGs in `e2e/menu-visual.spec.js-snapshots/` local only, never committed) | pixel freeze: closed + four open states, click and hover; runs only with `LAYERS_VISUAL=1` |
| `docs/roadmap.md`, `docs/roadmap.data.json` | S3.2 row `in-progress` + plan link |
| `docs/RELEASE-CHECKLIST.md` (§ C line 36 only), `docs/ARCHITECTURE.md` (Módulos row, line 63), `changelog.d/feature-261014-0-s3-2-menu-open-pattern.md` | closing docs |

### `index.html` regions touched (for the S4.6 / S5.7 disjointness check)

| Region | Lines (base `53b271c`) | Change |
|---|---|---|
| Projetos root, trigger, popover | 42, 43, 45 | attributes only (`onPointerEnter/Leave`, `onBlur`, `onPointerDown`, `data-menu`, `aria-*`) |
| Aparência root, trigger, popover | 94, 95, 97 | attributes only |
| Interagir root, trigger, popover | 168, 169, 174 | attributes only (`onMouse*` → `onPointer*`, `onMouseDown` → `onPointerDown`) |
| Ações wrapper, trigger | 343, 344 | attributes only (`ref`, `onPointer*`, `onBlur`, `data-menu`, `aria-*`) |
| state init | 1074 | drop `menuOpen: false` (orphan) |
| `interDrag`, `interDdDown` | 1084, 1087 | drop `menuPin: true`; `interDdDown` pins |
| adapter methods | insert after 1451 (`  preventBlur = e => e.preventDefault();`) | new block (~20 lines) |
| `componentDidMount` outside listener | 1522-1523 | capture `pointerdown`, any menu |
| `componentWillUnmount` | 1554 | listener removal (capture) + `clearTimeout(this.menuT)` |
| `escape()` | 1705 | `menuOpen` → `cbOpen`, then menu |
| `openDiff`, `exportFull` | 1932, 1936 | drop `menuOpen: false` (close moves to the item) |
| render: `mk()`, gear model | 2141-2142, 2175-2176 | handlers → `menuEv(k)` |
| render: Ajustes / diff / Projetos model | 2251, 2252, 2260, 2261, 2262, 2264, 2268, 2274 | Ações/Projetos state → `menu`; item handlers wrapped in `menuAct` |

Merge order (decided): S5.7 → S4.4b → S3.2 → S4.6. S3.2 rebases onto the final `playwright.config.js` (S5.7's `snapshotPathTemplate`) before merging.

Overlap notes:
- S4.6 edits only `index.html` 1455, 1555, 2013 and 2284 (the other `getComputedStyle` sites 1588, 1661, 1726, 1996, 2150-2151 stay untouched). The adapter block is inserted after `:1451` (not after `:1454`), so it no longer touches S4.6's `:1455`. S3.2's `:1554` (`componentWillUnmount`) is adjacent to S4.6's `:1555`: a trivial conflict on merge, keep both changes.
- S5.7 touches only `index.html:1443` and `playwright.config.js`: no shared line with S3.2.
- `lib/layers-core.js` and `test/` merge cleanly (S3.2 inserts its exports after `deadInteractions: deadInteractions,`, away from `viewCuller`).
- `e2e/menu-visual.spec.js` skips non-Chromium projects (built in), in case S5.7 adds Firefox/WebKit.

Constraint on S3.4 (and S3.3):
- (a) any new popup inside Aparência stays in the `aparRef` DOM subtree, or it counts as "outside" and closes the menu on pointerdown; `gearRef`/`gearAnchorNow` are inert on develop (the ref is never in the render model): attaching them moves the popover and requires regenerating `menu-apar-open`;
- (b) the ⚙ trigger keeps `data-menu="apar"`, and open/close stays in `menuEv('apar')` (`state.menu`/`menuPin` is the only open state); S3.4 changes the popover's contents, never its open logic;
- (c) S3.4 regenerates `menu-apar-open` and `menu-closed` on purpose, with the reason, in its own PR;
- S3.3 (tooltips) edits the trigger lines 43, 95, 169, 344 that S3.2 also edits: S3.3 comes after S3.2.

## Global Constraints

- Visual frozen: no color, size, spacing, border, font or text change; only the attributes listed above. `support.js` is never edited.
- No network on load; no new `<script>`/`<link>`.
- `index.html` edits via unique anchors: before each replace run `grep -cF '<anchor>' index.html` and require the stated count (1 unless said otherwise).
- Conventional Commits in EN; task commits end with `(S3.2 Task N)`, `(S3.2)` only for docs commits outside the tasks. No co-author trailer, no session-link trailer (the harness's `Claude-` + `Session:` line), no chat URL, no AI attribution; no commit on `develop`/`master`. Branch: `feature/261014-0-s3-2-menu-open-pattern`.
- Test names `Metodo_Cenario_Esperado`; `npm test` passes before each commit.
- E2E is a manual gate. Port 5180 is shared between worktrees and `playwright.config.js` has `reuseExistingServer: true`, so a foreign server would be tested silently. Wrap **every** Playwright run in this block (Bash tool timeout 600000); `<specs>` is the only part that changes:

```bash
n=0; until mkdir /tmp/layers-e2e.lock 2>/dev/null; do n=$((n+1)); [ "$n" -ge 60 ] && { echo "COULD NOT RUN: stale lock"; exit 1; }; sleep 10; done
trap 'rmdir /tmp/layers-e2e.lock' EXIT
code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5180/); [ "$code" = "000" ] || { echo "COULD NOT RUN: 5180 busy"; exit 1; }
npx playwright test <specs>
```

- `docs/RELEASE-CHECKLIST.md:8` (`Hoje: …`) is never edited here: counter recounted by the integration task.

---

### Task 1: Tracker row in progress

**Files:**
- Modify: `docs/roadmap.md` (row `S3.2` only), `docs/roadmap.data.json` (rebuilt)

- [ ] **Step 0: Branch slug**

Run: `git branch -m feature/261014-0-s3-2-menu-open-pattern` (the slug must carry the leaf token `s3-2`). Expected: `git branch --show-current` prints it.

- [ ] **Step 1: Edit the row**

The leaf row already exists (`docs/roadmap.md:42`, status `registered`); no new row. In the row starting `| S3.2 | 2 | S3 | Padrão único de abertura de menus |`: set the `plan` column to `[](superpowers/plans/2026-10-14-s3-2-menu-open-pattern.md)` and `status` to `in-progress`. Nothing else.

- [ ] **Step 2: Rebuild and commit**

Run: `python ~/.claude/design/_build_proto.py .` — Expected: exit 0, `docs/roadmap.data.json` changed.
Run: `git diff --stat` — Expected: exactly `docs/roadmap.md` (1 line) and `docs/roadmap.data.json`.

```bash
git add docs/roadmap.md docs/roadmap.data.json
git commit -m "docs: mark S3.2 in progress with its plan (S3.2 Task 1)"
```

---

### Task 2: Visual baseline before any code change

**Files:**
- Create: `e2e/menu-visual.spec.js` (committed); `e2e/menu-visual.spec.js-snapshots/*.png` (generated, local only, never committed)

**Interfaces:**
- Consumes: unmodified `index.html` (this task runs before Tasks 3-5).
- Produces: local snapshots `menu-closed`, `menu-hist-open`, `menu-apar-open`, `menu-inter-open`, `menu-acoes-open` (files `<name>-win32.png`, see `[!DECISION] visual-baselines` for the naming after S5.7); Task 5 adds hover tests that reuse the same names.

- [ ] **Step 1: Write the spec**

Create `e2e/menu-visual.spec.js` (locators use texts/titles that exist before S3.2; no `data-menu` yet):

```js
import { test, expect } from '@playwright/test';

// S3.2 visual freeze: the menu pattern changes behavior only. Baselines come from the unmodified
// index.html and must still match pixel for pixel after the wiring. No project is loaded, so no
// toast, timestamp or plane can move between runs. Manual pixel gate: baselines are local, never
// committed, so the spec runs only with LAYERS_VISUAL=1 and never in the regression run.
test.skip(!process.env.LAYERS_VISUAL, 'manual pixel gate: set LAYERS_VISUAL=1');
test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are Chromium-only');

const SHOT = { animations: 'disabled', caret: 'hide', maxDiffPixels: 0 };
const MENUS = [
  { key: 'hist', trigger: (p) => p.getByText('Nenhum projeto').first(), probe: (p) => p.getByText('Conectar pasta local…') },
  { key: 'apar', trigger: (p) => p.locator('button[title^="Aparência · Fonte"]'), probe: (p) => p.getByText('Aparência', { exact: true }) },
  { key: 'inter', trigger: (p) => p.getByText('Interagir', { exact: false }).first(), probe: (p) => p.getByText('Modo interativo').first() },
  { key: 'acoes', trigger: (p) => p.getByText('Ações ▾'), probe: (p) => p.getByText(/^Ver diff/) },
];

async function ready(page) {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByText('Ações ▾')).toBeVisible();
}

async function park(page) {
  const c = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.move(c.x, c.y);
}

// keyboard focus is not part of the visual contract: blur before every shot
const unfocus = (page) => page.evaluate(() => document.activeElement && document.activeElement.blur());

test('Visual_AllClosed_MatchesBaseline', async ({ page }) => {
  await ready(page);
  await park(page);
  await expect(page).toHaveScreenshot('menu-closed.png', SHOT);
});

for (const m of MENUS) {
  test(`Visual_ClickOpen_${m.key}_MatchesBaseline`, async ({ page }) => {
    await ready(page);
    await m.trigger(page).click();
    await expect(m.probe(page)).toBeVisible();
    await unfocus(page);
    await expect(page).toHaveScreenshot(`menu-${m.key}-open.png`, SHOT);
  });
}
```

- [ ] **Step 2: Generate the baseline on the unmodified tree**

Run: `git diff --quiet HEAD -- index.html lib/ && echo clean` — Expected: `clean` (no code change yet).
Run (inside the lock of Global Constraints, `<specs>` = `e2e/menu-visual.spec.js --update-snapshots`, prefixed `LAYERS_VISUAL=1`): `LAYERS_VISUAL=1 npx playwright test e2e/menu-visual.spec.js --update-snapshots`
Expected: 5 passed; 5 files in `e2e/menu-visual.spec.js-snapshots/`.
Run: `npx playwright test e2e/menu-visual.spec.js` (inside the lock, no env) — Expected: 5 skipped.

- [ ] **Step 3: Prove the baseline is deterministic**

Run (inside the lock) twice: `LAYERS_VISUAL=1 npx playwright test e2e/menu-visual.spec.js`
Expected: 5 passed both times. If any shot differs between two runs of the same code, do not loosen `maxDiffPixels`: switch that shot to `clip` around the trigger + popover (`boundingBox()` union), regenerate, rerun twice; if still unstable, stop and report.

- [ ] **Step 4: Commit the spec only**

```bash
git add e2e/menu-visual.spec.js
git commit -m "test(e2e): add pixel freeze spec for the four menus (S3.2 Task 2)"
git status --short e2e/menu-visual.spec.js-snapshots   # expected: untracked (??), never staged
```

(`[!DECISION] visual-baselines` Option A instead: also commit the PNGs, tag the spec `@visual`, exclude it from Task 6 with `--grep-invert @visual`, and add the regeneration rule to `docs/LOCAL-SETUP.md`.)

---

### Task 3: Pure reducer `menuStep`

**Files:**
- Modify: `lib/layers-core.js` (function after `viewCuller`, before `// Ha edicao nao salva`, line ~545; export after `deadInteractions: deadInteractions,`, line ~1216)
- Test: `test/layers-core.test.js` (new `describe` at the end of the file)

**Interfaces:**
- Consumes: nothing.
- Produces: `LayersCore.MENU_TIMING: { openDelay: number, closeGrace: number }`; `LayersCore.menuStep(cur: { menu: string|null, pin: boolean, pending?: string|null }, ev, timing?)` (`pending` = key of the armed open timer, only non-null when `openDelay > 0`) → { menu, pin, timer: null | { kind: 'open'|'close', key, ms } } | null`. Events: `{ type: 'enter', key, pointer, buttons }`, `{ type: 'leave', key, pointer }`, `{ type: 'timer', kind, key }`, `{ type: 'click', key }`, `{ type: 'inside', key }`, `{ type: 'close' }`. `null` = ignore the event and keep any pending timer; otherwise the caller clears its timer, applies `menu`/`pin`, and arms `timer` if present.

- [ ] **Step 1: Write the failing test**

Append to `test/layers-core.test.js`:

```js
describe('MenuStep', () => {
  const step = (menu, pin, ev, t, pending = null) => core.menuStep({ menu, pin, pending }, ev, t);
  const enter = (key, extra) => ({ type: 'enter', key, pointer: 'mouse', buttons: 0, ...extra });
  const leave = (key, extra) => ({ type: 'leave', key, pointer: 'mouse', ...extra });
  const DELAY = { openDelay: 120, closeGrace: 260 };
  const SHUT = { menu: null, pin: false, timer: null };

  it('Timing_Default_ZeroOpenDelayAnd260Grace', () => {
    expect(core.MENU_TIMING).toEqual({ openDelay: 0, closeGrace: 260 });
  });

  it('Enter_NothingOpen_OpensUnpinnedNow', () => {
    expect(step(null, false, enter('apar'))).toEqual({ menu: 'apar', pin: false, timer: null });
  });

  it('Enter_NothingOpenWithDelay_SchedulesOpen', () => {
    expect(step(null, false, enter('apar'), DELAY)).toEqual({ menu: null, pin: false, timer: { kind: 'open', key: 'apar', ms: 120 } });
  });

  it('EnterLeave_Touch_Ignored', () => {
    expect(step(null, false, enter('hist', { pointer: 'touch' }))).toBeNull();
    expect(step('hist', false, leave('hist', { pointer: 'touch' }))).toBeNull();
  });

  it('Enter_ButtonPressed_Ignored', () => {
    expect(step(null, false, enter('inter', { buttons: 1 }))).toBeNull();
  });

  it('Enter_SameMenuOpen_CancelsCloseTimer', () => {
    expect(step('inter', false, enter('inter'))).toEqual({ menu: 'inter', pin: false, timer: null });
  });

  it('Enter_OtherUnpinnedOpen_SwitchesNowEvenWithDelay', () => {
    expect(step('apar', false, enter('inter'), DELAY)).toEqual({ menu: 'inter', pin: false, timer: null });
  });

  it('Enter_OtherPinnedOpen_Ignored', () => {
    expect(step('apar', true, enter('inter'))).toBeNull();
  });

  it('Leave_UnpinnedOpen_SchedulesCloseGrace', () => {
    expect(step('acoes', false, leave('acoes'))).toEqual({ menu: 'acoes', pin: false, timer: { kind: 'close', key: 'acoes', ms: 260 } });
  });

  it('Leave_Pinned_Ignored', () => {
    expect(step('acoes', true, leave('acoes'))).toBeNull();
  });

  it('Leave_OtherMenuOpen_Ignored', () => {
    expect(step('apar', false, leave('inter'))).toBeNull();
  });

  it('Leave_NothingOpenPendingSameKey_CancelsPendingOpen', () => {
    expect(step(null, false, leave('hist'), DELAY, 'hist')).toEqual(SHUT);
  });

  it('Leave_NothingOpenNoOrOtherPending_Ignored', () => {
    expect(step(null, false, leave('hist'))).toBeNull();
    expect(step(null, false, leave('hist'), DELAY, 'apar')).toBeNull();
  });

  it('TimerOpen_NothingOpen_OpensUnpinned', () => {
    expect(step(null, false, { type: 'timer', kind: 'open', key: 'hist' })).toEqual({ menu: 'hist', pin: false, timer: null });
  });

  it('TimerOpen_SomethingOpen_Ignored', () => {
    expect(step('apar', true, { type: 'timer', kind: 'open', key: 'hist' })).toBeNull();
  });

  it('TimerClose_StillUnpinned_Closes', () => {
    expect(step('inter', false, { type: 'timer', kind: 'close', key: 'inter' })).toEqual(SHUT);
  });

  it('TimerClose_PinnedMeanwhile_Ignored', () => {
    expect(step('inter', true, { type: 'timer', kind: 'close', key: 'inter' })).toBeNull();
  });

  it('TimerClose_OtherMenuNow_Ignored', () => {
    expect(step('apar', false, { type: 'timer', kind: 'close', key: 'inter' })).toBeNull();
  });

  it('Click_Closed_OpensPinned', () => {
    expect(step(null, false, { type: 'click', key: 'hist' })).toEqual({ menu: 'hist', pin: true, timer: null });
  });

  it('Click_UnpinnedOpen_Pins', () => {
    expect(step('hist', false, { type: 'click', key: 'hist' })).toEqual({ menu: 'hist', pin: true, timer: null });
  });

  it('Click_Pinned_Closes', () => {
    expect(step('hist', true, { type: 'click', key: 'hist' })).toEqual(SHUT);
  });

  it('Click_OtherPinned_SwitchesPinned', () => {
    expect(step('apar', true, { type: 'click', key: 'acoes' })).toEqual({ menu: 'acoes', pin: true, timer: null });
  });

  it('Inside_Unpinned_Pins', () => {
    expect(step('inter', false, { type: 'inside', key: 'inter' })).toEqual({ menu: 'inter', pin: true, timer: null });
  });

  it('Inside_PinnedOrOther_Ignored', () => {
    expect(step('inter', true, { type: 'inside', key: 'inter' })).toBeNull();
    expect(step('apar', false, { type: 'inside', key: 'inter' })).toBeNull();
  });

  it('Close_OpenOrPending_ClosesEvenWhenPinned', () => {
    expect(step('apar', true, { type: 'close' })).toEqual(SHUT);
    expect(step(null, false, { type: 'close' }, DELAY, 'hist')).toEqual(SHUT);
  });

  it('Close_NothingOpen_Ignored', () => {
    expect(step(null, false, { type: 'close' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/layers-core.test.js -t MenuStep`
Expected: FAIL (`core.menuStep is not a function`, `MENU_TIMING` undefined).

- [ ] **Step 3: Write minimal implementation**

In `lib/layers-core.js`, immediately before the line `  // Ha edicao nao salva (changes pendentes ou buffer de codigo)?` (`grep -cF` = 1):

```js
  // S3.2: one opening pattern for every menu: hover opens, click pins, outside/Escape/item close.
  // Pure: `cur` = { menu, pin, pending (key of an armed open timer) }; returns { menu, pin, timer } (timer: null or { kind, key, ms })
  // or null = ignore the event and keep any pending timer. Delays are tunable.
  var MENU_TIMING = { openDelay: 0, closeGrace: 260 };
  function menuStep(cur, ev, timing) {
    var t = timing || MENU_TIMING, open = cur.menu || null, pin = !!cur.pin;
    var shut = { menu: null, pin: false, timer: null };
    if ((ev.type === 'enter' || ev.type === 'leave') && ev.pointer === 'touch') return null;
    if (ev.type === 'enter') {
      if (ev.buttons) return null;
      if (open === ev.key) return { menu: open, pin: pin, timer: null };
      if (open && pin) return null;
      if (open || !(t.openDelay > 0)) return { menu: ev.key, pin: false, timer: null };
      return { menu: null, pin: false, timer: { kind: 'open', key: ev.key, ms: t.openDelay } };
    }
    if (ev.type === 'leave') {
      if (open === ev.key && !pin) return { menu: open, pin: false, timer: { kind: 'close', key: open, ms: t.closeGrace } };
      if (open) return null;
      return cur.pending === ev.key ? shut : null;
    }
    if (ev.type === 'timer') {
      if (ev.kind === 'open') return open ? null : { menu: ev.key, pin: false, timer: null };
      return open === ev.key && !pin ? shut : null;
    }
    if (ev.type === 'click') return open === ev.key && pin ? shut : { menu: ev.key, pin: true, timer: null };
    if (ev.type === 'inside') return open === ev.key && !pin ? { menu: open, pin: true, timer: null } : null;
    if (ev.type === 'close') return open || cur.pending ? shut : null;
    return null;
  }

```

In the `api` object, after `    deadInteractions: deadInteractions,` (`grep -cF` = 1) add:

```js
    MENU_TIMING: MENU_TIMING,
    menuStep: menuStep,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` — Expected: PASS (all suites, `MenuStep` 26 cases included).

- [ ] **Step 5: Commit**

```bash
git add lib/layers-core.js test/layers-core.test.js
git commit -m "feat(core): add menuStep reducer for the shared menu pattern (S3.2 Task 3)"
```

---

### Task 4: Behavior e2e (fails before the wiring)

**Files:**
- Create: `e2e/menu-open.spec.js`

**Interfaces:**
- Consumes: `readNodes` (`e2e/tree-helpers.js`); `data-menu="<key>"` and `aria-expanded` on the four triggers (added in Task 5).
- Produces: the acceptance suite for Task 5.

- [ ] **Step 1: Write the spec**

Create `e2e/menu-open.spec.js`:

```js
import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S3.2: the four menus share one pattern (LayersCore.menuStep): hover opens, click pins, a pointerdown
// outside / Escape / focus leaving / an action item closes, touch taps open pinned. Open state is the
// trigger's aria-expanded plus the popover's first item.
const MENUS = [
  { key: 'hist', probe: 'Conectar pasta local…' },
  { key: 'apar', probe: 'Aparência' },
  { key: 'inter', probe: 'Modo interativo' },
  { key: 'acoes', probe: /^Ver diff/ },
];
const [HIST, APAR, INTER, ACOES] = MENUS;
const GRACE = 260; // LayersCore.MENU_TIMING.closeGrace
const trig = (page, key) => page.locator(`[data-menu="${key}"]`);
const item = (page, m) => page.getByText(m.probe, { exact: typeof m.probe === 'string' }).first();

async function load(page) {
  await page.goto('/?layers=fixtures/plain-css/');
  await readNodes(page);
}

async function isOpen(page, m, open) {
  await expect(trig(page, m.key)).toHaveAttribute('aria-expanded', String(open));
  if (open) await expect(item(page, m)).toBeVisible();
  else await expect(item(page, m)).toBeHidden();
}

async function stageCentre(page) {
  return page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
}

async function park(page) {
  const c = await stageCentre(page);
  await page.mouse.move(c.x, c.y);
}

for (const m of MENUS) {
  test(`Hover_${m.key}_OpensUnpinnedAndClosesAfterLeave`, async ({ page }) => {
    await load(page);
    await trig(page, m.key).hover();
    await isOpen(page, m, true);
    await park(page);
    await isOpen(page, m, false);
  });

  test(`Click_${m.key}_PinsAgainstLeaveAndSecondClickCloses`, async ({ page }) => {
    await load(page);
    await trig(page, m.key).click();
    await park(page);
    await page.waitForTimeout(GRACE + 300);
    await isOpen(page, m, true);
    await trig(page, m.key).click();
    await isOpen(page, m, false);
  });

  test(`OutsidePointerDown_${m.key}_ClosesPinned`, async ({ page }) => {
    await load(page);
    await trig(page, m.key).click();
    await isOpen(page, m, true);
    const c = await stageCentre(page);
    await page.mouse.click(c.x, c.y);
    await isOpen(page, m, false);
  });

  test(`Keyboard_${m.key}_EnterOpensEscapeClosesAndRefocuses`, async ({ page }) => {
    await load(page);
    await trig(page, m.key).focus();
    await page.keyboard.press('Enter');
    await isOpen(page, m, true);
    await page.keyboard.press('Escape');
    await isOpen(page, m, false);
    await expect(trig(page, m.key)).toBeFocused();
  });
}

test('HoverOther_WhilePinned_DoesNotSteal', async ({ page }) => {
  await load(page);
  await trig(page, 'apar').click();
  await trig(page, 'inter').hover();
  await page.waitForTimeout(GRACE + 300);
  await isOpen(page, APAR, true);
  await expect(trig(page, 'inter')).toHaveAttribute('aria-expanded', 'false');
});

test('HoverOther_WhileUnpinned_SwitchesAtOnce', async ({ page }) => {
  await load(page);
  await trig(page, 'apar').hover();
  await isOpen(page, APAR, true);
  await trig(page, 'inter').hover();
  await isOpen(page, INTER, true);
  await expect(trig(page, 'apar')).toHaveAttribute('aria-expanded', 'false');
});

test('ClickOther_OneMenuOpenAtATime', async ({ page }) => {
  await load(page);
  await trig(page, 'hist').click();
  await isOpen(page, HIST, true);
  await trig(page, 'apar').click();
  await isOpen(page, APAR, true);
  await isOpen(page, HIST, false);
});

test('HoverThenPointerDownInside_Pins', async ({ page }) => {
  await load(page);
  await trig(page, 'apar').hover();
  await item(page, APAR).click(); // the "Aparência" label: inside the popover, not an action
  await park(page);
  await page.waitForTimeout(GRACE + 300);
  await isOpen(page, APAR, true);
});

test('HoverTriggerThenPopover_inter_StaysOpenPastGrace', async ({ page }) => {
  await load(page);
  await trig(page, 'inter').hover();
  await isOpen(page, INTER, true);
  // the popover is a sibling of the top bar, not inside the trigger root: leave + enter must cancel the grace
  await item(page, INTER).hover();
  await page.waitForTimeout(GRACE + 300);
  await isOpen(page, INTER, true);
});

test('HoverOpen_inter_CornerResizeOutside_StaysOpen', async ({ page }) => {
  await load(page);
  await trig(page, 'inter').hover();
  await isOpen(page, INTER, true);
  const h = await page.locator('div[title="Arrastar para redimensionar"]').boundingBox(); // index.html:200
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  const c = await stageCentre(page);
  await page.mouse.move(c.x, c.y + 120, { steps: 6 }); // shrink: the pointer ends outside the popover
  await page.waitForTimeout(GRACE + 300);
  await isOpen(page, INTER, true);
  await page.mouse.up();
  await isOpen(page, INTER, true);
});

test('Tab_FocusLeavesRoot_Closes', async ({ page }) => {
  await load(page);
  await trig(page, 'apar').focus();
  await page.keyboard.press('Enter');
  await isOpen(page, APAR, true);
  await page.keyboard.press('Shift+Tab'); // the previous focusable is outside the ⚙ root
  await isOpen(page, APAR, false);
});

test('ActionItem_Acoes_ClosesEvenWhenTheActionRefuses', async ({ page }) => {
  await load(page);
  await trig(page, 'acoes').click();
  // fixture without a connected folder: exportFull refuses by toast, the menu still closes
  await page.getByText('Exportar versões completas…').click();
  await expect(trig(page, 'acoes')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Exportar versões completas…')).toBeHidden();
});

test('NestedCombobox_EscapeClosesInnerThenMenu', async ({ page }) => {
  await load(page);
  await trig(page, 'apar').click();
  await page.getByText('Tema', { exact: true }).first().locator('xpath=following-sibling::div//button').click();
  const opt = page.getByText('Gray · 2 Ardósia', { exact: true });
  await expect(opt).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(opt).toBeHidden();
  await isOpen(page, APAR, true);
  await page.keyboard.press('Escape');
  await isOpen(page, APAR, false);
});

test('DragOverTrigger_DoesNotOpen', async ({ page }) => {
  await load(page);
  const c = await stageCentre(page);
  const t = await trig(page, 'inter').boundingBox();
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 8 });
  await page.waitForTimeout(GRACE + 300);
  await expect(trig(page, 'inter')).toHaveAttribute('aria-expanded', 'false');
  await page.mouse.up();
});

test('PinnedMenu_StageDrag_ClosesAndOrbits', async ({ page }) => {
  await load(page);
  await trig(page, 'inter').click();
  await isOpen(page, INTER, true);
  const c = await stageCentre(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 8, c.y);
  await page.mouse.move(c.x + 60, c.y + 40, { steps: 5 });
  // Plane sets willChange 'transform' only while dragging (same probe as viewport-culling.spec.js)
  const dragging = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    return [...stage.querySelectorAll('div')].some((el) => el.style.willChange === 'transform');
  });
  await page.mouse.up();
  expect(dragging, 'the orbit starts on the same pointerdown that closes the menu').toBe(true);
  await isOpen(page, INTER, false);
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('Touch_Tap_OpensPinnedAndOutsideTapCloses', async ({ page }) => {
    await load(page);
    await trig(page, 'inter').tap();
    await isOpen(page, INTER, true);
    await page.waitForTimeout(GRACE + 300);
    await isOpen(page, INTER, true);
    await trig(page, 'inter').tap();
    await isOpen(page, INTER, false);
    await trig(page, 'inter').tap();
    await isOpen(page, INTER, true);
    const c = await stageCentre(page);
    await page.touchscreen.tap(c.x, c.y);
    await isOpen(page, INTER, false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run (inside the lock): `npx playwright test e2e/menu-open.spec.js`
Expected: FAIL on all 28 tests, but most of that red comes from the selector: no `[data-menu]`/`aria-expanded` yet, so `toHaveAttribute` times out everywhere. Against today's behavior (if the selector existed) only these would fail: Projetos/Ações hover and keyboard, Escape on Projetos/⚙/Interagir, outside pointerdown on ⚙/Interagir/Ações, `HoverOther_WhilePinned` (today hover steals), `DragOverTrigger` (today `mouseenter` ignores buttons), `Tab_FocusLeavesRoot`, `NestedCombobox_Escape` and `ActionItem_Acoes` (today `exportFull`'s refusal leaves the menu open). The ⚙/Interagir hover/click tests, `HoverTriggerThenPopover`, `CornerResizeOutside` and `Touch_Tap` are red **only** because of the selector: they guard against regressions. This is the red state for Task 5.

- [ ] **Step 3: Commit**

```bash
git add e2e/menu-open.spec.js
git commit -m "test(e2e): specify the shared hover-and-pin menu pattern (S3.2 Task 4)"
```

---

### Task 5: Wire the four menus in `index.html`

**Files:**
- Modify: `index.html` (regions in the table above), `e2e/menu-visual.spec.js` (hover tests appended)

**Interfaces:**
- Consumes: `LayersCore.menuStep`, `LayersCore.MENU_TIMING` (Task 3).
- Produces: `data-menu="hist|apar|inter|acoes"` + `aria-expanded` on the triggers, `aria-haspopup="menu"` (hist, acoes) / `"dialog"` (apar, inter); `state.menu ∈ { null, 'hist', 'apar', 'inter', 'acoes' }`; `state.menuOpen` removed; Projetos no longer uses `cbOpen`.

Every step below: confirm the anchor count with `grep -cF '<anchor>' index.html` before replacing (expected 1 unless stated).

- [ ] **Step 1: Adapter methods**

Insert after the line `  preventBlur = e => e.preventDefault();` (`:1451`; placed here, not after `:1454`, so it stays clear of S4.6's edit at `:1455`):

```js
  // S3.2: every menu (Projetos 'hist', Aparência 'apar', Interagir 'inter', Ações 'acoes') goes through
  // LayersCore.menuStep. menuCur mirrors state.menu/menuPin synchronously: React batches pointer events.
  menuCur = { menu: null, pin: false, pending: null };
  acoesRef = React.createRef();
  menuRoots = k => k === 'hist' ? [this.histRef] : k === 'apar' ? [this.aparRef] : k === 'inter' ? [this.interTrigRef, this.interDdRef] : k === 'acoes' ? [this.acoesRef] : [];
  menuHas = (k, n) => !!n && this.menuRoots(k).some(r => r.current && r.current.contains(n));
  menuGo = ev => {
    const r = LayersCore.menuStep(this.menuCur, ev); if (!r) return;
    clearTimeout(this.menuT);
    if (r.menu === 'inter') this.interAnchorNow(); else if (r.menu === 'apar') this.gearAnchorNow();
    const changed = r.menu !== this.menuCur.menu || r.pin !== this.menuCur.pin;
    this.menuCur = { menu: r.menu, pin: r.pin, pending: r.timer && r.timer.kind === 'open' ? r.timer.key : null };
    if (changed) this.setState({ menu: r.menu, menuPin: r.pin });
    if (r.timer) this.menuT = setTimeout(() => { this.menuCur = { ...this.menuCur, pending: null }; this.menuGo({ type: 'timer', kind: r.timer.kind, key: r.timer.key }); }, r.timer.ms);
  };
  menuEv = k => ({ enter: e => this.menuGo({ type: 'enter', key: k, pointer: e.pointerType, buttons: e.buttons }), leave: e => this.menuGo({ type: 'leave', key: k, pointer: e.pointerType }),
    click: () => this.menuGo({ type: 'click', key: k }), inside: () => this.menuGo({ type: 'inside', key: k }),
    blur: e => { if (this.menuCur.menu === k && e.relatedTarget && !this.menuHas(k, e.relatedTarget)) this.menuGo({ type: 'close' }); } });
  menuAct = fn => (...a) => { this.menuGo({ type: 'close' }); return fn(...a); };
  menuEscape = () => { const k = this.menuCur.menu, back = this.menuHas(k, document.activeElement); this.menuGo({ type: 'close' }); const root = back && this.menuRoots(k)[0].current; const t = root && root.querySelector('[data-menu]'); if (t) t.focus(); };
```

The trigger of each root carries `data-menu` (Step 7: `:43`, `:95`, `:169`, `:344`); the focus lookup does not depend on button order.

- [ ] **Step 2: Interagir resize and popover pin**

`:1087` — replace `  interDdDown = () => {};` with:

```js
  interDdDown = () => this.menuGo({ type: 'inside', key: 'inter' });
```

`:1084` — replace `this.setState({ interResizing: true, menuPin: true });` with `this.setState({ interResizing: true });` (the popover's `pointerdown` pins before `interDrag`'s `mousedown`).

- [ ] **Step 3: Outside close, unmount**

`:1522-1523` — replace the two lines starting `    this.onDocDown = e => {` and `    document.addEventListener('mousedown', this.onDocDown);` with:

```js
    // capture: the top bar stops mousedown propagation, a bubbling listener would miss it
    this.onDocDown = e => { const k = this.menuCur.menu; if (!k || this.menuHas(k, e.target)) return; this.menuGo({ type: 'close' }); if (k === 'hist') this.setState({ histAdding: false }); };
    document.addEventListener('pointerdown', this.onDocDown, true);
```

`:1554` — replace `document.removeEventListener('mousedown', this.onDocDown);` with `document.removeEventListener('pointerdown', this.onDocDown, true); clearTimeout(this.menuT);`.

- [ ] **Step 4: Escape**

`:1705` — replace `else if (s.menuOpen) this.setState({ menuOpen: false });` with:

```js
else if (s.cbOpen) this.setState({ cbOpen: null }); else if (this.menuCur.menu) this.menuEscape();
```

- [ ] **Step 5: Remove the `menuOpen` field**

- `:1074` — replace `ajOpen: true, menuOpen: false, diff: null,` with `ajOpen: true, diff: null,`.
- `:1932` — replace `this.setState({ diff: out, menuOpen: false });` with `this.setState({ diff: out });`.
- `:1936` — replace `    this.setState({ menuOpen: false }); if (!this.state.changes.length) return;` with `    if (!this.state.changes.length) return;`.
- `:2274` — replace `openSave: () => { if (!s.changes.length) return; this.setState({ menuOpen: false, modal: {` with `openSave: () => { this.menuGo({ type: 'close' }); if (!s.changes.length) return; this.setState({ modal: {`.
- Then `grep -c 'menuOpen' index.html` — Expected: 2 lines (template `:345` and the `:2251` model line, rewritten in Step 6).

- [ ] **Step 6: Render model**

- `:2141-2142` (inside `mk`) — replace the two whole lines, which today read:

```js
      [k+'Enter']: () => { clearTimeout(this.menuT); if (k === 'inter') this.interAnchorNow(); if (s.menu !== k) this.setState({ menu: k, menuPin: false }); }, [k+'Leave']: () => { clearTimeout(this.menuT); this.menuT = setTimeout(() => { if (!this.state.menuPin && !this.state.interResizing) this.setState({ menu: null }); }, 260); },
      [k+'Pin']: () => { if (k === 'inter') this.interAnchorNow(); this.setState(st => st.menu === k && st.menuPin ? { menu: null, menuPin: false } : { menu: k, menuPin: true }); } }; };
```

with (the `interResizing` guard is no longer needed: a resize starts with a `pointerdown` inside the popover, which pins):

```js
      [k+'Enter']: this.menuEv(k).enter, [k+'Leave']: this.menuEv(k).leave, [k+'Blur']: this.menuEv(k).blur,
      [k+'Pin']: this.menuEv(k).click }; };
```

- `:2175-2176` (gear) — replace the two whole lines, which today read:

```js
      gearEnter: () => { clearTimeout(this.menuT); if (s.menu !== 'apar') { this.gearAnchorNow(); this.setState({ menu: 'apar', menuPin: false }); } }, gearTop: (s.gearAnchor || {}).top || '31px', gearRight: (s.gearAnchor || {}).right || '12px', gearLeave: () => { clearTimeout(this.menuT); this.menuT = setTimeout(() => { if (!this.state.menuPin) this.setState({ menu: null }); }, 260); },
      gearPin: () => { this.gearAnchorNow(); this.setState(st => st.menu === 'apar' && st.menuPin ? { menu: null, menuPin: false } : { menu: 'apar', menuPin: true }); } };
```

with:

```js
      gearEnter: this.menuEv('apar').enter, gearTop: (s.gearAnchor || {}).top || '31px', gearRight: (s.gearAnchor || {}).right || '12px', gearLeave: this.menuEv('apar').leave, gearBlur: this.menuEv('apar').blur, gearInside: this.menuEv('apar').inside,
      gearPin: this.menuEv('apar').click };
```
- `:2251` — replace `menuOpen: s.menuOpen, toggleMenu: () => this.setState(st => ({ menuOpen: !st.menuOpen })),` with `menuOpen: s.menu === 'acoes', toggleMenu: this.menuEv('acoes').click, acoesRef: this.acoesRef, acoesEnter: this.menuEv('acoes').enter, acoesLeave: this.menuEv('acoes').leave, acoesBlur: this.menuEv('acoes').blur,`.
- `:2252` — replace `openDiff: () => this.openDiff(), exportFull: () => this.exportFull(),` with `openDiff: this.menuAct(() => this.openDiff()), exportFull: this.menuAct(() => this.exportFull()),`.
- `:2260` — replace `connectDir: () => this.pickDir(), openZip: () => this.pickZip(), exportCfg: () => this.exportCfg(), importCfg: () => this.importCfg(), histReset: () => this.resetUI(),` with `connectDir: this.menuAct(() => this.pickDir()), openZip: this.menuAct(() => this.pickZip()), exportCfg: this.menuAct(() => this.exportCfg()), importCfg: this.menuAct(() => this.importCfg()), histReset: this.menuAct(() => this.resetUI()),`; and on the same line `reloadItem: () => { this.setState({ cbOpen: null }); this.reloadProject(); }` with `reloadItem: this.menuAct(() => { this.setState({ cbOpen: null }); this.reloadProject(); })`.
- `:2261` — replace `open: () => this.openDemo(d)` with `open: this.menuAct(() => this.openDemo(d))`.
- `:2268` — replace `open: () => this.openHist(h),` with `open: this.menuAct(() => this.openHist(h)),`.
- `:2262` — replace `const open = s.cbOpen === 'hist';` with `const open = s.menu === 'hist'; const he = this.menuEv('hist');` (`hdrZ` on `:2264` keeps its text and now reads the migrated `open`).
- `:2264` — replace `histToggle: this.cbToggle('hist')` with `histToggle: he.click, histEnter: he.enter, histLeave: he.leave, histBlur: he.blur, histInside: he.inside`.

Behavior note: a Projetos action now closes the menu on click, before a file picker resolves; cancelling the picker no longer leaves the dropdown open (today it does). This is the "action item closes" rule; accepted in review (2026-10-14).

- [ ] **Step 7: Template attributes (no style change)**

| Line | Anchor (`grep -cF`) | Replacement |
|---|---|---|
| 42 | `<div ref="{{ histRef }}"` (1) | `<div ref="{{ histRef }}" onPointerEnter="{{ histEnter }}" onPointerLeave="{{ histLeave }}" onBlur="{{ histBlur }}"` |
| 43 | `<button onClick="{{ histToggle }}"` (1) | `<button onClick="{{ histToggle }}" data-menu="hist" aria-haspopup="menu" aria-expanded="{{ histOpen }}"` |
| 45 | `<div style="position:fixed;left:12px;top:31px;z-index:80;width:340px` (1) | `<div onPointerDown="{{ histInside }}" style="position:fixed;left:12px;top:31px;z-index:80;width:340px` |
| 94 | `onMouseEnter="{{ gearEnter }}" onMouseLeave="{{ gearLeave }}"` (1) | `onPointerEnter="{{ gearEnter }}" onPointerLeave="{{ gearLeave }}" onBlur="{{ gearBlur }}"` |
| 95 | `<button onClick="{{ gearPin }}"` (1) | `<button onClick="{{ gearPin }}" data-menu="apar" aria-haspopup="dialog" aria-expanded="{{ gearOpen }}"` |
| 97 | `<div style="position:fixed;top:{{ gearTop }};right:{{ gearRight }}` (1) | `<div onPointerDown="{{ gearInside }}" style="position:fixed;top:{{ gearTop }};right:{{ gearRight }}` |
| 168, 174 | `onMouseEnter="{{ interEnter }}" onMouseLeave="{{ interLeave }}"` (**2**, replace both) | `onPointerEnter="{{ interEnter }}" onPointerLeave="{{ interLeave }}" onBlur="{{ interBlur }}"` |
| 169 | `<button onClick="{{ interPin }}"` (1) | `<button onClick="{{ interPin }}" data-menu="inter" aria-haspopup="dialog" aria-expanded="{{ interOpen }}"` |
| 174 | `onMouseDown="{{ interDdDown }}"` (1) | `onPointerDown="{{ interDdDown }}"` |
| 343 | `<div onClick="{{ stop }}" style="position:relative">` (1) | `<div ref="{{ acoesRef }}" onPointerEnter="{{ acoesEnter }}" onPointerLeave="{{ acoesLeave }}" onBlur="{{ acoesBlur }}" onClick="{{ stop }}" style="position:relative">` |
| 344 | `<button onClick="{{ toggleMenu }}"` (1) | `<button onClick="{{ toggleMenu }}" data-menu="acoes" aria-haspopup="menu" aria-expanded="{{ menuOpen }}"` |

After the edits: `grep -c 'onMouseEnter="{{ \(gear\|inter\)' index.html` — Expected: 0; `grep -c 'data-menu=' index.html` — Expected: 4; `grep -c 'cbOpen === .hist.' index.html` — Expected: 0.

- [ ] **Step 8: Hover variants of the visual freeze**

Append to `e2e/menu-visual.spec.js` (same snapshot names as Task 2: a hover-open menu must look exactly like the click-open baseline):

```js
for (const m of MENUS) {
  test(`Visual_HoverOpen_${m.key}_MatchesClickBaseline`, async ({ page }) => {
    await ready(page);
    await m.trigger(page).hover();
    await expect(m.probe(page)).toBeVisible();
    await unfocus(page);
    await expect(page).toHaveScreenshot(`menu-${m.key}-open.png`, SHOT);
  });
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test` — Expected: PASS.
Run (inside the lock): `npx playwright test e2e/menu-open.spec.js` — Expected: PASS, 28 tests.
Run (inside the lock, local baselines from Task 2 present): `LAYERS_VISUAL=1 npx playwright test e2e/menu-visual.spec.js` — Expected: PASS, 9 tests, 0 px diff; **no** `--update-snapshots` (a visual diff is a failure to fix in the code, never a baseline to refresh). Save the run's last 15 lines for the implementation report (it is the proof of "no visual change", since the PNGs are not committed).
If `Touch_Tap_OpensPinnedAndOutsideTapCloses` fails only because Chromium does not deliver a `click` for `tap()`, report it with the trace; do not weaken the reducer.
If a `hover()` fails with "intercepts pointer events", an open popover covers the next trigger at 1280×760 (expected not to: the top bar is centered, ⚙'s popover hugs the right edge); report it, do not switch to `force: true`.

- [ ] **Step 10: Manual check (network + feel) — HUMAN step**

This step is for the human. If a subagent ever runs it, it runs inside the lock of Global Constraints (with the 5180 check) and stops the dev server before releasing the lock.
Run: `npm run dev`, open `http://localhost:5180/?layers=fixtures/traval/`.
Expected: each of the four menus opens on hover, pins on click, closes on outside click and Esc; dragging the canvas from under a pinned Interagir closes it and orbits; Interagir resize keeps it open; DevTools → Network: no request outside `localhost:5180`.

- [ ] **Step 11: Commit**

```bash
git add index.html e2e/menu-visual.spec.js
git commit -m "feat(editor): open every menu on hover and pin on click (S3.2 Task 5)"
git status --short e2e/menu-visual.spec.js-snapshots   # expected: still untracked (??)
```

---

### Task 6: Regression run of the existing e2e suite

**Files:** none (run and summarize).

**Interfaces:**
- Consumes: Tasks 2-5 on the branch.
- Produces: pass/fail table for the caller; no edits.

- [ ] **Step 1: Run every spec except perf**

Run the Global Constraints lock block verbatim (Bash tool timeout 600000), with `<specs>` = `$(ls e2e/*.spec.js | grep -v 'e2e/perf.spec.js')` and **no** `LAYERS_VISUAL` in the environment (the pixel gate is not part of the regression run; without the variable it reports 9 skipped).

Expected: PASS for all specs, including the menu-dependent ones (`apply-flow`, `dead-interactions`, `stale-banner`, `undo-redo`, `write-log-hash`, `pending-persist`, `manual-marker`, `scope-all-equal`) and `menu-open` (28); `menu-visual` 9 skipped.

- [ ] **Step 2: Report**

Output exactly: one line `exit_code <n>`, then the last 15 lines of raw output, then a table `| spec | passed | failed | skipped |`. Refusal tokens: `COULD NOT RUN: stale lock` or `COULD NOT RUN: 5180 busy` (printed by the lock block), no retry. Caller validates `exit_code`, the spec count against `ls e2e/*.spec.js`, and redoes any failure analysis at Workhorse.

---

### Task 7: Docs and changelog

**Files:**
- Modify: `docs/RELEASE-CHECKLIST.md` (line 36 only; line 8 untouched: counter recounted by the integration task), `docs/ARCHITECTURE.md` (line 63)
- Create: `changelog.d/feature-261014-0-s3-2-menu-open-pattern.md`

**Interfaces:**
- Consumes: Tasks 3-6 green.
- Produces: docs consistent with the feature; the S3.2 roadmap row closes later in `phase-close-gate`.

- [ ] **Step 1: Checklist**

In `docs/RELEASE-CHECKLIST.md` replace the line `- [ ] Padrão único de abertura de menus (decidir: hover+fixar em todos ou clique em todos).` with:

```md
- [x] Padrão único de abertura de menus: hover abre e clique fixa em Projetos, Aparência, Interagir e Ações (decisão de 2026-10-14); clique fora, Esc e item de ação fecham, toque abre fixado (`LayersCore.menuStep`; `e2e/menu-open.spec.js`, visual inalterado em `e2e/menu-visual.spec.js`).
```

- [ ] **Step 2: Architecture**

In `docs/ARCHITECTURE.md` replace the line `| Menus (engrenagem, INTERAGIR, Ações), dropdowns customizados, toast | Chrome da interface. |` with:

```md
| Menus (Projetos, Aparência, Interagir, Ações), dropdowns customizados, toast | Chrome da interface. Os quatro menus seguem um padrão só, decidido por `LayersCore.menuStep` (puro) e aplicado por `menuGo`: hover abre (0 ms), saída fecha após 260 ms, clique fixa, `pointerdown` fora (captura), Esc, foco saindo e item de ação fecham; um menu aberto por vez (`menu`, `menuPin`). Os dropdowns de valor (`cbOpen`) abrem por clique e fecham no blur ou no Esc. |
```

- [ ] **Step 3: Changelog fragment**

Create `changelog.d/feature-261014-0-s3-2-menu-open-pattern.md`:

```md
---
adr: none
---

### Changed
- Padrão único de abertura de menus: Projetos, Aparência, Interagir e Ações abrem no hover e fixam no clique (Projetos e Ações só abriam por clique). Clique fora, Esc, foco saindo e item de ação fecham; um menu aberto por vez; toque abre fixado; arrastar o palco com o botão pressionado não abre menu. `LayersCore.menuStep` (puro, testado) decide; tempos em `LayersCore.MENU_TIMING` (0 ms para abrir, 260 ms de tolerância ao sair).
- Um menu fixado não troca por hover em outro gatilho (antes, passar o mouse em Interagir com a Aparência fixada trocava de menu e soltava a fixação).
- Esc fecha primeiro o dropdown de valor aberto, depois o menu, e devolve o foco ao gatilho: o anel `:focus-visible` do gatilho aparece depois do Esc pelo teclado (mudança intencional de acessibilidade). Com o foco num `<input>` dentro do menu (o controle de Fonte), Esc segue sem efeito, como hoje.

### Added
- `e2e/menu-open.spec.js`: hover, fixar, clique fora, teclado, foco saindo, aninhado, redimensionar, arrasto e toque nos quatro menus.
- `e2e/menu-visual.spec.js`: gate manual (`LAYERS_VISUAL=1`) que compara pixel a pixel os quatro menus abertos (clique e hover) e fechados com a captura de antes da mudança; as capturas ficam locais e não entram no repositório.

### Perf
- estimated — uma chamada de `menuStep` por entrada, saída ou clique nos quatro gatilhos e um `contains()` por `pointerdown` só com menu aberto; nada no caminho de câmera, scan ou render dos planos.
```

- [ ] **Step 4: Verify and commit**

Run: `npm test` — Expected: PASS.
Run: `git diff --stat docs/RELEASE-CHECKLIST.md` — Expected: 1 insertion, 1 deletion (line 8 untouched).
Run: `rm -r e2e/menu-visual.spec.js-snapshots && git status --short e2e/` — Expected: no `??` entry (local baselines removed after Task 5 Step 9 recorded the 0 px result; `[!DECISION] visual-baselines` B).

```bash
git add docs/RELEASE-CHECKLIST.md docs/ARCHITECTURE.md changelog.d/feature-261014-0-s3-2-menu-open-pattern.md
git commit -m "docs: close S3.2 with changelog fragment, checklist and architecture note (S3.2 Task 7)"
```

---

## Self-Review

| Requirement | Task |
|---|---|
| Inventory of every menu with lines and current behavior | Context table |
| Single behavior spec (delay, grace, pin, outside, Escape, keyboard, touch, nested, drag) | Design § Behavior spec |
| Implemented once: pure reducer + one adapter | 3, 5 |
| Vitest for pure logic | 3 |
| Playwright for behavior | 4, 5 |
| Screenshots prove no visual change (baseline before code, 0 px recorded for the report) | 2, 5 Steps 8-9 |
| No external requests | 5 Step 10 (human) |
| Anchors with match counts | 5 Steps 1-7 |
| Changelog fragment with `### Perf` | 7 |
| Checklist counter line 8 untouched | Global Constraints, 7 |
| index.html regions for S4.6/S5.7 | File Structure § regions |
| S3.4 constraint | File Structure § Constraint on S3.4 |

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1. Tracker row + rebuild | gen | Mechanical | Executor | one cell edit given verbatim + a command; caller validates `git diff --stat` (2 files) and `exit_code` |
| 2. Visual baseline spec and generation | gen | Standard | Workhorse | test authoring; determinism judgment (clip fallback) |
| 3. `menuStep` + Vitest | gen | Standard | Workhorse | code and truth table given verbatim; gated by the per-task review below |
| 4. Behavior e2e | gen | Standard | Workhorse | test authoring |
| 5. `index.html` wiring | gen | Standard | Workhorse | multi-anchor edit of a large single file; behavior judgment on failures |
| 3, 5. Design review of the reducer and its wiring (touch/blur/capture races, one-open invariant, visual freeze) | review | Architectural | Architect | rule 5: every menu of the app changes behavior; via `adversarial-reviewer`, after Task 5 and before Task 6 |
| 6. Regression run and summary | gen | Mechanical | Executor | run-and-summarize with the verbatim lock block (no judgment: busy port or stale lock print `COULD NOT RUN`); caller validates format, `exit_code`, spec count; failures analyzed at Workhorse |
| 7. Docs and changelog | gen | Mechanical | Executor | text given verbatim; caller validates the 1-line checklist diff, line 8 unchanged, `npm test` `exit_code` |
| Pre-merge review | review | Architectural | Architect | verifier ≥ generator, via `adversarial-reviewer` |

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — one checklist C item on an already tracked roadmap row (S3.2), product decision recorded in this plan, a PR as the review surface; same handling as S2.15 and S4.5.

> [!DECISION] phase-intake
> Classification: **meso** `S3.2` under **S3 Ferramentas e UI**, target **Unreleased** (v1 gate: checklist C).
> Current tree (relevant slice): S3 Ferramentas e UI (in-progress) › S3.1 done › S3.2 Padrão único de abertura de menus (registered → in-progress by Task 1) › S3.3 Tooltips, S3.4 Fonte única de aparência (registered).
> Fork of an existing row? **No** (row S3.2 already tracked; no new leaf).
> - **Option A**: keep S3.2 as is (recommended)
> - **Option B**: split comboboxes into a new leaf if `[!DECISION] combobox-scope` picks B

> [!DECISION] execution
> Method: **Subagent-driven** (recommended), strictly sequential: 1 → 2 → 3 → 4 → 5 → review → 6 → 7. Task 2 must run before any `index.html` or `lib/` edit (baseline); Task 4 needs Task 3's names only for its comment and stays red until Task 5. Mechanical rows (1, 6, 7) go to the `executor` subagent.
