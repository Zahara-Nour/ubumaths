/**
 * La forme finale de f′ — la dernière ligne d'une dérivation (D1 révisée et
 * Q18, chantier simplify-carte, lot 5a, 2026-10-23)
 *
 * `tidyTerms` range la dérivée brute sans rien développer : un quotient
 * gardait `(2(x−3) − (2x+1))/(x−3)²` et `x·eˣ` donnait `eˣ + xeˣ` (« je ne
 * trouve pas normal que f′ affiche eˣ + xeˣ », David). La règle :
 *
 * 1. **Quotient** : numérateur et dénominateur divisés par leur facteur commun
 *    quand le domaine de f le permet (Q18, S3), cherché sur le numérateur BRUT
 *    — réduit d'abord, `2x(x−1)² − 2x²(x−1)` perdait son facteur (x − 1) :
 *    `(2x − x²)/x⁴ → (2 − x)/x³`, `(1 − x)eˣ/(eˣ)² → (1 − x)/eˣ`,
 *    `x²/(x−1)² → −2x/(x−1)³`. Puis numérateur réduit (politique `auto`),
 *    dénominateur gardé, et le quotient entier simplifié s'il raccourcit
 *    (fraction de polynômes `(x² + 2x + 1)/(x + 1)² → 1`, nombres
 *    `−2/(4x²) → −1/(2x²)`), le signe de la barre celui de `tidy`. Le dénominateur de
 *    f′ est le carré de celui de f : ses facteurs sont non nuls sur le domaine
 *    de f, et une exponentielle ne s'annule jamais.
 * 2. **Exponentielle commune** : quand tous les termes portent la même
 *    exponentielle (`eᵘ` ou `\exp(u)`), elle seule est mise en facteur, le
 *    reste réduit : `xeˣ → (x + 1)eˣ`, `x²e^{−x} → (2x − x²)e^{−x}`. Rien d'autre n'est
 *    factorisé (pas de `x(2 − x)`).
 * 3. **Sinon** : la politique `auto`, qui ne factorise jamais (`5(x+1)⁴` reste,
 *    `x²(x + 1)` donne `3x² + 2x`).
 *
 * L'ordre est celui de `tidy` (canonique, sans − en tête pour deux termes ou
 * une somme de degré 1). Quand la forme finale n'est qu'un RÉORDONNEMENT de la
 * dérivée rangée par `tidyTerms`, celle-ci reste (`sin x + x cos x`, ordre de
 * la règle u′v + uv′ : décision du 2026-10-06, « pas d'étape pour un simple
 * déplacement »).
 *
 * @module mathAST/pedagogical-differentiation/final-form
 */

import type { MathNode } from '../types';
import { divide, fraction, multiply, number, opposite, parentheses, superscript } from '../factory';
import {
	flattenProductShallow,
	flattenSumShallow,
	unflattenProduct,
	unflattenSum
} from '../flatten';
import type { SignedTerm } from '../flatten';
import {
	isDelimiter,
	isEulerConstant,
	isFunction,
	isNumber,
	isOpposite,
	isSuperscript
} from '../guards';
import { hashMathNode } from '../normal/hash';
import { generatePedagogicalSimplifySteps } from '../pedagogical-simplify/pipeline';
import { differentiate } from '../differentiation';
import { generatePedagogicalDifferentiationSteps } from './pipeline';
import { tidy } from '../tidy';
import type { TidyOptions } from '../tidy';
import { nonZeroBases } from '../tidy/sign';
import { nodeCount, tidyTerms } from '../tidy/terms';
import { findNodes } from '../transforms';

/** Le budget de la politique `auto` : au-delà, la dérivée rangée reste. */
const AUTO_TIMEOUT_MS = 1000;

/** Un facteur d'un terme : sa base et son exposant entier (`x⁴` : x, 4). */
type PowerFactor = { readonly base: MathNode; readonly exponent: number; readonly key: string };

/**
 * La forme finale de la dérivée `derivative` de `f`.
 *
 * Ne lève jamais : sur un imprévu, la dérivée rangée par `tidyTerms`.
 *
 * @param derivative - La dérivée brute
 * @param f - La fonction dérivée : son domaine est acquis pour f′ (S3)
 */
export function finalDerivative(derivative: MathNode, f: MathNode): MathNode {
	const options: TidyOptions = { domain: [f] };
	const kept = tidyTerms(derivative, options);
	try {
		const candidate = finalForm(derivative, f, options);
		// Un simple réordonnement de la dérivée rangée (mêmes termes, même
		// écriture) : l'ordre de la règle reste. `−2/(4x²)` → `−1/(2x²)` n'en est pas un.
		// Un quotient, lui, suit toujours la forme finale : le signe de la barre
		// est celui de `tidy` (David, 2026-10-23), pas celui de la règle.
		const reordered =
			!isQuotient(candidate) &&
			hashMathNode(tidy(candidate, options)) === hashMathNode(tidy(kept, options)) &&
			lengthWithoutSigns(candidate) === lengthWithoutSigns(kept) &&
			numbersTotal(candidate) === numbersTotal(kept);
		return reordered ? kept : candidate;
	} catch {
		return kept;
	}
}

/**
 * La forme finale de la dérivée n-ième de `f`, calculée comme le bouton
 * « Dériver » et `.dériver` : dérivée brute des étapes pédagogiques (le moteur
 * de dérivation s'il refuse), puis `finalDerivative` une seule fois par ordre.
 * Le domaine acquis (S3) est celui de `f`. `null` si rien ne dérive.
 *
 * Pour la carte f′ de l'Atelier : elle dérive f DÉJÀ substituée, sinon la forme
 * finale était appliquée deux fois (avant et après la substitution) et la
 * carte divergeait du bouton (revue du lot 5a).
 */
export function finalDerivativeOf(f: MathNode, order = 1, variable = 'x'): MathNode | null {
	let current = f;
	for (let k = 0; k < order; k++) {
		const raw = rawDerivative(current, variable);
		if (raw === null) return null;
		current = finalDerivative(raw, f);
	}
	return current;
}

function rawDerivative(node: MathNode, variable: string): MathNode | null {
	try {
		const result = generatePedagogicalDifferentiationSteps(node, {
			variable,
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		if (result.steps.length > 0) return result.derivative;
	} catch {
		// Refus des étapes (valeur absolue…) : le moteur de dérivation prend le relais
	}
	try {
		return differentiate(node, { variable });
	} catch {
		return null;
	}
}

function finalForm(written: MathNode, f: MathNode, options: TidyOptions): MathNode {
	const node = withOppositeInNumerator(withCoefficientInNumerator(written));
	if (node.type === 'division') {
		const raw = tidy(node.numerator, { ...options, order: 'kept' });
		const denominator = tidy(node.denominator, { ...options, order: 'kept' });
		const divided = divideByCommonFactor(raw, denominator, f, options);
		const top = withCommonExponential(reduce(divided.numerator, options), options);
		if (isOne(divided.denominator)) return top;
		// Le signe de la barre suit `tidy` (« Le signe d'une fraction », tidy-spec §A,
		// David 2026-10-23) : `−7/(x−3)²`, `(1 − x)/eˣ`, `−(2x² + 18)/(x² − 9)²`
		return tidy(
			simplifiedQuotient(divide(top, divided.denominator, node.displayStyle), options),
			options
		);
	}
	return withCommonExponential(reduce(node, options), options);
}

/**
 * `c·(u/v)′` → `(c·u′v − c·uv′)/v²` : le coefficient numérique entre dans
 * CHAQUE terme du numérateur, comme si f était écrite `cu/v`. `2x/(x²−9)` tapé
 * se lit `2·(x/(x²−9))` : sa dérivée brute `2·(…)/(x²−9)²` n'était pas un
 * quotient, et `auto` gardait `2(−x² − 9)` (distribuer n'est pas plus court),
 * là où la forme écrite donne `−(2x² + 18)/(x² − 9)²` (rat-18, lot 5a).
 */
function withCoefficientInNumerator(node: MathNode): MathNode {
	if (node.type !== 'multiplication') return node;
	const left = unwrap(node.left);
	const right = unwrap(node.right);
	const [coefficient, quotient] = isNumericCoefficient(node.left)
		? [node.left, right]
		: isNumericCoefficient(node.right)
			? [node.right, left]
			: [null, null];
	if (coefficient === null || quotient === null || quotient.type !== 'division') return node;
	const terms: SignedTerm[] = flattenSumShallow(unwrap(quotient.numerator)).map(
		({ sign, term }) => ({ sign, term: multiply(coefficient, term, 'implicit') })
	);
	const numerator = unflattenSum(terms);
	return numerator === null ? node : divide(numerator, quotient.denominator, quotient.displayStyle);
}

/**
 * `−(u/v)′` → `(−u′)/v` : le − entre au numérateur, qui est alors réduit comme
 * celui d'un quotient. `−x²/(x+2)` se lit `−(x²/(x+2))` : sa dérivée brute
 * `−(2x(x+2) − x²)/(x+2)²` n'était pas un quotient, et `auto` gardait
 * `(x² − 2x(x+2))/(x+2)²` (revue du lot 5b).
 */
function withOppositeInNumerator(node: MathNode): MathNode {
	if (!isOpposite(node)) return node;
	const quotient = unwrap(node.operand);
	if (quotient.type !== 'division') return node;
	return divide(opposite(quotient.numerator), quotient.denominator, quotient.displayStyle);
}

/** Un nombre, sous un éventuel − ou des parenthèses : `2`, `−3`. */
function isNumericCoefficient(node: MathNode): boolean {
	const inner = unwrap(node);
	return isNumber(inner) || (isOpposite(inner) && isNumber(unwrap(inner.operand)));
}

/**
 * Le quotient entier passé par `auto`, s'il raccourcit : une fraction de
 * polynômes (`(x² + 2x + 1)/(x + 1)² → 1`, ses facteurs communs sont ceux du
 * dénominateur de f, donc non nuls sur son domaine) ou des nombres
 * (`−2/(4x²) → −1/(2x²)`).
 */
function simplifiedQuotient(quotient: MathNode, options: TidyOptions): MathNode {
	const whole = reduce(quotient, options);
	const shorter = lengthWithoutSigns(whole) - lengthWithoutSigns(quotient);
	// À longueur égale, des nombres plus petits : `−2/(4x²)` → `−1/(2x²)`
	if (shorter > 0 || (shorter === 0 && numbersTotal(whole) >= numbersTotal(quotient))) {
		return quotient;
	}
	return whole;
}

/** La somme des nombres écrits (`−2/(4x²)` : 6). */
function numbersTotal(node: MathNode): number {
	return findNodes(node, isNumber).reduce((total, n) => total + Math.abs(Number(n.value)), 0);
}

/** La longueur d'une écriture, sans compter où se place le signe −. */
function lengthWithoutSigns(node: MathNode): number {
	return nodeCount(node) - findNodes(node, isOpposite).length;
}

/**
 * La politique `auto` (réduire, développer si plus court, jamais factoriser),
 * précédée et suivie de `tidy` : avant, pour les simplifications que permet le
 * domaine de f (`x·(1/x) → 1`, S3), que `auto` ignore ; après, pour l'ordre.
 * `developper` pour le facteur d'une exponentielle commune : « le reste
 * développé réduit » (`2x + 2(x² + 1)` → `2x² + 2x + 2`).
 */
function reduce(
	node: MathNode,
	options: TidyOptions,
	intent: 'auto' | 'developper' = 'auto'
): MathNode {
	const start = tidy(node, { ...options, order: 'kept' });
	const result = generatePedagogicalSimplifySteps(start, {
		intent,
		schoolLevel: 'lycee',
		timeoutMs: AUTO_TIMEOUT_MS
	});
	if (result.aborted === true) throw new Error(`${intent} : budget dépassé`);
	return tidy(result.result, options);
}

// =============================================================================
// Q18 — le facteur commun du numérateur et du dénominateur
// =============================================================================

/**
 * Divise numérateur et dénominateur par la plus haute puissance commune de
 * chaque facteur du dénominateur, si ce facteur est non nul sur le domaine de
 * f (ou une exponentielle).
 */
function divideByCommonFactor(
	numerator: MathNode,
	denominator: MathNode,
	f: MathNode,
	options: TidyOptions
): { readonly numerator: MathNode; readonly denominator: MathNode } {
	const nonZero = nonZeroBases([f], (n) => tidy(n));
	let top = numerator;
	let bottom = denominator;
	for (const factor of powerFactors(denominator)) {
		const allowed = nonZero.has(factor.key) || isExponential(factor.base);
		if (!allowed) continue;
		const terms = flattenSumShallow(top);
		const shared = Math.min(
			factor.exponent,
			...terms.map(({ term }) => exponentOf(term, factor.key))
		);
		if (shared <= 0) continue;
		const divisor = shared === 1 ? factor.base : superscript(factor.base, number(String(shared)));
		const dividedTerms: SignedTerm[] = terms.map(({ sign, term }) => ({
			sign,
			term: tidy(fraction(term, divisor), options)
		}));
		top = tidy(unflattenSum(dividedTerms) ?? number('0'), options);
		bottom = tidy(fraction(bottom, divisor), options);
	}
	return { numerator: top, denominator: bottom };
}

/** Les facteurs d'un produit, chacun avec son exposant entier positif (1 sinon). */
function powerFactors(node: MathNode): PowerFactor[] {
	return flattenProductShallow(unwrap(node)).map(({ factor }) => {
		const inner = unwrap(factor);
		if (isSuperscript(inner) && isNumber(inner.superscript)) {
			const exponent = Number(inner.superscript.value);
			if (Number.isInteger(exponent) && exponent > 0) {
				const base = unwrap(inner.base);
				return { base, exponent, key: hashMathNode(tidy(base)) };
			}
		}
		return { base: inner, exponent: 1, key: hashMathNode(tidy(inner)) };
	});
}

/** L'exposant de la base `key` dans un terme (0 si elle n'y est pas). */
function exponentOf(term: MathNode, key: string): number {
	return powerFactors(term)
		.filter((factor) => factor.key === key)
		.reduce((total, factor) => total + factor.exponent, 0);
}

// =============================================================================
// D1 — l'exponentielle commune, seule mise en facteur
// =============================================================================

/**
 * `a·eᵘ + b·eᵘ` → `(a + b)eᵘ`, le reste développé réduit. Rien n'est fait si un
 * terme ne porte pas cette exponentielle, ou s'il n'y a qu'un terme.
 */
function withCommonExponential(node: MathNode, options: TidyOptions): MathNode {
	const terms = flattenSumShallow(node);
	if (terms.length < 2) return node;
	const exponential = commonExponential(terms.map(({ term }) => term));
	if (exponential === null) return node;
	const key = hashMathNode(exponential);
	const rests: SignedTerm[] = terms.map(({ sign, term }) => ({
		sign,
		term: withoutFactor(term, key)
	}));
	const rest = reduce(unflattenSum(rests) ?? number('0'), options, 'developper');
	const isSum = rest.type === 'addition' || rest.type === 'subtraction';
	return tidy(multiply(isSum ? parentheses(rest) : rest, exponential, 'implicit'), options);
}

/** L'exponentielle `eᵘ` facteur de chaque terme, ou `null`. */
function commonExponential(terms: readonly MathNode[]): MathNode | null {
	const [first, ...others] = terms;
	for (const { factor } of flattenProductShallow(first)) {
		if (!isExponential(factor)) continue;
		const key = hashMathNode(factor);
		const everywhere = others.every((term) =>
			flattenProductShallow(term).some((other) => hashMathNode(other.factor) === key)
		);
		if (everywhere) return factor;
	}
	return null;
}

/** Le terme sans UN facteur de clé `key` (`1` s'il ne restait que lui). */
function withoutFactor(term: MathNode, key: string): MathNode {
	const factors = flattenProductShallow(term);
	const index = factors.findIndex(({ factor }) => hashMathNode(factor) === key);
	const rest = factors.filter((_, i) => i !== index);
	return unflattenProduct(rest) ?? number('1');
}

/**
 * `eᵘ` (lettre `e` ou `\exponentialE`, invariant 4) ou `\exp(u)`, sous ses
 * parenthèses.
 */
export function isExponential(node: MathNode): boolean {
	const inner = unwrap(node);
	if (isFunction(inner)) {
		return inner.name === 'exp' && inner.args.length === 1 && inner.power === undefined;
	}
	return isSuperscript(inner) && isEulerConstant(unwrap(inner.base));
}

function unwrap(node: MathNode): MathNode {
	let current = node;
	while (isDelimiter(current)) current = current.content;
	return current;
}

/** Un quotient, sous un éventuel − : `a/b`, `−a/b`. */
function isQuotient(node: MathNode): boolean {
	const inner = isOpposite(node) ? node.operand : node;
	return inner.type === 'division';
}

function isOne(node: MathNode): boolean {
	return isNumber(node) && node.value === '1';
}
