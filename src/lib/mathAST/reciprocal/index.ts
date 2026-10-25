/**
 * La réciproque d'une fonction, calculée algébriquement (lot 2 du chantier
 * « réciproque », docs/archive/wip/atelier-reciproque-phase0.md)
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
import type { PeriodicSolutionFamily, Solution } from '../solve/types';
import { isSolverFailure } from '../solve/types';
import { solve } from '../solve/solve';
import { equals, fraction, opposite, subtract, variable as variableNode } from '../factory';
import { isLogical, isRelation } from '../guards';
import { transformAST, visitAST } from '../visitor';
import { flattenRelationChain } from '../flatten';
import { getVariables, substitute } from '../eval/substitute';
import { numericNode } from '../common/numeric';
import { toLatex } from '../latex-generator';
import { computeDomain, normalizeExcludedPoints } from '../domain/compute';
import { containsValue, intersect } from '../domain/algebra';
import { interval, intervalSet } from '../domain/factory';
import type { Interval } from '../domain/types';
import { tidy } from '../tidy';
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

/** Un morceau de stricte monotonie de f, avec sa réciproque quand on sait la calculer. */
export interface ReciprocalPiece {
	readonly interval: Domain;
	/** f⁻¹ sur ce morceau ; `null` : le moteur ne sait pas la calculer. */
	readonly expression: MathNode | null;
	/** Ensemble de départ de cette réciproque ; `null` avec `expression`. */
	readonly departure: Domain | null;
}

export type ReciprocalRefusal =
	| {
			readonly kind: 'not-bijective';
			readonly message: string;
			/** Deux valeurs de même image, quand elles sont entières. */
			readonly sameImage?: readonly [MathNode, MathNode];
			/** Un intervalle où f est bijective. */
			readonly suggestion?: Domain;
			/** Les morceaux de stricte monotonie (au plus `MAX_LISTED_PIECES`). */
			readonly pieces?: readonly ReciprocalPiece[];
			/** f périodique : une infinité de morceaux, aucun listé. */
			readonly infinitelyManyPieces?: true;
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

/** Au-delà, les morceaux sont comptés, pas listés (x³ − 3x en a 3, x⁴ − 2x² en a 4). */
const MAX_LISTED_PIECES = 4;

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

/** Ce que le refus « non bijective » sait de f. */
interface NonInjective {
	readonly f: MathNode;
	readonly variable: string;
	readonly name: string;
	readonly domain: Domain;
	/** Deux valeurs de même image (échantillons du solveur), ou null. */
	readonly pair: readonly [number, number] | null;
	/** Lister les réciproques par morceau (faux dans un morceau : pas de récursion). */
	readonly listPieces: boolean;
}

function isRound(v: number): boolean {
	return Math.abs(v - Math.round(v)) < TOLERANCE;
}

/** Deux entiers de I de même image, cherchés parmi les valeurs rondes. */
function integerPair(f: MathNode, variable: string, domain: Domain): [number, number] | null {
	const integers = ROUND_SAMPLES.filter((v) => Number.isInteger(v) && containsValue(domain, v));
	for (const a of integers) {
		const y = valueAt(f, variable, a);
		if (y === null) continue;
		const b = integers.find((v) => v !== a && isCounterexample(f, variable, a, v, y));
		if (b !== undefined) return [a, b];
	}
	return null;
}

/** Pourquoi f⁻¹ n'existe pas : deux antécédents d'une même image. */
function whyNotInjective(
	{ f, variable, name }: NonInjective,
	pair: readonly [number, number] | null
): string {
	const choose = `${name}⁻¹ ne saurait pas lequel choisir.`;
	if (pair === null) return `deux nombres différents ont la même image, et ${choose}`;
	const [a, b] = pair;
	const same = `${name}(${a}) = ${name}(${b})`;
	const image = valueAt(f, variable, a);
	if (image === null || !isRound(image)) {
		return `${same} : cette image aurait deux antécédents, et ${choose}`;
	}
	const y = Math.round(image) || 0;
	return `${same} = ${y}, donc ${y} aurait deux antécédents et ${name}⁻¹(${y}) ne saurait pas lequel choisir.`;
}

/** Une borne approchée par les variations (8222164341/5000000000) ne s'écrit pas à un élève. */
function readable(domain: Domain): boolean {
	return !/\d{7,}/.test(formatInterval(domain));
}

function tidyInterval(iv: Interval): Interval {
	const end = (e: Interval['lower']): Interval['lower'] => ({ ...e, value: tidy(e.value) });
	return interval(end(iv.lower), end(iv.upper));
}

function listedPiece(context: NonInjective, piece: Interval): ReciprocalPiece {
	const where = intervalSet([tidyInterval(piece)]);
	const { f, variable, name } = context;
	const inverse = reciprocalOn(f, { variable, name, interval: where }, false);
	return inverse.ok
		? { interval: where, expression: inverse.expression, departure: inverse.departure }
		: { interval: where, expression: null, departure: null };
}

function pieceText({ name, variable }: NonInjective, piece: ReciprocalPiece): string {
	const where = `sur ${formatInterval(piece.interval)}`;
	if (piece.expression === null) return `${where} (formule que je ne sais pas calculer)`;
	return `${where} : $${name}^{-1}\\left( ${variable} \\right) = ${toLatex(piece.expression)}$`;
}

function refuseNotBijective(
	context: NonInjective,
	pieces: Pieces,
	periodic?: { readonly suggestion: Domain | null }
): ReciprocalResult {
	const { name, domain } = context;
	const pair = context.pair ?? integerPair(context.f, context.variable, domain);
	const round = pair?.every(isRound) ?? false;
	const [a, b] = pair && round ? pair.map(Math.round).sort((p, q) => p - q) : [0, 0];
	const why = whyNotInjective(context, round ? [a, b] : null);

	const several = pieces !== null && pieces.length > 1;
	const listable =
		several &&
		pieces.length <= MAX_LISTED_PIECES &&
		pieces.every(({ piece }) => readable(intervalSet([tidyInterval(piece)])));
	const listed =
		context.listPieces && listable ? pieces.map(({ piece }) => listedPiece(context, piece)) : null;
	const mais = `Mais ${name} est bijective sur`;
	let byPiece = '';
	if (periodic) byPiece = ` ${mais} une infinité d'intervalles, chacun avec sa réciproque.`;
	else if (listed) {
		const items = listed.map((piece) => pieceText(context, piece)).join(' ; ');
		byPiece = ` ${mais} chacun de ces intervalles, avec une réciproque différente : ${items}.`;
	} else if (several && context.listPieces) {
		byPiece = ` ${mais} chacun de ses ${pieces.length} intervalles de stricte monotonie, avec une réciproque différente.`;
	}

	// Le morceau le plus à droite dont on sait la formule, sinon le dernier
	const withFormula = listed?.filter((piece) => piece.expression !== null).at(-1)?.interval;
	const last = pieces?.at(-1);
	const fromPieces =
		withFormula ?? (several && last ? intervalSet([tidyInterval(last.piece)]) : undefined);
	const candidate = periodic ? (periodic.suggestion ?? undefined) : fromPieces;
	let suggestion = candidate && readable(candidate) ? candidate : undefined;
	// Décision (5) de David : jamais proposer une commande qui échouerait. Aucun
	// morceau listé n'a de formule (tan sur ]−1 ; 4[ : arctan) et la commande
	// proposée échoue : f périodique → le refus périodique, honnête (« Sa
	// réciproque y est la fonction arctan… ») ; sinon, pas de commande.
	if (
		!periodic &&
		withFormula === undefined &&
		suggestion &&
		!reciprocalOn(context.f, { ...context, interval: suggestion }, false).ok
	) {
		const family = periodicFamily(context.f, context.variable, domain);
		const honest = family ? refusePeriodic(context, family) : null;
		if (honest) return honest;
		suggestion = undefined;
	}
	// Décision (5) de David (2026-10-13) : sin sur ℝ — jamais proposer une
	// commande qui échouerait (le solveur n'écrit pas arcsin)
	if (
		periodic &&
		!(suggestion && reciprocalOn(context.f, { ...context, interval: suggestion }, false).ok)
	) {
		return refusePeriodicWithoutFormula(context, suggestion, round ? [a, b] : null);
	}
	const advice = suggestion
		? `Choisis un intervalle, par exemple .réciproque ${name} sur ${formatInterval(suggestion)}.`
		: `Choisis un intervalle où ${name} est strictement monotone.`;
	const sameImage: readonly [MathNode, MathNode] = [numericNode(a), numericNode(b)];
	return {
		ok: false,
		refusal: {
			kind: 'not-bijective',
			message: `${name} n'est pas bijective sur ${formatInterval(withRealLineWritten(domain))} : ${why}${byPiece} ${advice}`,
			...(round && { sameImage }),
			...(suggestion && { suggestion }),
			...(listed && { pieces: listed }),
			...(periodic && { infinitelyManyPieces: true as const })
		}
	};
}

/** Les fonctions trigonométriques et leur réciproque, que Chiphre ne calcule pas encore. */
const ARC_FUNCTIONS: Readonly<Record<string, string>> = {
	sin: 'arcsin',
	cos: 'arccos',
	tan: 'arctan'
};

/**
 * f périodique, sans réciproque calculable sur le morceau proposé : la vérité,
 * sans commande. « Sa réciproque y est la fonction arcsin » quand f est sin,
 * « s'écrit avec » quand x n'apparaît que dans sin (2 sin x + 1) ; sinon,
 * Chiphre dit seulement qu'il ne sait pas.
 */
function refusePeriodicWithoutFormula(
	context: NonInjective,
	suggestion: Domain | undefined,
	sameImage: readonly [number, number] | null
): ReciprocalResult {
	const { f, variable, name, domain } = context;
	const where = suggestion ? `, par exemple ${formatInterval(suggestion).replace(/-/g, '−')}` : '';
	const trig = onlyTrigonometricIn(f, variable);
	const arc = trig === null ? null : ARC_FUNCTIONS[trig];
	const exact =
		f.type === 'function' &&
		f.args.length === 1 &&
		f.args[0].type === 'variable' &&
		f.args[0].name === variable;
	const there = suggestion ? 'y' : 'sur ces intervalles';
	const formula =
		arc === null
			? `Chiphre ne sait pas encore calculer sa réciproque ${suggestion ? 'sur cet intervalle' : 'sur ces intervalles'}.`
			: `Sa réciproque ${there} ${exact ? 'est' : "s'écrit avec"} la fonction ${arc}, que Chiphre ne sait pas encore calculer.`;
	const notBijective = `${name} n'est pas bijective sur ${formatInterval(withRealLineWritten(domain))}`;
	// L'explication d'abord, comme pour x² (décision de David, 2026-10-13)
	const why = periodicWhy(context);
	const opening =
		why === null
			? `${notBijective}, mais elle l'est sur une infinité d'intervalles${where}.`
			: `${notBijective} : ${why} Elle l'est sur une infinité d'intervalles${where}.`;
	return {
		ok: false,
		refusal: {
			kind: 'not-bijective',
			message: `${opening} ${formula}`,
			...(sameImage && {
				sameImage: [numericNode(sameImage[0]), numericNode(sameImage[1])] as const
			}),
			...(suggestion && { suggestion }),
			infinitelyManyPieces: true as const
		}
	};
}

/** Écarts essayés depuis 0 : sin(0) = sin(π), cos(0) = cos(2π), tan(0) = tan(π). */
const PERIODIC_PAIRS: readonly (readonly [number, string])[] = [
	[Math.PI, 'π'],
	[2 * Math.PI, '2π']
];

/**
 * « f(0) = f(π) = 0, donc 0 aurait plusieurs antécédents. » quand 0 et π (ou
 * 2π) sont dans I avec une même image entière, sinon `null`.
 */
function periodicWhy({ f, variable, name, domain }: NonInjective): string | null {
	if (!containsValue(domain, 0)) return null;
	const y = valueAt(f, variable, 0);
	if (y === null || !isRound(y)) return null;
	const found = PERIODIC_PAIRS.find(([b]) => {
		const image = containsValue(domain, b) ? valueAt(f, variable, b) : null;
		return image !== null && close(image, y);
	});
	if (found === undefined) return null;
	const image = Math.round(y) || 0;
	return `${name}(0) = ${name}(${found[1]}) = ${image}, donc ${image} aurait plusieurs antécédents.`;
}

/**
 * tan (x n'apparaît que dans tan) sur son ensemble, ℝ privé de π/2 + kπ :
 * f(x₀ + π) = f(x₀) prouve qu'elle n'est pas bijective. Le morceau proposé,
 * ]−π/2 ; π/2[, seulement si f y est strictement monotone. `null` sinon.
 */
function refuseTangent(context: NonInjective): ReciprocalResult | null {
	const { f, variable, domain } = context;
	if (domain.kind !== 'periodic_exclusion' || onlyTrigonometricIn(f, variable) !== 'tan') {
		return null;
	}
	const period = approx(domain.period);
	if (period === null || period <= 0) return null;
	const proved = [0, 0.3, -0.7, 1.1].some((x) => {
		const [y0, y1] = [valueAt(f, variable, x), valueAt(f, variable, x + period)];
		return y0 !== null && y1 !== null && close(y0, y1);
	});
	if (!proved) return null;
	const window = intervalSet([
		interval(
			{ value: tidy(subtract(domain.basePoint, domain.period)), type: 'open' },
			{ value: tidy(domain.basePoint), type: 'open' }
		)
	]);
	const monotone = monotonePieces(f, variable, window)?.length === 1;
	return refusePeriodicWithoutFormula(context, monotone ? window : undefined, null);
}

/**
 * `sin`, `cos` ou `tan` quand la variable n'apparaît QUE dans des appels à
 * cette seule fonction (`2 sin(x) + 1`, `sin(2x)`), sinon `null` (`x sin x`).
 */
function onlyTrigonometricIn(f: MathNode, variable: string): string | null {
	const kinds = new Set<string>();
	visitAST(f, {
		enterFunction: (node) => {
			if (node.name in ARC_FUNCTIONS && getVariables(node).has(variable)) kinds.add(node.name);
		}
	});
	if (kinds.size !== 1) return null;
	const [kind] = kinds;
	const rest = transformAST(f, {
		enterFunction: (node) => (node.name === kind ? numericNode(0) : undefined)
	});
	return getVariables(rest).has(variable) ? null : kind;
}

/**
 * Le solveur rend une famille périodique de solutions (sin, cos, mais aussi
 * x·sin x) et f(x₀ + T) = f(x₀) avec x₀ et x₀ + T dans I : refus
 * « non bijective », avec le morceau de [−T/2 ; T/2] qui contient 0 (sin :
 * [−π/2 ; π/2]), sinon celui qui part de 0 (cos : [0 ; π]). `null` : pas de
 * période entière dans I, le refus reste `unsolved`.
 */
function refusePeriodic(
	context: NonInjective,
	family: PeriodicSolutionFamily
): ReciprocalResult | null {
	const { f, variable, domain } = context;
	const period = family.periodNumeric;
	const x0 = samplesOf(domain).find((x) => {
		const y = valueAt(f, variable, x);
		return (
			y !== null &&
			containsValue(domain, x + period) &&
			isCounterexample(f, variable, x, x + period, y)
		);
	});
	if (x0 === undefined) return null;
	const half = tidy(fraction(family.period, numericNode(2)));
	const window = interval(
		{ value: tidy(opposite(half)), type: 'closed' },
		{ value: half, type: 'closed' }
	);
	const pieces = monotonePieces(f, variable, intersect(domain, intervalSet([window])));
	const chosen =
		pieces?.find(
			({ piece }) =>
				containsValue(intervalSet([piece]), 0) &&
				approx(piece.lower.value) !== 0 &&
				approx(piece.upper.value) !== 0
		) ?? pieces?.find(({ piece }) => approx(piece.lower.value) === 0);
	// Une borne où f n'existe pas reste OUVERTE : la fenêtre fermée gardait π/2
	// pour tan sur ]−1 ; 4[ (revue de #1342)
	const suggestion = chosen
		? intervalSet([openWhereUndefined(tidyInterval(chosen.piece), f, variable)])
		: null;
	return refuseNotBijective(context, null, { suggestion });
}

/** L'intervalle, chaque borne finie où f n'est pas définie rendue ouverte. */
function openWhereUndefined(piece: Interval, f: MathNode, variable: string): Interval {
	const open = (end: Interval['lower']): Interval['lower'] => {
		const at = approx(end.value);
		return at !== null && Number.isFinite(at) && valueAt(f, variable, at) === null
			? { ...end, type: 'open' }
			: end;
	};
	return { ...piece, lower: open(piece.lower), upper: open(piece.upper) };
}

/**
 * La période de f, lue sur une équation à second membre exact (`0 = sin x`,
 * `1 = cos x`) : le solveur ne résout pas `y = sin x` (mesuré le 2026-10-13).
 */
function periodicFamily(
	f: MathNode,
	variable: string,
	domain: Domain
): PeriodicSolutionFamily | null {
	for (const x0 of [0, 1, -1, 2].filter((x) => containsValue(domain, x))) {
		try {
			const image = tidy(substitute(f, { [variable]: x0 }));
			const result = solve(equals(image, f), { variable });
			if (!isSolverFailure(result) && result.periodicSolutions) return result.periodicSolutions;
		} catch {
			// essayer le x₀ suivant
		}
	}
	return null;
}

/**
 * Le solveur n'a pas de formule, mais f n'est PROUVÉE non injective : par les
 * variations (x⁴ − 2x², morceaux d'images communes), ou parce qu'elle est
 * périodique sur I (sin sur ℝ). Sinon `null` : le refus reste `unsolved`.
 */
function notInjectiveAnyway(context: NonInjective, pieces: Pieces): ReciprocalResult | null {
	if (injectiveByPieces(pieces) === false) return refuseNotBijective(context, pieces);
	const family = periodicFamily(context.f, context.variable, context.domain);
	return family ? refusePeriodic(context, family) : null;
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
	return reciprocalOn(f, options, true);
}

/** `listPieces` faux : dans un morceau, un refus ne relance pas le calcul par morceau. */
function reciprocalOn(
	f: MathNode,
	options: ReciprocalOptions,
	listPieces: boolean
): ReciprocalResult {
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
	if (domain.kind === 'periodic_exclusion') {
		return refuseTangent({ f, variable, name, domain, pair: null, listPieces }) ?? unsolved(name);
	}
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
	const pieces = monotonePieces(f, variable, domain);
	const cannotSolve = (): ReciprocalResult =>
		notInjectiveAnyway({ f, variable, name, domain, pair: null, listPieces }, pieces) ??
		unsolved(name);
	let solutions: readonly Solution[];
	try {
		const result = solve(equals(variableNode(letter), f), { variable });
		if (isSolverFailure(result) || result.periodicSolutions) return cannotSolve();
		solutions = result.solutions;
	} catch {
		return cannotSolve();
	}
	if (solutions.length === 0) return cannotSolve();

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
	const injective = injectiveByPieces(pieces);
	if (pair !== null || injective === false) {
		return refuseNotBijective({ f, variable, name, domain, pair, listPieces }, pieces);
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

	const written = textbookWriting(chosen.value, letter);
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
