Source: https://github.com/Choices-js/Choices
Commit: e132628ac74dd427a9a454caf042c65d3065d170
License: MIT (see LICENSE in this folder, copyright Josh Johnson)

`choices.min.css` is vendored from `public/assets/styles/choices.min.css` — the real minified
widget stylesheet the live demo actually serves (not `base.min.css`, which only styles the demo
page's own dark-theme chrome around the widgets, not the widget itself; that file was left out on
purpose, same as excluding unrelated site chrome from the other snapshot-based fixtures).

`layers/mock.html` is a manual replay of the `tools/layers-snapshot.js` capture pattern against
the live demo (https://choices-js.github.io/Choices/, "Single select input" section, the
"Default" example): the widget was clicked open through the real UI so the captured markup
includes the `is-open`/`is-active` dropdown state and `aria-expanded="true"` — this specifically
exercises the loader's handling of interactive, JS-materialized markup (the dropdown list only
exists in the DOM once Choices.js opens it), not just a widget's collapsed resting state.

Vendored for: Layers loader fixture (.js slot) — see plan at
C:\Users\bruno\.claude\plans\com-objetivo-de-melhorar-linear-hinton.md
