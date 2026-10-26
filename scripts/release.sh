#!/usr/bin/env bash
# Järkäle – julkaisun tarkistus ja pilotin rakennus.
#
# Käyttö (repon juuresta):
#   scripts/release.sh                 tarkista, rakenna pilotti, aja testit
#   scripts/release.sh --no-tests      ilman testejä (vain nopea tarkistus)
#   scripts/release.sh --commit "viesti"   lisäksi commit + push molempiin repoihin
#
# Edellyttää: pilotti sisarkansiona ../jarkale-pilotti, node, python3, playwright (testit).
# Ennen ajoa: alatunnisteen versio nostettu ja CHANGELOG-kohta lisätty (ja tarvittaessa PILOT_CHANGELOG).
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd); PILOT="$ROOT/../jarkale-pilotti"
RUN_TESTS=1; COMMIT_MSG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --no-tests) RUN_TESTS=0 ;;
    --commit) shift; COMMIT_MSG="${1:-}"; [ -n "$COMMIT_MSG" ] || { echo "✗ --commit tarvitsee viestin"; exit 1; } ;;
    *) echo "✗ tuntematon valinta: $1"; exit 1 ;;
  esac; shift
done
ok(){ echo "  ✓ $*"; }; die(){ echo "  ✗ $*"; exit 1; }
[ -f "$PILOT/index.html" ] || die "pilottirepoa ei löydy: $PILOT"

echo "Versio"
FOOT=$(grep -oE 'Järkäle tracking v[0-9]+\.[0-9]+\.[0-9]+</span>' index.html | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
CL=$(grep -A1 -m1 'const CHANGELOG=\[' index.html | grep -oE 'v:"[0-9.]+"' | grep -oE '[0-9.]+')
[ -n "$FOOT" ] || die "alatunnisteen versiota ei löydy"
[ "$FOOT" = "$CL" ] || die "alatunniste v$FOOT ≠ CHANGELOG v$CL"
HEADFOOT=$(git show HEAD:index.html 2>/dev/null | grep -oE 'Järkäle tracking v[0-9.]+</span>' | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || true)
[ "$FOOT" != "$HEADFOOT" ] || die "versio v$FOOT on sama kuin edellisessä commitissa – nosta alatunniste ja lisää CHANGELOG-kohta"
ok "v$FOOT (edellinen v${HEADFOOT:-?})"

# Välimuistin nosto: jos CACHE on sama kuin edellisessä commitissa, nostetaan yhdellä.
bump_cache(){ # $1 = repon polku
  local dir="$1" cur prev pre n
  cur=$(grep -oE "const CACHE='[a-z-]+v[0-9]+'" "$dir/sw.js" | grep -oE "'[^']+'" | tr -d "'")
  prev=$(git -C "$dir" show HEAD:sw.js 2>/dev/null | grep -oE "const CACHE='[a-z-]+v[0-9]+'" | grep -oE "'[^']+'" | tr -d "'" || true)
  if [ "$cur" = "$prev" ]; then
    pre=${cur%v*}v; n=${cur##*v}; n=$((n+1))
    sed -i "s/const CACHE='$cur'/const CACHE='$pre$n'/" "$dir/sw.js"
    ok "$(basename "$dir"): välimuisti $cur → $pre$n"
  else
    ok "$(basename "$dir"): välimuisti jo nostettu ($prev → $cur)"
  fi
}
echo "Välimuisti"
bump_cache "$ROOT"

echo "JS-syntaksi"
TMPJS=$(mktemp --suffix=.js); trap 'rm -f "$TMPJS"' EXIT
python3 - "$ROOT/index.html" "$TMPJS" <<'EOF'
import re,sys
s=open(sys.argv[1],encoding='utf-8').read()
bl=re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>',s,re.S)
open(sys.argv[2],'w',encoding='utf-8').write('\n;\n'.join(bl))
EOF
node --check "$TMPJS" && ok "index.html (node --check)"
node --check sw.js && ok "sw.js"

echo "Pilotti"
sed "s/Järkäle tracking v$FOOT<\/span>/Pilotti v$FOOT<\/span>/" index.html > "$PILOT/index.html"
grep -q "Pilotti v$FOOT</span>" "$PILOT/index.html" || die "pilotin alatunnisteen vaihto epäonnistui"
NDIFF=$(diff index.html "$PILOT/index.html" | grep -c '^<' || true)
[ "$NDIFF" = 1 ] || die "pilotti eroaa päähaarasta $NDIFF rivillä (pitäisi olla 1: alatunniste)"
ok "index.html = pääversio + alatunniste \"Pilotti v$FOOT\""
for f in tietosuoja.html manifest.webmanifest; do cmp -s "$f" "$PILOT/$f" || { cp "$f" "$PILOT/$f"; ok "$f kopioitu pilottiin"; }; done
bump_cache "$PILOT"

if [ $RUN_TESTS = 1 ]; then
  echo "Testit"
  command -v fuser >/dev/null && fuser -k 8765/tcp 8766/tcp >/dev/null 2>&1 || true
  if tests/run.sh; then ok "kaikki testit läpi"; else die "testejä epäonnistui – ei julkaista"; fi
fi

if [ -n "$COMMIT_MSG" ]; then
  echo "Julkaisu"
  for d in "$PILOT" "$ROOT"; do
    git -C "$d" add -A && git -C "$d" commit -qm "$COMMIT_MSG" && git -C "$d" push -q
    ok "$(basename "$d"): $(git -C "$d" log --oneline -1)"
  done
else
  echo; echo "Valmis julkaistavaksi. Commit + push: scripts/release.sh --commit \"v$FOOT: …\""
fi
