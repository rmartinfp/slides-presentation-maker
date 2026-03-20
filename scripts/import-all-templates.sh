#!/bin/bash
# Import all templates from a Google Drive folder
# Usage: SUPABASE_SERVICE_ROLE_KEY=xxx ./scripts/import-all-templates.sh

set -e

CLIENT_ID="${GOOGLE_CLIENT_ID:?Set GOOGLE_CLIENT_ID env var}"
CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:?Set GOOGLE_CLIENT_SECRET env var}"
REFRESH_TOKEN="${GOOGLE_REFRESH_TOKEN:-$(cat /tmp/google_refresh_token_drive.txt 2>/dev/null)}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# Get fresh access token
get_token() {
  curl -s -X POST "https://oauth2.googleapis.com/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${REFRESH_TOKEN}&grant_type=refresh_token" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])"
}

# Presentation IDs from the folder
IDS=(
  "1zrAvd3bySGZgJtonBV7D0KfojiDl69CHrQhz7Tttuws"
  "1Dcq-I5p5sCjwakxB2vgaj7ZBEEi0mvkE6dXNrdbOTWM"
  "14b37y3anR0S9PJSiwDpu0EBi1HDsLTxu0bIx1TijrpA"
  "18dnwN11knzOJKFF0EB9XGaeqBBwwLovhT98pFlOCh9s"
  "13lzQybWl3lZmDHkjePF1OEUs8RgwaA20iwolqpBlVB8"
  "1JBmJ6NgyhJTww11mDey3E0cfekEc1hr2taiM_jNEDnw"
  "11bajy79bQCK9DdH-uPIeSo8apadjdCudJGezAtFc9h4"
  "1goALIpg2Q10uFfdnHjjvYvEBX1Q5TOyeaUiQUfZLCyo"
  "1NiBkPwDFNULbPyWKd5eLeB7_hM-rP7vwOyf3glLM7V0"
  "1fHoDEGCSOZBeImCeMeaKBHSBQTQ2Pin18TEci9dN8RA"
  "1EBwzJWx2e36MHMEy22bOtAMkhozui0i0YXJiqGdE1h8"
  "1G23Mm2kNNZ1WJ2gHeBtNk4OsVipOvj988_dTETc13to"
  "1nuVVCHqZyM_U_U-HO0LZsGqg--MP16KGb-cW8ZaMbOs"
  "1sDlaMHLp8sqS-uDx3AhA6sVWfIenOy-hB2GSPBa4h5E"
  "1hHMWV4sMCX_3_mKrTHlgwRd8tF2S_ffzfaVmA696ep8"
)

TOTAL=${#IDS[@]}
SUCCESS=0
FAILED=0

echo "=== Importing $TOTAL templates ==="
echo ""

for i in "${!IDS[@]}"; do
  ID="${IDS[$i]}"
  NUM=$((i + 1))

  echo "[$NUM/$TOTAL] Importing $ID..."

  # Refresh token before each import (tokens expire in 1h)
  TOKEN=$(get_token)

  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_KEY" \
  GOOGLE_ACCESS_TOKEN="$TOKEN" \
  npx tsx scripts/import-pptx-template.ts "$ID" 2>&1 | tail -5

  if [ $? -eq 0 ]; then
    SUCCESS=$((SUCCESS + 1))
    echo "  ✓ Done"
  else
    FAILED=$((FAILED + 1))
    echo "  ✗ Failed"
  fi
  echo ""
done

echo "=== Complete: $SUCCESS succeeded, $FAILED failed out of $TOTAL ==="
