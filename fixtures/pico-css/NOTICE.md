# Pico CSS Fixture — Provenance & Licensing

## Provenance

This fixture combines two independently versioned repositories from Pico CSS:

1. **Demo HTML** — picocss/examples (commit `fb8bc72839f3b0f3c0eb0075978c7779ca124f4e`)
   - Path: `v2-html/index.html`
   - Role: Pure HTML structure showcasing Pico CSS components
   - Size: 16468 bytes

2. **CSS Framework** — picocss/pico (commit `1039a4788d6abc368d5485ae6bac84a8f0e3096f`)
   - Path: `css/pico.min.css`
   - Role: Minified classless CSS framework
   - Size: 83319 bytes

Both repositories are independently released and separately pinned to ensure fidelity and provide a foundation for CSS fixture composition (see `docs/layers-json.md` § 2: "decompose, don't flatten").

## Licensing

Both components are MIT-licensed:
- `LICENSE` — copied from picocss/pico (commit `1039a4788d6abc368d5485ae6bac84a8f0e3096f`)
- See individual repository URLs for full license text

## CDN Rewrite (Documented Edit)

The fetched `index.html` originally referenced the CSS via CDN:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2.1.1/css/pico.min.css">
```

This has been rewritten to a local vendor path:
```html
<link rel="stylesheet" href="css/pico.min.css">
```

**Rationale:** Enforce zero-network-request policy (see project CLAUDE.md § Recursos sem rede). The rewrite uses byte-identical CSS from the same upstream version, so no visual or functional change is introduced — only the delivery mechanism (local vendor vs. CDN).

**Scope:** This is the only direct edit made to vendored mock content. External JS files (`js/minimal-theme-switcher.js`, `js/modal.js`) remain referenced but are stripped by the Layers loader during shadow-DOM injection, so no action is needed there.
