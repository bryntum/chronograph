#!/usr/bin/env bash

# exit if any of command has failed
set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"

#node "$DIR/has_changes.js"

DIST="$DIR/../dist"

make_dist.sh

cd $DIST

# prepare the dist
scripts/build.sh

# run suite in node
npx siesta ./tests


# publish
scripts/build_docs.sh

if [[ -z "$V" ]]; then
    V="patch"
fi

npm version $V
