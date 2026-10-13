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

import type { MathNode, RelationNode, RelationType } from '../types';
import type { Solution, SolveOptions, SolveResult, EquationType } from './types';
import { isSolverFailure } from './types';
import {
	divide,
	equals,
	euler,
	func,
	logicalAnd,
	multiply,
	number,
	opposite,
	relation,
	relationChain,
	superscript,
	variable as variableNode
} from '../factory';
import { isInfinity, isLogical, isRelation, isVariable } from '../guards';
import { mapNode } from '../transforms';
import { flattenSumShallow, unflattenSum, flattenRelationChain } from '../flatten';
import type { SignedTerm } from '../flatten';
import { getVariables } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { denormalize, normalize } from '../normal';
import { computeDomain } from '../domain/compute';
import { intersect, isEmpty, isUniversal } from '../domain/algebra';
import type { Domain } from '../domain/types';
import { solveInequality } from './inequality';
import { P } from '../pattern/builder';
import { tryMatch } from '../pattern/match';
import { getBindingNode, isProductSequenceBinding } from '../pattern/types';
import { createStepRecorder } from './step-recorder';

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

const COMPARISONS: ReadonlySet<RelationType> = new Set(['<', '>', '<=', '>=']);

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

/** La condition `letter ∈ intervalle`, écrite comme au tableau. */
function intervalCondition(domain: Domain, letter: string): ParameterCondition | null {
	if (isEmpty(domain)) return { kind: 'never' };
	if (isUniversal(domain)) return { kind: 'always' };
	if (domain.kind !== 'interval_set' || domain.intervals.length !== 1) return null;
	if (domain.excludedPoints.length > 0) return null;
	const { lower, upper } = domain.intervals[0];
	const x = variableNode(letter);
	const lowerOp: RelationType = lower.type === 'open' ? '<' : '<=';
	const upperOp: RelationType = upper.type === 'open' ? '<' : '<=';
	const lowerFinite = !isInfinity(lower.value);
	const upperFinite = !isInfinity(upper.value);
	if (lowerFinite && upperFinite) {
		return { kind: 'when', node: relationChain([lower.value, x, upper.value], [lowerOp, upperOp]) };
	}
	if (lowerFinite) {
		return { kind: 'when', node: relation(lower.type === 'open' ? '>' : '>=', x, lower.value) };
	}
	if (upperFinite) return { kind: 'when', node: relation(upperOp, x, upper.value) };
	return { kind: 'always' };
}

/**
 * La conjonction de conditions, simplifiée quand elle ne porte que sur UNE
 * lettre : chaque inégalité est résolue en cette lettre (`solveInequality`),
 * les ensembles intersectés. Sinon, la conjonction telle quelle.
 */
export function parameterCondition(conditions: readonly MathNode[]): ParameterCondition {
	const atoms = conditions.flatMap(atomsOf);
	if (atoms.length === 0) return { kind: 'always' };
	const letters = new Set(atoms.flatMap((atom) => [...getVariables(atom)]));
	if (letters.size === 1 && atoms.every((a) => isRelation(a) && COMPARISONS.has(a.relation))) {
		const [letter] = letters;
		let domain: Domain = { kind: 'universal' };
		try {
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
	return { kind: 'when', node: atoms.reduce((all, atom) => logicalAnd(all, atom)) };
}

// =============================================================================
// Une couche
// =============================================================================

function tryNumeric(node: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

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
	const baseValue = base ? tryNumeric(base) : null;
	if (power && base && baseValue !== null && baseValue > 0 && baseValue !== 1) {
		return {
			argument: getBindingNode(power, 'u') ?? core,
			target: divide(func('ln', [target]), func('ln', [base]), 'fraction'),
			condition: relation('>', target, number('0')),
			description: 'On applique ln aux deux membres',
			equationType: 'exponential'
		};
	}
	const ln = tryMatch(P.func('ln', [u]), core);
	if (ln) {
		return {
			argument: getBindingNode(ln, 'u') ?? core,
			target: tidy(superscript(euler(), target)),
			condition: null,
			description: "On applique l'exponentielle aux deux membres",
			equationType: 'logarithmic'
		};
	}
	const log = tryMatch(P.func('log', [u]), core);
	if (log) {
		return {
			argument: getBindingNode(log, 'u') ?? core,
			target: tidy(superscript(number('10'), target)),
			condition: null,
			description: 'On élève 10 à la puissance de chaque membre',
			equationType: 'logarithmic'
		};
	}
	const root = tryMatch(P.func('sqrt', [u]), core);
	if (root) {
		return {
			argument: getBindingNode(root, 'u') ?? core,
			target: tidy(superscript(target, number('2'))),
			condition: relation('>=', target, number('0')),
			description: 'On élève au carré, le second membre devant être positif',
			// Comme √(x + 2) = 3 (chemins des radicaux de solve.ts)
			equationType: 'unknown'
		};
	}
	return null;
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
		const value = tryNumeric(coefficient);
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
		const condition = parameterCondition(conditions);
		if (condition.kind === 'never') continue;
		solutions.push({
			value: restore(solution.value),
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
