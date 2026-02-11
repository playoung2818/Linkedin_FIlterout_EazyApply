#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DATA_DIR="$(cd "$ROOT_DIR/../../data" && pwd)"
SEED_DIR="$ROOT_DIR/seed"

mkdir -p "$SEED_DIR"
cp "$PROJECT_DATA_DIR/base_profile.json" "$SEED_DIR/base_profile.json"
cp "$PROJECT_DATA_DIR/base_resume.json" "$SEED_DIR/base_resume.json"

echo "Synced seed/base_profile.json and seed/base_resume.json from project data/."
