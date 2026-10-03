---
title: Bloc ```figure — axes et grille (lot 0 de la géométrie repérée)
date: 2026-10-03
status: lot 0 livré sur la branche (non poussée)
branche: feat/figure-repere (worktree ../ubumaths-wt-repere)
---

# Bloc ```figure : axes et grille

Besoin validé par David le 2026-10-03 : modèles de géométrie repérée (1re SPE) — droites
(dont verticales), cercles, vecteurs normaux, projetés orthogonaux, DANS un repère orthonormé.
Point de reprise en cas de crash.

## Syntaxe (alignée sur ```courbe)

````
```figure
fenetre: -2 ; 6 ; -1 ; 5
axes: oui
grille: oui
---
A = point(1, 1)
```
````

| Clé           | Valeurs                                  | Défaut                    | Effet                                              |
| ------------- | ---------------------------------------- | ------------------------- | -------------------------------------------------- |
| `axes`        | `oui` / `non`                            | `non`                     | axes fléchés, origine « O », graduations           |
| `grille`      | `oui` (pas 1), `non`, un pas, ou `x ; y` | `non`                     | quadrillage sous les objets                        |
| `graduations` | un pas, `x ; y`, `oui` ou `non`          | pas de la grille, sinon 1 | pas des graduations ; `non` = axes sans graduation |

Choix, et pourquoi :

- **`grille`** : même mot et mêmes valeurs que le bloc `courbe` (`grille: 1 ; 2` = pas en x puis
  en y). Dans `courbe`, la grille donne aussi le pas des graduations : ici aussi, sauf
  `graduations:`.
- **`axes`** : le bloc `courbe` n'a pas de clé (ses axes sont toujours là) ; une figure de
  géométrie n'a PAS d'axes par défaut (rendu inchangé), d'où une clé oui/non. `repere` écarté :
  un seul mot par sens, et `axes` dit exactement ce qui apparaît.
- **`graduations`** sans `axes: oui` → erreur située (les graduations sont portées par les axes).
- Valeurs invalides → erreur située `Ligne N : …`, comme les autres clés.
- Pas trop petit (plus de 200 lignes de grille ou de graduations par axe, la borne de `courbe`)
  → erreur située.
- Pas de nom d'axe (`x`, `y`) : le bloc `courbe` n'en écrit pas.

## Rendu (conventions visuelles de ```courbe)

- Axes : position 0 si dans la fenêtre, sinon le bord le plus proche (comme ```courbe) ; flèche au
  bout positif, au-delà du cadre. Graduations : petits traits, étiquettes en PETIT (10 px / 6,5 pt)
  SOUS l'axe des abscisses et À GAUCHE de l'axe des ordonnées ; « O » en bas à gauche de l'origine,
  le 0 n'est alors pas écrit. Signe moins vrai (−), virgule décimale en français.
- Étiquettes trop serrées : une graduation sur 2 (sur 3…) est écrite, selon l'écart à l'écran
  ET au PDF (les textes y sont ≈ 1,5 fois plus grands par rapport à la figure).
- Étiquette de graduation qui chevaucherait le nom d'un point (écran OU PDF, même table de
  placement `label-placement.ts`) : omise, la graduation reste tracée. Point nommé à l'origine
  (`O = point(0, 0)`) : pas de second « O ».
- Grille : traits fins gris clair (écran `--color-border`, PDF `luma(205)`), sous TOUT (grille,
  puis axes, puis objets).
- Écran : marge de 26 px autour de la fenêtre (comme ```courbe) quand les axes sont affichés ;
  les objets restent découpés à la fenêtre (SVG imbriqué).
- PDF : lignes cetz du repère passées à `exportToTypst` (option `underlay`, dessinée sous les
  objets), en unités du repère, tailles fixes divisées par l'unité.

## Comportements testés

1. parseur : `axes: oui|non`, `grille: oui|non|1|1 ; 2`, `graduations: 2|non` ; valeurs invalides,
   pas négatif, `graduations` sans axes, pas trop petit → erreur située.
2. scène : `repere` null sans option ; axes, origine, graduations (0 omis), grille = multiples du
   pas dans la fenêtre.
3. SVG : grille (nombre de lignes = multiples du pas), axes + 2 flèches, graduations, « O » ;
   marge ; objets découpés à la fenêtre.
4. Typst : mêmes lignes de grille, axes, graduations, sous les objets (avant le 1er `// element`).
5. sans option : SVG et Typst identiques octet pour octet (instantanés enregistrés AVANT).
6. droite verticale et oblique tracées d'un bord à l'autre de la fenêtre (écran et PDF).

## Journal

- 2026-10-03 : instantanés d'invariance enregistrés sur le code d'origine
  (`figure-repere-invariance.test.ts`, 4 instantanés : SVG + Typst de 2 figures).
- 2026-10-03 : tests d'abord — `figure-repere.test.ts` 25 rouges (clé `axes` inconnue,
  `scene.frame` absent…), puis 4 de plus (chevauchements, `O = point(0, 0)`) rouges avant leur
  code ; `FigureBlockRepere.svelte.test.ts` 3 rouges sur l'ancien `FigureBlockView` (copie
  restaurée ensuite). Constat : droites (dont verticales) DÉJÀ tracées d'un bord à l'autre de la
  fenêtre à l'écran et au PDF — tests ajoutés, aucun code. Un `e = droite(…)` est refusé
  (« constante réservée ») : nommer `d2`.
- Code : `types/figure.ts` (`axes`, `grid`, `ticks`, `FIGURE_PIXEL_WIDTH`, `FIGURE_WIDTH_CM`,
  `FIGURE_LABEL_FONT_PX`, `FIGURE_AXES_MARGIN_PX`), `figure-parser.ts`, `figure-scene.ts`
  (`buildFigureFrame`, `scene.frame`, option `locale`), `figure-svg.ts` (`frame`, `margin`
  optionnels : absents sans repère), `figure-typst.ts` (`frameToTypst`, langue transmise par le
  registre), geometry-core `exportToTypst({ underlay })` (lignes sous les objets ; vide par
  défaut), `courbe-scene.ts` (`multiples` exporté), `FigureBlockView.svelte` (repère + SVG
  imbriqué qui découpe les objets à la fenêtre), `FigureBlock.svelte` (cadre d'attente avec la
  marge).
- Vérifié en production : fiche de 3 exercices (droite oblique + vecteur normal + projeté ;
  droite verticale + cercle de centre (−0,5 ; 1,5) ; fenêtre 2..12 × 1..8 sans origine,
  `graduations: 2` ; grille 0,5) via `rendu-fiche.ts` puis `compile-prod.mjs` : 4/4 OK, pages
  relues en PNG et comparées au SVG d'écran (mêmes graduations omises). Premier rendu : « P2 »
  et « W » collés aux graduations au PDF seulement → la vérification de chevauchement se fait
  désormais sur les deux supports.

## Points ouverts

- PDF : les objets ne sont toujours pas découpés à la fenêtre (limite v1 du bloc) ; un cercle
  qui dépasse sort du repère au PDF, pas à l'écran.
- Les étiquettes de graduation ne s'écartent pas des TRAITS (droite, cercle) qui les traversent,
  seulement des noms de points.
- Les noms de points eux-mêmes peuvent toujours être coupés par une droite (placement manuel
  `etiquette=`, inchangé).
