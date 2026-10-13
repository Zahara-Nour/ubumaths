/**
 * Atelier — la ligne `.domaine` : une formule, et « Comment ? »
 *
 * Décisions de David (2026-10-13, PR 2 de `.domaine`) :
 *
 * - **Q5** : la réponse est une formule, `D = ℝ \ {0}`, écrite EXACTEMENT
 *   comme la conclusion des étapes (`domainToLatex`) ; le texte du terminal
 *   (« Expression », « Condition ») n'est plus montré. Les refus du moteur
 *   (`DOMAIN_UNRESOLVED`…) sortent avant, inchangés.
 * - **Q3** : une valeur connue seulement en décimal (`\frac{1}{x^3-2}`,
 *   1,2599…) n'est jamais écrite avec ses seize décimales. Elle est NOMMÉE
 *   dans l'ensemble et arrondie à côté : `D = ℝ \ {α} avec α ≈ 1,26` — la
 *   convention du lycée pour une solution approchée (choix de l'agent, à la
 *   place de « x ≠ ≈ 1,26 » écarté par David). Pas d'étapes : le pipeline
 *   refuse ces valeurs (#1347).
 * - « Comment ? » : les étapes de `pedagogical-domain`, niveau lycée,
 *   seulement quand l'ensemble qu'elles concluent est, PAR VALEUR, le domaine
 *   du moteur (`domain-steps-check.ts`). Toute exception → pas d'étapes, la
 *   formule reste. Branché même quand la résolution d'une contrainte n'est
 *   pas rédigée (Q4), et pour le domaine universel (Q6).
 *
 * @module atelier/domain-steps
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { MathNode } from '$lib/mathAST/types';
import type { Domain, IntervalSet } from '$lib/mathAST/domain/types';
import { computeDomain } from '$lib/mathAST/domain/compute';
import { formatDomainInterval } from '$lib/mathAST/domain/format';
import { compile } from '$lib/mathAST/eval/compile';
import { findNodes } from '$lib/mathAST/transforms';
import {
	generatePedagogicalDomainSteps,
	PedagogicalDomainRenderer
} from '$lib/mathAST/pedagogical-domain';
import { domainToLatex } from '$lib/mathAST/pedagogical-domain/renderer';
import { summaryOf } from './steps-summary';
import { sameDomainByValue } from './domain-steps-check';

// =============================================================================
// Types
// =============================================================================

/** Ce qu'affiche une ligne `.domaine`. */
export interface DomainLine {
	/** La réponse en LaTeX : `D = …` (décimaux encore à point). */
	readonly latex: string;
	/** La même réponse en texte : repli de la vue, export de l'historique. */
	readonly text: string;
	/** Les étapes rendues, quand elles concluent le domaine du moteur. */
	readonly steps?: readonly RenderedStep[];
	/** Les mêmes étapes en version résumée, absente si elle ne dit rien de moins. */
	readonly summary?: readonly RenderedStep[];
}

// =============================================================================
// Constantes
// =============================================================================

/**
 * Un nombre à plus de six décimales : une valeur approchée. Le même critère
 * que le pipeline (`hasApproximateValue`, `pedagogical-domain/dispatch.ts`).
 */
const APPROXIMATE = /\.\d{7,}/;

/** Les noms des valeurs approchées, dans l'ordre croissant des valeurs. */
const LETTERS: readonly { readonly glyph: string; readonly latex: string }[] = [
	{ glyph: 'α', latex: '\\alpha' },
	{ glyph: 'β', latex: '\\beta' },
	{ glyph: 'γ', latex: '\\gamma' },
	{ glyph: 'δ', latex: '\\delta' }
];

/** L'arrondi montré : deux décimales (« α ≈ 1,26 »), deux chiffres significatifs sous 1. */
const DECIMALS = 2;

/** Au-delà, deux valeurs qui s'arrondissent pareil restent indistinctes. */
const MAX_DECIMALS = 12;

// =============================================================================
// Fonction principale
// =============================================================================

/**
 * La ligne `.domaine` d'une expression — ou `null`, et la ligne garde alors
 * le texte du moteur (repli : un domaine que la formule ne sait pas écrire).
 *
 * Aucun chemin ne jette : génération des étapes, garde et rendu sont dans
 * un `try`.
 *
 * @param expression - L'expression lue par le moteur (`result.ast`).
 * @param variable - La variable du calcul (`x`, ou celle tapée/devinée).
 * @param engineDomain - Le domaine du moteur ; recalculé par
 *   `computeDomain` — la fonction même de `.domaine` — s'il n'est pas donné.
 */
export function domainLine(
	expression: MathNode,
	variable: string,
	engineDomain?: Domain
): DomainLine | null {
	const domain = engineDomain ?? computedDomain(expression, variable);
	if (domain === null) return null;

	// Q3 : une valeur seulement approchée — nommée, arrondie, sans étapes
	if (hasApproximateValue(domain)) return approximateAnswer(domain);

	const explained = domainSteps(expression, variable, domain);
	if (explained === null) return exactAnswer(domain);
	// Les deux ensembles sont égaux par valeur : la réponse s'écrit avec celui
	// que concluent les étapes, pour que les deux écritures soient identiques
	return {
		...exactAnswer(explained.concluded),
		steps: explained.steps,
		...(explained.summary !== undefined && { summary: explained.summary })
	};
}

// =============================================================================
// Domaine du moteur et étapes
// =============================================================================

/** Le domaine que calcule `.domaine` ; `null` s'il est incomplet ou en erreur. */
function computedDomain(expression: MathNode, variable: string): Domain | null {
	try {
		const result = computeDomain(expression, variable);
		return result.unresolved !== undefined && result.unresolved.length > 0 ? null : result.domain;
	} catch {
		return null;
	}
}

interface ExplainedDomain {
	readonly concluded: Domain;
	readonly steps: readonly RenderedStep[];
	readonly summary?: readonly RenderedStep[];
}

/**
 * Les étapes, quand l'ensemble qu'elles concluent (celui de la dernière, que
 * l'élève lit « Domaine : … ») est le domaine du moteur — sinon `null`.
 */
function domainSteps(
	expression: MathNode,
	variable: string,
	domain: Domain
): ExplainedDomain | null {
	try {
		// `PedagogicalDomainNotImplemented` : contrainte non résolue, règle hors
		// programme, étapes qui ne prouvent pas le domaine, valeur approchée
		const result = generatePedagogicalDomainSteps(expression, { schoolLevel: 'lycee', variable });
		const concluded = result.steps[result.steps.length - 1]?.intermediateDomain;
		if (concluded === undefined || !sameDomainByValue(concluded, domain)) return null;

		const renderer = new PedagogicalDomainRenderer();
		const steps = renderer.renderAll(result.steps, { schoolLevel: 'lycee', verbosity: 'detailed' });
		if (steps.length === 0) return null;
		const summarized = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const summary = summaryOf(steps, summarized);
		return { concluded, steps, ...(summary !== undefined && { summary }) };
	} catch {
		return null;
	}
}

// =============================================================================
// La réponse
// =============================================================================

/** `D = …`, en LaTeX comme la conclusion des étapes, et en texte. */
function exactAnswer(domain: Domain): DomainLine {
	return {
		latex: `D = ${domainToLatex(domain)}`,
		text: `D = ${formatDomainInterval(domain)}`
	};
}

/**
 * `D = ℝ \ {α} avec α ≈ 1,26` : chaque valeur approchée remplacée par une
 * lettre grecque, dans l'ordre croissant, puis arrondie à côté. `null` hors
 * des réunions d'intervalles, ou au-delà de quatre valeurs : la ligne garde
 * alors le texte du moteur.
 */
function approximateAnswer(engineDomain: Domain): DomainLine | null {
	if (engineDomain.kind !== 'interval_set') return null;
	// ]0 ; α[ ∪ ]α ; +∞[ s'écrit ]0 ; +∞[ \ {α} : `domainToLatex` le fait
	// seul, `formatDomainInterval` non — on le fait ici pour les deux (revue)
	const domain = mergedAtExcludedPoints(engineDomain);
	const values = distinctSorted(
		[
			...domain.intervals.flatMap((i) => [i.lower.value, i.upper.value]),
			...domain.excludedPoints.map((p) => p.value)
		]
			.filter(isApproximate)
			.map(valueOf)
	);
	if (values === null || values.length > LETTERS.length) return null;

	const named = (node: MathNode): MathNode => {
		if (!isApproximate(node)) return node;
		const index = values.findIndex((v) => near(v, valueOf(node) ?? NaN));
		return { type: 'variable', name: LETTERS[index].glyph };
	};
	const renamed: IntervalSet = {
		...domain,
		intervals: domain.intervals.map((i) => ({
			...i,
			lower: { ...i.lower, value: named(i.lower.value) },
			upper: { ...i.upper, value: named(i.upper.value) }
		})),
		// Rangés par valeur ici : `domainToLatex` ne sait pas ranger des lettres
		excludedPoints: [...domain.excludedPoints]
			.sort((p, q) => (valueOf(p.value) ?? 0) - (valueOf(q.value) ?? 0))
			.map((p) => ({ ...p, value: named(p.value) }))
	};

	const rounded = roundedApart(values);
	const latexSet = LETTERS.reduce(
		(latex, letter) => latex.replaceAll(letter.glyph, letter.latex),
		domainToLatex(renamed)
	);
	const latexValues = rounded.map((r, i) => `${LETTERS[i].latex} \\approx ${r}`);
	const textValues = rounded.map((r, i) => `${LETTERS[i].glyph} ≈ ${r}`);
	return {
		latex: `D = ${latexSet} \\text{ avec } ${enumeration(latexValues, ' \\text{, } ', ' \\text{ et } ')}`,
		text: `D = ${formatDomainInterval(renamed)} avec ${enumeration(textValues, ', ', ' et ')}`
	};
}

/**
 * Deux intervalles ouverts qui se touchent en une même valeur (]a ; b[ ∪
 * ]b ; c[) deviennent ]a ; c[ privé de b — l'écriture de `domainToLatex`.
 */
function mergedAtExcludedPoints(domain: IntervalSet): IntervalSet {
	const intervals: IntervalSet['intervals'][number][] = [];
	const excluded = [...domain.excludedPoints];
	for (const interval of domain.intervals) {
		const previous = intervals[intervals.length - 1];
		const meeting =
			previous !== undefined &&
			previous.upper.type === 'open' &&
			interval.lower.type === 'open' &&
			previous.upper.value.type !== 'infinity' &&
			near(valueOf(previous.upper.value) ?? NaN, valueOf(interval.lower.value) ?? NaN);
		if (meeting) {
			excluded.push({ kind: 'excluded_point', value: previous.upper.value });
			intervals[intervals.length - 1] = { ...previous, upper: interval.upper };
		} else {
			intervals.push(interval);
		}
	}
	return { ...domain, intervals, excludedPoints: excluded };
}

/**
 * Les arrondis montrés : deux décimales, deux chiffres significatifs pour
 * |v| < 1 (jamais « α ≈ 0 ») ; tant que deux arrondis se confondent, une
 * décimale de plus pour tous (« 1,260 » et « 1,261 »).
 */
function roundedApart(values: readonly number[]): string[] {
	const base = values.map((v) =>
		Math.abs(v) < 1 && v !== 0
			? Math.max(DECIMALS, Math.ceil(-Math.log10(Math.abs(v))) + 1)
			: DECIMALS
	);
	for (let extra = 0; ; extra++) {
		const written = values.map((v, i) => v.toFixed(Math.min(base[i] + extra, MAX_DECIMALS)));
		if (new Set(written).size === written.length || base.every((d) => d + extra >= MAX_DECIMALS)) {
			return written;
		}
	}
}

/** « a », « a et b », « a, b et c ». */
function enumeration(items: readonly string[], comma: string, and: string): string {
	if (items.length <= 1) return items.join('');
	return `${items.slice(0, -1).join(comma)}${and}${items[items.length - 1]}`;
}

// =============================================================================
// Valeurs
// =============================================================================

function hasApproximateValue(domain: Domain): boolean {
	const nodes: MathNode[] = [];
	if (domain.kind === 'interval_set') {
		for (const i of domain.intervals) nodes.push(i.lower.value, i.upper.value);
		for (const p of domain.excludedPoints) nodes.push(p.value);
	} else if (domain.kind === 'periodic_exclusion') {
		nodes.push(domain.basePoint, domain.period);
	}
	return nodes.some(isApproximate);
}

function isApproximate(node: MathNode): boolean {
	return findNodes(node, (n) => n.type === 'number' && APPROXIMATE.test(n.value)).length > 0;
}

/** Valeurs distinctes, croissantes ; `null` si l'une ne s'évalue pas. */
function distinctSorted(values: readonly (number | null)[]): number[] | null {
	if (values.some((v) => v === null)) return null;
	const sorted = [...(values as number[])].sort((a, b) => a - b);
	return sorted.filter((v, i) => i === 0 || !near(v, sorted[i - 1]));
}

function near(a: number, b: number): boolean {
	return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));
}

function valueOf(node: MathNode): number | null {
	try {
		const value = compile(node)({});
		return typeof value === 'number' && Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}
