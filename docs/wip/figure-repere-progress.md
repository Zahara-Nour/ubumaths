---
title: Bloc ```figure — axes et grille (lot 0 de la géométrie repérée)
date: 2026-10-03
status: en cours
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
| `graduations` | un pas, `x ; y`, ou `non`                | pas de la grille, sinon 1 | pas des graduations ; `non` = axes sans graduation |

Choix, et pourquoi :

- **`grille`** : même mot et même valeur que ``courbe (`grille: 1 ; 2` = pas en x puis en y).
Dans ``courbe la grille donne aussi le pas des graduations : ici aussi, sauf `graduations:`.
- **`axes`** : ```courbe n'a pas de clé (ses axes sont toujours là) ; une figure de géométrie
n'a PAS d'axes par défaut (rendu inchangé), d'où une clé oui/non. `repere`écarté : un seul mot
par sens, et`axes` dit exactement ce qui apparaît.
- **`graduations`** sans `axes: oui` → erreur située (les graduations sont portées par les axes).
- Valeurs invalides → erreur située `Ligne N : …`, comme les autres clés.
- Pas trop petit (plus de 200 lignes de grille ou de graduations par axe, la borne de ```courbe)
  → erreur située.

## Rendu (conventions visuelles de ```courbe)

- Axes : position 0 si dans la fenêtre, sinon le bord le plus proche (comme ```courbe) ; flèche au
  bout positif, au-delà du cadre. Graduations : petits traits, étiquettes en PETIT (10 px / 6,5 pt)
  SOUS l'axe des abscisses et À GAUCHE de l'axe des ordonnées ; « O » en bas à gauche de l'origine,
  le 0 n'est alors pas écrit. Signe moins vrai (−), virgule décimale en français.
- Étiquettes trop serrées : une graduation sur 2 (sur 3…) est écrite, selon l'écart à l'écran.
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
  (`figure-repere-invariance.test.ts`).
