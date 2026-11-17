#!/usr/bin/env bash
# Recolle sur essai-1-ia.jpg les carrés retouchés (<zone>-ia.jpg), zones dans zones-retouches.txt.
# Masque = différence avec le carré d'origine (seuil, dilatation, bords fondus) → retouche.jpg
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d)
cp essai-1-ia.jpg "$tmp/base.png"
while read -r z x y c; do
  [ "${z:0:1}" = "#" ] && continue
  [ -f "$z-ia.jpg" ] || { echo "($z : pas encore de retouche)"; continue; }
  magick essai-1-ia.jpg -crop "${c}x${c}+$x+$y" +repage "$tmp/$z-orig.png"
  magick "$z-ia.jpg" -filter Lanczos -resize "${c}x${c}!" "$tmp/$z-new.png"
  # différence → masque, élargi puis fondu ; bords du carré à zéro
  magick "$tmp/$z-orig.png" "$tmp/$z-new.png" -compose difference -composite -colorspace gray \
    -threshold 12% -morphology Dilate Disk:6 -morphology Erode Disk:2 -blur 0x3 \
    \( -size "${c}x${c}" xc:black -fill white -draw "rectangle 8,8 $((c-9)),$((c-9))" -blur 0x4 \) \
    -compose multiply -composite "$tmp/$z-mask.png"
  cp "$tmp/$z-mask.png" "masque-$z.png"
  magick "$tmp/base.png" \( "$tmp/$z-new.png" "$tmp/$z-mask.png" -alpha off -compose copy_opacity -composite \) \
    -geometry "+$x+$y" -compose over -composite "$tmp/base.png"
  echo "$z recollé"
done < zones-retouches.txt
magick "$tmp/base.png" -quality 95 retouche.jpg
rm -rf "$tmp"
