# Phase 2 Progress - Coefficients algébriques + polynômes

## État actuel : COMPLÉTÉ

Date : 2025-12-03

## Fichiers créés

### Source

- `src/lib/mathAST/normal/algebraic.ts` - Arithmétique sur AlgebraicCoefficient
- `src/lib/mathAST/normal/monomial.ts` - Opérations sur monômes symboliques
- `src/lib/mathAST/normal/term.ts` - Opérations sur NormalTerm
- `src/lib/mathAST/normal/polynomial.ts` - Arithmétique polynomiale
- `src/lib/mathAST/normal/hash.ts` - Hash structurel

### Tests

- `__tests__/algebraic.test.ts` - 60 tests
- `__tests__/monomial.test.ts` - 51 tests
- `__tests__/term.test.ts` - 48 tests
- `__tests__/polynomial.test.ts` - 50 tests

## Résultats des tests

```
Test Files  7 passed (7)
     Tests  397 passed (397)
```

## Fonctionnalités implémentées

### algebraic.ts

- `addAlgebraic()` : Collecte des termes semblables (3√2 + 2√2 = 5√2)
- `mulAlgebraic()` : Distribution avec simplification des radicaux
- Prédicats : `isZeroAlgebraic()`, `isOneAlgebraic()`, `algebraicEquals()`

### monomial.ts

- `mulMonomials()` : Merge des bases avec addition d'exposants
- `compareMonomials()` : Ordre canonique niveau 3
- `monomialDegree()` : Degré total

### term.ts

- `areLikeTerms()` : Détection termes semblables
- `addLikeTerms()` : Addition
- `mulTerms()` : Multiplication

### polynomial.ts

- `collectLikeTerms()` : Normalisation
- `addPolynomials()`, `mulPolynomials()` : Arithmétique
- `powPolynomial()` : Exponentiation (carré rapide)

### hash.ts

- Hash déterministe pour tous les types
- `normalFormsEquivalent()` : Comparaison O(1)

## Décisions prises

1. **Ordre canonique** : Graded lexicographic (degré décroissant, puis lex)
2. **Hash** : String-based pour debugging facile
3. **Priorité des types** : greek < variable < function < composite

## Code Review

- Score : Excellent
- Recommandation : Ready to merge
- Suggestions mineures :
  - Consolider les fonctions de hash
  - Ajouter commentaires sur l'algorithme de multiplication des radicaux

## Prochaines étapes

Phase 3 : normalize.ts, denormalize.ts, rules/, intégration Exp

## Commit de référence

À créer après Phase 3
