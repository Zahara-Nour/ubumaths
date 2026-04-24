#!/bin/bash
# Incremental svelte-check that filters known pre-existing errors.
# Uses --incremental for disk cache (~20s cached, ~40s first run).
# Ignores errors in slides/demo and extern/ directories.

output=$(npx svelte-check --tsconfig ./tsconfig.json --threshold error --incremental --output machine 2>&1)

# Filter out known pre-existing errors
errors=$(echo "$output" | grep " ERROR " | grep -v "slides/demo" | grep -v "extern/")

if [ -n "$errors" ]; then
    echo "TypeScript/Svelte errors found:"
    echo "$errors" | while IFS= read -r line; do
        # Extract file:line:col and message from machine output
        file=$(echo "$line" | cut -d' ' -f3 | sed 's/"//g')
        pos=$(echo "$line" | cut -d' ' -f4 | sed 's/"//g')
        msg=$(echo "$line" | cut -d' ' -f5- | sed 's/"//g')
        echo "  $file:$pos $msg"
    done
    exit 1
else
    # Show summary line
    echo "$output" | grep "COMPLETED" | sed 's/^[0-9]* //' | sed 's/COMPLETED /✓ /'
    exit 0
fi
