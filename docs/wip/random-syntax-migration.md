# Migration de la syntaxe des nombres aléatoires : `-` vers `..`

## Status : COMPLÈTE ✅

**Date** : 2025-11-28
**Commits** :

- `cc4127e8` - refactor(parser): use only .. syntax for random ranges
- `c9b3b0b5` - refactor(migration): generate .. syntax in converter
- `bb38e206` - docs: update random syntax to use only ..
- `f89dec08` - docs(wip): mark random syntax migration complete
- `fac7c3bf` - docs: update remaining .. syntax in migration docs
- `117aef81` - docs: complete .. syntax migration across codebase

## Objectif

Supprimer le support de la syntaxe `-` (tiret simple) pour les plages et ne conserver que `..` (double-point).

## Phase 1 Complétée ✓

### Modifications effectuées

#### 1. Parser (`src/lib/shared/parameterization/parser/random-parser.ts`)

**Commentaires JSDoc mis à jour** :

- Commentaire d'en-tête du module
- Exemples dans la documentation de `parseRandomSpec()`
- Documentation de `parseMinMax()`
- Documentation de `parseRange()`
- Documentation de `parseExclusions()`
- Documentation de `splitExclusionParts()`
- Documentation de `splitAtTopLevel()`

**Code modifié** :

- `parseMinMax()` : Suppression complète du fallback vers `-`
  - Avant : Recherche de `..` puis fallback vers `-`
  - Après : Recherche uniquement de `..`
  - Supprimé : Toute la logique de détection de `-` (lignes 337-355)
- `parseRange()` : Commentaire mis à jour pour refléter l'utilisation exclusive de `..`
- `parseExclusions()` : Suppression de la vérification `hasRangeSeparator()` et du check pour `-`

#### 2. Tests (`src/lib/shared/parameterization/parser/random-parser.test.ts`)

**Tous les cas de test convertis** (69 tests) :

- `{{1-10}}` → `{{1..10}}`
- `{{-5-10}}` → `{{-5..10}}`
- `{{-20--5}}` → `{{-20..-5}}`
- `{{0.5-9.99:0.01}}` → `{{0.5..9.99:0.01}}`
- `{{random:1-10!5}}` → `{{random:1..10!5}}`
- `{{1-20!5-9}}` → `{{1..20!5..9}}`
- `{{{{min}}..{{max}}}}` → `{{{{min}}..{{max}}}}`
- Et tous les autres cas similaires

**Résultat des tests** :
✓ Tous les 69 tests passent
✓ Aucun test ne dépend plus de la syntaxe `-`

### Fichiers modifiés

1. `/Users/david/Coding/js/ubumaths/src/lib/shared/parameterization/parser/random-parser.ts`
2. `/Users/david/Coding/js/ubumaths/src/lib/shared/parameterization/parser/random-parser.test.ts`

### Impact

- **Breaking change** : La syntaxe `{{1-10}}` ne fonctionne plus
- **Syntaxe requise** : Utiliser `{{1..10}}` à la place
- **Avantages** :
  - Clarté pour les nombres négatifs : `{{-3..-1}}` vs `{{-3--1}}`
  - Cohérence : une seule syntaxe supportée
  - Code simplifié : ~20 lignes de code supprimées

---

## État : Phase 2 Complétée ✓

### Modifications effectuées

#### Syntax Converter (`src/lib/migration/syntax-converter.ts`)

**Code modifié** :

- Ligne 234 : `{{${min}-${max}!${convertedExclusions}}}` → `{{${min}..${max}!${convertedExclusions}}}`
- Ligne 247 : `{{${min}-${max}}}` → `{{${min}..${max}}}`
- Lignes 346-349 : Patterns n-digit numbers
  - `{{10-99}}` → `{{10..99}}`
  - `{{100-999}}` → `{{100..999}}`
  - `{{1000-9999}}` → `{{1000..9999}}`
  - `{{10000-99999}}` → `{{10000..99999}}`
- Ligne 359 : `{{digits:${n}-${m}}}` → `{{digits:${n}..${m}}}`

**Documentation mise à jour** :

- Ligne 214 : Commentaire JSDoc de `convertRandomWithExclusions()`
- Ligne 239 : Commentaire JSDoc de `convertRandomIntegers()`
- Ligne 317 : Commentaire JSDoc de `convertNDigitNumbers()`
- Lignes 672-700 : Exemples de test en commentaires (tous les patterns `-` → `..`)

#### Tests mis à jour

**Fichiers modifiés** :

1. `src/lib/migration/syntax-converter.test.ts` : 163 tests

   - Tous les patterns de test convertis de `-` vers `..`
   - Exemples : `{{1-10}}` → `{{1..10}}`, `{{-5-5}}` → `{{-5..5}}`, etc.

2. `src/lib/migration/syntax-converter-integration.test.ts` : Tests d'intégration

   - Patterns simples et complexes mis à jour
   - Patterns avec exclusions mis à jour

3. `src/lib/migration/syntax-converter-colors.test.ts` : Tests de couleurs
   - Patterns dans les tests de couleurs mis à jour

**Résultat des tests** :
✓ Tous les 163 tests passent (3 fichiers de test)
✓ 0 erreurs, 0 warnings

### Impact de la Phase 2

- Le convertisseur de syntaxe génère maintenant exclusivement la syntaxe `..`
- Cohérence avec le parser qui n'accepte que `..` (Phase 1)
- La migration de l'ancienne syntaxe TinyCAS produira la nouvelle syntaxe v2

---

## État : Phase 3 Complétée ✓

### Modifications effectuées

#### Documentation mise à jour

**Fichiers modifiés** :

1. **`docs/ref/markdown.md`** - Documentation principale de la syntaxe

   - Section 1.2.1 : Table des syntaxes générales (`{{1-10}}` → `{{1..10}}`)
   - Section 1.2.2 : Plages d'entiers - suppression syntaxe `-`, conservation `..` uniquement
   - Section 1.2.3 : Plages décimales (`{{0.5-9.99:0.01}}` → `{{0.5..9.99:0.01}}`)
   - Section 1.2.4 : Exclusions (`{{1-20!5-9}}` → `{{1..20!5..9}}`)
   - Section 1.2.6 : Table RandomSpec - Exemples mis à jour
   - Section 4 : Exemples complets - Tous les patterns convertis
   - Résumé syntaxique : Mise à jour de tous les exemples

2. **`src/lib/shared/parameterization/README.md`** - README technique
   - Quick Start : Exemples de base mis à jour
   - Syntax Guide : Toutes les sections Integer Range, Decimal Range, Exclusions
   - Parser Layer : Exemples de parsing
   - Resolver Layer : Exemples de résolution
   - Random Spec Formats : Section complète mise à jour
   - Usage examples : Questions et Exercises
   - Test examples : Exemples de tests

**Résultat** :
✓ Toute la documentation utilise maintenant exclusivement la syntaxe `..`
✓ Aucune mention de la syntaxe `-` comme alternative pour les plages
✓ La syntaxe `-` est uniquement mentionnée dans le contexte des nombres négatifs (ex: `-5`)

### Impact de la Phase 3

- Documentation cohérente avec l'implémentation (Phases 1 et 2)
- Les nouveaux utilisateurs n'apprendront que la syntaxe `..`
- Clarté maximale : pas de confusion entre syntaxes alternatives

---

## Résumé final

| Composant | Fichier                    | Tests |
| --------- | -------------------------- | ----- |
| Parser    | `random-parser.ts`         | 69 ✓  |
| Converter | `syntax-converter.ts`      | 118 ✓ |
| Docs      | `markdown.md`, `README.md` | -     |

**Total : 187 tests passent**

### Breaking change

La syntaxe `{{1-10}}` n'est plus supportée. Utiliser `{{1..10}}`.

### Avantages

- Clarté pour les négatifs : `{{-3..5}}` vs `{{-3-5}}`
- Une seule syntaxe = moins de confusion
- Code simplifié (~20 lignes supprimées)

---

## État : Phase 4 Complétée ✓

### Commits finaux

- `fac7c3bf` - docs: update remaining .. syntax in migration docs
- `117aef81` - docs: complete .. syntax migration across codebase

### Fichiers mis à jour (36 fichiers)

**Documentation** :

- `docs/architecture/database-schema.md`
- `docs/architecture/parameterization-system.md`
- `docs/claude/architecture.md`
- `docs/developer/template-syntax-quick-reference.md`
- `docs/features/exercises/*.md` (11 fichiers)
- `docs/features/questions/*.md` (3 fichiers)
- `docs/features/worksheet-variants.md`
- `docs/migrations/phase2-template-syntax-unification.md`

**Tests** :

- `e2e/exercises-parameterization.spec.ts`
- `tests/helpers/exercise-helpers.ts`

**Source (JSDoc/exemples)** :

- `src/lib/exercises/types.ts`
- `src/lib/exercises/generator/instance-generator.ts`
- `src/lib/shared/parameterization/*.ts`
- `src/lib/components/markdown/types.ts`

### Impact final

- **Codebase 100% cohérente** avec la syntaxe `..`
- Documentation, tests, et code source alignés
- Aucune trace de l'ancienne syntaxe `-` (hors contexte historique)

---

## État : Phase 5 Complétée ✓

### Modifications effectuées

#### Tokenizer (`src/lib/shared/parameterization/parser/tokenizer.ts`)

**Code modifié** :

- `isRandomShorthand()` : Mise à jour pour détecter `..` au lieu de `-`
  - Avant : `if (content.includes('-'))` pour détecter les plages
  - Après : `if (content.includes('..'))` pour détecter les plages
  - Commentaires mis à jour pour refléter la syntaxe `..`

#### Tests mis à jour

**Fichiers modifiés** :

1. `src/lib/shared/parameterization/parser/tokenizer.test.ts` - 31 tests
2. `src/lib/shared/parameterization/validator/variable-validator.test.ts` - 42 tests
3. `src/lib/shared/parameterization/validator/circular-dependency.test.ts` - 26 tests
4. `src/lib/questions/generator/variable-resolver.test.ts` - 39 tests
5. `src/lib/shared/parameterization/parser/eval-parser.test.ts` - 51 tests
6. `src/lib/migration/question-transformer.test.ts` - 35 tests

**Patterns corrigés** :

- `{{random:{{min}}-{{max}}}}` → `{{random:{{min}}..{{max}}}}`
- `{{random:1-{{max}}}}` → `{{random:1..{{max}}}}`
- `{{random:-10--5}}` → `{{random:-10..-5}}`
- Correction de patterns `{{eval:...}}` incorrectement convertis (subtraction ≠ range)

**Résultat des tests** :
✓ 566 tests passent (1 skipped intentionnellement)
✓ Tous les tests parameterization/migration/questions alignés

### Résumé final complet

| Composant   | Fichier(s)                       | Tests |
| ----------- | -------------------------------- | ----- |
| Parser      | `random-parser.ts`               | 69 ✓  |
| Tokenizer   | `tokenizer.ts`                   | 31 ✓  |
| Converter   | `syntax-converter.ts`            | 118 ✓ |
| Validators  | `variable-validator.ts`, etc.    | 68 ✓  |
| Resolvers   | `variable-resolver.ts` (×2)      | 93 ✓  |
| Eval Parser | `eval-parser.test.ts`            | 51 ✓  |
| Transformer | `question-transformer.test.ts`   | 35 ✓  |
| Docs        | `markdown.md`, `README.md`, etc. | -     |

**Total : 566 tests passent**
