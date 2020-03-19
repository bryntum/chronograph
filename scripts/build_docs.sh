#!/usr/bin/env bash

# exit if any of command has failed
set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"

cd "$DIR/.."

rm -rf "docs"

npx typedoc --readme "docs_src/README.md" --includes 'src/guides' --out docs --exclude 'tests/**/*' --exclude 'documentation/**/*' --exclude 'main.ts' --exclude 'src/lab/**/*' --excludeNotDocumented --listInvalidSymbolLinks --theme node_modules/typedoc-default-themes/bin/default/

cp -f "docs_src/README.md" "README.md"

sed -i -e 's!\[\[BasicFeaturesGuide[|]Basic features\]\]![Basic features](https://bryntum.github.io/chronograph/docs/modules/_guides_basicfeatures_.html#basicfeaturesguide)!' "README.md"
sed -i -e 's!\[\[AdvancedFeaturesGuide[|]Advanced features\]\]![Advanced features](https://bryntum.github.io/chronograph/docs/modules/_guides_advancedfeatures_.html#advancedfeaturesguide)!' "README.md"
sed -i -e 's!\[API docs\][(]\./globals.html[)]![API docs](https://bryntum.github.io/chronograph/docs/)!' "README.md"
sed -i -e 's!\[\[BenchmarksGuide[|]Benchmarks\]\]![Benchmarks](https://bryntum.github.io/chronograph/docs/modules/_guides_benchmarks_.html#benchmarksguide)!' "README.md"
