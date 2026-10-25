/**
 * Pedagogical Simplify — développer, et rien d'autre
 *
 * Le résultat de l'intention `developper` (chantier `normalize-usages`, phase 0
 * validée par David le 2026-10-25 ; décision § 23 de simplify-carte). Avant,
 * c'était la forme normale (`normalize`), qui fait plus que développer : même
 * dénominateur (`1/(x+1) + 1 → (x+2)/(x+1)`), fraction simplifiée en perdant
 * x ≠ −1 (`(x²−1)/(x+1) → x − 1`), identités qui perdent le domaine
 * (`e^{ln x} → x`).
 *
 * Ici, seulement les gestes de « développer » :
 *
 * - distribuer un facteur, et le signe − devant une parenthèse ;
 * - multiplier des parenthèses entre elles ;
 * - une puissance entière d'une somme : la parenthèse multipliée par elle-même ;
 * - une division par un nombre se distribue (Q2) : `(x+1)/2 → ½x + ½` ;
 * - un quotient dont le dénominateur a une lettre garde sa barre, son
 *   numérateur développé (Q1) : `(x+1)²/x → (x²+2x+1)/x`, `1/(x+1)` reste ;
 * - l'argument d'une fonction et un exposant se développent sur place
 *   (`cos(2(x+1)) → cos(2x+2)`).
 *
 * Chaque terme est calculé et la somme réduite par `tidy` (décimaux gardés,
 * Q3 : aucune identité qui perd le domaine, `e^{ln x}` reste), les produits
 * d'exponentielles regroupés (`eˣ·e^{−x} = 1`). Sans rien à distribuer, on
 * réduit seulement si des termes semblables se regroupent (`x + x → 2x`) :
 * `tidy` réécrirait sinon une expression déjà développée (`(x+1)^{-1}`).
 *
 * @module mathAST/pedagogical-simplify/expand
 */

import type { MathNode } from '../types';
import { add, divide, euler, multiply, number, parentheses, superscript } from '../factory';
import { exactValueToShow } from '../eval/exact-value';
import { computeDomain } from '../domain/compute';
import { domainsAreEqual } from '../domain/validation/compare-domains';
import { flattenProductShallow, flattenSumShallow, type Sign, type SignedTerm } from '../flatten';
import { isEulerConstant, isFunction } from '../guards';
import { findNodes, mapNode } from '../transforms';
import { tidy } from '../tidy';
import { nodesEqual } from '../pattern/match';
import { orderExpanded, sumOf } from './expand-order';

// =============================================================================
// Constantes
// =============================================================================

/** Au-delà, la puissance d'une somme n'est pas développée (`(x+1)^{300}` : 0,5 s). */
const MAX_EXPONENT = 200;

/** Au-delà, on renonce : la somme développée serait illisible. */
const MAX_TERMS = 2000;

// =============================================================================
// Fonctions — lecture
// =============================================================================

/** Le budget est dépassé : `expand` rend alors l'expression telle quelle. */
class TooLarge extends Error {}

function flip(sign: Sign): Sign {
	return sign === '+' ? '-' : '+';
}

/** La règle des signes. */
function times(left: Sign, right: Sign): Sign {
	return left === right ? '+' : '-';
}

/** Les parenthèses de GROUPEMENT retirées (`[0;1]` est un intervalle). */
function unwrapGrouping(node: MathNode): MathNode {
	if (node.type !== 'delimiter') return node;
	if (node.semantic !== undefined && node.semantic !== 'grouping') return node;
	return unwrapGrouping(node.content);
}

/** Un exposant entier naturel écrit (`2`, `3`), sinon `null`. */
function integerExponent(node: MathNode): number | null {
	return node.type === 'number' && /^\d+$/.test(node.value) ? Number(node.value) : null;
}

/** Sans lettre : un nombre, une fraction de nombres, `√2`, `π`. */
function isConstant(node: MathNode): boolean {
	return findNodes(node, (n) => n.type === 'variable' || n.type === 'greek').length === 0;
}

/** Un nombre qui vaut 0 (`0`, `1 − 1`). */
function isZeroValue(node: MathNode): boolean {
	const value = tidy(node);
	return value.type === 'number' && Number(value.value) === 0;
}

/** `−u` → `u`, sinon le nœud. */
function magnitudeOrSelf(node: MathNode): MathNode {
	return node.type === 'opposite' ? unwrapGrouping(node.operand) : node;
}

/** Un quotient dont le dénominateur a une lettre : sa barre reste (Q1). */
function isLiteralQuotient(node: MathNode): node is Extract<MathNode, { type: 'division' }> {
	return node.type === 'division' && !isConstant(node.denominator);
}

/** L'argument d'une racine carrée `√u`, sinon `null`. */
function squareRootArgument(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sqrt' || node.base !== undefined) return null;
	return node.args.length === 1 ? node.args[0] : null;
}

/** `(√u)ⁿ`, n ≥ 2 : son `u` et son `n`, sinon `null`. */
function rootPower(node: MathNode): { readonly u: MathNode; readonly n: number } | null {
	if (node.type !== 'superscript') return null;
	const n = integerExponent(node.superscript);
	if (n === null || n < 2) return null;
	const u = squareRootArgument(unwrapGrouping(node.base));
	return u === null ? null : { u, n };
}

/** `u^k` écrit, `u` entre parenthèses (`(x+1)²`, `x`). */
function powerOf(u: MathNode, k: number): MathNode {
	return k === 1 ? parentheses(u) : superscript(parentheses(u), number(String(k)));
}

/** `u^{−n}` d'une base littérale → `1/uⁿ` : un quotient, sa barre reste (Q1). */
function asQuotient(factor: MathNode): MathNode {
	if (factor.type !== 'superscript' || isConstant(factor.base)) return factor;
	const exponent = factor.superscript;
	if (exponent.type !== 'opposite') return factor;
	const n = integerExponent(unwrapGrouping(exponent.operand));
	if (n === null || n < 1) return factor;
	const power = n === 1 ? factor.base : superscript(factor.base, number(String(n)));
	return divide(number('1'), power, 'fraction');
}

// =============================================================================
// Fonctions — écriture
// =============================================================================

/**
 * `(√u)ⁿ` levé quand la condition u ≥ 0 reste écrite (Q3) : une puissance
 * impaire garde un `√u` (`(√x)³ → x√x`) ; une puissance paire seulement si un
 * `√u` reste ailleurs dans le résultat (`√x(√x + 1) → x + √x`). Sinon `(√u)ⁿ`
 * reste : `(√x)²(x + 1)` ne devient pas `x² + x`, qui perdrait x ≥ 0.
 */
function withRootPowersResolved(node: MathNode): MathNode {
	const powers = findNodes(node, (n) => rootPower(n) !== null);
	if (powers.length === 0) return node;
	const roots = findNodes(node, (n) => squareRootArgument(n) !== null);
	const count = (nodes: readonly MathNode[], read: (n: MathNode) => MathNode | null, u: MathNode) =>
		nodes.filter((n) => {
			const argument = read(n);
			return argument !== null && nodesEqual(argument, u);
		}).length;
	const powerArgument = (n: MathNode) => rootPower(n)?.u ?? null;
	const lifts = ({ u, n }: { readonly u: MathNode; readonly n: number }) =>
		n % 2 === 1 || count(roots, squareRootArgument, u) > count(powers, powerArgument, u);
	if (!powers.some((n) => lifts(rootPower(n) ?? { u: n, n: 0 }))) return node;
	return mapNode(node, (n) => {
		const power = rootPower(n);
		if (power === null || !lifts(power)) return n;
		const even = powerOf(power.u, Math.floor(power.n / 2));
		if (power.n % 2 === 0) return even;
		const root = n.type === 'superscript' ? unwrapGrouping(n.base) : n;
		return multiply(even, root, 'implicit');
	});
}

/**
 * Les valeurs d'un terme calculées : `√2·√3 → √6`, `i² → −1`, `π·π → π²`.
 * Sans lettre, `normalize` calcule (décision § 23 de simplify-carte), écrit
 * par `exactValueToShow` ; les nombres seuls restent à `tidy`.
 */
function withValuesComputed(term: MathNode): MathNode {
	const factors = flattenProductShallow(term).map(({ factor }) => factor);
	const isValue = (f: MathNode) => isConstant(f) && f.type !== 'number';
	const values = factors.filter(isValue);
	const others = factors.filter((f) => !isValue(f));
	if (values.length < 2 && !values.some((f) => f.type === 'superscript')) return term;
	const product = values.reduce((left, right) => multiply(left, right, 'cross'));
	const value = exactValueToShow(product, { source: product });
	return [value, ...others].reduce((left, right) => multiply(left, right, 'cross'));
}

/** L'exposant d'une puissance de e (`e` seul : 1), sinon `null`. */
function eulerExponent(factor: MathNode): MathNode | null {
	if (isEulerConstant(factor)) return number('1');
	if (factor.type === 'superscript' && isEulerConstant(unwrapGrouping(factor.base))) {
		return factor.superscript;
	}
	return null;
}

/** `(eᵃ)ⁿ → e^{na}`, n entier naturel ; sinon le facteur tel quel. */
function withPowerOfExponential(factor: MathNode): MathNode {
	if (factor.type !== 'superscript' || integerExponent(factor.superscript) === null) return factor;
	const exponent = eulerExponent(unwrapGrouping(factor.base));
	if (exponent === null) return factor;
	return superscript(euler(), expand(multiply(factor.superscript, exponent, 'implicit')));
}

/**
 * Les puissances de e d'un produit regroupées : `2eˣ·e^{−x} → 2`. `tidy` ne
 * regroupe que des exposants identiques (`eˣ·eˣ → e^{2x}`).
 */
function withExponentialsMerged(term: MathNode): MathNode {
	const factors = flattenProductShallow(term).map(({ factor }) => withPowerOfExponential(factor));
	const exponents = factors.map(eulerExponent);
	const powers = exponents.filter((e): e is MathNode => e !== null);
	if (powers.length < 2) {
		const changed = factors.some((f, i) => f !== flattenProductShallow(term)[i]?.factor);
		return changed ? factors.reduce((left, right) => multiply(left, right, 'cross')) : term;
	}
	const exponent = expand(powers.reduce((left, right) => add(left, right)));
	const others = factors.filter((_, index) => exponents[index] === null);
	const isZero = exponent.type === 'number' && Number(exponent.value) === 0;
	const isOne = exponent.type === 'number' && Number(exponent.value) === 1;
	const power = isZero ? null : isOne ? euler() : superscript(euler(), exponent);
	const kept = power === null ? others : [...others, power];
	if (kept.length === 0) return number('1');
	return kept.reduce((left, right) => multiply(left, right, 'cross'));
}

/**
 * Le coefficient devant (`\dfrac{1}{4}x²`, pas `\dfrac{x²}{4}`) : l'écriture du
 * manuel pour une forme développée, que `tidy` n'emploie pas.
 */
function coefficientFirst(term: MathNode): MathNode {
	if (term.type === 'opposite') {
		const inner = coefficientFirst(term.operand);
		return inner === term.operand ? term : { ...term, operand: inner };
	}
	if (term.type !== 'division' || term.denominator.type !== 'number') return term;
	if (isConstant(term.numerator)) return term;
	const factors = flattenProductShallow(term.numerator).map(({ factor }) => factor);
	const numbers = factors.filter((f) => f.type === 'number');
	const rest = factors.filter((f) => f.type !== 'number');
	if (rest.length === 0 || !numbers.every((f) => f.type === 'number' && /^\d+$/.test(f.value))) {
		return term;
	}
	const numerator = numbers.reduce(
		(p, f) => (f.type === 'number' ? p * BigInt(f.value) : p),
		BigInt(1)
	);
	const coefficient = divide(number(String(numerator)), term.denominator, 'fraction');
	return [coefficient, ...rest].reduce((left, right) => multiply(left, right, 'implicit'));
}

/**
 * Une somme écrite au propre : `tidy` dans l'ordre du développement, les
 * nombres après les autres termes (`2eˣ + 2`) mais avant les quotients à
 * dénominateur littéral (`x² − x − 2 + 1/(x+1)`), chaque coefficient devant ; des monômes, dans
 * l'ordre du manuel. `domain` : celui de l'entrée, acquis (S3) — `x·1/x → 1`,
 * `−√x + √x → 0`.
 */
function written(terms: readonly SignedTerm[], domain: readonly MathNode[]): MathNode {
	const tidied = flattenSumShallow(tidy(sumOf(terms), { order: 'kept', domain }));
	const quotient = ({ term }: SignedTerm) => isLiteralQuotient(magnitudeOrSelf(term));
	const constant = ({ term }: SignedTerm) => isConstant(term);
	const ordered = [
		...tidied.filter((t) => !constant(t) && !quotient(t)),
		...tidied.filter(constant),
		...tidied.filter((t) => !constant(t) && quotient(t))
	];
	// L'ordre du manuel quand ce sont des monômes (`x² + 2xy + y²`)
	return orderExpanded(
		sumOf(ordered.map(({ sign, term }) => ({ sign, term: coefficientFirst(term) })))
	);
}

// =============================================================================
// Fonctions — développer
// =============================================================================

/** Un développement en cours : ce qu'il a distribué. */
class Expansion {
	developed = false;

	/** @param domain - L'entrée : son domaine est acquis, `tidy` peut y simplifier (S3) */
	constructor(private readonly domain: readonly MathNode[]) {}

	/** Les termes réduits, relus comme une somme. */
	reduced(terms: readonly SignedTerm[]): readonly SignedTerm[] {
		if (terms.length === 0) return [{ sign: '+', term: number('0') }];
		if (terms.length > MAX_TERMS) throw new TooLarge();
		// Chaque terme calculé dans l'ordre canonique des facteurs (`2 × x × 1 → 2x`),
		// puis la somme réduite dans l'ordre du développement
		const { domain } = this;
		const merged = terms.map(({ sign, term }) => ({
			sign,
			term: tidy(withValuesComputed(tidy(withExponentialsMerged(term), { domain })), { domain })
		}));
		return flattenSumShallow(tidy(sumOf(merged), { order: 'kept', domain }));
	}

	/** (a + b)(c + d) → ac + ad + bc + bd, réduit. */
	product(left: readonly SignedTerm[], right: readonly SignedTerm[]): readonly SignedTerm[] {
		if (left.length * right.length > MAX_TERMS) throw new TooLarge();
		if (left.length > 1 || right.length > 1) this.developed = true;
		const terms = left.flatMap((l) =>
			right.map((r) => ({
				sign: times(l.sign, r.sign),
				term: multiply(l.term, r.term, 'cross')
			}))
		);
		return this.reduced(terms);
	}

	/** Un produit : un quotient à dénominateur littéral prend tout le produit au numérateur. */
	multiplication(node: MathNode): readonly SignedTerm[] {
		const factors = flattenProductShallow(node).map(({ factor }) =>
			asQuotient(unwrapGrouping(factor))
		);
		const quotients = factors.filter(isLiteralQuotient);
		if (quotients.length > 0) {
			const numerators = factors.map((f) => (isLiteralQuotient(f) ? f.numerator : f));
			const denominators = quotients.map((q) => q.denominator);
			return this.terms(
				divide(
					numerators.reduce((l, r) => multiply(l, r, 'cross')),
					denominators.reduce((l, r) => multiply(l, r, 'implicit')),
					'fraction'
				)
			);
		}
		return factors.map((f) => this.terms(f)).reduce((acc, f) => this.product(acc, f));
	}

	/** Les termes signés, développés, d'une expression. */
	terms(node: MathNode): readonly SignedTerm[] {
		const inner = unwrapGrouping(node);
		if (inner !== node) {
			// Enlever une parenthèse qui tient une somme, c'est déjà développer
			const terms = this.terms(inner);
			if (terms.length > 1) this.developed = true;
			return terms;
		}

		switch (node.type) {
			case 'addition':
			case 'subtraction':
				return flattenSumShallow(node).flatMap(({ sign, term }) =>
					this.terms(term).map((t) => ({ sign: times(sign, t.sign), term: t.term }))
				);
			case 'opposite':
				return this.terms(node.operand).map((t) => ({ sign: flip(t.sign), term: t.term }));
			case 'positive':
				return this.terms(node.operand);
			case 'multiplication':
				return this.multiplication(node);
			case 'superscript': {
				const exponent = integerExponent(node.superscript);
				// La base lue à part : sa parenthèse ne compte que si la puissance se développe
				const base = new Expansion(this.domain).terms(node.base);
				if (exponent !== null && exponent >= 2 && base.length >= 2) {
					if (exponent > MAX_EXPONENT) throw new TooLarge();
					this.developed = true;
					let power = base;
					for (let k = 1; k < exponent; k++) power = this.product(power, base);
					return power;
				}
				// Une puissance d'un seul terme reste à `tidy` (`(2x)² → 4x²`), sa base
				// développée sur place (`cos(2(x+1))²`) ; un exposant qui n'est pas un
				// entier aussi
				const developedBase = base.length === 1 ? this.inside(node.base) : null;
				const developed = this.inside(node.superscript);
				if (developedBase === null && developed === null) return [{ sign: '+', term: node }];
				return [
					{
						sign: '+',
						term: {
							...node,
							base: developedBase === null ? node.base : parentheses(developedBase),
							superscript: developed ?? node.superscript
						}
					}
				];
			}
			case 'division': {
				// Diviser par un nombre se distribue (Q2) ; par zéro, rien
				if (isConstant(node.denominator)) {
					if (isZeroValue(node.denominator)) return [{ sign: '+', term: node }];
					const numerator = this.terms(node.numerator);
					if (numerator.length > 1) this.developed = true;
					return numerator.map(({ sign, term }) => ({
						sign,
						term: divide(term, node.denominator, node.displayStyle)
					}));
				}
				// Sinon la barre reste, le numérateur développé (Q1)
				const numerator = this.inside(node.numerator);
				return [
					{
						sign: '+',
						term: numerator === null ? node : divide(numerator, node.denominator, 'fraction')
					}
				];
			}
			case 'function': {
				const args = node.args.map((arg) => this.inside(arg) ?? arg);
				const changed = args.some((arg, index) => arg !== node.args[index]);
				return [{ sign: '+', term: changed ? { ...node, args } : node }];
			}
			default:
				return [{ sign: '+', term: node }];
		}
	}

	/** Une sous-expression développée à part, ou `null` s'il n'y a rien à y distribuer. */
	inside(node: MathNode): MathNode | null {
		const nested = new Expansion(this.domain);
		const terms = nested.reduced(nested.terms(node));
		if (!nested.developed) return null;
		this.developed = true;
		return written(terms, this.domain);
	}
}

/** Les `(√u)ⁿ` levés, puis ce qu'ils libèrent développé (`4(√(x+1))² → 4x + 4`). */
function resolved(node: MathNode, domain: readonly MathNode[]): MathNode {
	const next = withRootPowersResolved(node);
	return next === node ? node : expandedForm(next, domain);
}

/**
 * La forme développée réduite, toujours réécrite : un terme d'une ligne à ×
 * calculé (`2 × x × 1 → 2x`), là où `expand` rendrait l'entrée inchangée.
 * Les étapes (`expand-steps.ts`) calculent ainsi avec le même moteur que la
 * réponse.
 *
 * @param node - Une expression (pas une relation)
 * @param domain - Les expressions dont le domaine est acquis : par défaut aucune
 *   (`x·1/x` reste `x/x`, S3) ; la réponse de `expand` en décide
 * @returns La forme écrite ; l'expression telle quelle si le budget est dépassé
 */
export function expandedForm(node: MathNode, domain: readonly MathNode[] = []): MathNode {
	try {
		const expansion = new Expansion(domain);
		return resolved(written(expansion.reduced(expansion.terms(node)), domain), domain);
	} catch (error) {
		if (error instanceof TooLarge) return node;
		throw error;
	}
}

/** Les lettres d'une expression (`x`, `y`, `α`). */
function lettersOf(node: MathNode): readonly string[] {
	const names = findNodes(node, (n) => n.type === 'variable' || n.type === 'greek').map((n) =>
		n.type === 'variable' ? n.name : n.type === 'greek' ? n.letter : ''
	);
	return [...new Set(names)];
}

/**
 * Le même domaine, lettre par lettre (`computeDomain`). Un domaine que le
 * moteur ne sait pas calculer : pas le même (prudent).
 */
function sameDomain(left: MathNode, right: MathNode): boolean {
	try {
		return lettersOf(right).every((letter) => {
			const a = computeDomain(left, letter);
			const b = computeDomain(right, letter);
			if ((a.unresolved?.length ?? 0) > 0 || (b.unresolved?.length ?? 0) > 0) return false;
			return domainsAreEqual(a.domain, b.domain);
		});
	} catch {
		return false;
	}
}

/** Un développement, `domain` acquis ou non ; l'entrée s'il n'y a rien à développer. */
function expandWithin(node: MathNode, domain: readonly MathNode[]): MathNode {
	const expansion = new Expansion(domain);
	const terms = expansion.reduced(expansion.terms(node));
	if (expansion.developed) return resolved(written(terms, domain), domain);
	// Rien à distribuer dans une puissance non entière, une fonction, un
	// quotient à dénominateur littéral : rien à développer (`tidy` réécrirait
	// `(x+1)^{-1}` en `1/(x+1)`). Sinon, on calcule (`(2x)² → 4x²`, `x + x → 2x`)
	const top = unwrapGrouping(node);
	const naturalPower = top.type === 'superscript' && integerExponent(top.superscript) !== null;
	const atomic = top.type === 'superscript' ? !naturalPower : top.type === 'function';
	if (atomic || isLiteralQuotient(top)) return node;
	// Une somme dont aucun terme ne se regroupe : seul l'ordre changerait
	const isSum = top.type === 'addition' || top.type === 'subtraction';
	if (isSum && terms.length === flattenSumShallow(top).length) return node;
	const result = resolved(written(terms, domain), domain);
	// Des racines regroupées en puissance (`√x√x → (√x)²`) : rien n'y est
	// distribué, rien à développer (David, 2026-10-26)
	const rootPowers = (n: MathNode) => findNodes(n, (m) => rootPower(m) !== null).length;
	if (rootPowers(result) > rootPowers(node)) return node;
	return nodesEqual(result, node) ? node : result;
}

/**
 * Développer et réduire, sans rien faire d'autre.
 *
 * Le résultat garde le domaine de l'entrée (David, 2026-10-25, comme le § 64
 * de simplify-carte pour `tidy`) : réduit sur le domaine de l'entrée quand la
 * condition reste écrite (`(x + 1/x)² → x² + 2 + 1/x²`), sinon l'écriture
 * gardée (`x(1/x − 1) → −x + x/x`, `(√x+1)(√x−1) → x − √x + √x − 1`).
 *
 * @param node - Une expression (pas une relation)
 * @returns La forme développée réduite ; l'expression telle quelle s'il n'y a
 *   rien à développer, ou si le budget est dépassé
 */
export function expand(node: MathNode): MathNode {
	try {
		// Une division par zéro : rien à développer (l'ancien `normalize` levait)
		const byZero = (n: MathNode) =>
			n.type === 'division' && isConstant(n.denominator) && isZeroValue(n.denominator);
		if (findNodes(node, byZero).length > 0) return node;
		const strict = expandWithin(node, []);
		const acquired = expandWithin(node, [node]);
		if (nodesEqual(acquired, strict)) return strict;
		return sameDomain(acquired, node) ? acquired : strict;
	} catch (error) {
		if (error instanceof TooLarge) return node;
		throw error;
	}
}
