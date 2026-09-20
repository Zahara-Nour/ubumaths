# `(ⁿ√a)^k` vaut `a^{k/n}`, pas `a^{k/2}`

**Branche** `fix/racines-n-iemes-simplify` · 2026-09-21

## Le symptôme signalé, et la vraie cause

Le symptôme était dans `simplify` : `simplify(∛x·∛x)` rendait `x`, ce qui est
faux — la valeur est `x^{2/3}`. La trace montre `tidy` produisant `(∛x)²`, ce
qui est juste, puis l'étape suivante repliant ça en `x`.

La cause n'était donc pas dans `simplify` mais dans `normalize` : la règle
« puissance d'une racine » divisait l'exposant par **2**, en dur, alors que
l'indice est disponible sur le nœud.

| expression | forme normale sur `main` | valeur juste |
| ---------- | ------------------------ | ------------ |
| `(∛x)²`    | `x`                      | `x^{2/3}`    |
| `(∛x)³`    | `x^{3/2}`                | `x`          |
| `(⁴√x)²`   | `x`                      | `x^{1/2}`    |

**Deux de ces trois lignes étaient des faux positifs du décideur.**
`(∛x)² ≡ x` et `(⁴√x)² ≡ x` rendaient `true`. Un faux positif compte JUSTE une
réponse FAUSSE d'élève.

## Le même angle mort que la veille, ailleurs

`parseLatex('\sqrt[3]{x}')` rend une fonction nommée `sqrt` avec **un seul
argument**, l'indice étant rangé à part dans `base`. Tout test de la forme
`name === 'sqrt' && args.length === 1` confond donc `∛x` et `√x`. La PR #388
avait fermé ce trou dans la fusion des radicaux ; celui-ci était dans la mise
en puissance. **Il en reste peut-être ailleurs : le motif est à greper avant
d'écrire une règle sur les racines.**

## Le correctif

Un helper `radicalIndex` rend 2 quand il n'y a pas d'indice, l'indice quand
c'est un entier ≥ 2, et `null` quand il est là mais illisible — auquel cas la
règle ne s'applique pas. L'exposant se divise ensuite par cet indice.

Un second cas a dû être traité : `(∛8)²` partait sur `8^{2/3}`, que rien ne
sait évaluer ensuite, l'extraction de puissance parfaite ne traitant que les
carrés. Quand le radical vaut déjà un nombre — `∛8` vaut `2` — c'est ce nombre
qu'on élève.

## L'affichage bouge douze fois, toutes dans la classe visée

Empreinte de 38 témoins, **construite autour de la règle modifiée** : dix-sept
expressions à racine d'indice quelconque, onze racines carrées, dix témoins
généraux.

| entrée      | `main`   | branche |
| ----------- | -------- | ------- |
| `(∛x)²`     | `x`      | `(∛x)²` |
| `(∛x)³`     | `(∛x)³`  | `x`     |
| `(∛x)⁶`     | `x³`     | `x²`    |
| `(⁴√x)²`    | `x`      | `√x`    |
| `(⁴√x)⁴`    | `x²`     | `x`     |
| `(⁶√x)³`    | `(⁶√x)³` | `√x`    |
| `(∛x)^{−3}` | `√x/x²`  | `1/x`   |
| `(∛8)²`     | `8`      | `4`     |
| `∛x·∛x`     | `x`      | `(∛x)²` |
| `∛x·∛x·∛x`  | `(∛x)³`  | `x`     |
| `⁴√x·⁴√x`   | `x`      | `√x`    |

Les douze passent du **faux au juste**. Aucune racine carrée ne bouge, aucun
témoin général non plus.

## Noté, non traité

`(∛x)²` s'affiche `(∛x)²` alors que `x^{1/3}·x^{1/3}`, qui a la même forme
normale, s'affiche `∛(x²)`. Les deux sont justes, l'écriture diffère.

## Campagne

Indices 2 à 6 × exposants 1 à 8, croisés deux à deux, soit **1600 paires**,
chaque verdict vérifié en 8 points numériques : **0 faux positif, 0 faux
négatif**. Sur `main`, la même campagne est impossible à comparer telle quelle,
la forme normale y étant fausse dès l'indice 3.

## Vert

- `puissance-racine-n-ieme.test.ts` : 25/25 (15 étaient rouges)
- mathAST : 324 fichiers, 14 661 tests
- questions, utils, grapheur, transpilers, exercices : 89 fichiers, 4 185 tests
- `lint:fast` propre · `check:incremental` 0 erreur sur 1615 fichiers
