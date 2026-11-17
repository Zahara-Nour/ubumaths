#!/usr/bin/env bash
# Intègre un dessin du Shtam : original rangé, webp 1200×800 q85, ligne d'image en tête du corps.
# Usage : bash integrer.sh <slug> <image-source> "<texte alternatif>"
set -euo pipefail
slug=$1; src=$2; alt=$3
racine=$(git rev-parse --show-toplevel)
dossier="$racine/docs/Chiphres/illustrations/shtam/$slug"
article="$racine/src/lib/server/shtam/articles/$slug.md"
mkdir -p "$dossier"
ext=${src##*.}
n=1; while ls "$dossier/essai-$n-ia."* >/dev/null 2>&1; do n=$((n+1)); done
orig="$dossier/essai-$n-ia.$ext"
cp "$src" "$orig"
magick "$orig" -resize 1200x800^ -gravity center -crop 1200x800+0+0 +repage \
  -quality 85 -define webp:method=6 "$racine/static/shtam/$slug.webp"
python3 - "$article" "$slug" "$alt" <<'PY'
import sys
p, slug, alt = sys.argv[1:]
s = open(p).read()
ligne = f"![{alt}](/shtam/{slug}.webp){{size=large}}"
if f"/shtam/{slug}.webp" in s:
    sys.exit(0)  # déjà en place : seule l'image change
fin = s.index('---', 3) + 3
s = s[:fin] + "\n\n" + ligne + s[fin:]
open(p, 'w').write(s)
PY
echo "$(basename "$orig") → static/shtam/$slug.webp ($(du -k "$racine/static/shtam/$slug.webp" | cut -f1) Ko)"
