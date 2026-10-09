/**
 * Atelier — l'étude des variations, en écriture mathématique
 *
 * `.variations` rendait le bloc d'un terminal : `{-2}/{(2x-1)^2}`, `-inf`,
 * `lim_{x -> 1/2^-}`, « decroissante » sans accent. Comme `.dériver` et
 * `.résoudre`, la ligne montre désormais la réponse en LaTeX (la dérivée), le
 * tableau de variations quand il se dessine, et le détail se déplie : domaine,
 * signe de f′ et sens de variation par intervalle, extremums, limites.
 *
 * ⚠️ Rien n'est recalculé ici : tout vient de `computeVariations`, le même
 * calcul que le tableau. La commande et le bouton « Variations » passent par
 * cette fonction — ils disent la même chose.
 *
 * @module atelier/variations-steps
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { Domain } from '$lib/mathAST/domain/types';
import type {
	BoundaryLimit,
	ExtremumType,
	MonotonicInterval,
	VariationResult
} from '$lib/mathAST/variations/types';
import { computeVariations } from '$lib/mathAST/variations';
import { limitValueLatex, variationValueLatex } from '$lib/mathAST/variations/latex';
import { reducedDerivative } from '$lib/mathAST/variations/display';
import { createSafeEvaluator } from '$lib/mathAST/eval/compile';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import { unresolvedDerivativeZerosMessage } from '$lib/mathAST/variations/format';
import { inequalitySolutionLatex } from '$lib/mathAST/cli/commands/solve-latex';
import { toLatex } from '$lib/mathAST/latex-generator';
import { variationTableNode } from '$lib/ubumark/builders/variation-table';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';
import { astOf } from './parse';

// =============================================================================
// Types
// =============================================================================

/** Ce que l'étude donne à afficher : réponse, détail dépliable, tableau. */
export interface VariationsRendering {
	/** `f'(x) = …` — ce que le tableau ne dit pas */
	readonly answer: string;
	readonly steps: readonly RenderedStep[];
	/** Absent quand le tableau ne se dessine pas (domaine troué, sens inconnu) */
	readonly table?: VariationTableNode;
}

// =============================================================================
// Constantes
// =============================================================================

const SENSE: Readonly<Record<MonotonicInterval['monotonicity'], string>> = {
	increasing: 'croissante',
	decreasing: 'décroissante',
	constant: 'constante',
	unknown: 'de sens indéterminé'
};

const DERIVATIVE_SIGN: Readonly<Record<MonotonicInterval['derivativeSign'], string>> = {
	positive: '> 0',
	negative: '< 0',
	zero: '= 0',
	unknown: ''
};

const EXTREMUM: Readonly<Record<ExtremumType, string>> = {
	local_minimum: 'minimum local',
	local_maximum: 'maximum local',
	global_minimum: 'minimum global',
	global_maximum: 'maximum global'
};

// =============================================================================
// Fonction principale
// =============================================================================

/**
 * L'étude des variations d'une expression — ou `null` (repli : l'appelant
 * garde la sortie du moteur). Aucun chemin ne jette.
 *
 * @param expression - L'expression, noms d'objets DÉJÀ substitués
 * @param name - Le nom de la fonction (`f` par défaut, comme dans un énoncé)
 * @param variable - La variable d'étude
 */
export function variationsRendering(
	expression: string,
	name = 'f',
	variable = 'x'
): VariationsRendering | null {
	try {
		const node = astOf(expression, 'text');
		if (node === null) return null;
		const result = computeVariations(node, { variable, includeBoundaryLimits: true });

		const f = `${name}(${variable})`;
		const fPrime = `${name}'(${variable})`;
		// Numérateur réduit : le signe de f′ doit se lire dans ce qui est écrit
		const answer = `${fPrime} = ${toLatex(reducedDerivative(result.derivative))}`;
		const derivativeAt = createSafeEvaluator(result.derivative, variable);

		const steps: RenderedStep[] = [];
		const push = (title: string, expressionLatex?: string, text?: string) =>
			steps.push({
				id: steps.length,
				rule: 'variations',
				title,
				...(expressionLatex !== undefined && { expressionLatex }),
				...(text !== undefined && { explanation: text })
			});

		push('Domaine de définition', `\\mathcal{D}_{${name}} = ${domainLatex(result.domain)}`);
		push('Dérivée', answer);

		if (result.derivativeZerosUnresolved) {
			push(unresolvedDerivativeZerosMessage(variable).split('\n').join(' ; '));
		} else {
			for (const interval of studied(result)) {
				push(
					'Signe de la dérivée et sens de variation',
					senseLatex(interval, name, fPrime, derivativeAt)
				);
			}
			for (const extremum of result.extrema) {
				push(
					'Extremum',
					`${name}(${variationValueLatex(extremum.x)}) = ${variationValueLatex(extremum.y)} \\text{ est un } \\text{${EXTREMUM[extremum.type]}}`
				);
			}
		}

		for (const limit of result.boundaryLimits ?? []) {
			const latex = limitLatex(limit, variable, f);
			if (latex !== null) push('Limite', latex);
		}

		const table = result.derivativeZerosUnresolved ? null : variationTableNode(result, name);
		if (table !== null) return { answer, steps, table };
		// ⚠️ Sans tableau, la ligne ne se réduit pas à f′ : les sens de variation
		// SONT la réponse, et le détail est replié
		const senses = result.derivativeZerosUnresolved ? [] : studied(result);
		const summary = senses
			.map((m) => `\\text{${SENSE[m.monotonicity]}} \\text{ sur } ${intervalLatex(m.interval)}`)
			.join(' \\text{ ; } ');
		return {
			answer: summary === '' ? answer : `${answer} \\quad ${name} \\text{ est } ${summary}`,
			steps
		};
	} catch {
		return null;
	}
}

// =============================================================================
// Écritures
// =============================================================================

/** Les intervalles d'étude, sans les points isolés `[c ; c]` (les zéros de f′). */
function studied(result: VariationResult): MonotonicInterval[] {
	return result.monotonicIntervals.filter(
		(m) =>
			variationValueLatex(m.interval.lower.value) !== variationValueLatex(m.interval.upper.value)
	);
}

function intervalLatex(interval: MonotonicInterval['interval']): string {
	const open = interval.lower.type === 'open' ? ']' : '[';
	const close = interval.upper.type === 'open' ? '[' : ']';
	return `${open}${variationValueLatex(interval.lower.value)} ; ${variationValueLatex(interval.upper.value)}${close}`;
}

/**
 * L'intervalle où se lit le SIGNE de f′ : ouvert aux bornes où f′ n'existe
 * pas. √(x²−1) est décroissante sur ]−∞ ; −1] (f y est définie et continue),
 * mais f′ < 0 seulement sur ]−∞ ; −1[ — f′ n'est pas définie en −1.
 */
function signInterval(
	interval: MonotonicInterval['interval'],
	derivativeAt: (x: number) => number | null
): MonotonicInterval['interval'] {
	const undefinedAt = (bound: MonotonicInterval['interval']['lower']) =>
		bound.type === 'closed' && derivativeAt(endpointToNumber(bound.value)) === null;
	return {
		...interval,
		lower: undefinedAt(interval.lower) ? { ...interval.lower, type: 'open' } : interval.lower,
		upper: undefinedAt(interval.upper) ? { ...interval.upper, type: 'open' } : interval.upper
	};
}

function senseLatex(
	interval: MonotonicInterval,
	name: string,
	fPrime: string,
	derivativeAt: (x: number) => number | null
): string {
	const sign = DERIVATIVE_SIGN[interval.derivativeSign];
	const variations = intervalLatex(interval.interval);
	const signs = intervalLatex(signInterval(interval.interval, derivativeAt));
	const sense = `${name} \\text{ est } \\text{${SENSE[interval.monotonicity]}}`;
	// Les variations s'étendent jusqu'à la borne où f′ n'existe pas : on le dit
	const extent = signs === variations ? '' : ` \\text{ sur } ${variations}`;
	return sign === ''
		? `\\text{sur } ${variations} \\text{, } ${sense}`
		: `\\text{sur } ${signs} \\text{, } ${fPrime} ${sign} \\text{ donc } ${sense}${extent}`;
}

/** `\mathbb{R}`, `\mathbb{R} \setminus \left\{ \dfrac{1}{2} \right\}`, `]0 ; +\infty[` */
function domainLatex(domain: Domain): string {
	const set = inequalitySolutionLatex(domain);
	return set === null ? '\\text{domaine conditionnel}' : set.replace(/^S = /, '');
}

/** `\lim_{x \to \frac{1}{2}^{-}} f(x) = -\infty` — `null` si indéterminée. */
function limitLatex(limit: BoundaryLimit, variable: string, f: string): string | null {
	const value = limitValueLatex(limit.limit);
	if (value === null) return null;
	// `\frac` dans un indice : `\dfrac` y serait démesuré
	const point = variationValueLatex(limit.point).replace(/\\dfrac/g, '\\frac');
	// Un côté n'a de sens qu'en un point fini : `x \to -\infty`, pas `-\infty^{+}`
	const direction = limit.point.type === 'infinity' ? undefined : limit.direction;
	const side = direction === 'left' ? '^{-}' : direction === 'right' ? '^{+}' : '';
	return `\\lim_{${variable} \\to ${point}${side}} ${f} = ${value}`;
}
