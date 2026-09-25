### Added
- Boot parameter `?project=<absolute folder>`: the dev server serves that folder raw and same-origin under `/@project/<encoded folder>/` (only when it has `layers.json`; traversal refused; explicit 404; `Cache-Control: no-cache`), and the loader reads it through the existing read-only fixture origin. Atlas' project header button starts Layers and opens this URL (Atlas S5.6d).

### Perf
- N/A — one extra connect middleware checked by URL prefix and a URLSearchParams parse at boot; no render-path change.
