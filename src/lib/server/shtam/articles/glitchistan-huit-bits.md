---
title: La machine de Turingrad déborde, Mère Ubu aussi
date: 2026-12-10
author: merdranpo
lede: La machine qui compte les gidouilles de Mère Ubu ne sait pas aller au-delà de 255. La Reine, elle, ne compte pas s'arrêter là.
---

Il était minuit pile quand l'incident s'est produit. La machine chargée de compter les gidouilles du coffre personnel de Mère Ubu affichait 255. Un Palotin a déposé une gidouille de plus. Le cadran a affiché 0.

La Reine, réveillée en pleine nuit, est arrivée en chemise de nuit dans la salle des machines de Turingrad. « Où est ma fortune ? » Les ingénieurs ont tenté d'expliquer. « La machine compte sur huit bits, Votre Majesté. Elle ne sait pas aller au-delà de 255. Quand on ajoute 1, elle déborde, et repart à zéro. Mais les gidouilles sont toujours dans le coffre. »

Mère Ubu a fait vérifier le coffre. Les 256 gidouilles y étaient bien. Elle a néanmoins fait arrêter la machine, « pour débordement en présence de la Reine », et ordonné son remplacement par un modèle à soixante-quatre bits. « Combien peut-il compter ? », a-t-elle demandé. « Plus de dix-huit milliards de milliards », ont répondu les ingénieurs.

La Reine a réfléchi un instant, puis a commandé un deuxième modèle, « au cas où ».

## Le vrai du faux

Les ordinateurs stockent les nombres en **binaire**, avec un nombre fixe de chiffres (les **bits**).

- Sur **8 bits**, on peut écrire $2^8 = 256$ nombres : de 0 à 255. En binaire, 255 s'écrit `11111111`. En ajoutant 1, on obtient `100000000`, qui a 9 chiffres : le neuvième ne tient pas, il reste `00000000`, c'est-à-dire **0**. C'est un **dépassement de capacité**.
- Sur **64 bits**, on monte jusqu'à $2^{64} - 1$, environ $1{,}8 \times 10^{19}$.
- De vrais bugs sont nés de ce phénomène : des compteurs de jeux vidéo, d'horloges ou de logiciels qui repartent soudain à zéro, ou deviennent négatifs. En 2014, la vidéo _Gangnam Style_ s'approchait de 2 147 483 647 vues, la limite d'un compteur sur 32 bits : YouTube a dû passer son compteur à 64 bits.
