#!/bin/sh
# Point this repo at its versioned hooks. Run once after cloning:
#     bash scripts/install-hooks.sh
#
# core.hooksPath is set per repo, so .githooks/pre-push runs straight from the
# working tree. It delegates to the global hook before adding the LAYERS guards,
# so the shared changelog.d gate keeps working.
set -eu

root=$(git rev-parse --show-toplevel)
cd "$root"

chmod +x .githooks/* 2>/dev/null || true
git config core.hooksPath .githooks

echo "core.hooksPath -> $(git config --get core.hooksPath)"
echo "run 'git config --unset core.hooksPath' to fall back to the global hooks"
