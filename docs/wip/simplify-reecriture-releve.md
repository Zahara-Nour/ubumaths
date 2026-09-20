# `simplify()` — relevé mesuré du 2026-09-20

> Répond aux livrables **1** (relevé du Compute Engine, obtenu en l'exécutant) et
> **2** (Q2, Q3) du brief [simplify-reecriture-prompt.md](simplify-reecriture-prompt.md).
> Le livrable **3** (colonne « attendu » figée) attend David : §7.
>
> **Tout ce qui suit a été exécuté.** Aucune ligne ne vient d'une lecture de
> source. Les scripts sont en annexe et rejouent l'ensemble en ~2 s.
>
> ✅ **Les 4 bugs du §6 sont corrigés** (branche `fix/simplify-4-bugs`,
> [simplify-4-bugs-progress.md](simplify-4-bugs-progress.md)). Le §4 et le
> §6.4 ont été corrigés le même jour : la règle `pythagorean` n'était pas
> « morte », elle ne tirait que sur une des deux formes de l'AST.

---

## 0. Comment le Compute Engine a été exécuté

`extern/compute-engine` (v0.30.2, dépôt git propre, non suivi par le nôtre)
n'avait ni `node_modules` ni `dist`. Pas besoin de son build :

```bash
cd extern/compute-engine
npm install --omit=dev --ignore-scripts --no-audit --no-fund   # 2 deps runtime, 27 paquets, 528 Ko, 0,8 s
# puis, depuis la racine du dépôt, avec NOTRE tsx :
./node_modules/.bin/tsx <script important extern/compute-engine/src/compute-engine/index.ts>
```

Le panel complet passe en **0,9 s** chez CE, **0,65 s** chez nous. Rien de
lourd pour la machine.

⚠️ CE parse du **LaTeX** ; le panel a été traduit ligne à ligne (annexe A). CE
n'a pas d'unités : `12\,\mathrm{km}` devient `12 * "km"` (une chaîne).

---

## 1. Le panel, trois colonnes mesurées

Colonnes : **nous** = `simplify()` mathAST (sortie `toCustom`) · **CE canon** =
`ce.parse(…)` seul (forme canonique, avant toute règle) · **CE simplify** =
`.simplify()` de CE. `=` signifie « identique à la colonne de gauche ».

### Fractions

| entrée      | nous        | CE canon    | CE simplify | note                                                      |
| ----------- | ----------- | ----------- | ----------- | --------------------------------------------------------- |
| `2/6+1/4`   | `7/12`      | `1/4 + 1/3` | `7/12`      |                                                           |
| `1/2+1/3`   | `5/6`       | `1/3 + 1/2` | `5/6`       |                                                           |
| `3/6`       | `1/2`       | `1/2`       | =           |                                                           |
| `2/4*6/8`   | `3/8`       | `1/2 * 3/4` | `3/8`       |                                                           |
| `(2x)/(4y)` | `{2x}/{4y}` | `x / (2y)`  | =           | **CE mieux**, et dès la canonique. Voir aussi le bug §6.1 |

### Radicaux

| entrée             | nous        | CE canon           | CE simplify | note                                               |
| ------------------ | ----------- | ------------------ | ----------- | -------------------------------------------------- |
| `sqrt(8)`          | `sqrt(8)`   | `sqrt(8)`          | =           | **les deux échouent**                              |
| `sqrt(12)+sqrt(3)` | `3sqrt(3)`  | `sqrt(3)+2sqrt(3)` | `3sqrt(3)`  | CE extrait `√12 → 2√3` en canonique, pas `√8` seul |
| `sqrt(2)*sqrt(8)`  | `4`         | `sqrt(2)*sqrt(8)`  | `4`         |                                                    |
| `sqrt(9)`          | `3`         | `3`                | =           |                                                    |
| `1/sqrt(2)`        | `1/sqrt(2)` | `sqrt(2)/2`        | =           | **CE mieux**, dès la canonique                     |

### Regroupement de termes semblables

| entrée     | nous   | CE canon         | CE simplify | note                           |
| ---------- | ------ | ---------------- | ----------- | ------------------------------ |
| `x+x`      | `x+x`  | `x + x`          | =           | **les deux échouent** (cf. §3) |
| `x^2+x^2`  | `2x^2` | `x^2 + x^2`      | =           | **CE échoue**, nous non        |
| `3x+2x-x`  | `4x`   | `2x + 3x - x`    | `4x`        |                                |
| `2x+3-x+1` | `x+4`  | `2x - x + 1 + 3` | `x + 4`     |                                |
| `x*x`      | `x^2`  | `x * x`          | `x^2`       |                                |
| `x*x*x`    | `x^3`  | `x * x * x`      | `x^3`       |                                |

Sondes complémentaires chez CE : `x+x+x`, `a+a`, `1x+1x` restent tels quels ;
`x+2x → 3x`, `2x+x → 3x`, `x^2+2x^2 → 3x^2`, `x+x-x → x`, `√3+√3 → 2√3`
marchent. Le regroupement de CE **rate exactement quand aucun coefficient
explicite n'apparaît** (sauf pour les radicaux, qui sont des littéraux
numériques chez eux).

### Polynômes mixtes

| entrée              | nous         | CE canon                     | CE simplify      | note                                                                 |
| ------------------- | ------------ | ---------------------------- | ---------------- | -------------------------------------------------------------------- |
| `(x+1)^2`           | `(x+1)^2`    | `(x + 1)^2`                  | =                | ✓ les deux gardent la forme factorisée                               |
| `(x+1)^2-x^2`       | `2x+1`       | `-x^2 + (x + 1)^2`           | =                | **CE échoue** (leur 🙁), nous non                                    |
| `(3x+2)^2-x^2+5x-3` | `8x^2+17x+1` | `-x^2 + (3x + 2)^2 + 5x - 3` | `8x^2 + 17x + 1` | ⚠️ **le brief disait « CE échoue » : faux**                          |
| `(3x+2)^2+5x-3+2x`  | `9x^2+19x+1` | `(3x + 2)^2 + 2x + 5x - 3`   | `9x^2 + 19x + 1` | était « ? » dans le brief                                            |
| `(x+1)*(x-1)`       | `x^2-1`      | `(x - 1) * (x + 1)`          | `x^2 - 1`        | les deux développent                                                 |
| `2*(x+h)^2-2*x^2`   | `4hx+2h^2`   | `-2x^2 + 2(h + x)^2`         | =                | **CE échoue** (leur 🙁) ; chez nous accepté **d'un point** (34 → 33) |

### Produits et coefficients

| entrée        | nous        | CE canon            | CE simplify  | note                                            |
| ------------- | ----------- | ------------------- | ------------ | ----------------------------------------------- |
| `2*3*x`       | `6x`        | `2 * 3 * x`         | `6x`         |                                                 |
| `3*(x+1)^2*2` | `6*(x+1)^2` | `2 * 3 * (x + 1)^2` | `6(x + 1)^2` | le `*` est **celui de l'entrée**, conservé (§4) |
| `x*(x+1)`     | `x^2+x`     | `x * (x + 1)`       | `x^2 + x`    | Q4 — les deux développent                       |
| `2*x*3*y`     | `6xy`       | `2 * 3 * x * y`     | `6x * y`     |                                                 |

### Dérivées

| entrée                  | nous                 | CE canon                     | CE simplify        | note                              |
| ----------------------- | -------------------- | ---------------------------- | ------------------ | --------------------------------- |
| `2*3*x*(x^2+1)^2`       | `6*x*(x^2+1)^2`      | `2 * 3 * x * (x^2 + 1)^2`    | `6x * (x^2 + 1)^2` | LaTeX CE : `6x(x^2+1)^2`          |
| `exp(x)+x*exp(x)`       | `xexp(x)+exp(x)`     | `x * e^x + e^x`              | =                  | hors périmètre, les deux laissent |
| `2*x*sin(x)+x^2*cos(x)` | `x^2cos(x)+2xsin(x)` | `cos(x) * x^2 + 2x * sin(x)` | =                  | CE met `cos(x)` **avant** `x²`    |

### Fractions rationnelles

| entrée             | nous  | CE canon                   | CE simplify | note          |
| ------------------ | ----- | -------------------------- | ----------- | ------------- |
| `(x^2-1)/(x+1)`    | `x-1` | `(x^2 - 1) / (x + 1)`      | =           | **CE échoue** |
| `(x^2+2x+1)/(x+1)` | `x+1` | `(x^2 + 2x + 1) / (x + 1)` | =           | **CE échoue** |
| `x/x`              | `1`   | `1`                        | =           |               |

### Trigo, exp, log

| entrée              | nous                | CE canon              | CE simplify | note                       |
| ------------------- | ------------------- | --------------------- | ----------- | -------------------------- |
| `sin(x)^2+cos(x)^2` | `cos(x)^2+sin(x)^2` | `sin(x)^2 + cos(x)^2` | =           | **les deux échouent** (§4) |
| `exp(x)*exp(2x)`    | `exp(3x)`           | `e^x * e^(2x)`        | =           | **CE échoue**              |
| `ln(exp(x))`        | `x`                 | `ln(e^x)`             | `x`         |                            |
| `sin(0)`            | `0`                 | `sin(0)`              | `0`         |                            |

### Signes

| entrée      | nous        | CE canon   | CE simplify | note                                      |
| ----------- | ----------- | ---------- | ----------- | ----------------------------------------- |
| `-(-x)`     | `x`         | `x`        | =           |                                           |
| `x+(-3)`    | `x-3`       | `x - 3`    | =           |                                           |
| `(-x)/(-y)` | `{-x}/{-y}` | `x / y`    | =           | **CE mieux**, dès la canonique ; bug §6.1 |
| `-(x+2)`    | `-(x+2)`    | `-(x + 2)` | `-x - 2`    | CE distribue ; LaTeX CE : `(-2)-x` (laid) |

### Neutres et unités

| entrée              | nous          | CE canon       | CE simplify   | note                                        |
| ------------------- | ------------- | -------------- | ------------- | ------------------------------------------- |
| `x+0`, `x*1`, `x*0` | `x`, `x`, `0` | `x`, `x`, `0x` | `x`, `x`, `0` |                                             |
| `12[km]`            | `12`          | `12 * "km"`    | =             | nous perdons l'unité (§6.3) ; CE n'en a pas |

---

## 2. Ce que le relevé change au brief

| le brief disait                                          | mesuré                                                                                                                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « `(3x+2)²−x²+5x−3` : CE échoue »                        | **Faux.** CE rend `8x²+17x+1`. Le 🙁 de leur suite porte sur `(x+1)²−x²` et `2(x+h)²−2x²` seulement                                                                                             |
| « `x+x → 2x` chez CE » (déjà marqué ❌)                  | Confirmé faux : `x+x` reste `x+x`                                                                                                                                                               |
| « leur canonique ne regroupe pas les termes semblables » | Confirmé (`x+x`, `x²+x²` en canonique). Mais leur `simplify` regroupe `x+2x`, `2x²+3x²`, `√3+√3` — pas `x+x`                                                                                    |
| « `isCheaper` : biais 1,2 »                              | Confirmé, et mesuré à l'œuvre : `(x+1)²−x²` a un ratio 1,44 → refusé ; `(3x+2)²−x²+5x−3` a 1,15 → accepté                                                                                       |
| « leurs deux 🙁 »                                        | **Deux causes différentes** : `(x+1)²−x²` = seuil de coût (leur `Expand` rend bien `2x+1`) ; `2(x+h)²−2x²` = leur `Expand` ne distribue pas `2(h+x)²` (mesuré : `Expand` rend `-2x² + 2(h+x)²`) |
| « `sortTermsAndFactorsAST` rend `3x+2x−x → −x+2x+3x` »   | Confirmé sur l'entrée brute                                                                                                                                                                     |
| « la règle `pythagorean` ne se déclenche jamais »        | **Vrai pour `\sin(x)^2` et la syntaxe maison, faux pour le LaTeX `\sin^2(x)`** — là elle tire (test existant vert). Raison au §4                                                                |
| « `areEquivalent((-x)/(-y), x/y)` faux — à élucider »    | **Élucidé** : bug de la forme normale des quotients (§6.1)                                                                                                                                      |

---

## 3. La mécanique commune à presque tous les ratés : la barrière compare à l'ENTRÉE

`simplify()` = `normalizePass` → règles → coût. Pour chaque cas manqué, voici ce
que **`normalizePass` seul** produit, et ce que la barrière en fait :

| entrée              | coût entrée | `normalizePass` seul | coût | verdict                                         | `simplify` rend |
| ------------------- | ----------- | -------------------- | ---- | ----------------------------------------------- | --------------- |
| `x+x`               | 5           | `2x`                 | 9    | **rejeté** (9 > 5)                              | `x+x`           |
| `a+a`               | 5           | `2a`                 | 9    | **rejeté**                                      | `a+a`           |
| `x+x+x`             | 9           | `3x`                 | 9    | accepté (égalité, `<=` final)                   | `3x`            |
| `x^2+x^2`           | 13          | `2x^2`               | 13   | accepté (égalité)                               | `2x^2`          |
| `x+2x`              | 13          | `3x`                 | 9    | accepté                                         | `3x`            |
| `sqrt(8)`           | 6           | `2sqrt(2)`           | 14   | **rejeté** (14 > 6)                             | `sqrt(8)`       |
| `sqrt(12)+sqrt(3)`  | 16          | `3sqrt(3)`           | 14   | accepté                                         | `3sqrt(3)`      |
| `-(x+2)`            | 9           | `-x-2`               | 10   | **rejeté** (10 > 9)                             | `-(x+2)`        |
| `(x+1)^2`           | 9           | `x^2+2x+1`           | 21   | **rejeté** (21 > 9) — c'est **voulu**           | `(x+1)^2`       |
| `2*(x+h)^2-2*x^2`   | 34          | `4hx+2h^2`           | 33   | accepté **d'un point**                          | `4hx+2h^2`      |
| `12[km]`            | 3           | `12`                 | 2    | accepté : l'unité est déjà perdue AVANT le coût | `12`            |
| `1/sqrt(2)`         | 15          | `1/sqrt(2)`          | 15   | — `normalize` ne rationalise pas                | `1/sqrt(2)`     |
| `(-x)/(-y)`         | 18          | `{-x}/{-y}`          | 18   | — `normalize` ne réduit pas les signes          | `{-x}/{-y}`     |
| `(2x)/(4y)`         | 26          | `{2x}/{4y}`          | 26   | — `normalize` ne réduit pas les coefficients    | `{2x}/{4y}`     |
| `sin(x)^2+cos(x)^2` | 33          | `cos(x)^2+sin(x)^2`  | 33   | — la règle ne matche pas (§4)                   | inchangé        |

**Lecture.** `normalize` **sait déjà** rendre `2x`, `2√2`, `−x−2` : c'est le
barème qui les refuse, parce qu'un coefficient (multiplication = 7) coûte plus
qu'une répétition (addition = 3). Et c'est **le même mécanisme** qui protège
`(x+1)²` du développement. Avec ce barème, « `x+x → 2x` » et « `(x+1)²` reste »
ne peuvent pas être obtenus **tous les deux** par une comparaison de coût
contre l'entrée : ils sont du même côté de la barrière.

Le barème de CE ne change rien à l'affaire : chez eux aussi `x+x` (5) → `2x` (9)
dépasse le seuil (9 > 1,2 × 5). Leur barème diffère surtout sur les puissances
et les littéraux : mesuré, `x²` = 1, `(x+1)²` = 1, `2√2` = 2, `√2/2` = 2 chez CE
contre 5, 9, 14, 15 chez nous (écarts documentés comme « assumés » dans
`simplify/cost.ts`). C'est ce qui rend leur porte **plus** permissive au
développement (`(3x+2)²−x²+5x−3`) et pourtant pas assez pour `(x+1)²−x²`.

Trois cas ne relèvent **pas** de la barrière mais de `normalize` lui-même :
`1/√2` (pas de rationalisation), `(−x)/(−y)` et `(2x)/(4y)` (coefficients du
quotient non réduits — et c'est un bug d'équivalence, §6.1).

---

## 4. Les règles de motif : ce qu'elles font vraiment sur le panel

Mesuré avec `verbosity: 'detailed'` (le seul niveau qui enregistre les règles ;
au niveau par défaut `steps` est vide, ce qui a d'abord fait croire à « 0 règle »).

Sur **38 entrées, les règles tirent sur 2** :

- `(x+1)^2` : `normalizePass` développe en `x²+2x+1`, **`perfect-square-trinomial`
  re-factorise** en `(x+1)²`. Résultat = entrée.
- `(x+1)*(x-1)` : `normalizePass` développe en `x²−1`, `diff-squares-numeric`
  tente `(x+1)(x−1)` (coût 18), **la barrière le rejette** (18 > 10). Résultat
  `x²−1`.

Partout ailleurs : zéro règle. Tout le reste du panel (fractions, radicaux,
regroupement, `exp(x)·exp(2x) → exp(3x)`, `ln(exp(x)) → x`, quotients
rationnels) est l'œuvre de **`normalize` seul**.

**Pourquoi `pythagorean` ne tirait pas sur le panel.** L'AST a **deux formes**
pour `sin²(x)` : le nœud `function` avec `power` (produit par les parseurs pour
`\sin^2(x)`) et `superscript(function, 2)` (pour `\sin(x)^2` et la syntaxe
maison `sin(x)^2`). Le motif `P.func('sin', [P._('a')], { power: P.num(2) })`
n'apparie que la première ; `normalizePass` produit la seconde. `tryMatch`
direct sur les trois formes du panel (`sin²+cos²` maison, `cos²+sin²` maison,
sortie de `normalizePass`) : **non, non, non**. Mais le test existant
`simplifyLatex('\\sin^2(x) + \\cos^2(x)') → '1'` est vert : sur du LaTeX
`\sin^2`, la règle tire. (Première version de ce paragraphe : « morte depuis sa
naissance » — c'était trop dire, corrigé le jour même.)

**Le `*` explicite** (`6*(x+1)^2`, `6*x*(x^2+1)^2`) : c'est le `displayStyle`
de l'entrée qui survit à `normalize → denormalize`. Entrée implicite
`6x(x^2+1)^2` → sortie implicite ; entrée `3(x+1)^2*2` → `6(x+1)^2`. Question
d'affichage, pas de simplification.

---

## 5. Réponses aux questions du brief

### Q1 — Que rend vraiment le `simplify()` de CE ? → §1

**CE fait mieux** (4 cas, tous **dès la forme canonique**) : `x/(2y)`, `x/y`,
`√2/2`, `2√3` pour `√12`. Plus deux différences de rendu : `6(x+1)²` sans `*`,
et `−(x+2) → −x−2` (à trancher).

**CE fait moins bien** (7 cas) : `x²+x²`, `(x+1)²−x²`, `2(x+h)²−2x²`,
`(x²−1)/(x+1)`, `(x²+2x+1)/(x+1)`, `eˣ·e²ˣ`, et l'ordre `cos(x)·x²`.

**Égalité, les deux échouent** (4 cas) : `x+x`, `√8`, `sin²+cos²`, `eˣ+x·eˣ`
(hors périmètre).

### Q2 — Porter leur forme canonique / le mécanisme `Terms` ?

**Non, et c'est mesuré, pas raisonné.** Leur canonique regroupe **moins** que
notre `normalize` (`x²+x²` reste chez eux, pas chez nous), et leur `Terms`
rate `x+x`, `a+a`, `x+x+x`. Sur les 6 lignes de regroupement du panel, nous en
réussissons 5, CE 4. Le seul cas commun manqué, `x+x`, a chez nous une cause
qui n'est pas un manque de mécanisme : `normalize` **rend déjà `2x`** (hash
`2*V(x)`), c'est la barrière qui le refuse (§3). Il n'y a rien à porter.

Ce que CE fait mieux (`x/(2y)`, `x/y`, `√2/2`), il le fait dans sa
**canonicalisation des quotients et des radicaux numériques**, pas dans
`Terms`. Chez nous, c'est le chantier « forme normale des quotients » (§6.1),
qui est d'abord un bug d'équivalence.

### Q3 — Le pipeline cosmétique de `checkForm`, branché après `simplify` ?

Mesuré (`simplify` puis les 8 étapes de `buildASTPipeline`, dans l'ordre) :

| entrée                                                         | `simplify` seul      | `simplify` + cosmétique | verdict                 |
| -------------------------------------------------------------- | -------------------- | ----------------------- | ----------------------- |
| `(2x)/(4y)`                                                    | `{2x}/{4y}`          | `x/{2y}`                | ✅ réparé               |
| `(-x)/(-y)`                                                    | `{-x}/{-y}`          | `x/y`                   | ✅ réparé               |
| `3*(x+1)^2*2`                                                  | `6*(x+1)^2`          | `6(x+1)^2`              | ✅ réparé               |
| `2*3*x*(x^2+1)^2`                                              | `6*x*(x^2+1)^2`      | `6x(x^2+1)^2`           | ✅ réparé               |
| `2*x*sin(x)+x^2*cos(x)`                                        | `x^2cos(x)+2xsin(x)` | `cos(x)x^2+2xsin(x)`    | ❌ **abîmé** par le tri |
| `2*(x+h)^2-2*x^2`                                              | `4hx+2h^2`           | `2h^2+4hx`              | réordonné (à trancher)  |
| `x+x`, `sqrt(8)`, `1/sqrt(2)`, `-(x+2)`, `12[km]`, `sin²+cos²` | inchangé             | inchangé                | ❌ hors de sa portée    |

Donc : **quatre réparations, une casse, six cas hors de portée**. Les quatre
réparations sont exactement `reduceFractionsAST`, `removeSignsAST` et
`removeMultOperatorAST` ; la casse est `sortTermsAndFactorsAST` (confirmé
défectueux aussi sur l'entrée brute : `3x+2x−x → −x+2x+3x`). Le pipeline
**n'est pas une réponse**, mais trois de ses étapes ont un noyau réutilisable.

### Q4 — `x(x+1)` développé ou factorisé ? → David. Les deux moteurs développent.

---

## 6. Trouvé en chemin, hors périmètre de `simplify` — à traiter à part

### 6.1 ⚠️ `areEquivalent` est faux sur les quotients à coefficients

| paire                   | `areEquivalent` | hash A                | hash B             |
| ----------------------- | --------------- | --------------------- | ------------------ |
| `(-x)/(-y)` ≡ `x/y`     | **false**       | `(-1*V(x))/(-1*V(y))` | `(V(x))/(V(y))`    |
| `(2x)/(4y)` ≡ `x/(2y)`  | **false**       | `(2*V(x))/(4*V(y))`   | `(V(x))/(2*V(y))`  |
| `x/(-y)` ≡ `-x/y`       | **false**       | `(V(x))/(-1*V(y))`    | `(-1*V(x))/(V(y))` |
| `(-x)/y` ≡ `-(x/y)`     | true            |                       |                    |
| `(x^2-1)/(x+1)` ≡ `x-1` | true            |                       |                    |
| `(2x+2)/2` ≡ `x+1`      | true            |                       |                    |

La forme normale d'un quotient **ne réduit ni le signe ni le pgcd des
coefficients** entre numérateur et dénominateur. `normalize` est « le décideur
d'équivalence » et il sert à la validation des réponses : un élève qui écrit
`x/(2y)` pour `(2x)/(4y)` est compté faux. Ce n'est pas un chantier
`simplify`, c'est un **bug de correction**, à mesurer sur les appelants de
`areEquivalent` avant de le corriger (`normalize` « ne se touche pas » — sauf
qu'ici il est faux).

### 6.2 Le parseur maison lit `2sqrt(2)` comme `2·s·q·r·t·(2)`

AST vu : cinq multiplications imbriquées, variables `s`, `q`, `r`, `t`, puis
`(2)` entre parenthèses. `toCustom` réimprime `2sqrt(2)`, ce qui masque tout.
`2*sqrt(2)` et le LaTeX `2\sqrt{2}` parsent bien. Concerne le REPL et tout ce
qui parse la syntaxe maison avec un nombre collé à un nom de fonction.

### 6.3 `normalize` perd l'unité

`hashNormalForm(normalize(12[km]))` = `12`. La précaution prise dans
`cost.ts` (une unité ne coûte que 1 + son contenu) est sans effet : l'unité
est tombée avant que le coût n'arbitre.

### 6.4 La règle `pythagorean` (et les 31 motifs `f^n`) n'apparie qu'une des deux formes de l'AST

Cf. §4 : motif sur `function.power`, mais `\sin(x)^2`, la syntaxe maison et la
sortie de `normalize` sont en `superscript(function, 2)`. Et les deux formes
ont deux hash différents : `\sin^2(x) ≢ \sin(x)^2` pour `areEquivalent`.

---

### 6.5 `cosh²(x) − sinh²(x)` ne rend pas `1` (trouvé en corrigeant 6.4)

La règle algébrique `diff-squares-symbolic` tire avant `hyperbolic-pythagorean`
(qui apparie, mesuré) et produit `(cosh+sinh)(cosh−sinh)`, que post-normalize
replie sur l'entrée. Pinné en `it.todo` dans `simplify/__tests__/releve-bugs.test.ts`.

### 6.6 Les motifs `P.sub` n'apparient plus après `normalizePass`

`1 − sin²(x)` devient `−sin²(x) + 1` (addition d'un opposé) avant les règles,
et `P.sub(1, sin²)` n'apparie qu'une soustraction : `simplify` ne rend jamais
`cos²(x)`. Toutes les règles écrites avec `P.sub` ont ce problème dans
`simplify` — à traiter dans la réécriture.

---

## 7. À trancher par David — la colonne « attendu »

Les cases que le relevé **ne permet pas** de figer seul :

1. **`x+x → 2x` et `√8 → 2√2`** — oui dans le brief. Mais §3 montre que c'est le
   même mécanisme qui protège `(x+1)²`. Les obtenir impose de **ne plus juger
   le regroupement de termes semblables et l'extraction de radicaux par le
   coût contre l'entrée**, et de réserver la barrière au développement. Est-ce
   la ligne : « regrouper/réduire toujours, développer seulement si moins
   cher » ?
2. **`1/√2`** → `√2/2` (CE le fait) ou laisser ?
3. **`(x+1)(x−1)`** → `x²−1` (les deux moteurs) ou garder factorisé ?
4. **`x(x+1)`** → Q4.
5. **`−(x+2)`** → `−x−2` (CE) ou garder ?
6. **`2x·sin(x) + x²·cos(x)`** → ordre : degré de `x` décroissant
   (`x² cos(x) + 2x sin(x)`, ce que nous rendons) ?
7. **`2(x+h)²−2x²`** → `4hx+2h²` (nous, ordre actuel) ou `2h²+4hx` ?
8. **`12[km]`** → `12 km` : oui, mais c'est un bug de `normalize` (§6.3), pas
   un réglage de `simplify` — le corriger là ?

Et deux décisions de chantier, hors panel :

- le bug d'équivalence §6.1 : avant, pendant, ou après la réécriture ?
- la règle `pythagorean` §6.4 : réparer le motif (petit) ou attendre la
  réécriture ?

---

## Annexe A — le lanceur CE (à coller dans un `.ts`, lancer avec `./node_modules/.bin/tsx`)

```ts
import { ComputeEngine } from '/chemin/vers/ubumaths/extern/compute-engine/src/compute-engine/index.ts';
const ce = new ComputeEngine();
// [entrée maison, LaTeX donné à CE]
const PANEL: [string, string][] = [
	['2/6+1/4', '\\frac{2}{6}+\\frac{1}{4}'],
	['1/2+1/3', '\\frac{1}{2}+\\frac{1}{3}'],
	['3/6', '\\frac{3}{6}'],
	['2/4*6/8', '\\frac{2}{4}\\cdot\\frac{6}{8}'],
	['(2x)/(4y)', '\\frac{2x}{4y}'],
	['sqrt(8)', '\\sqrt{8}'],
	['sqrt(12)+sqrt(3)', '\\sqrt{12}+\\sqrt{3}'],
	['sqrt(2)*sqrt(8)', '\\sqrt{2}\\cdot\\sqrt{8}'],
	['sqrt(9)', '\\sqrt{9}'],
	['1/sqrt(2)', '\\frac{1}{\\sqrt{2}}'],
	['x+x', 'x+x'],
	['x^2+x^2', 'x^2+x^2'],
	['3x+2x-x', '3x+2x-x'],
	['2x+3-x+1', '2x+3-x+1'],
	['x*x', 'x\\cdot x'],
	['x*x*x', 'x\\cdot x\\cdot x'],
	['(x+1)^2', '(x+1)^2'],
	['(x+1)^2-x^2', '(x+1)^2-x^2'],
	['(3x+2)^2-x^2+5x-3', '(3x+2)^2-x^2+5x-3'],
	['(3x+2)^2+5x-3+2x', '(3x+2)^2+5x-3+2x'],
	['(x+1)*(x-1)', '(x+1)(x-1)'],
	['2*(x+h)^2-2*x^2', '2(x+h)^2-2x^2'],
	['2*3*x', '2\\cdot3\\cdot x'],
	['3*(x+1)^2*2', '3(x+1)^2\\cdot2'],
	['x*(x+1)', 'x(x+1)'],
	['2*x*3*y', '2x\\cdot3y'],
	['2*3*x*(x^2+1)^2', '2\\cdot3\\cdot x(x^2+1)^2'],
	['exp(x)+x*exp(x)', 'e^x+xe^x'],
	['2*x*sin(x)+x^2*cos(x)', '2x\\sin(x)+x^2\\cos(x)'],
	['(x^2-1)/(x+1)', '\\frac{x^2-1}{x+1}'],
	['(x^2+2x+1)/(x+1)', '\\frac{x^2+2x+1}{x+1}'],
	['x/x', '\\frac{x}{x}'],
	['sin(x)^2+cos(x)^2', '\\sin^2(x)+\\cos^2(x)'],
	['exp(x)*exp(2x)', 'e^x\\cdot e^{2x}'],
	['ln(exp(x))', '\\ln(e^x)'],
	['sin(0)', '\\sin(0)'],
	['-(-x)', '-(-x)'],
	['x+(-3)', 'x+(-3)'],
	['(-x)/(-y)', '\\frac{-x}{-y}'],
	['-(x+2)', '-(x+2)'],
	['x+0', 'x+0'],
	['x*1', 'x\\cdot1'],
	['x*0', 'x\\cdot0'],
	['12[km]', '12\\,\\mathrm{km}']
];
for (const [ours, latex] of PANEL) {
	const canonical = ce.parse(latex);
	const simplified = canonical.simplify();
	console.log(
		`| ${ours} | ${canonical.toString()} | ${simplified.toString()} | ${simplified.latex} |`
	);
}
// Coûts : ce.costFunction(expr). Développement forcé : ce.box(['Expand', expr]).evaluate()
```

## Annexe B — le lanceur mathAST (même panel, colonne « nous »)

```ts
import { parse } from '/chemin/vers/ubumaths/src/lib/mathAST/cli/core/pipeline.ts';
import {
	simplify,
	computeCost,
	toCustom,
	preprocess,
	normalizeExtended,
	denormalizeExtended
} from '/chemin/vers/ubumaths/src/lib/mathAST/index.ts';
// normalizePass() est privée dans simplify/simplify.ts — même composition :
const normalizePass = (n) => denormalizeExtended(normalizeExtended(preprocess(n)));
for (const input of PANEL.map(([ours]) => ours)) {
	const ast = parse(input).ast!;
	const np = normalizePass(ast);
	const { result, steps } = simplify(ast, { verbosity: 'detailed' }); // 'detailed' ou steps est vide
	console.log(
		`| ${input} | ${toCustom(result)} | coût ${computeCost(ast)} → ${computeCost(result)} | normalizePass seul: ${toCustom(np)} (${computeCost(np)}) | règles: ${steps
			.filter((s) => s.phase === 'rules')
			.map((s) => s.rule)
			.join(',')} |`
	);
}
```
