/**
 * Pedagogical Rules — Radicals
 *
 * Square-root pedagogical transformations following the French curriculum :
 *
 * - **`extractPerfectSquare`** — `√n` where `n` has a square factor `> 1`
 *   → `c√r` with `c² · r = n` (e.g. `√8 → 2√2`, `√18 → 3√2`).
 * - **`multiplyRadicals`** — `√a × √b → √(a·b)`, then post-simplified to
 *   `c√r` if the product has a square factor.
 * - **`rationalizeDenominator`** (Track C) — `c/√n → c·√n / n` when `n` is
 *   NOT a perfect square (precondition C-2). Note the rule engine is
 *   bottom-up (`mapNode` from leaves up), so for `1/√8` the inner
 *   `extractPerfectSquare` fires first (`√8 → 2√2`), giving `1/(2√2)` —
 *   not the canonical `√2/4`. Decision 2A: V1 stops here; matching
 *   `c/(k·√n)` post-extract is out of scope.
 * - **`simplifyRootOfSquare`** (Track C, **opt-in**) — `√(x²) → |x|` for
 *   non-numeric `x`. Off by default (decision C-1); activated via
 *   `enableSquareRootOfSquare: true` in `PedagogicalArithmeticOptions`.
 *   Numeric squares (`√(4²) = √16`) are intentionally left to
 *   `extractPerfectSquare` to avoid a cosmetically wrong `|4|`.
 *
 * Each rule fizzles silently when its preconditions aren't met (return the
 * original node ; engine sees `nodesEqual` and skips).
 *
 * @module mathAST/pedagogical-arithmetic/pedagogical-rules/radicals
 */

import type { MathNode } from '../../types';
import type { MatchBindings, Rule } from '../../pattern/types';
import { P } from '../../pattern/builder';
import { createRule } from '../../pattern/rule';
import { abs, divide, multiply, number, sqrt } from '../../factory';
import { isDivision, isFunction, isNumber, isSuperscript } from '../../guards';
import { simplifyRadical } from '../../normal/radical';
import type { PedagogicalArithmeticRule } from '../types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * If `node` is `sqrt(n)` with `n` a positive integer literal, return the
 * radicand as a `bigint`. Otherwise return `null`.
 */
function asSqrtRadicand(node: MathNode | undefined): bigint | null {
	if (!node) return null;
	if (!isFunction(node) || node.name !== 'sqrt') return null;
	if (node.args.length !== 1) return null;
	const arg = node.args[0];
	if (!isNumber(arg)) return null;
	if (!/^\d+$/.test(arg.value)) return null; // positive integer only
	const n = BigInt(arg.value);
	if (n <= 0n) return null;
	return n;
}

/** Lookup a binding as a `MathNode`. */
function bindingNode(bindings: MatchBindings, name: string): MathNode | undefined {
	const found = bindings.get(name);
	if (!found || 'terms' in found || 'factors' in found) return undefined;
	return found as MathNode;
}

/**
 * Lis un facteur de la forme `√r` ou `c√r` (c entier positif littéral).
 * Rend `null` pour tout le reste.
 */
function asRadicalFactor(node: MathNode | undefined): { c: bigint; r: bigint } | null {
	if (!node) return null;

	const bare = asSqrtRadicand(node);
	if (bare !== null) return { c: 1n, r: bare };

	if (node.type !== 'multiplication') return null;
	const left = node.left;
	const right = node.right;
	if (!isNumber(left) || !/^\d+$/.test(left.value)) return null;
	const r = asSqrtRadicand(right);
	if (r === null) return null;
	const c = BigInt(left.value);
	if (c <= 0n) return null;
	return { c, r };
}

/** `true` si `√n` se simplifie tout seul (n a un facteur carré non trivial). */
function radicandSimplifies(n: bigint): boolean {
	return simplifyRadical(n, 2n).coefficient !== 1n;
}

/** `true` si `n` est un carré parfait — `√n` est alors un entier. */
function isPerfectSquare(n: bigint): boolean {
	return simplifyRadical(n, 2n).radicand === 1n;
}

/** Build `c · √r` (cross-style multiplication). When `c === 1n`, returns `√r`. */
function coefficientTimesSqrt(c: bigint, r: bigint): MathNode {
	if (c === 1n) return sqrt(number(r.toString()));
	if (r === 1n) return number(c.toString());
	return multiply(number(c.toString()), sqrt(number(r.toString())), 'implicit');
}

// =============================================================================
// extractPerfectSquare (priority 100)
// =============================================================================

/**
 * `√n → c√r` where `n = c² · r` and `c > 1`. Fizzles when `n` has no
 * non-trivial perfect-square factor (e.g. `√2`, `√5`, `√1`).
 */
function applyExtractPerfectSquare(node: MathNode): MathNode | null {
	const n = asSqrtRadicand(node);
	if (n === null || n <= 1n) return null;
	const result = simplifyRadical(n, 2n);
	if (result.coefficient === 1n) return null; // already simplified
	return coefficientTimesSqrt(result.coefficient, result.radicand);
}

export const extractPerfectSquare: PedagogicalArithmeticRule = {
	name: 'extract-perfect-square',
	rule: createRule(
		P._('s'),
		(bindings) => {
			const s = bindingNode(bindings, 's');
			if (!s) return number('0');
			return applyExtractPerfectSquare(s) ?? s;
		},
		{
			name: 'extract-perfect-square',
			condition: (bindings) => {
				const s = bindingNode(bindings, 's');
				if (!s) return false;
				return applyExtractPerfectSquare(s) !== null;
			}
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 100,
	descriptions: {
		college: () => 'On extrait le facteur carré parfait sous la racine',
		lycee: () => 'Extraction du carré parfait',
		superieur: () => 'simpl. √'
	},
	explanations: {
		college: () =>
			'On décompose le nombre sous la racine en produit incluant un carré parfait, puis on extrait celui-ci.'
	}
};

// =============================================================================
// multiplyRadicals (priority 110)
// =============================================================================

/**
 * `c√a × d√b → (cd)√(ab)`, **sans extraire** le carré parfait : l'extraction
 * est une étape à part (`extract-perfect-square`), pour que l'élève voie
 * `√2 × √8 = √16` puis `√16 = 4` au lieu de `√2 × √8 = 4` d'un bloc.
 *
 * Deux chemins mènent au résultat, et on prend le plus simple selon le cas :
 *
 * 1. **produit = carré parfait** → multiplier d'abord. On tombe sur un entier,
 *    c'est le chemin qui « paie » : `√2 × √8 = √16 = 4`.
 * 2. **sinon, si une des racines se simplifie** → on ne multiplie PAS, on rend
 *    la main à `extract-perfect-square`. Sans ça, `√12 × √18` obligerait à
 *    calculer 216 puis à le factoriser de tête, alors que `2√3 × 3√2 = 6√6`
 *    ne demande que des petits nombres.
 * 3. **sinon** → multiplier, c'est le seul chemin : `√2 × √6 = √12`.
 */
function applyMultiplyRadicals(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const lf = asRadicalFactor(left);
	const rf = asRadicalFactor(right);
	if (!lf || !rf) return null;

	const product = lf.r * rf.r;
	if (product < 1n) return null;

	const gauche = radicandSimplifies(lf.r);
	const droite = radicandSimplifies(rf.r);

	// Les DEUX racines se simplifient → `extract-both-radicals` prend la main,
	// même si le produit est un carré parfait : 3√2 × 5√2 est plus doux que
	// √900, qui demande de reconnaître 900 = 30².
	if (gauche && droite) return null;

	// Une seule se simplifie, et le produit n'est pas un carré parfait →
	// `extract-perfect-square` la traite d'abord, pour garder de petits
	// nombres (√12 × √2 plutôt que √24).
	if ((gauche || droite) && !isPerfectSquare(product)) return null;

	const coefficient = lf.c * rf.c;
	if (product === 1n) return number(coefficient.toString());

	// Avec des coefficients ET un produit de radicandes qui tombe juste, on
	// écrit le produit d'entiers plutôt que `c√(carré parfait)` : 3√2 × 5√2
	// donne « 15 × 2 », pas « 15√4 », que personne n'écrit. Sans coefficient,
	// on garde la racine (√2 × √8 = √16) : c'est tout l'intérêt de l'étape.
	if (isPerfectSquare(product) && coefficient !== 1n) {
		const racine = simplifyRadical(product, 2n).coefficient;
		return multiply(number(coefficient.toString()), number(racine.toString()), 'cross');
	}

	return coefficientTimesSqrt(coefficient, product);
}

export const multiplyRadicals: PedagogicalArithmeticRule = {
	name: 'multiply-radicals',
	rule: createRule(
		P.parse('l * r'),
		(bindings) => applyMultiplyRadicals(bindings) ?? (bindingNode(bindings, 'l') as MathNode),
		{
			name: 'multiply-radicals',
			condition: (bindings) => applyMultiplyRadicals(bindings) !== null
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 110,
	descriptions: {
		college: () => 'On multiplie les racines (la racine du produit)',
		lycee: () => 'Produit de racines',
		superieur: () => '√·√'
	},
	explanations: {
		college: () =>
			'Pour deux nombres positifs a et b, √a × √b = √(a × b). Les coefficients devant les racines se multiplient entre eux.'
	}
};

// =============================================================================
// extractBothRadicals (priority 108)
// =============================================================================

/** Le nœud `√r` à l'intérieur d'un facteur `√r` ou `c√r`. */
function sqrtNodeOf(node: MathNode | undefined): MathNode | null {
	if (!node) return null;
	if (asSqrtRadicand(node) !== null) return node;
	if (node.type !== 'multiplication') return null;
	return asSqrtRadicand(node.right) !== null ? node.right : null;
}

/**
 * `√a × √b → c√a' × d√b'` quand les DEUX racines se simplifient — en une
 * seule étape, pour ne pas faire deux lignes là où l'élève fait un geste.
 *
 * Ne mord que sur ce cas : si une seule racine se simplifie,
 * `extract-perfect-square` la traite seule ; si le produit est un carré
 * parfait, `multiply-radicals` (110) passe devant et multiplie d'abord.
 */
function applyExtractBothRadicals(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const lf = asRadicalFactor(left);
	const rf = asRadicalFactor(right);
	if (!lf || !rf) return null;
	if (!radicandSimplifies(lf.r) || !radicandSimplifies(rf.r)) return null;

	const ls = simplifyRadical(lf.r, 2n);
	const rs = simplifyRadical(rf.r, 2n);
	return multiply(
		coefficientTimesSqrt(lf.c * ls.coefficient, ls.radicand),
		coefficientTimesSqrt(rf.c * rs.coefficient, rs.radicand),
		'cross'
	);
}

export const extractBothRadicals: PedagogicalArithmeticRule = {
	name: 'extract-both-radicals',
	rule: createRule(
		P.parse('l * r'),
		(bindings) => applyExtractBothRadicals(bindings) ?? (bindingNode(bindings, 'l') as MathNode),
		{
			name: 'extract-both-radicals',
			condition: (bindings) => applyExtractBothRadicals(bindings) !== null
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 108,
	// Les deux racines changent dans la même étape, donc `before` est le
	// produit entier : on désigne les deux racines pour que le rendu ne peigne
	// pas toute la ligne en bleu.
	highlightsOf: (before) => {
		if (before.type !== 'multiplication') return [];
		const l = sqrtNodeOf(before.left);
		const r = sqrtNodeOf(before.right);
		return l && r ? [l, r] : [];
	},
	descriptions: {
		college: () => 'On extrait le facteur carré parfait sous chaque racine',
		lycee: () => 'Extraction des carrés parfaits',
		superieur: () => 'simpl. √'
	},
	explanations: {
		college: () =>
			'On décompose chaque nombre sous la racine en produit incluant un carré parfait, puis on extrait celui-ci.'
	}
};

// =============================================================================
// rationalizeDenominator (priority 105) — Track C
// =============================================================================

/**
 * `c/√n → c·√n / n` when `n` is a positive integer that is NOT a perfect
 * square. The precondition (decision C-2) avoids overlap with
 * `extractPerfectSquare`: for `1/√4`, this rule fizzles and `extract` produces
 * `√4 → 2`, leading to `1/2` after pipeline cosmetics.
 *
 * Priority 105 (above extractPerfectSquare's 100) — but the rule engine
 * traverses bottom-up, so this only matters when both rules can match the
 * SAME node. For composite shapes like `1/√8`, extract fires on the inner
 * `√8` sub-node first, yielding `1/(2√2)` (decision 2A — V1 stops here).
 */
function applyRationalizeDenominator(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	const n = asSqrtRadicand(node.denominator);
	if (n === null) return null;
	// Precondition C-2 : n must NOT be a perfect square. We use simplifyRadical:
	// when radicand === 1, n IS a perfect square (e.g. simplifyRadical(4n,2n)
	// = {coefficient:2n, radicand:1n}) — let extractPerfectSquare handle it.
	const simplified = simplifyRadical(n, 2n);
	if (simplified.radicand === 1n) return null;
	const numerator = node.numerator;
	// c·√n / n — multiply numerator by √n, replace denominator by n.
	const newNumerator = multiply(numerator, sqrt(number(n.toString())), 'cross');
	return divide(newNumerator, number(n.toString()), 'fraction');
}

export const rationalizeDenominator: PedagogicalArithmeticRule = {
	name: 'rationalize-denominator',
	rule: createRule(
		P._('s'),
		(bindings) => {
			const s = bindingNode(bindings, 's');
			if (!s) return number('0');
			return applyRationalizeDenominator(s) ?? s;
		},
		{
			name: 'rationalize-denominator',
			condition: (bindings) => {
				const s = bindingNode(bindings, 's');
				if (!s) return false;
				return applyRationalizeDenominator(s) !== null;
			}
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 105,
	descriptions: {
		college: () => 'On rend le dénominateur rationnel en multipliant par la racine',
		lycee: () => 'Rationalisation du dénominateur',
		superieur: () => 'rationalise.'
	},
	explanations: {
		college: () =>
			'On multiplie le numérateur et le dénominateur par √n pour faire disparaître la racine du dénominateur (n × √n × √n = n × n).'
	}
};

// =============================================================================
// simplifyRootOfSquare (priority 90, opt-in) — Track C
// =============================================================================

/**
 * `√(x²) → |x|` when `x` is NOT a numeric literal. Numeric squares (e.g.
 * `√(4²) = √16`) are left to `extractPerfectSquare` (priority 100 wins over
 * 90) to avoid producing the cosmetically wrong `|4|`. Decision C-1: this
 * rule is opt-in via `PedagogicalArithmeticOptions.enableSquareRootOfSquare`.
 */
function applyRootOfSquare(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sqrt') return null;
	if (node.args.length !== 1) return null;
	const arg = node.args[0];
	if (!isSuperscript(arg)) return null;
	// Exponent must be the literal 2.
	if (!isNumber(arg.superscript) || arg.superscript.value !== '2') return null;
	// Skip purely numeric bases — extractPerfectSquare handles those.
	if (isNumber(arg.base)) return null;
	return abs(arg.base);
}

export const simplifyRootOfSquare: PedagogicalArithmeticRule = {
	name: 'simplify-root-of-square',
	rule: createRule(
		P._('s'),
		(bindings) => {
			const s = bindingNode(bindings, 's');
			if (!s) return number('0');
			return applyRootOfSquare(s) ?? s;
		},
		{
			name: 'simplify-root-of-square',
			condition: (bindings) => {
				const s = bindingNode(bindings, 's');
				if (!s) return false;
				return applyRootOfSquare(s) !== null;
			}
		}
	),
	applicableLevels: ['lycee', 'superieur'],
	priority: 90,
	descriptions: {
		lycee: () => 'On simplifie √(x²) en |x| (valeur absolue)',
		superieur: () => '√(·²) = |·|'
	},
	explanations: {
		lycee: () =>
			"Par définition, √(a²) = |a| (la racine carrée d'un carré est la valeur absolue de ce qui est élevé au carré)."
	}
};

// =============================================================================
// Aggregated export
// =============================================================================

/**
 * Rules included in the default pedagogical pipeline. `simplifyRootOfSquare`
 * is intentionally **excluded** here (opt-in via the loader) — see Track C
 * decision C-1.
 */
export const RADICAL_RULES: readonly PedagogicalArithmeticRule[] = [
	extractBothRadicals,
	multiplyRadicals,
	extractPerfectSquare,
	rationalizeDenominator
];

export type { Rule };
