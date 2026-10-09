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
 * des multiples entiers positifs d'un même argument. Une base constante aussi :
 * `4^x − 3·2^x + 2 = 0` se lit en X = 2ˣ (4ˣ = (2ˣ)², 8ˣ = (2ˣ)³).
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
	multiply,
	number,
	opposite,
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
import { extractLinearForm } from '../analysis/coefficient-utils';

// =============================================================================
// Types
// =============================================================================

type AtomKind = 'sin' | 'cos' | 'tan' | 'ln' | 'exp';

type SolveFn = (equation: RelationNode, options?: SolveOptions) => SolveResult;

type SolverOptions = Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>>;

/**
 * L'atome repéré : sa fonction et l'argument commun. `base` : la base
 * constante d'une puissance aᵘ (`2^x`, `4^x`) ; absente pour eᵘ.
 */
interface AtomFamily {
	readonly kind: AtomKind;
	readonly argument: MathNode;
	readonly base?: MathNode;
	/**
	 * Exposants affines de même pente, à une constante près : `2^(x+1)` =
	 * 2·2ˣ, `2^(−x)` = 1/2ˣ. L'équation en X devient RATIONNELLE.
	 */
	readonly affine?: true;
}

/** Un exposant affine `p·x + q` lu en base e : pente `p·ln a`. */
interface AffineShape {
	readonly offset: MathNode | null;
	readonly slope: number;
}

// =============================================================================
// Constantes
// =============================================================================

const SUBSTITUTABLE: readonly AtomKind[] = ['sin', 'cos', 'tan', 'ln', 'exp'];

/** Noms candidats pour la nouvelle inconnue (`e` et `i` sont des constantes). */
const FRESH_NAMES = ['u', 't', 'w', 'v', 'z'] as const;

/** Plus grande puissance de X acceptée par la lecture affine (`8^x` = X³). */
const MAX_AFFINE_MULTIPLE = 6;

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

/** Une base constante utilisable : sans lettre, > 0, ≠ 1 (`2`, `4`, `0.5`). */
function isConstantBase(node: MathNode): boolean {
	if (getVariables(node).size > 0) return false;
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isFinite(value) && value > 0 && Math.abs(value - 1) > 1e-12;
	} catch {
		return false;
	}
}

/** `(kind, argument[, base])` si le nœud est un atome candidat dépendant de l'inconnue. */
function readAtom(node: MathNode, name: string): AtomFamily | null {
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
	// aᵘ, base constante : `4^x − 3·2^x + 2 = 0` se lit en X = 2ˣ (2026-10-09)
	if (isSuperscript(node) && isConstantBase(node.base) && dependsOn(node.superscript, name)) {
		return { kind: 'exp', argument: node.superscript, base: node.base };
	}
	return null;
}

/**
 * L'exposant ramené à la base e : `u·ln a` pour aᵘ, `u` pour eᵘ. Deux atomes
 * sont de la même famille quand ces exposants sont multiples entiers l'un de
 * l'autre — 4ˣ = (2ˣ)², 8ˣ = (2ˣ)³ ; 2ˣ et 3ˣ, sans lien, ne le sont pas.
 */
function exponentInBaseE(atom: AtomFamily): MathNode {
	return atom.base === undefined
		? atom.argument
		: multiply(atom.argument, func('ln', [atom.base]), 'implicit');
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
	// des multiples entiers (`2x` et `x` → base `x` ; `4^x` et `2^x` → `2^x`).
	for (const candidate of atoms) {
		const reference = exponentInBaseE(candidate);
		if (atoms.every((a) => integerMultiple(exponentInBaseE(a), reference) !== null)) {
			return candidate;
		}
	}
	return affineFamily(atoms, name);
}

/** L'exposant affine `p·x + q` d'un atome eᵘ / aᵘ, pente lue en base e ; sinon `null`. */
function affineShape(atom: AtomFamily, name: string): AffineShape | null {
	const form = extractLinearForm(atom.argument, name);
	if (form === null || dependsOn(form.coefficient, name)) return null;
	if (form.offset !== null && dependsOn(form.offset, name)) return null;
	try {
		const p = evaluateNodeToApproximatedNumber(form.coefficient);
		const lnA = atom.base === undefined ? 1 : Math.log(evaluateNodeToApproximatedNumber(atom.base));
		const slope = p * lnA;
		return Number.isFinite(slope) && Math.abs(slope) > 1e-12
			? { offset: form.offset, slope }
			: null;
	} catch {
		return null;
	}
}

/** L'entier non nul m tel que `slope = m·reference`, sinon `null`. */
function slopeMultiple(slope: number, reference: number): number | null {
	const ratio = slope / reference;
	const m = Math.round(ratio);
	return m !== 0 && Math.abs(ratio - m) < 1e-9 && Math.abs(m) <= MAX_AFFINE_MULTIPLE ? m : null;
}

/**
 * Exposants affines dont les pentes sont multiples entiers (signés) d'une
 * même pente : `2ˣ + 2^(x+1)`, `2^(−x) + 2ˣ`, `3^(x+1) − 3ˣ`. La référence est
 * l'atome de plus petite pente POSITIVE (X = 2ˣ, pas 2^(−x)).
 */
function affineFamily(atoms: readonly AtomFamily[], name: string): AtomFamily | null {
	const shapes = atoms.map((a) => affineShape(a, name));
	if (shapes.some((shape) => shape === null)) return null;
	let reference: number | null = null;
	shapes.forEach((shape, i) => {
		if (shape === null || shape.slope <= 0) return;
		if (reference === null || shape.slope < (shapes[reference]?.slope ?? Infinity)) reference = i;
	});
	if (reference === null) return null;
	const referenceShape = shapes[reference];
	if (referenceShape === null || referenceShape === undefined) return null;
	if (shapes.some((s) => s === null || slopeMultiple(s.slope, referenceShape.slope) === null)) {
		return null;
	}
	return { ...atoms[reference], affine: true };
}

/** `base^exponent`, e compris (`base` absente). */
function powerOf(base: MathNode | undefined, exponent: MathNode): MathNode {
	return superscript(base ?? euler(), exponent);
}

/**
 * Un atome de la famille affine, écrit en X : a^(p·x + q) = a^q · a_ref^(−m·q_ref) · X^m
 * (X = a_ref^(p_ref·x + q_ref)). `null` s'il ne s'y prête pas.
 */
function affineAtomInX(
	atom: AtomFamily,
	family: AtomFamily,
	name: string,
	x: MathNode
): MathNode | null {
	const shape = affineShape(atom, name);
	const reference = affineShape(family, name);
	if (shape === null || reference === null) return null;
	const m = slopeMultiple(shape.slope, reference.slope);
	if (m === null) return null;
	const factors: MathNode[] = [];
	if (shape.offset !== null) factors.push(powerOf(atom.base, shape.offset));
	if (reference.offset !== null) {
		const scaled = multiply(number(String(Math.abs(m))), reference.offset, 'implicit');
		factors.push(powerOf(family.base, m > 0 ? opposite(scaled) : scaled));
	}
	const xPower = Math.abs(m) === 1 ? x : superscript(x, number(String(Math.abs(m))));
	const inX = m > 0 ? xPower : divide(number('1'), xPower, 'fraction');
	if (factors.length === 0) return inX;
	const product = factors.reduce((acc, f) => multiply(acc, f, 'implicit'));
	// `normalize` laisse 3·3^(−1·1) tel quel : la constante (> 0) est écrite en
	// fraction quand elle en est une — 3^(x+1) = 3·X, 2^(x−1) = X/2
	const constant = smallFraction(product) ?? denormalize(normalize(product));
	return multiply(constant, inX, 'implicit');
}

/** Plus grand dénominateur cherché pour écrire une constante en fraction. */
const MAX_CONSTANT_DENOMINATOR = 1000;

/** Une constante positive écrite `p` ou `p/q` si c'en est une, sinon `null`. */
function smallFraction(node: MathNode): MathNode | null {
	let value: number;
	try {
		value = evaluateNodeToApproximatedNumber(node);
	} catch {
		return null;
	}
	if (!Number.isFinite(value) || value <= 0) return null;
	for (let q = 1; q <= MAX_CONSTANT_DENOMINATOR; q++) {
		const p = Math.round(value * q);
		if (p >= 1 && Math.abs(value * q - p) < 1e-9 * q) {
			return q === 1 ? number(String(p)) : divide(number(String(p)), number(String(q)), 'fraction');
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
		if (family.affine) {
			const inX = affineAtomInX(atom, family, name, u);
			if (inX === null) failed = true;
			return inX ?? node;
		}
		const multiple =
			family.kind === 'exp'
				? integerMultiple(exponentInBaseE(atom), exponentInBaseE(family))
				: integerMultiple(atom.argument, family.argument);
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

/** L'atome lui-même, `sin(A)`, `e^A` ou `a^A`, pour le retour à x. */
function atomNode(family: AtomFamily): MathNode {
	return family.kind === 'exp'
		? superscript(family.base ?? euler(), family.argument)
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
	// Famille affine : 2^(−x) = 1/X, l'équation en X peut être rationnelle
	if (inU === null || (!family.affine && !isPolynomialIn(inU, fresh))) return null;

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
			// Une famille périodique, c'est une infinité de solutions.
			status: finalSolutions.length === 1 && !merged ? 'unique' : 'multiple',
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
