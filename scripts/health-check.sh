#!/usr/bin/env bash
# Pings /api/health every run and writes outcome to a log file.
# Sends an alert email on failure (if EMAIL_TO and mail/sendmail are available).
# Designed to be run from cron every 5 minutes.

set -u

ENDPOINT="${HEALTH_URL:-https://ktoptima.com/api/health}"
LOG_FILE="${HEALTH_LOG:-/var/log/ktoptima-health.log}"
STATE_FILE="${HEALTH_STATE_FILE:-/var/log/ktoptima-health.state}"
EMAIL_TO="${HEALTH_EMAIL_TO:-}"
TIMEOUT="${HEALTH_TIMEOUT:-10}"

ts() { date -Iseconds; }

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

response=$(curl -sS --max-time "$TIMEOUT" -w "\nHTTP_STATUS:%{http_code}" "$ENDPOINT" 2>&1) || curl_exit=$?
http_status=$(echo "$response" | sed -n 's/.*HTTP_STATUS:\([0-9]*\).*/\1/p')
body=$(echo "$response" | sed '/HTTP_STATUS:/d')

ok=false
if [ "${http_status:-0}" = "200" ]; then
  ok=true
fi

if [ "$ok" = "true" ]; then
  echo "$(ts) UP status=200 body=${body//$'\n'/ }" >> "$LOG_FILE"
  prev_state=$(cat "$STATE_FILE" 2>/dev/null || echo "ok")
  if [ "$prev_state" != "ok" ] && [ -n "$EMAIL_TO" ]; then
    if command -v mail >/dev/null 2>&1; then
      printf 'ktOptima est de retour en ligne.\nHeure: %s\nEndpoint: %s\nRéponse:\n%s\n' \
        "$(ts)" "$ENDPOINT" "$body" | mail -s "[ktOptima] RECOVERED" "$EMAIL_TO" || true
    fi
  fi
  echo "ok" > "$STATE_FILE"
  exit 0
fi

echo "$(ts) DOWN status=${http_status:-0} body=${body//$'\n'/ }" >> "$LOG_FILE"
prev_state=$(cat "$STATE_FILE" 2>/dev/null || echo "ok")
if [ "$prev_state" = "ok" ] && [ -n "$EMAIL_TO" ]; then
  if command -v mail >/dev/null 2>&1; then
    printf 'ktOptima est DOWN.\nHeure: %s\nEndpoint: %s\nStatus HTTP: %s\nRéponse:\n%s\n' \
      "$(ts)" "$ENDPOINT" "${http_status:-0}" "$body" | mail -s "[ktOptima] DOWN" "$EMAIL_TO" || true
  fi
fi
echo "down" > "$STATE_FILE"
exit 1
