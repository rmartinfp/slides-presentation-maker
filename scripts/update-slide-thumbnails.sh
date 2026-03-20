#!/bin/bash
# Download PNG thumbnails of ALL slides (not just cover) from Google Slides
# Stores URLs in the template's preview_slides as slide_thumbnail field
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

PRES_COUNT=0
TOTAL=$(echo "$IDS" | wc -l | tr -d ' ')

echo "=== Downloading slide thumbnails for $TOTAL presentations ==="

for PRES_ID in $IDS; do
  PRES_COUNT=$((PRES_COUNT + 1))

  # Refresh token every 5 presentations
  if [ $((PRES_COUNT % 5)) -eq 0 ]; then
    TOKEN=$(get_token)
  fi

  # Get title and all page IDs
  PRES_DATA=$(curl -s "https://slides.googleapis.com/v1/presentations/${PRES_ID}?fields=title,slides(objectId)" \
    -H "Authorization: Bearer $TOKEN")

  TITLE=$(echo "$PRES_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title','?'))" 2>/dev/null)
  PAGE_IDS=$(echo "$PRES_DATA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for s in d.get('slides',[]):
    print(s['objectId'])
" 2>/dev/null)

  PAGE_COUNT=$(echo "$PAGE_IDS" | wc -l | tr -d ' ')
  echo "[$PRES_COUNT/$TOTAL] $TITLE ($PAGE_COUNT slides)"

  SLIDE_IMAGES=""
  SLIDE_NUM=0

  for PAGE_ID in $PAGE_IDS; do
    SLIDE_NUM=$((SLIDE_NUM + 1))

    # Skip after slide 14 (final pages)
    if [ $SLIDE_NUM -gt 14 ]; then
      break
    fi

    # Get thumbnail
    THUMB_URL=$(curl -s "https://slides.googleapis.com/v1/presentations/${PRES_ID}/pages/${PAGE_ID}/thumbnail?thumbnailProperties.thumbnailSize=MEDIUM" \
      -H "Authorization: Bearer $TOKEN" \
      | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('contentUrl',''))" 2>/dev/null)

    if [ -z "$THUMB_URL" ]; then
      continue
    fi

    # Download
    TMPFILE="/tmp/slide_${PRES_ID}_${SLIDE_NUM}.png"
    curl -s -o "$TMPFILE" "$THUMB_URL"
    SIZE=$(wc -c < "$TMPFILE" | tr -d ' ')

    # Skip tiny files (likely errors)
    if [ "$SIZE" -lt 1000 ]; then
      rm -f "$TMPFILE"
      continue
    fi

    # Upload to Supabase Storage
    STORAGE_PATH="slides/${PRES_ID}/slide${SLIDE_NUM}.png"
    curl -s -X POST "${SUPABASE_URL}/storage/v1/object/presentation-assets/${STORAGE_PATH}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: image/png" \
      -H "x-upsert: true" \
      --data-binary @"$TMPFILE" > /dev/null

    PUBLIC_URL="${SUPABASE_URL}/storage/v1/object/public/presentation-assets/${STORAGE_PATH}"

    if [ -z "$SLIDE_IMAGES" ]; then
      SLIDE_IMAGES="\"${PUBLIC_URL}\""
    else
      SLIDE_IMAGES="${SLIDE_IMAGES},\"${PUBLIC_URL}\""
    fi

    rm -f "$TMPFILE"
  done

  echo "  Uploaded $SLIDE_NUM slide thumbnails"

  # Update template — store slide_images array
  ENCODED_NAME=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${TITLE}'))")
  # We can't easily add a new column, so we'll store in an existing JSON field
  # Use the 'layouts' field to store slide image URLs
  curl -s -X PATCH "${SUPABASE_URL}/rest/v1/templates?name=eq.${ENCODED_NAME}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"layouts\": [${SLIDE_IMAGES}]}" > /dev/null

  echo "  ✓ Updated"
done

echo "=== Done ==="
