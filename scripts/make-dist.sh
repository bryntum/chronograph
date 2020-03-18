#!/usr/bin/env bash

# exit if any of command has failed
set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"

node "$DIR/has_changes.js"

DIST="$DIR/../dist"

rm -rf "$DIST"

mkdir -p "$DIST"

git worktree add "$DIST" --no-checkout --detach

(
cd "$DIST"
git checkout HEAD
)
#
#rsync -r "$DIR/.." "$DIST" \
#    --exclude "scripts" --exclude ".git" --exclude ".idea" --exclude "dist" --exclude "benchmarks" --exclude "node_modules"
