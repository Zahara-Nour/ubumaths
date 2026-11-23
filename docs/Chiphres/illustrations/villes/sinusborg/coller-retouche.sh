#!/bin/bash
# Colle sur l'original la seule zone retouchée par Nano Banana (2e Résidence de Bougrelas remplacée par des maisons) :
# le reste de l'image reste celui de l'original, au pixel près.
# Usage : bash coller-retouche.sh   (depuis villes/sinusborg/)
set -e
ZONE=130x140+400+555 # largeur x hauteur + x + y, sur 1024 px (zone repérée par différence avec l'original)
magick carte-ia-original.jpeg \( residence-retouche-ia.jpeg -crop $ZONE \) -geometry +400+555 -composite carte-ville.png
