#!/bin/bash

# Kill all project servers running on specific ports
# Ports: 5173 (user), 5174, 5175 (Claude), 54321 (Supabase local)

echo "🔍 Checking for running servers..."

PORTS=(5173 5174 5175 54321)
KILLED=0

for PORT in "${PORTS[@]}"; do
  PIDS=$(lsof -ti:$PORT 2>/dev/null)
  if [ -n "$PIDS" ]; then
    echo "  ⚠️  Port $PORT in use (PIDs: $PIDS)"
    kill -9 $PIDS 2>/dev/null
    KILLED=$((KILLED + 1))
  fi
done

if [ $KILLED -eq 0 ]; then
  echo "✅ No servers running (ports 5173, 5174, 5175, 54321)"
else
  echo "✅ Killed $KILLED server(s) on ports: ${PORTS[*]}"
fi
