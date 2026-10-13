/**
 * La réciproque d'une fonction, calculée algébriquement (lot 2 du chantier
 * « réciproque », docs/wip/atelier-reciproque-phase0.md)
 *
 * `computeReciprocal(f, { interval })` résout `y = f(x)` en x (`solve`, second
 * membre littéral depuis #1302), garde la solution qui tombe dans I, et rend
 * f⁻¹ avec ses ensembles : départ f(I), arrivée I (ou le domaine de f).
 *
 * Bijectivité, deux preuves qui doivent s'accorder :
 * - **les variations** (`image.ts`) : f strictement monotone par morceaux,
 *   images des morceaux deux à deux disjointes ;
 * - **les solutions** : pour des x₀ de I, y₀ = f(x₀) ; une seule solution du
 *   solveur rend x₀ pour tous les x₀ (la branche), et aucune autre ne tombe
 *   dans I (sinon f(x₀) = f(x₁) : refus, avec ces deux valeurs).
 * f(I) se lit aussi deux fois (variations, et condition du solveur ∩ « s(y) ∈ I ») :
 * un désaccord est un refus honnête, jamais une réponse.
 *
 * @module mathAST/reciprocal
 */

import type { MathNode } from '../types';
import type { Domain } from '../domain/types';
import type { RenderedStep } from '../common/step-renderer-base';
import type { Solution } from '../solve/types';
import { isSolverFailure } from '../solve/types';
import { solve } from '../solve/solve';
import { equals, variable as variableNode } from '../factory';
import { isLogical, isRelation } from '../guards';
import { flattenRelationChain } from '../flatten';
import { getVariables, substitute } from '../eval/substitute';
import { numericNode } from '../common/numeric';
import { toLatex } from '../latex-generator';
import { computeDomain, normalizeExcludedPoints } from '../domain/compute';
import { containsValue, intersect } from '../domain/algebra';
import { intervalSet } from '../domain/factory';
import { formatInterval } from '../domain/format';
import { domainsAreEqual } from '../domain/validation/compare-domains';
import { inequalitySolutionLatex, withRealLineWritten } from '../cli/commands/solve-latex';
import {
	approx,
	imageBySolver,
	imageByVariations,
	injectiveByPieces,
	monotonePieces
} from './image';
import type { Pieces } from './image';
import { textbookWriting } from './writing';

// =============================================================================
// Types
// =============================================================================

export interface ReciprocalOptions {
	/** La variable de f (défaut `x`) ; f⁻¹ est écrite dans la même lettre. */
	readonly variable?: string;
	/** L'intervalle I sur lequel on inverse f (défaut : le domaine de f). */
	readonly interval?: Domain;
	/** Le nom de la fonction dans les messages et les étapes (défaut `f`). */
	readonly name?: string;
}

export interface ReciprocalSuccess {
	readonly ok: true;
	/** f⁻¹(x), écrite comme au manuel. */
	readonly expression: MathNode;
	readonly variable: string;
	/** Ensemble de départ de f⁻¹ : f(I). */
	readonly departure: Domain;
	/** Ensemble d'arrivée de f⁻¹ : I (ou le domaine de f). */
	readonly arrival: Domain;
	/**
	 * Les chemins qui ont lu f(I) — quand il y en a deux, ils s'accordent
	 * (un désaccord est un refus).
	 */
	readonly departureReadBy: readonly ('variations' | 'solver')[];
	/** `y = f(x) ⇔ x = …`, le renommage, les ensembles. */
	readonly steps: readonly RenderedStep[];
}

export type ReciprocalRefusal =
	| {
			readonly kind: 'not-bijective';
			readonly message: string;
			/** Deux valeurs de même image, quand elles sont entières. */
			readonly sameImage?: readonly [MathNode, MathNode];
			/** Un intervalle où f est bijective. */
			readonly suggestion?: Domain;
	  }
	| { readonly kind: 'unsolved'; readonly message: string }
	| { readonly kind: 'constant'; readonly message: string };

export type ReciprocalResult =
	ReciprocalSuccess | { readonly ok: false; readonly refusal: ReciprocalRefusal };

// =============================================================================
// Constantes
// =============================================================================

/** Valeurs rondes essayées d'abord : le refus dit alors f(−1) = f(1). */
const ROUND_SAMPLES = [1, 2, -1, 3, -2, 0, 4, -3, 0.5, -0.5, 1.5, -1.5, 5, -5, 10, -10, 0.1];

/** Écarts depuis une borne finie d'un intervalle non borné. */
const OFFSETS = [0.01, 0.3, 1.7, 6, 40];

const TOLERANCE = 1e-7;

/** Écart relatif au-delà duquel deux antécédents sont distincts, pas du bruit. */
const DISTINCT = 1e-4;

/** Lettres possibles pour le second membre y de `y = f(x)`. */
const PARAMETER_LETTERS = ['y', 'u', 'w', 'z'];

// =============================================================================
// Refus
// =============================================================================

function constant(): ReciprocalResult {
	const message = "Une fonction constante n'a pas de réciproque.";
	return { ok: false, refusal: { kind: 'constant', message } };
}

function unsolved(name: string): ReciprocalResult {
	const message = `Je ne sais pas calculer la réciproque de ${name} algébriquement.`;
	return { ok: false, refusal: { kind: 'unsolved', message } };
}

function notBijective(
	name: string,
	domain: Domain,
	pair: readonly [number, number] | null,
	pieces: Pieces
): ReciprocalResult {
	const round = pair?.every((v) => Math.abs(v - Math.round(v)) < TOLERANCE) ?? false;
	const [a, b] = pair ? pair.map(Math.round).sort((p, q) => p - q) : [0, 0];
	const last = pieces?.[pieces.length - 1];
	const suggestion = pieces && pieces.length > 1 && last ? intervalSet([last.piece]) : undefined;
	const same = round ? ` (${name}(${a}) = ${name}(${b}))` : '';
	const advice = suggestion
		? `choisis un intervalle, par exemple .réciproque ${name} sur ${formatInterval(suggestion)}.`
		: 'choisis un intervalle où elle est strictement monotone.';
	const sameImage: readonly [MathNode, MathNode] = [numericNode(a), numericNode(b)];
	return {
		ok: false,
		refusal: {
			kind: 'not-bijective',
			message: `${name} n'est pas bijective sur ${formatInterval(withRealLineWritten(domain))}${same} : ${advice}`,
			...(round && { sameImage }),
			...(suggestion && { suggestion })
		}
	};
}

// =============================================================================
// Échantillons et branches
// =============================================================================

/** Des x de I : valeurs rondes d'abord, puis réparties sur chaque intervalle. */
function samplesOf(domain: Domain): number[] {
	const spread: number[] = [];
	if (domain.kind === 'interval_set') {
		for (const iv of domain.intervals) {
			const [low, high] = [approx(iv.lower.value), approx(iv.upper.value)];
			if (low === null || high === null) continue;
			if (Number.isFinite(low) && Number.isFinite(high)) {
				for (let k = 0; k <= 8; k++) spread.push(low + ((high - low) * k) / 8);
			} else if (Number.isFinite(low)) {
				spread.push(...OFFSETS.map((d) => low + d));
			} else if (Number.isFinite(high)) {
				spread.push(...OFFSETS.map((d) => high - d));
			}
		}
	}
	return [...ROUND_SAMPLES, ...spread].filter((x) => containsValue(domain, x));
}

function valueAt(node: MathNode, letter: string, value: number): number | null {
	const result = approx(substitute(node, { [letter]: value }));
	return result !== null && Number.isFinite(result) ? result : null;
}

/** La condition d'une solution (relations, « et », « ou ») pour cette valeur. */
function holds(condition: MathNode, letter: string, value: number): boolean {
	if (isLogical(condition) && (condition.operator === 'and' || condition.operator === 'or')) {
		const [left, right] = [condition.left, condition.right].map((c) => holds(c, letter, value));
		return condition.operator === 'and' ? left && right : left || right;
	}
	if (!isRelation(condition)) return false;
	const { operands, relations } = flattenRelationChain(condition);
	const values = operands.map((operand) => valueAt(operand, letter, value));
	return relations.every((op, i) => {
		const [a, b] = [values[i], values[i + 1]];
		if (a === null || b === null) return false;
		if (op === '<') return a < b;
		if (op === '>') return a > b;
		if (op === '<=') return a <= b + TOLERANCE;
		if (op === '>=') return a >= b - TOLERANCE;
		if (op === '!=') return Math.abs(a - b) > TOLERANCE;
		return false;
	});
}

function branchValue(solution: Solution, letter: string, y: number): number | null {
	if (solution.condition && !holds(solution.condition, letter, y)) return null;
	return valueAt(solution.value, letter, y);
}

function close(a: number, b: number): boolean {
	return Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(a));
}

/**
 * x₁ contredit l'injectivité : même image que x₀ À LA PRÉCISION DU CALCUL, et
 * nettement distinct de x₀. Une branche imprécise (Cardano pour 1/x³ rendait
 * 2,99998921 pour x₀ = 3) n'est pas un contre-exemple.
 */
function isCounterexample(
	f: MathNode,
	variable: string,
	x0: number,
	x1: number,
	y0: number
): boolean {
	const y1 = valueAt(f, variable, x1);
	if (y1 === null) return false;
	const sameImage = Math.abs(y1 - y0) <= 1e-9 * Math.max(1, Math.abs(y0));
	const distinct = Math.abs(x1 - x0) > DISTINCT * Math.max(1, Math.abs(x0));
	return sameImage && distinct;
}

// =============================================================================
// Étapes
// =============================================================================

function setLatex(domain: Domain): string {
	return (inequalitySolutionLatex(domain) ?? '').replace(/^S = /, '');
}

interface SolvedFor {
	readonly value: MathNode;
	readonly condition?: MathNode;
	readonly several: boolean;
}

interface Written {
	readonly expression: MathNode;
	readonly departure: Domain;
	readonly arrival: Domain;
}

function stepsOf(
	f: MathNode,
	name: string,
	variable: string,
	letter: string,
	solved: SolvedFor,
	result: Written
): RenderedStep[] {
	const kept = solved.several
		? `On garde la solution qui appartient à ${formatInterval(result.arrival)}.`
		: '';
	const exists = solved.condition ? ` Elle existe pour $${toLatex(solved.condition)}$.` : '';
	const explanation = `${kept}${exists}`.trim();
	const equation = toLatex(equals(variableNode(letter), f));
	const solution = toLatex(equals(variableNode(variable), solved.value));
	return [
		{
			id: 1,
			rule: 'reciprocal-solve',
			title: `On exprime ${variable} en fonction de ${letter}`,
			expressionLatex: `${equation} \\iff ${solution}`,
			...(explanation !== '' && { explanation })
		},
		{
			id: 2,
			rule: 'reciprocal-rename',
			title: `On renomme ${letter} en ${variable}`,
			expressionLatex: `${name}^{-1}\\left( ${variable} \\right) = ${toLatex(result.expression)}`
		},
		{
			id: 3,
			rule: 'reciprocal-sets',
			title: "Ensemble de départ et ensemble d'arrivée",
			expressionLatex: `${name}^{-1} : ${setLatex(result.departure)} \\to ${setLatex(result.arrival)}`
		}
	];
}

// =============================================================================
// API
// =============================================================================

/**
 * La réciproque de f sur I (ou sur son domaine). Refus typés, en français :
 * f constante, f non bijective (deux valeurs de même image, un intervalle
 * suggéré), ou le moteur ne sait pas — jamais une réponse approchée.
 */
export function computeReciprocal(f: MathNode, options: ReciprocalOptions = {}): ReciprocalResult {
	const variable = options.variable ?? 'x';
	const name = options.name ?? 'f';
	const letters = getVariables(f);
	if (!letters.has(variable)) return constant();
	if (letters.size > 1) return unsolved(name);

	const definition = computeDomain(f, variable);
	if (definition.unresolved !== undefined && definition.unresolved.length > 0) {
		return unsolved(name);
	}
	const domain = normalizeExcludedPoints(
		options.interval ? intersect(definition.domain, options.interval) : definition.domain
	);
	if (domain.kind !== 'universal' && domain.kind !== 'interval_set') return unsolved(name);
	// x − x : la lettre est écrite, la fonction est constante
	const values = samplesOf(domain).map((x0) => valueAt(f, variable, x0));
	if (
		values.length > 1 &&
		values.every((v) => v !== null && values[0] !== null && close(v, values[0]))
	) {
		return constant();
	}

	const letter = PARAMETER_LETTERS.find((l) => l !== variable) ?? 'y';
	let solutions: readonly Solution[];
	try {
		const result = solve(equals(variableNode(letter), f), { variable });
		if (isSolverFailure(result) || result.periodicSolutions) return unsolved(name);
		solutions = result.solutions;
	} catch {
		return unsolved(name);
	}
	if (solutions.length === 0) return unsolved(name);

	// Branches : laquelle rend x₀ ; une autre tombe-t-elle dans I ?
	const recovers = solutions.map(() => true);
	let pair: [number, number] | null = null;
	for (const x0 of samplesOf(domain)) {
		const y0 = valueAt(f, variable, x0);
		if (y0 === null) continue;
		solutions.forEach((solution, i) => {
			const x1 = branchValue(solution, letter, y0);
			if (x1 !== null && close(x1, x0)) return;
			recovers[i] = false;
			if (x1 !== null && pair === null && containsValue(domain, x1)) {
				if (isCounterexample(f, variable, x0, x1, y0)) pair = [x0, x1];
			}
		});
	}
	const pieces = monotonePieces(f, variable, domain);
	const injective = injectiveByPieces(pieces);
	if (pair !== null || injective === false) {
		return notBijective(name, domain, pair, pieces);
	}
	// Injectivité PROUVÉE seulement : par les variations, ou parce que le
	// solveur n'a qu'une solution pour tout y. Les échantillons ne prouvent
	// rien — e^{x²} sur ]−0,001 ; 5] leur échappait (revue de #1304).
	if (injective !== true && solutions.length !== 1) return unsolved(name);
	const branch = recovers.indexOf(true);
	if (branch < 0) return unsolved(name);
	const chosen = solutions[branch];

	// f(I), par les variations et par le solveur : les deux doivent s'accorder
	const byVariations = imageByVariations(pieces);
	const bySolver = imageBySolver(chosen.value, chosen.condition, letter, domain);
	if (byVariations && bySolver && !domainsAreEqual(byVariations, bySolver)) return unsolved(name);
	const image = bySolver ?? byVariations;
	if (image === null) return unsolved(name);

	const written = textbookWriting(chosen.value);
	const result: Written = {
		expression: substitute(written, { [letter]: variableNode(variable) }),
		departure: withRealLineWritten(normalizeExcludedPoints(image)),
		arrival: withRealLineWritten(domain)
	};
	const solved: SolvedFor = {
		value: written,
		...(chosen.condition && { condition: chosen.condition }),
		several: solutions.length > 1
	};
	const departureReadBy = [
		...(byVariations ? (['variations'] as const) : []),
		...(bySolver ? (['solver'] as const) : [])
	];
	return {
		ok: true,
		...result,
		variable,
		departureReadBy,
		steps: stepsOf(f, name, variable, letter, solved, result)
	};
}
