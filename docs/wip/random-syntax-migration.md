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

### Prochaines étapes (non incluses dans cette phase)

1. **Migration du contenu existant** :
   - Rechercher tous les templates/questions utilisant l'ancienne syntaxe
   - Convertir automatiquement via script de migration
   - Mettre à jour la documentation utilisateur

2. **Validation** :
   - Vérifier qu'aucun autre fichier du projet n'utilise la syntaxe `-`
   - Tests d'intégration end-to-end si nécessaire

---

**Date** : 2025-11-28
**Status** : Phase 1 terminée, tests passent
