#!/usr/bin/env bash
# Colle l'arène de arene-ia.jpeg (retouche Nano Banana, très belle mais trop grosse : elle coupait la rue) sur
# carte-ia-sans-ponts.png, réduite (rayon 42, centre (603, 677) : le plus grand qui tient entre les deux tours de rue, David 2026-10-29).
# Arène dans arene-ia.jpeg : centre (597, 687), rayon 106 px (gradins + arche) ; disque d'origine : centre (602, 672),
# place libre entre deux tours de rue d'environ 36 px de rayon.
# Usage : bash coller-arene.sh [rayon [x y]]   → carte-ia.png
set -euo pipefail
cd "$(dirname "$0")"
R=${1:-42}
CX=${2:-603}
CY=${3:-677}
t=$(mktemp -d)
S=$((2 * R + 8))
magick arene-ia.jpeg -crop 220x220+487+577 +repage -resize "${S}x${S}" "$t/arene.png"
magick -size "${S}x${S}" xc:black -fill white -stroke none -draw "circle $((S / 2)),$((S / 2)) $((S / 2)),$((S / 2 - R))" \
  -blur 0x1.2 -alpha off -colorspace gray "$t/masque.png"
magick "$t/arene.png" "$t/masque.png" -alpha off -compose copy-opacity -composite "$t/arene-detouree.png"
magick carte-ia-sans-ponts.png "$t/arene-detouree.png" -geometry "+$((CX - S / 2))+$((CY - S / 2))" -compose over \
  -composite carte-ia.png
rm -r "$t"
