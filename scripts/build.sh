#!/usr/bin/env bash

# exit if any of command has failed
set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"

cd "$DIR/.."

npx tsc
