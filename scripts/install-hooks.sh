#!/bin/sh
# Copy the versioned git hooks into .git/hooks/. Run once after cloning:
#     bash scripts/install-hooks.sh
set -eu

root=$(git rev-parse --show-toplevel)
cd "$root"

for hook in pre-push; do
  [ -f "scripts/$hook" ] || continue
  cp "scripts/$hook" ".git/hooks/$hook"
  chmod +x ".git/hooks/$hook"
  echo "installed .git/hooks/$hook"
done
