# Atelier : propriétés des objets — journal

## Reprendre ici

_Mis à jour le 2026-10-23, PR 1 ouverte._

- **État** : PR 1 (cartes allégées + point de couleur + console qui défile) ouverte.
- **Prochaine action** : PR 2 — entrée « Propriétés » du menu ⋮ et Renommer.
- **En attente de David** : rien.
- **Pièges en cours** : entre la PR 1 et la PR 2, les coordonnées d'un point construit, l'équation d'une droite et la longueur d'un segment ne se lisent plus nulle part : **ne pas lancer `deploy:prod` entre les deux**, ou le dire à David.
- **Worktree / branche** : `../ubumaths-wt-atelier-proprietes` · `feat/atelier-proprietes`.

## Décisions de David (2026-10-23)

Demande : point de couleur trop gros ; plus de type (« POINT », « SEGMENT ») ni de longueur sous la carte ; une option « Propriétés » dans le menu de l'objet (nom, style, mesures, certaines modifiables). Validé tel que proposé :

1. **Renommer réécrit les objets qui citent le nom** (`A` → `E` : `d = [AB]` devient `[EB]`).
2. **Le panneau se déplie sous la carte**, dans la liste (téléphone, ne cache pas la figure).
3. **Le point de couleur reste un raccourci** vers le style ; tous les réglages sont aussi dans Propriétés.
4. **Deux PR** : PR 1 les corrections, PR 2 Propriétés + Renommer.

Ajouts du même jour (PR 1) : la console ne descendait pas sur une nouvelle entrée ; les noms dans la vue Géométrie (étiquettes, nom d'un cercle) passent en couleur du texte, comme au cahier — prop `neutralLabels` de `GeometryCanvas`, les autres toiles du site gardent leurs noms en couleur.

## Propriétés par objet (proposé, validé)

- **Tous** : nom ✎, dépendances (« dépend de A, B » / « utilisé par d, C »).
- **Point** : coordonnées exactes (+ approchées si irrationnelles), construction (libre, milieu de…, intersection de…, sur…), couleur ✎, taille ✎, étiquette ✎ (quitte le menu ⋮).
- **Segment** : longueur exacte et approchée, extrémités, couleur ✎, trait ✎.
- **Droite** : équation réduite et cartésienne, coefficient directeur, ordonnée à l'origine, vecteur directeur, couleur ✎, trait ✎.
- **Cercle** : centre, rayon, équation, périmètre, aire.
- **Courbe par équation** : nature reconnue (cercle, parabole…), équation.
- **Valeur** : valeur exacte et approchée, unité, curseur ✎ (min, max, pas — `SliderSettings`).
- **Fonction** : ensemble de définition, lettre, style ✎ (tangente, aire… restent dans `CurveSettings`).
- **Suite** : mode, premier rang, premier terme, style ✎.
- **Liste** : nombre de valeurs.

Le constat d'une courbe dégénérée (« Aucun point ne vérifie cette équation. ») et les messages d'erreur restent sur la carte : ce sont des avertissements.

## PR 1 — corrections

- Point de couleur : la couleur était posée sur le bouton de 24 px entier, le point de 10 px prévu par le CSS était invisible. Couleur passée par `--peinte`, lue par le seul `::after` (`FigureStylePopover`, `CurveStylePopover`).
- `FigureCard` : ligne grise (nature + valeur d'une construction) retirée. Les tests qui la lisaient vérifient désormais `figureNatureOf` / `figureSummaryOf`, que la PR 2 affichera dans Propriétés.
- Console : `CalculView` descend en bas de l'historique quand une entrée s'ajoute (tapée ou écrite par une action de carte).
- Preuves rouges : test du point (fond `rgb(37, 99, 235)` sur la cible) et test de la console (`scrollTop` 0) rouges sans le correctif.
