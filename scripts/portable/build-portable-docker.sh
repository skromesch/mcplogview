#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

mkdir -p "${ROOT_DIR}/dist/portable"

docker run --rm \
  --platform linux/arm64 \
  -v "${ROOT_DIR}:/src:ro" \
  -v "${ROOT_DIR}/dist/portable:/out" \
  node:22-bookworm \
  bash -lc '
    set -euo pipefail
    rm -rf /work
    mkdir -p /work
    tar -C /src --exclude=node_modules --exclude=dist -cf - . | tar -C /work -xf -
    cd /work
    npm ci
    npm run build
    npm run portable:build
    npm run portable:checksums
    cp -a dist/portable/. /out/
  '

echo "Raspberry-compatible artifacts are in: ${ROOT_DIR}/dist/portable"
