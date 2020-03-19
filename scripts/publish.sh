#!/usr/bin/env bash

# exit if any of command has failed
set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"
. "$DIR"/util.sh

if [[ $(git_repo_has_changes "$DIR/..") == 'true' ]]; then
    echo ">>Repository has changes, aborting release"
    exit 1
fi

DIST="$DIR/../DIST"

"$DIR"/make_dist.sh

cd $DIST

# prepare the dist
scripts/build.sh

# run suite in node
npx siesta ./tests || echo ">>Test suite failed, aborting release" && false

# publish
scripts/build_docs.sh

if [[ -z "$V" ]]; then
    V="patch"
fi

# bump version in distribution - won't be refelected in main repo, since "make_dist" removes the ".git"
npm version $V

node -e "require(\"./scripts/changelog.js\").updateVersion()"

echo "" > .npmignore

npm publish --access public

# post-publish, update the main repo
cd "$DIR/.."

# bump version in main repo
npm version $V

node -e "require(\"./scripts/changelog.js\").updateVersionAndStartNew()"

git add CHANGELOG.md
git commit -m "Updated changelog"

git push

# the trailing dot is required
"$DIR"/publish_docs.sh "$DIST/docs/."
