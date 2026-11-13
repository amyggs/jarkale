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
for f in tietosuoja.html manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png; do cmp -s "$f" "$PILOT/$f" || { cp "$f" "$PILOT/$f"; ok "$f kopioitu pilottiin"; }; done
bump_cache "$PILOT"

# v2.18.156: omat domainit. app.jarkale.com = pilottiversio (repo jarkale-app), oma.jarkale.com = oma versio (repo jarkale-oma).
# Rakennetaan vain, jos repot ovat sisarkansioina. Kumpikin saa oman sw.js:n (oma välimuistin etuliite) ja CNAME-tiedoston.
APP="$ROOT/../jarkale-app"; OMA="$ROOT/../jarkale-oma"; EXTRA=()
sync_site(){ # $1 = kohde, $2 = lähde (index.html:n repo), $3 = domain, $4 = välimuistin etuliite
  local dst="$1" src="$2" dom="$3" pre="$4" f
  [ -d "$dst/.git" ] || return 0
  cp "$src/index.html" "$dst/index.html"
  for f in tietosuoja.html manifest.webmanifest icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png; do cp "$ROOT/$f" "$dst/$f"; done
  mkdir -p "$dst/fonts"; cp "$ROOT"/fonts/* "$dst/fonts/"
  echo "$dom" > "$dst/CNAME"
  if [ ! -f "$dst/sw.js" ]; then sed -E "s/const CACHE='[a-z-]+v[0-9]+';const PREFIX='[a-z-]+v'/const CACHE='${pre}1';const PREFIX='${pre}'/" "$ROOT/sw.js" > "$dst/sw.js"
  else local body; body=$(sed -E "1s/.*//" "$ROOT/sw.js"); { head -1 "$dst/sw.js"; echo "$body" | tail -n +2; } > "$dst/sw.js.new" && mv "$dst/sw.js.new" "$dst/sw.js"; fi
  grep -q "PREFIX='${pre}'" "$dst/sw.js" || die "$(basename "$dst"): sw.js:n etuliite ei ole ${pre}"
  bump_cache "$dst"; EXTRA+=("$dst"); ok "$(basename "$dst") → $dom"
}
echo "Omat domainit"
sync_site "$APP" "$PILOT" "app.jarkale.com" "jarkale-app-v"
# v2.18.160: julkinen app.jarkale.com ei ole "pilotti" käyttäjälle → alatunniste "Järkäle vX"
if [ -d "$APP/.git" ]; then sed -i "s/Pilotti v$FOOT<\/span>/Järkäle v$FOOT<\/span>/" "$APP/index.html"; grep -q "Järkäle v$FOOT</span>" "$APP/index.html" || die "app: alatunnisteen vaihto epäonnistui"; fi
sync_site "$OMA" "$ROOT" "oma.jarkale.com" "jarkale-oma-v"
[ ${#EXTRA[@]} -gt 0 ] || ok "ei domain-repoja sisarkansioina"
# jarkale.com = esittelysivu (pilotin esittely.html → index.html) ja tietosuojaseloste (repo jarkale-site).
SITE="$ROOT/../jarkale-site"
if [ -d "$SITE/.git" ]; then
  # jarkale.com: linkit uuteen osoitteeseen, ei pilottimerkintää (pilotin oma esittely pitää vanhat linkit siirtoon asti)
  sed -e 's#https://amyggs.github.io/jarkale-pilotti/#https://app.jarkale.com/#g' -e 's#nimenä näkyy amyggs.github.io#nimenä näkyy app.jarkale.com#' \
      -e 's#<span>Pilotti 2.18 · 2026</span>#<span>Treenipäiväkirja · 2026</span>#' "$PILOT/esittely.html" > "$SITE/index.html"
  ! grep -q "amyggs.github.io\|Pilotti 2" "$SITE/index.html" || die "jarkale.com: vanha osoite tai pilottimerkintä jäi esittelyyn"
  for f in tietosuoja.html icon-192.png icon-512.png apple-touch-icon.png; do cp "$ROOT/$f" "$SITE/$f"; done
  rm -rf "$SITE/kuvat"; cp -r "$PILOT/kuvat" "$SITE/kuvat"
  mkdir -p "$SITE/fonts"; cp "$ROOT"/fonts/manrope-* "$ROOT"/fonts/LICENSE-manrope.txt "$SITE/fonts/"
  echo "jarkale.com" > "$SITE/CNAME"
  EXTRA+=("$SITE"); ok "jarkale-site → jarkale.com"
fi

if [ $RUN_TESTS = 1 ]; then
  echo "Testit"
  command -v fuser >/dev/null && fuser -k 8765/tcp 8766/tcp >/dev/null 2>&1 || true
  if tests/run.sh; then ok "kaikki testit läpi"; else die "testejä epäonnistui – ei julkaista"; fi
fi

if [ -n "$COMMIT_MSG" ]; then
  echo "Julkaisu"
  for d in "$PILOT" "${EXTRA[@]}" "$ROOT"; do
    git -C "$d" add -A
    if git -C "$d" diff --cached --quiet; then ok "$(basename "$d"): ei muutoksia"; continue; fi
    git -C "$d" commit -qm "$COMMIT_MSG" && git -C "$d" push -q
    ok "$(basename "$d"): $(git -C "$d" log --oneline -1)"
  done
else
  echo; echo "Valmis julkaistavaksi. Commit + push: scripts/release.sh --commit \"v$FOOT: …\""
fi
