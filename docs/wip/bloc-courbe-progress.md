---
title: Bloc ubumark ```courbe — progression
date: 2026-10-01
status: en cours
branche: feat/bloc-courbe (worktree ../ubumaths-wt-courbe)
---

# Bloc ubumark ```courbe

Spécification validée par David le 2026-10-01. Point de reprise en cas de crash.

## Syntaxe (v1)

````
```courbe
x: -4 ; 6
y: -8 ; 12
grille: 1 ; 2
f(x) = {{a}}*(x-{{x1}})*(x-{{x2}})   bleu   nom=C_f
g(x) = 2*x+1 sur [-1 ; 4]            rouge pointillé
points: A({{x1}};0), B({{x2}};0), S({{alpha}};{{beta}}), M(2 ; f(2))
asymptotes: x=2 ; y=1
aire: f ; {{x1}} ; {{x2}}
taille: moyenne
description: Parabole tournée vers le bas, coupant l'axe des abscisses en A et B.
```
````

**En v1** : fonctions (syntaxe maison `parseCustom`), domaine `sur [a;b]` / `]a;b]`…, fenêtre
x/y indépendante (repère anisotrope), grille + graduations (pas auto `computeGridStep` si
`grille` absent ; étiquettes avec virgule décimale française), points nommés à coordonnées
calculées dont `f(2)`, asymptotes données (pointillés), aire entre la courbe et l'axe sur
[a;b], couleurs + pointillé, nom de courbe en LaTeX.

**Pas en v1** : tangente, détection auto racines/extremums/asymptotes, survol, curseurs, suites,
paramétriques/implicites, saisie graphique, export LaTeX, masquage des graduations.

## Socle

Module NEUF branché sur les briques PURES du grapheur : `geometry-core/viewport/sampler.ts`
(`sampleFunction`), `mathAST/eval/compile.ts` (`createSafeEvaluator`),
`geometry-core/viewport/grid.ts` (`computeGridStep`). PAS `courbe()` de geometry-core (repère
isotrope, exporteurs sans `function`).

## Architecture

- `ubumark/types/courbe.ts` + `ubumark/parser/courbe-parser.ts` (modèle : `number-line-parser.ts`).
- `ubumark/utils/courbe-scene.ts` PUR : échantillonne, coupe aux discontinuités et aux bords de
  fenêtre, produit des primitives en coordonnées mathématiques (polylignes, points, étiquettes,
  graduations, polygones d'aire).
- `components/markdown/nodes/Courbe.svelte` : SVG statique, sans store, couleurs `var(--color-*)`,
  `role="img"`, `aria-label` auto « Courbe de f, x de −4 à 6 », `description:` prioritaire.
- `ubumark/generators/courbe-typst.ts` : la MÊME scène en cetz 0.3.0.
- Câblage : union `BlockNode`, 2 sites de `markdown-parser.ts` (priorités + blocs en liste),
  `MarkdownRenderer.svelte`, `ListNode.svelte`, `typst-generator.ts`, import de l'éditeur riche
  (`markdown-import.ts`, sinon le bloc disparaîtrait à l'aller-retour), `check:ubumark`.
- Variables de template déjà remplacées avant le parse : gérer `x--2`, `+-3`.

## Décisions

- **Q48 (erreurs)** : aujourd'hui une erreur de parse fait disparaître un bloc en silence. Pour
  `courbe`, l'erreur produit un nœud d'erreur : message détaillé (n° de ligne) visible pour le
  prof dans l'éditeur / l'aperçu, cadre neutre « Figure indisponible » pour l'élève. Le contexte
  prof est une prop EXPLICITE du renderer (défaut = élève). Les autres blocs ne changent pas.
- **Q49-Q53** : périmètre v1 ci-dessus (fenêtre anisotrope, grille auto, aire sur l'axe, couleurs,
  nom LaTeX) ; socle = briques pures du grapheur, pas `courbe()` de geometry-core.
- **Q54** : points à coordonnées calculées, y compris `M(2 ; f(2))` (point posé sur la courbe).
  Masquage des graduations : plus tard.

## Comportements à tester (validés)

1. bloc minimal → nœud `courbe` ; `{{a}}` remplacé avant ; `x--2` lu `x+2`.
2. `sur [0;6]` / `sur ]0;6]` : courbe arrêtée aux bornes ; fermée = disque plein, ouverte = vide.
3. `1/(x-2)` : pas de trait vertical à travers l'asymptote (polyligne coupée).
4. courbe sortant de la fenêtre découpée au bord ; point hors fenêtre non dessiné + avertissement.
5. grille auto, graduations aux multiples du pas, `0,5` en français.
6. `aire: f ; a ; b` → polygone ; a > b ou fonction inconnue = erreur.
7. erreurs (y ≤ ymin, expression illisible, clé inconnue, fonction pas en x) → message situé
   (ligne), bloc pas silencieux (Q48).
8. bloc reconnu en retrait sous un item de liste.
9. le Typst produit COMPILE en conditions de production (typst.ts 0.6.1-rc5 + cetz 0.3.0), sur
   un document en mode corrigé.
10. même scène → même nombre de polylignes et de points à l'écran et dans Typst.
11. SVG `role="img"` + `aria-label` (description prioritaire).
12. `M(2 ; f(2))` : point placé sur la courbe (Q54).

## Lots

- [x] Lot 1 — types + parseur + scène (`types/courbe.ts`, `parser/courbe-parser.ts`, `utils/courbe-scene.ts`, 36 tests rouges avant : module absent)
- [x] Lot 2 — composant + câblage + listes + Q48
- [ ] Lot 3 — Typst + compilation prod

## Journal

- 2026-10-01 lot 1 : parseur + scène verts (36 tests, `src/lib/ubumark/__tests__/courbe/`).
  Choix : nom de courbe en LaTeX RESTREINT (`C_f`, `\mathcal{C}_f`) → pas de `{@html}`, même
  rendu SVG/Typst ; `pi` nu et `π` → `\pi` ; `{,}` → `.` ; points/aires/asymptotes lus APRÈS
  les fonctions (`M(2 ; f(2))` avant la ligne de f fonctionne) ; les avertissements de
  fenêtre (point, asymptote, courbe invisible) sont produits par la scène.
- 2026-10-01 lot 2 : `Courbe.svelte` (SVG, `role="img"`), câblage parseur (2 sites), renderer,
  `ListNode`, import de l'éditeur riche (bloc de code `courbe` porteur du texte : sans lui, le
  bloc DISPARAISSAIT à l'aller-retour — preuve rouge faite), `check:ubumark` signale les blocs en
  erreur / hors fenêtre.
  Q48 : contexte `components/markdown/authoring-errors.ts` + prop `showAuthoringErrors` de
  `MarkdownRenderer` (défaut élève, hérité par les rendus imbriqués), posée dans
  `MarkdownEditor` (aperçu), `RichTextEditor` (aperçu), `QuestionPreview` (formulaire de modèle)
  et la page prof `contenu/exercices/[id]`. Preuve rouge : neutraliser la prop → 3 tests rouges.
  Couleurs : tokens `--color-info/destructive/warning/foreground/muted-foreground` ; vert et
  violet n'ont pas de token → variables locales `light-dark()` dans le composant.
  Le parseur repère `courbe` dans `lines` ET `originalLines` (appariés par rang) : robuste à une
  formule `$$` multi-lignes placée avant (les blocs `line`/`trig` ne le sont pas — hors périmètre).
