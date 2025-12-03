# Phase 3 Progress - Normalisation complète + intégration Exp

## État actuel : COMPLÉTÉ

Date : 2025-12-03

## Fichiers créés

### Source - Rules

- `src/lib/mathAST/normal/rules/arithmetic.ts` - Règles arithmétiques (0+x=x, 1\*x=x, x^0=1)
- `src/lib/mathAST/normal/rules/powers.ts` - Règles de puissances (x^a\*x^b, (x^a)^b)
- `src/lib/mathAST/normal/rules/radicals.ts` - Règles des radicaux
- `src/lib/mathAST/normal/rules/index.ts` - Export + simplify avec point fixe

### Source - Pipeline

- `src/lib/mathAST/normal/normalize.ts` - Algorithme principal MathNode → NormalForm
- `src/lib/mathAST/normal/denormalize.ts` - Reconstruction NormalForm → MathNode
- `src/lib/mathAST/normal/index.ts` - Exports publics du module

### Fichiers modifiés

- `src/lib/mathAST/exp.ts` - Ajout `.normal`, `.hash`, `.isEquivalent()`, `.simplify()`
- `src/lib/mathAST/index.ts` - Export du module normal/

### Tests

- `__tests__/rules.test.ts` - 51 tests
- `__tests__/normalize.test.ts` - 45 tests (1 skipped)
- `__tests__/equivalence.test.ts` - 27 tests (2 skipped)

## Résultats des tests

```
Test Files  10 passed (10)
     Tests  517 passed | 3 skipped (520)
```

## Fonctionnalités implémentées

### normalize.ts

- Algorithme récursif : normalise les sous-expressions d'abord
- Gère tous les types MathNode : number, variable, greek, addition, multiplication, power, sqrt, etc.
- Développement complet des expressions
- Collecte automatique des termes semblables

### denormalize.ts

- Reconstruction MathNode depuis NormalForm
- Gestion des fractions
- Reconstruction des radicaux et coefficients algébriques

### Intégration Exp

```typescript
exp.normal; // NormalForm (lazy, cached)
exp.hash; // string pour comparaison O(1)
exp.isEquivalent(other); // true si même forme normale
exp.simplify(); // Exp simplifié
```

### Exemples fonctionnels

- `2x + 3x` ≡ `5x`
- `(a+b)²` ≡ `a² + 2ab + b²`
- `√18` ≡ `3√2`
- `x·y` ≡ `y·x`
- `√2·x + √3·x` ≡ `(√2+√3)·x`

## Tests skippés (TODO futur)

- Réduction de fractions polynomiales : `6/9` ≡ `2/3`
- Nécessite GCD de polynômes (complexe)

## Décisions prises

1. **Lazy caching** : NormalForm calculé une seule fois
2. **Simplification point fixe** : Applique règles jusqu'à stabilité
3. **Expressions opaques** : Fonctions non simplifiables gardées telles quelles

## Vérifications

- [x] Tests passent (517/520)
- [x] TypeScript : 0 erreurs dans normal/
- [x] Formatage : corrigé avec Prettier

## Prochaines étapes

Phase 4 : rules/transcendental.ts (sin, cos, ln, valeurs remarquables)

## Commit de référence

À créer après Phase 4
