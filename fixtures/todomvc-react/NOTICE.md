Source: https://github.com/tastejs/todomvc (examples/react)
Commit: ff43b02e59dfa604386bb382034b2cd07c2bcd8a
License: MIT (see LICENSE.md in this folder — "Everything in this repo is MIT License unless
otherwise specified", copyright Addy Osmani, Sindre Sorhus, Pascal Hartig, Stephen Sawchuk)

`app.css` is the built `examples/react/dist/app.css` (webpack output — real, valid, already
compiled CSS, not the SCSS-flavored raw source some projects ship). It bundles two further
packages this example imports, each under its own license:
- `todomvc-app-css` (https://github.com/tastejs/todomvc-app-css) — CC-BY-4.0
- `todomvc-common` (https://github.com/tastejs/todomvc-common) — MIT

`src/app.jsx` is vendored as read-only reference only (from `examples/react/src/todo/app.jsx`,
`export function App()` at line 10) — Layers never transpiles or executes `.jsx`; `layers.json`'s
`root.src` points here purely so the editor can show the source snippet for the root element.

`layers/mock.html` is a manual replay of the `tools/layers-snapshot.js` capture pattern against
the live demo (https://todomvc.com/examples/react/dist/): three todo items were added through the
real UI (one marked completed) so the DOM reflects genuine rendered React output, not an empty
app-shell. The TodoMVC site's own left "learn" sidebar (unrelated site chrome, not part of the
vendored app) was excluded — only the `#root` (`.todoapp`) and `footer.info` the app itself
renders were kept.

Vendored for: Layers loader fixture (.jsx slot) — see plan at
C:\Users\bruno\.claude\plans\com-objetivo-de-melhorar-linear-hinton.md
