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

## Trois bloquants trouvés par la revue, tous fermés

### 1. Un indice illisible était traité comme un 2

Mon helper rendait `null` quand il ne savait pas lire l'indice, et la règle ne
s'appliquait pas. Mais ne pas appliquer la règle ne laissait pas l'expression
tranquille : on retombait sur `normalizeSqrt`, **qui lit l'indice avec un défaut
silencieux à 2**. Mesuré, identique sur `main` et sur la première version :

| paire          | verdict | valeur réelle |
| -------------- | ------- | ------------- |
| `ⁿ√x² ≡ x`     | `true`  | `x^{2/n}`     |
| `¹√x² ≡ x`     | `true`  | `x²`          |
| `⁰√x² ≡ x`     | `true`  | indéfini      |
| `^{−2}√x² ≡ x` | `true`  | `1/x`         |

Quatre faux positifs, dans la classe même que la PR prétendait fermer. `ⁿ√x` est
une écriture de lycée. Un indice présent mais illisible rend désormais le nœud
**opaque**.

### 2. Le radicande négatif d'indice impair

`∛(−8)` normalisait en `√(−8)` : l'indice perdu, dans la forme normale. Le
court-circuit numérique élevait donc une valeur déjà corrompue.

| entrée   | `main` | 1ʳᵉ version | valeur réelle |
| -------- | ------ | ----------- | ------------- |
| `(∛−8)²` | `−8`   | **`64`**    | `4`           |
| `(∛−x)²` | `−x`   | **`x²`**    | `x^{2/3}`     |

Les deux colonnes sont fausses, mais la première version s'éloignait davantage.
Deux gardes ferment la voie : au-delà des branches qui respectent l'indice, un
radical d'indice supérieur reste opaque ; et la règle de puissance refuse un
radicande négatif. Le moteur affiche maintenant `(∛−8)²` sans le réduire, au
lieu de montrer une valeur fausse.

### 3. Une base somme n'était pas parenthésée

`superscript(addition(x, 1), 3/2)` se rendait `x + 1^{3/2}`, qui se relit
`x + (1^{3/2})`, soit `x + 1`. Le générateur LaTeX ne parenthèse pas par
priorité : il s'appuie sur un nœud délimiteur, que le parseur pose mais qu'une
construction interne peut ne pas poser.

**Préexistant, et sur un chemin élève** : trois snapshots du module de
dérivation l'enregistraient. La dérivée de `1/(x+1)` s'affichait `−1/(x + 1²)`.
Ce correctif-ci élargissait la surface du bug, d'où sa réparation ici.

## L'affichage bouge, et bien plus que ce que j'avais annoncé

J'avais écrit « douze déplacements sur 38 témoins, tous du faux vers le juste ».
La revue a mesuré sur **707 témoins** : **170 déplacements**.

| classe                         | nombre |
| ------------------------------ | ------ |
| faux → juste                   | **92** |
| juste → juste (écriture seule) | 7      |
| faux → faux                    | 34     |
| **juste → faux**               | **2**  |
| indécidable                    | 35     |

Les douze annoncés sont bien dans les 92, mais il en manquait 80 : **le gain est
sept fois plus large que je ne le disais**. Et « tous du faux vers le juste »
était faux : deux sorties justes devenaient fausses, ce sont celles du
bloquant 3, désormais corrigées. Les 34 « faux → faux » sont les radicandes
négatifs du bloquant 2, désormais opaques.

Mesure d'ensemble de la revue : `simplify` rendait une valeur fausse sur
**297 témoins sur 707** avec `main`, **209** avec la première version. Le
correctif répare beaucoup plus qu'il ne casse, et les deux bloquants fermés
retirent l'essentiel du reste.

C'est la quatrième fois que j'annonce un déplacement d'affichage sur un corpus
trop étroit. Cette fois il contenait bien la classe visée — mais pas ses
voisins, les indices illisibles et les radicandes négatifs.

## Noté, non traité

`(∛x)²` s'affiche `(∛x)²` alors que `x^{1/3}·x^{1/3}`, qui a la même forme
normale, s'affiche `∛(x²)`. Les deux sont justes, l'écriture diffère.

**Les produits de sommes ne sont pas parenthésés non plus.** Vu dans les
snapshots de dérivation : `2x(x−1) − (x²+1)` s'affiche `2 x x - 1 - x^2 + 1`.
C'est le même défaut que le bloquant 3, sur un autre type de nœud — une somme
sous un produit ou une soustraction. Non traité ici, et à voir : il est sur un
chemin élève.

**`∛(−8) ≡ −2` reste faux.** Le moteur ne sait pas évaluer une racine d'indice
impair d'un nombre négatif. C'est un faux négatif, qui remplace le faux positif
`∛(−8) ≡ √(−8)` de `main`.

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
