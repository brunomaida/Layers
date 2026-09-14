Source: https://github.com/ADi7YA26/Student-Dashboard
Commit: b4e96624acf001acf5f8a50262893b4440213a60
License: MIT (see LICENSE in this folder)

Icon-font note: `layers.json`'s `fonts` lists `"Material Icons Sharp"`, `"Cairo"`, `"Poppins"` (all
found via the vendored `<link>`/`@import` font-service references), but none ship in this repo's
`fonts/` catalog. Per contract this is a non-blocking warning + fallback, never a fetch — the
visible effect is heading/body text falls back to the system sans-serif stack, and the icon
elements render their literal Material Icons ligature names as text instead of glyphs.

Vendored for: Layers loader fixture (.html slot) — see plan at
C:\Users\bruno\.claude\plans\com-objetivo-de-melhorar-linear-hinton.md
