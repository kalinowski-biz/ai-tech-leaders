#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(git rev-parse --show-toplevel)"
"$ROOT/node_modules/.bin/tsc" -p tsconfig.json
"$(ls -d "$ROOT"/node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild | sort -V | tail -1)" src/main.ts --bundle --format=iife --target=es2022 --outfile=dist/app.js
