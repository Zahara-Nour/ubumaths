/**
 * Changement de variable : équations polynomiales EN sin x, cos x, tan x,
 * ln x ou eˣ
 *
 * `sin²x = 1/4`, `2sin²x − sin x = 0`, `e^{2x} − 3eˣ + 2 = 0`, `ln²x = 1` :
 * l'inconnue n'apparaît qu'à travers UNE fonction d'UN argument. On pose
 * u = cette fonction, on résout le polynôme en u, puis on revient à x en
 * résolvant `sin x = u₀` (resp. cos, tan, ln, exp) pour chaque racine u₀.
 *
 * Rien n'est résolu ici : le polynôme en u ET chaque retour à x passent par
 * `solve`, donc par les solveurs existants — racines du polynôme, solutions
 * générales trigonométriques (+ 2kπ, + kπ), domaines (|u| ≤ 1 pour sin/cos,
 * u > 0 pour eˣ, x > 0 pour ln x). Les familles périodiques obtenues sont
 * réunies (`mergePeriodicFamilies`).
 *
 * Pour l'exponentielle, `e^{2x}` se lit `(eˣ)²` : les exposants doivent être
 * des multiples entiers positifs d'un même argument.
 *
 * @module mathAST/solve/substitution
 */

import type { MathNode, RelationNode } from '../types';
import type { PeriodicSolutionFamily, Solution, SolveOptions, SolveResult } from './types';
import { isSolverFailure } from './types';
import { isEulerConstant, isFunction, isNumber, isSuperscript } from '../guards';
import {
	divide,
	equals,
	euler,
	func,
	number,
	superscript,
	variable as variableNode
} from '../factory';
import { findNodes, mapNode } from '../transforms';
import { getVariables } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { normalize, denormalize } from '../normal';
import { nodesEqual } from '../normal/hash';
import { isPolynomialIn } from './classify';
import { createStepRecorder } from './step-recorder';
import { getRuleDescription } from './descriptions-fr';
import { mergePeriodicFamilies } from './periodic';

// =============================================================================
// Types
// =============================================================================

type AtomKind = 'sin' | 'cos' | 'tan' | 'ln' | 'exp';

type SolveFn = (equation: RelationNode, options?: SolveOptions) => SolveResult;

type SolverOptions = Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>>;

/** L'atome repéré : sa fonction et l'argument commun. */
interface AtomFamily {
	readonly kind: AtomKind;
	readonly argument: MathNode;
}

// =============================================================================
// Constantes
// =============================================================================

const SUBSTITUTABLE: readonly AtomKind[] = ['sin', 'cos', 'tan', 'ln', 'exp'];

/** Noms candidats pour la nouvelle inconnue (`e` et `i` sont des constantes). */
const FRESH_NAMES = ['u', 't', 'w', 'v', 'z'] as const;

/** Garde de récursion : chaque retour à x rappelle `solve`. */
const MAX_SUBSTITUTION_DEPTH = 2;

// =============================================================================
// Variables
// =============================================================================

let substitutionDepth = 0;

// =============================================================================
// Repérage de l'atome
// =============================================================================

function isAtomKind(name: string): name is AtomKind {
	return SUBSTITUTABLE.some((kind) => kind === name);
}

function dependsOn(node: MathNode, name: string): boolean {
	return getVariables(node).has(name);
}

/** `(kind, argument)` si le nœud est un atome candidat dépendant de l'inconnue. */
function readAtom(
	node: MathNode,
	name: string
): { readonly kind: AtomKind; readonly argument: MathNode } | null {
	if (isFunction(node)) {
		const kind = node.name;
		if (!isAtomKind(kind) || node.args.length !== 1) return null;
		if (node.base !== undefined || node.derivativeOrder !== undefined || node.isInverse)
			return null;
		if (!dependsOn(node.args[0], name)) return null;
		return { kind, argument: node.args[0] };
	}
	if (isSuperscript(node) && isEulerConstant(node.base) && dependsOn(node.superscript, name)) {
		return { kind: 'exp', argument: node.superscript };
	}
	return null;
}

/** Entier positif `n` tel que `argument = n · base`, sinon `null`. */
function integerMultiple(argument: MathNode, base: MathNode): number | null {
	if (nodesEqual(argument, base)) return 1;
	try {
		const ratio = denormalize(normalize(divide(argument, base, 'fraction')));
		if (getVariables(ratio).size !== 0) return null;
		const value = evaluateNodeToApproximatedNumber(ratio);
		const n = Math.round(value);
		return Math.abs(value - n) < 1e-12 && n >= 1 ? n : null;
	} catch {
		return null;
	}
}

/** Exposant entier positif porté par `sin²(x)` (champ `power`), sinon `null`. */
function functionPower(node: MathNode): number | null {
	if (!isFunction(node) || node.power === undefined) return 1;
	if (!isNumber(node.power)) return null;
	const n = Number(node.power.value);
	return Number.isInteger(n) && n >= 1 ? n : null;
}

/**
 * La famille d'atomes commune à toute l'expression, ou `null` : deux
 * fonctions différentes (`sin²x + cos²x`), deux arguments sans lien
 * (`sin 2x − sin x`) ou un atome dans l'argument d'un autre (`e^{sin x}`).
 */
function findAtomFamily(expr: MathNode, name: string): AtomFamily | null {
	const atoms = findNodes(expr, (n) => readAtom(n, name) !== null).flatMap((n) => {
		const atom = readAtom(n, name);
		return atom === null ? [] : [atom];
	});
	if (atoms.length === 0) return null;

	const kind = atoms[0].kind;
	if (atoms.some((a) => a.kind !== kind)) return null;

	if (kind !== 'exp') {
		const argument = atoms[0].argument;
		return atoms.every((a) => nodesEqual(a.argument, argument)) ? { kind, argument } : null;
	}

	// Exponentielle : l'argument de base est celui dont tous les autres sont
	// des multiples entiers (`2x` et `x` → base `x`).
	for (const candidate of atoms) {
		if (atoms.every((a) => integerMultiple(a.argument, candidate.argument) !== null)) {
			return { kind, argument: candidate.argument };
		}
	}
	return null;
}

// =============================================================================
// Réécriture en u
// =============================================================================

/** L'expression écrite en u, ou `null` si un atome ne s'y prête pas. */
function substituteAtom(
	expr: MathNode,
	name: string,
	family: AtomFamily,
	fresh: string
): MathNode | null {
	let failed = false;
	const u = variableNode(fresh);
	const rewritten = mapNode(expr, (node) => {
		const atom = readAtom(node, name);
		if (atom === null) return node;
		const multiple = integerMultiple(atom.argument, family.argument);
		const power = functionPower(node);
		if (multiple === null || power === null) {
			failed = true;
			return node;
		}
		const exponent = multiple * power;
		return exponent === 1 ? u : superscript(u, number(String(exponent)));
	});
	if (failed || dependsOn(rewritten, name)) return null;
	return rewritten;
}

/** L'atome lui-même, `sin(A)` ou `e^A`, pour le retour à x. */
function atomNode(family: AtomFamily): MathNode {
	return family.kind === 'exp'
		? superscript(euler(), family.argument)
		: func(family.kind, [family.argument]);
}

function freshName(expr: MathNode, name: string): string | null {
	const used = getVariables(expr);
	return FRESH_NAMES.find((n) => n !== name && !used.has(n)) ?? null;
}

// =============================================================================
// API
// =============================================================================

/**
 * Résoudre `expr = 0` par le changement de variable u = f(A), f ∈ {sin, cos,
 * tan, ln, exp}, quand l'expression est un polynôme en u.
 *
 * ⚠️ **Un échec n'est jamais « pas de solution ».** Si le polynôme en u, ou un
 * seul des retours à x, n'est pas résolu, on rend `null` : l'appelant garde son
 * échec. Une absence de solution n'est rendue que DÉMONTRÉE (racines en u
 * toutes hors de l'image de f, comme `sin²x = 2`).
 *
 * @param solveFn - `solve`, passé en paramètre pour éviter le cycle d'import
 * @returns SolveResult si le changement de variable aboutit, `null` sinon
 */
export function trySubstitution(
	expr: MathNode,
	variable: string,
	opts: SolverOptions,
	solveFn: SolveFn
): SolveResult | null {
	if (substitutionDepth >= MAX_SUBSTITUTION_DEPTH) return null;

	const family = findAtomFamily(expr, variable);
	if (family === null) return null;

	const fresh = freshName(expr, variable);
	if (fresh === null) return null;

	const inU = substituteAtom(expr, variable, family, fresh);
	if (inU === null || !isPolynomialIn(inU, fresh)) return null;

	const atom = atomNode(family);
	const recorder = createStepRecorder();
	recorder.recordStep(
		'change-of-variable',
		getRuleDescription('change-of-variable'),
		expr,
		equals(inU, number('0')),
		'summarized',
		equals(variableNode(fresh), atom)
	);

	substitutionDepth++;
	try {
		const uResult = solveFn(equals(inU, number('0')), {
			variable: fresh,
			verbosity: opts.verbosity
		});
		if (isSolverFailure(uResult) || uResult.status === 'infinite') return null;

		const solutions: Solution[] = [];
		const families: PeriodicSolutionFamily[] = [];
		let withoutFamily = false;

		for (const uSolution of uResult.solutions) {
			let uValue: number;
			try {
				uValue = uSolution.approximate ?? evaluateNodeToApproximatedNumber(uSolution.value);
			} catch {
				return null;
			}
			if (!Number.isFinite(uValue)) return null;

			const back = equals(atom, uSolution.value);
			const backResult = solveFn(back, { variable, verbosity: opts.verbosity });
			if (isSolverFailure(backResult) || backResult.status === 'infinite') return null;

			recorder.recordStep(
				'change-of-variable-back',
				getRuleDescription('change-of-variable-back'),
				back,
				back,
				'detailed'
			);

			solutions.push(...backResult.solutions);
			if (backResult.periodicSolutions) families.push(backResult.periodicSolutions);
			else if (backResult.solutions.length > 0) withoutFamily = true;
		}

		const steps = [...recorder.getStepsFiltered(opts.verbosity)];
		const equationType =
			family.kind === 'exp'
				? 'exponential'
				: family.kind === 'ln'
					? 'logarithmic'
					: 'trigonometric';

		if (solutions.length === 0) {
			return {
				variable,
				status: 'no-solution',
				solutions: [],
				equationType,
				strategy: 'algebraic',
				steps
			};
		}

		// Familles périodiques : on les réunit. Si la réunion échoue, ou si un
		// retour à x a rendu des solutions sans famille, on n'attache RIEN —
		// une famille partielle ferait perdre des zéros au module de signe.
		const merged = families.length > 0 && !withoutFamily ? mergePeriodicFamilies(families) : null;
		if (families.length > 0 && merged === null) return null;

		const finalSolutions = merged ? [...merged.baseSolutions] : dedupe(solutions);
		return {
			variable,
			status: finalSolutions.length === 1 ? 'unique' : 'multiple',
			solutions: finalSolutions,
			equationType,
			strategy: 'algebraic',
			steps,
			...(merged ? { periodicSolutions: merged } : {})
		};
	} finally {
		substitutionDepth--;
	}
}

/** Dédoublonnage numérique, ordre croissant. */
function dedupe(solutions: readonly Solution[]): Solution[] {
	const withValues = solutions.map((s) => {
		let numeric: number;
		try {
			numeric = s.approximate ?? evaluateNodeToApproximatedNumber(s.value);
		} catch {
			numeric = Number.NaN;
		}
		return { solution: { ...s, approximate: numeric }, numeric };
	});
	const kept: typeof withValues = [];
	for (const item of withValues) {
		if (kept.some((k) => Math.abs(k.numeric - item.numeric) < 1e-10)) continue;
		kept.push(item);
	}
	return kept.sort((a, b) => a.numeric - b.numeric).map((k) => k.solution);
}
