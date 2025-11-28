# Migration de la syntaxe des nombres aléatoires : `-` vers `..`

## Objectif

Supprimer le support de la syntaxe `-` (tiret simple) pour les plages et ne conserver que `..` (double-point).

## État : Phase 1 Complétée ✓

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
- `{{{{min}}-{{max}}}}` → `{{{{min}}..{{max}}}}`
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

### Prochaines étapes (non incluses dans cette phase)

1. **Migration du contenu existant** :
   - Rechercher tous les templates/questions utilisant l'ancienne syntaxe
   - Convertir automatiquement via script de migration
   - Mettre à jour la documentation utilisateur

2. **Validation** :
   - Vérifier qu'aucun autre fichier du projet n'utilise la syntaxe `-`
   - Tests d'intégration end-to-end si nécessaire

---

**Date Phase 1** : 2025-11-28
**Date Phase 2** : 2025-11-28
**Date Phase 3** : 2025-11-28
**Status** : Phases 1, 2 et 3 terminées - Parser, Converter et Documentation synchronisés
