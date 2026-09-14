Source: https://github.com/PlainAdmin/plain-free-bootstrap-admin-template
Commit: dcb30e2bce6c9f12e833ebb220b3cb218597f12e
License: MIT (see LICENSE in this folder) — covers PlainAdmin's own `index.html` and `main.css`.

The other 4 vendored stylesheets/fonts are third-party libraries PlainAdmin itself bundles,
each under its own upstream license (not PlainAdmin's MIT) — same "decompose, don't flatten to
one license" approach as `todomvc-react/NOTICE.md`:
- `assets/css/bootstrap.min.css` — Bootstrap v5.3.0-alpha1, MIT (banner in the file itself,
  Copyright 2011-2022 The Bootstrap Authors, https://github.com/twbs/bootstrap/blob/main/LICENSE).
- `assets/css/fullcalendar.css` — FullCalendar, no license banner in the minified file; see
  https://fullcalendar.io/license for current terms.
- `assets/css/lineicons.css` + `assets/fonts/lineicons.*` — "Lineicons Free Web Font" v4.0
  (banner in the file); see https://lineicons.com for current license terms.
- `assets/css/materialdesignicons.min.css` + `assets/fonts/materialdesignicons-webfont.*` —
  Material Design Icons v5.9.55; see https://pictogrammers.com/docs/general/license/ for current
  terms (the icon set and webfont carry their own separate license from the PlainAdmin repo's
  MIT — treat their license page as authoritative, not this note).

`index.html` references one asset that was NOT vendored and is a known broken-image in this
fixture: `./assets/images/logo/logo-icon-big.svg` (a "PlainAdmin Pro" promo card image, cosmetic
only, byte-for-byte left as upstream wrote it — not a vendoring omission worth chasing since the
whole promo card is marketing chrome unrelated to the dashboard being tested). The 9
`assets/js/*.js` files upstream `index.html` references were deliberately excluded (not omitted
by mistake) — the loader strips `<script>` tags entirely, so vendoring them would add ~200KB
nothing ever reads.

Font note: `layers.json`'s `fonts` lists `"Plus Jakarta Sans"` (found via `main.css`'s Google
Fonts `@import`, same pattern as `student-dashboard`'s commit `5b1d200`). It's not in this repo's
local font catalog, so per contract it's a non-blocking warning + fallback to the system
sans-serif stack — the icon fonts (Lineicons, Material Design Icons) don't have this issue since
they're fully vendored above, not resolved through `fonts[]`.

Vendored for: Layers loader fixture (.css slot) — only index.html + the CSS/font/image assets it
references, not the full template. See plan at
C:\Users\bruno\.claude\plans\com-objetivo-de-melhorar-linear-hinton.md
