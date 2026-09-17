# Progression — le tableau de signes affichable

Branche `feat/tableau-signes-affichable`. Fait suite au lot des inéquations,
dont la doc notait que le tableau de signes ne s'affichait nulle part.

## Le défaut

Les renderers pédagogiques composent le tableau de signes en
`\begin{array}{|c|ccc|}` avec des `\hline`. **MathLive ne connaît pas cet
environnement** — mesuré, il rend une boîte d'erreur — et `grep "begin{array}"`
hors `mathAST/` ne trouvait aucun composant capable de l'afficher autrement.

⚠️ **Le défaut dépassait l'atelier** : `correction-generator.ts` emploie les
mêmes étapes pour les corrections de questions, **en production**. Les deux
chemins affichaient une boîte d'erreur à l'élève.

## Ce qui existait déjà, et qu'on n'a pas réécrit

Relevé par David : ubumark a un bloc ` ```variation ` qui accepte une directive
`sign:` — un tableau de signes est un tableau de variations sans ligne de
variation. Et `VariationTable.svelte` (763 lignes) sait le dessiner : marqueurs
zéro / asymptote / valeur interdite, doubles barres, hachures, MathLive, mode
sombre. Il prend un `VariationTableNode` en prop, sans passer par le markdown.

Il manquait **un pont, et rien d'autre** : `grep VariationTableNode` dans
`mathAST/` et `questions/` ne trouvait rien. Les deux mondes s'ignoraient.

## Le principe : une seule source pour les signes

Le piège évident était de recalculer les signes côté affichage. Ils auraient
divergé un jour, et le tableau aurait contredit la conclusion affichée juste en
dessous.

Or `formatRationalSignTable` construisait **déjà** ses lignes en mémoire
(`xRow`, `pRow`, `qRow`, `fracRow`) avant d'assembler la chaîne LaTeX. On a donc
sorti cette construction :

```
operation ──> quadraticSignTableGrid / rationalSignTableGrid ──> SignTableGrid
                                                                  ├─> \begin{array}  (exports)
                                                                  └─> VariationTableNode  (écran)
```

`SignTableGrid` = `{ variable, points[], rows: { label, intervals[], marks[] }[] }`.
Aucun signe n'est recalculé nulle part.

### L'extraction a été protégée par caractérisation

`__tests__/sign-table-grid.test.ts` a figé le LaTeX **avant** toute
modification, en snapshots inline, sur quatre cas. L'extraction est donc
prouvée sans effet de bord — y compris sur deux détails de mise en forme qu'il a
fallu reproduire exactement :

- une case vide s'écrit `& &` (une espace), pas `&  &` ;
- la ligne ne se termine pas par une espace avant `\\`.

Un défaut préexistant a été conservé tel quel, faute de mandat : la
spécification de colonnes du tableau rationnel compte **une colonne de moins**
qu'il n'y a de cases (`numColumns - 2`). Noté ici, pas corrigé.

## Le trajet jusqu'à l'écran

`RenderedStep` gagne un champ facultatif `signTable?: SignTableGrid`, rempli par
`QuadraticEquationRenderer`. `expressionLatex` **reste** : les exports qui
composent les tableaux (Typst, PDF) en ont besoin, c'est l'écran qui n'en
voulait pas.

`GeneratedStepsCorrection.svelte` branche alors `VariationTable` quand l'étape
porte une grille, et retombe sur le LaTeX sinon. **Un seul point de câblage,
deux chemins réparés** : l'atelier et les corrections de questions.

Le contournement du lot précédent (`withoutUndisplayableLatex`, qui retirait le
LaTeX du tableau faute de mieux) a été supprimé.

## Les gardes, prouvées par neutralisation

| neutralisation                            | tests devenus rouges                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `{#if step.signTable}` remis sur le LaTeX | les 3 tests de rendu du tableau (`ML__error` réapparaît, plus aucun `<table>`) |
| l'extraction de la grille                 | les 4 snapshots de caractérisation                                             |

Le test de rendu monte `GeneratedStepsCorrection` pour de bon dans Chromium et
regarde le DOM : présence d'un `<table>`, absence de `ML__error`, classe
`vt-asymptote-bar-sign` pour la double barre du quotient, `vt-zero` pour les
zéros.

## Reste à faire

- **Le bouton « Résoudre » du panneau** passe toujours par l'ancien chemin.
- **Vérifier à l'écran** une correction de question employant un tableau de
  signes : le code est réparé, mais aucun test ne traverse ce chemin-là.
- **`2 1` au dénominateur** quand `a = 1`.
- La spécification de colonnes du `\begin{array}` rationnel, fausse d'une unité.
