/**
 * Pedagogical Simplify — les étapes de « développer », rédigées comme au tableau
 *
 * Section E de la phase 0 `docs/wip/atelier-developper-phase0.md`, validée par
 * David le 2026-10-14. Décisions du 2026-09-21 : « développer contient déjà
 * réduire », et la trace de `normalize` n'est PAS pédagogique — elle sort du
 * chemin de l'élève. Mesuré sur cette trace le 2026-10-14 : produits collés
 * (`2 x 1` s'affiche « 2x1 »), la même ligne jusqu'à 13 fois, distribution
 * cachée sous « On regroupe les termes semblables ».
 *
 * ⚠️ **La réponse ne se calcule pas ici.** `writeExpandSteps` la REÇOIT — le
 * résultat de l'intention `developper`, que l'intégration et la stratégie 6 de
 * `factoriser` emploient tel quel — et la rédige : la dernière image EST la
 * réponse. Les images intermédiaires s'écrivent ici, chaque terme calculé par
 * `normalize` (le moteur du résultat), et chacune est vérifiée égale à l'entrée
 * (`areEquivalent`) : une étape fausse ne s'affiche jamais. La trace de
 * `generatePedagogicalSimplifySteps` n'est pas touchée (deux instantanés la
 * figent : `pedagogical-simplify-demo`, `questions/generated-steps-demo`).
 *
 * Une phase par ligne, appliquée à TOUS les termes où elle s'applique, dans cet
 * ordre :
 *
 * 1. une puissance 4 ou plus d'une somme : une seule ligne, « On développe la
 *    puissance », jusqu'à la réponse ;
 * 2. un cube s'écrit carré × parenthèse (`(x+1)³ = (x+1)²(x+1)`) ;
 * 3. les identités remarquables, a et b nommés ; une seule : la ligne à ×
 *    (`x² + 2 × x × 1 + 1²`) puis « On calcule chaque terme » ; plusieurs :
 *    les termes calculés directement ;
 * 4. une parenthèse d'un produit qu'on peut réduire est réduite ;
 * 5. la double distribution : la ligne à ×, puis « On calcule chaque produit » ;
 * 6. distribuer un facteur, et le signe − devant une parenthèse ;
 * 7. « On réduit » jusqu'à la réponse.
 *
 * Deux règles pour toutes : jamais deux images identiques de suite, un × entre
 * deux facteurs dès qu'un nombre suit une lettre ou un autre nombre. Version
 * résumée : chaque ligne à × se fond dans le calcul qui la suit (le titre de
 * l'une, l'image de l'autre) ; le renderer y retire les « pourquoi ».
 *
 * Ce qu'on ne sait pas rédiger rend `null`, et la réponse reste : une somme sous
 * une fonction, une racine, dans un exposant ou une fraction ; une puissance non
 * entière d'une somme ; une ligne à × de plus de `MAX_PRODUCTS` produits.
 *
 * @module mathAST/pedagogical-simplify/expand-steps
 */

import type { MathNode } from '../types';
import type { Verbosity } from '../common/verbosity';
import { multiply, number, opposite, parentheses, superscript } from '../factory';
import { flattenProductShallow, flattenSumShallow, type Sign, type SignedTerm } from '../flatten';
import { findNodes } from '../transforms';
import { denormalize, normalize } from '../normal';
import { nodesEqual } from '../pattern/match';
import { toLatex } from '../latex-generator';
import { areEquivalent } from '../equivalence';
import { magnitudeOfNegative, orderExpanded, sumOf } from './expand-order';
import type { PedagogicalSimplifyCategory, PedagogicalSimplifyStep } from './types';

// =============================================================================
// Types
// =============================================================================

/** Les options de la rédaction. */
export interface ExpandStepsOptions {
	/**
	 * La mise en forme de chaque image, la dernière comprise (l'atelier y écrit
	 * ses décimaux) : la dernière image s'écrit alors exactement comme la réponse.
	 */
	readonly format?: (node: MathNode) => MathNode;
}

/** Les deux rédactions du même développement. */
export interface ExpandSteps {
	/** La rédaction détaillée : avec les lignes à ×. */
	readonly steps: readonly PedagogicalSimplifyStep[];
	/** La rédaction résumée : chaque ligne à × fondue dans le calcul qui la suit. */
	readonly summary: readonly PedagogicalSimplifyStep[];
}

/** Les règles des étapes (titres et « pourquoi » : `descriptions-fr.ts`). */
type ExpandRule =
	| 'expand-whole-power'
	| 'expand-split-power'
	| 'expand-identity'
	| 'expand-compute'
	| 'expand-reduce-inside'
	| 'expand-distribute'
	| 'expand-distribute-factor'
	| 'expand-remove-parentheses'
	| 'expand-unwrap'
	| 'expand-reduce'
	| 'expand-order';

/** Une ligne de la rédaction, avant mise en forme et numérotation. */
interface Line {
	readonly rule: ExpandRule;
	readonly title: string;
	readonly image: MathNode;
	/** Une ligne à × : la version résumée la fond dans le calcul qui la suit. */
	readonly products?: true;
}

/** Une somme entre parenthèses, élevée à une puissance entière (1 si aucune). */
interface SumFactor {
	readonly terms: readonly SignedTerm[];
	readonly exponent: number;
}

/** Un terme de la somme principale, lu comme un produit : son signe, ses facteurs. */
interface Chunk {
	readonly sign: Sign;
	/** Les facteurs sans somme : nombres, lettres, `eˣ`… */
	readonly plain: readonly MathNode[];
	/** Les sommes entre parenthèses, dans l'ordre écrit. */
	readonly sums: readonly SumFactor[];
}

type Identity = 'sum-square' | 'diff-square' | 'conjugate';

/** Ce qu'une phase a fait d'un terme : de quoi écrire le titre. */
type Action =
	| { readonly kind: 'split'; readonly before: MathNode; readonly after: MathNode }
	| {
			readonly kind: 'identity';
			readonly identity: Identity;
			readonly a: MathNode;
			readonly b: MathNode;
	  }
	| { readonly kind: 'reduce-inside' }
	| { readonly kind: 'double' }
	| { readonly kind: 'factor'; readonly factor: MathNode }
	| { readonly kind: 'sign' }
	| { readonly kind: 'unwrap' };

/** Un terme après une phase. */
interface Rewrite {
	/** Les termes qui le remplacent, chaque produit calculé. */
	readonly computed: readonly SignedTerm[];
	/** Les mêmes, produits écrits avec × : la ligne de plus de la version détaillée. */
	readonly written?: readonly SignedTerm[];
	readonly action: Action;
}

/** Une phase : ce qu'elle fait d'un terme, `null` si elle ne s'y applique pas. */
type Phase = (chunk: Chunk) => Rewrite | null;

// =============================================================================
// Constantes
// =============================================================================

/** Au-delà, une ligne à × ne se lit plus : on ne rédige pas (la réponse reste). */
const MAX_PRODUCTS = 16;

/** Garde de la boucle des phases (`(x+1)(x+2)(x+3)` en prend quatre). */
const MAX_ROUNDS = 12;

const CATEGORY: Readonly<Record<ExpandRule, PedagogicalSimplifyCategory>> = {
	'expand-whole-power': 'puissances',
	'expand-split-power': 'puissances',
	'expand-identity': 'distribution',
	'expand-compute': 'combinaison-termes-semblables',
	'expand-reduce-inside': 'combinaison-termes-semblables',
	'expand-distribute': 'distribution',
	'expand-distribute-factor': 'distribution',
	'expand-remove-parentheses': 'distribution',
	'expand-unwrap': 'distribution',
	'expand-reduce': 'combinaison-termes-semblables',
	'expand-order': 'combinaison-termes-semblables'
};

const IDENTITY_FORMULA: Readonly<Record<Identity, string>> = {
	'sum-square': '(a + b)² = a² + 2ab + b²',
	'diff-square': '(a − b)² = a² − 2ab + b²',
	conjugate: '(a + b)(a − b) = a² − b²'
};

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

const DOUBLE_TITLE =
	'On distribue : chaque terme du premier facteur multiplie chaque terme du second';

// =============================================================================
// Fonctions — lecture
// =============================================================================

/** La rédaction s'arrête : la réponse reste, sans étapes. */
class Unwritable extends Error {}

function fail(): never {
	throw new Unwritable();
}

function isSum(node: MathNode): boolean {
	return node.type === 'addition' || node.type === 'subtraction';
}

function containsSum(node: MathNode): boolean {
	return findNodes(node, isSum).length > 0;
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

function flip(sign: Sign): Sign {
	return sign === '+' ? '-' : '+';
}

/** La règle des signes. */
function times(left: Sign, right: Sign): Sign {
	return left === right ? '+' : '-';
}

/** Un terme écrit `-2x` dans une somme : son signe à part (`−`, `2x`). */
function withOwnSign({ sign, term }: SignedTerm): SignedTerm {
	const magnitude = magnitudeOfNegative(term);
	return magnitude === null ? { sign, term } : { sign: flip(sign), term: magnitude };
}

/** Une somme entre parenthèses, si aucun de ses termes ne contient lui-même une somme. */
function readSum(node: MathNode, exponent: number): SumFactor {
	const terms = flattenSumShallow(node).map(withOwnSign);
	if (terms.some(({ term }) => containsSum(term))) fail();
	return { terms, exponent };
}

/**
 * Un terme de la somme principale, lu comme un produit. Une somme ailleurs que
 * dans une parenthèse du produit (sous une racine, un cosinus, dans un exposant
 * ou une fraction) : on ne sait pas rédiger.
 */
function readChunk({ sign, term }: SignedTerm): Chunk {
	let negative = sign === '-';
	const plain: MathNode[] = [];
	const sums: SumFactor[] = [];
	const visit = (node: MathNode): void => {
		if (node.type === 'opposite') {
			negative = !negative;
			visit(node.operand);
			return;
		}
		if (node.type === 'positive') {
			visit(node.operand);
			return;
		}
		if (node.type === 'multiplication') {
			for (const { factor } of flattenProductShallow(node)) visit(factor);
			return;
		}
		const inner = unwrapGrouping(node);
		if (inner !== node) {
			if (isSum(inner)) sums.push(readSum(inner, 1));
			else visit(inner);
			return;
		}
		if (node.type === 'superscript' && isSum(unwrapGrouping(node.base))) {
			const exponent = integerExponent(node.superscript);
			if (exponent === null || exponent < 1) fail();
			sums.push(readSum(unwrapGrouping(node.base), exponent));
			return;
		}
		if (containsSum(node)) fail();
		plain.push(node);
	};
	visit(term);
	return { sign: negative ? '-' : '+', plain, sums };
}

// =============================================================================
// Fonctions — écriture
// =============================================================================

/** Un produit de facteurs : implicite, sauf devant un nombre (`2 × 3`, jamais `2 3`). */
function productOf(factors: readonly MathNode[]): MathNode {
	return factors.reduce((left, right) =>
		multiply(left, right, right.type === 'number' ? 'cross' : 'implicit')
	);
}

function sumFactorNode({ terms, exponent }: SumFactor): MathNode {
	const group = parentheses(sumOf(terms));
	return exponent === 1 ? group : superscript(group, number(String(exponent)));
}

/**
 * Un terme rebâti. Seule et précédée d'un +, une somme se fond dans la somme
 * principale ; précédée d'un −, elle garde sa parenthèse — l'enlever est une
 * étape (« On enlève la parenthèse précédée d'un − »).
 */
function chunkTerms(chunk: Chunk): readonly SignedTerm[] {
	const [only] = chunk.sums;
	const alone = chunk.plain.length === 0 && chunk.sums.length === 1 && only.exponent === 1;
	if (alone && chunk.sign === '+') return only.terms;
	return [
		{ sign: chunk.sign, term: productOf([...chunk.plain, ...chunk.sums.map(sumFactorNode)]) }
	];
}

/** Un facteur d'une ligne à × : un négatif entre parenthèses (`2 × (−x) × 1`). */
function asFactor(node: MathNode): MathNode {
	return magnitudeOfNegative(node) === null ? node : parentheses(node);
}

/** a², b² : entre parenthèses dès que ce n'est pas une lettre ou un nombre (`(3x)²`). */
function squared(node: MathNode): MathNode {
	const bare = ['variable', 'greek', 'constant', 'number', 'subscript'].includes(node.type);
	return superscript(bare ? node : parentheses(node), number('2'));
}

/** 2ab, chaque facteur derrière un × (`2 × 3x × 1`). */
function twiceProduct(a: MathNode, b: MathNode): MathNode {
	return multiply(multiply(number('2'), asFactor(a), 'cross'), asFactor(b), 'cross');
}

/** Un produit écrit avec × (`2 × x × 1`), calculé (`2x`), son signe à part. */
function computeTerm({ sign, term }: SignedTerm): SignedTerm {
	const value = orderExpanded(denormalize(normalize(term)));
	if (containsSum(value)) fail();
	return withOwnSign({ sign, term: value });
}

/** La même somme, `count` facteurs remplacés à `index` par une nouvelle somme. */
function replaceSums(
	chunk: Chunk,
	index: number,
	count: number,
	written: readonly SignedTerm[],
	action: Action
): Rewrite {
	const rebuild = (terms: readonly SignedTerm[]) =>
		chunkTerms({
			...chunk,
			sums: [
				...chunk.sums.slice(0, index),
				{ terms, exponent: 1 },
				...chunk.sums.slice(index + count)
			]
		});
	return {
		written: rebuild(written),
		computed: rebuild(written.map(computeTerm)),
		action
	};
}

// =============================================================================
// Fonctions — les phases
// =============================================================================

/** Un cube devient carré × parenthèse ; le carré (ou le cube) d'un trinôme, un produit. */
const splitPower: Phase = (chunk) => {
	const index = chunk.sums.findIndex(
		(sum) => sum.exponent === 3 || (sum.exponent === 2 && sum.terms.length > 2)
	);
	if (index === -1) return null;
	const power = chunk.sums[index];
	const base: SumFactor = { terms: power.terms, exponent: 1 };
	const parts: SumFactor[] =
		power.terms.length === 2
			? [{ terms: power.terms, exponent: 2 }, base]
			: Array.from({ length: power.exponent }, () => base);
	const sums = [...chunk.sums.slice(0, index), ...parts, ...chunk.sums.slice(index + 1)];
	return {
		computed: chunkTerms({ ...chunk, sums }),
		action: {
			kind: 'split',
			before: sumFactorNode(power),
			after: productOf(parts.map(sumFactorNode))
		}
	};
};

/** Deux binômes conjugués : (a + b)(a − b), dans un sens ou dans l'autre. */
function areConjugates(left: SumFactor, right: SumFactor): boolean {
	if (left.exponent !== 1 || right.exponent !== 1) return false;
	if (left.terms.length !== 2 || right.terms.length !== 2) return false;
	const [a, b] = left.terms;
	const [c, d] = right.terms;
	return (
		a.sign === c.sign &&
		nodesEqual(a.term, c.term) &&
		nodesEqual(b.term, d.term) &&
		b.sign !== d.sign
	);
}

/** Le premier terme d'un binôme, son signe compris : a = −x dans (−x + 1)². */
function firstTerm({ sign, term }: SignedTerm): MathNode {
	return sign === '-' ? opposite(term) : term;
}

/** Une identité remarquable par terme au plus : un carré de binôme, sinon deux conjugués. */
const identity: Phase = (chunk) => {
	const square = chunk.sums.findIndex((sum) => sum.exponent === 2 && sum.terms.length === 2);
	if (square !== -1) {
		const [first, second] = chunk.sums[square].terms;
		const a = firstTerm(first);
		const b = second.term;
		const written: SignedTerm[] = [
			{ sign: '+', term: squared(a) },
			{ sign: second.sign, term: twiceProduct(a, b) },
			{ sign: '+', term: squared(b) }
		];
		const kind: Identity = second.sign === '+' ? 'sum-square' : 'diff-square';
		return replaceSums(chunk, square, 1, written, { kind: 'identity', identity: kind, a, b });
	}
	const pair = chunk.sums.findIndex(
		(sum, index) => index + 1 < chunk.sums.length && areConjugates(sum, chunk.sums[index + 1])
	);
	if (pair === -1) return null;
	const [first, second] = chunk.sums[pair].terms;
	const a = firstTerm(first);
	const b = second.term;
	const written: SignedTerm[] = [
		{ sign: '+', term: squared(a) },
		{ sign: '-', term: squared(b) }
	];
	return replaceSums(chunk, pair, 2, written, { kind: 'identity', identity: 'conjugate', a, b });
};

/**
 * Dans un produit, une parenthèse qu'on peut réduire l'est avant d'être
 * distribuée : `(x² + 2x + x + 2)(x + 3)` → `(x² + 3x + 2)(x + 3)`. Réduire,
 * c'est regrouper : une parenthèse qui garde autant de termes ne bouge pas (on
 * ne la réordonne pas pour rien).
 */
const reduceInside: Phase = (chunk) => {
	if (chunk.plain.length + chunk.sums.length < 2) return null;
	let sign = chunk.sign;
	const plain = [...chunk.plain];
	const sums: SumFactor[] = [];
	let changed = false;
	for (const sum of chunk.sums) {
		const reduced = orderExpanded(denormalize(normalize(sumOf(sum.terms))));
		if (isSum(reduced)) {
			const terms = flattenSumShallow(reduced).map(withOwnSign);
			if (terms.length !== sum.terms.length) changed = true;
			sums.push(terms.length === sum.terms.length ? sum : { terms, exponent: sum.exponent });
			continue;
		}
		// Un seul terme : la parenthèse devient un facteur (`(x + x)(x + 1)` → `2x(x + 1)`)
		if (sum.exponent !== 1) fail();
		changed = true;
		const own = withOwnSign({ sign: '+', term: reduced });
		if (own.sign === '-') sign = flip(sign);
		plain.push(own.term);
	}
	if (!changed) return null;
	return { computed: chunkTerms({ sign, plain, sums }), action: { kind: 'reduce-inside' } };
};

/** La double distribution des deux premières parenthèses du produit. */
const distributeBoth: Phase = (chunk) => {
	if (chunk.sums.length < 2) return null;
	const [left, right] = chunk.sums;
	if (left.exponent !== 1 || right.exponent !== 1) fail();
	if (left.terms.length * right.terms.length > MAX_PRODUCTS) fail();
	const written = left.terms.flatMap((s) =>
		right.terms.map((t) => ({
			sign: times(s.sign, t.sign),
			term: multiply(asFactor(s.term), asFactor(t.term), 'cross')
		}))
	);
	return replaceSums(chunk, 0, 2, written, { kind: 'double' });
};

/**
 * Un facteur devant une seule parenthèse (`3(x − 2)`, `−2(x − 4)`, `x(x − 1)`),
 * ou un signe seul (`−(x + 1)`) : les produits sont calculés directement, comme
 * au collège (section E : `3(x − 2) − (x + 1)` → `3x − 6 − x − 1`).
 */
const distributeFactor: Phase = (chunk) => {
	if (chunk.sums.length !== 1) return null;
	const [sum] = chunk.sums;
	if (sum.exponent !== 1) fail();
	if (chunk.plain.length === 0) {
		return {
			computed: sum.terms.map(({ sign, term }) => ({ sign: times(chunk.sign, sign), term })),
			action: { kind: chunk.sign === '-' ? 'sign' : 'unwrap' }
		};
	}
	const factor = productOf(chunk.plain.map(unwrapGrouping));
	return {
		computed: sum.terms.map(({ sign, term }) =>
			computeTerm({ sign: times(chunk.sign, sign), term: multiply(factor, term, 'cross') })
		),
		action: { kind: 'factor', factor: chunk.sign === '-' ? opposite(factor) : factor }
	};
};

/** Les phases, dans l'ordre du tableau : la première qui s'applique fait la ligne. */
const PHASES: readonly Phase[] = [
	splitPower,
	identity,
	reduceInside,
	distributeBoth,
	distributeFactor
];

// =============================================================================
// Fonctions — les titres
// =============================================================================

function superscriptText(digits: string): string {
	return [...digits].map((d) => SUPERSCRIPT_DIGITS[Number(d)]).join('');
}

/**
 * Une écriture en texte (`3x`, `x²`, `−2`, `(x + 1)²`), ou `null` si elle
 * demande des maths composées (fraction, racine, exposant non entier).
 */
function plainText(node: MathNode): string | null {
	switch (node.type) {
		case 'number':
			return node.value;
		case 'variable':
			return node.name;
		case 'constant':
			return node.constant === 'euler' ? 'e' : node.constant === 'pi' ? 'π' : null;
		case 'opposite': {
			const operand = plainText(node.operand);
			return operand === null ? null : `−${operand}`;
		}
		case 'multiplication': {
			const left = plainText(node.left);
			const right = plainText(node.right);
			if (node.displayStyle !== 'implicit' || left === null || right === null) return null;
			// Jamais deux nombres collés
			return /\d$/.test(left) && /^\d/.test(right) ? null : `${left}${right}`;
		}
		case 'superscript': {
			const base = plainText(node.base);
			const exponent = integerExponent(node.superscript);
			if (base === null || exponent === null) return null;
			const bare = ['variable', 'number', 'constant', 'delimiter'].includes(node.base.type);
			return `${bare ? base : `(${base})`}${superscriptText(String(exponent))}`;
		}
		case 'delimiter': {
			if (node.semantic !== undefined && node.semantic !== 'grouping') return null;
			const content = plainText(node.content);
			return content === null ? null : `(${content})`;
		}
		case 'addition':
		case 'subtraction': {
			const parts = flattenSumShallow(node).map(({ sign, term }) => ({
				sign,
				text: plainText(term)
			}));
			if (parts.some(({ text }) => text === null)) return null;
			return parts
				.map(({ sign, text }, index) =>
					index === 0 ? `${sign === '-' ? '−' : ''}${text}` : ` ${sign === '-' ? '−' : '+'} ${text}`
				)
				.join('');
		}
		default:
			return null;
	}
}

/** Une expression dans la prose d'un titre : en texte si possible, sinon entre `$…$`. */
function prose(node: MathNode): string {
	return plainText(node) ?? `$${toLatex(node)}$`;
}

/** `3`, `3 et −2`, `3, −2 et x`. */
function enumeration(items: readonly string[]): string {
	if (items.length <= 1) return items.join('');
	return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

/** Le titre d'une ligne de distribution d'un facteur, ou de signe. */
function distributionTitle(actions: readonly Action[]): string {
	const factors = actions.flatMap((action) =>
		action.kind === 'factor' ? [prose(action.factor)] : []
	);
	const signs = actions.filter((action) => action.kind === 'sign').length;
	if (factors.length > 0) {
		const head = `On distribue ${enumeration(factors)}`;
		if (signs === 0) return head;
		return signs === 1
			? `${head}, et le signe − devant la parenthèse change le signe de chaque terme`
			: `${head}, et le signe − devant chaque parenthèse change le signe de ses termes`;
	}
	if (signs === 1) return 'On enlève la parenthèse précédée d’un −';
	if (signs > 1) return 'On enlève les parenthèses précédées d’un −';
	return 'On enlève les parenthèses';
}

/** Le titre d'une ligne, d'après ce que la phase a fait de chaque terme. */
function titleOf(actions: readonly Action[]): string {
	const [first] = actions;
	switch (first.kind) {
		case 'split': {
			if (actions.length > 1) return 'On écrit chaque puissance comme un produit';
			const before = plainText(first.before);
			const after = plainText(first.after);
			return before !== null && after !== null
				? `On écrit ${before} = ${after}`
				: `On écrit $${toLatex(first.before)} = ${toLatex(first.after)}$`;
		}
		case 'identity': {
			if (actions.length === 1) {
				const formula = `On reconnaît ${IDENTITY_FORMULA[first.identity]}`;
				// `(a+b)²` tapé tel quel : « avec a = a et b = b » ne dirait rien
				const named = plainText(first.a) === 'a' && plainText(first.b) === 'b';
				return named ? formula : `${formula}, avec a = ${prose(first.a)} et b = ${prose(first.b)}`;
			}
			const squares = actions.every(
				(action) => action.kind === 'identity' && action.identity !== 'conjugate'
			);
			return squares
				? 'On développe chaque carré avec son identité remarquable'
				: 'On développe avec les identités remarquables';
		}
		case 'reduce-inside':
			return actions.length === 1
				? 'On réduit dans la parenthèse'
				: 'On réduit dans chaque parenthèse';
		case 'double':
			return DOUBLE_TITLE;
		default:
			return distributionTitle(actions);
	}
}

/** La règle d'une ligne (son « pourquoi »). */
function ruleOf(actions: readonly Action[]): ExpandRule {
	switch (actions[0].kind) {
		case 'split':
			return 'expand-split-power';
		case 'identity':
			return 'expand-identity';
		case 'reduce-inside':
			return 'expand-reduce-inside';
		case 'double':
			return 'expand-distribute';
		default:
			if (actions.some((action) => action.kind === 'factor')) return 'expand-distribute-factor';
			return actions.some((action) => action.kind === 'sign')
				? 'expand-remove-parentheses'
				: 'expand-unwrap';
	}
}

// =============================================================================
// Fonctions — la rédaction
// =============================================================================

/** La première phase qui s'applique à au moins un terme, et ce qu'elle fait de chacun. */
function firstPhase(chunks: readonly Chunk[]): readonly (Rewrite | null)[] | null {
	for (const phase of PHASES) {
		const rewrites = chunks.map(phase);
		if (rewrites.some((rewrite) => rewrite !== null)) return rewrites;
	}
	return null;
}

/** Les lignes de la rédaction détaillée, jusqu'à la dernière phase (sans « On réduit »). */
function narrate(start: MathNode, answer: MathNode): Line[] {
	let terms: readonly SignedTerm[] = flattenSumShallow(start);
	const startChunks = terms.map(readChunk);
	if (startChunks.some((chunk) => chunk.sums.some((sum) => sum.exponent >= 4))) {
		return [{ rule: 'expand-whole-power', title: 'On développe la puissance', image: answer }];
	}

	const lines: Line[] = [];
	for (let round = 0; ; round++) {
		if (round >= MAX_ROUNDS) fail();
		const rewrites = firstPhase(terms.map(readChunk));
		if (rewrites === null) return lines;

		const actions = rewrites.flatMap((rewrite) => (rewrite === null ? [] : [rewrite.action]));
		const pick = (written: boolean) =>
			terms.flatMap((term, index) => {
				const rewrite = rewrites[index];
				if (rewrite === null) return [term];
				return written ? (rewrite.written ?? rewrite.computed) : rewrite.computed;
			});
		const computed = pick(false);
		// Une ligne à × pour une distribution double, ou pour une identité SEULE :
		// plusieurs identités s'écrivent calculées (section E, `(3x−1)² − (x+2)²`)
		const withProducts =
			rewrites.some((rewrite) => rewrite?.written !== undefined) &&
			(actions[0].kind !== 'identity' || actions.length === 1);
		if (withProducts) {
			lines.push({
				rule: ruleOf(actions),
				title: titleOf(actions),
				image: sumOf(pick(true)),
				products: true
			});
			lines.push({
				rule: 'expand-compute',
				title:
					actions[0].kind === 'identity' ? 'On calcule chaque terme' : 'On calcule chaque produit',
				image: sumOf(computed)
			});
		} else {
			lines.push({ rule: ruleOf(actions), title: titleOf(actions), image: sumOf(computed) });
		}
		terms = computed;
	}
}

/** La version résumée : chaque ligne à × fondue dans le calcul qui la suit. */
function summarize(lines: readonly Line[]): Line[] {
	const merged: Line[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const next = lines[i + 1];
		if (line.products && next !== undefined) {
			merged.push({ rule: line.rule, title: line.title, image: next.image });
			i++;
		} else {
			merged.push(line);
		}
	}
	return merged;
}

/** Les termes d'une somme, sans leur ordre : `1 + x² + x` et `x² + x + 1` sont les mêmes. */
function sameTerms(left: MathNode, right: MathNode): boolean {
	const written = (node: MathNode) =>
		flattenSumShallow(node)
			.map(withOwnSign)
			.map(({ sign, term }) => `${sign}${toLatex(term)}`)
			.sort()
			.join(' ');
	return written(left) === written(right);
}

/**
 * Les étapes, numérotées : une image identique à la précédente ne fait pas de
 * ligne, et la dernière est la réponse (« On réduit », sinon « On ordonne les
 * termes » quand seul l'ordre change).
 */
function stepsOf(
	start: MathNode,
	lines: readonly Line[],
	answer: MathNode,
	format: (node: MathNode) => MathNode
): PedagogicalSimplifyStep[] {
	const steps: PedagogicalSimplifyStep[] = [];
	let previous = start;
	let previousLatex = toLatex(start);
	const push = (rule: ExpandRule, title: string, image: MathNode, level: Verbosity) => {
		const latex = toLatex(image);
		if (latex === previousLatex) return;
		steps.push({
			id: steps.length + 1,
			rule,
			description: title,
			before: previous,
			after: image,
			verbosityLevel: level,
			category: CATEGORY[rule],
			globalBefore: previous,
			globalAfter: image
		});
		previous = image;
		previousLatex = latex;
	};
	for (const line of lines) {
		push(line.rule, line.title, format(line.image), line.products ? 'detailed' : 'summarized');
	}
	const last = format(answer);
	if (toLatex(last) !== previousLatex) {
		const ordered = sameTerms(previous, last);
		push(
			ordered ? 'expand-order' : 'expand-reduce',
			ordered ? 'On ordonne les termes' : 'On réduit',
			last,
			'summarized'
		);
	}
	return steps;
}

/**
 * Rédiger le développement de `node` jusqu'à `answer` — ou `null` quand on ne
 * sait pas le rédiger (la réponse reste, sans « Comment ? »).
 *
 * @param node - L'expression telle qu'écrite (parenthèses de tête retirées)
 * @param answer - La forme développée et réduite que la ligne affiche, avant `format`
 * @param options - `format` : la mise en forme de chaque image (décimaux)
 */
export function writeExpandSteps(
	node: MathNode,
	answer: MathNode,
	options: ExpandStepsOptions = {}
): ExpandSteps | null {
	const format = options.format ?? ((image: MathNode) => image);
	try {
		const lines = narrate(node, answer);
		// Jamais une étape fausse : chaque image écrite ici est l'entrée, autrement
		// écrite (la réponse vient de l'appelant, elle n'est pas revérifiée)
		for (const line of lines) {
			if (line.image !== answer && !areEquivalent(line.image, node)) return null;
		}
		const steps = stepsOf(node, lines, answer, format);
		if (steps.length === 0) return null;
		return { steps, summary: stepsOf(node, summarize(lines), answer, format) };
	} catch {
		// `Unwritable` (une écriture qu'on ne sait pas rédiger), ou `normalize`
		// qui refuse un terme : la réponse reste, sans étapes
		return null;
	}
}
