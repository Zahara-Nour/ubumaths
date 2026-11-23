#!/usr/bin/env bash
# Raccourcit le Pont-Levis de carte-route-ia.jpeg (retouche Nano Banana « ring road », 2026-10-29) : il enjambait la
# route circulaire. Sa partie hors des douves (y > 895) est recouverte par la route prise 6° plus loin sur le même
# cercle (centre de la ville (511, 511), mesuré sur l'image) : le pont s'arrête au bord de la route.
# Usage : bash raccourcir-pont-levis.sh   → carte-ville.png
set -euo pipefail
cd "$(dirname "$0")"
t=$(mktemp -d)
magick carte-route-ia.jpeg -virtual-pixel edge -distort SRT "511,511 1 6" "$t/rot.png"
magick -size 1024x1024 xc:black -fill white -stroke none -draw "rectangle 491,896 533,934" -alpha off -colorspace gray \
  -blur 0x1.5 "$t/masque.png"
magick carte-route-ia.jpeg "$t/rot.png" "$t/masque.png" -composite carte-ville.png
rm -r "$t"
