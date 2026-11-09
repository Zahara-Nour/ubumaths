# 0036 — Le centimètre d'une figure à compléter est le centimètre de la figure

- **Statut** : acceptée — mise en œuvre en cours (chantier regle-graduee ; journal :
  `docs/archive/wip/regle-graduee-progress.md`)
- **Date** : 2026-11-08 · **Décidée par** : David (questions Q1, Q2 et Q4 du chantier, « je suis tes recos »)

## Contexte

Tracer un segment de 6 cm, de 5 cm 3 mm ou de 72 mm (CE2-039) et construire des figures cotées (CE2-070 :
rectangle 7 cm × 3 cm, cercle de rayon 4 cm…) demandent une règle graduée dans la **figure à compléter**.
L'appli ne connaît pas la taille réelle d'un pixel (écran, zoom du navigateur, tablette ou téléphone) : un
« vrai » centimètre à l'écran ne se garantit pas. Sur un téléphone de 320 px de large, une figure de 12 cm
donne environ 2,5 px par millimètre, trop fin pour le doigt.

## Décision

1. **1 unité de la figure = 1 cm.** La règle graduée est dessinée et graduée **à l'échelle de la figure**,
   comme sur une photocopie réduite : règle et figure restent d'accord sur tout écran, quelle que soit sa taille
   réelle. C'est la règle de `constructions-v2` (`Ruler.svelte` : une grande graduation par unité, dix
   petites), au `pixelsPerUnit` de la figure, comme le rapporteur.
2. **Précision au millimètre par la pose et l'aimantation** : l'élève **pose la règle** (comme le rapporteur),
   puis le bout du segment **s'aimante à la graduation du millimètre** la plus proche ; une loupe aide à la
   pose. Juste = la longueur exacte au millimètre près.
3. **Papier uni seulement** : sur quadrillage, le carreau fait déjà l'unité.

## Écarté

- **La vraie taille après un étalonnage** (l'élève pose une carte au format bancaire sur l'écran pour fixer
  les pixels par centimètre) : lourd et fragile ; la figure et la règle n'ont besoin que d'être d'accord entre
  elles.
- **Un millimètre tracé au doigt, sans aimantation** : à ~2,5 px par mm sur téléphone, la longueur juste
  serait une affaire de chance.
- **La règle graduée sur quadrillage** : le carreau y fait déjà l'unité.

## Conséquences

- Le centimètre affiché n'est **pas** un centimètre réel : une règle physique posée sur l'écran ne lit pas la
  même longueur. L'énoncé ne doit pas inviter à mesurer l'écran.
- Les longueurs de l'auteur (« 6 cm », « 5 cm 3 mm ») sont des longueurs en unités de la figure ; la fenêtre
  de la figure doit pouvoir contenir le segment attendu.
- Le juge compare des longueurs exactes (au millimètre, donc au dixième d'unité), sans tolérance de tracé :
  l'aimantation garantit qu'une pose juste arrive juste.
