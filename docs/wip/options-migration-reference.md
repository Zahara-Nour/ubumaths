# Migration des Options - Reference Complete

## Vue d'ensemble

L'ancien systeme TinyMath utilise des options sous forme de chaines de caracteres dans un tableau `options: string[]`.
Le nouveau systeme UbuMaths mappe ces options vers trois structures typees :

- **`options.constraints`** (`ConstraintOptions`) - Validation de la forme des reponses
- **`options.*`** (autres champs de `QuestionTemplate['options']`) - Validation des reponses
- **`defaultDisplayOptions`** (`DisplayOptions`) - Formatage de l'affichage des expressions

### Comportement par defaut des contraintes

Le mode par defaut quand aucune option n'est positionnee est **`'warn'`** (credit partiel).
Cela correspond au comportement de l'ancien TinyMath (source : `extern/new-tinymath/.../correction.ts` lignes 224-248).

| Mode       | Effet                        | Points         |
| ---------- | ---------------------------- | -------------- |
| `'strict'` | Violation = `bad_form`       | 0 points       |
| `'warn'`   | Violation = `unoptimal_form` | Credit partiel |
| `'off'`    | Check desactive              | Pas d'impact   |

---

## 1. Options de contrainte (→ `options.constraints`)

### 1.1 Espaces (`spaces`)

Verifie l'espacement correct des grands nombres (ex: `12 345`, pas `12345`).

| Option ancienne                   | Mode       | Description                              |
| --------------------------------- | ---------- | ---------------------------------------- |
| `require-correct-spaces`          | `'strict'` | Espaces obligatoires, 0 pts si violation |
| `no-penalty-for-incorrect-spaces` | `'off'`    | Check desactive                          |
| _(aucune option)_                 | `'warn'`   | Credit partiel si violation              |

**Validateur** : `checkSpaces()` dans `constraint-validators.ts`
**Utilisation** : `require` 3 questions (0.47%), `no-penalty` 0 questions, defaut 630 questions (99.5%)

### 1.2 Produits (`products`)

Verifie que les multiplications sont implicites quand appropriee (ex: `2x` au lieu de `2 x x`).

| Option ancienne                    | Mode       | Description                                       |
| ---------------------------------- | ---------- | ------------------------------------------------- |
| `require-implicit-products`        | `'strict'` | Produit implicite obligatoire, 0 pts si violation |
| `no-penalty-for-explicit-products` | `'off'`    | Check desactive                                   |
| _(aucune option)_                  | `'warn'`   | Credit partiel si violation                       |

**Validateur** : `checkProducts()` dans `constraint-validators.ts`
**Utilisation** : `require` 2 questions (0.32%), `no-penalty` 5 questions (0.79%), defaut 626 questions (98.9%)

### 1.3 Parentheses (`brackets`)

Verifie l'absence de parentheses inutiles (ex: `(5)`, `((x+1))`, `\frac{(x)}{2}`).

| Option ancienne                                             | Mode                                                | Description                                        |
| ----------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `require-no-extraneous-brackets`                            | `'strict'`                                          | Parentheses inutiles interdites, 0 pts             |
| `no-penalty-for-extraneous-brackets`                        | `'off'`                                             | Check desactive                                    |
| `no-penalty-for-extraneous-brackets-in-first-negative-term` | `'off'` + `allowBracketsInFirstNegativeTerm = true` | Check desactive, mais flag pour tolerance `(-5)+3` |
| _(aucune option)_                                           | `'warn'`                                            | Credit partiel si violation                        |

**Validateur** : `checkBrackets()` dans `constraint-validators.ts`
**Utilisation** : `require` 3 questions (0.47%), `no-penalty` 23 questions (3.64%), `no-penalty-first-neg` 3 questions (0.47%), defaut 604 questions (95.4%)

### 1.4 Zeros inutiles (`zeros`)

Verifie l'absence de zeros inutiles : zeros initiaux (`01`, `007`) et zeros finaux decimaux (`1.0`, `1.20`).

| Option ancienne                   | Mode       | Description                     |
| --------------------------------- | ---------- | ------------------------------- |
| `require-no-extraneous-zeros`     | `'strict'` | Zeros inutiles interdits, 0 pts |
| `no-penalty-for-extraneous-zeros` | `'off'`    | Check desactive                 |
| _(aucune option)_                 | `'warn'`   | Credit partiel si violation     |

**Validateur** : `checkZeros()` dans `constraint-validators.ts`
**Utilisation** : `require` 6 questions (0.95%), `no-penalty` 8 questions (1.26%), defaut 619 questions (97.8%)

### 1.5 Termes nuls (`nullTerms`)

Verifie l'absence de termes nuls dans les sommes (ex: `x+0`, `0+x`, `x-0`, `0-x`).

| Option ancienne             | Mode       | Description                  |
| --------------------------- | ---------- | ---------------------------- |
| `require-no-null-terms`     | `'strict'` | Termes nuls interdits, 0 pts |
| `no-penalty-for-null-terms` | `'off'`    | Check desactive              |
| _(aucune option)_           | `'warn'`   | Credit partiel si violation  |

**Validateur** : `checkNullTerms()` dans `constraint-validators.ts` (mathAST)
**Utilisation** : `require` 1 question (0.16%), `no-penalty` 4 questions (0.63%), defaut 628 questions (99.2%)

### 1.6 Facteur un (`factorOne`)

Verifie l'absence du facteur 1 dans les produits (ex: `1*x`, `1x`, `x*1`).

| Option ancienne             | Mode       | Description                 |
| --------------------------- | ---------- | --------------------------- |
| `require-no-factor-one`     | `'strict'` | Facteur 1 interdit, 0 pts   |
| `no-penalty-for-factor-one` | `'off'`    | Check desactive             |
| _(aucune option)_           | `'warn'`   | Credit partiel si violation |

**Validateur** : `checkFactorOne()` dans `constraint-validators.ts` (mathAST)
**Utilisation** : `require` 1 question (0.16%), `no-penalty` 6 questions (0.95%), defaut 626 questions (98.9%)

### 1.7 Facteur zero (`factorZero`)

Verifie l'absence du facteur 0 dans les produits (ex: `0*x`, `x*0`).

| Option ancienne              | Mode       | Description                 |
| ---------------------------- | ---------- | --------------------------- |
| `require-no-factor-zero`     | `'strict'` | Facteur 0 interdit, 0 pts   |
| `no-penalty-for-factor-zero` | `'off'`    | Check desactive             |
| _(aucune option)_            | `'warn'`   | Credit partiel si violation |

**Validateur** : `checkFactorZero()` dans `constraint-validators.ts` (mathAST)
**Utilisation** : `require` 1 question (0.16%), `no-penalty` 3 questions (0.47%), defaut 629 questions (99.4%)

### 1.8 Signes inutiles (`signs`)

Verifie l'absence de signes redondants : `++`, `--`, `+-`, `-+`, `+x`, `-(-x)`, `x+(-y)`, `(-a)*b`, `\frac{-a}{b}`.

| Option ancienne                   | Mode       | Description                      |
| --------------------------------- | ---------- | -------------------------------- |
| `require-no-extraneous-signs`     | `'strict'` | Signes inutiles interdits, 0 pts |
| `no-penalty-for-extraneous-signs` | `'off'`    | Check desactive                  |
| _(aucune option)_                 | `'warn'`   | Credit partiel si violation      |

**Validateur** : `checkSigns()` dans `constraint-validators.ts` (mathAST)
**Utilisation** : `require` 4 questions (0.63%), `no-penalty` 1 question (0.16%), defaut 628 questions (99.2%)

### 1.9 Fractions irreductibles (`reducedFractions`)

Verifie que les fractions sont reduites (ex: `2/4` devrait etre `1/2`).

| Option ancienne                        | Mode       | Description                              |
| -------------------------------------- | ---------- | ---------------------------------------- |
| `require-reduced-fractions`            | `'strict'` | Fraction irreductible obligatoire, 0 pts |
| `no-penalty-for-non-reduced-fractions` | `'off'`    | Check desactive                          |
| _(aucune option)_                      | `'warn'`   | Credit partiel si violation              |

**Validateur** : `checkReducedFractions()` dans `constraint-validators.ts` (mathAST)
**Utilisation** : `require` 0 questions, `no-penalty` 10 questions (1.58%), defaut 623 questions (98.4%)

---

## 2. Options de validation (→ `options.*`)

### 2.1 Melange des choix QCM

| Option ancienne      | Mapping                          | Description                       |
| -------------------- | -------------------------------- | --------------------------------- |
| `no-shuffle-choices` | `options.shuffleChoices = false` | Garder l'ordre original des choix |
| _(aucune option)_    | `shuffleChoices = true` (defaut) | Melanger les choix                |

**Statut** : Implemente
**Utilisation** : 32 questions (5.06%)

### 2.2 Unite physique

| Option ancienne                     | Mapping                                        | Description              |
| ----------------------------------- | ---------------------------------------------- | ------------------------ |
| `require-specific-unit`             | `options.unitOptions.requireExactUnit = true`  | Unite exacte obligatoire |
| `no-penalty-for-not-respected-unit` | `options.unitOptions.requireExactUnit = false` | Tolere unite differente  |

**Statut** : Implemente
**Utilisation** : `require` 0 questions, `no-penalty` 6 questions (0.95%)

### 2.3 Ordre des solutions

| Option ancienne                 | Mapping      | Description                                     |
| ------------------------------- | ------------ | ----------------------------------------------- |
| `solutions-order-not-important` | Warning TODO | Accepter les reponses dans n'importe quel ordre |

**Statut** : Non implemente
**Utilisation** : 5 questions (0.79%)

### 2.4 Permutations de termes/facteurs

| Option ancienne                             | Mapping      | Description                        |
| ------------------------------------------- | ------------ | ---------------------------------- |
| `disallow-terms-permutation`                | Warning TODO | Interdire permutation des termes   |
| `disallow-factors-permutation`              | Warning TODO | Interdire permutation des facteurs |
| `disallow-terms-and-factors-permutation`    | Warning TODO | Interdire les deux                 |
| `penalty-for-terms-permutation`             | Warning TODO | Penalite si termes permutes        |
| `penalty-for-factors-permutation`           | Warning TODO | Penalite si facteurs permutes      |
| `penalty-for-terms-and-factors-permutation` | Warning TODO | Penalite si les deux permutes      |

**Statut** : Non implemente
**Utilisation** : `penalty-for-factors-permutation` 24 questions (3.79%), `disallow-factors-permutation` 2 questions (0.32%), autres 0 questions

### 2.5 Forme exacte

| Option ancienne            | Mapping      | Description                               |
| -------------------------- | ------------ | ----------------------------------------- |
| `one-single-form-solution` | Warning TODO | Forme exacte obligatoire (strictlyEquals) |

**Statut** : Non implemente
**Utilisation** : 1 question (0.16%)

---

## 3. Options d'affichage (→ `defaultDisplayOptions`)

Ces options controlent le formatage des expressions **avant** leur affichage a l'eleve.

### 3.1 Melange des termes et facteurs

| Option ancienne             | Mapping                                        | Description                        |
| --------------------------- | ---------------------------------------------- | ---------------------------------- |
| `shuffle-terms`             | `displayOptions.shuffleTerms = true`           | Melanger les termes d'une somme    |
| `shuffle-factors`           | `displayOptions.shuffleFactors = true`         | Melanger les facteurs d'un produit |
| `shuffle-terms-and-factors` | `displayOptions.shuffleTermsAndFactors = true` | Melanger les deux                  |
| `shallow-shuffle-terms`     | `displayOptions.shallowShuffleTerms = true`    | Melange peu profond des termes     |
| `shallow-shuffle-factors`   | `displayOptions.shallowShuffleFactors = true`  | Melange peu profond des facteurs   |

**Statut** : Implemente
**Utilisation** : `shuffle-terms` 3 questions (0.47%), autres 0 questions

### 3.2 Suppression des termes nuls

| Option ancienne     | Mapping                                 | Description                   |
| ------------------- | --------------------------------------- | ----------------------------- |
| `remove-null-terms` | `displayOptions.removeNullTerms = true` | Supprimer `+0` de l'affichage |

**Statut** : Implemente
**Utilisation** : 11 questions (1.74%)

### 3.3 Formatage LaTeX

| Option ancienne              | Mapping                                      | Description                         |
| ---------------------------- | -------------------------------------------- | ----------------------------------- |
| `exp-no-spaces`              | `displayOptions.addSpaces = false`           | Pas d'espaces autour des operateurs |
| `exp-allow-unecessary-zeros` | `displayOptions.keepUnnecessaryZeros = true` | Garder les zeros inutiles (`1.00`)  |

**Statut** : Implemente
**Utilisation** : `exp-no-spaces` 3 questions (0.47%), `exp-allow-unecessary-zeros` 1 question (0.16%)

---

## 4. Options ignorees silencieusement

Ces options n'ont pas d'equivalent dans le nouveau systeme et sont ignorees sans warning.

| Option ancienne                  | Raison de l'ignorance                                           |
| -------------------------------- | --------------------------------------------------------------- |
| `enounce-no-spaces`              | Cosmetique, pas necessaire dans le nouveau systeme de rendu     |
| `exp-remove-unecessary-brackets` | Cosmetique, gere automatiquement par le rendu LaTeX             |
| `allow-same-expression`          | Legacy : autorisait des expressions identiques entre variations |
| `allow-same-enounce`             | Legacy : autorisait des enonces identiques entre variations     |
| `multiples`                      | Legacy : option de generation, pas necessaire                   |

---

## 5. Bilan de la migration

### Statistiques

| Categorie   | Options | Implementees | TODO  | Ignorees |
| ----------- | ------- | ------------ | ----- | -------- |
| Contraintes | 21      | 21           | 0     | 0        |
| Validation  | 11      | 3            | 8     | 0        |
| Affichage   | 8       | 8            | 0     | 0        |
| Ignorees    | 5       | -            | -     | 5        |
| **Total**   | **45**  | **32**       | **8** | **5**    |

### Options TODO : impact

| Option                            | Questions impactees | Priorite                             |
| --------------------------------- | ------------------- | ------------------------------------ |
| `penalty-for-factors-permutation` | 24 (3.79%)          | Haute - affecte le plus de questions |
| `solutions-order-not-important`   | 5 (0.79%)           | Moyenne                              |
| `disallow-factors-permutation`    | 2 (0.32%)           | Basse                                |
| `one-single-form-solution`        | 1 (0.16%)           | Basse                                |
| Autres permutations               | 0                   | Aucune - pas utilisees               |

### Fichiers de reference

| Fichier                                                     | Role                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/lib/questions/types.ts`                                | `ConstraintOptions`, `ConstraintMode`, `DEFAULT_CONSTRAINT_MODE`      |
| `src/lib/questions/constraint-validators.ts`                | 10 validateurs (`checkSpaces`, `checkProducts`, etc.)                 |
| `src/lib/utils/answer-validator.ts`                         | `applyConstraints()` - orchestre les checks                           |
| `src/lib/questions/feedback.ts`                             | Messages de feedback par contrainte                                   |
| `src/lib/migration/question-transformer.ts`                 | `convertOptions()` - mapping ancien → nouveau                         |
| `src/lib/ubumark/parameterization/expression-transforms.ts` | Transformations d'affichage (shuffles, removeNullTerms) - **mathAST** |
| `extern/new-tinymath/.../correction.ts`                     | Source de verite pour le comportement par defaut                      |
