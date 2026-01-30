# Améliorations Domain & Continuity - Tracker

Ce document suit la progression des améliorations planifiées pour les modules `domain` et `continuity` de mathAST.

**Date de création**: 2026-01-30
**Dernière mise à jour**: 2026-01-30 (Phase 2 terminée)

---

## Vue d'ensemble des modules

### Module Domain (`src/lib/mathAST/domain/`)

- **15 fichiers** | ~8,500 lignes de code | ~6,445 lignes de tests
- Calcul du domaine de définition, préimage, image (range)
- Registre de 50+ fonctions builtin avec domaines/images
- Validation des réponses élèves
- Solveur polynomial jusqu'au degré 3 (Cardano)

**Points forts**: Gestion des compositions imbriquées, solveur cubique robuste
**Points faibles**: Pas de support tan(ax+b), limité degré 3, code répétitif dans algebra.ts

### Module Continuity (`src/lib/mathAST/analysis/`)

- **3 fichiers** | ~1,500 lignes de code | ~500 lignes de tests
- Analyse complète des discontinuités (removable, jump, infinite, essential)
- Détection des patterns périodiques
- Descriptions pédagogiques en français

**Points forts**: Classification fiable des discontinuités, intégration domaine
**Points faibles**: Dépendance forte au module limits, discontinuités essentielles limitées

---

## Améliorations planifiées

### Priorité Haute 🔴

| #   | Amélioration                                                   | Effort | Impact          | Statut      |
| --- | -------------------------------------------------------------- | ------ | --------------- | ----------- |
| 1   | [Support tan(ax+b) complet](#1-support-tanaxb-complet)         | Moyen  | Précision       | ✅ Terminé  |
| 13  | [Domaine de dérivabilité](#13-domaine-de-dérivabilité)         | Élevé  | Fonctionnalité  | ✅ Terminé  |
| 14  | [Solveur polynomial degré 4](#14-solveur-polynomial-degré-4)   | Moyen  | Précision       | ✅ Terminé  |
| 15  | [Discontinuités essentielles](#15-discontinuités-essentielles) | Moyen  | Complétude math | ⬜ À faire  |
| 2   | [Cache pour domaines](#2-cache-pour-domaines)                  | Faible | Performance     | ❌ Supprimé |

### Priorité Moyenne 🟡

| #   | Amélioration                                                              | Effort | Impact          | Statut     |
| --- | ------------------------------------------------------------------------- | ------ | --------------- | ---------- |
| 5   | [Algèbre PeriodicExclusion](#5-algèbre-periodicexclusion)                 | Élevé  | Complétude math | ⬜ À faire |
| 7   | [Compositions génériques](#7-compositions-génériques)                     | Élevé  | Robustesse      | ⬜ À faire |
| 11  | [Solver unifié](#11-solver-unifié)                                        | Élevé  | Maintenabilité  | ⬜ À faire |
| 4   | [Validation élève continuité](#4-validation-élève-continuité)             | Moyen  | Pédagogie       | ⬜ À faire |
| 16  | [Intervalle d'analyse configurable](#16-intervalle-danalyse-configurable) | Faible | Flexibilité     | ⬜ À faire |
| 17  | [Valeurs absolues composées](#17-valeurs-absolues-composées)              | Moyen  | Dérivabilité    | ✅ Terminé |

### Priorité Basse 🟢

| #   | Amélioration                                                                | Effort | Impact         | Statut     |
| --- | --------------------------------------------------------------------------- | ------ | -------------- | ---------- |
| 3   | [Messages pédagogiques enrichis](#3-messages-pédagogiques-enrichis)         | Faible | UX/Pédagogie   | ⬜ À faire |
| 6   | [Détection erreurs courantes élèves](#6-détection-erreurs-courantes-élèves) | Moyen  | Pédagogie      | ⬜ À faire |
| 12  | [Tests de performance](#12-tests-de-performance)                            | Faible | Qualité        | ⬜ À faire |
| 18  | [Refactoring algebra.ts](#18-refactoring-algebrats)                         | Moyen  | Maintenabilité | ⬜ À faire |
| 19  | [Fonctions hyperboliques inverses](#19-fonctions-hyperboliques-inverses)    | Faible | Complétude     | ⬜ À faire |
| 20  | [Export des étapes de calcul](#20-export-des-étapes-de-calcul)              | Moyen  | Pédagogie      | ⬜ À faire |
| 8   | [Analyse dérivabilité complète](#8-analyse-dérivabilité-complète)           | Élevé  | Feature        | ⬜ À faire |
| 9   | [Asymptotes obliques](#9-asymptotes-obliques)                               | Élevé  | Feature        | ⬜ À faire |
| 10  | [Piecewise user-defined](#10-piecewise-user-defined)                        | Élevé  | Feature        | ⬜ À faire |

---

## Détails des améliorations

### 1. Support tan(ax+b) complet

**Problème actuel**: `getPeriodicExclusionDomain` dans `builtins.ts` retourne `null` pour les arguments linéaires comme `tan(2x)` ou `cot(x/3 + π/4)`. Le module continuity doit utiliser un fallback.

**Code concerné** (`builtins.ts:~450`):

```typescript
// Case 2: Linear argument (tan(ax + b)) - more complex preimage computation
// For now, return null and let the continuity module handle detection
// TODO: Implement preimage computation for linear arguments
return null;
```

**Solution proposée**:

```typescript
// Dans builtins.ts
function computeTrigPeriodicExclusionLinear(
	funcName: string,
	arg: MathNode,
	variable: string
): PeriodicExclusion | null {
	// Extraire coefficients linéaires: ax + b
	const { coefficient, offset } = extractLinearCoefficients(arg, variable);
	if (coefficient === null) return null;

	// tan(ax + b): exclusions quand ax + b = π/2 + kπ
	// Donc x = (π/2 - b + kπ) / a
	const baseTrigExclusion = getTrigBaseExclusion(funcName); // π/2 pour tan, 0 pour cot
	const basePoint = divide(subtract(baseTrigExclusion, offset), coefficient);
	const period = divide(π, abs(coefficient));

	return createPeriodicExclusion(basePoint, period);
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/builtins.ts`
- `src/lib/mathAST/domain/compute.ts`

**Tests à ajouter** dans `domain/builtins.test.ts`:

- `tan(2x)` → exclusions à π/4 + kπ/2
- `cot(x/3 + π/4)` → exclusions calculées
- `sec(3x - π/6)` → exclusions calculées

---

### 2. Cache pour domaines ❌ SUPPRIMÉ

**Statut**: Supprimé après analyse - bénéfice minimal dans le contexte UbuMaths.

**Raison de la suppression**:

Après implémentation et analyse des patterns d'utilisation réels:

1. **Pas de duplication au niveau UI**: Les composants (grapheur, calculatrice) n'appellent pas `computeDomain` directement
2. **Architecture avec passage de domaine**: Les modules passent déjà le domaine en paramètre entre eux (`computeVariations`, `analyzeSign`, etc.)
3. **Chaque module calcule un domaine DIFFÉRENT**: `computeVariations(f)` → domaine de f, `findCriticalPoints(f')` → domaine de f' (différent!)
4. **Surcoût de la clé cache**: La génération de clé (LaTeX ou JSON) peut annuler les gains

**Conclusion**: La complexité ajoutée ne justifie pas le bénéfice quasi-nul dans l'usage réel d'UbuMaths.

---

### 3. Messages pédagogiques enrichis

**Problème actuel**: Les messages de `continuity-steps.ts` et `step-descriptions.ts` sont basiques. Manque d'explications contextuelles.

**Solution proposée**:

```typescript
// Avant
'Division par zéro';

// Après
interface PedagogicalMessage {
	short: string;
	detailed: string;
	example?: string;
	courseReminder?: string;
}

const MESSAGES: Record<string, PedagogicalMessage> = {
	division_by_zero: {
		short: 'Division par zéro',
		detailed: "Le dénominateur s'annule en ce point, rendant la fraction indéfinie.",
		example: "Par exemple, 1/x n'est pas défini en x = 0.",
		courseReminder: 'Rappel : on ne peut jamais diviser par zéro.'
	},
	log_of_non_positive: {
		short: "Logarithme d'un nombre négatif ou nul",
		detailed: "Le logarithme n'est défini que pour les réels strictement positifs.",
		example: 'ln(x) nécessite x > 0.',
		courseReminder: 'Rappel : ln : ]0, +∞[ → ℝ'
	}
	// ...
};
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

interface TypeMismatch {
	point: MathNode;
	expectedType: DiscontinuityType;
	studentType: DiscontinuityType;
	hint: string;
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

**Problème actuel**: L'union/intersection de deux `PeriodicExclusion` utilise des approximations. Exemple: `tan(x) * cot(x)` a des exclusions aux deux patterns (kπ et π/2 + kπ).

**Code concerné** (`algebra.ts:~150`):

```typescript
if (a.kind === 'periodic_exclusion' && b.kind === 'periodic_exclusion') {
	// Currently returns approximation
	return approximatePeriodicIntersection(a, b);
}
```

**Solution proposée**:

```typescript
function intersectPeriodicExclusions(
	p1: PeriodicExclusion,
	p2: PeriodicExclusion
): PeriodicExclusion | UnionPeriodicExclusion | IntervalSet {
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

// Nouveau type
interface UnionPeriodicExclusion {
	kind: 'union_periodic_exclusion';
	components: PeriodicExclusion[];
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
		detect: (correct: Domain, student: Domain) =>
			containsValue(student, 0) && !containsValue(correct, 0),
		hint: 'Attention, le 0 est-il dans le domaine ?'
	},
	wrong_inequality_direction: {
		detect: (correct: Domain, student: Domain) => areEndpointsSwapped(correct, student),
		hint: "Vérifie le sens de l'inégalité"
	},
	missing_union_part: {
		detect: (correct: Domain, student: Domain) =>
			getIntervalCount(correct) > getIntervalCount(student),
		hint: 'Le domaine comporte-t-il plusieurs parties ?'
	},
	open_vs_closed_bound: {
		detect: (correct: Domain, student: Domain) => boundTypesMismatch(correct, student),
		hint: 'La borne est-elle incluse ou exclue ?'
	},
	confused_domain_range: {
		detect: (correct: Domain, student: Domain, expr: MathNode) => isLikelyRange(student, expr),
		hint: 'Attention à ne pas confondre domaine et image !'
	}
};
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/validate.ts`

---

### 7. Compositions génériques

**Problème actuel**: Les compositions complexes comme `ln(ln(x))` ou `sqrt(1 - x²)` ne sont pas toujours correctement analysées pour la préimage.

**Cas problématiques identifiés**:

- `ln(ln(x))` → nécessite ln(x) > 0 donc x > 1
- `sqrt(1 - x²)` → nécessite 1 - x² ≥ 0 donc x ∈ [-1, 1]
- `arcsin(2x - 1)` → nécessite -1 ≤ 2x - 1 ≤ 1 donc x ∈ [0, 1]

**Solution proposée**:

```typescript
function computeCompositionDomain(outer: MathNode, inner: MathNode, variable: string): Domain {
	// 1. Obtenir le domaine requis pour l'argument de outer
	const outerArgDomain = getRequiredArgumentDomain(outer);

	// 2. Calculer la préimage: {x : inner(x) ∈ outerArgDomain}
	const preimage = computePreimage(inner, outerArgDomain, variable);

	// 3. Intersecter avec le domaine de inner
	const innerDomain = computeDomain(inner, variable);

	return intersect(preimage, innerDomain);
}

// Améliorer computePreimage pour les cas polynomiaux
function computePreimagePolynomial(poly: MathNode, targetDomain: Domain, variable: string): Domain {
	// Pour poly(x) ∈ [a, b]:
	// Résoudre poly(x) - a ≥ 0 ET poly(x) - b ≤ 0
	// Utiliser le solveur polynomial
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/preimage.ts`
- `src/lib/mathAST/domain/compute.ts`

---

### 8. Analyse dérivabilité complète

**Note**: Cette amélioration est maintenant séparée du #13 (domaine de dérivabilité).

**Nouvelle feature**: Analyser la dérivabilité complète d'une fonction avec classification.

**Fonctionnalités**:

- Détecter les points anguleux (ex: `|x|` en 0)
- Détecter les tangentes verticales (ex: `x^(1/3)` en 0)
- Détecter les cusps (ex: `x^(2/3)` en 0)
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
	type: 'angular' | 'cusp' | 'vertical_tangent' | 'discontinuity';
	leftDerivative: MathNode | 'infinite' | 'undefined';
	rightDerivative: MathNode | 'infinite' | 'undefined';
	description: string;
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
	horizontal?: {
		left?: MathNode;
		right?: MathNode;
	};
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
	// L'asymptote oblique est y = ax + b
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
// Détecte automatiquement les points de jonction et analyse la continuité
```

**Fichiers à créer/modifier**:

- `src/lib/mathAST/types.ts` (nouveau type `PiecewiseNode`)
- `src/lib/mathAST/domain/compute.ts`
- `src/lib/mathAST/analysis/continuity.ts`

---

### 11. Solver unifié

**Problème actuel**: Duplication entre `findZeros` (domain) et `solveEquation` (solve). Le code utilise actuellement un fallback à trois niveaux:

1. `findZeros` (domain/preimage.ts)
2. `solveEquation` (solve/index.ts)
3. Abandon

**Solution proposée**:

```typescript
// Nouveau: src/lib/mathAST/solve/unified-solver.ts
interface SolverResult {
	solutions: MathNode[];
	method: 'algebraic' | 'numeric' | 'symbolic';
	confidence: 'exact' | 'approximate';
	domain?: Domain; // Domaine de recherche utilisé
}

interface SolverOptions {
	domain?: Domain;
	numeric?: boolean;
	maxSolutions?: number;
	tolerance?: number;
}

function findRoots(expr: MathNode, variable: string, options?: SolverOptions): SolverResult;

// Stratégies internes
function solvePolynomial(expr: MathNode, variable: string): SolverResult;
function solveTranscendental(expr: MathNode, variable: string): SolverResult;
function solveNumeric(expr: MathNode, variable: string, domain: Domain): SolverResult;
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
		const start = performance.now();
		computeDomain(expr, 'x');
		expect(performance.now() - start).toBeLessThan(500);
	});

	it('complex range computation < 200ms', () => {
		const expr = parse('(x² - 1)/(x² + 1)');
		const start = performance.now();
		computeRange(expr, 'x', computeDomain(expr, 'x'));
		expect(performance.now() - start).toBeLessThan(200);
	});

	it('repeated subexpressions benefit from cache', () => {
		const expr = parse('ln(x) + ln(x)² + ln(x)³');
		// Avec cache: ~3x plus rapide
	});
});
```

**Fichiers à créer**:

- `src/lib/mathAST/domain/__tests__/performance.bench.ts`
- `src/lib/mathAST/analysis/__tests__/continuity-performance.bench.ts`

---

### 13. Domaine de dérivabilité

**Nouvelle amélioration critique**: Calculer le domaine où une fonction est dérivable.

**Problème**: Actuellement, on peut calculer le domaine de définition et analyser la continuité, mais pas le domaine de dérivabilité qui est essentiel en analyse.

**Cas à gérer**:

- `|x|` → dérivable sur ℝ \ {0} (point anguleux en 0)
- `x^(1/3)` → dérivable sur ℝ \ {0} (tangente verticale en 0)
- `x^(2/3)` → dérivable sur ℝ \ {0} (cusp en 0)
- `sqrt(x)` → dérivable sur ]0, +∞[ (pas dérivable en 0)
- `floor(x)` → dérivable sur ℝ \ ℤ

**Solution proposée**:

```typescript
// Dans domain/differentiability.ts
interface DifferentiabilityDomain {
	domain: Domain;                          // Où f est dérivable
	nonDifferentiablePoints: NonDifferentiablePoint[];
	boundaryBehavior: BoundaryBehavior[];    // Comportement aux bords du domaine
}

interface NonDifferentiablePoint {
	point: MathNode;
	reason: 'angular' | 'cusp' | 'vertical_tangent' | 'discontinuity';
	isContinuous: boolean;                   // Continue mais non dérivable?
	leftDerivative?: MathNode | 'infinite' | 'undefined';
	rightDerivative?: MathNode | 'infinite' | 'undefined';
}

interface BoundaryBehavior {
	point: MathNode;
	side: 'left' | 'right';
	derivativeLimit: MathNode | 'infinite' | 'undefined';
}

function computeDifferentiabilityDomain(
	expr: MathNode,
	variable: string
): DifferentiabilityDomain {
	// 1. Partir du domaine de continuité (inclut domaine de définition)
	const continuityResult = analyzeContinuity(expr, variable);

	// 2. Identifier les points non dérivables dans le domaine de continuité
	const nonDiffPoints = findNonDifferentiablePoints(expr, variable, continuityResult);

	// 3. Exclure ces points du domaine
	let diffDomain = continuityResult.domainOfContinuity;
	for (const point of nonDiffPoints) {
		diffDomain = excludePoint(diffDomain, point.point);
	}

	return { domain: diffDomain, nonDifferentiablePoints: nonDiffPoints, ... };
}
```

**Détection des points non dérivables**:

```typescript
function findNonDifferentiablePoints(
	expr: MathNode,
	variable: string,
	continuityResult: ContinuityResult
): NonDifferentiablePoint[] {
	const points: NonDifferentiablePoint[] = [];

	// 1. Points de discontinuité → non dérivables
	for (const disc of continuityResult.discontinuities) {
		points.push({
			point: disc.point,
			reason: 'discontinuity',
			isContinuous: false
		});
	}

	// 2. Détecter |f(x)| → points anguleux où f(x) = 0
	const absPatterns = findAbsPatterns(expr);
	for (const { inner } of absPatterns) {
		const zeros = findZeros(inner, variable);
		for (const zero of zeros) {
			if (containsValue(continuityResult.domainOfContinuity, zero)) {
				points.push({
					point: zero,
					reason: 'angular',
					isContinuous: true,
					leftDerivative: evaluateDerivative(expr, variable, zero, 'left'),
					rightDerivative: evaluateDerivative(expr, variable, zero, 'right')
				});
			}
		}
	}

	// 3. Détecter x^(p/q) avec q impair, p < q → tangente verticale en 0
	// 4. Détecter x^(p/q) avec p pair, q impair, p < q → cusp en 0
	// 5. Détecter sqrt, racines → bord du domaine

	return points;
}
```

**Fichiers à créer**:

- `src/lib/mathAST/domain/differentiability.ts`
- `src/lib/mathAST/domain/differentiability-types.ts`
- `src/lib/mathAST/domain/__tests__/differentiability.test.ts`

---

### 14. Solveur polynomial degré 4

**Problème actuel**: `preimage.ts` utilise la formule de Cardano pour le degré 3, mais les quartiques (x⁴) sont fréquentes et non gérées.

**Cas non gérés actuellement**:

```typescript
computeDomain('1/(x^4 - 1)', 'x'); // Devrait exclure x = ±1
computeDomain('sqrt(1 - x^4)', 'x'); // Devrait donner [-1, 1]
computeDomain('ln(x^4 - x^2)', 'x'); // Complexe
```

**Solution proposée**:

```typescript
// Dans preimage.ts - ajouter Ferrari's method
function solveQuartic(a: number, b: number, c: number, d: number, e: number): number[] {
	// ax^4 + bx^3 + cx^2 + dx + e = 0
	// Normaliser: x^4 + px^3 + qx^2 + rx + s = 0
	// Méthode de Ferrari:
	// 1. Introduire variable auxiliaire y
	// 2. Résoudre cubique résolvante
	// 3. Factoriser en deux quadratiques
	// Alternative: méthode numérique de Newton pour robustesse
}

function solvePolynomialDegree4(coefficients: number[], options?: { numeric?: boolean }): number[] {
	if (options?.numeric) {
		return newtonRaphsonMultiple(coefficients);
	}
	return ferrariMethod(coefficients);
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/preimage.ts`

**Tests à ajouter**:

- `x^4 - 1 = 0` → [±1]
- `x^4 - 5x^2 + 4 = 0` → [±1, ±2]
- `x^4 + x^2 + 1 = 0` → [] (pas de racines réelles)

---

### 15. Discontinuités essentielles

**Problème actuel**: `sin(1/x)` près de 0 n'est pas correctement classifié comme discontinuité essentielle.

**Cas problématiques**:

```typescript
analyzeContinuity('sin(1/x)', 'x'); // Devrait: essential discontinuity at 0
analyzeContinuity('cos(1/(x-1))', 'x'); // Devrait: essential discontinuity at 1
analyzeContinuity('x*sin(1/x)', 'x'); // Devrait: removable discontinuity at 0
```

**Solution proposée**:

```typescript
function detectEssentialDiscontinuity(expr: MathNode, point: MathNode, variable: string): boolean {
	// Détecter les patterns f(1/g(x)) où g(point) = 0 et f est oscillante

	// Pattern 1: sin(1/(x-a)) ou cos(1/(x-a))
	const oscillatoryComposition = findOscillatoryComposition(expr, variable);
	if (oscillatoryComposition) {
		const { oscillatory, inner } = oscillatoryComposition;
		// Vérifier si inner → ±∞ quand x → point
		if (goesToInfinity(inner, point, variable)) {
			return true;
		}
	}

	// Pattern 2: Oscillation intrinsèque (ex: sin(x) quand x → ∞)
	// Pas applicable pour un point fini

	return false;
}

function classifyDiscontinuity(
	expr: MathNode,
	point: MathNode,
	variable: string
): DiscontinuityType {
	// 1. Vérifier discontinuité essentielle d'abord
	if (detectEssentialDiscontinuity(expr, point, variable)) {
		return 'essential';
	}

	// 2. Puis les autres types (infinite, jump, removable)
	// ... code existant
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/analysis/continuity.ts`

**Tests à ajouter**:

- `sin(1/x)` at 0 → essential
- `x*sin(1/x)` at 0 → removable (limite = 0)
- `exp(1/x)` at 0 → infinite (one-sided)

---

### 16. Intervalle d'analyse configurable

**Problème actuel**: L'intervalle standard `[-2π, 2π]` est hardcodé dans `continuity.ts`.

```typescript
// Actuellement hardcodé
const STANDARD_INTERVAL_BOUND = 2 * Math.PI;
```

**Solution proposée**:

```typescript
interface ContinuityOptions {
	analysisInterval?: Interval; // Par défaut: [-2π, 2π]
	maxDiscontinuities?: number; // Par défaut: 100
	includePeriodicPattern?: boolean; // Par défaut: true
	numericTolerance?: number; // Par défaut: 1e-10
}

function analyzeContinuity(
	expr: MathNode | string,
	variable: string,
	options?: ContinuityOptions
): ContinuityResult {
	const interval = options?.analysisInterval ?? createInterval(-2 * Math.PI, 2 * Math.PI);
	// ...
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/analysis/continuity.ts`
- `src/lib/mathAST/analysis/continuity-types.ts`

---

### 17. Valeurs absolues composées

**Problème actuel**: `|f(x)|` crée des points anguleux aux zéros de f(x), mais ce n'est pas bien détecté pour le domaine de dérivabilité.

**Cas à gérer**:

```typescript
// |x² - 1| a des points anguleux en x = ±1
computeDifferentiabilityDomain('abs(x^2 - 1)', 'x');
// Devrait retourner: ℝ \ {-1, 1}

// |sin(x)| a des points anguleux en x = kπ
computeDifferentiabilityDomain('abs(sin(x))', 'x');
// Devrait retourner: ℝ \ {kπ}
```

**Solution proposée**:

```typescript
function findAbsAngularPoints(expr: MathNode, variable: string): MathNode[] {
	const angularPoints: MathNode[] = [];

	// Trouver tous les patterns |f(x)|
	const absNodes = findNodes(expr, (node) => node.type === 'function' && node.name === 'abs');

	for (const absNode of absNodes) {
		const inner = absNode.args[0];
		// Les points anguleux sont les zéros de inner
		const zeros = findZeros(inner, variable);
		angularPoints.push(...zeros);
	}

	return angularPoints;
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/differentiability.ts` (intégré au #13)

---

### 18. Refactoring algebra.ts

**Problème actuel**: Le pattern matching est répété 5 fois pour les différentes opérations ensemblistes.

```typescript
// Code dupliqué dans intersect, union, complement, difference, excludePoints
if (a.kind === 'condition_domain') {
	/* convert and recurse */
}
if (b.kind === 'condition_domain') {
	/* convert and recurse */
}
if (a.kind === 'periodic_exclusion' && b.kind === 'periodic_exclusion') {
	/* ... */
}
if (a.kind === 'periodic_exclusion') {
	/* ... */
}
if (b.kind === 'periodic_exclusion') {
	/* ... */
}
return intervalsOperation(a, b);
```

**Solution proposée**:

```typescript
// Normaliser les domaines avant opération
type NormalizedDomain = IntervalSet | PeriodicExclusion | UnionPeriodicExclusion;

function normalizeDomain(domain: Domain): NormalizedDomain {
	if (domain.kind === 'condition_domain') {
		return convertConditionToIntervals(domain);
	}
	return domain as NormalizedDomain;
}

// Dispatch centralisé
function domainOperation(op: 'intersect' | 'union' | 'difference', a: Domain, b: Domain): Domain {
	const normA = normalizeDomain(a);
	const normB = normalizeDomain(b);

	// Table de dispatch
	const handler = OPERATION_HANDLERS[`${normA.kind}_${op}_${normB.kind}`];
	if (handler) {
		return handler(normA, normB);
	}

	// Fallback: convertir en IntervalSet et opérer
	return fallbackOperation(op, normA, normB);
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/algebra.ts`

---

### 19. Fonctions hyperboliques inverses

**Problème actuel**: `asinh`, `acosh`, `atanh` ne sont pas dans le registre `builtins.ts`.

**Solution proposée**:

```typescript
// Dans builtins.ts
const BUILTIN_DOMAINS: Record<string, BuiltinDomainInfo> = {
	// ... existing ...

	asinh: {
		domain: () => universalDomain(), // Défini sur ℝ
		range: () => universalDomain() // Image = ℝ
	},
	acosh: {
		domain: () => createIntervalDomain(1, Infinity, true, false), // [1, +∞[
		range: () => createIntervalDomain(0, Infinity, true, false) // [0, +∞[
	},
	atanh: {
		domain: () => createIntervalDomain(-1, 1, false, false), // ]-1, 1[
		range: () => universalDomain() // Image = ℝ
	},
	asech: {
		domain: () => createIntervalDomain(0, 1, false, true), // ]0, 1]
		range: () => createIntervalDomain(0, Infinity, true, false)
	},
	acsch: {
		domain: () => excludePoint(universalDomain(), 0), // ℝ*
		range: () => excludePoint(universalDomain(), 0)
	},
	acoth: {
		domain: () =>
			union(
				createIntervalDomain(-Infinity, -1, false, false),
				createIntervalDomain(1, Infinity, false, false)
			), // ]-∞, -1[ ∪ ]1, +∞[
		range: () => excludePoint(universalDomain(), 0)
	}
};
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/builtins.ts`

---

### 20. Export des étapes de calcul

**Problème actuel**: `computeDomain` ne retourne pas les étapes de raisonnement, contrairement à `analyzeContinuity` qui a un système de `steps`.

**Solution proposée**:

```typescript
interface DomainResult {
	domain: Domain;
	steps?: DomainStep[];
}

interface DomainStep {
	type: 'constraint' | 'intersection' | 'composition' | 'result';
	description: string;
	subDomain?: Domain;
	source?: string; // Ex: "logarithme", "division", "racine carrée"
}

function computeDomainWithSteps(expr: MathNode | string, variable: string): DomainResult {
	const steps: DomainStep[] = [];

	// Collecter les étapes pendant le calcul
	const domain = computeDomainInternal(expr, variable, steps);

	return { domain, steps };
}

// Exemple de sortie pour ln(sqrt(x))
// steps: [
//   { type: 'constraint', description: 'sqrt(x) nécessite x ≥ 0', subDomain: [0, +∞] },
//   { type: 'constraint', description: 'ln(u) nécessite u > 0, donc sqrt(x) > 0', subDomain: ]0, +∞[ },
//   { type: 'intersection', description: 'Intersection des contraintes', subDomain: ]0, +∞[ },
//   { type: 'result', description: 'Domaine final: ]0, +∞[' }
// ]
```

**Fichiers à modifier**:

- `src/lib/mathAST/domain/compute.ts`
- `src/lib/mathAST/domain/types.ts`

---

## Plan d'implémentation recommandé

### Phase 1: Fondations critiques (Priorité Haute) ✅ TERMINÉE

```
Semaine 1-2:
├── #1 Support tan(ax+b) - débloquer les cas linéaires ✅
├── #14 Solveur quartique - étendre preimage.ts ✅
└── #2 Cache domaines - SUPPRIMÉ (analyse: bénéfice minimal vs complexité)
```

### Phase 2: Domaine de dérivabilité ✅ TERMINÉE

```
Semaine 3-4:
├── #13 Domaine de dérivabilité (core) ✅
├── #17 Valeurs absolues composées (points anguleux) ✅
└── Tests associés ✅
```

### Phase 3: Complétude mathématique

```
Semaine 5-6:
├── #5 Algèbre PeriodicExclusion
├── #15 Discontinuités essentielles
└── #7 Compositions génériques
```

### Phase 4: Validation & UX pédagogique

```
Semaine 7-8:
├── #4 Validation élève continuité
├── #6 Détection erreurs courantes
└── #3 Messages pédagogiques
```

### Phase 5: Consolidation & Qualité

```
Semaine 9-10:
├── #11 Solver unifié
├── #18 Refactoring algebra.ts
├── #12 Tests de performance
└── #16 Intervalle configurable
```

### Phase 6: Features additionnelles (optionnel)

```
Semaine 11+:
├── #19 Hyperboliques inverses
├── #20 Export des étapes
├── #8 Analyse dérivabilité complète
├── #9 Asymptotes obliques
└── #10 Piecewise user-defined
```

---

## Journal des modifications

| Date       | Amélioration | Action                                                               | Commit |
| ---------- | ------------ | -------------------------------------------------------------------- | ------ | -------------------- | --- |
| 2026-01-30 | -            | Document créé                                                        | -      |
| 2026-01-30 | #13-20       | Ajout nouvelles améliorations                                        | -      |
| 2026-01-30 | #8, #13      | Séparation dérivabilité domain vs analyse                            | -      |
| 2026-01-30 | Tous         | Réorganisation des priorités                                         | -      |
| 2026-01-30 | #1           | ✅ Implémenté support tan(ax+b) dans compute.ts                      | -      |
| 2026-01-30 | #14          | ✅ Implémenté solveur quartique (Ferrari) dans preimage.ts           | -      |
| 2026-01-30 | #2           | ❌ Supprimé cache - analyse: bénéfice minimal dans contexte UbuMaths | -      |
| 2026-01-30 | #13          | ✅ Implémenté module differentiability (types, analysis, steps)      | -      |
| 2026-01-30 | #17          | ✅ Implémenté détection points anguleux                              | f(x)   | avec calcul dérivées | -   |
| 2026-01-30 | #13, #17     | ✅ Ajout 68 edge cases aux tests (106 tests total)                   | -      |

---

## Notes techniques

### Dépendances entre améliorations

```
                    [1] Support tan(ax+b) ✅
                           │
                           ▼
                    [5] Algèbre PeriodicExclusion
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
    [7] Compositions   [16] Intervalle  [15] Essential
        génériques     configurable     discontinuities

[14] Solveur quartique ✅     [13] Domaine de dérivabilité ✅
                                        │
                           ┌────────────┼────────────┐
                           ▼            ▼            ▼
                     [17] Abs ✅   [8] Analyse   [20] Export
                     composées      dérivabilité  steps
                                    complète

[4] Validation continuité ◄─── [6] Erreurs courantes
         │
         ▼
    [3] Messages pédagogiques

[11] Solver unifié ◄─── [18] Refactoring algebra.ts
         │
         ▼
    [12] Tests de performance
```

### Fichiers clés

| Fichier                  | Lignes | Rôle                     |
| ------------------------ | ------ | ------------------------ |
| `domain/compute.ts`      | 720    | Moteur principal domaine |
| `domain/preimage.ts`     | 831    | Résolution préimage      |
| `domain/builtins.ts`     | 1302   | Registre fonctions       |
| `domain/range.ts`        | 1303   | Calcul d'image           |
| `domain/algebra.ts`      | 466    | Opérations ensemblistes  |
| `analysis/continuity.ts` | 979    | Analyse continuité       |

### Tests existants

| Fichier                       | Lignes | Couverture                 |
| ----------------------------- | ------ | -------------------------- |
| `domain/compute.test.ts`      | 328    | Bonne                      |
| `domain/range.test.ts`        | 1391   | Excellente                 |
| `domain/algebra.test.ts`      | 587    | Bonne                      |
| `domain/builtins.test.ts`     | 698    | Bonne                      |
| `domain/edge-cases.test.ts`   | 959    | Excellente                 |
| `analysis/continuity.test.ts` | ~500   | Moyenne (manque essential) |

### Risques et mitigations

| Risque                                   | Impact | Mitigation                | Statut   |
| ---------------------------------------- | ------ | ------------------------- | -------- |
| Solveur quartique instable numériquement | Moyen  | Fallback cas dégénérés    | ✅ Géré  |
| Régression performances                  | Moyen  | Benchmarks avant/après    | À suivre |
| Complexité algèbre PeriodicExclusion     | Élevé  | Approximation en fallback | À faire  |
