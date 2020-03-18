#!/usr/bin/env bash

# exit if any of command has failed
set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"

#node "$DIR/has_changes.js" || echo ">>Repository has changes, aborting making distribution" && false

DIST="$DIR/../dist"

rm -rf "$DIST"

git worktree prune

git worktree add "$DIST" --no-checkout --detach

(
cd "$DIST"

git checkout HEAD

rm -rf "$DIST/.git" "$DIST/benchmarks"

ln -s "$DIR/../node_modules" "node_modules"
)

