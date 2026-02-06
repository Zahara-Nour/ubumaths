# Migration des Options - Reference Complete

## Vue d'ensemble

### Architecture comparee

| Aspect                     | Ancien (TinyMath)                        | Nouveau (UbuMaths)                                                   |
| -------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| **Format des options**     | `options: string[]` (tableau de chaines) | Objets types : `constraints`, `displayOptions`, `unitOptions`        |
| **Niveaux de contrainte**  | Binaire (option presente ou absente)     | 3 modes : `strict` / `warn` / `off`                                  |
| **Defauts**                | Implicites dans le correcteur            | `DEFAULT_CONSTRAINT_MODE = 'warn'` explicite                         |
| **Cascade**                | Plat (template seulement)                | Global → Template → Variable                                         |
| **Validateurs**            | Regex uniquement                         | Regex + mathAST (2 tiers)                                            |
| **Statuts de validation**  | correct / incorrect                      | `correct` / `unoptimal_form` / `bad_form` / `incorrect` / `empty`    |
| **Fonction de conversion** | -                                        | `convertOptions()` dans `question-transformer.ts` (lignes ~855-1110) |

### Structures du nouveau systeme

```
options: {
  constraints?: ConstraintOptions    // Validation de la forme des reponses (inclut unit)
  shuffleChoices?: boolean           // Melange des choix QCM
  unitOptions?: {                    // Options de comparaison des unites
    requireSameSymbol?: boolean
    tolerance?: { absolute?: number; relative?: number }
  }
}

// Display options sur les variables expression (pas au niveau template)
variables: [
  { name: "expressionN", expression: "...", displayOptions?: DisplayOptions }
]
```

### Impact sur les points (modes de contrainte)

| Mode       | Ancien comportement     | Nouveau `ValidationStatus` | Points         |
| ---------- | ----------------------- | -------------------------- | -------------- |
| `'strict'` | Reponse rejetee         | `bad_form`                 | 0 points       |
| `'warn'`   | Credit partiel (defaut) | `unoptimal_form`           | Credit partiel |
| `'off'`    | Check desactive         | `correct` (si juste)       | 100%           |

---

## 1. Contraintes (→ `options.constraints`)

Chaque contrainte suit le meme pattern : `require-*` → `strict`, `no-penalty-*` → `off`, absent → `warn` (defaut).

### Mapping complet

| Option ancienne                                                        | Nouveau chemin                                                                 | Valeur               | Validateur                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------- | ----------------------------------- |
| **Espaces** — _espacement des grands nombres (`12 345`)_               |                                                                                |                      | `checkSpaces()` - regex             |
| `require-correct-spaces`                                               | `constraints.spaces`                                                           | `'strict'`           |                                     |
| `no-penalty-for-incorrect-spaces`                                      | `constraints.spaces`                                                           | `'off'`              |                                     |
| _(absent)_                                                             | `constraints.spaces`                                                           | `'warn'` (defaut)    |                                     |
| **Produits** — _multiplication implicite (`2x` vs `2 x x`)_            |                                                                                |                      | `checkProducts()` - mathAST/regex   |
| `require-implicit-products`                                            | `constraints.products`                                                         | `'strict'`           |                                     |
| `no-penalty-for-explicit-products`                                     | `constraints.products`                                                         | `'off'`              |                                     |
| _(absent)_                                                             | `constraints.products`                                                         | `'warn'` (defaut)    |                                     |
| **Parentheses** — _parentheses inutiles (`(5)`, `((x+1))`)_            |                                                                                |                      | `checkBrackets()` - mathAST/regex   |
| `require-no-extraneous-brackets`                                       | `constraints.brackets`                                                         | `'strict'`           |                                     |
| `no-penalty-for-extraneous-brackets`                                   | `constraints.brackets`                                                         | `'off'`              |                                     |
| `no-penalty-for-extraneous-brackets-in-first-negative-term`            | `constraints.brackets` = `'off'` + `allowBracketsInFirstNegativeTerm` = `true` | Cas special `(-5)+3` |                                     |
| _(absent)_                                                             | `constraints.brackets`                                                         | `'warn'` (defaut)    |                                     |
| **Zeros** — _zeros initiaux (`01`) et decimaux (`1.0`, `1.20`)_        |                                                                                |                      | `checkZeros()` - regex              |
| `require-no-extraneous-zeros`                                          | `constraints.zeros`                                                            | `'strict'`           |                                     |
| `no-penalty-for-extraneous-zeros`                                      | `constraints.zeros`                                                            | `'off'`              |                                     |
| _(absent)_                                                             | `constraints.zeros`                                                            | `'warn'` (defaut)    |                                     |
| **Termes nuls** — _termes nuls dans les sommes (`x+0`, `0-x`)_         |                                                                                |                      | `checkNullTerms()` - mathAST        |
| `require-no-null-terms`                                                | `constraints.nullTerms`                                                        | `'strict'`           |                                     |
| `no-penalty-for-null-terms`                                            | `constraints.nullTerms`                                                        | `'off'`              |                                     |
| _(absent)_                                                             | `constraints.nullTerms`                                                        | `'warn'` (defaut)    |                                     |
| **Facteur un** — _facteur 1 dans les produits (`1*x`, `1x`)_           |                                                                                |                      | `checkFactorOne()` - mathAST        |
| `require-no-factor-one`                                                | `constraints.factorOne`                                                        | `'strict'`           |                                     |
| `no-penalty-for-factor-one`                                            | `constraints.factorOne`                                                        | `'off'`              |                                     |
| _(absent)_                                                             | `constraints.factorOne`                                                        | `'warn'` (defaut)    |                                     |
| **Facteur zero** — _facteur 0 dans les produits (`0*x`, `x*0`)_        |                                                                                |                      | `checkFactorZero()` - mathAST       |
| `require-no-factor-zero`                                               | `constraints.factorZero`                                                       | `'strict'`           |                                     |
| `no-penalty-for-factor-zero`                                           | `constraints.factorZero`                                                       | `'off'`              |                                     |
| _(absent)_                                                             | `constraints.factorZero`                                                       | `'warn'` (defaut)    |                                     |
| **Signes** — _signes redondants (`++`, `--`, `+-`, `(-a)*b`)_          |                                                                                |                      | `checkSigns()` - mathAST            |
| `require-no-extraneous-signs`                                          | `constraints.signs`                                                            | `'strict'`           |                                     |
| `no-penalty-for-extraneous-signs`                                      | `constraints.signs`                                                            | `'off'`              |                                     |
| _(absent)_                                                             | `constraints.signs`                                                            | `'warn'` (defaut)    |                                     |
| **Fractions irreductibles** — _fractions non reduites (`2/4` → `1/2`)_ |                                                                                |                      | `checkReducedFractions()` - mathAST |
| `require-reduced-fractions`                                            | `constraints.reducedFractions`                                                 | `'strict'`           |                                     |
| `no-penalty-for-non-reduced-fractions`                                 | `constraints.reducedFractions`                                                 | `'off'`              |                                     |
| _(absent)_                                                             | `constraints.reducedFractions`                                                 | `'warn'` (defaut)    |                                     |
| **Unite** — _unite exacte attendue (`5 km` vs `5000 m`)_               |                                                                                |                      | `checkUnit()` - parseLatexQuantity  |
| `require-specific-unit`                                                | `constraints.unit`                                                             | `'strict'`           |                                     |
| `no-penalty-for-not-respected-unit`                                    | `constraints.unit`                                                             | `'off'`              |                                     |
| _(absent)_                                                             | `constraints.unit`                                                             | `'warn'` (defaut)    |                                     |

### Statistiques d'utilisation par contrainte

| Contrainte         | `require` (strict) | `no-penalty` (off)               | defaut (warn) |
| ------------------ | ------------------ | -------------------------------- | ------------- |
| `spaces`           | 3 (0.47%)          | 0                                | 630 (99.5%)   |
| `products`         | 2 (0.32%)          | 5 (0.79%)                        | 626 (98.9%)   |
| `brackets`         | 3 (0.47%)          | 23 (3.64%) + 3 first-neg (0.47%) | 604 (95.4%)   |
| `zeros`            | 6 (0.95%)          | 8 (1.26%)                        | 619 (97.8%)   |
| `nullTerms`        | 1 (0.16%)          | 4 (0.63%)                        | 628 (99.2%)   |
| `factorOne`        | 1 (0.16%)          | 6 (0.95%)                        | 626 (98.9%)   |
| `factorZero`       | 1 (0.16%)          | 3 (0.47%)                        | 629 (99.4%)   |
| `signs`            | 4 (0.63%)          | 1 (0.16%)                        | 628 (99.2%)   |
| `reducedFractions` | 0                  | 10 (1.58%)                       | 623 (98.4%)   |
| `unit`             | 0                  | 6 (0.95%)                        | 627 (99.1%)   |

---

## 2. Validation (→ `options.*`)

### Options implementees

| Option ancienne      | Nouveau chemin           | Valeur          | Utilisation          |
| -------------------- | ------------------------ | --------------- | -------------------- |
| `no-shuffle-choices` | `options.shuffleChoices` | `false`         | 32 questions (5.06%) |
| _(absent)_           | `options.shuffleChoices` | `true` (defaut) |                      |

### Options TODO (non implementees)

| Option ancienne                             | Mapping prevu | Description                                 | Utilisation |
| ------------------------------------------- | ------------- | ------------------------------------------- | ----------- |
| `solutions-order-not-important`             | TODO          | Accepter reponses dans n'importe quel ordre | 5 (0.79%)   |
| `penalty-for-factors-permutation`           | TODO          | Penalite si facteurs permutes               | 24 (3.79%)  |
| `disallow-factors-permutation`              | TODO          | Interdire permutation des facteurs          | 2 (0.32%)   |
| `one-single-form-solution`                  | TODO          | Forme exacte obligatoire (strictlyEquals)   | 1 (0.16%)   |
| `disallow-terms-permutation`                | TODO          | Interdire permutation des termes            | 0           |
| `disallow-terms-and-factors-permutation`    | TODO          | Interdire les deux                          | 0           |
| `penalty-for-terms-permutation`             | TODO          | Penalite si termes permutes                 | 0           |
| `penalty-for-terms-and-factors-permutation` | TODO          | Penalite si les deux permutes               | 0           |

---

## 3. Affichage (→ `variable.displayOptions` sur les variables expression)

Ces options controlent le formatage des expressions **avant** leur affichage a l'eleve.
Elles sont attachees directement aux variables dont le nom commence par `expression`
(pas sur `defaultDisplayOptions` du template).

### Mapping complet

| Option ancienne                  | Nouveau chemin                                         | Valeur | Utilisation |
| -------------------------------- | ------------------------------------------------------ | ------ | ----------- |
| `shuffle-terms`                  | `expressionN.displayOptions.shuffleTerms`              | `true` | 3 (0.47%)   |
| `shuffle-factors`                | `expressionN.displayOptions.shuffleFactors`            | `true` | 0           |
| `shuffle-terms-and-factors`      | `expressionN.displayOptions.shuffleTermsAndFactors`    | `true` | 0           |
| `shallow-shuffle-terms`          | `expressionN.displayOptions.shallowShuffleTerms`       | `true` | 0           |
| `shallow-shuffle-factors`        | `expressionN.displayOptions.shallowShuffleFactors`     | `true` | 0           |
| `remove-null-terms`              | `expressionN.displayOptions.removeNullTerms`           | `true` | 11 (1.74%)  |
| `exp-no-spaces`                  | `expressionN.displayOptions.removeSpaces`              | `true` | 3 (0.47%)   |
| `exp-remove-unecessary-brackets` | `expressionN.displayOptions.removeUnnecessaryBrackets` | `true` | 5 (0.79%)   |

---

## 4. Options ignorees (sans equivalent)

| Option ancienne              | Raison                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `enounce-no-spaces`          | Cosmetique, gere par le nouveau rendu                                              |
| `exp-allow-unecessary-zeros` | Code mort dans TinyMath (logique commentee), mathAST preserve les zeros nativement |
| `allow-same-expression`      | Legacy : autorisait des expressions identiques entre variations                    |
| `allow-same-enounce`         | Legacy : autorisait des enonces identiques entre variations                        |
| `multiples`                  | Legacy : option de generation, pas necessaire                                      |

---

## 5. Flux de validation compare

```
ANCIEN SYSTEME (TinyMath):
  option string[] ──→ correcteur (checks hardcodes)
                           ↓
                     correct / incorrect

NOUVEAU SYSTEME (UbuMaths):
  convertOptions() ──→ { constraints, displayOptions, unitOptions }
                           ↓
  applyConstraints() ──→ constraint-validators.ts (check par check)
                           ↓
                     correct / unoptimal_form / bad_form / incorrect / empty
```

### Changements techniques des validateurs

| Validateur              | Ancien (TinyMath) | Nouveau (UbuMaths)       |
| ----------------------- | ----------------- | ------------------------ |
| `checkSpaces`           | Regex             | Regex (inchange)         |
| `checkProducts`         | Regex             | mathAST + fallback regex |
| `checkBrackets`         | Regex             | mathAST + fallback regex |
| `checkZeros`            | Regex             | Regex (inchange)         |
| `checkNullTerms`        | Regex             | mathAST                  |
| `checkFactorOne`        | Regex             | mathAST                  |
| `checkFactorZero`       | Regex             | mathAST                  |
| `checkSigns`            | Regex             | mathAST                  |
| `checkReducedFractions` | Regex             | mathAST (GCD)            |
| `checkUnit`             | Boolean flag      | parseLatexQuantity       |

---

## 6. Bilan de la migration

### Statistiques

| Categorie   | Options | Implementees | TODO  | Ignorees |
| ----------- | ------- | ------------ | ----- | -------- |
| Contraintes | 23      | 23           | 0     | 0        |
| Validation  | 9       | 1            | 8     | 0        |
| Affichage   | 8       | 8            | 0     | 0        |
| Ignorees    | 4       | -            | -     | 4        |
| **Total**   | **45**  | **32**       | **8** | **4**    |

### Options TODO par priorite

| Option                            | Questions impactees | Priorite               |
| --------------------------------- | ------------------- | ---------------------- |
| `penalty-for-factors-permutation` | 24 (3.79%)          | Haute                  |
| `solutions-order-not-important`   | 5 (0.79%)           | Moyenne                |
| `disallow-factors-permutation`    | 2 (0.32%)           | Basse                  |
| `one-single-form-solution`        | 1 (0.16%)           | Basse                  |
| Autres permutations (4 options)   | 0                   | Aucune - pas utilisees |

### Fichiers de reference

| Fichier                                                     | Role                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/lib/questions/types.ts`                                | `ConstraintOptions`, `ConstraintMode`, `DEFAULT_CONSTRAINT_MODE`, `ValidationStatus` |
| `src/lib/questions/constraint-validators.ts`                | 11 validateurs (`checkSpaces`, `checkProducts`, ..., `checkUnit`)                    |
| `src/lib/utils/answer-validator.ts`                         | `applyConstraints()` - orchestre les checks                                          |
| `src/lib/questions/feedback.ts`                             | Messages de feedback par contrainte                                                  |
| `src/lib/migration/question-transformer.ts`                 | `convertOptions()` - mapping ancien → nouveau (lignes ~855-1110)                     |
| `src/lib/migration/old-question-types.ts`                   | Type `OldOption` - enum de toutes les anciennes options                              |
| `src/lib/ubumark/parameterization/display-options.ts`       | `DisplayOptions` type + cascade global/template/variable                             |
| `src/lib/ubumark/parameterization/expression-transforms.ts` | Transformations d'affichage (shuffles, removeNullTerms) - mathAST                    |
| `extern/new-tinymath/.../correction.ts`                     | Source de verite pour le comportement par defaut                                     |
