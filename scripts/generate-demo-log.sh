#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="${1:-/tmp/mcplogview-demo.log}"
INTERVAL_SECONDS="${2:-5}"

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

echo "Writing demo logs to: $LOG_FILE"
echo "Interval: ${INTERVAL_SECONDS}s"
echo "Press Ctrl+C to stop."

counter=1
while true; do
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  level="INFO"
  case $((counter % 5)) in
    0) level="WARN" ;;
    3) level="ERROR" ;;
  esac

  printf '%s [%s] demo-event id=%d source=mcplogview message="Generated log line"\n' "$ts" "$level" "$counter" >> "$LOG_FILE"
  counter=$((counter + 1))
  sleep "$INTERVAL_SECONDS"
done
