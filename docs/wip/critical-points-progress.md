# Critical Points — Progress

## Phase 1 : critical-points.ts (DONE)

### Fichiers crees

- `src/lib/mathAST/analysis/critical-points.ts` — findCriticalZeros, findCriticalExtrema, findCriticalInflections
- `src/lib/mathAST/analysis/__tests__/critical-points.test.ts` — 15 tests

### Decisions

- Approche hybride : solve() exact d'abord, bisection numerique en fallback
- Classification extrema via signe de f' autour du zero (pas f'')
- Classification inflections via signe de f'' autour du zero
- Deduplication exact+numerique avec preference pour exact
- Interface CriticalPoint avec x/y exacts (MathNode) + numeriques
- findCriticalInflections accepte compiledSecondDerivative en param (calcule par l'appelant)

### Tests couverts

- Zeros : x^2-4 (exacts +-2), x^3-3x (3 zeros), e^x-1 (transcendant), sin(x) (periodique), intervalle borne, pas de zeros
- Extrema : x^3-3x (min+max), x^2 (min seul), x^3 (pas d'extremum en 0), sin(x)
- Inflections : x^3 (inflexion en 0), x^4 (pas d'inflexion), x^3-3x, sin(x)

## Prochaines etapes

- Phase 2 : Builtins zeros/extrema/inflections dans geometry-core DSL
- Phase 3 : Migration Grapheur
- Phase 4 : Demo + verification
