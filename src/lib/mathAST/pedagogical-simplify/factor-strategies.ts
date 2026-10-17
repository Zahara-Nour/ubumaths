/**
 * `factoriser` : des stratégies qui RACONTENT (ADR 0024, lot 2).
 *
 * Le noyau (`mathAST/factor/`) trouve, la stratégie raconte. Enchaînement, la
 * suivante si la précédente ne factorise pas :
 *
 * 1. facteur commun, 2. identité remarquable, 3. facteur commun puis identité :
 *    d'abord sur l'expression TELLE QU'ÉCRITE, par la passe de motifs du
 *    pipeline (`patternStage`, identités lues par coefficients :
 *    `pedagogical-rules/polynomial-identities.ts`) ; puis sur chaque facteur
 *    polynomial du produit obtenu, réduit s'il le faut (`(2x+1)+(x−3)` →
 *    `3x − 2`, étape « On réduit chaque facteur ») ;
 * 4. racines du trinôme par Δ (lycée), `a(x − x₁)(x − x₂)` puis, si a ≠ 1, la
 *    forme à coefficients entiers ; racines irrationnelles comprises ;
 * 5. racine évidente puis division (lycée, degré ≥ 3) ;
 * 6. développer pour refactoriser, en dernier recours : les étapes de
 *    développement sont gardées dans un tampon et JETÉES si rien ne factorise
 *    ensuite — l'expression rendue est alors l'entrée.
 *
 * Le niveau : collège = 1, 2, 3, 6 ; lycée et supérieur = toutes (décision Q1).
 * L'ordre des facteurs est celui du noyau (`compareFactors`, décision Q3).
 *
 * Champ : un polynôme d'UNE lettre (`soleVariable`) ; plusieurs lettres
 * (`x^2-y^2`, `ax+ay`) gardent la seule passe de motifs.
 *
 * @module mathAST/pedagogical-simplify/factor-strategies
 */

import type { MathNode } from '../types';
import { tidy } from '../tidy';
import { nodesEqual } from '../pattern/match';
import type { Rational } from '../normal/types';
import type { SchoolLevel } from '../common/step-renderer-base';
import {
	add,
	multiply,
	number,
	opposite,
	parentheses,
	power,
	subtract,
	variable
} from '../factory';
import {
	ONE,
	ZERO,
	absRational,
	compareRational,
	divRational,
	fromInteger,
	gcd,
	isMinusOne,
	isOne,
	isPositive,
	isZero,
	mulRational,
	negRational,
	powRational
} from '../normal/rational';
import { rationalToNode } from '../common/numeric';
import {
	MAX_RADICAND,
	compareFactors,
	discriminant,
	factorizationToNode,
	polynomialNode,
	quadraticRootParts,
	type PolynomialFactor,
	type QuadraticRootParts,
	type SurdFactor
} from '../factor';
import { deflate, evalPoly } from '../factor/polynomial';
import {
	IDENTITY_RULE_NAMES,
	ascendingPolynomialNode,
	identityFactorNode,
	polynomialIdentity,
	readWrittenPolynomial,
	soleVariable
} from './pedagogical-rules/polynomial-identities';
import type { PedagogicalSimplifyStep } from './types';

// =============================================================================
// Types
// =============================================================================

type MakeStep = (
	rule: string,
	before: MathNode,
	after: MathNode,
	globalBefore: MathNode,
	globalAfter: MathNode
) => PedagogicalSimplifyStep;

interface Staged {
	readonly result: MathNode;
	readonly steps: readonly PedagogicalSimplifyStep[];
}

export interface FactoriserContext {
	readonly level: SchoolLevel;
	/** Stratégies 1 à 3 sur l'expression telle qu'écrite : la passe de motifs du pipeline. */
	readonly patternStage: (node: MathNode) => Staged;
	/** L'intention `developper` (stratégie 6). */
	readonly develop: (node: MathNode) => Staged;
	readonly makeStep: MakeStep;
}

export interface FactoriserOutcome extends Staged {
	/**
	 * Rendu à ne pas repasser par `tidy` : il réordonnerait `x - 1 - √2` en
	 * `√2 + x - 1` et `3 + x` en `x + 3`.
	 */
	readonly clean: boolean;
}

/** Un facteur du produit en cours. */
type Part =
	| {
			readonly kind: 'poly';
			readonly coefficients: readonly bigint[];
			readonly multiplicity: number;
			/** Écrit comme ses termes : sinon, une étape « On réduit chaque facteur ». */
			readonly reduced: boolean;
			/** L'écriture d'origine (`2 - x` reste `2 - x`) ; absente : `polynomialNode`. */
			readonly node?: MathNode;
	  }
	| { readonly kind: 'surd'; readonly factor: SurdFactor }
	| { readonly kind: 'other'; readonly node: MathNode; readonly multiplicity: number };

interface ProductView {
	readonly variable: string;
	readonly constant: Rational;
	readonly parts: readonly Part[];
}

// =============================================================================
// Le produit en cours : lecture et rendu
// =============================================================================

/**
 * Met au propre **sans réordonner** un produit déjà factorisé.
 *
 * `tidy` range les facteurs dans son ordre canonique : `(x+1)e^x` y devient
 * `e^x(x+1)`. Les deux écritures sont justes, mais c'est la première qu'on
 * écrit au tableau pour une dérivée, et l'ordre vient ici d'une factorisation
 * que l'élève vient de suivre — le moteur n'a pas à la rebattre.
 *
 * On met donc chaque facteur au propre séparément, en gardant l'ordre. Tout ce
 * qui n'est pas un produit passe par `tidy` entier : `√8` devient `2√2`,
 * `2x + 3x` devient `5x`.
 */
export function tidyWithoutReordering(node: MathNode): MathNode {
	// Un produit factorisé peut être sous un signe ou dans une fonction :
	// `−(x+1)eˣ`, `sin((x−1)eˣ)`. Passés à `tidy` entiers, ils devenaient
	// `−eˣ(x+1)` et `sin(eˣ(x−1))`. On ne descend que s'il y a un produit
	// dessous : sinon `tidy` garde la main sur le nœud entier (`√8` → `2√2`).
	if (node.type === 'opposite' && node.operand.type === 'multiplication') {
		return { ...node, operand: tidyWithoutReordering(node.operand) };
	}
	if (node.type === 'function' && node.args.some((arg) => arg.type === 'multiplication')) {
		return { ...node, args: node.args.map(tidyWithoutReordering) };
	}
	if (node.type !== 'multiplication') return tidy(node);
	const left = tidyWithoutReordering(node.left);
	const right = tidyWithoutReordering(node.right);
	// Deux nombres côte à côte ne sont pas une factorisation à préserver : ils
	// viennent d'une identité qui a rendu un nombre (`2\ln(e)` → `2 × 1`,
	// `3\ln(e^2)` → `3 × 2`). Aucune règle de `factoriser` ne décompose un
	// entier, donc on peut les calculer sans rien défaire.
	if (left.type === 'number' && right.type === 'number') {
		return tidy({ ...node, left, right });
	}
	return { ...node, left, right };
}

/** Écrit constante devant (`3 + x`, `3 - 2x`) : la forme d'une identité lue à l'envers. */
function isWrittenAscending(node: MathNode, coefficients: readonly bigint[], v: string): boolean {
	return nodesEqual(node, ascendingPolynomialNode(coefficients, variable(v)));
}

function viewOf(node: MathNode, v: string): ProductView {
	let constant = ONE;
	const parts: Part[] = [];
	const visit = (n: MathNode, m: number): void => {
		if (n.type === 'delimiter' && (n.semantic === undefined || n.semantic === 'grouping')) {
			return visit(n.content, m);
		}
		if (n.type === 'opposite') {
			constant = mulRational(constant, powRational(fromInteger(-1), m));
			return visit(n.operand, m);
		}
		if (n.type === 'multiplication') {
			visit(n.left, m);
			return visit(n.right, m);
		}
		if (n.type === 'superscript' && n.superscript.type === 'number') {
			const e = Number(n.superscript.value);
			if (Number.isInteger(e) && e >= 1) return visit(n.base, m * e);
		}
		const written = readWrittenPolynomial(n, v);
		// Un nombre écrit seul rejoint la constante ; `(x + 3) - x` attend l'étape de réduction
		if (written !== null && !written.developable && written.poly.length <= 1 && written.reduced) {
			constant = mulRational(constant, powRational(written.poly[0] ?? ZERO, m));
			return;
		}
		if (written !== null && !written.developable && written.coefficients !== null) {
			const { coefficients, reduced } = written;
			// Un facteur écrit est mis au propre ici (`-x + 2` → `2 - x`) ; ceux que
			// les stratégies construisent ne passent jamais par `tidy`, qui écrirait
			// `x + 3` pour le `3 + x` de `(3 - x)(3 + x)`
			const node = !reduced || isWrittenAscending(n, coefficients, v) ? n : tidy(n);
			parts.push({ kind: 'poly', coefficients, multiplicity: m, reduced, node });
			return;
		}
		parts.push({ kind: 'other', node: tidyWithoutReordering(n), multiplicity: m });
	};
	visit(node, 1);
	return { variable: v, constant, parts };
}

function partNode(part: Part, v: string): MathNode {
	if (part.kind === 'other') return part.node;
	if (part.kind === 'poly') return part.node ?? polynomialNode(part.coefficients, variable(v));
	return factorizationToNode({
		variable: v,
		field: 'R',
		constant: ONE,
		factors: [part.factor],
		rest: null,
		complete: true
	});
}

function multiplicityOf(part: Part): number {
	return part.kind === 'surd' ? part.factor.multiplicity : part.multiplicity;
}

/** `constante × facteurs`, comme le rendu du noyau : −1 en signe devant le produit. */
function productNode(constant: Rational, factors: readonly MathNode[]): MathNode {
	if (factors.length === 0 || isZero(constant)) return rationalToNode(constant);
	const chain = (nodes: readonly MathNode[]) =>
		nodes.slice(1).reduce((acc, f) => multiply(acc, f, 'implicit'), nodes[0]);
	if (isOne(constant)) return chain(factors);
	if (isMinusOne(constant)) return opposite(chain(factors));
	return chain([rationalToNode(constant), ...factors]);
}

/** Parenthèses autour d'une somme facteur d'un produit ou élevée à une puissance. */
function wrapped(node: MathNode, multiplicity: number, alone: boolean): MathNode {
	const isSum = node.type === 'addition' || node.type === 'subtraction';
	const base = isSum && (!alone || multiplicity > 1) ? parentheses(node) : node;
	return multiplicity > 1 ? power(base, number(String(multiplicity))) : base;
}

/** Le facteur du noyau d'une partie polynomiale réduite, pour l'ordre. */
function kernelFactor(part: Part): PolynomialFactor | null {
	if (part.kind === 'surd') return part.factor;
	if (part.kind !== 'poly' || !part.reduced) return null;
	const { coefficients, multiplicity } = part;
	return { kind: 'integer', coefficients, multiplicity };
}

/**
 * Le produit. Les facteurs polynomiaux réduits d'abord, dans l'ordre du noyau
 * (décision Q3), facteurs égaux regroupés en puissance, chacun gardant son
 * écriture ; les autres ensuite, dans l'ordre écrit (`(x − 1)eˣ`, décision du
 * lot #1108). Tant qu'un facteur reste à réduire : l'ordre écrit.
 */
function renderView(view: ProductView): MathNode {
	const entries = view.parts.map((part) => ({
		part,
		factor: kernelFactor(part),
		multiplicity: multiplicityOf(part)
	}));
	let ordered = entries;
	if (!view.parts.some((p) => p.kind === 'poly' && !p.reduced)) {
		const merged = new Map<string, (typeof entries)[number]>();
		entries.forEach((entry, i) => {
			if (entry.factor === null) return;
			const key = entry.part.kind === 'poly' ? entry.part.coefficients.join(',') : `surd-${i}`;
			const known = merged.get(key);
			if (known) known.multiplicity += entry.multiplicity;
			else merged.set(key, { ...entry });
		});
		const kernel = [...merged.values()].sort((a, b) => compareFactors(a.factor!, b.factor!));
		ordered = [...kernel, ...entries.filter((e) => e.factor === null)];
	}
	const alone = ordered.length === 1 && isOne(view.constant);
	const nodes = ordered.map((e) => wrapped(partNode(e.part, view.variable), e.multiplicity, alone));
	return productNode(view.constant, nodes);
}

// =============================================================================
// Stratégies sur un facteur polynomial
// =============================================================================

/** `x − r`, écrit sans littéral négatif. */
function rootFactorNode(x: MathNode, r: Rational): MathNode {
	if (isZero(r)) return x;
	return isPositive(r) ? subtract(x, rationalToNode(r)) : add(x, rationalToNode(negRational(r)));
}

/** Les racines rangées comme les facteurs du noyau : |r| croissant, la positive d'abord. */
function byKernelOrder(a: Rational, b: Rational): number {
	const byMagnitude = compareRational(absRational(a), absRational(b));
	if (byMagnitude !== 0) return byMagnitude;
	return isPositive(a) ? -1 : isPositive(b) ? 1 : 0;
}

export interface TrinomialAnalysis {
	readonly delta: Rational;
	readonly a: Rational;
	readonly parts: QuadraticRootParts;
	/** Racines rationnelles, dans l'ordre du noyau (doublée si Δ = 0). */
	readonly roots: readonly Rational[];
}

/** Δ et racines de `c + b·x + a·x²` (coefficients entiers). */
export function analyzeTrinomial(coefficients: readonly bigint[]): TrinomialAnalysis {
	const [c, b, a] = coefficients.map(fromInteger);
	const delta = discriminant(a, b, c);
	const parts = quadraticRootParts(a, b, c, MAX_RADICAND);
	const roots =
		parts.kind === 'rational'
			? [...parts.roots].sort(byKernelOrder)
			: parts.kind === 'double'
				? [parts.root, parts.root]
				: [];
	return { delta, a, parts, roots };
}

/** La première racine évidente (±1, ±2, ±3) d'un polynôme entier, ou `null`. */
export function evidentRoot(coefficients: readonly bigint[]): bigint | null {
	const poly = coefficients.map(fromInteger);
	for (const r of [1n, -1n, 2n, -2n, 3n, -3n]) {
		if (isZero(evalPoly(poly, fromInteger(r)))) return r;
	}
	return null;
}

/** Une étape de la stratégie : ce qu'elle remplace et par quoi. */
interface Move {
	readonly rule: string;
	readonly replacement: readonly Part[];
	/** Multiplie la constante du produit. */
	readonly constant?: Rational;
	/** Ligne intermédiaire `a(x − x₁)(x − x₂)`, avant la forme entière. */
	readonly intermediate?: { readonly constant: Rational; readonly nodes: readonly MathNode[] };
}

function poly(coefficients: readonly bigint[], multiplicity: number, node?: MathNode): Part {
	return { kind: 'poly', coefficients, multiplicity, reduced: true, ...(node && { node }) };
}

/** Stratégies 1 et 3 sur un facteur : contenu entier et plus petite puissance de x. */
function contentMove(coefficients: readonly bigint[], m: number): Move | null {
	if (coefficients.filter((c) => c !== 0n).length < 2) return null;
	const g = coefficients.reduce((acc, c) => gcd(acc, c), 0n);
	const lowest = coefficients.findIndex((c) => c !== 0n);
	if (g === 1n && lowest === 0) return null;
	const rest = coefficients.slice(lowest).map((c) => c / g);
	const replacement = lowest > 0 ? [poly([0n, 1n], lowest * m), poly(rest, m)] : [poly(rest, m)];
	// Le dernier terme écrit est le terme de plus bas degré : il donne `-add` ou `-sub`
	const rule =
		coefficients[lowest] < 0n ? 'common-factor-content-sub' : 'common-factor-content-add';
	return { rule, replacement, constant: powRational(fromInteger(g), m) };
}

/** Stratégie 4 : `a(x − x₁)(x − x₂)`, puis les coefficients entiers. */
function trinomialMove(coefficients: readonly bigint[], m: number, x: MathNode): Move | null {
	const { a, parts, roots } = analyzeTrinomial(coefficients);
	if (parts.kind === 'surd') {
		const surds: Part[] = ([1, -1] as const).map((sign) => ({
			kind: 'surd',
			factor: { ...parts, sign, multiplicity: m }
		}));
		return { rule: 'trinomial-roots', replacement: surds, constant: powRational(a, m) };
	}
	if (roots.length === 0) return null;
	const integerParts = roots.map((r) => poly([-r.n, r.d], m));
	const denominators = roots.reduce((acc, r) => acc * r.d, 1n);
	const constant = powRational(divRational(a, fromInteger(denominators)), m);
	// Racines entières (a = 1 en particulier) : la première ligne est déjà entière
	if (roots.every((r) => r.d === 1n)) {
		return { rule: 'trinomial-roots', replacement: integerParts, constant };
	}
	const nodes = roots.map((r) => wrapped(rootFactorNode(x, r), m, false));
	return {
		rule: 'trinomial-integer-form',
		replacement: integerParts,
		constant,
		intermediate: { constant: powRational(a, m), nodes }
	};
}

/** Stratégie 5 : `(x − r)·Q`, Q par division. */
function evidentRootMove(coefficients: readonly bigint[], m: number): Move | null {
	const r = evidentRoot(coefficients);
	if (r === null) return null;
	const quotient = deflate(coefficients.map(fromInteger), fromInteger(r)).map((c) => c.n);
	return { rule: 'evident-root', replacement: [poly([-r, 1n], m), poly(quotient, m)] };
}

function moveFor(part: Part, lycee: boolean, x: MathNode, v: string): Move | null {
	if (part.kind !== 'poly' || !part.reduced) return null;
	const { coefficients, multiplicity: m } = part;
	const content = contentMove(coefficients, m);
	if (content) return content;
	const identity = polynomialIdentity(coefficients);
	if (identity) {
		const replacement = identity.factors.map((f) =>
			poly(f.coefficients, f.multiplicity * m, identityFactorNode(identity, f.coefficients, v))
		);
		return { rule: IDENTITY_RULE_NAMES[identity.kind], replacement };
	}
	if (!lycee) return null;
	if (coefficients.length === 3) return trinomialMove(coefficients, m, x);
	if (coefficients.length > 3) return evidentRootMove(coefficients, m);
	return null;
}

// =============================================================================
// Orchestration
// =============================================================================

/** Une parenthèse de regroupement autour d'un produit facteur d'un produit. */
function isGroupedProduct(node: MathNode): boolean {
	return (
		node.type === 'delimiter' &&
		(node.semantic === undefined || node.semantic === 'grouping') &&
		node.content.type === 'multiplication'
	);
}

/**
 * `3((2x − 1)(2x + 1))` → `3(2x − 1)(2x + 1)` : une identité appliquée DANS la
 * parenthèse de `3(4x² − 1)` y laisse un produit entre parenthèses, que l'élève
 * lirait comme des parenthèses doubles. Seul le regroupement d'un produit
 * facteur d'un produit est retiré ; la valeur ne change pas.
 */
export function flattenGroupedProducts(node: MathNode): MathNode {
	switch (node.type) {
		case 'multiplication': {
			const side = (child: MathNode): MathNode => {
				const flat = flattenGroupedProducts(child);
				return isGroupedProduct(flat) && flat.type === 'delimiter' ? flat.content : flat;
			};
			const left = side(node.left);
			const right = side(node.right);
			return left === node.left && right === node.right ? node : { ...node, left, right };
		}
		case 'opposite': {
			const operand = flattenGroupedProducts(node.operand);
			return operand === node.operand ? node : { ...node, operand };
		}
		case 'delimiter': {
			const content = flattenGroupedProducts(node.content);
			return content === node.content ? node : { ...node, content };
		}
		case 'addition':
		case 'subtraction': {
			const left = flattenGroupedProducts(node.left);
			const right = flattenGroupedProducts(node.right);
			return left === node.left && right === node.right ? node : { ...node, left, right };
		}
		default:
			return node;
	}
}

const MAX_MOVES = 16;

/** Stratégies 1 à 5 sur le produit issu de la passe de motifs. */
function polynomialStage(tree: MathNode, v: string, ctx: FactoriserContext) {
	const x = variable(v);
	const lycee = ctx.level === 'lycee' || ctx.level === 'superieur';
	const steps: PedagogicalSimplifyStep[] = [];
	let view = viewOf(tree, v);
	// Chaque étape part exactement de la ligne précédente : d'abord l'arbre reçu
	let current = tree;

	if (view.parts.some((p) => p.kind === 'poly' && !p.reduced)) {
		let constant = view.constant;
		const reducedParts: Part[] = [];
		for (const p of view.parts) {
			if (p.kind !== 'poly' || p.reduced) reducedParts.push(p);
			else if (p.coefficients.length > 1) reducedParts.push(poly(p.coefficients, p.multiplicity));
			// Un facteur qui se réduit à un nombre rejoint la constante : `(x + 3) - x` → 3
			else {
				const value = fromInteger(p.coefficients[0] ?? 0n);
				constant = mulRational(constant, powRational(value, p.multiplicity));
			}
		}
		const next = { ...view, constant, parts: reducedParts };
		const after = renderView(next);
		steps.push(ctx.makeStep('reduce-factors', current, after, current, after));
		view = next;
		current = after;
	}

	for (let moves = 0; moves < MAX_MOVES; moves++) {
		const index = view.parts.findIndex((p) => moveFor(p, lycee, x, v) !== null);
		if (index < 0) break;
		const part = view.parts[index];
		const move = moveFor(part, lycee, x, v)!;
		const parts = [...view.parts];
		parts.splice(index, 1, ...move.replacement);
		const next: ProductView = {
			...view,
			constant: mulRational(view.constant, move.constant ?? ONE),
			parts
		};
		const local = partNode(part, v);
		const localAfter = productNode(
			move.constant ?? ONE,
			move.replacement.map((p) => wrapped(partNode(p, v), multiplicityOf(p), false))
		);
		const globalBefore = current;
		if (move.intermediate) {
			// Deux lignes : a(x − x₁)(x − x₂), puis la forme à coefficients entiers
			const others = view.parts.filter((_, i) => i !== index);
			const inter = move.intermediate;
			const otherNodes = others.map((p) => wrapped(partNode(p, v), multiplicityOf(p), false));
			const interGlobal = productNode(mulRational(view.constant, inter.constant), [
				...otherNodes,
				...inter.nodes
			]);
			const interLocal = productNode(inter.constant, inter.nodes);
			steps.push(ctx.makeStep('trinomial-roots', local, interLocal, globalBefore, interGlobal));
			steps.push(ctx.makeStep(move.rule, interLocal, localAfter, interGlobal, renderView(next)));
		} else {
			steps.push(ctx.makeStep(move.rule, local, localAfter, globalBefore, renderView(next)));
		}
		view = next;
		current = renderView(next);
	}
	return { view, steps };
}

/**
 * Factorisé : une étape de factorisation ET un résultat qui n'est plus une
 * somme. `x(4x+4)+1` → `4x(x+1)+1` a mis un terme en facteur, pas l'expression.
 */
function isFactored(outcome: Staged): boolean {
	const root = outcome.result.type === 'delimiter' ? outcome.result.content : outcome.result;
	const isSum = root.type === 'addition' || root.type === 'subtraction';
	return !isSum && outcome.steps.some((s) => s.category === 'factorisation');
}

/** Stratégies 1 à 5 : la passe de motifs, puis les facteurs polynomiaux. */
function factorWithStrategies(
	node: MathNode,
	v: string | null,
	ctx: FactoriserContext
): FactoriserOutcome {
	const pattern = ctx.patternStage(node);
	if (v === null) return { ...pattern, clean: false };
	const { view, steps } = polynomialStage(pattern.result, v, ctx);
	const allSteps = [...pattern.steps, ...steps];
	if (allSteps.length === 0) return { ...pattern, clean: false };
	// Facteurs écrits déjà mis au propre à la lecture (`viewOf`)
	return { result: renderView(view), steps: allSteps, clean: true };
}

/**
 * L'intention `factoriser` : stratégies 1 à 5, puis 6 en dernier recours.
 * Rend l'entrée (passée par la passe de motifs) si rien ne factorise.
 */
export function runFactoriserStrategies(node: MathNode, ctx: FactoriserContext): FactoriserOutcome {
	const v = soleVariable(node);
	const first = factorWithStrategies(node, v, ctx);
	if (v === null || isFactored(first)) return first;

	// Stratégie 6 : développer, seulement si l'écriture le permet et si la suite factorise
	// … et seulement sur une SOMME : `(x+1)(x-1)` est déjà factorisé
	const written = readWrittenPolynomial(node, v);
	const root = node.type === 'delimiter' ? node.content : node;
	const isSum = root.type === 'addition' || root.type === 'subtraction';
	if (written === null || !written.developable || !isSum) return first;
	const developed = ctx.develop(node);
	const second = factorWithStrategies(developed.result, v, ctx);
	if (!isFactored(second)) return first;
	// Le développement tient en UNE étape : les `combine-like-terms` de
	// `developper` partagent un même contexte figé et répètent la même ligne
	const develop = ctx.makeStep('develop-to-factor', node, developed.result, node, developed.result);
	return { ...second, steps: [develop, ...second.steps] };
}
