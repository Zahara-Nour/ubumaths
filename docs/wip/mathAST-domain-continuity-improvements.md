# Améliorations Domain & Continuity - Tracker

Ce document suit la progression des améliorations planifiées pour les modules `domain` et `continuity` de mathAST.

**Date de création**: 2026-01-30
**Dernière mise à jour**: 2026-01-30

---

## Vue d'ensemble des modules

### Module Domain (`src/lib/mathAST/domain/`)

- **15 fichiers** | ~5,500 lignes de code | ~6,445 lignes de tests
- Calcul du domaine de définition, préimage, image (range)
- Registre de 50+ fonctions builtin avec domaines/images
- Validation des réponses élèves

### Module Continuity (`src/lib/mathAST/analysis/`)

- **3 fichiers** | ~1,500 lignes de code | ~500 lignes de tests
- Analyse complète des discontinuités (removable, jump, infinite, essential)
- Détection des patterns périodiques
- Descriptions pédagogiques en français

---

## Améliorations planifiées

### Priorité Haute 🔴

| #   | Amélioration                                                        | Effort | Impact          | Statut     |
| --- | ------------------------------------------------------------------- | ------ | --------------- | ---------- |
| 1   | [Support tan(ax+b) complet](#1-support-tanaxb-complet)              | Moyen  | Précision élève | ⬜ À faire |
| 2   | [Cache pour domaines](#2-cache-pour-domaines)                       | Faible | Performance     | ⬜ À faire |
| 3   | [Messages pédagogiques enrichis](#3-messages-pédagogiques-enrichis) | Faible | UX/Pédagogie    | ⬜ À faire |

### Priorité Moyenne 🟡

| #   | Amélioration                                                                | Effort | Impact          | Statut     |
| --- | --------------------------------------------------------------------------- | ------ | --------------- | ---------- |
| 4   | [Validation élève continuité](#4-validation-élève-continuité)               | Moyen  | Pédagogie       | ⬜ À faire |
| 5   | [Algèbre PeriodicExclusion](#5-algèbre-periodicexclusion)                   | Élevé  | Complétude math | ⬜ À faire |
| 6   | [Détection erreurs courantes élèves](#6-détection-erreurs-courantes-élèves) | Moyen  | Pédagogie       | ⬜ À faire |
| 7   | [Compositions génériques](#7-compositions-génériques)                       | Élevé  | Robustesse      | ⬜ À faire |

### Priorité Basse 🟢

| #   | Amélioration                                         | Effort | Impact           | Statut     |
| --- | ---------------------------------------------------- | ------ | ---------------- | ---------- |
| 8   | [Module dérivabilité](#8-module-dérivabilité)        | Élevé  | Nouvelle feature | ⬜ À faire |
| 9   | [Asymptotes obliques](#9-asymptotes-obliques)        | Élevé  | Feature avancée  | ⬜ À faire |
| 10  | [Piecewise user-defined](#10-piecewise-user-defined) | Élevé  | Nouvelle feature | ⬜ À faire |
| 11  | [Solver unifié](#11-solver-unifié)                   | Élevé  | Maintenabilité   | ⬜ À faire |
| 12  | [Tests de performance](#12-tests-de-performance)     | Faible | Qualité          | ⬜ À faire |

---

## Détails des améliorations

### 1. Support tan(ax+b) complet

**Problème actuel**: `computeTrigPeriodicExclusion` dans `builtins.ts` retourne `null` pour les arguments linéaires comme `tan(2x)` ou `cot(x/3 + π/4)`. Le module continuity doit utiliser un fallback.

**Solution proposée**:

```typescript
// Dans builtins.ts
function computeTrigPeriodicExclusionLinear(
	funcName: string,
	arg: MathNode,
	variable: string
): PeriodicExclusion | null {
	// tan(ax + b): exclusions à (π/2 - b + kπ) / a
	const { coefficient, offset } = extractLinearCoefficients(arg, variable);
	if (coefficient === null) return null;

	const basePoint = divide(subtract(baseTrigExclusion, offset), coefficient);
	const period = divide(π, abs(coefficient));
	return createPeriodicExclusion(basePoint, period);
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/builtins.ts`
- `src/lib/mathAST/domain/compute.ts`

**Tests**: `domain/builtins.test.ts`

---

### 2. Cache pour domaines

**Problème actuel**: Les sous-expressions répétées comme `ln(x) + ln(x)²` recalculent le domaine de `ln(x)` plusieurs fois.

**Solution proposée**:

```typescript
// Dans compute.ts
const domainCache = new WeakMap<MathNode, Domain>();

function computeDomainNodeCached(node: MathNode, variable: string, context: DomainContext): Domain {
	const cached = domainCache.get(node);
	if (cached) return cached;

	const result = computeDomainNode(node, variable, context);
	domainCache.set(node, result);
	return result;
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/compute.ts`

**Tests**: Nouveaux benchmarks dans `domain/compute.test.ts`

---

### 3. Messages pédagogiques enrichis

**Problème actuel**: Les messages de `continuity-steps.ts` et `step-descriptions.ts` sont basiques. Manque d'explications contextuelles.

**Solution proposée**:

- Ajouter des exemples dans les descriptions
- Contextualiser selon le type de fonction
- Ajouter des rappels de cours

**Exemple**:

```typescript
// Avant
'Division par zéro'

// Après
{
  short: 'Division par zéro',
  detailed: 'Le dénominateur s\'annule en ce point, rendant la fraction indéfinie.',
  example: 'Par exemple, 1/x n\'est pas défini en x = 0.',
  courseReminder: 'Rappel : on ne peut jamais diviser par zéro.'
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/analysis/continuity-steps.ts`
- `src/lib/mathAST/domain/step-descriptions.ts`

---

### 4. Validation élève continuité

**Problème actuel**: Le module `validate.ts` existe pour les domaines mais pas d'équivalent pour la continuité.

**Solution proposée**:
Créer `continuity-validate.ts` pour:

- Parser les réponses élèves ("discontinuité en x=0", "continue sur ℝ\*")
- Comparer avec le résultat correct
- Générer des indices pédagogiques
- Détecter les erreurs courantes

**Structure**:

```typescript
interface ContinuityValidationResult {
	isCorrect: boolean;
	similarity: number;
	missingDiscontinuities: Discontinuity[];
	extraDiscontinuities: StudentDiscontinuity[];
	typeErrors: TypeMismatch[];
	hints: string[];
}

function validateStudentContinuity(
	studentAnswer: string,
	correctResult: ContinuityResult
): ContinuityValidationResult;
```

**Fichiers à créer**:

- `src/lib/mathAST/analysis/continuity-validate.ts`
- `src/lib/mathAST/analysis/continuity-validate.test.ts`

---

### 5. Algèbre PeriodicExclusion

**Problème actuel**: L'union/intersection de deux `PeriodicExclusion` utilise des approximations. Exemple: `tan(x) * cot(x)` a des exclusions aux deux patterns.

**Solution proposée**:

```typescript
function intersectPeriodicExclusions(
	p1: PeriodicExclusion,
	p2: PeriodicExclusion
): PeriodicExclusion | IntervalSet {
	const ratio = evaluateNumeric(divide(p1.period, p2.period));
	if (isRational(ratio)) {
		// Calculer le PPCM des périodes
		const commonPeriod = lcmPeriod(p1.period, p2.period);
		// Énumérer les exclusions sur une période commune
		return computeCommonExclusions(p1, p2, commonPeriod);
	}
	// Périodes incommensurables: retourner union explicite
	return createUnionPeriodicExclusion([p1, p2]);
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/algebra.ts`
- `src/lib/mathAST/domain/types.ts` (nouveau type `UnionPeriodicExclusion`)

---

### 6. Détection erreurs courantes élèves

**Problème actuel**: La validation détecte si la réponse est fausse mais ne diagnostique pas précisément l'erreur.

**Solution proposée**:

```typescript
const COMMON_STUDENT_MISTAKES = {
	forgot_zero_exclusion: {
		detect: (correct, student) => student.includes(0) && !correct.includes(0),
		hint: 'Attention, le 0 est-il dans le domaine ?'
	},
	wrong_inequality_direction: {
		detect: (correct, student) => areEndpointsSwapped(correct, student),
		hint: "Vérifie le sens de l'inégalité"
	},
	missing_union_part: {
		detect: (correct, student) => correct.intervals.length > student.intervals.length,
		hint: 'Le domaine comporte-t-il plusieurs parties ?'
	},
	open_vs_closed_bound: {
		detect: (correct, student) => boundTypesMismatch(correct, student),
		hint: 'La borne est-elle incluse ou exclue ?'
	}
};
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/validate.ts`

---

### 7. Compositions génériques

**Problème actuel**: Les compositions complexes comme `ln(ln(x))` ou `sqrt(1 - x²)` ne sont pas toujours correctement analysées pour la préimage.

**Solution proposée**:

- Améliorer `computePreimage` pour gérer les compositions imbriquées
- Ajouter détection de patterns: `f(g(x))` où f a un domaine restreint
- Propager correctement les contraintes

**Fichiers à modifier**:

- `src/lib/mathAST/domain/preimage.ts`
- `src/lib/mathAST/domain/compute.ts`

---

### 8. Module dérivabilité

**Nouvelle feature**: Analyser la dérivabilité d'une fonction.

**Fonctionnalités**:

- Détecter les points anguleux (ex: `|x|` en 0)
- Détecter les tangentes verticales
- Classifier: dérivable, continue mais non dérivable, discontinue

**Structure proposée**:

```typescript
interface DifferentiabilityResult {
	domain: Domain;
	nonDifferentiablePoints: NonDifferentiablePoint[];
	isDifferentiableOnDomain: boolean;
	steps?: DifferentiabilityStep[];
}

interface NonDifferentiablePoint {
	point: MathNode;
	type: 'angular' | 'vertical_tangent' | 'discontinuity';
	leftDerivative: MathNode | null;
	rightDerivative: MathNode | null;
}
```

**Fichiers à créer**:

- `src/lib/mathAST/analysis/differentiability.ts`
- `src/lib/mathAST/analysis/differentiability-types.ts`
- Tests associés

---

### 9. Asymptotes obliques

**Nouvelle feature**: Extraire les asymptotes obliques pour les fonctions rationnelles.

**Solution proposée**:

```typescript
interface AsymptoticBehavior {
	horizontal?: { left?: number; right?: number };
	vertical: VerticalAsymptote[];
	oblique?: {
		slope: MathNode;
		intercept: MathNode;
		direction: 'left' | 'right' | 'both';
	};
}

function analyzeAsymptotes(expr: MathNode, variable: string): AsymptoticBehavior {
	// Pour f(x) = P(x)/Q(x) avec deg(P) = deg(Q) + 1
	// Division euclidienne → ax + b + R(x)/Q(x)
}
```

**Fichiers à créer**:

- `src/lib/mathAST/analysis/asymptotes.ts`

---

### 10. Piecewise user-defined

**Nouvelle feature**: Supporter les fonctions définies par morceaux par l'utilisateur.

**Exemple d'usage**:

```typescript
const piecewise = createPiecewise([
	{ condition: 'x < 0', expression: '-x' },
	{ condition: 'x >= 0', expression: 'x²' }
]);

analyzeContinuity(piecewise, 'x');
// Détecte automatiquement les points de jonction
```

**Fichiers à créer/modifier**:

- `src/lib/mathAST/types.ts` (nouveau type `PiecewiseNode`)
- `src/lib/mathAST/domain/compute.ts`
- `src/lib/mathAST/analysis/continuity.ts`

---

### 11. Solver unifié

**Problème actuel**: Duplication entre `findZeros` (domain) et `solveEquation` (solve).

**Solution proposée**:

```typescript
// Nouveau: src/lib/mathAST/solve/unified-solver.ts
interface SolverResult {
	solutions: MathNode[];
	method: 'algebraic' | 'numeric' | 'symbolic';
	confidence: 'exact' | 'approximate';
}

function findRoots(
	expr: MathNode,
	variable: string,
	options?: {
		domain?: Domain;
		numeric?: boolean;
		maxSolutions?: number;
	}
): SolverResult;
```

**Migration**: Refactorer `findZeros` et `solveEquation` pour utiliser cette interface commune.

---

### 12. Tests de performance

**Problème actuel**: Pas de benchmarks pour détecter les régressions de performance.

**Solution proposée**:

```typescript
// tests/domain/performance.bench.ts
describe('Domain computation performance', () => {
	it('deeply nested compositions < 100ms', () => {
		const expr = parse('ln(sqrt(ln(sqrt(x))))');
		const start = performance.now();
		computeDomain(expr, 'x');
		expect(performance.now() - start).toBeLessThan(100);
	});

	it('high-degree polynomials < 500ms', () => {
		const expr = buildPolynomial(10);
		// ...
	});

	it('complex range computation < 200ms', () => {
		const expr = parse('(x² - 1)/(x² + 1)');
		// ...
	});
});
```

**Fichiers à créer**:

- `tests/domain/performance.bench.ts`
- `tests/analysis/continuity-performance.bench.ts`

---

## Journal des modifications

| Date       | Amélioration | Action        | Commit |
| ---------- | ------------ | ------------- | ------ |
| 2026-01-30 | -            | Document créé | -      |

---

## Notes techniques

### Dépendances entre améliorations

```
[1] Support tan(ax+b) ←── [5] Algèbre PeriodicExclusion
                              ↓
[2] Cache domaines    ←── [7] Compositions génériques
                              ↓
[4] Validation continuité ←── [8] Dérivabilité
```

### Fichiers clés

| Fichier                  | Lignes | Rôle                     |
| ------------------------ | ------ | ------------------------ |
| `domain/compute.ts`      | 720    | Moteur principal domaine |
| `domain/preimage.ts`     | 831    | Résolution préimage      |
| `domain/builtins.ts`     | 1302   | Registre fonctions       |
| `domain/range.ts`        | 1303   | Calcul d'image           |
| `analysis/continuity.ts` | 979    | Analyse continuité       |

### Tests existants

- `domain/compute.test.ts` (328 lignes)
- `domain/range.test.ts` (1391 lignes)
- `domain/algebra.test.ts` (587 lignes)
- `domain/builtins.test.ts` (698 lignes)
- `domain/edge-cases.test.ts` (959 lignes)
- `analysis/continuity.test.ts` (~500 lignes)
