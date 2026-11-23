#!/usr/bin/env bash
# Ajoute la route circulaire de l'autre bord des douves (oubliée par Nano Banana) sur carte-ia.png.
# La retouche Nano Banana (route-ia.jpeg) avait mis la route à la place des douves (eau rétrécie contre la muraille,
# Pont-Levis et canal du lac par-dessus la route) : on n'en garde que la route, agrandie ×1,08 autour du centre de la
# ville (510, 513) pour la poser juste à l'extérieur de nos douves (anneau de rayon 410 à 444 px).
# - Pont-Levis : dans la retouche il enjambait la route ; on y met la route prise 6° plus loin, le pont s'arrête au bord.
# - Canal du lac : son petit pont, au bord des douves dans l'original, est effacé (eau des douves prise 15° plus loin)
#   et recopié sur la route, là où elle franchit le canal ; le canal passe dessous.
# Usage : bash ajouter-route.sh   → carte-ville.png
set -euo pipefail
cd "$(dirname "$0")"
t=$(mktemp -d)
C="510,513"
magick route-ia.jpeg -virtual-pixel edge -distort SRT "$C 1.08 0 $C" "$t/n.png"
magick "$t/n.png" -virtual-pixel edge -distort SRT "$C 1 6" "$t/n-rot.png"
magick -size 1024x1024 xc:black -fill white -draw "circle 510,939 510,965" -alpha off -colorspace gray -blur 0x2 "$t/w-sud.png"
magick "$t/n.png" "$t/n-rot.png" "$t/w-sud.png" -composite "$t/route.png"
magick -size 1024x1024 xc:black -fill white -stroke none -draw "circle $C 510,69" -fill black -draw "circle $C 510,103" \
  -draw "circle 221,200 221,216" -alpha off -colorspace gray -blur 0x1.5 "$t/anneau.png"
magick carte-ia.png -alpha off "$t/c.png"
magick "$t/c.png" -virtual-pixel edge -distort SRT "$C 1 15" "$t/c-rot.png"
magick -size 1024x1024 xc:black -fill white -stroke none -draw "circle $C 510,93" -fill black -draw "circle $C 510,134" \
  -alpha off -colorspace gray "$t/douves.png"
magick -size 1024x1024 xc:black -fill white -draw "circle 237,217 237,245" -alpha off -colorspace gray "$t/w-pont.png"
magick "$t/douves.png" "$t/w-pont.png" -compose multiply -composite -blur 0x2 "$t/m-pont.png"
magick "$t/c.png" "$t/c-rot.png" "$t/m-pont.png" -composite "$t/base.png"
magick "$t/base.png" "$t/route.png" "$t/anneau.png" -composite "$t/etape.png"
magick "$t/c.png" -crop 50x50+212+192 +repage "$t/pont.png"
magick -size 50x50 xc:black -fill white -draw "circle 25,25 25,3" -alpha off -colorspace gray -blur 0x1.5 "$t/pm.png"
magick "$t/pont.png" "$t/pm.png" -alpha off -compose copy-opacity -composite "$t/pont-d.png"
magick "$t/etape.png" "$t/pont-d.png" -geometry +196+175 -compose over -composite carte-ville.png
rm -r "$t"
