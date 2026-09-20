# Prompt — réécriture de `simplify()`

> À donner tel quel au début d'une session neuve.
> Rédigé le 2026-09-20 après une session qui a tourné en rond.
>
> ✅ **Relevé fait le 2026-09-20** — CE exécuté, panel mesuré des deux côtés,
> Q1–Q3 répondues : [simplify-reecriture-releve.md](simplify-reecriture-releve.md).
> Reprendre au **§7 du relevé** (décisions de David), pas au §1 de ce brief.

## L'objectif, en une phrase

`simplify(expression)` doit rendre **l'écriture la plus propre possible** de
cette expression — celle qu'un professeur de maths écrirait au tableau.

Ce n'est pas la forme normale (qui sert à décider l'équivalence, et qui
développe), ni une factorisation (qui répond à une autre question).

---

## ⚠️ Méthode imposée — lire avant tout

La session précédente a produit des conclusions contradictoires parce qu'elle a
**affirmé au lieu de mesurer**. Trois règles, non négociables :

1. **Rien n'est affirmé sans avoir été exécuté.** Pas de raisonnement sur ce que
   « devrait » rendre une fonction : on l'appelle et on regarde.
2. **Une documentation n'est une source que si elle est suivie par le git
   amont.** Vérifier avec `git ls-files --error-unmatch <fichier>` avant de
   citer quoi que ce soit dans `extern/`.
3. **Le panel d'expressions (§5) est le contrat.** Toute proposition se juge sur
   lui, pas sur un exemple choisi après coup.

### Première tâche, avant toute analyse : FAIRE TOURNER le Compute Engine

`extern/compute-engine` (v0.30.2) est un dépôt complet, avec ses tests. La
session précédente a **lu** leur code et en a tiré des conclusions sans jamais
l'exécuter. C'est la source de la moitié des contradictions.

**À faire** : installer / construire `extern/compute-engine`, puis passer le
panel du §5 dans leur `simplify()` et relever la sortie réelle. Tant que ce
relevé n'existe pas, aucune affirmation sur « ce que fait CE » n'est recevable.

---

## 1. Ce qui est vérifié (mesuré, réutilisable)

### Notre code

| fait                                                                                                                                                                                     | preuve                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `simplify()` = `rewrite()` avec `preProcess`/`postProcess` = `normalizePass`, stratégie `cost-fixpoint`, puis `foldCoefficients`                                                         | `simplify/simplify.ts`                          |
| `simplify()` n'appelle **aucune** transformation cosmétique                                                                                                                              | idem + sortie mesurée (`-x/-y` non simplifié)   |
| `normalize()` **développe** : `(x+1)² → x²+2x+1`, `(x+1)(x−1) → x²−1`, `x(x+1) → x²+x`                                                                                                   | mesuré                                          |
| `NormalForm = { numerator: NormalTerm[], denominator: NormalTerm[], hash }`, `NormalTerm = { coefficient, monomial: SymbolicFactor[] }`                                                  | `normal/types.ts`                               |
| la doc de `NormalForm` dit : « equivalent **if and only if** their normal forms have the same hash » — c'est **le contrat**, pas le type, qui force le développement                     | `normal/types.ts:199-212`                       |
| `areEquivalent` s'appuie sur `normalize` + `normalFormsEquivalent`, **jamais** sur `simplify`                                                                                            | `equivalence.ts`                                |
| `simplify()` n'a que **2 appelants en production** : `cli/commands/simplify.command.ts:52` et `grapheur/analysis.ts:1249` (`simplifyExact`)                                              | grep des imports                                |
| la barrière de coût compare contre **l'ENTRÉE** : `best = node; bestCost = cost(node)`                                                                                                   | `common/rewriting-engine.ts:160-163`            |
| deux contrôles de coût : intermédiaire `<`, final `<=` (l'égalité va à la forme canonique)                                                                                               | `rewriting-engine.ts:227, 262`                  |
| la fonction de coût a été **portée de CE** (PR #375, mergée)                                                                                                                             | `simplify/cost.ts`                              |
| la règle `pythagorean` est chargée par `simplify()` et **ne se déclenche jamais**                                                                                                        | mesuré, `fired: []` dans les deux ordres        |
| `simplify('12[km]')` rend `12` — **l'unité est perdue**                                                                                                                                  | mesuré                                          |
| `areEquivalent((-x)/(-y), x/y)` rend **faux**                                                                                                                                            | mesuré — à élucider                             |
| `sortTermsAndFactorsAST` rend `3x+2x−x → -x + 2x + 3x`, et place `(3x+2)²` après la constante                                                                                            | mesuré                                          |
| `pedagogical-simplify` Phase B = pont vers `normalize()` ; l'intention `factoriser` pose `useNormalize: false`, donc **perd toute mise au propre** (`.factoriser 2/6+1/4` ne réduit pas) | `pedagogical-simplify/intent-rules.ts` + mesuré |

### Le Compute Engine (lecture de source seulement — À CONFIRMER EN L'EXÉCUTANT)

| fait                                                                                                                                                                                         | preuve                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `canonicalAdd` = canonicaliser les arguments, retirer `0`, capturer les complexes, **trier**. **Aucun regroupement de termes semblables**                                                    | `boxed-expression/arithmetic-add.ts`           |
| la classe `Terms` (`{ coef: NumericValue[]; term: BoxedExpression }[]`, appariement par `isSame`) est appelée par `add()`, lui-même utilisé par **`Add.evaluate`** — pas par la canonisation | `terms.ts`, `library/arithmetic.ts:176-209`    |
| `simplify()` de CE = canonique → règles → `isCheaper`                                                                                                                                        | `boxed-expression/simplify.ts`                 |
| `isCheaper` : `cost(new) <= 1.2 * cost(old)` — **biais de 20 % en faveur du nouveau**                                                                                                        | `simplify.ts:79`                               |
| la fonction de coût est **injectable** (`ce.costFunction`, ou paramètre)                                                                                                                     | `cost-function.ts`                             |
| leur test AMONT marque des échecs connus sur notre famille d'expressions : `['(x+1)^2-x^2', '2x+1'], // 🙁 -x^2 + (x + 1)^2` et `['2*(x+h)^2-2*x^2', '4xh+2h^2'], // 🙁 -2x^2 + 2(h + x)^2`  | `test/compute-engine/simplify.test.ts:566-567` |
| ⚠️ `extern/compute-engine/compute-engine.md` **n'est PAS suivi par le git amont** — c'est un résumé ajouté localement. Ne pas le citer comme documentation                                   | `git ls-files --error-unmatch`                 |

---

## 2. Ce que la session précédente a affirmé À TORT

À ne pas reprendre, et à re-mesurer si besoin :

- ❌ « `ce.parse("x + x").simplify()` rend `2x` » — cité depuis `compute-engine.md`,
  qui n'est pas leur doc. **CE n'a jamais été exécuté.**
- ❌ « `(3x+2)² − x² + 5x − 3` doit rester inchangée » — puis le contraire deux
  messages plus loin. La forme développée `8x² + 17x + 1` est probablement la
  plus propre, et c'est ce que notre `simplify()` rend déjà.
- ❌ « c'est une incohérence que `simplify` garde `(x+1)²` seul et développe la
  somme » — c'est la barrière de coût qui fonctionne, appliquée à deux entrées
  différentes.
- ❌ « il faut scinder `normalize` » — faux : son développement est imposé par le
  contrat d'équivalence.
- ⚠️ « il suffit de brancher le pipeline cosmétique » — dernière hypothèse émise,
  **non vérifiée** : personne n'a mesuré ce que `simplify` rendrait avec.

---

## 3. Les questions ouvertes, dans l'ordre où les trancher

### Q1 — Que rend vraiment le `simplify()` du Compute Engine ?

Faire tourner CE sur le panel du §5. Relever :

- les cas où il fait **mieux** que nous ;
- les cas où il fait **moins bien** ;
- ses attendus non respectés (les `🙁` de leur propre suite).

**Sans ce relevé, les questions suivantes ne peuvent pas être tranchées.**

### Q2 — Porter leur forme canonique est-il utile ?

État de la connaissance : leur canonique **ne regroupe pas** les termes
semblables (lecture de source). Donc la porter telle quelle ne corrigerait pas
`x + x`. Mais :

- le mécanisme **`Terms`** — une somme = liste `(coefficient, expression)`,
  appariée par identité structurelle — regroupe **sans développer**, parce qu'un
  terme y est une expression opaque. `(3x+2)²` y est une clé comme une autre.
- chez nous, l'équivalent serait une `Map` clée par `hashMathNode`. Les briques
  existent : `flattenSumShallow`, `hashMathNode`, `extractRational`,
  `foldCoefficients`.

**À trancher après Q1** : ce mécanisme est-il ce qui manque à notre `simplify`,
ou le barème suffit-il une fois le cosmétique branché ?

### Q3 — Les fonctions cosmétiques sont-elles adaptées ?

`cosmetic-transforms.ts` contient un pipeline ordonné de 8 étapes
(`buildASTPipeline`) : `reduceFractionsAST`, `simplifyNullProductsAST`,
`removeNullTermsAST`, `stripUnnecessaryBrackets`, `removeSignsAST`,
`removeFactorsOneAST`, `removeMultOperatorAST`, `sortTermsAndFactorsAST`.

Mesuré : il traite correctement les signes (mieux que `normalize` sur
`(-x)/(-y)`) et ne développe jamais. Mais :

- il est écrit **pour `checkForm`** — valider la FORME écrite par un élève —
  et chaque étape porte un `constraintId` qui n'a aucun sens dans `simplify` ;
- `sortTermsAndFactorsAST` est défectueux (cf. §1) ;
- il ne regroupe pas les termes semblables, ne touche pas aux radicaux, et
  n'additionne pas deux fractions (`2/6 + 1/4 → 1/3 + 1/4`).

**À trancher** : les réutiliser tels quels, les réécrire dans `simplify`, ou en
extraire un noyau partagé.

### Q4 — `x(x+1)` : développé ou factorisé ?

Notre `simplify()` rend `x² + x`. Pour lire un signe (dérivées), on veut
`x(x+1)`. **Arbitrage produit, à trancher par David** — ce n'est pas un bug.

---

## 4. Contraintes

- `normalize()` **ne se touche pas** : c'est le décideur d'équivalence.
- `simplify()` n'a que 2 appelants, donc le risque de régression est faible —
  mais `.simplify` du REPL et le grapheur doivent être mesurés avant/après.
- La barrière de coût **ne se retire pas** : mesuré, sans elle `(x+1)²` et
  `3(x+1)²×2` se développent. Elle se déplace, ou se règle.
- Lire `CLAUDE.md` : worktree, TDD strict, preuves rouges par neutralisation
  **depuis une copie**, contrainte mémoire (jamais `pnpm check` ni `lint`).

---

## 5. Le panel — le contrat

Chaque ligne : entrée · ce que `simplify()` rend aujourd'hui (mesuré le
2026-09-20) · ce qu'on attend. **La colonne « attendu » est une PROPOSITION :
elle doit être validée par David avant d'écrire une ligne de code.**

### Fractions

| entrée      | aujourd'hui | attendu      |
| ----------- | ----------- | ------------ |
| `2/6+1/4`   | `7/12`      | `7/12` ✓     |
| `1/2+1/3`   | `5/6`       | `5/6` ✓      |
| `3/6`       | `1/2`       | `1/2` ✓      |
| `2/4*6/8`   | `3/8`       | `3/8` ✓      |
| `(2x)/(4y)` | `2x/(4y)`   | **`x/(2y)`** |

### Radicaux

| entrée             | aujourd'hui | attendu               |
| ------------------ | ----------- | --------------------- |
| `sqrt(8)`          | `√8`        | **`2√2`**             |
| `sqrt(12)+sqrt(3)` | `3√3`       | `3√3` ✓               |
| `sqrt(2)*sqrt(8)`  | `4`         | `4` ✓                 |
| `sqrt(9)`          | `3`         | `3` ✓                 |
| `1/sqrt(2)`        | ?           | à trancher (`√2/2` ?) |

### Regroupement de termes semblables

| entrée     | aujourd'hui | attendu   |
| ---------- | ----------- | --------- |
| `x+x`      | `x + x`     | **`2x`**  |
| `x^2+x^2`  | `2x²`       | `2x²` ✓   |
| `3x+2x-x`  | `4x`        | `4x` ✓    |
| `2x+3-x+1` | `x + 4`     | `x + 4` ✓ |
| `x*x`      | `x²`        | `x²` ✓    |
| `x*x*x`    | `x³`        | `x³` ✓    |

### Polynômes mixtes — le cœur du débat

| entrée              | aujourd'hui     | attendu                          |
| ------------------- | --------------- | -------------------------------- |
| `(x+1)^2`           | `(x+1)²`        | `(x+1)²` ✓ **ne PAS développer** |
| `(x+1)^2-x^2`       | `2x + 1`        | `2x + 1` ✓ (CE échoue ici)       |
| `(3x+2)^2-x^2+5x-3` | `8x² + 17x + 1` | `8x² + 17x + 1` ✓ (CE échoue)    |
| `(3x+2)^2+5x-3+2x`  | ?               | à mesurer                        |
| `(x+1)*(x-1)`       | `x² − 1`        | à trancher                       |
| `2*(x+h)^2-2*x^2`   | ?               | `4xh + 2h²` (CE échoue)          |

### Produits et coefficients

| entrée        | aujourd'hui  | attendu                     |
| ------------- | ------------ | --------------------------- |
| `2*3*x`       | `6x`         | `6x` ✓                      |
| `3*(x+1)^2*2` | `6 × (x+1)²` | **`6(x+1)²`** (× implicite) |
| `x*(x+1)`     | `x² + x`     | **Q4 — à trancher**         |
| `2*x*3*y`     | `6xy`        | `6xy` ✓                     |

### Dérivées — l'usage vivant

| entrée                  | aujourd'hui             | attendu                        |
| ----------------------- | ----------------------- | ------------------------------ |
| `2*3*x*(x^2+1)^2`       | `6 × x × (x²+1)²`       | **`6x(x²+1)²`**                |
| `exp(x)+x*exp(x)`       | `x exp(x) + exp(x)`     | hors périmètre (factorisation) |
| `2*x*sin(x)+x^2*cos(x)` | `x² cos(x) + 2x sin(x)` | ordre à trancher               |

### Fractions rationnelles

| entrée             | aujourd'hui | attendu   |
| ------------------ | ----------- | --------- |
| `(x^2-1)/(x+1)`    | `x − 1`     | `x − 1` ✓ |
| `(x^2+2x+1)/(x+1)` | `x + 1`     | `x + 1` ✓ |
| `x/x`              | `1`         | `1` ✓     |

### Trigo, exp, log

| entrée              | aujourd'hui | attendu                                    |
| ------------------- | ----------- | ------------------------------------------ |
| `sin(x)^2+cos(x)^2` | inchangé    | **`1`** (règle chargée, jamais déclenchée) |
| `exp(x)*exp(2x)`    | `exp(3x)`   | `exp(3x)` ✓                                |
| `ln(exp(x))`        | `x`         | `x` ✓                                      |
| `sin(0)`            | `0`         | `0` ✓                                      |

### Signes

| entrée      | aujourd'hui | attendu    |
| ----------- | ----------- | ---------- |
| `-(-x)`     | `x`         | `x` ✓      |
| `x+(-3)`    | `x − 3`     | `x − 3` ✓  |
| `(-x)/(-y)` | `-x/-y`     | **`x/y`**  |
| `-(x+2)`    | `−(x + 2)`  | à trancher |

### Neutres et unités

| entrée              | aujourd'hui   | attendu                          |
| ------------------- | ------------- | -------------------------------- |
| `x+0`, `x*1`, `x*0` | `x`, `x`, `0` | ✓                                |
| `12[km]`            | **`12`**      | **`12 km`** — l'unité est perdue |

---

## 6. Livrable attendu de la session

1. Le relevé de CE sur le panel (Q1), **obtenu en l'exécutant**.
2. Une réponse argumentée et mesurée à Q2 et Q3.
3. Le panel validé avec David, colonne « attendu » figée.
4. Puis seulement : le plan de réécriture, lot par lot, chaque lot mesuré sur le
   panel avant et après.
