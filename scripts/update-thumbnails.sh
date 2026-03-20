#!/bin/bash
# Download cover slide thumbnails from Google Slides and upload to Supabase Storage
set -e

REFRESH_TOKEN="${GOOGLE_REFRESH_TOKEN:-$(cat /tmp/google_refresh_token_drive.txt 2>/dev/null)}"
SUPABASE_URL="https://okzaoakyasaohohktntd.supabase.co"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY}"

get_token() {
  curl -s -X POST "https://oauth2.googleapis.com/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${REFRESH_TOKEN}&grant_type=refresh_token" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])"
}

TOKEN=$(get_token)

# Presentation IDs
IDS="1zrAvd3bySGZgJtonBV7D0KfojiDl69CHrQhz7Tttuws
1Dcq-I5p5sCjwakxB2vgaj7ZBEEi0mvkE6dXNrdbOTWM
14b37y3anR0S9PJSiwDpu0EBi1HDsLTxu0bIx1TijrpA
18dnwN11knzOJKFF0EB9XGaeqBBwwLovhT98pFlOCh9s
13lzQybWl3lZmDHkjePF1OEUs8RgwaA20iwolqpBlVB8
1JBmJ6NgyhJTww11mDey3E0cfekEc1hr2taiM_jNEDnw
11bajy79bQCK9DdH-uPIeSo8apadjdCudJGezAtFc9h4
1goALIpg2Q10uFfdnHjjvYvEBX1Q5TOyeaUiQUfZLCyo
1NiBkPwDFNULbPyWKd5eLeB7_hM-rP7vwOyf3glLM7V0
1fHoDEGCSOZBeImCeMeaKBHSBQTQ2Pin18TEci9dN8RA
1EBwzJWx2e36MHMEy22bOtAMkhozui0i0YXJiqGdE1h8
1G23Mm2kNNZ1WJ2gHeBtNk4OsVipOvj988_dTETc13to
1nuVVCHqZyM_U_U-HO0LZsGqg--MP16KGb-cW8ZaMbOs
1sDlaMHLp8sqS-uDx3AhA6sVWfIenOy-hB2GSPBa4h5E
1hHMWV4sMCX_3_mKrTHlgwRd8tF2S_ffzfaVmA696ep8"

COUNT=0
TOTAL=$(echo "$IDS" | wc -l | tr -d ' ')

echo "=== Updating thumbnails for $TOTAL templates ==="

for PRES_ID in $IDS; do
  COUNT=$((COUNT + 1))

  # Get title
  TITLE=$(curl -s "https://slides.googleapis.com/v1/presentations/${PRES_ID}?fields=title" \
    -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('title','?'))" 2>/dev/null)

  echo "[$COUNT/$TOTAL] $TITLE"

  # Get first page ID
  FIRST_PAGE=$(curl -s "https://slides.googleapis.com/v1/presentations/${PRES_ID}?fields=slides(objectId)" \
    -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['slides'][0]['objectId'])" 2>/dev/null)

  if [ -z "$FIRST_PAGE" ]; then
    echo "  ✗ Failed to get page ID"; continue
  fi

  # Get thumbnail URL (LARGE = 1600px wide)
  THUMB_URL=$(curl -s "https://slides.googleapis.com/v1/presentations/${PRES_ID}/pages/${FIRST_PAGE}/thumbnail?thumbnailProperties.thumbnailSize=LARGE" \
    -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('contentUrl',''))" 2>/dev/null)

  if [ -z "$THUMB_URL" ]; then
    echo "  ✗ Failed to get thumbnail"; continue
  fi

  # Download
  TMPFILE="/tmp/thumb_${PRES_ID}.png"
  curl -s -o "$TMPFILE" "$THUMB_URL"
  SIZE=$(wc -c < "$TMPFILE" | tr -d ' ')
  echo "  Downloaded: ${SIZE} bytes"

  # Upload to Supabase Storage
  STORAGE_PATH="covers/${PRES_ID}.png"
  curl -s -X POST "${SUPABASE_URL}/storage/v1/object/presentation-assets/${STORAGE_PATH}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: image/png" \
    -H "x-upsert: true" \
    --data-binary @"$TMPFILE" > /dev/null

  PUBLIC_URL="${SUPABASE_URL}/storage/v1/object/public/presentation-assets/${STORAGE_PATH}"

  # Update template in DB — match by name
  ENCODED_NAME=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${TITLE}'))")
  curl -s -X PATCH "${SUPABASE_URL}/rest/v1/templates?name=eq.${ENCODED_NAME}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"thumbnail_url\": \"${PUBLIC_URL}\"}" > /dev/null

  echo "  ✓ Updated"
  rm -f "$TMPFILE"
done

echo "=== Done ==="
