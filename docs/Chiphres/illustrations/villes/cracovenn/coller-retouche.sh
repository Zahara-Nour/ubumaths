#!/bin/bash
# Colle sur l'original la seule rotonde retouchée par Nano Banana (tiers de bois à l'avant), puis retire le cadre de
# parchemin déchiré peint par l'IA : le reste de l'image reste celui de l'original.
# La retouche a été faite sur un carré de 256 px découpé en (384, 352) et agrandi (méthode des vignettes) ; Nano Banana
# l'a rendu en 1024 px : on le réduit à 256 avant de coller.
# Usage : bash coller-retouche.sh   (depuis villes/cracovenn/)
set -e
CARRE=384,352 # coin du carré dans l'original
ZONE=96x64+76+128 # rotonde dans le carré de 256 px (repérée par différence avec l'original)
MARGE=20 # cadre déchiré : recadrage de chaque côté, puis retour à 1024 px
magick carte-ia-original.jpeg \
	\( bibliotheque-carre-ia.jpeg -resize 256x256 -crop $ZONE +repage \) \
	-geometry +$((${CARRE%,*} + 76))+$((${CARRE#*,} + 128)) -composite \
	-crop $((1024 - 2 * MARGE))x$((1024 - 2 * MARGE))+$MARGE+$MARGE +repage -resize 1024x1024 carte-ville.png
