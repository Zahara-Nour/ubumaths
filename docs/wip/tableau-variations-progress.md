# Progression — le tableau de variations affichable

Branche `feat/tableau-variations`. Même forme que
[`tableau-signes-affichable-progress.md`](tableau-signes-affichable-progress.md),
dont ce lot est la suite naturelle.

## Le défaut

L'action « Variations » du panneau rendait le bloc texte du moteur, capture à
l'appui :

```
Expression : x^2-3x+2
Derivee : f'(x) = 2x-3
Domaine : R (tous les reels)
Points critiques :
  x = 3/2 (f'=0)
Signe de f'(x) :
  ]-inf ; 3/2[ : -  (f decroissante)
  {3/2}        : 0  (f constante)
  ]3/2 ; +inf[ : +  (f croissante)
```

Sans un accent (« Derivee », « reels », « decroissante »), aligné à l'espace en
chasse fixe — alors que `VariationTable.svelte` dessine ce tableau depuis
toujours, flèches SVG comprises. Le composant s'appelle littéralement « tableau
de variations » et personne ne l'appelait pour ça.

## Le pont

```
computeVariations ──> variationTableNode ──> VariationTableNode ──> VariationTable.svelte
```

`src/lib/ubumark/builders/variation-table.ts`, à côté de `sign-table.ts` du lot
précédent. Il ne calcule **aucune** variation : sens, points critiques, extrema
et limites viennent tous de `computeVariations`. Recalculer ici ferait diverger
le tableau de ce que le reste de l'écran affirme.

Deux lignes : le signe de `f'(x)` et les variations de `f(x)`, étiquetées avec
le **nom de l'objet** — cliquer sur `g` donne `g'(x)` et `g(x)`, pas un `f`
générique.

### La position verticale se déduit, elle non plus ne se calcule pas

Un point précédé d'une descente et suivi d'une montée est un minimum, donc en
bas. Aux bornes, un seul voisin suffit. C'est tout : `positionAt(before, after)`.

### L'intervalle dégénéré devient un zéro

`computeVariations` insère un intervalle `[c ; c]` étiqueté « constant » à
chaque point critique — mesuré sur `x^2-3x+2`, qui rend
`decreasing | constant | increasing`. Ce n'est pas un intervalle : c'est le
point lui-même, et il devient le zéro de la ligne des signes.

## Le repli, et un défaut de `variations`

`1/x` se replie pour **deux** raisons cumulées :

1. son domaine n'est pas ℝ — une asymptote demande des doubles barres et des
   limites de part et d'autre, que cette version ne dessine pas ;
2. ⚠️ **défaut mesuré** : `computeVariations('1/x')` rend **quatre extrema**,
   tous situés en ±∞ et valant `\dfrac{1}{-\infty}`, pour une fonction qui n'en
   a aucun.

⚠️ **Aucune des deux gardes ne fait rougir le test à elle seule** — l'autre
rattrape ; il faut les retirer toutes les deux. C'est de la défense en
profondeur, pas deux gardes prouvées, et c'est écrit tel quel dans le test pour
que personne ne le croie plus fort qu'il n'est.

## Prouvé par neutralisation

| neutralisation                    | tests devenus rouges                                                     |
| --------------------------------- | ------------------------------------------------------------------------ |
| l'affichage `{#if entry.table}`   | les 3 tests de rendu (plus de `<table>`, plus de `vt-zero`, plus de SVG) |
| les deux gardes du repli ensemble | « une fonction à asymptote se replie »                                   |

Le test de rendu monte `CalculView` dans Chromium et regarde le DOM — pas le
nœud produit, ce qui atterrit à l'écran.

## Reste à faire

- **Les asymptotes** : doubles barres et limites de part et d'autre.
  `VariationValue` les prévoit (`limits`, `limitSide`, `marker: 'asymptote'`) ;
  c'est le lot suivant si David le veut.
- **Les quatre extrema fantômes de `1/x`** — à verser au prompt de correction
  de mathAST.
- **Vérifier à l'écran** une correction de question employant un tableau de
  signes (dette héritée du lot précédent).
