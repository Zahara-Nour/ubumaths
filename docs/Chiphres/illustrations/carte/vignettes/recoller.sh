#!/usr/bin/env bash
# Recolle sur le fond HD les villes dessinées par Nano Banana (une image par ville, vignettes/<ville>-ia.webp).
# Chaque ville a été dessinée dans un carré de 768 px découpé dans fond-carte-hd.webp autour de sa clairière.
# Le masque vient de la différence entre le carré d'origine et l'image de l'IA : seul ce qui a changé est recollé.
# Usage : bash recoller.sh  →  carte-villes-hd.webp
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)

# ville : x : y du coin haut-gauche du carré de 768 px dans fond-carte-hd.webp
CARRES=(
  sandomir:2224:1464
  lobatchevsk:2360:752
  turingrad:2624:1672
  cracovenn:1864:2640
  empoche:1056:2144
  bonneteau:800:1400
  sinusborg:1488:216
)

cp fond-carte-hd.webp "$tmp/carte.png"
for c in "${CARRES[@]}"; do
  IFS=: read -r ville x y <<<"$c"
  ia="vignettes/$ville-ia.webp"
  [ -f "$ia" ] || continue
  magick fond-carte-hd.webp -crop "768x768+$x+$y" +repage "$tmp/orig.png"
  magick "$ia" -resize '768x768!' "$tmp/ia.png"
  magick "$tmp/orig.png" "$tmp/ia.png" -compose difference -composite -colorspace gray \
    -threshold 12% -morphology Open Disk:2 -morphology Dilate Disk:14 -blur 0x8 "$tmp/masque.png"
  magick "$tmp/orig.png" "$tmp/ia.png" "$tmp/masque.png" -composite "$tmp/recolle.png"
  magick "$tmp/carte.png" "$tmp/recolle.png" -geometry "+$x+$y" -composite "$tmp/carte.png"
  echo "✓ $ville"
done
magick "$tmp/carte.png" -quality 92 carte-villes-hd.webp
rm -rf "$tmp"
