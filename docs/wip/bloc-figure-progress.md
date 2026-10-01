---
title: Bloc ubumark ```figure — progression
date: 2026-10-01
status: spécification validée, lot 1 en cours
branche: feat/bloc-figure (worktree ../ubumaths-wt-figure)
---

# Bloc ubumark ```figure

Spécification validée par David le 2026-10-01. Point de reprise en cas de crash.
Modèle à reproduire : le bloc ```courbe (`docs/wip/bloc-courbe-progress.md`, #576).

## Syntaxe (v1)

````
```figure
fenetre: -1 ; 8 ; -1 ; 6
taille: petite
description: Triangle rectangle ABC.
---
A = point(0, 0)
B = point({{c}}, 0)
C = point(0, {{b}})
p = polygone(A, B, C)
angle(B, A, C, marque="carre")
```
````

- En-tête (avant `---`) : `fenetre` = xmin ; xmax ; ymin ; ymax (repère ISOTROPE : la hauteur
  se déduit de la largeur), `taille` (petite / moyenne / grande), `description`.
- Corps : le DSL de geometry-core TEL QUEL, interprété sans affichage (`interpret(parse(script))`).
- v1 : seulement les types que geometry-core exporte déjà en SVG ET en Typst — points, segments,
  droites, demi-droites, vecteurs, cercles, arcs, polygones, angles, codages, textes.
- REFUSÉS en v1, message situé : `courbe` / fonctions, aires, lieux, images (URL externe),
  curseurs, animations (`@instruction`…), tout type hors liste blanche.

## Décisions

- **Q48 (erreurs)** : comme `courbe` — message détaillé (résumé + n° de ligne du bloc) pour le
  prof (`showAuthoringErrors`), cadre neutre « Figure indisponible » pour l'élève.
- **Q53 (source)** : le DSL est écrit EN LIGNE dans le bloc, pas de renvoi vers une construction
  enregistrée, pour que les variables de modèle `{{c}}` fonctionnent.
- **Q56 (rendu)** : partout, y compris chat élève et tableau blanc → bornes de robustesse : un
  bloc hostile ne doit jamais figer l'onglet.

## Architecture

- `ubumark/types/figure.ts` + `parser/figure-parser.ts` : garde le script brut + l'en-tête
  (analyse légère, sans geometry-core : le parseur Markdown reste dans le chunk des pages).
- `ubumark/utils/figure-scene.ts` : interprétation SANS affichage, liste blanche des types,
  bornes (taille du script, nombre d'objets, budget d'exécution).
- Composant chargé à la demande (`{#await import()}`) : afficheur LÉGER sur les primitives SVG
  de geometry-core — PAS `GeometryCanvas` (mathlive + roughjs), qui ne doit pas entrer dans le
  chunk des pages Markdown.
- Typst : `exportToTypst` aligné sur cetz 0.3.0 (même version que `courbe`, `trig`, `line`).
- Câblage comme `courbe` : ast, 2 sites de `markdown-parser.ts`, `MarkdownRenderer`,
  `ListNode`, `typst-generator`, `rich-text/markdown-import.ts`, `check:ubumark`.
- Accessibilité : `role="img"`, `aria-label` auto, `description:` prioritaire.

## Comportements à tester (validés)

12. un script de triangle donne une figure ; `{{c}}` remplacé (via le vrai `resolveMarkdownContent`).
13. type hors liste blanche (`courbe`, `image`, curseur) → erreur explicite située.
14. erreur DSL → son message (`summary`) et sa ligne, visibles pour le prof ; cadre neutre élève.
15. Typst : chaque élément visible à l'écran a son équivalent exporté (même nombre) ; le texte
    compile en conditions de production (fiche FR/EN énoncé + corrigé via `rendu-fiche.ts` puis
    `compile-prod.mjs`).
16. le composant n'est PAS dans le chunk Markdown (chargé à la demande).

- robustesse : entrées hostiles bornées (< 200 ms) ; bloc dans une liste ; aller-retour éditeur riche.

## Lots

- [ ] Lot 1 — types + parseur + scène
- [ ] Lot 2 — composant à la demande + câblage + Q48
- [ ] Lot 3 — Typst + compilation prod

## Journal
