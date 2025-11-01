#!/bin/bash

# Check only TypeScript/Svelte files changed since last commit
# Usage: ./scripts/check-changed.sh [commit-ref]
# Usage: ./scripts/check-changed.sh --staged (check staged files only)
# Example: ./scripts/check-changed.sh HEAD~1  (check files changed in last commit)
# Example: ./scripts/check-changed.sh main    (check files changed since main branch)

set -e

# Check if --staged flag is provided
if [ "$1" = "--staged" ]; then
  echo "🔍 Finding staged TypeScript/Svelte files..."
  CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|svelte)$' | tr '\n' ' ')
else
  # Default to HEAD if no argument provided
  SINCE="${1:-HEAD}"
  echo "🔍 Finding changed TypeScript/Svelte files since $SINCE..."
  # Get list of changed files
  CHANGED_FILES=$(git diff --name-only --diff-filter=ACMR "$SINCE" | grep -E '\.(ts|tsx|svelte)$' | tr '\n' ' ')
fi

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ No TypeScript/Svelte files changed since $SINCE"
  exit 0
fi

echo "📁 Files to check:"
echo "$CHANGED_FILES" | tr ' ' '\n' | sed 's/^/  - /'

echo ""
echo "🔧 Running svelte-check on changed files..."

# Run svelte-kit sync first
pnpm svelte-kit sync

# Check only changed files
# Note: svelte-check doesn't support file list, so we use tsc for TS files
TS_FILES=$(echo "$CHANGED_FILES" | tr ' ' '\n' | grep -E '\.tsx?$' | tr '\n' ' ')
SVELTE_FILES=$(echo "$CHANGED_FILES" | tr ' ' '\n' | grep '\.svelte$' | tr '\n' ' ')

EXIT_CODE=0

if [ -n "$TS_FILES" ]; then
  echo "📘 Checking TypeScript files with tsc..."
  pnpm tsc --noEmit $TS_FILES || EXIT_CODE=$?
fi

if [ -n "$SVELTE_FILES" ]; then
  echo "🔶 Checking Svelte files..."
  # svelte-check doesn't support file list, so check all
  echo "⚠️  Note: svelte-check must check all Svelte files (no incremental mode)"
  pnpm svelte-check --tsconfig ./tsconfig.json || EXIT_CODE=$?
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All changed files passed type checking"
else
  echo "❌ Type checking failed"
  exit $EXIT_CODE
fi
