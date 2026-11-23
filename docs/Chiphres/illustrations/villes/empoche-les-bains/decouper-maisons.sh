#!/usr/bin/env bash
# Découpe les carrés de maisons à retoucher (Nano Banana), agrandis à 1024, copiés dans ~/Downloads.
# Zones : nom, côté, x, y (sur carte-ia-original.jpeg, 1024 px) ; mêmes zones dans coller-maisons.sh.
set -euo pipefail
cd "$(dirname "$0")"
while read -r nom cote x y; do
  magick carte-ia-original.jpeg -crop "${cote}x${cote}+${x}+${y}" +repage -filter Lanczos -resize 1024x1024 "maisons-$nom-carre.png"
  cp "maisons-$nom-carre.png" ~/Downloads/"empoche-maisons-$nom-carre.png"
done < zones-maisons.txt
