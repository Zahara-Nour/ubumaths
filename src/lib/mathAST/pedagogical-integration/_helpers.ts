/**
 * Pedagogical Integration — Internal Helpers
 *
 * Pattern detectors and structural utilities used by `pipeline.ts`. Kept in a
 * separate file to keep the dispatcher focused on the order of priority and
 * the result shape, while detectors live close together so the
 * « composite form » heuristics can be audited as a unit.
 *
 * @module mathAST/pedagogical-integration/_helpers
 */

import type { FunctionNode, MathNode } from '../types';
import { differentiate } from '../differentiation';
import { containsVariable } from '../common/contains-variable';
import { isNumber, isVariable, isOne, isZero } from '../guards';
import { hashMathNode } from '../normal/hash';
import { findProportionalityConstant } from '../integration/patterns';
import { getNumericValue } from '../common/numeric';
import type {
	IntegrationGenerationStrategy,
	IntegrationSchoolLevel,
	PedagogicalIntegrationOptions,
	PedagogicalIntegrationRule,
	PedagogicalIntegrationStep
} from './types';
import { STRATEGIES_INTEGRATION } from './types';

// =============================================================================
// Dispatch context
// =============================================================================

/**
 * Mutable bag carried through the recursion.
 *
 * `idGen` is a shared mutable holder so all steps receive monotonically
 * increasing ids regardless of recursion depth. `currentDepth` is incremented
 * by the dispatcher before recursive calls and used as the IPP cyclic guard.
 */
export interface DispatchContext {
	readonly variable: string;
	readonly level: IntegrationSchoolLevel;
	readonly strategy: IntegrationGenerationStrategy;
	readonly maxRecursionDepth: number;
	readonly currentDepth: number;
	readonly signal?: AbortSignal;
	readonly startTime: number;
	readonly timeoutMs?: number;
	readonly idGen: { next: number };
}

export function createContext(
	options: PedagogicalIntegrationOptions,
	resolvedVariable: string
): DispatchContext {
	return {
		variable: resolvedVariable,
		level: options.level,
		strategy: STRATEGIES_INTEGRATION[options.level],
		maxRecursionDepth: options.maxRecursionDepth ?? 5,
		currentDepth: 0,
		signal: options.signal,
		startTime: Date.now(),
		timeoutMs: options.timeoutMs,
		idGen: { next: 1 }
	};
}

export function withDeeperRecursion(ctx: DispatchContext): DispatchContext {
	return {
		...ctx,
		currentDepth: ctx.currentDepth + 1
	};
}

export function checkAbort(ctx: DispatchContext): void {
	if (ctx.signal?.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
	if (ctx.timeoutMs !== undefined && Date.now() - ctx.startTime > ctx.timeoutMs) {
		throw new DOMException('Timeout', 'TimeoutError');
	}
}

export function nextId(ctx: DispatchContext): number {
	return ctx.idGen.next++;
}

// =============================================================================
// Step builder
// =============================================================================

export interface BuildStepInput {
	readonly rule: PedagogicalIntegrationRule;
	readonly before: MathNode;
	readonly after: MathNode;
	readonly variable: string;
	readonly bindings?: Record<string, MathNode>;
	readonly globalBefore?: MathNode;
	readonly globalAfter?: MathNode;
	readonly subSteps?: readonly PedagogicalIntegrationStep[];
	readonly definite?: { readonly lower: MathNode; readonly upper: MathNode };
	readonly description?: string;
	readonly verbosityLevel?: PedagogicalIntegrationStep['verbosityLevel'];
}

export function buildStep(ctx: DispatchContext, input: BuildStepInput): PedagogicalIntegrationStep {
	return {
		id: nextId(ctx),
		rule: input.rule,
		description: input.description ?? defaultDescription(input.rule),
		before: input.before,
		after: input.after,
		variable: input.variable,
		verbosityLevel: input.verbosityLevel ?? 'summarized',
		bindings: input.bindings,
		globalBefore: input.globalBefore,
		globalAfter: input.globalAfter,
		subSteps: input.subSteps && input.subSteps.length > 0 ? input.subSteps : undefined,
		definite: input.definite
	};
}

/**
 * Plain-text fallback descriptions used when the step's `description` field is
 * not supplied. The renderer overrides these for pedagogical output, but the
 * default keeps technical / debug rendering informative.
 */
function defaultDescription(rule: PedagogicalIntegrationRule): string {
	switch (rule) {
		case 'identify-integrand':
			return 'Identification de la primitive à calculer';
		case 'identify-definite-integral':
			return "Identification de l'intégrale définie";
		case 'apply-power-rule':
			return 'Règle de la puissance';
		case 'apply-constant-rule':
			return "Primitive d'une constante";
		case 'apply-known-primitive':
			return 'Primitive usuelle';
		case 'apply-linearity-sum':
			return 'Linéarité (somme)';
		case 'extract-constant':
			return 'Extraction de la constante';
		case 'apply-composite-power':
			return "Forme u'·uⁿ";
		case 'apply-composite-ln':
			return "Forme u'/u";
		case 'apply-composite-exp':
			return "Forme u'·eᵘ";
		case 'apply-composite-sin':
			return "Forme u'·sin(u)";
		case 'apply-composite-cos':
			return "Forme u'·cos(u)";
		case 'apply-fundamental-theorem':
			return 'Théorème fondamental du calcul intégral';
		case 'substitute-bounds':
			return 'Substitution des bornes';
		case 'simplify-bounds-result':
			return 'Calcul de la valeur';
		case 'identify-substitution':
			return 'Identification de la substitution';
		case 'compute-du':
			return 'Calcul de du';
		case 'apply-substitution':
			return 'Substitution';
		case 'substitute-back':
			return 'Retour à la variable initiale';
		case 'identify-parts':
			return 'Identification des parties';
		case 'choose-u-dv':
			return 'Choix de u et dv';
		case 'apply-parts-formula':
			return 'Formule de l’intégration par parties';
		case 'add-constant':
			return "Constante d'intégration";
		case 'simplify-result':
			return 'Simplification';
		default: {
			const _exhaustive: never = rule;
			return `Règle: ${String(_exhaustive)}`;
		}
	}
}

// =============================================================================
// Predicates
// =============================================================================

/**
 * True iff `node` is exactly the integration variable (not a subscripted or
 * wrapped form). Used to detect the cleanest pedagogical special cases:
 * `x^n` with the same x, `1/x`, `e^x`, etc.
 */
export function isExactVariable(node: MathNode, variable: string): boolean {
	return node.type === 'variable' && node.name === variable;
}

/**
 * True iff `node` is `1/x` literally — numerator = 1, denominator = the
 * integration variable.
 */
export function isReciprocalOfVariable(node: MathNode, variable: string): boolean {
	return (
		node.type === 'division' && isOne(node.numerator) && isExactVariable(node.denominator, variable)
	);
}

/**
 * Match `x^n` where `x` is the integration variable and `n` is any expression
 * that does NOT contain `x` (typically a number or numeric expression).
 *
 * Returns `{ base, exp }` on success. Note: `n = 1` (`x^1`) and `n = 0`
 * (`x^0 = 1`) both match — the caller decides whether to dispatch to power
 * rule or to the constant rule.
 */
export function matchPowerOfVariable(
	node: MathNode,
	variable: string
): { base: MathNode; exp: MathNode } | null {
	if (node.type !== 'superscript') return null;
	if (!isExactVariable(node.base, variable)) return null;
	if (containsVariable(node.superscript, variable)) return null;
	return { base: node.base, exp: node.superscript };
}

/**
 * Recognise a known primitive function applied to the integration variable :
 * `e^x`, `sin(x)`, `cos(x)`, `tan(x)`, `ln(x)` (when supported).
 *
 * For exp specifically, the encoding can be either `func('exp', [x])` OR
 * `superscript(eulerConstant, x)`. Both are recognised.
 *
 * Returns the primitive name (`'exp' | 'sin' | 'cos' | 'tan'`) when matched,
 * or `null` otherwise. Note: `ln(x)` is excluded because `∫ln(x) dx` is not a
 * basic primitive — it requires integration by parts.
 */
export function matchKnownPrimitive(
	node: MathNode,
	variable: string
): 'exp' | 'sin' | 'cos' | 'tan' | null {
	// e^x via superscript : base must be Euler's constant `e`, exponent must be x.
	if (node.type === 'superscript') {
		const base = node.base;
		if (
			(base.type === 'constant' && base.constant === 'euler') ||
			(base.type === 'variable' && base.name === 'e')
		) {
			if (isExactVariable(node.superscript, variable)) {
				return 'exp';
			}
		}
	}

	// Function form : exp(x), sin(x), cos(x), tan(x).
	if (node.type === 'function' && node.args.length === 1 && !node.power && !node.isInverse) {
		const arg = node.args[0];
		if (!isExactVariable(arg, variable)) return null;
		switch (node.name) {
			case 'exp':
				return 'exp';
			case 'sin':
				return 'sin';
			case 'cos':
				return 'cos';
			case 'tan':
				return 'tan';
			default:
				return null;
		}
	}

	return null;
}

/**
 * Try to extract a leading constant factor from a multiplication.
 *
 * `c · f(x)` (or `f(x) · c`) → `{ c, f }`. The constant factor is detected by
 * `containsVariable` returning false on one side. Symmetric : the order of the
 * factors does not matter.
 *
 * Also handles `f(x) / c` where `c` is constant — the equivalent of
 * `(1/c) · f(x)`. Returns the inverse `1/c` as the extracted constant.
 *
 * Returns `null` when the expression is not a multiplication / division by a
 * constant, or when both sides involve the variable.
 */
export function tryExtractConstant(
	node: MathNode,
	variable: string
): { c: MathNode; f: MathNode } | null {
	if (node.type === 'multiplication') {
		const leftHasVar = containsVariable(node.left, variable);
		const rightHasVar = containsVariable(node.right, variable);

		if (!leftHasVar && rightHasVar) {
			// Skip degenerate constants 0 (annihilates) and 1 (no-op).
			if (isZero(node.left) || isOne(node.left)) return null;
			return { c: node.left, f: node.right };
		}
		if (!rightHasVar && leftHasVar) {
			if (isZero(node.right) || isOne(node.right)) return null;
			return { c: node.right, f: node.left };
		}
	}

	// `f(x) / c` form.
	if (node.type === 'division') {
		const numHasVar = containsVariable(node.numerator, variable);
		const denomHasVar = containsVariable(node.denominator, variable);
		if (numHasVar && !denomHasVar) {
			if (isZero(node.denominator) || isOne(node.denominator)) return null;
			// Build the symbolic 1/denominator as the extracted "constant".
			const reciprocal: MathNode = {
				type: 'division',
				numerator: { type: 'number', value: '1' },
				denominator: node.denominator,
				displayStyle: 'fraction'
			};
			return { c: reciprocal, f: node.numerator };
		}
	}

	return null;
}

// =============================================================================
// Composite-form detection (u'·f(u) patterns)
// =============================================================================

/**
 * Result of a composite-form detection attempt.
 *
 * - `kind` discriminates which composite was matched.
 * - `u` is the inner expression (the « u » in u'·f(u)).
 * - `n` is set only for `composite-power` (the exponent).
 * - `constantFactor` is non-null when a leading multiplicative constant has to
 *   be threaded through the antiderivative. For `∫sin(2x) dx`, the implicit
 *   factor is `1/2` (because u = 2x, u' = 2, and the integrand lacks a `2` to
 *   match the canonical `u'·sin(u)` form). Renderers display this as a
 *   `1/u'` coefficient on the antiderivative.
 */
export interface CompositeMatch {
	readonly kind:
		| 'composite-exp'
		| 'composite-ln'
		| 'composite-sin'
		| 'composite-cos'
		| 'composite-power';
	readonly u: MathNode;
	readonly n?: MathNode;
	readonly constantFactor?: number;
}

/**
 * Try to detect a composite form `u' · f(u)` (or its rebalanced variant
 * `c · u' · f(u)` where `c` is a numeric constant).
 *
 * Returns `null` when no composite form is detected. The caller can then fall
 * through to linearity, u-substitution, IPP, or `notImplemented`.
 *
 * Detection order:
 *   1. composite-exp  (priority over u-sub generic handling)
 *   2. composite-ln
 *   3. composite-sin
 *   4. composite-cos
 *   5. composite-power
 *
 * Each individual detector below first checks for the « bare » form
 * (integrand IS the function with no leading factor — e.g. `sin(2x)`) and
 * then for the « factored » form (integrand IS `A · function(u)` for some
 * factor A). The « bare » path emits a non-null `constantFactor` derived from
 * the inverse of `u'` (which must be a numeric constant for that path).
 */
export function tryDetectComposite(integrand: MathNode, variable: string): CompositeMatch | null {
	return (
		tryDetectCompositeExp(integrand, variable) ??
		tryDetectCompositeLn(integrand, variable) ??
		tryDetectCompositeSin(integrand, variable) ??
		tryDetectCompositeCos(integrand, variable) ??
		tryDetectCompositePower(integrand, variable)
	);
}

/**
 * Compute `u'(x)` for the inner expression `u`. Returns `null` if
 * differentiation throws (a robust guard — pathological u expressions
 * should not crash the pipeline).
 */
function safeDifferentiate(u: MathNode, variable: string): MathNode | null {
	try {
		return differentiate(u, { variable });
	} catch {
		return null;
	}
}

/**
 * For « bare » composite forms (e.g. `sin(2x)`), check if u' is a non-zero
 * numeric constant. Returns the constant value (1/u') as the rebalancing
 * factor, or `null` if u' depends on the variable or is zero.
 */
function bareCompositeFactor(uPrime: MathNode, variable: string): number | null {
	if (containsVariable(uPrime, variable)) return null;
	const value = getNumericValue(uPrime);
	if (value === null || value === 0) return null;
	return 1 / value;
}

/**
 * Composite-exp : `∫ u'·e^u dx = e^u`.
 *
 * Matches:
 *   - `e^(u(x))` bare (no leading factor) when u' is a non-zero constant
 *   - `A · e^(u(x))` (or symmetric) when A is proportional to u'
 *
 * The exponential is detected via either `func('exp', [u])` or
 * `superscript(e, u)` encoding (matching the algorithmic rules.ts).
 */
export function tryDetectCompositeExp(
	integrand: MathNode,
	variable: string
): CompositeMatch | null {
	// Bare form: integrand IS e^(u) with u containing the variable, u != x.
	const bareU = extractExpInner(integrand, variable);
	if (bareU !== null) {
		const uPrime = safeDifferentiate(bareU, variable);
		if (uPrime === null) return null;
		const factor = bareCompositeFactor(uPrime, variable);
		if (factor === null) return null;
		return { kind: 'composite-exp', u: bareU, constantFactor: factor };
	}

	// Factored form: integrand is a multiplication with one factor an exp.
	if (integrand.type === 'multiplication') {
		const left = integrand.left;
		const right = integrand.right;
		const leftU = extractExpInner(left, variable);
		const rightU = extractExpInner(right, variable);

		if (leftU !== null) {
			const other = right;
			const uPrime = safeDifferentiate(leftU, variable);
			if (uPrime === null) return null;
			const factor = findProportionalityConstant(other, uPrime);
			if (factor !== null) {
				return { kind: 'composite-exp', u: leftU, constantFactor: factor };
			}
		}
		if (rightU !== null) {
			const other = left;
			const uPrime = safeDifferentiate(rightU, variable);
			if (uPrime === null) return null;
			const factor = findProportionalityConstant(other, uPrime);
			if (factor !== null) {
				return { kind: 'composite-exp', u: rightU, constantFactor: factor };
			}
		}
	}

	return null;
}

/**
 * Extract the inner `u` from `e^u` (either `func('exp', [u])` or
 * `superscript(e, u)`). Returns null when the node is not an exponential, or
 * when u is the bare integration variable (in which case the caller should
 * use the basic primitive path, not the composite path).
 */
function extractExpInner(node: MathNode, variable: string): MathNode | null {
	let u: MathNode | null = null;
	if (node.type === 'function' && node.name === 'exp' && node.args.length === 1) {
		u = node.args[0];
	} else if (node.type === 'superscript') {
		const base = node.base;
		if (
			(base.type === 'constant' && base.constant === 'euler') ||
			(base.type === 'variable' && base.name === 'e')
		) {
			u = node.superscript;
		}
	}
	if (u === null) return null;
	if (!containsVariable(u, variable)) return null;
	if (isExactVariable(u, variable)) return null; // bare e^x — basic primitive path
	return u;
}

/**
 * Composite-ln : `∫ u'/u dx = ln|u|`.
 *
 * Matches the division form `A / u(x)` where the numerator A is proportional
 * to u'(x). The bare form `1/u(x)` matches when u' is a non-zero constant.
 */
export function tryDetectCompositeLn(integrand: MathNode, variable: string): CompositeMatch | null {
	if (integrand.type !== 'division') return null;
	const num = integrand.numerator;
	const u = integrand.denominator;
	if (!containsVariable(u, variable)) return null;
	if (isExactVariable(u, variable) && isOne(num)) return null; // 1/x — basic primitive path

	const uPrime = safeDifferentiate(u, variable);
	if (uPrime === null) return null;

	if (isOne(num)) {
		// Bare form 1/u: u' must be a numeric constant.
		const factor = bareCompositeFactor(uPrime, variable);
		if (factor === null) return null;
		return { kind: 'composite-ln', u, constantFactor: factor };
	}

	const factor = findProportionalityConstant(num, uPrime);
	if (factor === null) return null;
	return { kind: 'composite-ln', u, constantFactor: factor };
}

/**
 * Composite-sin : `∫ u'·sin(u) dx = -cos(u)`.
 *
 * Matches:
 *   - `sin(u(x))` bare when u' is a non-zero constant
 *   - `A · sin(u(x))` (or symmetric) when A is proportional to u'
 */
export function tryDetectCompositeSin(
	integrand: MathNode,
	variable: string
): CompositeMatch | null {
	return tryDetectCompositeUnary(integrand, variable, 'sin', 'composite-sin');
}

/**
 * Composite-cos : `∫ u'·cos(u) dx = sin(u)`.
 */
export function tryDetectCompositeCos(
	integrand: MathNode,
	variable: string
): CompositeMatch | null {
	return tryDetectCompositeUnary(integrand, variable, 'cos', 'composite-cos');
}

function tryDetectCompositeUnary(
	integrand: MathNode,
	variable: string,
	fnName: 'sin' | 'cos',
	matchKind: 'composite-sin' | 'composite-cos'
): CompositeMatch | null {
	const bareU = extractFunctionInner(integrand, variable, fnName);
	if (bareU !== null) {
		const uPrime = safeDifferentiate(bareU, variable);
		if (uPrime === null) return null;
		const factor = bareCompositeFactor(uPrime, variable);
		if (factor === null) return null;
		return { kind: matchKind, u: bareU, constantFactor: factor };
	}

	if (integrand.type === 'multiplication') {
		const left = integrand.left;
		const right = integrand.right;
		const leftU = extractFunctionInner(left, variable, fnName);
		const rightU = extractFunctionInner(right, variable, fnName);

		if (leftU !== null) {
			const uPrime = safeDifferentiate(leftU, variable);
			if (uPrime === null) return null;
			const factor = findProportionalityConstant(right, uPrime);
			if (factor !== null) return { kind: matchKind, u: leftU, constantFactor: factor };
		}
		if (rightU !== null) {
			const uPrime = safeDifferentiate(rightU, variable);
			if (uPrime === null) return null;
			const factor = findProportionalityConstant(left, uPrime);
			if (factor !== null) return { kind: matchKind, u: rightU, constantFactor: factor };
		}
	}

	return null;
}

/**
 * Extract the inner `u` from `f(u)` for a given f ∈ {sin, cos}.
 * Returns null when the node is not a call to f, when f has a `power` field
 * (e.g. `sin^2(x)` — pedagogically a power, not a basic call), or when the
 * argument is the bare integration variable (basic primitive path).
 */
function extractFunctionInner(
	node: MathNode,
	variable: string,
	fnName: 'sin' | 'cos'
): MathNode | null {
	if (node.type !== 'function') return null;
	if (node.name !== fnName) return null;
	if (node.args.length !== 1) return null;
	if (node.power !== undefined) return null; // sin^2(x) — out of V1 scope
	if (node.isInverse) return null;
	const u = node.args[0];
	if (!containsVariable(u, variable)) return null;
	if (isExactVariable(u, variable)) return null; // sin(x) — basic primitive
	return u;
}

/**
 * Composite-power : `∫ u'·u^n dx = u^(n+1)/(n+1)` for n ≠ -1.
 *
 * Matches:
 *   - `u(x)^n` bare when u' is a non-zero constant (e.g. `(2x+1)^3`).
 *   - `A · u(x)^n` (or symmetric) when A is proportional to u'.
 *
 * Excludes `n = -1` (which would be composite-ln, handled separately) and
 * `n = 0` (degenerate, falls through to the constant path).
 */
export function tryDetectCompositePower(
	integrand: MathNode,
	variable: string
): CompositeMatch | null {
	const baseAndExp = (node: MathNode): { u: MathNode; n: MathNode } | null => {
		if (node.type !== 'superscript') return null;
		if (!containsVariable(node.base, variable)) return null;
		if (containsVariable(node.superscript, variable)) return null;
		// Reject n = -1 (would be composite-ln) and n = 0 (constant).
		const nValue = getNumericValue(node.superscript);
		if (nValue === -1 || nValue === 0) return null;
		// Reject base = exact variable (would match power-rule basic path).
		if (isExactVariable(node.base, variable)) return null;
		return { u: node.base, n: node.superscript };
	};

	// Bare form: integrand IS u^n.
	const bare = baseAndExp(integrand);
	if (bare !== null) {
		const uPrime = safeDifferentiate(bare.u, variable);
		if (uPrime === null) return null;
		const factor = bareCompositeFactor(uPrime, variable);
		if (factor === null) return null;
		return { kind: 'composite-power', u: bare.u, n: bare.n, constantFactor: factor };
	}

	// Factored form: integrand is a multiplication with one factor a power.
	if (integrand.type === 'multiplication') {
		const leftBase = baseAndExp(integrand.left);
		const rightBase = baseAndExp(integrand.right);

		if (leftBase !== null) {
			const uPrime = safeDifferentiate(leftBase.u, variable);
			if (uPrime === null) return null;
			const factor = findProportionalityConstant(integrand.right, uPrime);
			if (factor !== null) {
				return {
					kind: 'composite-power',
					u: leftBase.u,
					n: leftBase.n,
					constantFactor: factor
				};
			}
		}
		if (rightBase !== null) {
			const uPrime = safeDifferentiate(rightBase.u, variable);
			if (uPrime === null) return null;
			const factor = findProportionalityConstant(integrand.left, uPrime);
			if (factor !== null) {
				return {
					kind: 'composite-power',
					u: rightBase.u,
					n: rightBase.n,
					constantFactor: factor
				};
			}
		}
	}

	return null;
}

// =============================================================================
// Integration by parts (IPP) detection
// =============================================================================

/**
 * Result of IPP detection : the chosen `u` and `dv` factors.
 *
 * The pedagogical IPP V1 covers ONLY the simple « LIATE-like » template:
 *   - polynomial × (e^x | sin(x) | cos(x))   → u = polynomial, dv = transcendental
 *   - polynomial × ln(x)                     → u = ln(x), dv = polynomial
 *   - bare ln(x)                             → u = ln(x), dv = 1·dx
 *
 * Cyclic cases (`e^x·sin(x)`) and tabular cases (`x³·e^x` requiring 3 IPP
 * passes) are out of V1 scope.
 */
export interface PartsMatch {
	readonly u: MathNode;
	readonly dv: MathNode;
}

/**
 * Heuristic detector for the IPP V1 templates.
 *
 * Returns `null` when no template matches — the caller throws
 * `PedagogicalIntegrationNotImplemented`.
 */
export function tryDetectParts(integrand: MathNode, variable: string): PartsMatch | null {
	// Bare ln(x) : ∫ln(x) dx via IPP with u=ln(x), dv=1·dx.
	if (integrand.type === 'function' && integrand.name === 'ln' && integrand.args.length === 1) {
		if (isExactVariable(integrand.args[0], variable)) {
			return { u: integrand, dv: { type: 'number', value: '1' } };
		}
	}

	// Multiplication templates.
	if (integrand.type !== 'multiplication') return null;

	const left = integrand.left;
	const right = integrand.right;

	// Template A : polynomial × ln(x).
	if (isPolynomialOf(left, variable) && isLnOfVariable(right, variable)) {
		return { u: right, dv: left };
	}
	if (isPolynomialOf(right, variable) && isLnOfVariable(left, variable)) {
		return { u: left, dv: right };
	}

	// Template B : polynomial × transcendental(e^x | sin(x) | cos(x)).
	if (isPolynomialOf(left, variable) && isTranscendentalOfVariable(right, variable)) {
		return { u: left, dv: right };
	}
	if (isPolynomialOf(right, variable) && isTranscendentalOfVariable(left, variable)) {
		return { u: right, dv: left };
	}

	return null;
}

/**
 * True iff `node` is a polynomial in `variable` (a sum/difference of terms,
 * each `c·x^n` with `n` a non-negative integer). Used to gate IPP template
 * matching.
 */
function isPolynomialOf(node: MathNode, variable: string): boolean {
	if (!containsVariable(node, variable)) return true; // Constant counts as degree-0 polynomial.
	if (isExactVariable(node, variable)) return true;
	if (node.type === 'superscript') {
		if (!isExactVariable(node.base, variable)) return false;
		const n = getNumericValue(node.superscript);
		return n !== null && Number.isInteger(n) && n >= 0;
	}
	if (node.type === 'multiplication') {
		const leftConst = !containsVariable(node.left, variable);
		const rightConst = !containsVariable(node.right, variable);
		if (leftConst && isPolynomialOf(node.right, variable)) return true;
		if (rightConst && isPolynomialOf(node.left, variable)) return true;
		return isPolynomialOf(node.left, variable) && isPolynomialOf(node.right, variable);
	}
	if (node.type === 'addition' || node.type === 'subtraction') {
		return isPolynomialOf(node.left, variable) && isPolynomialOf(node.right, variable);
	}
	if (node.type === 'opposite' || node.type === 'positive') {
		return isPolynomialOf(node.operand, variable);
	}
	if (node.type === 'delimiter') {
		return isPolynomialOf(node.content, variable);
	}
	return false;
}

function isLnOfVariable(node: MathNode, variable: string): boolean {
	return (
		node.type === 'function' &&
		node.name === 'ln' &&
		node.args.length === 1 &&
		isExactVariable(node.args[0], variable)
	);
}

function isTranscendentalOfVariable(node: MathNode, variable: string): boolean {
	if (node.type === 'function' && node.args.length === 1) {
		if (
			(node.name === 'exp' || node.name === 'sin' || node.name === 'cos') &&
			isExactVariable(node.args[0], variable)
		) {
			return true;
		}
	}
	if (node.type === 'superscript') {
		const base = node.base;
		const isE =
			(base.type === 'constant' && base.constant === 'euler') ||
			(base.type === 'variable' && base.name === 'e');
		if (isE && isExactVariable(node.superscript, variable)) {
			return true;
		}
	}
	return false;
}

// =============================================================================
// Misc utilities
// =============================================================================

/**
 * Stable structural equality between two MathNodes, used by tests and
 * detection code. Built atop `hashMathNode` for a fast canonical comparison.
 */
export function nodesEqual(a: MathNode, b: MathNode): boolean {
	return hashMathNode(a) === hashMathNode(b);
}

/**
 * Recursively flatten an n-ary addition/subtraction into a list of signed
 * terms : `(a + b) - c + (d - e)` → `[+a, +b, -c, +d, -e]`. Used by the
 * linearity dispatcher to handle sums of arbitrary arity in a single step.
 */
export function flattenSum(
	node: MathNode
): readonly { readonly term: MathNode; readonly sign: 1 | -1 }[] {
	const out: { term: MathNode; sign: 1 | -1 }[] = [];
	const walk = (n: MathNode, currentSign: 1 | -1): void => {
		if (n.type === 'addition') {
			walk(n.left, currentSign);
			walk(n.right, currentSign);
		} else if (n.type === 'subtraction') {
			walk(n.left, currentSign);
			walk(n.right, (currentSign * -1) as 1 | -1);
		} else if (n.type === 'positive') {
			walk(n.operand, currentSign);
		} else if (n.type === 'opposite') {
			walk(n.operand, (currentSign * -1) as 1 | -1);
		} else if (n.type === 'delimiter') {
			walk(n.content, currentSign);
		} else {
			out.push({ term: n, sign: currentSign });
		}
	};
	walk(node, 1);
	return out;
}

// Re-export common dependencies that pipeline.ts needs, so it has a single
// import site.
export { containsVariable, getNumericValue, isNumber, isVariable, isOne, isZero };
export type { FunctionNode };
