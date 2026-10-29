#!/usr/bin/env bash
# Recolle sur le fond HD les villes dessinées par Nano Banana (une image par ville, vignettes/<ville>-ia.webp).
# Chaque ville a été dessinée dans un carré de 768 px découpé dans fond-carte-hd.webp autour de sa clairière.
# L'encart de l'Isle de la Réunion Pataphysique : carré de 1024 px, cadre dessiné par l'IA, île dessinée à part puis collée dedans.
# Le masque vient de la différence entre le carré d'origine et l'image de l'IA : seul ce qui a changé est recollé.
# Close comble les trous du masque (lac de Sandomir à moitié collé sans lui).
# Usage : bash recoller.sh  →  carte-villes-hd.webp
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)

# ville : x : y du coin haut-gauche du carré dans fond-carte-hd.webp [: côté du carré, 768 par défaut]
CARRES=(
  sandomir:2224:1464
  lobatchevsk:2360:752
  turingrad:2624:1672
  cracovenn:1864:2640
  empoche:1056:2144
  bonneteau:800:1400
  sinusborg:1488:400
  reunion:3262:2816:1024
)

cp fond-carte-hd.webp "$tmp/carte.png"
for c in "${CARRES[@]}"; do
  IFS=: read -r ville x y cote <<<"$c"
  cote=${cote:-768}
  ia="vignettes/$ville-ia.webp"
  [ -f "$ia" ] || continue
  magick fond-carte-hd.webp -crop "${cote}x${cote}+$x+$y" +repage "$tmp/orig.png"
  magick "$ia" -resize "${cote}x${cote}!" "$tmp/ia.png"
  magick "$tmp/orig.png" "$tmp/ia.png" -compose difference -composite -colorspace gray \
    -threshold 8% -morphology Open Disk:2 -morphology Close Disk:30 -morphology Dilate Disk:14 -blur 0x8 "$tmp/masque.png"
  # Le fond du collage est la carte EN COURS (pas le fond d'origine) : les carrés voisins
  # se chevauchent (Sandomir et Turingrad), un collage ne doit pas effacer la ville d'à côté.
  magick "$tmp/carte.png" -crop "${cote}x${cote}+$x+$y" +repage "$tmp/actuel.png"
  magick "$tmp/actuel.png" "$tmp/ia.png" "$tmp/masque.png" -composite "$tmp/recolle.png"
  magick "$tmp/carte.png" "$tmp/recolle.png" -geometry "+$x+$y" -composite "$tmp/carte.png"
  echo "✓ $ville"
done
magick "$tmp/carte.png" -quality 92 carte-villes-hd.webp
rm -rf "$tmp"
