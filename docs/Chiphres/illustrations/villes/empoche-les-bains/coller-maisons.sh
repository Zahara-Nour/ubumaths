#!/usr/bin/env bash
# Recolle sur l'original les carrés de maisons retouchés par Nano Banana (rectangles plats → vraies maisons, 2026-11-01).
# Chaque carré a été découpé par decouper-maisons.sh (zones-maisons.txt), agrandi à 1024 (maisons-<z>-carre.png) et
# retouché seul (maisons-<z>-ia.jpeg ; un carré sans retouche est sauté). Masque = différence entre le carré d'origine et
# la retouche, calculée en 1024 puis réduite : seul ce qui a changé est recollé. Bords du carré fondus (méthode de
# villes/lobatchevsk/coller-quartiers.sh).
# Usage : bash coller-maisons.sh   →  carte-ville.png
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d)

magick carte-ia-original.jpeg "$tmp/carte.png"
magick -size 1024x1024 xc:black -fill white -draw "rectangle 48,48 975,975" -blur 0x20 "$tmp/bords.png"
while read -r nom cote x y; do
  ia="maisons-$nom-ia.jpeg"
  [ -f "$ia" ] || { echo "· $nom : pas de retouche"; continue; }
  magick "maisons-$nom-carre.png" "$ia" -resize 1024x1024! -compose difference -composite -colorspace gray \
    -threshold 8% -morphology Open Disk:2 -morphology Close Disk:30 -morphology Dilate Disk:14 -blur 0x8 \
    "$tmp/bords.png" -compose multiply -composite -resize "${cote}x${cote}!" "$tmp/masque.png"
  magick "$ia" -resize "${cote}x${cote}!" "$tmp/ia.png"
  # fond = la carte EN COURS : les carrés voisins se chevauchent
  magick "$tmp/carte.png" -crop "${cote}x${cote}+$x+$y" +repage "$tmp/actuel.png"
  magick "$tmp/actuel.png" "$tmp/ia.png" "$tmp/masque.png" -composite "$tmp/recolle.png"
  magick "$tmp/carte.png" "$tmp/recolle.png" -geometry "+$x+$y" -composite "$tmp/carte.png"
  echo "✓ $nom"
done < zones-maisons.txt
cp "$tmp/carte.png" carte-ville.png
rm -rf "$tmp"
