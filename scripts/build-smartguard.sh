#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SMARTGUARD_DIR="$PROJECT_ROOT/services/smartguard"
OUTPUT_DIR="$PROJECT_ROOT/dist/smartguard"

echo "=== Smartguard Build ==="

mkdir -p "$OUTPUT_DIR"

echo "Building TypeScript..."
cd "$SMARTGUARD_DIR"
npm run build

echo "Creating smartguard.exe (Windows executable)..."
npx pkg \
  --targets node20-win-x64 \
  --output "$OUTPUT_DIR/smartguard.exe" \
  "$SMARTGUARD_DIR/dist/src/index.js"

echo "Creating smartguard.dng (deployment package)..."
tar -czf "$OUTPUT_DIR/smartguard.dng" \
  -C "$SMARTGUARD_DIR/dist" \
  --transform 's|^|smartguard/|' \
  src/

echo "=== Build Complete ==="
echo "Outputs:"
ls -lh "$OUTPUT_DIR/"