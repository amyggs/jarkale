#!/usr/bin/env bash
# Järkäle tracking – regressiotestit. Käyttö: tests/run.sh [testi.js ...]
# Vaatii: node, playwright (npm i playwright) ja Chromium. CHROMIUM_PATH ohittaa selaimen polun.
# Pilottitesti (test-news.js) tarvitsee jarkale-pilotti-repon sisarkansioksi (../jarkale-pilotti).
set -u
# Testit luovat päivämääriä toISOString():lla (UTC). Ajetaan UTC-ajassa, ettei puolenyön ja kolmen välillä (Suomen aikaa) tule vääriä hälytyksiä.
export TZ=UTC
cd "$(dirname "$0")/.."
ROOT=$(pwd); TMP=$(mktemp -d); trap 'kill $P1 $P2 2>/dev/null; rm -rf "$TMP"' EXIT
mkdir -p "$TMP/new/jarkale-pilotti" "$TMP/old"
cp index.html sw.js manifest.webmanifest *.png "$TMP/new/"; cp -r fonts "$TMP/new/fonts"
[ -f ../jarkale-pilotti/index.html ] && cp ../jarkale-pilotti/index.html "$TMP/new/jarkale-pilotti/index.html"
# Vertailuversio (v2.9.3) PT-viennin taaksepäinyhteensopivuustestiin (test-r1.js)
git show 46c3ab1:index.html > "$TMP/old/index.html"
(cd "$TMP/new" && exec python3 -m http.server 8765 >/dev/null 2>&1) & P1=$!
(cd "$TMP/old" && exec python3 -m http.server 8766 >/dev/null 2>&1) & P2=$!
sleep 1
TESTS=("$@"); [ ${#TESTS[@]} -eq 0 ] && TESTS=(test-gym.js test-sync.js test-r1.js test-delete.js test-haptics.js test-news.js test-exmeta.js test-safety.js test-fonts.js)
FAIL=0
for t in "${TESTS[@]}"; do
  if [ "$t" = test-news.js ] && [ ! -f "$TMP/new/jarkale-pilotti/index.html" ]; then echo "$t: ohitettu (ei ../jarkale-pilotti)"; continue; fi
  OUT=$(node "tests/$t" 2>&1); [ -n "${DEBUG:-}" ] && echo "$OUT" | tail -15; RES=$(echo "$OUT" | grep -E "läpi$" | tail -1)
  echo "$t: ${RES:-KAATUI}"; echo "$OUT" | grep "✗"
  echo "$OUT" | grep -q "✗" || [ -z "$RES" ] && FAIL=1
done
exit $FAIL
