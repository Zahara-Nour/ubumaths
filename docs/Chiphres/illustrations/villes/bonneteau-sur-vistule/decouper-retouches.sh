#!/usr/bin/env bash
# Découpe les carrés à retoucher (Nano Banana), agrandis à 1024, copiés dans ~/Downloads.
# Zones : nom, côté, x, y (sur carte-ia-original.jpeg, 1024 px) ; mêmes zones dans coller-retouches.sh.
# tribunes : la route d'Empoche-les-Bains traverse le bout gauche des tribunes du champ de courses (défaut du plan).
# pont : une maison mord sur le bout gauche du pont de bois.
set -euo pipefail
cd "$(dirname "$0")"
while read -r nom cote x y; do
  magick carte-ia-original.jpeg -crop "${cote}x${cote}+${x}+${y}" +repage -filter Lanczos -resize 1024x1024 "$nom-carre.png"
  cp "$nom-carre.png" ~/Downloads/"bonneteau-$nom-carre.png"
done < zones-retouches.txt
