/**
 * Second membre LITTÉRAL : `y = f(x)` résolue en x en remontant f
 * couche par couche (lot 1 du chantier « réciproque »)
 *
 * `y = e^{2x+1}`, `y = \ln(x-1)`, `y = \sqrt{x+2}`, `y = 2^x`, `y = 3e^x - 1`
 * revenaient « non supporte » (mesuré le 2026-10-13) : chaque solveur lit la
 * VALEUR du second membre, qu'un paramètre n'a pas. Ici, une seule couche à
 * la fois, comme au tableau :
 *
 * - k·T + (termes sans x) = 0 → T = c, c sans x (k numérique non nul) ;
 * - eᵘ = c → u = ln c, si c > 0 ; aᵘ = c → u = ln c / ln a, si c > 0 ;
 * - ln u = c → u = eᶜ ; log u = c → u = 10ᶜ ;
 * - √u = c → u = c², si c ≥ 0 ;
 *
 * puis `u = …` repasse par `solve` (affine, couche suivante). La solution
 * porte la CONDITION sur le paramètre (`Solution.condition`), simplifiée par
 * `parameterCondition` : `(y + 1)/3 > 0` devient `y > −1`.
 *
 * Refus (null) — un refus honnête plutôt qu'une valeur fausse :
 * - coefficient littéral (`a e^x = 1`, convention V41 de `transcendental.ts`) ;
 * - c qui n'est pas défini pour toute valeur du paramètre : `\ln(ax)`
 *   développé en ln a + ln x donnerait c = 1 − ln a, faux pour a < 0 ;
 * - plusieurs termes en x (`y = xe^x`, `y = e^x + x`).
 *
 * Appelé en repli, seulement quand l'équation a un paramètre : un second
 * membre numérique garde ses chemins.
 *
 * @module mathAST/solve/literal-parameter
 */

import type { FunctionNode, MathNode, RelationNode, RelationType } from '../types';
import type { Solution, SolveOptions, SolveResult, EquationType } from './types';
import { isSolverFailure } from './types';
import {
	divide,
	equals,
	euler,
	func,
	logicalAnd,
	logicalOr,
	multiply,
	number,
	opposite,
	relation,
	relationChain,
	superscript,
	variable as variableNode
} from '../factory';
import { isFunction, isInfinity, isLogical, isRelation, isVariable } from '../guards';
import { toCustom } from '../custom-generator';
import { logarithmBase } from './solvers/transcendental';
import { mapNode } from '../transforms';
import { flattenSumShallow, unflattenSum, flattenRelationChain } from '../flatten';
import type { SignedTerm } from '../flatten';
import { getVariables } from '../eval/substitute';
import { denormalize, normalize } from '../normal';
import { computeDomain } from '../domain/compute';
import { intersect, isEmpty, isUniversal } from '../domain/algebra';
import type { Domain, Endpoint } from '../domain/types';
import { nodesEqual } from '../normal/hash';
import { solveInequality } from './inequality';
import { P } from '../pattern/builder';
import { tryMatch } from '../pattern/match';
import { getBindingNode, isProductSequenceBinding } from '../pattern/types';
import { createStepRecorder } from './step-recorder';
import { computeNumericValue } from '../eval/numeric-value';

// =============================================================================
// Types
// =============================================================================

type SolveFn = (equation: RelationNode, options?: SolveOptions) => SolveResult;

type SolverOptions = Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>>;

/** Une condition sur les paramètres : toujours vraie, jamais, ou écrite. */
export type ParameterCondition =
	| { readonly kind: 'always' }
	| { readonly kind: 'never' }
	| { readonly kind: 'when'; readonly node: MathNode };

/** Une couche ôtée : l'équation suivante `u = target` et sa condition. */
interface Layer {
	readonly argument: MathNode;
	readonly target: MathNode;
	readonly condition: MathNode | null;
	readonly description: string;
	readonly equationType: EquationType;
}

// =============================================================================
// Constantes
// =============================================================================

/** Couches emboîtées au plus : e^{√(ln x)} = y en a trois. */
const MAX_LAYERS = 6;

/** Lettres neuves pour f⁻¹(c) dans l'équation suivante. */
const FRESH_NAMES = ['k', 'K', 'm', 'M', 'q', 'Q'] as const;

const COMPARISONS: ReadonlySet<RelationType> = new Set(['<', '>', '<=', '>=', '!=']);

let layerDepth = 0;

// =============================================================================
// Conditions sur les paramètres
// =============================================================================

/** Les relations élémentaires d'une condition : `0 < y < 1` → 0 < y, y < 1. */
function atomsOf(node: MathNode): MathNode[] {
	if (isLogical(node) && node.operator === 'and')
		return [...atomsOf(node.left), ...atomsOf(node.right)];
	if (!isRelation(node)) return [node];
	const { operands, relations } = flattenRelationChain(node);
	return relations.map((op, i) => relation(op, operands[i], operands[i + 1]));
}

/** Les bornes d'un intervalle en condition sur x ; `null` : ℝ entier. */
function boundsCondition(lower: Endpoint, upper: Endpoint, x: MathNode): MathNode | null {
	const lowerOp: RelationType = lower.type === 'open' ? '<' : '<=';
	const upperOp: RelationType = upper.type === 'open' ? '<' : '<=';
	const lowerFinite = !isInfinity(lower.value);
	const upperFinite = !isInfinity(upper.value);
	if (lowerFinite && upperFinite) {
		return relationChain([lower.value, x, upper.value], [lowerOp, upperOp]);
	}
	if (lowerFinite) return relation(lower.type === 'open' ? '>' : '>=', x, lower.value);
	if (upperFinite) return relation(upperOp, x, upper.value);
	return null;
}

/**
 * La condition `letter ∈ domaine`, écrite comme au tableau : `y > −1`,
 * `0 < y < 1`, `a ≠ 0` (ℝ \ {0}), `y > 1 et y ≠ 2` (]1 ; 2[ ∪ ]2 ; +∞[) ;
 * des intervalles séparés par plus qu'un point : leur réunion (« ou »).
 */
function intervalCondition(domain: Domain, letter: string): ParameterCondition | null {
	if (isEmpty(domain)) return { kind: 'never' };
	if (isUniversal(domain)) return { kind: 'always' };
	if (domain.kind !== 'interval_set' || domain.intervals.length === 0) return null;
	const x = variableNode(letter);
	const { intervals } = domain;
	const excluded = domain.excludedPoints.map((p) => relation('!=', x, p.value));
	const gaps: MathNode[] = [];
	for (let i = 1; i < intervals.length; i++) {
		const [before, after] = [intervals[i - 1].upper, intervals[i].lower];
		const pointGap =
			before.type === 'open' && after.type === 'open' && nodesEqual(before.value, after.value);
		if (!pointGap) {
			const pieces = intervals.map((iv) => boundsCondition(iv.lower, iv.upper, x));
			if (pieces.some((p) => p === null)) return null;
			const union = (pieces as MathNode[]).reduce((all, p) => logicalOr(all, p));
			return { kind: 'when', node: [union, ...excluded].reduce((all, a) => logicalAnd(all, a)) };
		}
		gaps.push(relation('!=', x, before.value));
	}
	const hull = boundsCondition(intervals[0].lower, intervals[intervals.length - 1].upper, x);
	const atoms = [...(hull ? [hull] : []), ...gaps, ...excluded];
	if (atoms.length === 0) return { kind: 'always' };
	return { kind: 'when', node: atoms.reduce((all, a) => logicalAnd(all, a)) };
}

/**
 * La conjonction de conditions, simplifiée quand elle ne porte que sur UNE
 * lettre : chaque (in)égalité est résolue en cette lettre (`solveInequality`),
 * les ensembles intersectés. Sinon, la conjonction telle quelle.
 *
 * `definedFor` : des expressions qui doivent être DÉFINIES (la solution e/a
 * de ln(ax) = 1 exige a ≠ 0). Leur domaine entre dans la condition ; `null`
 * quand on ne sait pas l'écrire (plusieurs lettres) — l'appelant refuse.
 */
export function parameterCondition(
	conditions: readonly MathNode[],
	definedFor: readonly MathNode[] = []
): ParameterCondition | null {
	const atoms = conditions.flatMap(atomsOf);
	const restricted = definedFor.filter((node) => !definedEverywhere(node));
	if (atoms.length === 0 && restricted.length === 0) return { kind: 'always' };
	const letters = new Set([...atoms, ...restricted].flatMap((node) => [...getVariables(node)]));
	const comparable = atoms.every((a) => isRelation(a) && COMPARISONS.has(a.relation));
	if (letters.size === 1 && comparable) {
		const [letter] = letters;
		let domain: Domain = { kind: 'universal' };
		try {
			for (const node of restricted) {
				const definition = computeDomain(node, letter);
				if (definition.unresolved !== undefined && definition.unresolved.length > 0) {
					throw new Error('domaine non résolu');
				}
				domain = intersect(domain, definition.domain);
			}
			for (const atom of atoms) {
				if (!isRelation(atom)) throw new Error('relation attendue');
				const solved = solveInequality(atom, { variable: letter, strictMode: true });
				domain = intersect(domain, solved.solution);
			}
			const simplified = intervalCondition(domain, letter);
			if (simplified !== null) return simplified;
		} catch {
			// Inéquation non résolue : la condition reste écrite telle quelle
		}
	}
	if (restricted.length > 0) return null;
	return { kind: 'when', node: atoms.reduce((all, atom) => logicalAnd(all, atom)) };
}

// =============================================================================
// Une couche
// =============================================================================

function tidy(node: MathNode): MathNode {
	return denormalize(normalize(node));
}

/** c défini pour toute valeur de chaque paramètre (pas de ln a, √a, 1/a). */
function definedEverywhere(node: MathNode): boolean {
	for (const letter of getVariables(node)) {
		const { domain, unresolved } = computeDomain(node, letter);
		if (!isUniversal(domain) || (unresolved !== undefined && unresolved.length > 0)) return false;
	}
	return true;
}

/** f(u) = c → u = f⁻¹(c), avec la condition d'existence. `null` : f inconnue. */
function peel(core: MathNode, target: MathNode, variable: string): Layer | null {
	const u = P._('u');
	const exp = tryMatch(P.pow(P.lit(euler()), u), core) ?? tryMatch(P.func('exp', [u]), core);
	if (exp) {
		return {
			argument: getBindingNode(exp, 'u') ?? core,
			target: func('ln', [target]),
			condition: relation('>', target, number('0')),
			description: 'On applique ln aux deux membres',
			equationType: 'exponential'
		};
	}
	const power = tryMatch(P.pow(P._('base', P.isFreeOf(variable)), u), core);
	const base = power && getBindingNode(power, 'base');
	const baseValue = base ? computeNumericValue(base) : null;
	if (power && base && baseValue !== null && baseValue > 0 && baseValue !== 1) {
		return {
			argument: getBindingNode(power, 'u') ?? core,
			target: divide(func('ln', [target]), func('ln', [base]), 'fraction'),
			condition: relation('>', target, number('0')),
			description: 'On applique ln aux deux membres',
			equationType: 'exponential'
		};
	}
	// ⚠️ Le motif P.func ignore `base` : indice de racine, base de log (revue
	// #1302 : \sqrt[4]{x} = a rendait a², \log_2 x = a rendait 10ᵃ). On le lit.
	const ln = tryMatch(P.func('ln', [u]), core);
	if (ln && isFunction(core) && core.base === undefined) {
		return {
			argument: getBindingNode(ln, 'u') ?? core,
			target: tidy(superscript(euler(), target)),
			condition: null,
			description: "On applique l'exponentielle aux deux membres",
			equationType: 'logarithmic'
		};
	}
	const log = tryMatch(P.func('log', [u]), core);
	const logBase = log && isFunction(core) ? logarithmBase(core) : null;
	if (log && logBase !== null) {
		return {
			argument: getBindingNode(log, 'u') ?? core,
			target: tidy(superscript(logBase, target)),
			condition: null,
			description: `On élève ${toCustom(logBase)} à la puissance de chaque membre`,
			equationType: 'logarithmic'
		};
	}
	const root = tryMatch(P.func('sqrt', [u]), core);
	const index = root && isFunction(core) ? rootIndex(core) : null;
	if (root && index !== null) {
		const even = index % 2 === 0;
		return {
			argument: getBindingNode(root, 'u') ?? core,
			target: tidy(superscript(target, number(String(index)))),
			// ⁿ√u = c, n impair : u = cⁿ pour tout c ; n pair : c ≥ 0
			condition: even ? relation('>=', target, number('0')) : null,
			description: even
				? `On élève à la puissance ${index}, le second membre devant être positif`
				: `On élève à la puissance ${index}`,
			// Comme √(x + 2) = 3 (chemins des radicaux de solve.ts)
			equationType: 'unknown'
		};
	}
	return null;
}

/** L'indice n d'une racine (2 sans indice), entier ≥ 2 ; `null` sinon. */
function rootIndex(node: FunctionNode): number | null {
	if (node.base === undefined) return 2;
	const value = computeNumericValue(node.base);
	return value !== null && Number.isInteger(value) && value >= 2 ? value : null;
}

/** Le terme en x isolé : T = c. `null` si x apparaît dans plusieurs termes. */
function isolateTerm(
	equation: RelationNode,
	variable: string
): { term: MathNode; target: MathNode } | null {
	const flip = (t: SignedTerm): SignedTerm => ({ ...t, sign: t.sign === '+' ? '-' : '+' });
	const terms = [
		...flattenSumShallow(equation.left),
		...flattenSumShallow(equation.right).map(flip)
	];
	const withVariable = terms.filter((t) => getVariables(t.term).has(variable));
	if (withVariable.length !== 1) return null;
	const [{ sign, term }] = withVariable;
	const others = terms.filter((t) => t !== withVariable[0]);
	// s·T + reste = 0 → T = −s·reste
	const rest = (others.length === 0 ? null : unflattenSum(others)) ?? number('0');
	return { term, target: sign === '+' ? opposite(rest) : rest };
}

// =============================================================================
// Point d'entrée
// =============================================================================

/**
 * Résout `T(x) = c(paramètres)` en ôtant une couche de T, puis en confiant
 * l'équation suivante à `solve`. `null` quand la forme ne s'y prête pas.
 *
 * @param solveFn - `solve`, passé en paramètre pour éviter le cycle d'import
 */
export function tryLiteralParameter(
	equation: RelationNode,
	variable: string,
	opts: SolverOptions,
	solveFn: SolveFn
): SolveResult | null {
	if (layerDepth >= MAX_LAYERS) return null;
	const letters = new Set([...getVariables(equation.left), ...getVariables(equation.right)]);
	letters.delete(variable);
	if (letters.size === 0) return null;

	const isolated = isolateTerm(equation, variable);
	if (isolated === null) return null;

	// Coefficient numérique non nul : il passe dans c. Littéral : refus (V41).
	const factored = tryMatch(
		P.prod(P._('core', P.not(P.isFreeOf(variable))), P.___('coeff', P.isFreeOf(variable))),
		isolated.term
	);
	const core = (factored && getBindingNode(factored, 'core')) ?? isolated.term;
	const coeffBinding = factored?.get('coeff');
	const coeffFactors =
		coeffBinding && isProductSequenceBinding(coeffBinding) ? coeffBinding.factors : [];
	let target = isolated.target;
	if (coeffFactors.length > 0) {
		const coefficient = coeffFactors.reduce((all, f) => multiply(all, f, 'implicit'));
		const value = computeNumericValue(coefficient);
		if (value === null || value === 0) return null;
		target = divide(target, coefficient, 'fraction');
	}
	target = tidy(target);

	const layer = peel(core, target, variable);
	if (layer === null) return null;
	// c défini partout, ou bien la condition de la couche (c > 0, c ≥ 0) porte
	// sur UNE lettre : sa résolution tient compte du domaine de c (eˣ = y/(1 − y)
	// exclut y = 1, √x = ln y exige y > 0). Sinon c pourrait être indéfini
	// sans que rien ne le dise : refus.
	const guarded = layer.condition !== null && letters.size === 1;
	if (!guarded && !definedEverywhere(target)) return null;

	// L'équation suivante reçoit une lettre neuve k à la place de f⁻¹(c), rendue
	// ensuite : la normalisation ne voit jamais ln(c), qu'elle développerait
	// (ln(−y/(y − 1)) → ln(−y) − ln(y − 1), indéfini pour 0 < y < 1)
	const fresh = FRESH_NAMES.find((name) => name !== variable && !letters.has(name));
	if (fresh === undefined) return null;
	const placeholder = variableNode(fresh);
	const restore = (node: MathNode): MathNode =>
		mapNode(node, (n) => (isVariable(n) && n.name === fresh ? layer.target : n));
	const next = equals(layer.argument, layer.target);
	layerDepth++;
	let inner: SolveResult;
	try {
		inner = solveFn(equals(layer.argument, placeholder), { variable, verbosity: opts.verbosity });
	} finally {
		layerDepth--;
	}
	if (isSolverFailure(inner) || inner.status === 'infinite' || inner.periodicSolutions) return null;

	const recorder = createStepRecorder();
	recorder.recordStep('inverse-function', layer.description, equation, next, 'summarized');
	const steps = [...recorder.getStepsFiltered(opts.verbosity), ...inner.steps];
	const { equationType } = layer;

	const solutions: Solution[] = [];
	for (const solution of inner.solutions) {
		const inherited = solution.condition ? restore(solution.condition) : null;
		const conditions = [layer.condition, inherited].filter((c): c is MathNode => c !== null);
		const value = restore(solution.value);
		// La valeur elle-même doit exister : e/a (ln(ax) = 1) exige a ≠ 0
		const condition = parameterCondition(conditions, [value]);
		if (condition === null) return null;
		if (condition.kind === 'never') continue;
		solutions.push({
			value,
			exact: solution.exact,
			...(condition.kind === 'when' && { condition: condition.node })
		});
	}

	if (solutions.length === 0) {
		// Aucune valeur du paramètre ne convient (e^x = −y² − 1) : démontré
		return {
			variable,
			status: 'no-real-solution',
			solutions: [],
			equationType,
			strategy: 'algebraic',
			steps
		};
	}
	return {
		variable,
		status: solutions.length === 1 ? 'unique' : 'multiple',
		solutions,
		equationType,
		strategy: 'algebraic',
		steps
	};
}
