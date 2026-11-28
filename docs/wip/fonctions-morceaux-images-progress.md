# Chantier `fonctions-morceaux-images` — une image `j = f(3)` suit l'ensemble de f

## Reprendre ici

_Mis à jour le 2026-11-28, à l'ouverture de la PR._

- **État** : code + tests (`image-hors-ensemble.test.ts`, 10) verts ; revue `code-reviewer` faite, son bug (ensemble hérité lu en retard d'un passage) corrigé ; suites atelier vertes (8 241) ; `check:incremental` 0, cliquet tenu ; doc `atelier.md` (I4) à jour.
- **Prochaine action** : après le merge, archiver ce journal.
- **En attente de David** : rien.
- **Pièges en cours** : `f(x)` dans une autre fonction est un héritage, pas une image : jamais jugé (test).
- **Worktree / branche** : `../ubumaths-wt-fonctions-morceaux-images` · `fix/image-hors-ensemble`.

## Demande

Question (a) de la revue de #3298 : `j = f(3)` restait juste quand le curseur de k sortait 3 de
`[k;5]` (trou d'avant #3298 : le contrôle I4 n'existait qu'à la création). Recommandation
« oui, à corriger » suivie par David le 2026-11-28 (« je te suis ») ; la question (b), `ℝ \ {k}`,
n'est pas faite.

## Comportement

- `k = 2`, `f(x) = x sur [k;5]`, `j = f(3)` : j juste. Curseur de k à 4 : j en erreur, « 3 n'est
  pas dans l'ensemble de définition de f, [4 ; 5]. » ; ce qui cite j aussi. k à 2 : j revient.
- Même chose quand f est réécrite sur [4;5], et pour `g(x) = x + f(3)`, et pour une définition
  écrite dans le champ de la carte (`f\left(3\right)`).
- `g(x) = f(x) + 1` reste juste (héritage de l'ensemble, pas une image).

## Ce qui est fait

- `#recomputeOnce` : `outsideIntervalRefusal` sur chaque définition (hors constructions), en
  erreur propre ; `callsAsText` retire `\left(` `\right)` d'une définition LaTeX.
- Revue (Sonnet) : `j = g(3)` avec `g(x) = f(x) + 1` lisait l'ensemble hérité du passage
  d'avant (`#inheritIntervals` range en fin de passage) → le contrôle lit `intervals.inherited`
  du passage en cours (`withCurrentInheritance`). Laissés : message « a n'est pas dans… » sans la
  valeur de a (celui de Calcul), `\operatorname{f}` non lu.
