#!/usr/bin/env bash

# exit if any of command has failed
set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"
. "$DIR"/util.sh

#if [[ $(git_repo_has_changes "$DIR/..") == 'true' ]]; then
#    echo ">>Repository has changes, aborting making distribution"
#    exit 1
#fi

DIST="$DIR/../DIST"

rm -rf "$DIST"

git worktree prune

git worktree add "$DIST" --no-checkout --detach

(
cd "$DIST"

git checkout HEAD

rm -rf "$DIST/.git" "$DIST/benchmarks" "$DIST/scripts/make_dist.sh"

ln -s "$DIR/../node_modules" "node_modules"
)

