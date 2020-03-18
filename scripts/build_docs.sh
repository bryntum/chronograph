#!/usr/bin/env bash

# exit if any of command has failed
set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"

cd "$DIR/.."

npx typedoc --includes 'src/guides' --out docs --exclude 'tests/**/*' --exclude 'documentation/**/*' --exclude 'main.ts' --exclude 'src/lab/**/*' --excludeNotDocumented --listInvalidSymbolLinks --theme node_modules/typedoc-default-themes/bin/default/
