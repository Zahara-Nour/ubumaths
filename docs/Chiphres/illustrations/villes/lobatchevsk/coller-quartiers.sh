#!/usr/bin/env bash
# Recolle sur l'original les quatre quartiers retouchés par Nano Banana (murs de soutènement des terrasses, 2026-11-01).
# Chaque quartier a été découpé en carré de 300 px dans carte-ia-original.jpeg, agrandi à 1024 (quartier-<q>-carre.png)
# et retouché seul (quartier-<q>-ia*.jpeg). Le masque vient de la différence entre le carré d'origine et la retouche,
# calculée en 1024 puis réduite : seul ce qui a changé est recollé. Bords du carré fondus, pour éviter les coutures.
# Usage : bash coller-quartiers.sh   (depuis villes/lobatchevsk/)  →  carte-ville.png
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d)

# quartier : retouche : x : y du coin haut-gauche du carré dans l'original
QUARTIERS=(
  ne:quartier-ne-ia.jpeg:505:222
  no:quartier-no-ia-1.jpeg:219:222
  so:quartier-so-ia-1.jpeg:219:505
  se:quartier-se-ia-1.jpeg:505:505
)

magick carte-ia-original.jpeg "$tmp/carte.png"
magick -size 1024x1024 xc:black -fill white -draw "rectangle 48,48 975,975" -blur 0x20 "$tmp/bords.png"
for q in "${QUARTIERS[@]}"; do
  IFS=: read -r nom ia x y <<<"$q"
  magick "quartier-$nom-carre.png" "$ia" -compose difference -composite -colorspace gray \
    -threshold 8% -morphology Open Disk:2 -morphology Close Disk:30 -morphology Dilate Disk:14 -blur 0x8 \
    "$tmp/bords.png" -compose multiply -composite -resize 300x300! "$tmp/masque.png"
  magick "$ia" -resize 300x300! "$tmp/ia.png"
  # fond = la carte EN COURS : les carrés voisins se chevauchent de quelques pixels
  magick "$tmp/carte.png" -crop 300x300+$x+$y +repage "$tmp/actuel.png"
  magick "$tmp/actuel.png" "$tmp/ia.png" "$tmp/masque.png" -composite "$tmp/recolle.png"
  magick "$tmp/carte.png" "$tmp/recolle.png" -geometry "+$x+$y" -composite "$tmp/carte.png"
  echo "✓ $nom"
done
cp "$tmp/carte.png" carte-ville.png
rm -rf "$tmp"
