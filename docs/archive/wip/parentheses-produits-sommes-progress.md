# Parenthéser une somme là où l'omettre change le sens

**Branche** `fix/parentheses-produits-sommes` · 2026-09-21

## Le défaut

Le générateur LaTeX ne parenthèse pas par **priorité** : il s'appuie sur la
présence d'un nœud **délimiteur**, que le parseur pose mais qu'une construction
interne — `differentiate`, `normalize`, `tidy`, les règles pédagogiques — ne
pose pas. Une somme se retrouvait donc nue là où elle ne devrait pas.

| expression  | rendu sur `main` | se relit    |
| ----------- | ---------------- | ----------- |
| `(x+1)·y`   | `x + 1 y`        | `x + y`     |
| `y·(x+1)`   | `y x + 1`        | `xy + 1`    |
| `2·(x−1)`   | `2 x - 1`        | `2x − 1`    |
| `y − (x+1)` | `y - x + 1`      | `y − x + 1` |

**Ce que l'élève voyait.** La dérivée de `(x²+1)/(x−1)` affichait son numérateur
`2x(x−1) − (x²+1)` sous la forme `2 x x - 1 - x^2 + 1`. La factorisation
`x² − 4 = (x−2)(x+2)` s'affichait `x² − 4 = x - 2 x + 2`.

## Le correctif

Une somme est parenthésée à trois endroits, et seulement là où l'omettre change
le sens :

- les **deux** opérandes d'une multiplication ;
- l'opérande **droit** d'une soustraction ;
- les deux membres d'une division **en ligne** (`\dfrac` groupe déjà).

Là où c'est inutile, rien n'est posé : `y + (x+1)` reste `y + x + 1`,
l'addition étant associative, et `(x+1) − y` reste `x + 1 - y`. Alourdir ce que
lit l'élève serait une régression aussi.

## ⚠️ Ce que le rendu masquait : une règle pédagogique FAUSSE

La règle `distribute-binomial-product` produisait une expression
mathématiquement fausse pour les deux combinaisons où le premier binôme est une
différence. Elle appliquait un signe **inversé** à la seconde paire :

| entrée       | ce que la règle produisait | valeur juste        |
| ------------ | -------------------------- | ------------------- |
| `(a−b)(c−d)` | `ac − ad − bc − bd`        | `ac − ad − bc + bd` |
| `(a−b)(c+d)` | `ac + ad − bc + bd`        | `ac + ad − bc − bd` |

Mesuré : en `x = 3, y = 5`, `(x−1)(y−2)` vaut **6** et la sortie de la règle
valait **2**.

**Son test de signes était vert**, parce qu'il comparait une **chaîne** et que
le générateur ne parenthésait pas l'opérande droit d'une soustraction : la
chaîne `xy-x2-1y+12` paraissait juste alors que l'arbre était
`(xy − x2) − (1y + 12)`. Le bug de rendu masquait le bug de signe.

Les quatre combinaisons sont désormais vérifiées **numériquement**, en quatre
points, et non par leur rendu.

## Huit snapshots actualisés, et tous ne corrigent pas une valeur

Sur les dix-huit paires distinctes du diff, la revue a vérifié chacune sur sept
points. **Treize vont du faux vers le juste, cinq sont à valeur inchangée.**
J'avais présenté les huit comme des corrections : c'était trop rapide.

Les corrections réelles, dont la plus parlante :

```
- \dfrac{2 x x - 1 - x^2 + 1}{(x - 1)^2}      valeurs [0.18, 3.36, 1.88, …]
+ \dfrac{2 x (x - 1) - (x^2 + 1)}{(x - 1)^2}  valeurs [-3.08, -0.39, 0.73, …]
  dérivée exacte, calculée à part               [-3.08, -0.39, 0.73, …]
```

Et une qui divisait par zéro **au point même de la limite** : l'ancien rendu
`\dfrac{-1}{-1 2 + \sqrt x}` s'annulait en `x = 4`.

Les cinq à valeur inchangée sont des facteurs `1` parasites produits en amont
par `pedagogical-limits` : `x - 2 1` devient `(x - 2) 1`, et
`\dfrac{1}{1 \sqrt x + 2}` devient `\dfrac{1}{1(\sqrt x + 2)}`. Le nouveau
rendu est plus fidèle à l'arbre, mais deux d'entre eux **alourdissent la lecture
sans rien corriger**. Le coupable est le `1·` parasite, pas la parenthèse.

## Le générateur maison avait le même défaut

Mesuré par la revue : **31 aller-retours infidèles sur 61** nœuds construits,
avec `toCustom`. Les deux générateurs avaient même **divergé** — le garde-fou
sur une base somme d'une puissance existait côté LaTeX et pas côté maison, si
bien que `(x+1)^2` s'écrivait `x+1^2`.

Les deux utilisent désormais le **même prédicat**, `needsParenthesesUnderSign`
de `common/sign-parentheses.ts`, qu'ils importaient déjà tous les deux pour le
signe unaire. C'est la même question, posée aux mêmes endroits.

## À trancher : la forme de l'étape « on distribue »

La règle construit `(ac − ad) − (bc − bd)`, pas les quatre termes plats que son
docstring annonce. Tant que le générateur ne parenthésait pas, la différence ne
se voyait pas. Maintenant l'élève lit, à l'étape « On distribue chaque terme » :

```
2 x x + 2 x 4 - \left( 3 x + 3 4 \right)
```

Le résultat final reste juste. C'est un arbitrage pédagogique, pas un bug, et
**le test fige la forme groupée** : si on veut les quatre termes plats, il
faudra le changer aussi.

## Vert

- `latex-parentheses-sommes.test.ts` : 23/23 (11 étaient rouges)
- `distribute-binomial-product.test.ts` : 14/14, dont 4 cas numériques neufs
- mathAST : 325 fichiers, 14 709 tests
- questions, utils, grapheur, transpilers, exercices, composants : 113 fichiers, 4 898 tests
- client : 96 fichiers, 1 422 tests
