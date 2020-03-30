#!/usr/bin/env bash

# exit if any of command has failed
set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"
DOCS="$( cd "$( dirname "$1" )" && pwd )"

if [[ -z $DOCS ]]; then
    echo ">>No path to docs given"

    exit 1
fi

DIST="$DIR/../DIST_DOCS"

rm -rf "$DIST"

git worktree prune

git worktree add "$DIST" gh-pages

cd $DIST

git pull

rm -rf "$DIST/docs"

cp -r "$DOCS" "$DIST/docs"

git commit -a -m "Doc updated" || true

git push

git worktree remove "$DIST"

echo ">>Successfully updated github pages"
