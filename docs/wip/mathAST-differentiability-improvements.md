# Améliorations Module Differentiability - Tracker

Ce document suit la progression des améliorations planifiées pour le module `differentiability` de mathAST.

**Date de création**: 2026-01-30
**Dernière mise à jour**: 2026-01-30

---

## Vue d'ensemble du module

### Module Differentiability (`src/lib/mathAST/analysis/`)

- **4 fichiers** | ~1,700 lignes de code | ~1,200 lignes de tests
- Analyse complète de la dérivabilité (angular, cusp, vertical tangent, discontinuity, boundary)
- Détection des patterns |f(x)|, x^(p/q), sqrt(x)
- Calcul du domaine de dérivabilité
- Descriptions pédagogiques en français

**Points forts**: Détection fiable des patterns classiques, intégration continuité, 106 tests
**Points faibles**: Faux positifs xⁿ|x|, zéros transcendants non détectés, limites souvent `unsupported`

---

## Améliorations planifiées

### Priorité Haute 🔴

| #   | Amélioration                                                         | Effort | Impact     | Statut     |
| --- | -------------------------------------------------------------------- | ------ | ---------- | ---------- |
| D1  | [Corriger faux positifs xⁿ\|x\|](#d1-corriger-faux-positifs-xⁿx)     | Moyen  | Précision  | ⬜ À faire |
| D2  | [Résolution zéros transcendants](#d2-résolution-zéros-transcendants) | Élevé  | Complétude | ⬜ À faire |
| D3  | [Filtrer \|constante\|](#d3-filtrer-constante)                       | Faible | Précision  | ⬜ À faire |

### Priorité Moyenne 🟡

| #   | Amélioration                                                              | Effort | Impact     | Statut     |
| --- | ------------------------------------------------------------------------- | ------ | ---------- | ---------- |
| D4  | [Améliorer évaluation limites dérivées](#d4-améliorer-évaluation-limites) | Moyen  | Fiabilité  | ⬜ À faire |
| D5  | [Classification fine des bornes](#d5-classification-fine-des-bornes)      | Faible | Pédagogie  | ⬜ À faire |
| D6  | [Cusps de seconde espèce](#d6-cusps-de-seconde-espèce)                    | Faible | Complétude | ⬜ À faire |
| D7  | [Support piecewise](#d7-support-piecewise)                                | Moyen  | Feature    | ⬜ À faire |

### Priorité Basse 🟢

| #   | Amélioration                                                  | Effort | Impact      | Statut     |
| --- | ------------------------------------------------------------- | ------ | ----------- | ---------- |
| D8  | [Optimisation performances](#d8-optimisation-performances)    | Moyen  | Performance | ⬜ À faire |
| D9  | [Export pédagogique enrichi](#d9-export-pédagogique-enrichi)  | Moyen  | UX          | ⬜ À faire |
| D10 | [Intégration grapheur](#d10-intégration-grapheur)             | Moyen  | Feature     | ⬜ À faire |
| D11 | [Validation réponses élèves](#d11-validation-réponses-élèves) | Élevé  | Pédagogie   | ⬜ À faire |

---

## Détails des améliorations

### D1. Corriger faux positifs xⁿ|x|

**Problème actuel**: `x²|x|`, `x³|x|` sont détectés comme non-dérivables en 0 alors qu'ils le sont.

**Analyse mathématique**:

- `x²|x| = x³` pour x ≥ 0, `-x³` pour x < 0
- `f'(x) = 3x²` pour x > 0, `-3x²` pour x < 0
- `f'(0) = lim(h→0) (h²|h|)/h = lim h|h| = 0`
- La fonction EST dérivable en 0

**Solution proposée**:

```typescript
// Dans differentiability.ts, avant de signaler un point anguleux
function isSmoothedByMultiplier(
	expr: MathNode,
	absArg: MathNode,
	zeroPoint: MathNode,
	variable: string
): boolean {
	// Extraire les facteurs de l'expression
	const factors = extractMultiplicativeFactors(expr);

	// Chercher un facteur polynomial qui s'annule au même point
	for (const factor of factors) {
		if (factor === absArg) continue; // Skip the abs itself

		const multiplicity = getZeroMultiplicity(factor, zeroPoint, variable);
		if (multiplicity >= 1) {
			// Le facteur polynomial "lisse" le coin de |x|
			return true;
		}
	}

	return false;
}

// Utilisation dans analyzePointDifferentiability
if (source === 'abs_composed' || source === 'abs') {
	// Vérifier si le produit est lissé
	if (isSmoothedByMultiplier(expr, absArg, point, variable)) {
		return null; // Pas de point anguleux
	}
	// ... reste du code
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/analysis/differentiability.ts`

**Tests à ajouter**:

```typescript
it('x²|x| is differentiable at 0', () => {
	const result = analyzeDiff('x^2 \\cdot |x|');
	expect(result.isDifferentiableOnDomain).toBe(true);
});

it('x|x| is differentiable at 0', () => {
	const result = analyzeDiff('x \\cdot |x|');
	expect(result.isDifferentiableOnDomain).toBe(true);
});

it('x³|x-1| is differentiable at 1', () => {
	const result = analyzeDiff('(x-1)^3 \\cdot |x-1|');
	expect(hasNonDiffPointAt(result, 1)).toBe(false);
});
```

---

### D2. Résolution zéros transcendants

**Problème actuel**: `|exp(x) - 1|` ne détecte pas le zéro en x=0 car `findZeros` ne gère que les polynômes.

**Solution proposée**:

```typescript
// Nouveau fichier: transcendental-zeros.ts
interface TranscendentalPattern {
	pattern: (node: MathNode) => boolean;
	zeros: (node: MathNode, variable: string) => MathNode[];
}

const TRANSCENDENTAL_PATTERNS: TranscendentalPattern[] = [
	{
		// exp(f(x)) - 1 = 0 quand f(x) = 0
		pattern: (node) =>
			node.type === 'subtraction' &&
			isFunction(node.left) &&
			node.left.name === 'exp' &&
			isNumber(node.right) &&
			node.right.value === '1',
		zeros: (node, variable) => {
			const expArg = (node.left as FunctionNode).args[0];
			return findZeros(expArg, variable).map((z) => numNode(formatNumber(z)));
		}
	},
	{
		// ln(f(x)) - c = 0 quand f(x) = e^c
		pattern: (node) =>
			node.type === 'subtraction' &&
			isFunction(node.left) &&
			node.left.name === 'ln' &&
			isNumber(node.right),
		zeros: (node, variable) => {
			const c = parseFloat((node.right as NumberNode).value);
			const target = Math.exp(c);
			// Résoudre f(x) = target
			return findZerosOfDifference(node.left.args[0], target, variable);
		}
	},
	{
		// sin(f(x)) = 0 quand f(x) = kπ
		pattern: (node) => isFunction(node) && node.name === 'sin',
		zeros: (node, variable) => {
			const arg = (node as FunctionNode).args[0];
			// Pour argument linéaire ax + b: x = (kπ - b) / a
			const linear = extractLinearCoefficients(arg, variable);
			if (linear) {
				return enumeratePeriodicZeros(linear, Math.PI);
			}
			return [];
		}
	}
];

function findTranscendentalZeros(expr: MathNode, variable: string): MathNode[] {
	for (const pattern of TRANSCENDENTAL_PATTERNS) {
		if (pattern.pattern(expr)) {
			return pattern.zeros(expr, variable);
		}
	}

	// Fallback: Newton-Raphson numérique
	return findZerosNumerically(expr, variable, { interval: [-10, 10] });
}
```

**Fichiers à créer/modifier**:

- `src/lib/mathAST/analysis/transcendental-zeros.ts` (nouveau)
- `src/lib/mathAST/analysis/differentiability.ts`

**Tests à ajouter**:

```typescript
it('|exp(x) - 1| has angular point at x=0', () => {
	const result = analyzeDiff('|\\exp(x) - 1|');
	expect(hasNonDiffPointAt(result, 0, 'angular')).toBe(true);
});

it('|ln(x) - 1| has angular point at x=e', () => {
	const result = analyzeDiff('|\\ln(x) - 1|');
	expect(hasNonDiffPointAt(result, Math.E, 'angular')).toBe(true);
});
```

---

### D3. Filtrer |constante|

**Problème actuel**: `|0|` produit un faux point anguleux car on résout `0 = 0` qui donne `x = 0`.

**Solution proposée**:

```typescript
// Dans findAbsPatterns
function findAbsPatterns(
	expr: MathNode,
	variable: string,
	opts: Required<DifferentiabilityOptions>
): NonDifferentiabilityCandidate[] {
	const candidates: NonDifferentiabilityCandidate[] = [];
	const absFuncs = findNodes(expr, (node) => isFunction(node) && node.name === 'abs');

	for (const absFunc of absFuncs) {
		const arg = absFunc.args[0];

		// NOUVEAU: Vérifier que l'argument contient la variable
		if (!containsVariable(arg, variable)) {
			continue; // |constante| n'a pas de point anguleux
		}

		// ... reste du code existant
	}

	return candidates;
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/analysis/differentiability.ts`

**Tests à mettre à jour**:

```typescript
it('|0| = 0 is differentiable everywhere', () => {
	const result = analyzeDiff('|0|');
	expect(result.nonDifferentiablePoints).toHaveLength(0);
	expect(result.isDifferentiableOnDomain).toBe(true);
});

it('|5| is differentiable everywhere', () => {
	const result = analyzeDiff('|5|');
	expect(result.nonDifferentiablePoints).toHaveLength(0);
});

it('|π| is differentiable everywhere', () => {
	const result = analyzeDiff('|\\pi|');
	expect(result.nonDifferentiablePoints).toHaveLength(0);
});
```

---

### D4. Améliorer évaluation limites dérivées

**Problème actuel**: Le module `limits` retourne souvent `status: 'unsupported'`, forçant le fallback numérique.

**Solution proposée**:

```typescript
// Évaluation symbolique directe pour les cas connus
function evaluateDerivativeLimitSymbolic(
	expr: MathNode,
	derivative: MathNode,
	variable: string,
	point: MathNode,
	direction: 'left' | 'right'
): DerivativeLimit | null {
	// Cas 1: |f(x)| → dérivée = sign(f(x)) * f'(x)
	if (isAbsComposition(expr)) {
		const innerDerivative = differentiateInner(expr, variable);
		const innerDerivAtPoint = substitute(innerDerivative, { [variable]: point });
		const innerDerivValue = tryEvaluateNumeric(innerDerivAtPoint);

		if (innerDerivValue !== null) {
			// À gauche du zéro: sign négatif, à droite: sign positif
			const sign = direction === 'left' ? -1 : 1;
			return numNode(formatNumber(sign * Math.abs(innerDerivValue)));
		}
	}

	// Cas 2: x^(p/q) avec p/q < 1 → dérivée = (p/q) * x^(p/q - 1)
	if (isFractionalPower(expr)) {
		const { p, q } = extractFraction(expr);
		const exponent = p / q - 1; // Négatif si p/q < 1

		if (exponent < 0) {
			// x^(négatif) → ±∞ quand x → 0
			if (direction === 'right') {
				return 'infinite'; // 0⁺ → +∞
			} else {
				// Pour x < 0, dépend de la parité
				return q % 2 === 1 ? '-infinite' : 'undefined';
			}
		}
	}

	// Cas 3: sqrt(f(x)) à un zéro de f
	if (isSqrtComposition(expr)) {
		// f'(x) / (2*sqrt(f(x))) → ±∞ si f(point) = 0
		return direction === 'right' ? 'infinite' : 'undefined';
	}

	return null; // Fallback au calcul numérique
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/analysis/differentiability.ts`

---

### D5. Classification fine des bornes

**Problème actuel**: Le type `boundary` ne distingue pas le comportement de la dérivée à la borne.

**Solution proposée**:

```typescript
// Dans differentiability-types.ts
type BoundaryDerivativeType =
	| 'finite' // Dérivée finie (ex: x² sur [0, 1])
	| 'infinite' // Tangente verticale (ex: sqrt(x) en 0)
	| 'undefined'; // Non définie

interface BoundaryBehavior {
	point: MathNode;
	side: 'left' | 'right';
	derivativeType: BoundaryDerivativeType; // NOUVEAU
	derivativeLimit: DerivativeLimit;
	description: string;
}

// Dans differentiability-steps.ts
function describeBoundary(boundary: BoundaryBehavior, variable: string): string {
	const pointStr = formatNode(boundary.point);
	const sideStr = boundary.side === 'left' ? 'gauche' : 'droite';

	switch (boundary.derivativeType) {
		case 'finite':
			return `En ${variable} = ${pointStr}, la dérivée à ${sideStr} vaut ${formatDerivativeLimit(boundary.derivativeLimit)}`;
		case 'infinite':
			return `En ${variable} = ${pointStr}, tangente verticale (dérivée à ${sideStr} infinie)`;
		case 'undefined':
			return `En ${variable} = ${pointStr}, la dérivée à ${sideStr} n'existe pas`;
	}
}
```

**Fichiers à modifier**:

- `src/lib/mathAST/analysis/differentiability-types.ts`
- `src/lib/mathAST/analysis/differentiability-steps.ts`
- `src/lib/mathAST/analysis/differentiability.ts`

---

### D6. Cusps de seconde espèce

**Problème actuel**: Seuls les cusps de première espèce (dérivées → +∞ des deux côtés) sont détectés.

**Solution proposée**:

```typescript
// Types étendus
type CuspKind = 'first' | 'second';

interface NonDifferentiablePoint {
	// ... champs existants
	cuspKind?: CuspKind; // Uniquement pour type === 'cusp'
}

// Classification
function classifyCusp(
	leftDerivative: DerivativeLimit,
	rightDerivative: DerivativeLimit
): { type: 'cusp'; kind: CuspKind } | null {
	const leftInf = leftDerivative === 'infinite';
	const leftNegInf = leftDerivative === '-infinite';
	const rightInf = rightDerivative === 'infinite';
	const rightNegInf = rightDerivative === '-infinite';

	// Première espèce: les deux → +∞ (ou les deux → -∞ mais même signe)
	if ((leftInf && rightInf) || (leftNegInf && rightNegInf)) {
		return { type: 'cusp', kind: 'first' };
	}

	// Seconde espèce: signes opposés mais pas tangente verticale standard
	// Ex: -|x|^(2/3) a les deux dérivées → -∞

	return null;
}
```

**Tests**:

```typescript
it('-x^(2/3) has cusp of second kind at x=0', () => {
	const result = analyzeDiff('-x^{2/3}');
	const point = result.nonDifferentiablePoints[0];
	expect(point?.type).toBe('cusp');
	expect(point?.cuspKind).toBe('second');
});
```

---

### D7. Support piecewise

**Problème actuel**: Les fonctions définies par morceaux ne sont pas analysées.

**Solution proposée**:

```typescript
// Analyser les points de jonction d'une fonction par morceaux
function analyzePiecewiseDifferentiability(
	piecewise: PiecewiseNode,
	variable: string
): NonDifferentiablePoint[] {
	const points: NonDifferentiablePoint[] = [];

	// Trouver les points de jonction
	const junctionPoints = extractJunctionPoints(piecewise);

	for (const junction of junctionPoints) {
		const { point, leftExpr, rightExpr } = junction;

		// Calculer les dérivées de chaque côté
		const leftDeriv = evaluateDerivativeAtPoint(leftExpr, variable, point, 'left');
		const rightDeriv = evaluateDerivativeAtPoint(rightExpr, variable, point, 'right');

		// Comparer
		if (!derivativesEqual(leftDeriv, rightDeriv)) {
			points.push({
				point,
				type: classifyJunctionType(leftDeriv, rightDeriv),
				source: 'piecewise'
				// ...
			});
		}
	}

	return points;
}
```

---

### D8. Optimisation performances

**Solution proposée**:

```typescript
// Cache pour les dérivées calculées
const derivativeCache = new WeakMap<MathNode, Map<string, MathNode>>();

function getCachedDerivative(expr: MathNode, variable: string): MathNode {
	let varCache = derivativeCache.get(expr);
	if (!varCache) {
		varCache = new Map();
		derivativeCache.set(expr, varCache);
	}

	let derivative = varCache.get(variable);
	if (!derivative) {
		derivative = differentiate(expr, { variable });
		varCache.set(variable, derivative);
	}

	return derivative;
}

// Early exit pour les expressions évidemment dérivables
function isObviouslyDifferentiable(expr: MathNode): boolean {
	// Polynômes purs
	if (isPolynomial(expr)) return true;

	// Compositions de fonctions C∞
	if (isCompositionOfSmoothFunctions(expr)) return true;

	return false;
}
```

---

### D9. Export pédagogique enrichi

**Solution proposée**:

```typescript
interface PedagogicalExplanation {
	point: MathNode;
	type: NonDifferentiabilityType;

	// Descriptions multi-niveaux
	shortLabel: string; // "Point anguleux"
	description: string; // "La fonction présente un point anguleux en x = 0"
	explanation: string; // "Les dérivées à gauche et à droite existent mais sont différentes"
	formula: string; // "f'_g(0) = -1 ≠ f'_d(0) = +1"

	// Aide visuelle
	graphHint: string; // "La courbe forme un 'coin' ou 'angle' en ce point"

	// Lien avec le cours
	definition: string; // "Une fonction est dérivable en a si..."
	theorem?: string; // "Théorème: Si f est dérivable en a, alors f est continue en a"
}

function generatePedagogicalExplanation(
	point: NonDifferentiablePoint,
	variable: string
): PedagogicalExplanation;
```

---

### D10. Intégration grapheur

**Solution proposée**:

```typescript
interface GraphAnnotation {
	x: number;
	y: number;
	type: NonDifferentiabilityType;
	marker: 'corner' | 'cusp' | 'vertical_tangent' | 'hole';
	tooltip: string;
}

function getDifferentiabilityAnnotations(
	result: DifferentiabilityResult,
	evaluator: (x: number) => number
): GraphAnnotation[] {
	return result.nonDifferentiablePoints.map((ndp) => {
		const x = tryEvaluateNumeric(ndp.point) ?? 0;
		const y = evaluator(x);

		return {
			x,
			y,
			type: ndp.type,
			marker: getMarkerForType(ndp.type),
			tooltip: describeNonDifferentiablePointShort(ndp)
		};
	});
}
```

---

### D11. Validation réponses élèves

**Solution proposée**:

```typescript
interface DifferentiabilityValidationResult {
	isCorrect: boolean;
	score: number; // 0-1

	missingPoints: NonDifferentiablePoint[];
	extraPoints: StudentPoint[];
	typeErrors: TypeMismatch[];

	feedback: string[];
	hints: string[];
}

function validateStudentDifferentiabilityAnswer(
	studentAnswer: string,
	correctResult: DifferentiabilityResult,
	options?: ValidationOptions
): DifferentiabilityValidationResult {
	// Parser la réponse élève
	const parsed = parseDifferentiabilityAnswer(studentAnswer);

	// Comparer avec le résultat correct
	// Générer feedback pédagogique
}

// Exemples de réponses parsables:
// "Dérivable sur ℝ"
// "Non dérivable en x=0 (point anguleux)"
// "Dérivable sur ℝ* (discontinuité en 0)"
// "Dérivable sur ]0, +∞[ avec tangente verticale en 0"
```

---

## Plan d'implémentation recommandé

### Phase 1: Corrections critiques

```
├── D3 Filtrer |constante| (rapide, impact immédiat)
├── D1 Faux positifs xⁿ|x| (améliore la précision)
└── Tests de non-régression
```

### Phase 2: Complétude mathématique

```
├── D2 Zéros transcendants (cas fréquents en Terminale)
├── D4 Limites symboliques (fiabilité)
└── D6 Cusps seconde espèce (complétude)
```

### Phase 3: Enrichissement

```
├── D5 Classification fine des bornes
├── D7 Support piecewise
└── D9 Export pédagogique
```

### Phase 4: Intégration

```
├── D10 Intégration grapheur
├── D11 Validation élèves
└── D8 Optimisation performances
```

---

## Journal des modifications

| Date       | Amélioration | Action        | Commit |
| ---------- | ------------ | ------------- | ------ |
| 2026-01-30 | -            | Document créé | -      |

---

## Dépendances entre améliorations

```
[D3] Filtrer |constante|
      │
      └──► [D1] Faux positifs xⁿ|x|
                  │
                  └──► [D2] Zéros transcendants

[D4] Limites symboliques ◄─── [D5] Classification bornes
      │
      └──► [D6] Cusps seconde espèce

[D7] Piecewise ────► [D11] Validation élèves

[D9] Export pédagogique ────► [D10] Intégration grapheur

[D8] Optimisation (indépendant, peut être fait à tout moment)
```

---

## Tests de référence

### Tests actuels qui échouent (limitations connues)

```typescript
// Ces tests documentent les limitations actuelles
// Ils passeront après implémentation des améliorations correspondantes

// D1: Faux positifs xⁿ|x|
'x²|x| is differentiable at 0'; // Actuellement: faux positif
'x³|x| is differentiable at 0'; // Actuellement: faux positif

// D2: Zéros transcendants
'|exp(x) - 1| has angular point at x=0'; // Actuellement: non détecté

// D3: |constante|
'|0| = 0 is differentiable everywhere'; // Actuellement: faux positif
```

### Métriques de qualité

| Métrique                 | Actuel  | Cible   |
| ------------------------ | ------- | ------- |
| Tests passants           | 106/106 | 106/106 |
| Faux positifs documentés | 3       | 0       |
| Couverture patterns      | ~70%    | ~95%    |
| Temps moyen analyse      | <50ms   | <30ms   |
