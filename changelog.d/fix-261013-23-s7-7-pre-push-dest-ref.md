### Fixed
- `.githooks/pre-push` now refuses pushes by destination ref (read from stdin) instead of the checked-out branch: `git push origin HEAD:develop` from a feature branch is blocked, and deleting a remote feature branch while `develop` is checked out is no longer refused. Covered by `test/pre-push.test.js`.

### Perf
- N/A — git hook only, no runtime change.
