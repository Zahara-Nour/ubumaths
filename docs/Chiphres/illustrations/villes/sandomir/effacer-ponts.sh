#!/usr/bin/env bash
# Efface les deux ponts en trop sur les douves (nord, nord-est) de carte-ia-original.jpeg (Nano Banana, 2026-10-29).
# La retouche Nano Banana « remove the two bridges » redessinait toute l'image (douves turquoise, traits mous) :
# on garde l'original et on recouvre chaque pont par l'eau des douves prise 25° plus loin (les douves sont un cercle,
# centre (510, 513), rayons 389 à 411 px, mesurés sur l'image).
# Usage : bash effacer-ponts.sh   → carte-ia-sans-ponts.png
set -euo pipefail
cd "$(dirname "$0")"
t=$(mktemp -d)
magick carte-ia-original.jpeg -virtual-pixel edge -distort SRT "510,513 1 -25" "$t/rot.png"
magick -size 1024x1024 xc:black -fill white -stroke none -draw "circle 510,513 510,93" -fill black \
  -draw "circle 510,513 510,134" -alpha off -colorspace gray "$t/anneau.png"
magick -size 1024x1024 xc:black -fill white -stroke none -draw "circle 511,118 511,163" \
  -draw "circle 866,322 866,367" -alpha off -colorspace gray "$t/fenetres.png"
magick "$t/anneau.png" "$t/fenetres.png" -compose multiply -composite -blur 0x2 -alpha off "$t/masque.png"
magick carte-ia-original.jpeg "$t/rot.png" "$t/masque.png" -composite carte-ia-sans-ponts.png
rm -r "$t"
