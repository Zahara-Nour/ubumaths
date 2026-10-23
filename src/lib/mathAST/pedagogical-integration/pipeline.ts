/**
 * Pedagogical Integration — Pipeline Orchestrator
 *
 * `generatePedagogicalIntegrationSteps(integrand, options)` is the high-level
 * entry point. It dispatches on the structure of the integrand in priority
 * order, announcing each pedagogical rule (as a top-level step) BEFORE
 * recursing into operands (sub-steps) — distinct from the algorithmic
 * `integrate.ts` whose step trace is implementation-driven.
 *
 * Strategy :
 *
 * 1. The PUBLIC entry point resolves the integration variable (auto-detected
 *    via `detectVariable()` if not given), builds a `DispatchContext`, and
 *    dispatches between the indefinite path (recursive `integrateNode`) and
 *    the definite path (which wraps the indefinite result with the
 *    fundamental-theorem step trio: `apply-fundamental-theorem`,
 *    `substitute-bounds`, `simplify-bounds-result`).
 *
 * 2. The indefinite path tries dispatchers in priority order :
 *    constant → power-rule → reciprocal (1/x) → known primitive →
 *    composite forms (u'·e^u, u'/u, u'·sin/cos(u), u'·u^n) →
 *    linearity (sums) → constant extraction → u-substitution (sup) →
 *    integration by parts (lycée Tle spé + sup) → throw NotImplemented.
 *
 *    The composite forms are detected BEFORE generic u-substitution because
 *    the lycée-style « reconnaissance de dérivée composée » is the standard
 *    pedagogical move in Tle spé maths. The « bare » variants (e.g.
 *    `sin(2x)` without the leading `2·`) are handled by the same composite
 *    detectors via an implicit `1/u'` rebalancing factor.
 *
 * 3. Underlying calculations (`powerRule`, `sinRule`, `lnAbsRule`, …) are
 *    delegated to `integration/rules.ts` — we don't reimplement primitive
 *    formulas, only their orchestration. Sauf l'exponentielle : `expRule`
 *    écrit `\exp(u)` et divise par a ; ici e^{u} est construit directement
 *    (`superscript(euler(), u)`), le facteur 1/u′ venant de la forme composée.
 *
 * 4. La primitive brute (la méthode) est suivie d'une étape « On simplifie »
 *    (`tidyTerms`) sauf quand il n'y a rien à simplifier. Quand tous les termes
 *    portent la même exponentielle e^{u}, cette étape développe puis met e^{u}
 *    en facteur, par les stratégies de `factoriser` (lot 4 de l'ADR 0024).
 *
 * @module mathAST/pedagogical-integration/pipeline
 */

import type { MathNode } from '../types';
import {
	add,
	cos,
	divide,
	euler,
	fraction,
	multiply,
	number,
	opposite,
	parentheses,
	sin,
	subtract,
	superscript,
	variable as variableNode
} from '../factory';
import { detectVariable } from '../integration/classify';
import { cosRule, lnAbsRule, powerRule, sinRule, tanRule } from '../integration/rules';
import { differentiate } from '../differentiation';
import { evaluate } from '../eval/evaluate';
import { isEvalValue } from '../eval/types';
import { denormalize, normalize } from '../normal';
import {
	simplifiedAdd,
	simplifiedDivide,
	simplifiedMultiply,
	simplifiedPower
} from '../common/simplify';
import { extractExactRational, numericNode, rationalToNode } from '../common/numeric';
import {
	absBigInt,
	absRational,
	divRational,
	isNegative as isNegativeRational,
	isOne as isOneRational,
	isZero as isZeroRational,
	mulRational,
	negRational,
	ONE,
	rational
} from '../normal/rational';
import type { Rational } from '../normal/types';
import { toLatex } from '../latex-generator';
import { factorPolynomial, factorizationToNode, integerLinearFactorNode } from '../factor';
import { tidyTerms } from '../tidy/terms';
import { flattenProductShallow } from '../flatten';
import { isEulerConstant } from '../guards';
import { nodesEqual } from '../normal/hash';
import { areEquivalent } from '../equivalence';
import { generatePedagogicalSimplifySteps } from '../pedagogical-simplify/pipeline';
import { PedagogicalSimplifyNotImplemented } from '../pedagogical-simplify/types';
import { mapNode } from '../transforms';
import {
	buildStep,
	checkAbort,
	containsVariable,
	createContext,
	flattenSum,
	isCyclicIppPattern,
	isExactVariable,
	isReciprocalOfVariable,
	matchArcsinForm,
	matchArctanForm,
	matchKnownPrimitive,
	matchPowerOfVariable,
	pickExpFactor,
	pickTrigFactor,
	tryDetectComposite,
	tryDetectPartialFractions,
	tryDetectParts,
	tryExtractConstant,
	unwrapSign,
	primitiveInsideParts,
	withDeeperRecursion
} from './_helpers';
import type {
	CompositeMatch,
	DispatchContext,
	PartialFractionsMatch,
	PartsMatch
} from './_helpers';
import { abs, ln } from '../factory';
import { findProportionalityConstant, findProportionalityRatio } from '../integration/patterns';
import { forbiddenValueOnInterval, numericValue } from '../integration/forbidden-value';
import { isCertainlyPositive } from './positivity';
import { isMinusOneCoefficient, onlyConstantOut } from './descriptions-fr';
import { arcsinRule, arctanRule } from '../integration/rules';
import { PedagogicalIntegrationNotImplemented } from './types';
import type {
	IntegrationBindings,
	PedagogicalDefiniteIntegrationResult,
	PedagogicalIntegrationOptions,
	PedagogicalIntegrationResult,
	PedagogicalIntegrationStep
} from './types';

// =============================================================================
// Public entry point
// =============================================================================

/**
 * Generate pedagogical steps for integrating `integrand` with respect to
 * `options.variable` (or auto-detected if omitted).
 *
 * Indefinite by default ; pass `options.definite = { lower, upper }` to
 * compute the definite integral with the fundamental-theorem step trio.
 *
 * @example
 * ```typescript
 * // ∫(3x² + 2x + 1) dx
 * const integrand = parseLatex('3x^2 + 2x + 1');
 * const result = generatePedagogicalIntegrationSteps(integrand, {
 *   level: 'lycee'
 * });
 * console.log(result.antiderivative); // x^3 + x^2 + x
 * console.log(result.steps);          // [linearity, power-rule x3, +C]
 *
 * // ∫_0^1 e^x dx
 * const exp = parseLatex('e^x');
 * const definite = generatePedagogicalIntegrationSteps(exp, {
 *   level: 'lycee',
 *   definite: { lower: number('0'), upper: number('1') }
 * });
 * console.log(definite.value); // e - 1
 * ```
 */
export function generatePedagogicalIntegrationSteps(
	integrand: MathNode,
	options: PedagogicalIntegrationOptions & { readonly definite?: undefined }
): PedagogicalIntegrationResult;
export function generatePedagogicalIntegrationSteps(
	integrand: MathNode,
	options: PedagogicalIntegrationOptions
): PedagogicalDefiniteIntegrationResult;
export function generatePedagogicalIntegrationSteps(
	integrand: MathNode,
	options: PedagogicalIntegrationOptions
): PedagogicalDefiniteIntegrationResult {
	const resolvedVariable = options.variable ?? resolveIntegrationVariable(integrand);
	const ctx = createContext(options, resolvedVariable);

	if (options.definite) {
		return generateDefiniteSteps(integrand, ctx, options.definite);
	}
	return generateIndefiniteSteps(integrand, ctx);
}

/**
 * Resolve the integration variable from the integrand. Wraps the algorithmic
 * `detectVariable` ; when it throws, a single letter in the integrand is still
 * taken as the variable (`e` is never one : both parsers read it as Euler).
 */
function resolveIntegrationVariable(integrand: MathNode): string {
	try {
		return detectVariable(integrand) ?? 'x';
	} catch {
		const names = collectVariableNames(integrand);
		if (names.length === 1) return names[0];
		if (names.length === 0) return 'x';
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			`Multiple integration variables (${names.join(', ')}) — please specify via options.variable`
		);
	}
}

function collectVariableNames(node: MathNode): readonly string[] {
	const out = new Set<string>();
	const walk = (n: MathNode): void => {
		switch (n.type) {
			case 'variable':
				out.add(n.name);
				return;
			case 'addition':
			case 'subtraction':
			case 'multiplication':
				walk(n.left);
				walk(n.right);
				return;
			case 'division':
				walk(n.numerator);
				walk(n.denominator);
				return;
			case 'opposite':
			case 'positive':
				walk(n.operand);
				return;
			case 'delimiter':
				walk(n.content);
				return;
			case 'superscript':
				walk(n.base);
				walk(n.superscript);
				return;
			case 'subscript':
				walk(n.base);
				walk(n.subscript);
				return;
			case 'function':
				n.args.forEach(walk);
				return;
			default:
				return;
		}
	};
	walk(node);
	return Array.from(out);
}

// =============================================================================
// Indefinite & definite top-level
// =============================================================================

function generateIndefiniteSteps(
	integrand: MathNode,
	ctx: DispatchContext
): PedagogicalIntegrationResult {
	const steps: PedagogicalIntegrationStep[] = [];

	if (ctx.strategy.includeIdentify) {
		steps.push(
			buildStep(ctx, {
				rule: 'identify-integrand',
				before: integrand,
				after: integrand,
				variable: ctx.variable
			})
		);
	}

	const { antiderivative: raw, steps: coreSteps } = integrateNode(integrand, ctx);
	steps.push(...coreSteps);
	const antiderivative = pushSimplifyStep(steps, raw, ctx);

	if (ctx.strategy.includeAddConstant) {
		steps.push(
			buildStep(ctx, {
				rule: 'add-constant',
				before: antiderivative,
				after: antiderivative,
				variable: ctx.variable
			})
		);
	}

	return { antiderivative, steps };
}

function generateDefiniteSteps(
	integrand: MathNode,
	ctx: DispatchContext,
	definite: { readonly lower: MathNode; readonly upper: MathNode }
): PedagogicalDefiniteIntegrationResult {
	const steps: PedagogicalIntegrationStep[] = [];

	if (ctx.strategy.includeIdentify) {
		steps.push(
			buildStep(ctx, {
				rule: 'identify-definite-integral',
				before: integrand,
				after: integrand,
				variable: ctx.variable,
				definite
			})
		);
	}

	// Valeur interdite de f dans [a ; b] (bornes comprises) : l'intégrale n'est
	// pas définie, aucune valeur (V28 : ∫₁² 5/(4x² − 9) rendait un nombre à
	// travers le pôle 3/2). Contrôle AVANT la primitive : le refus s'affiche
	// même quand le pipeline ne sait pas l'écrire (∫₀¹ 4/(3x − 2)²).
	const check = forbiddenValueOnInterval(integrand, ctx.variable, definite.lower, definite.upper);
	if (check.kind === 'forbidden') {
		steps.push(
			buildStep(ctx, {
				rule: 'integrand-undefined-on-interval',
				before: integrand,
				after: integrand,
				variable: ctx.variable,
				definite,
				bindings: { point: check.value }
			})
		);
		return { undefinedAt: check.value, steps };
	}
	// Domaine non résolu (eˣ − 2 ≠ 0) et bornes numériques : aucun nombre
	// publié sans savoir si f est définie sur [a ; b] — repli sur le mode A
	if (check.kind === 'unchecked' && check.reason === 'unresolved-domain') {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'Intégrale définie : domaine de la fonction non résolu, valeur non garantie'
		);
	}

	// f définie sur tout [a ; b], bornes numériques : l'intervalle sert à écrire
	// ln u sans valeur absolue quand u > 0 y est certain
	const numericBounds =
		Number.isFinite(numericValue(definite.lower)) && Number.isFinite(numericValue(definite.upper));
	const boundedCtx: DispatchContext = { ...ctx, definite };
	const innerCtx: DispatchContext =
		check.kind === 'defined' && numericBounds ? { ...boundedCtx, interval: definite } : boundedCtx;

	// Compute the antiderivative pedagogically — without `add-constant`
	// (the constant cancels in F(b) - F(a)).
	const { antiderivative: raw, steps: coreSteps } = integrateNode(integrand, innerCtx);
	steps.push(...coreSteps);
	const antiderivative = pushSimplifyStep(steps, raw, ctx);

	// Fundamental theorem : ∫_a^b f(x) dx = [F(x)]_a^b.
	steps.push(
		buildStep(ctx, {
			rule: 'apply-fundamental-theorem',
			before: integrand,
			after: antiderivative,
			variable: ctx.variable,
			definite,
			bindings: { primitive: antiderivative }
		})
	);

	// Substitute bounds : [F(x)]_a^b = F(b) - F(a).
	const fAtUpper = substituteVariable(antiderivative, ctx.variable, definite.upper);
	const fAtLower = substituteVariable(antiderivative, ctx.variable, definite.lower);
	const symbolicDifference = subtract(fAtUpper, fAtLower);
	if (ctx.strategy.formatBoundsExplicit) {
		steps.push(
			buildStep(ctx, {
				rule: 'substitute-bounds',
				before: antiderivative,
				after: symbolicDifference,
				variable: ctx.variable,
				definite,
				bindings: { primitive: antiderivative, lower: definite.lower, upper: definite.upper }
			})
		);
	}

	// Simplify F(b) - F(a) into a numeric / closed-form value.
	const value = tryEvaluateExact(symbolicDifference) ?? symbolicDifference;
	steps.push(
		buildStep(ctx, {
			rule: 'simplify-bounds-result',
			before: symbolicDifference,
			after: value,
			variable: ctx.variable,
			definite
		})
	);

	return { antiderivative, value, steps };
}

/**
 * L'étape « On simplifie » (décision de David du 2026-10-11, comme
 * `withTidyStep` des dérivées) : les règles laissent la primitive brute
 * (`3\dfrac{x^3}{3}`, `\ln(x)\,x`) — c'est la méthode, qu'on garde visible ;
 * la ligne suivante l'écrit simplement avec `tidyTerms`. Aucune étape quand il
 * n'y a rien à simplifier (`singleCoefficientTerm`) ni quand la mise au
 * propre ne change pas l'écriture. Rend la primitive à retenir.
 */
function pushSimplifyStep(
	steps: PedagogicalIntegrationStep[],
	raw: MathNode,
	ctx: DispatchContext
): MathNode {
	const single = singleCoefficientTerm(raw);
	if (single?.canonical) return raw;
	const developed = single ? null : developAndFactor(raw, ctx);
	// Somme de ln regroupée puis rangée : chaque ln garde son coefficient devant
	const rewriting = developed && {
		...developed,
		result: lnCoefficientForm(developed.result) ?? developed.result
	};
	if (rewriting) {
		if (toLatex(rewriting.result) === toLatex(raw)) return raw;
		steps.push(
			buildStep(ctx, {
				rule: 'simplify-result',
				before: raw,
				after: rewriting.result,
				variable: ctx.variable,
				// `developed` : ligne montrée par le rendu ; `exponential` : nommée par l'explication
				bindings: rewriting.bindings
			})
		);
		return rewriting.result;
	}
	// Coefficient à réduire (`\dfrac{2}{4}e^x` → `\dfrac{1}{2}e^x`) : on le réduit
	// en gardant la forme « k · fonction » ; sinon, `tidy`
	const tidy = (node: MathNode): MathNode => {
		const tidiedSum = tidyTerms(node);
		return lnCoefficientForm(tidiedSum) ?? tidiedSum;
	};
	const tidied = single ? withRationalCoefficient(single.k, single.fn) : tidy(raw);
	if (toLatex(tidied) === toLatex(raw)) return raw;
	steps.push(
		buildStep(ctx, {
			rule: 'simplify-result',
			before: raw,
			after: tidied,
			variable: ctx.variable
		})
	);
	return tidied;
}

interface SimplifyRewriting {
	readonly result: MathNode;
	readonly bindings: IntegrationBindings;
}

/**
 * Lot 4 de l'ADR 0024 (décision de David du 2026-10-11, V17-V18) : la primitive
 * est développée (`developper` de pedagogical-simplify), puis l'exponentielle
 * e^{u} que portent au moins deux termes est mise en facteur sur ces termes
 * (`factoriser`) : `x^2e^x-2(xe^x-e^x)` → `(x^2-2x+2)e^x`, et
 * `\dfrac{1}{2}x^2e^{2x}-(…)+\dfrac{x^2}{2}` → `(…)e^{2x}+\dfrac{x^2}{2}`. Sans
 * exponentielle partagée, la forme développée et rangée (`tidy`) quand la
 * primitive brute garde une parenthèse d'IPP (`-x^2\cos x+2(x\sin x+\cos x)`) ;
 * sinon `null`, et la primitive passe par `tidy` seul. Pas de moteur propre.
 */
function developAndFactor(raw: MathNode, ctx: DispatchContext): SimplifyRewriting | null {
	const developed = runSimplifyIntent(raw, 'developper', ctx);
	if (!developed) return null;
	const terms = flattenSum(developed);
	const exponential = sharedExponential(terms.map(({ term }) => term));
	if (exponential) {
		const carries = (term: MathNode) =>
			exponentialFactors(term).some((f) => sameExponential(f, exponential));
		const carrying = terms.filter(({ term }) => carries(term));
		const others = terms.filter(({ term }) => !carries(term));
		const group = runSimplifyIntent(
			others.length === 0 ? developed : signedSum(carrying),
			'factoriser',
			ctx
		);
		if (group && hasFactor(group, exponential)) {
			const rest = others.map(({ term, sign }) => ({ term: tidyTerms(term), sign }));
			// Une seule écriture de l'exposant dans l'étape : celle de la primitive brute
			const result = withExponential(appendTerms(group, rest), exponential);
			const shown = toLatex(developed) !== toLatex(raw);
			return {
				result,
				bindings: shown
					? { developed: withExponential(developed, exponential), exponential }
					: { exponential }
			};
		}
	}
	if (!hasGroupedSum(raw)) return null;
	return { result: tidyTerms(developed), bindings: {} };
}

/**
 * Une intention de pedagogical-simplify ; `null` sur un refus attendu
 * (`PedagogicalSimplifyNotImplemented`). Toute autre erreur remonte.
 */
function runSimplifyIntent(
	node: MathNode,
	intent: 'developper' | 'factoriser',
	ctx: DispatchContext
): MathNode | null {
	try {
		return generatePedagogicalSimplifySteps(node, { intent, schoolLevel: ctx.level }).result;
	} catch (error) {
		if (error instanceof PedagogicalSimplifyNotImplemented) return null;
		throw error;
	}
}

type SignedTerm = { readonly term: MathNode; readonly sign: 1 | -1 };

/** La somme des termes signés, dans l'ordre. */
function signedSum(terms: readonly SignedTerm[]): MathNode {
	const [first, ...others] = terms;
	return appendTerms(first.sign === 1 ? first.term : opposite(first.term), others);
}

function appendTerms(start: MathNode, terms: readonly SignedTerm[]): MathNode {
	return terms.reduce<MathNode>(
		(acc, { term, sign }) => (sign === 1 ? add(acc, term) : subtract(acc, term)),
		start
	);
}

/**
 * Une somme entre parenthèses multipliée au plus par un nombre, termes et
 * signes traversés : la parenthèse de `- ∫ v du` (`-2(x\sin x+\cos x)`). Pas
 * celle d'un facteur littéral (`(2x+1)\cos x`), ni sous une puissance.
 */
function hasGroupedSum(node: MathNode): boolean {
	switch (node.type) {
		case 'addition':
		case 'subtraction':
			// `a - (b - c)` : la somme de droite est entre parenthèses, nœud ou pas
			return isSum(node.right) || hasGroupedSum(node.left) || hasGroupedSum(node.right);
		case 'opposite':
		case 'positive':
		case 'delimiter': {
			const inner = node.type === 'delimiter' ? node.content : node.operand;
			return isSum(inner) || hasGroupedSum(inner);
		}
		case 'multiplication': {
			const literal = flattenProductShallow(node)
				.map(({ factor }) => factor)
				.filter((factor) => extractExactRational(factor) === null);
			return literal.length === 1 && (isSum(literal[0]) || hasGroupedSum(literal[0]));
		}
		default:
			return false;
	}
}

function isSum(node: MathNode): boolean {
	return node.type === 'addition' || node.type === 'subtraction';
}

/** Remplace chaque e^{u} équivalente à `exponential` par elle (même exposant écrit). */
function withExponential(node: MathNode, exponential: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'superscript' && isEulerConstant(n.base) && sameExponential(n, exponential)
			? exponential
			: n
	);
}

/** Les facteurs e^{u} d'un terme (`\dfrac{1}{2} x e^{2x}`, `\dfrac{x e^x}{2}`). */
function exponentialFactors(term: MathNode): MathNode[] {
	const product = term.type === 'division' ? term.numerator : term;
	return flattenProductShallow(product)
		.map(({ factor }) => factor)
		.filter((factor) => factor.type === 'superscript' && isEulerConstant(factor.base));
}

/** La première exponentielle que portent au moins deux termes. */
function sharedExponential(terms: readonly MathNode[]): MathNode | null {
	if (terms.length < 2) return null;
	for (const candidate of terms.flatMap(exponentialFactors)) {
		const count = terms.filter((term) =>
			exponentialFactors(term).some((f) => sameExponential(f, candidate))
		).length;
		if (count >= 2) return candidate;
	}
	return null;
}

/** `factor` est un facteur du produit `node` (signe en tête compris). */
function hasFactor(node: MathNode, factor: MathNode): boolean {
	const { inner } = unwrapSign(node);
	return flattenProductShallow(inner).some((f) => sameExponential(f.factor, factor));
}

/**
 * Même exponentielle, quelle que soit l'écriture de l'exposant : `-2x` est
 * `opposite(2)·x` ou `opposite(2·x)` selon qui l'a construit (README § Invariants, 4).
 */
function sameExponential(a: MathNode, b: MathNode): boolean {
	if (nodesEqual(a, b)) return true;
	return (
		a.type === 'superscript' &&
		b.type === 'superscript' &&
		isEulerConstant(a.base) &&
		isEulerConstant(b.base) &&
		areEquivalent(a.superscript, b.superscript)
	);
}

/**
 * Substitute every occurrence of `variable` in `expr` with `replacement`.
 * Pure structural substitution — no simplification, no evaluation.
 */
function substituteVariable(expr: MathNode, variable: string, replacement: MathNode): MathNode {
	switch (expr.type) {
		case 'variable':
			return expr.name === variable ? replacement : expr;
		case 'number':
		case 'greek':
		case 'symbol':
		case 'hole':
		case 'constant':
		case 'infinity':
			return expr;
		case 'addition':
			return {
				...expr,
				left: substituteVariable(expr.left, variable, replacement),
				right: substituteVariable(expr.right, variable, replacement)
			};
		case 'subtraction':
			return {
				...expr,
				left: substituteVariable(expr.left, variable, replacement),
				right: substituteVariable(expr.right, variable, replacement)
			};
		case 'multiplication':
			return {
				...expr,
				left: substituteVariable(expr.left, variable, replacement),
				right: substituteVariable(expr.right, variable, replacement)
			};
		case 'division':
			return {
				...expr,
				numerator: substituteVariable(expr.numerator, variable, replacement),
				denominator: substituteVariable(expr.denominator, variable, replacement)
			};
		case 'opposite':
			return { ...expr, operand: substituteVariable(expr.operand, variable, replacement) };
		case 'positive':
			return { ...expr, operand: substituteVariable(expr.operand, variable, replacement) };
		case 'delimiter':
			return { ...expr, content: substituteVariable(expr.content, variable, replacement) };
		case 'superscript':
			return {
				...expr,
				base: substituteVariable(expr.base, variable, replacement),
				superscript: substituteVariable(expr.superscript, variable, replacement)
			};
		case 'subscript':
			return {
				...expr,
				base: substituteVariable(expr.base, variable, replacement),
				subscript: substituteVariable(expr.subscript, variable, replacement)
			};
		case 'function':
			return {
				...expr,
				args: expr.args.map((a) => substituteVariable(a, variable, replacement)),
				power: expr.power ? substituteVariable(expr.power, variable, replacement) : undefined,
				base: expr.base ? substituteVariable(expr.base, variable, replacement) : undefined
			};
		default:
			return expr;
	}
}

/**
 * Best-effort exact evaluation. Returns null if the evaluation fails or the
 * result is not a closed-form value we can simplify.
 */
function tryEvaluateExact(expr: MathNode): MathNode | null {
	try {
		const result = evaluate(expr, { mode: 'exact' });
		if (isEvalValue(result)) return result.node;
	} catch {
		/* fall through */
	}
	return null;
}

// =============================================================================
// Recursive dispatcher
// =============================================================================

interface DispatchResult {
	readonly antiderivative: MathNode;
	readonly steps: readonly PedagogicalIntegrationStep[];
}

/**
 * Internal recursive dispatcher.
 *
 * Tries patterns in priority order. The first matching pattern wins. If none
 * match, throws `PedagogicalIntegrationNotImplemented`.
 */
function integrateNode(integrand: MathNode, ctx: DispatchContext): DispatchResult {
	checkAbort(ctx);

	if (ctx.currentDepth >= ctx.maxRecursionDepth) {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			`Maximum recursion depth reached (${ctx.maxRecursionDepth}) — likely a cyclic IPP or pathological input.`
		);
	}

	// Strip transparent wrappers (`+x`, `(x)`, `((+x))`).
	const stripped = stripTransparent(integrand);
	if (stripped !== integrand) {
		return integrateNode(stripped, ctx);
	}

	// 1. Constant (no variable).
	if (!containsVariable(integrand, ctx.variable)) {
		return integrateConstant(integrand, ctx);
	}

	// 2. Power of variable: x, x^n.
	const powMatch = matchPowerOfVariable(integrand, ctx.variable);
	if (powMatch) {
		return integratePower(integrand, powMatch.base, powMatch.exp, ctx);
	}
	if (isExactVariable(integrand, ctx.variable)) {
		// `x` alone — apply power rule with n = 1.
		return integratePower(integrand, integrand, number('1'), ctx);
	}

	// 3. Reciprocal of variable: 1/x.
	if (isReciprocalOfVariable(integrand, ctx.variable)) {
		return integrateReciprocalVariable(integrand, ctx);
	}

	// 4. Known primitive applied to bare variable: e^x, sin(x), cos(x), tan(x).
	const knownFn = matchKnownPrimitive(integrand, ctx.variable);
	if (knownFn !== null) {
		return integrateKnownPrimitive(integrand, knownFn, ctx);
	}

	// 4b. Inverse-trig primitives (V1.1+V2, supérieur uniquement) :
	//     `1/(c+x²) → (1/a)·arctan(x/a)` and `1/√(c-x²) → arcsin(x/a)`,
	//     where `a = √c` (a=1 in V1.1 unit case, V2 generalises to any a > 0).
	if (ctx.strategy.enableInverseTrig) {
		const arctanForm = matchArctanForm(integrand, ctx.variable);
		if (arctanForm) {
			return integrateInverseTrig(integrand, 'arctan', arctanForm.a, ctx);
		}
		const arcsinForm = matchArcsinForm(integrand, ctx.variable);
		if (arcsinForm) {
			return integrateInverseTrig(integrand, 'arcsin', arcsinForm.a, ctx);
		}
	}

	// 5. Composite forms (u'·f(u)).
	if (ctx.strategy.enableComposite) {
		const composite = tryDetectComposite(integrand, ctx.variable);
		if (composite) {
			return integrateComposite(integrand, composite, ctx);
		}
	}

	// 6. Sum (linearity).
	if (integrand.type === 'addition' || integrand.type === 'subtraction') {
		return integrateLinearity(integrand, ctx);
	}

	// 6b. Opposite (-f(x)) — pedagogically equivalent to extract-constant with c=-1.
	if (integrand.type === 'opposite') {
		return integrateOpposite(integrand, ctx);
	}

	// 7. Constant × f(x) (extract-constant).
	const constantExtraction = tryExtractConstant(integrand, ctx.variable);
	if (constantExtraction) {
		return integrateExtractConstant(integrand, constantExtraction, ctx);
	}

	// 8. u-substitution explicit (sup).
	//
	// V1 limitation : the dispatcher reaches this branch only when the
	// composite-form detectors above all returned null. In that case the
	// integrand's antiderivative cannot be derived by the four narrative
	// u-sub steps without re-running the algorithmic integrator (out of
	// scope for V1). We therefore short-circuit straight to IPP / throw.
	// The four `identify-substitution` / `compute-du` / `apply-substitution` /
	// `substitute-back` rules remain in the type union for V2 reach.

	// 8b. Partial fractions (V2) — `∫P(x)/Q(x) dx` with Q quadratic, Δ > 0,
	//     deg(P) < 2. Tried after composite-ln (which catches the proportional
	//     case `u'/u`) so the rule firing order remains pedagogically clean :
	//     composite-ln for « u'/u » integrals, partial-fractions only for the
	//     genuinely 2-roots case `1/((x-a)(x-b))`.
	if (ctx.strategy.enablePartialFractions) {
		const partialFracs = tryDetectPartialFractions(integrand, ctx.variable);
		if (partialFracs) {
			return integratePartialFractions(integrand, partialFracs, ctx);
		}
	}

	// 9a. Cyclic IPP (V1.1) — `∫e^(αx)·sin(βx) dx`, `∫e^(αx)·cos(βx) dx`.
	//     MUST be tried BEFORE regular IPP : the LIATE template (Template B
	//     polynomial × transcendental) doesn't match exp×sin (neither factor
	//     is polynomial), so regular IPP would never fire ; but the cyclic
	//     pattern detector handles the case via algebraic resolution.
	if (ctx.strategy.enableCyclicParts && isCyclicIppPattern(integrand, ctx.variable)) {
		return integrateCyclicIPP(integrand, ctx);
	}

	// 9b. Integration by parts (lycée Tle spé + sup).
	if (ctx.strategy.enablePartsSimple) {
		const parts = tryDetectParts(integrand, ctx.variable);
		if (parts) {
			return integrateByParts(integrand, parts, ctx);
		}
	}

	// 10. No match → not implemented.
	throw new PedagogicalIntegrationNotImplemented(integrand);
}

function stripTransparent(node: MathNode): MathNode {
	let n = node;
	while (n.type === 'positive' || n.type === 'delimiter') {
		n = n.type === 'positive' ? n.operand : n.content;
	}
	return n;
}

// =============================================================================
// Branch dispatchers
// =============================================================================

function integrateConstant(integrand: MathNode, ctx: DispatchContext): DispatchResult {
	const antiderivative = simplifiedMultiply(integrand, variableNode(ctx.variable));
	const step = buildStep(ctx, {
		rule: 'apply-constant-rule',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { c: integrand }
	});
	return { antiderivative, steps: [step] };
}

function integratePower(
	originalIntegrand: MathNode,
	base: MathNode,
	exp: MathNode,
	ctx: DispatchContext
): DispatchResult {
	const antiderivative = powerRule(base, exp, ctx.variable);
	const step = buildStep(ctx, {
		rule: 'apply-power-rule',
		before: originalIntegrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { base, n: exp }
	});
	return { antiderivative, steps: [step] };
}

function integrateReciprocalVariable(integrand: MathNode, ctx: DispatchContext): DispatchResult {
	// ln|x|, ou ln x quand x > 0 sur l'intervalle (∫₁ᵉ, décision du 2026-10-13)
	const x = variableNode(ctx.variable);
	const positivity = lnPositivity(x, ctx);
	const antiderivative = positivity ? ln(x) : lnAbsRule(x);
	const step = buildStep(ctx, {
		rule: 'apply-known-primitive',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		...(positivity && { bindings: positivity })
	});
	return { antiderivative, steps: [step] };
}

function integrateKnownPrimitive(
	integrand: MathNode,
	fnName: 'exp' | 'sin' | 'cos' | 'tan',
	ctx: DispatchContext
): DispatchResult {
	const arg = variableNode(ctx.variable);
	let antiderivative: MathNode;
	switch (fnName) {
		case 'exp':
			// ∫ e^x dx = e^x, écrit e^{x} (jamais `\exp(x)`, décision du 2026-10-11)
			antiderivative = superscript(euler(), arg);
			break;
		case 'sin':
			antiderivative = sinRule(arg);
			break;
		case 'cos':
			antiderivative = cosRule(arg);
			break;
		case 'tan':
			antiderivative = tanRule(arg);
			break;
	}
	const step = buildStep(ctx, {
		rule: 'apply-known-primitive',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable
	});
	return { antiderivative, steps: [step] };
}

function integrateComposite(
	integrand: MathNode,
	match: CompositeMatch,
	ctx: DispatchContext
): DispatchResult {
	const u = match.u;
	// u affiché sans ses parenthèses d'écriture : « u = 2x + 1 », pas « u = (2x + 1) »
	const bareU = withoutDelimiters(u);
	let baseAntiderivative: MathNode;
	let rule: PedagogicalIntegrationStep['rule'];
	const bindings: IntegrationBindings = { u: bareU };

	switch (match.kind) {
		case 'composite-exp':
			// e^u, pas `expRule(u)` : celui-ci calcule ∫ e^{ax} dx = e^{ax}/a, et
			// `constantFactor` rééquilibre déjà par 1/u' (`∫ e^{2x} dx` rendait e^{2x}/4)
			// écrit e^{u}, jamais `\exp(u)` (décision de David du 2026-10-11)
			baseAntiderivative = superscript(euler(), u);
			rule = 'apply-composite-exp';
			break;
		case 'composite-ln': {
			// ln|u|, ou ln u quand u > 0 est certain (décision de David du 2026-10-13)
			const positivity = lnPositivity(bareU, ctx);
			baseAntiderivative = positivity ? ln(bareU) : ln(abs(bareU));
			Object.assign(bindings, positivity);
			rule = 'apply-composite-ln';
			break;
		}
		case 'composite-sin':
			baseAntiderivative = opposite(cos(u));
			rule = 'apply-composite-sin';
			break;
		case 'composite-cos':
			baseAntiderivative = sin(u);
			rule = 'apply-composite-cos';
			break;
		case 'composite-power': {
			if (!match.n) {
				throw new PedagogicalIntegrationNotImplemented(
					integrand,
					'composite-power without exponent'
				);
			}
			const newExp = simplifiedAdd(match.n, number('1'));
			baseAntiderivative = simplifiedDivide(simplifiedPower(u, newExp), newExp);
			rule = 'apply-composite-power';
			bindings.n = match.n;
			break;
		}
	}

	// Intégrande exactement u′·g(u) : la forme composée s'applique telle quelle
	const k = match.constantFactor;
	if (k === undefined || isOneRational(k)) {
		const step = buildStep(ctx, {
			rule,
			before: integrand,
			after: baseAntiderivative,
			variable: ctx.variable,
			bindings
		});
		return { antiderivative: baseAntiderivative, steps: [step] };
	}

	// Sinon on fait apparaître u′ (décision de David du 2026-10-13) :
	// f = k × u′·g(u), on sort k, la forme composée s'applique à u′·g(u). Le
	// coefficient est écrit, plus jamais glissé dans la primitive sans un mot.
	const du = cleanDerivative(u, ctx.variable);
	if (du === null) {
		throw new PedagogicalIntegrationNotImplemented(integrand, "composite: cannot compute u'");
	}
	const revealed = revealedIntegrand(match, u, du);
	const kNode = rationalToNode(k);
	// Fraction exacte : `\dfrac{1}{2}`, jamais `0.5`
	const scaled = withRationalCoefficient(k, baseAntiderivative);
	// Les étapes s'enchaînent (chaque `before` est l'`after` précédent) : la
	// réécriture rend u′g(u), l'intégrande qu'on intègre ensuite ; la forme
	// composée rend k·G(u), la primitive de f
	const revealBindings: IntegrationBindings = {
		u: bareU,
		du,
		k: kNode,
		revealed,
		integrand,
		variable: variableNode(ctx.variable)
	};
	const reveal = buildStep(ctx, {
		rule: 'reveal-derivative',
		before: integrand,
		after: revealed,
		variable: ctx.variable,
		bindings: revealBindings,
		// u′ = 1 : il n'y a qu'une constante à sortir (décision de David du 2026-10-13)
		...(onlyConstantOut(revealBindings) && {
			description: isMinusOneCoefficient(revealBindings)
				? 'On sort le signe −'
				: 'On sort la constante'
		})
	});
	const composite = buildStep(ctx, {
		rule,
		before: revealed,
		after: scaled,
		variable: ctx.variable,
		bindings: { ...bindings, k: kNode, scaled }
	});
	return { antiderivative: scaled, steps: [reveal, composite] };
}

/** `(2x + 1)` → `2x + 1` (parenthèses d'écriture seulement). */
function withoutDelimiters(node: MathNode): MathNode {
	let n = node;
	while (n.type === 'delimiter') n = n.content;
	return n;
}

/** Un facteur écrit devant un produit : entre parenthèses si c'est une somme. */
function asFactor(node: MathNode): MathNode {
	const bare = withoutDelimiters(node);
	return bare.type === 'addition' || bare.type === 'subtraction' ? parentheses(bare) : bare;
}

/**
 * u′ écrit proprement : une constante en fraction exacte (`2`, `-1`,
 * `\dfrac{1}{2}`, pas `\dfrac{2}{2^2}`), sinon la dérivée rangée par `tidyTerms`.
 */
function cleanDerivative(u: MathNode, variable: string): MathNode | null {
	let du: MathNode;
	try {
		du = differentiate(u, { variable });
	} catch {
		return null;
	}
	if (!containsVariable(du, variable)) {
		const value = findProportionalityRatio(du, number('1'));
		return value === null ? null : rationalToNode(value);
	}
	try {
		return tidyTerms(du, { domain: [u] });
	} catch {
		return du;
	}
}

/**
 * L'intégrande EXACTEMENT de la forme u′·g(u) que l'étape « On fait apparaître
 * u′ » écrit : `2e^{2x}`, `2x e^{x^2}`, `\dfrac{2x}{x^2+1}`, `-e^{-x}`,
 * `\dfrac{1}{x}` (u′ = 1), `2\left(2x+1\right)^3`.
 */
function revealedIntegrand(match: CompositeMatch, u: MathNode, du: MathNode): MathNode {
	const bareU = withoutDelimiters(u);
	const negative = du.type === 'opposite';
	const magnitude = du.type === 'opposite' ? du.operand : du;
	const isUnit = magnitude.type === 'number' && magnitude.value === '1';
	const signed = (node: MathNode): MathNode => (negative ? opposite(node) : node);

	if (match.kind === 'composite-ln') {
		const numerator = isUnit ? number('1') : magnitude;
		return signed(fraction(numerator, bareU));
	}
	let g: MathNode;
	switch (match.kind) {
		case 'composite-exp':
			g = superscript(euler(), u);
			break;
		case 'composite-sin':
			g = sin(u);
			break;
		case 'composite-cos':
			g = cos(u);
			break;
		case 'composite-power':
			g = superscript(asFactor(u), match.n ?? number('1'));
			break;
	}
	return signed(isUnit ? g : multiply(asFactor(magnitude), g, 'implicit'));
}

/**
 * u > 0 certain ? Pour tout réel → `{ positive: u }` ; sur l'intervalle d'une
 * intégrale définie → `{ positive: u, lower, upper }` ; sinon `null` (ln|u|).
 */
function lnPositivity(u: MathNode, ctx: DispatchContext): IntegrationBindings | null {
	if (isCertainlyPositive(u, ctx.variable)) return { positive: u };
	if (ctx.interval && isCertainlyPositive(u, ctx.variable, ctx.interval)) {
		return { positive: u, lower: ctx.interval.lower, upper: ctx.interval.upper };
	}
	return null;
}

/**
 * `k·F` écrit comme sur une copie : le signe devant, puis la fraction, puis la
 * fonction — `-\dfrac{1}{3}\cos(3x+1)` et non `\dfrac{1}{3}(-\cos(3x+1))`.
 * C'est la forme finale d'un terme « coefficient × une seule fonction » (aucune
 * étape « On simplifie » ne la reprend, décision de David du 2026-10-11).
 */
function withRationalCoefficient(k: Rational, base: MathNode): MathNode {
	const baseNegative = base.type === 'opposite';
	const inner = base.type === 'opposite' ? base.operand : base;
	const negative = isNegativeRational(k) !== baseNegative;
	const magnitude = absRational(k);
	const product = isOneRational(magnitude)
		? inner
		: simplifiedMultiply(rationalToNode(magnitude), inner);
	return negative ? opposite(product) : product;
}

/**
 * Un seul terme « coefficient rationnel × une seule fonction » (`\dfrac{1}{2}e^{2x}`,
 * `-\dfrac{1}{3}\cos(3x+1)`, `5e^x`, `\ln\lvert x\rvert`) : il n'y a rien à
 * simplifier, la primitive reste telle quelle (décision de David du 2026-10-11).
 *
 * Règle exacte : sous un signe `-` éventuel, soit une fonction seule, soit le
 * produit d'un coefficient ÉCRIT EN CHIFFRES (entier `3`, ou fraction d'entiers
 * `\dfrac{2}{4}`) par une fonction seule. « Fonction seule » = un appel (`\ln`,
 * `\sin`, `\cos`…) ou une puissance (`e^{u}`, `u^n`). Un quotient, un produit,
 * une somme ou un opposé à l'intérieur n'en est pas une :
 * `\dfrac{1}{4}\dfrac{x^2}{2}` et `\dfrac{1}{2}\dfrac{(2x+1)^4}{4}` ont un
 * coefficient pas encore calculé, et passent par `tidy` (rend `null`).
 *
 * Rend le terme décomposé ; `canonical` dit si le coefficient est déjà réduit
 * (entier, ou fraction irréductible de dénominateur > 1) — sinon
 * (`\dfrac{2}{4}`, `\dfrac{6}{3}`) il reste à le réduire (revue du 2026-10-11).
 */
interface SingleCoefficientTerm {
	readonly k: Rational;
	readonly fn: MathNode;
	readonly canonical: boolean;
}

/**
 * La somme RANGÉE par `tidy` (ln semblables regroupés, terme positif en tête)
 * dont chaque terme est « coefficient rationnel × ln », réécrite coefficient
 * DEVANT (`withRationalCoefficient`), dans le même ordre et avec les mêmes
 * signes : `\dfrac{1}{3}\ln|3x+1| - 2\ln|x|`, comme le moteur et
 * `\dfrac{1}{2}e^{2x}` (décision de David du 2026-10-11), et non
 * `\dfrac{\ln|3x+1|}{3}` qu'écrit `tidy`. null si un terme n'est pas de
 * cette forme ou s'il y a moins de deux termes.
 */
function lnCoefficientForm(tidied: MathNode): MathNode | null {
	const terms = flattenSum(tidied);
	if (terms.length < 2) return null;
	const parts: SignedTerm[] = [];
	for (const { term, sign } of terms) {
		const ln = lnTerm(term);
		if (ln === null) return null;
		const k = sign === 1 ? ln.k : negRational(ln.k);
		parts.push({
			term: withRationalCoefficient(absRational(k), ln.fn),
			sign: isNegativeRational(k) ? -1 : 1
		});
	}
	return signedSum(parts);
}

/** `k·\ln u`, `\ln u`, `\dfrac{\ln u}{m}` ou `\dfrac{n\ln u}{m}` (n, m entiers écrits) : k et le ln */
function lnTerm(term: MathNode): { readonly k: Rational; readonly fn: MathNode } | null {
	const isLn = (n: MathNode): boolean => n.type === 'function' && n.name === 'ln';
	const single = singleCoefficientTerm(term);
	if (single) return isLn(single.fn) ? { k: single.k, fn: single.fn } : null;
	if (term.type !== 'division' || !isIntegerLiteral(term.denominator)) return null;
	const top = singleCoefficientTerm(term.numerator);
	const m = extractExactRational(term.denominator);
	if (!top || !isLn(top.fn) || m === null || m.n === 0n) return null;
	return { k: divRational(top.k, m), fn: top.fn };
}

function isIntegerLiteral(n: MathNode): boolean {
	return n.type === 'number' && /^\d+$/.test(n.value);
}

function singleCoefficientTerm(node: MathNode): SingleCoefficientTerm | null {
	const negative = node.type === 'opposite';
	const term = node.type === 'opposite' ? node.operand : node;
	const isSingleFunction = (n: MathNode): boolean =>
		n.type === 'function' || n.type === 'superscript';
	const sign = (r: Rational): Rational => (negative ? negRational(r) : r);
	if (isSingleFunction(term)) return { k: sign(ONE), fn: term, canonical: true };
	if (term.type !== 'multiplication' || !isSingleFunction(term.right)) return null;
	const left = term.left;
	const literal =
		isIntegerLiteral(left) ||
		(left.type === 'division' &&
			isIntegerLiteral(left.numerator) &&
			isIntegerLiteral(left.denominator));
	if (!literal) return null;
	const k = extractExactRational(left);
	if (k === null || k.n === 0n) return null;
	const canonical = toLatex(rationalToNode(k)) === toLatex(left) && !isOneRational(k);
	return { k: sign(k), fn: term.right, canonical };
}

function integrateLinearity(integrand: MathNode, ctx: DispatchContext): DispatchResult {
	const terms = flattenSum(integrand);
	if (terms.length < 2) {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'linearity dispatcher invoked but integrand is not a sum'
		);
	}

	const subSteps: PedagogicalIntegrationStep[] = [];
	const recurCtx = withDeeperRecursion(ctx);
	const antiderivativeParts: { node: MathNode; sign: 1 | -1 }[] = [];

	for (const { term, sign } of terms) {
		const sub = integrateNode(term, recurCtx);
		subSteps.push(...sub.steps);
		antiderivativeParts.push({ node: sub.antiderivative, sign });
	}

	let combined =
		antiderivativeParts[0].sign === 1
			? antiderivativeParts[0].node
			: opposite(antiderivativeParts[0].node);
	for (let i = 1; i < antiderivativeParts.length; i++) {
		const part = antiderivativeParts[i];
		combined = part.sign === 1 ? simplifiedAdd(combined, part.node) : subtract(combined, part.node);
	}

	const step = buildStep(ctx, {
		rule: 'apply-linearity-sum',
		before: integrand,
		after: combined,
		variable: ctx.variable,
		subSteps
	});
	return { antiderivative: combined, steps: [step] };
}

/**
 * Integrate a unary opposite : `∫ -f(x) dx = -∫ f(x) dx`. Rendered as an
 * `extract-constant` with c = -1, titled « On sort le signe − » like the
 * `reveal-derivative` of `\\frac{-1}{x}` (décision de David du 2026-10-13).
 */
function integrateOpposite(
	integrand: MathNode & { type: 'opposite' },
	ctx: DispatchContext
): DispatchResult {
	const recurCtx = withDeeperRecursion(ctx);
	const sub = integrateNode(integrand.operand, recurCtx);
	const antiderivative = opposite(sub.antiderivative);
	const minusOne = opposite(number('1'));
	const step = buildStep(ctx, {
		rule: 'extract-constant',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { c: minusOne, f: integrand.operand },
		description: 'On sort le signe −',
		subSteps: sub.steps
	});
	return { antiderivative, steps: [step] };
}

function integrateExtractConstant(
	integrand: MathNode,
	extraction: { c: MathNode; f: MathNode },
	ctx: DispatchContext
): DispatchResult {
	const recurCtx = withDeeperRecursion(ctx);
	const sub = integrateNode(extraction.f, recurCtx);
	const antiderivative = simplifiedMultiply(extraction.c, sub.antiderivative);
	const bindings: IntegrationBindings = { c: extraction.c, f: extraction.f };

	const step = buildStep(ctx, {
		rule: 'extract-constant',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings,
		...(isMinusOneCoefficient(bindings, 'c') && { description: 'On sort le signe −' }),
		subSteps: sub.steps
	});
	return { antiderivative, steps: [step] };
}

function integrateByParts(
	integrand: MathNode,
	parts: PartsMatch,
	ctx: DispatchContext
): DispatchResult {
	const u = parts.u;
	const dv = parts.dv;

	// du/dx — if differentiation fails, refuse pedagogical IPP.
	let du: MathNode;
	try {
		du = differentiate(u, { variable: ctx.variable });
	} catch {
		throw new PedagogicalIntegrationNotImplemented(integrand, 'IPP: cannot compute du');
	}

	// v = ∫dv (recursive call) — we deliberately pass the sub-integration
	// through `integrateNode` so the antiderivative obeys the same pedagogical
	// rules as the top-level call.
	const recurCtx = primitiveInsideParts(ctx);
	let vSub: DispatchResult;
	try {
		vSub = integrateNode(dv, recurCtx);
	} catch {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'IPP: cannot integrate dv pedagogically'
		);
	}
	const v = vSub.antiderivative;

	// vDu = v · du, simplified before re-dispatch. The raw `simplifiedMultiply`
	// keeps degenerate products like `x · (1/x)` as a multiplication node ; we
	// run them through `normalize/denormalize` (which IS aggressive enough to
	// fold `x/x → 1`) so the inner integration can use the constant rule
	// instead of bailing. `preprocess` alone does NOT fold `x · (1/x)`.
	const vDuRaw = simplifiedMultiply(v, du);
	let vDu = vDuRaw;
	try {
		vDu = denormalize(normalize(vDuRaw));
	} catch {
		/* keep raw form */
	}
	let vduSub: DispatchResult;
	try {
		vduSub = integrateNode(vDu, recurCtx);
	} catch {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'IPP: cannot integrate v·du pedagogically'
		);
	}

	const uv = coefficientFirstProduct(u, v);
	const antiderivative = subtract(uv, vduSub.antiderivative);

	const identify = buildStep(ctx, {
		rule: 'identify-parts',
		before: integrand,
		after: integrand,
		variable: ctx.variable,
		bindings: { u, dv, ...boundsBindings(ctx) }
	});
	// v = ∫dv écrit avec un coefficient (v = ½e^{2x}) : sa réécriture vient sous
	// le choix, sinon le ½ tomberait du ciel (décision de David du 2026-10-13)
	const choose = buildStep(ctx, {
		rule: 'choose-u-dv',
		before: integrand,
		after: integrand,
		variable: ctx.variable,
		bindings: { u, dv, du, v },
		...(containsReveal(vSub.steps) && { subSteps: vSub.steps })
	});
	const apply = buildStep(ctx, {
		rule: 'apply-parts-formula',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		// `uv` et `vdu` : le rendu écrit uv − ∫ v du avant de le calculer
		bindings: { u, v, du, uv, vdu: vDu, result: antiderivative },
		subSteps: vduSub.steps
	});
	return { antiderivative, steps: [identify, choose, apply] };
}

/**
 * Les bornes de l'intégrale définie (`lower`, `upper`) : l'annonce de l'IPP
 * énonce alors au lycée la formule avec bornes ; rien pour une primitive.
 */
function boundsBindings(ctx: DispatchContext): Record<string, MathNode> {
	return ctx.definite ? { lower: ctx.definite.lower, upper: ctx.definite.upper } : {};
}

/** Une étape « On fait apparaître u′ », sous-étapes comprises ? */
function containsReveal(steps: readonly PedagogicalIntegrationStep[]): boolean {
	return steps.some(
		(step) => step.rule === 'reveal-derivative' || containsReveal(step.subSteps ?? [])
	);
}

/**
 * Le produit u·v de l'IPP, coefficient numérique DEVANT : `\\dfrac{1}{2}xe^{2x}`,
 * `-\\dfrac{3}{2}xe^{-2x}`, et non `x\\dfrac{1}{2}e^{2x}` ni `3x\\left(-\\dfrac{1}{2}e^{-2x}\\right)`
 * (revue du lot 4 de l'ADR 0024 : l'IPP sur e^{ax+b} rendait v = \\dfrac{1}{a}e^{ax+b}).
 * k = −1 met le signe devant (`-x^2e^{-x}`, pas `x^2\\left(-e^{-x}\\right)`) ; k = 1
 * garde `simplifiedMultiply(u, v)`.
 */
function coefficientFirstProduct(u: MathNode, v: MathNode): MathNode {
	let k: Rational = ONE;
	const rest: MathNode[] = [];
	for (const operand of [u, v]) {
		const { sign, inner } = unwrapSign(operand);
		if (sign === -1) k = negRational(k);
		for (const { factor } of flattenProductShallow(inner)) {
			const value = extractExactRational(factor);
			if (value === null) rest.push(factor);
			else k = mulRational(k, value);
		}
	}
	if (isOneRational(k) || rest.length === 0) return simplifiedMultiply(u, v);
	const product = rest.reduce((acc, factor) => simplifiedMultiply(acc, factor));
	return withRationalCoefficient(k, product);
}

/**
 * V1.1+V2 — `∫1/(c+x²) dx = (1/a)·arctan(x/a)` and
 * `∫1/√(c-x²) dx = arcsin(x/a)`, where `a = √c`. Sup only. Single-step
 * `apply-known-primitive` with the inverse-trig antiderivative computed via
 * `arctanRule(x, a)` / `arcsinRule(x, a)` from `integration/rules.ts` (which
 * already handle both the unit case a=1 and the general a > 0).
 */
function integrateInverseTrig(
	integrand: MathNode,
	kind: 'arctan' | 'arcsin',
	a: MathNode,
	ctx: DispatchContext
): DispatchResult {
	const arg = variableNode(ctx.variable);
	const antiderivative = kind === 'arctan' ? arctanRule(arg, a) : arcsinRule(arg, a);
	const step = buildStep(ctx, {
		rule: 'apply-known-primitive',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable
	});
	return { antiderivative, steps: [step] };
}

/**
 * V1.1 — Cyclic IPP for `∫e^(αx)·sin(βx) dx` and `∫e^(αx)·cos(βx) dx`.
 *
 * After two integration-by-parts steps, the integrand reappears (up to a
 * constant factor `k`). We resolve the algebraic equation directly :
 *
 *     I = u₀·v₀ - I₁
 *     I₁ = u₁·v₁ - I₂
 *     I₂ = k · I  (the cycle)
 *
 *   ⇒ I = u₀·v₀ - (u₁·v₁ - k·I) = u₀·v₀ - u₁·v₁ + k·I
 *   ⇒ I·(1 - k) = u₀·v₀ - u₁·v₁
 *   ⇒ I = (u₀·v₀ - u₁·v₁) / (1 - k)
 *
 * For the canonical `∫e^x·sin(x) dx` case : k = -1, denominator = 2,
 * I = e^x·(sin(x) - cos(x)) / 2.
 *
 * Pedagogical narrative (5 steps) :
 *   1. `identify-parts` — « On utilise l'IPP cyclique. »
 *   2. `choose-u-dv` — u₀, dv₀, du₀, v₀
 *   3. `apply-parts-formula` — IPP1 produces uv₀ + ∫f₁·dx
 *   4. `choose-u-dv` (2nd) — u₁, dv₁, du₁, v₁
 *   5. `apply-cyclic-ipp` — algebraic resolution
 */
function integrateCyclicIPP(integrand: MathNode, ctx: DispatchContext): DispatchResult {
	// Pick u₀ = exp factor, dv₀ = trig factor (LIATE-friendly).
	const u0 = pickExpFactor(integrand, ctx.variable);
	const dv0 = pickTrigFactor(integrand, ctx.variable);

	let du0: MathNode;
	try {
		du0 = differentiate(u0, { variable: ctx.variable });
	} catch {
		throw new PedagogicalIntegrationNotImplemented(integrand, 'cyclic IPP: cannot compute du₀');
	}
	const recurCtx = primitiveInsideParts(ctx);
	let v0Sub: DispatchResult;
	try {
		v0Sub = integrateNode(dv0, recurCtx);
	} catch {
		throw new PedagogicalIntegrationNotImplemented(integrand, 'cyclic IPP: cannot integrate dv₀');
	}
	const v0 = v0Sub.antiderivative;

	// Inner integrand f₁ = v₀ · du₀, simplified.
	const f1Raw = simplifiedMultiply(v0, du0);
	let f1 = f1Raw;
	try {
		f1 = denormalize(normalize(f1Raw));
	} catch {
		/* keep raw */
	}

	// f₁ may come back as `opposite(multiplication(...))` (because v₀ = -cos
	// has propagated its sign). Extract the sign factor c₁ and the clean
	// product g₁ for the second IPP.
	const { sign: c1, inner: g1 } = unwrapSign(f1);
	if (g1.type !== 'multiplication' || !isCyclicIppPattern(g1, ctx.variable)) {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'cyclic IPP: inner integrand f₁ is not a cyclic pattern'
		);
	}
	const u1 = pickExpFactor(g1, ctx.variable);
	const dv1 = pickTrigFactor(g1, ctx.variable);

	let du1: MathNode;
	try {
		du1 = differentiate(u1, { variable: ctx.variable });
	} catch {
		throw new PedagogicalIntegrationNotImplemented(integrand, 'cyclic IPP: cannot compute du₁');
	}
	let v1Sub: DispatchResult;
	try {
		v1Sub = integrateNode(dv1, recurCtx);
	} catch {
		throw new PedagogicalIntegrationNotImplemented(integrand, 'cyclic IPP: cannot integrate dv₁');
	}
	const v1 = v1Sub.antiderivative;

	// h = v₁ · du₁ (the integrand of the second-IPP's residual ∫ v₁·du₁ dx).
	// We compare h to the ORIGINAL integrand to detect the cycle.
	const hRaw = simplifiedMultiply(v1, du1);
	let h = hRaw;
	try {
		h = denormalize(normalize(hRaw));
	} catch {
		/* keep raw */
	}

	const k2 = findProportionalityConstant(h, integrand);
	if (k2 === null) {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'cyclic IPP: residual integrand is not proportional to the original'
		);
	}

	// Algebraic resolution :
	//     I = u₀v₀ - I₁
	//     I₁ = c₁·K₁ where K₁ = u₁v₁ - K₂  and  K₂ = k₂·I
	//   ⇒ I = u₀v₀ - c₁·(u₁v₁ - k₂·I) = u₀v₀ - c₁·u₁v₁ + c₁·k₂·I
	//   ⇒ I·(1 - c₁·k₂) = u₀v₀ - c₁·u₁v₁
	const denomValue = 1 - c1 * k2;
	if (Math.abs(denomValue) < 1e-12) {
		throw new PedagogicalIntegrationNotImplemented(
			integrand,
			'cyclic IPP: degenerate cycle (1 - c₁·k₂ ≈ 0)'
		);
	}
	const u0v0 = simplifiedMultiply(u0, v0);
	const u1v1Raw = simplifiedMultiply(u1, v1);
	const u1v1Signed = c1 === 1 ? u1v1Raw : opposite(u1v1Raw);
	const numerator = subtract(u0v0, u1v1Signed);
	const antiderivative = simplifiedDivide(numerator, numericNode(denomValue));

	const identify = buildStep(ctx, {
		rule: 'identify-parts',
		before: integrand,
		after: integrand,
		variable: ctx.variable,
		bindings: { u: u0, dv: dv0, ...boundsBindings(ctx) }
	});
	const choose1 = buildStep(ctx, {
		rule: 'choose-u-dv',
		before: integrand,
		after: integrand,
		variable: ctx.variable,
		bindings: { u: u0, dv: dv0, du: du0, v: v0 }
	});
	const apply1 = buildStep(ctx, {
		rule: 'apply-parts-formula',
		before: integrand,
		after: subtract(u0v0, f1),
		variable: ctx.variable,
		// Pas de `result` : l'intégrale restante n'est pas calculée ici, le
		// rendu écrit u₀v₀ − ∫ f₁ dx (et non u₀v₀ − f₁, qui serait faux)
		bindings: { u: u0, v: v0, du: du0, uv: u0v0, vdu: f1 }
	});
	const choose2 = buildStep(ctx, {
		rule: 'choose-u-dv',
		before: f1,
		after: f1,
		variable: ctx.variable,
		bindings: { u: u1, dv: dv1, du: du1, v: v1 }
	});
	const cyclic = buildStep(ctx, {
		rule: 'apply-cyclic-ipp',
		before: integrand,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { u: u0, v: v0, u2: u1, v2: v1 }
	});
	return { antiderivative, steps: [identify, choose1, apply1, choose2, cyclic] };
}

/**
 * V2 — Partial fractions decomposition for `∫ P(x)/Q(x) dx` where Q is
 * quadratic with two distinct real roots and deg(P) < 2.
 *
 * The decomposition is computed via the « method of roots » in
 * `tryDetectPartialFractions` ; here we emit the two pedagogical steps :
 *   1. `decompose-rational` — show the partial-fraction decomposition
 *   2. `apply-partial-fractions` — integrate each term
 *
 * Facteurs à coefficients ENTIERS (ADR 0024, décision de David du
 * 2026-10-12) : la racine r = p/q donne le facteur `qx − p`, l'élément simple
 * A/(x − r) s'écrit A'/(qx − p) avec A' = A·q, et s'intègre en
 * (A'/q)·ln|qx − p| = A·ln|qx − p| : `4x² − 1 = (2x − 1)(2x + 1)`,
 * primitive `\dfrac{1}{4}\ln|2x - 1| - \dfrac{1}{4}\ln|2x + 1|`, coefficient
 * devant comme le moteur. Coefficient dominant 1 : facteurs inchangés (`x - 3`).
 */
function integratePartialFractions(
	integrand: MathNode,
	match: PartialFractionsMatch,
	ctx: DispatchContext
): DispatchResult {
	const r1Nd = rationalToNode(match.r1);
	const r2Nd = rationalToNode(match.r2);

	// `qx − p` pour r = p/q : `2x - 1` pour 1/2, `x + 1` pour −1
	const factor1 = integerLinearFactorNode(ctx.variable, match.r1);
	const factor2 = integerLinearFactorNode(ctx.variable, match.r2);
	// A' = A·q₁, B' = B·q₂ : coefficients de 1/(q₁x − p₁) et 1/(q₂x − p₂)
	const A = mulRational(match.A, rational(match.r1.d, 1n));
	const B = mulRational(match.B, rational(match.r2.d, 1n));
	const ANd = rationalToNode(A);
	const BNd = rationalToNode(B);

	// Decomposition `A'/(q₁x − p₁) + B'/(q₂x − p₂)` for the « before → after »
	// of the `decompose-rational` step, A' = p/q écrit `p/(q(…))`. Un
	// coefficient nul (P et Q ont un facteur commun) ne s'écrit pas.
	const elements: Array<{ readonly coefficient: Rational; readonly factor: MathNode }> = [
		{ coefficient: A, factor: factor1 },
		{ coefficient: B, factor: factor2 }
	].filter((e) => !isZeroRational(e.coefficient));
	const decomposition = elements
		.slice(1)
		.reduce<MathNode>(
			(acc, e) =>
				isNegativeRational(e.coefficient)
					? subtract(acc, simpleElement(negRational(e.coefficient), e.factor))
					: simplifiedAdd(acc, simpleElement(e.coefficient, e.factor)),
			simpleElement(elements[0].coefficient, elements[0].factor)
		);

	// Antiderivative `A·ln|q₁x − p₁| + B·ln|q₂x − p₂|` (A = A'/q₁), coefficient
	// devant, signe entre les termes, terme positif en tête (comme le moteur) :
	// `\dfrac{1}{4}\ln|2x-1| - \dfrac{1}{4}\ln|2x+1|`
	const logarithms: SignedTerm[] = [
		{ coefficient: match.A, factor: factor1 },
		{ coefficient: match.B, factor: factor2 }
	]
		.filter((e) => !isZeroRational(e.coefficient))
		.map((e) => ({
			term: withRationalCoefficient(absRational(e.coefficient), ln(abs(e.factor))),
			sign: isNegativeRational(e.coefficient) ? -1 : 1
		}));
	const antiderivative = signedSum([
		...logarithms.filter((t) => t.sign === 1),
		...logarithms.filter((t) => t.sign === -1)
	]);

	// Q factorisé par le noyau, coefficient dominant compris : `4x² − 1 =
	// (2x − 1)(2x + 1)`, jamais `(x − 1/2)(x + 1/2)` qui serait faux (V22)
	const factorization = factorPolynomial(match.denominator, ctx.variable);
	const factoredDenominator =
		factorization === null
			? multiply(parentheses(factor1), parentheses(factor2), 'implicit')
			: factorizationToNode(factorization);

	// Un facteur `qx − p`, q ≠ 1 : les formules l'écrivent `px + q` (p = q₁ ou q₂)
	const scaled = match.r1.d !== 1n || match.r2.d !== 1n;
	const scaleBinding: IntegrationBindings = scaled
		? { p: number((match.r1.d !== 1n ? match.r1.d : match.r2.d).toString()) }
		: {};

	const decomposeStep = buildStep(ctx, {
		rule: 'decompose-rational',
		before: integrand,
		after: decomposition,
		variable: ctx.variable,
		bindings: {
			numerator: match.numerator,
			denominator: match.denominator,
			factoredDenominator,
			factor1,
			factor2,
			r1: r1Nd,
			r2: r2Nd,
			A: ANd,
			B: BNd,
			...scaleBinding
		}
	});

	const applyStep = buildStep(ctx, {
		rule: 'apply-partial-fractions',
		before: decomposition,
		after: antiderivative,
		variable: ctx.variable,
		bindings: { A: ANd, B: BNd, r1: r1Nd, r2: r2Nd, ...scaleBinding }
	});

	return { antiderivative, steps: [decomposeStep, applyStep] };
}

/** L'élément simple A/(qx − p) : `\frac{3}{2(x - 1)}` pour A = 3/2, `-\frac{1}{x - 2}` pour A = −1 */
function simpleElement(coefficient: Rational, linear: MathNode): MathNode {
	const denominator =
		coefficient.d === 1n
			? linear
			: multiply(number(coefficient.d.toString()), parentheses(linear), 'implicit');
	const magnitude = divide(number(absBigInt(coefficient.n).toString()), denominator, 'fraction');
	return coefficient.n < 0n ? opposite(magnitude) : magnitude;
}

// =============================================================================
// Re-exports for the renderer / demos
// =============================================================================

export { isExactVariable };
