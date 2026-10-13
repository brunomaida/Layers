### Fixed
- Project reload (#19): a superseded load that fails no longer unloads or marks a newer in-flight load as loaded (`loadedSeq` race in `loadProject`).
- `this.mtimes` is reset per `loadProject`, so the first window focus after opening another folder no longer shows a false "files changed on disk" banner.
- Dismissing the banner for a transiently missing file (atomic save = delete + rename) keeps it watched as `missing` and notices it again when it reappears (`LayersCore.dismissWatch`, with tests).
- A superseded load no longer replaces the shadow root, observer or font faces of the newer load, and `resetUI` supersedes an in-flight load.
- The banner stays clear of the tree column on narrow viewports; wide viewports are unchanged.
- Fragment `feature-260920-17-project-reload.md` now lists the two follow-up commits.

### Perf
- N/A — no render-path change; one object reset per project load and a pure helper at banner dismissal.
