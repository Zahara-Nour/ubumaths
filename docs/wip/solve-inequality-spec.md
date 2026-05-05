# solveInequality — Spécification V1 (palier 1)

**Statut** : validée par l'utilisateur le 2026-05-05.
**Module cible** : `src/lib/mathAST/solve/inequality/`.

## Objectif

Fournir une API publique `solveInequality(relation, options)` qui résout les
inéquations à coefficients **numériques** en réutilisant la pile existante
`analyzeSign` + `solve`. Les bornes du domaine solution sont des `MathNode`
**symboliques exacts** (radicaux, fractions, π…), pas des approximations
flottantes.

Hors scope V1 (à voir en palier 2) :

- Inéquations à coefficients paramétriques (discussion de cas).
- Génération pédagogique d'étapes (Δ, tableau de signes, etc.).

## Décisions verrouillées (Q1-Q6)

| Q   | Décision                                                                                          |
| --- | ------------------------------------------------------------------------------------------------- |
| Q1  | `!=` est supporté (`solution = Df \ zeros`).                                                      |
| Q2  | Sortie : `SolveInequalityResult` (Domain + métadonnées), pas un `Domain` brut.                    |
| Q3  | Périodiques non bornées : pas de throw — status `'partial'` + warning provenant de `analyzeSign`. |
| Q4  | Coefs paramétriques : throw `InequalityNotSolvable` (variables libres ≠ variable cible).          |
| Q5  | `'partial'` par défaut quand un sous-intervalle reste `unknown`. Throw si `strictMode: true`.     |
| Q6  | Module : dossier `solve/inequality/` avec `index.ts`, `types.ts`, `__tests__/`.                   |

## API

```ts
interface SolveInequalityOptions {
	variable?: string;
	domain?: Domain;
	numericFallback?: boolean; // default true
	strictMode?: boolean; // default false — true throws on 'partial'
	tolerance?: number;
}

interface SolveInequalityResult {
	variable: string;
	relation: '<' | '>' | '<=' | '>=' | '!=';
	expression: MathNode; // f − g sous forme normalisée
	domain: Domain; // Df utilisé
	solution: Domain; // ⇐ résultat
	status:
		| 'complete' // toutes les régions ont été décidées
		| 'partial' // au moins une région 'unknown' (warnings rempli)
		| 'no-solution' // solution = ∅
		| 'all-real' // solution = Df complet
		| 'empty-domain'; // Df = ∅
	warnings?: string[];
	signTable?: SignAnalysisResult; // exposé pour debug / future pédagogie
}

class SolveInequalityError extends Error {} // mauvais usage (relation '=', etc.)
class InequalityNotSolvable extends Error {} // paramétrique, hors scope
```

## Comportements (23 cas)

### Polynômes numériques (1-9)

1. `x − 3 < 0` → `]-∞, 3[`
2. `2x + 1 ≥ 0` → `[-1/2, +∞[`
3. `x² − 4 ≤ 0` → `[-2, 2]`
4. `x² − 2 < 0` → `]-√2, √2[` (bornes `MathNode` exactes)
5. `(x − 1)(x + 3) > 0` → `]-∞, -3[ ∪ ]1, +∞[`
6. `(x − 1)² ≥ 0` → `R`, status `'all-real'`
7. `(x − 1)² > 0` → `R \ {1}`
8. `x² + 1 < 0` → `∅`, status `'no-solution'`
9. `x² + 1 ≥ 0` → `R`, status `'all-real'`

### Restriction de domaine (10-13)

10. `1/x > 0` → `]0, +∞[`
11. `1/(x − 2) ≤ 0` → `]-∞, 2[` (le 2 est exclu de Df)
12. `ln(x) ≥ 0` → `[1, +∞[`
13. `√(x − 1) > 2` → `]5, +∞[`

### Transcendantes (14-16)

14. `e^x − 1 > 0` → `]0, +∞[`
15. `sin(x) ≥ 0` sur `[0, 2π]` (via `options.domain`) → `[0, π] ∪ {2π}` ou équivalent
16. `cos(x) ≤ 0` sans `options.domain` borné → status `'partial'` + warnings

### `!=` (17-18)

17. `x² − 4 ≠ 0` → `R \ {-2, 2}`
18. `sin(x) ≠ 0` sur `[0, 2π]` → `]0, π[ ∪ ]π, 2π[`

### Erreurs et dégénérés (19-21)

19. `relation === '='` → throw `SolveInequalityError`
20. `mx + 1 < 0` (coef paramétrique) → throw `InequalityNotSolvable`
21. `analyzeSign` renvoie `'unknown'` sur un sous-intervalle → status `'partial'` + warning ; throw si `strictMode: true`

### Forme normalisée (22-23)

22. `f(x) < g(x)` réécrit en `f − g < 0` (idempotent : `g > f` doit donner le même résultat)
23. `2 < x` produit le même résultat que `x > 2`

## Algorithme interne

```
solveInequality(rel, opts):
  1. Valider: isRelation, op ∈ {<, >, <=, >=, !=}
  2. expr = canon(left − right)             # forme f ⊻ 0
  3. variable = opts.variable ?? detectVariable(rel)
  4. Si variable === null:                   # cas constante (0 < 1, etc.)
       évaluer expr → décider all-real / no-solution
  5. Détection paramétrique :
       freeVars = getVariables(expr) \ {variable}
       si freeVars non vide → throw InequalityNotSolvable
  6. signResult = analyzeSign(expr, { variable, domain, numericFallback })
  7. matching = signResult.signedIntervals.filter(matchesOp(op))
  8. solution = mergeIntervals(matching)     # construit le Domain
  9. status =
       - empty-domain   si Df = ∅
       - all-real       si solution = Df
       - no-solution    si solution = ∅
       - partial        si au moins un signedInterval 'unknown' rencontré
       - complete       sinon
 10. Si status === 'partial' && strictMode → throw
 11. Return SolveInequalityResult
```

`matchesOp` :

| op   | signs acceptés             |
| ---- | -------------------------- |
| `<`  | `'negative'`               |
| `<=` | `'negative'`, `'zero'`     |
| `>`  | `'positive'`               |
| `>=` | `'positive'`, `'zero'`     |
| `!=` | `'positive'`, `'negative'` |

Les sous-intervalles `'unknown'` ne matchent jamais (conservatif) ; leur
présence force `status = 'partial'`.
