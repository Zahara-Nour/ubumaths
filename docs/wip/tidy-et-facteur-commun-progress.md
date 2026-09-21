# `factoriser` met au propre, et sort le contenu

**Branche** `feat/tidy-et-facteur-commun` · 2026-09-21

Deux demandes de David, et un piège de conception entre les deux.

## 1. `tidy` branché

L'intention `factoriser` coupe `normalize`, à juste titre puisqu'il défferait la
factorisation — mais **rien ne le remplaçait**, et les coefficients restaient
bruts : `(2/4)x + x` rendait `(2/4 + 1)x`. `tidy` est exactement l'outil qui
manquait : il met au propre sans jamais **développer**, c'est tout son contrat.

```
(2/4)x + x        ->  3x/2
(1/2)x + (1/3)x   ->  5x/6
2x + 3x           ->  5x
√8                ->  2√2
```

## 2. Le contenu sort : facteur numérique et monôme

`commonFactorRules` ne sortait que le facteur **symbolique**. Son en-tête disait
que le numérique était « laissé de côté » parce qu'il paraissait ambigu.
Décision de David, 2026-09-21 : il sort.

```
2x + 4        ->  2(x + 2)          x² + 2x     ->  x(x + 2)
6x + 9        ->  3(2x + 3)         x³ + x²     ->  x²(x + 1)
2x² + 4x      ->  2x(x + 2)         x²y + xy    ->  xy(x + 1)
6x²y + 9xy²   ->  3xy(2x + 3y)      3x² + 6x + 3 -> 3(x + 1)²
```

Le signe sort quand **tous** les termes sont négatifs — `−2x − 4` donne
`−2(x + 2)` et non `2(−x − 2)`. Seulement quand ils le sont tous : sur des
signes mélangés, sortir un signe déplacerait le problème sans rien factoriser.

## ⚠️ Le piège : le sens du parcours

Les règles s'appliquent **de bas en haut**, et `x² + 2x + 1` se parse
`((x² + 2x) + 1)`. La sous-somme est donc visitée **avant** le trinôme entier.
Appliquée là, la règle rendait `x(x+2) + 1`, et `perfect-square-trinomial` ne
reconnaissait plus rien.

La première parade recollait : quand un terme se décomposait en plusieurs
monômes, elle reconstituait la somme entière et relançait les identités. Ça
marchait, et ça coûtait trop cher :

- une étape de bruit apparaissait ;
- l'étape finale était attribuée à la règle de contenu, donc **la phrase « On
  reconnaît un trinôme carré parfait » disparaissait** — dans un module qui
  existe pour sa narration, c'est le pire endroit où payer ;
- une entrée à demi factorisée comme `x(x+1) + 2` ressortait développée.

Trois snapshots et un test de pipeline cassaient pour cette raison.

**La parade est remplacée par une condition sur le parcours** : la règle ne
s'applique qu'aux sommes **maximales**, celles qui ne sont pas elles-mêmes un
terme d'une somme plus grande. Les identités voient donc la somme entière en
premier, et ce qui reste est un contenu à sortir. On relance ensuite la phase A
pour que les identités voient la somme intérieure — c'est ce qui donne
`3x² + 6x + 3 → 3(x+1)²`.

Restreindre à la seule **racine** ne suffisait pas : `x²y + xy` passe d'abord
par la mise en facteur symbolique, qui rend `y(x² + x)`. La somme `x² + x` n'est
plus à la racine, mais elle est maximale, et elle a bien un contenu à sortir.

Résultat : les six échecs disparaissent, aucun snapshot n'est touché, la
narration est intacte et `x(x+1) + 2` reste intact.

## L'ordre des facteurs vient de la factorisation, pas de `tidy`

`tidy` range les facteurs dans son ordre canonique, et écrivait donc
`e^x(x+1)` là où la factorisation avait produit `(x+1)e^x`. Les deux écritures
sont justes, mais c'est la seconde qu'on écrit au tableau pour une dérivée, et
l'ordre vient d'une factorisation que l'élève vient de suivre : le moteur n'a
pas à la rebattre. **Décision de David, 2026-09-21.**

La mise au propre s'applique donc à chaque facteur d'un produit **séparément**,
en gardant l'ordre. Tout ce qui n'est pas un produit passe par `tidy` entier :

```
e^x + xe^x        ->  (x+1)e^x          l'ordre de la factorisation
(2/4)x + x        ->  (3/2)x            le coefficient est mis au propre
√8                ->  2√2               pas un produit factorisé
2x + 3x           ->  5x
```

Conséquence assumée : la règle symbolique écrit `(somme)·facteur`, donc
`xy + x` rend `(y+1)x` et non `x(y+1)`. C'est le même ordre que `(x+1)e^x`.

## L'affichage

Empreinte de **140 rendus** — 35 expressions × 4 intentions — construite autour
de la classe visée : **24 déplacements, tous sous `factoriser`**. Zéro sous
`developper`, `reduire` et `auto`, ce qui est attendu puisque les règles de
contenu n'entrent que dans cette intention.

Les 24 sont des factorisations obtenues ou des mises au propre. Aucune sortie
n'est devenue fausse.

## Vert

- `facteur-commun-et-tidy.test.ts` : 22/22 (13 étaient rouges)
- mathAST : 326 fichiers, 14 744 tests
