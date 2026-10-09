/**
 * `cos a = cos b`, `sin a = sin b`, `tan a = tan b` (1re / Tle)
 *
 * `.résoudre cos(2x)=cos(x)` revenait « Je ne sais pas encore résoudre cette
 * équation. » (revue, 2026-10-09). Le cours dit :
 *   cos a = cos b ⇔ a = b + 2kπ ou a = −b + 2kπ
 *   sin a = sin b ⇔ a = b + 2kπ ou a = π − b + 2kπ
 *   tan a = tan b ⇔ a = b + kπ (a et b hors des π/2 + kπ)
 *
 * Les formes voisines s'y ramènent : sin u = cos v ⇔ cos(π/2 − u) = cos v ;
 * −cos v = cos(π − v) ; −sin v = sin(−v) ; −tan v = tan(−v).
 *
 * Plutôt que de résoudre des équations à paramètre k, on factorise la
 * différence (formules de transformation, équivalences exactes) :
 *   cos a − cos b = −2 sin((a+b)/2) · sin((a−b)/2)
 *   sin a − sin b =  2 cos((a+b)/2) · sin((a−b)/2)
 *   tan a − tan b = sin(a − b) / (cos a · cos b)
 * puis `solve` résout le produit nul : chaque facteur donne sa famille, et
 * `mergePeriodicFamilies` les réunit (2kπ ⊂ 2kπ/3 pour cos 2x = cos x).
 * Les deux familles du cours sont exactement les zéros des deux facteurs ;
 * elles restent l'écriture affichée (`displayFamilies`), sauf inclusion.
 *
 * Tangente : les zéros de sin(a − b) où cos a ou cos b s'annule ne sont pas
 * des solutions. On les retire quand ils forment une sous-famille périodique
 * (tan 3x = tan x : kπ/2 privé de π/2 + kπ = kπ) ; sinon on rend la main.
 *
 * @module mathAST/solve/trig-equality
 */

import type { MathNode, RelationNode } from '../types';
import type { PeriodicSolutionFamily, Solution, SolveOptions, SolveResult } from './types';
import { isSolverFailure } from './types';
import {
	add,
	divide,
	equals,
	func,
	multiply,
	number,
	opposite,
	PI,
	subtract,
	variable as variableNode
} from '../factory';
import { denormalize, normalize } from '../normal';
import { getVariables, substitute } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { flattenSumShallow, type SignedTerm } from '../flatten';
import { readTrigTerm, type TrigTerm } from './sin-cos-ratio';
import { mergePeriodicFamilies } from './periodic';
import { createStepRecorder } from './step-recorder';

type SolveFn = (equation: RelationNode, options?: SolveOptions) => SolveResult;
type TrigName = 'sin' | 'cos' | 'tan';

interface Side {
	readonly name: TrigName;
	readonly argument: MathNode;
}

const NAMES: readonly TrigName[] = ['cos', 'sin', 'tan'];
const TOLERANCE = 1e-9;
/** Congruence de deux points d'une famille (valeurs approchées). */
const POINT_TOLERANCE = 1e-7;
/** Périodes parcourues pour vérifier qu'un motif de pôles se répète. */
const POLE_SCAN = 24;
/** Plus grand multiple essayé d'une période (période commune, motif de pôles). */
const MAX_MULTIPLE = 24;
/** Ici seulement, la période réunie se divise aussi par 3 (cos 2x = cos x → 2kπ/3). */
const MERGE = { divisors: [2, 3] } as const;

function numeric(node: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

function simplified(node: MathNode): MathNode {
	return denormalize(normalize(node));
}

function congruent(a: number, b: number, period: number): boolean {
	const r = (((a - b) % period) + period) % period;
	return r < POINT_TOLERANCE || period - r < POINT_TOLERANCE;
}

// =============================================================================
// Lecture : f(a) = g(b), ramené à une seule fonction
// =============================================================================

function readAny(term: SignedTerm, variable: string): { name: TrigName; read: TrigTerm } | null {
	for (const name of NAMES) {
		const read = readTrigTerm(term, name, variable, false);
		if (read) return { name, read };
	}
	return null;
}

/** −f(v) écrit f(v') : −cos v = cos(π − v), −sin v = sin(−v), −tan v = tan(−v) */
function negated(side: Side): Side {
	return side.name === 'cos'
		? { name: 'cos', argument: simplified(subtract(PI, side.argument)) }
		: { name: side.name, argument: simplified(opposite(side.argument)) };
}

/** sin u = cos(π/2 − u) */
function asCosine(side: Side): Side {
	return side.name === 'sin'
		? {
				name: 'cos',
				argument: simplified(subtract(divide(PI, number('2'), 'fraction'), side.argument))
			}
		: side;
}

/**
 * `k·f(a) ± k·g(b)` (k constant non nul) lu comme f(a) = f(b'), une seule
 * fonction des deux côtés ; `null` sinon.
 */
function readEquality(
	expr: MathNode,
	variable: string
): { name: TrigName; a: MathNode; b: MathNode } | null {
	const terms = flattenSumShallow(expr);
	if (terms.length !== 2) return null;
	const first = readAny(terms[0], variable);
	const second = readAny(terms[1], variable);
	if (first === null || second === null) return null;
	const k1 = numeric(first.read.coefficient);
	const k2 = numeric(second.read.coefficient);
	if (k1 === null || k2 === null || Math.abs(k1) < TOLERANCE) return null;
	const scale = TOLERANCE * Math.max(1, Math.abs(k1));
	const differenceForm = Math.abs(k1 + k2) <= scale;
	const sumForm = Math.abs(k1 - k2) <= scale;
	if (!differenceForm && !sumForm) return null;

	let left: Side = { name: first.name, argument: first.read.argument };
	// k·f(a) − k·g(b) : f(a) = g(b) ; k·f(a) + k·g(b) : f(a) = −g(b)
	let right: Side = { name: second.name, argument: second.read.argument };
	if (sumForm) right = negated(right);

	if (left.name !== right.name) {
		if (left.name === 'tan' || right.name === 'tan') return null;
		[left, right] = [asCosine(left), asCosine(right)];
	}
	if (!getVariables(left.argument).has(variable) && !getVariables(right.argument).has(variable)) {
		return null;
	}
	return { name: left.name, a: left.argument, b: right.argument };
}

/**
 * L'argument d'un facteur, coefficient de l'inconnue rendu positif : sin(−d)
 * et sin(d) (cos aussi) ont les mêmes zéros. ⚠️ Sur main, `sin(π/4 − x) = 0`
 * rend « S = {−3π/4 ; π/4} » SANS sa période (revue 2026-10-09) : on ne
 * passe pas par cette écriture.
 */
function canonical(argument: MathNode, variable: string): MathNode {
	// a·x + b lu par ses valeurs en 0 et 1 (la forme réduite place π devant,
	// où `extractLinearForm` ne le lit pas), linéarité vérifiée en 2 et −3
	const at = (x: number) => substitute(argument, { [variable]: x });
	const offset = simplified(at(0));
	const coefficient = simplified(subtract(at(1), at(0)));
	const b = numeric(offset);
	const slope = numeric(coefficient);
	if (b === null || slope === null || Math.abs(slope) < TOLERANCE) return argument;
	const linear = [2, -3].every((x) => {
		const value = numeric(at(x));
		return (
			value !== null && Math.abs(value - (slope * x + b)) < 1e-9 * Math.max(1, Math.abs(value))
		);
	});
	if (!linear) return argument;
	// L'inconnue d'abord, coefficient positif
	const negative = slope < 0;
	const term = multiply(
		negative ? simplified(opposite(coefficient)) : coefficient,
		variableNode(variable),
		'implicit'
	);
	if (Math.abs(b) < TOLERANCE) return term;
	return negative ? subtract(term, offset) : add(term, offset);
}

// =============================================================================
// Résolution
// =============================================================================

/**
 * Résoudre `expr = 0` quand c'est `k·f(a) ± k·g(b)` (f, g = sin, cos ou tan,
 * k constant non nul, l'inconnue dans a ou b). `null` sinon, ou si le produit
 * n'est pas résolu : l'appelant garde son échec.
 */
export function tryTrigEquality(
	expr: MathNode,
	variable: string,
	options: Pick<SolveOptions, 'verbosity'>,
	solveFn: SolveFn
): SolveResult | null {
	const equality = readEquality(expr, variable);
	if (equality === null) return null;
	const { name, a, b } = equality;

	const half = (node: MathNode) => simplified(divide(node, number('2'), 'fraction'));
	const sum = half(add(a, b));
	const difference = half(subtract(a, b));
	// cos : sin((a+b)/2)·sin((a−b)/2) ; sin : cos((a+b)/2)·sin((a−b)/2) ; tan : sin(a − b)
	const factors: MathNode[] =
		name === 'tan'
			? [func('sin', [canonical(simplified(subtract(a, b)), variable)])]
			: [
					func(name === 'cos' ? 'sin' : 'cos', [canonical(sum, variable)]),
					func('sin', [canonical(difference, variable)])
				];

	// Un facteur sans l'inconnue : non nul, on l'ôte ; nul, l'équation est
	// une identité (cos x = cos(−x)) — on rend la main
	const kept: MathNode[] = [];
	for (const factor of factors) {
		if (getVariables(factor).has(variable)) {
			kept.push(factor);
			continue;
		}
		const value = numeric(factor);
		if (value === null || Math.abs(value) < TOLERANCE) return null;
	}
	if (kept.length === 0) return null;

	// Chaque branche doit rendre SA famille : une branche résolue en un nombre
	// fini de solutions perdrait sa période dans la réunion
	const branches: PeriodicSolutionFamily[] = [];
	for (const factor of kept) {
		const branch = solveFn(equals(factor, number('0')), {
			variable,
			verbosity: options.verbosity
		});
		if (isSolverFailure(branch)) return null;
		if (branch.status === 'no-solution' || branch.status === 'no-real-solution') continue;
		if (branch.periodicSolutions === undefined) return null;
		branches.push(branch.periodicSolutions);
	}
	if (branches.length === 0) return null;

	const product = kept.reduce((acc, factor) => multiply(acc, factor, 'implicit'));
	const reduced = equals(product, number('0'));
	const solved = solveFn(reduced, { variable, verbosity: options.verbosity });
	if (isSolverFailure(solved)) return null;

	// La famille du produit est EXACTEMENT la réunion des branches
	if (solved.periodicSolutions === undefined) return null;
	if (!sameSet([solved.periodicSolutions], branches)) return null;

	const result = name === 'tan' ? withoutPoles(solved, [a, b], variable) : shortened(solved);
	if (result === null) return null;

	const recorder = createStepRecorder();
	const description =
		name === 'cos'
			? 'cos a = cos b ⇔ a = b + 2kπ ou a = −b + 2kπ : on factorise cos a − cos b'
			: name === 'sin'
				? 'sin a = sin b ⇔ a = b + 2kπ ou a = π − b + 2kπ : on factorise sin a − sin b'
				: 'tan a = tan b ⇔ a = b + kπ, hors des valeurs interdites';
	recorder.recordStep(`${name}-equality`, description, expr, reduced, 'summarized');
	const displayFamilies = name === 'tan' ? undefined : branchFamilies(branches, result);
	return {
		...result,
		...(displayFamilies ? { displayFamilies } : {}),
		steps: [...recorder.getStepsFiltered(options.verbosity ?? 'summarized'), ...result.steps]
	};
}

/** La famille réunie, période divisée par 2 ou 3 si l'ensemble le permet. */
function shortened(result: SolveResult): SolveResult {
	const family = result.periodicSolutions;
	if (family === undefined) return result;
	const short = mergePeriodicFamilies([family], MERGE);
	return short === null ? result : { ...result, periodicSolutions: short };
}

// =============================================================================
// Tangente : les pôles retirés de la famille
// =============================================================================

function baseNumeric(solution: Solution): number | null {
	return solution.approximate ?? numeric(solution.value);
}

/**
 * La famille privée des points où cos a ou cos b s'annule. On cherche un
 * multiple M de la période sur lequel le motif « pôle / solution » se répète
 * (vérifié sur ±24 périodes) : les points non pôles sur M forment la famille.
 * `null` si aucun motif simple, ou s'il ne reste rien.
 */
function withoutPoles(
	result: SolveResult,
	tangentArguments: readonly MathNode[],
	variable: string
): SolveResult | null {
	const isPole = (x: number): boolean =>
		tangentArguments.some((argument) => {
			const at = numeric(substitute(argument, { [variable]: x }));
			return at === null || Math.abs(Math.cos(at)) < 1e-9;
		});

	const family = result.periodicSolutions;
	if (family === undefined) {
		const poleFree = result.solutions.every((s) => {
			const x = baseNumeric(s);
			return x !== null && !isPole(x);
		});
		return poleFree ? result : null;
	}

	const T = family.periodNumeric;
	const bases: { solution: Solution; x: number }[] = [];
	for (const solution of family.baseSolutions) {
		const x = baseNumeric(solution);
		if (x === null) return null;
		bases.push({ solution, x });
	}

	for (let m = 1; m <= MAX_MULTIPLE; m++) {
		const M = m * T;
		const candidates = bases.flatMap(({ solution, x }) =>
			Array.from({ length: m }, (_, k) => ({ solution, k, x: x + k * T }))
		);
		const repeats = candidates.every(({ x }) => {
			const pole = isPole(x);
			for (let j = -POLE_SCAN; j <= POLE_SCAN; j++) if (isPole(x + j * M) !== pole) return false;
			return true;
		});
		if (!repeats) continue;
		const kept = candidates.filter(({ x }) => !isPole(x));
		if (kept.length === 0) return null;
		if (kept.length === candidates.length) return shortened(result);

		const period = simplified(multiply(number(String(m)), family.period, 'implicit'));
		const baseSolutions: Solution[] = kept.map(({ solution, k, x }) => ({
			...solution,
			value:
				k === 0
					? solution.value
					: simplified(add(solution.value, multiply(number(String(k)), family.period, 'implicit'))),
			approximate: x
		}));
		const raw: PeriodicSolutionFamily = { baseSolutions, period, periodNumeric: M };
		const periodicSolutions = mergePeriodicFamilies([raw], MERGE) ?? raw;
		return {
			...result,
			status: 'multiple',
			solutions: periodicSolutions.baseSolutions,
			periodicSolutions
		};
	}
	return null;
}

// =============================================================================
// L'écriture du manuel : une famille par branche (2026-10-09)
// =============================================================================

function baseValue(family: PeriodicSolutionFamily, index: number): number | null {
	return baseNumeric(family.baseSolutions[index]);
}

/** A ⊂ B : la période de A est un multiple de celle de B, et ses bases tombent dans B. */
function includedIn(a: PeriodicSolutionFamily, b: PeriodicSolutionFamily): boolean {
	const ratio = a.periodNumeric / b.periodNumeric;
	if (Math.abs(ratio - Math.round(ratio)) > 1e-9 || Math.round(ratio) < 1) return false;
	return a.baseSolutions.every((_, i) => {
		const x = baseValue(a, i);
		return (
			x !== null &&
			b.baseSolutions.some((__, j) => {
				const y = baseValue(b, j);
				return y !== null && congruent(x, y, b.periodNumeric);
			})
		);
	});
}

/** La plus petite période multiple de TOUTES les périodes (au plus 24 fois la plus longue). */
function commonPeriod(periods: readonly number[]): number | null {
	const longest = Math.max(...periods);
	for (let m = 1; m <= MAX_MULTIPLE; m++) {
		const candidate = m * longest;
		const divides = periods.every((p) => {
			const ratio = candidate / p;
			return Math.abs(ratio - Math.round(ratio)) < 1e-9;
		});
		if (divides) return candidate;
	}
	return null;
}

/** Les points d'une famille sur une période commune M (multiple exact de la sienne), ou `null`. */
function pointsOver(family: PeriodicSolutionFamily, M: number): number[] | null {
	const copies = Math.round(M / family.periodNumeric);
	if (copies < 1 || Math.abs(copies * family.periodNumeric - M) > 1e-9 * Math.max(1, M)) {
		return null;
	}
	const points: number[] = [];
	for (let i = 0; i < family.baseSolutions.length; i++) {
		const x = baseValue(family, i);
		if (x === null) return null;
		for (let k = 0; k < copies; k++) points.push(x + k * family.periodNumeric);
	}
	return points;
}

/** Deux réunions de familles : le même ensemble, point à point sur une période commune exacte. */
function sameSet(
	left: readonly PeriodicSolutionFamily[],
	right: readonly PeriodicSolutionFamily[]
): boolean {
	const M = commonPeriod([...left, ...right].map((f) => f.periodNumeric));
	if (M === null) return false;
	const points = (families: readonly PeriodicSolutionFamily[]): number[] | null => {
		const all: number[] = [];
		for (const family of families) {
			const p = pointsOver(family, M);
			if (p === null) return null;
			all.push(...p);
		}
		return all;
	};
	const l = points(left);
	const r = points(right);
	if (l === null || r === null) return false;
	return (
		l.every((x) => r.some((y) => congruent(x, y, M))) &&
		r.every((y) => l.some((x) => congruent(x, y, M)))
	);
}

/**
 * L'écriture du manuel : les familles des branches (a = b + 2kπ ; a = −b +
 * 2kπ…), chacune avec sa période ; une famille incluse dans une autre
 * disparaît (cos 2x = cos x : 2kπ ⊂ 2kπ/3). `undefined` s'il n'en reste
 * qu'une (la famille réunie l'écrit déjà), ou si leur réunion n'est pas
 * EXACTEMENT celle du résultat.
 */
function branchFamilies(
	families: readonly PeriodicSolutionFamily[],
	result: SolveResult
): readonly PeriodicSolutionFamily[] | undefined {
	const merged = result.periodicSolutions;
	if (families.length < 2 || merged === undefined) return undefined;
	const kept = families.filter(
		(family, i) =>
			!families.some(
				(other, j) => j !== i && includedIn(family, other) && (!includedIn(other, family) || j < i)
			)
	);
	if (kept.length < 2 || !sameSet([merged], kept)) return undefined;
	return [...kept].sort((a, b) => Math.min(...lows(a)) - Math.min(...lows(b)));
}

/** Les bases d'une famille ramenées dans [0 ; T[, pour ranger les familles. */
function lows(family: PeriodicSolutionFamily): number[] {
	return family.baseSolutions.map((_, i) => {
		const x = baseValue(family, i) ?? 0;
		const T = family.periodNumeric;
		const r = ((x % T) + T) % T;
		return T - r < POINT_TOLERANCE ? 0 : r;
	});
}
