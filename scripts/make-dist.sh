#!/usr/bin/env bash

DIR="$( cd "$( dirname "$0" )" && pwd )"

DIST="$DIR/../dist"

rm -rf "$DIST"

mkdir -p "$DIST"

rsync -r "$DIR/.." "$DIST" \
  --exclude "scripts" --exclude ".git" --exclude ".idea" --exclude "dist" --exclude "benchmarks"
