/**
 * Atelier — une fonction définie sur un intervalle : `f(x) = x^2 sur [0;+∞[`.
 *
 * Phase 0 `docs/wip/atelier-intervalle-phase0.md` (I1-I6, validée le
 * 2026-10-13), lot 1. L'ensemble s'écrit dans le même champ que la définition,
 * après le mot « sur » ; il est lu par `parseStudentDomain`, le parseur des
 * réponses d'élève (intervalles, réunions, `ℝ \ {0}`, `ℝ₊`…).
 *
 * L'objet range l'ÉCRITURE de l'élève (`FunctionObject.interval`), relue à la
 * demande : la même chaîne sert à réafficher le champ et à retrouver l'ensemble.
 *
 * ⚠️ Mesuré dans Chromium (`intervalle-champ.svelte.test.ts`) : MathLive écrit
 * « sur » en trois lettres collées à ce qui précède (`x^2sur[0;1]`) et retire les
 * espaces. Le mot se reconnaît donc à ce qui le SUIT (un ensemble), pas à un
 * blanc devant : `surface` ou `s·u·r·x` ne sont pas coupés.
 *
 * @module atelier/interval
 */

import type { AtelierObject } from './types';
import { MAX_INTERVAL_LENGTH } from './types';
import type { Domain, Interval } from '$lib/mathAST/domain/types';
import type { MathNode } from '$lib/mathAST/types';
import { parseStudentDomain } from '$lib/mathAST/domain/validation/parse-student-domain';
import { expandExcludedPoints } from '$lib/mathAST/domain/validation/compare-domains';
import { computeDomain } from '$lib/mathAST/domain/compute';
import { containsValue, difference, isEmpty, isUniversal } from '$lib/mathAST/domain/algebra';
import { formatEndpointValue, formatInterval } from '$lib/mathAST/domain/format';
import { evaluate } from '$lib/mathAST/eval';
import { getVariables, substitute } from '$lib/mathAST/eval/substitute';
import { constantOf } from './constant';
import { toCustom } from '$lib/mathAST/custom-generator';
import { astOf, readingMode, readNumber, referencesOf, type ReadingMode } from './parse';
import type { Provenance } from './parse';
import { INTERNAL_LETTER, renameVariableIn } from './letter';

// =============================================================================
// Types
// =============================================================================

/** Une saisie coupée au mot « sur » : la définition, et l'ensemble écrit après (`null` sans « sur »). */
export interface SplitDefinition {
	readonly body: string;
	readonly written: string | null;
}

/** L'ensemble lu : `null` pour ℝ (rien à retenir), ou le refus en français. */
export type ReadInterval =
	| { readonly ok: true; readonly domain: Domain | null }
	| { readonly ok: false; readonly message: string };

/** L'écriture à ranger (`undefined` pour ℝ), ou le refus. */
export type CheckedInterval =
	| { readonly ok: true; readonly interval: string | undefined }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

export const UNREADABLE_INTERVAL =
	"Je n'ai pas su lire l'intervalle : écris par exemple sur [0;+∞[.";

export const ONLY_FUNCTIONS = 'Seule une fonction se définit sur un intervalle.';

/** « sur » écrit en mot par MathLive ou par la carte (`\text{ sur }`). */
const SUR_AS_TEXT = /\\(?:text|textrm|mathrm|operatorname)\s*\{\s*sur\s*\}/g;

/**
 * Le mot « sur ». En LaTeX (champ MathLive), collé à ce qui précède : seul ce qui
 * suit compte — pas une minuscule (`surface`), et jamais `\surd`. En texte, un
 * mot entier.
 */
const SUR_IN_LATEX = /(?<!\\)sur(?![a-z])/;
const SUR_IN_TEXT = /(?<![A-Za-z\\])sur(?![A-Za-z])/;

/** Un appel `f(…)` sans parenthèse dans l'argument — la forme de `TERM` (`calcul.ts`). */
const CALL = /(?<![A-Za-z_\\])([A-Za-z](?:_\d+)?)\(([^()]*)\)/g;

// =============================================================================
// Fonctions
// =============================================================================

/** Couper une saisie au mot « sur ». */
export function splitInterval(typed: string, mode: ReadingMode): SplitDefinition {
	const text = typed.replace(SUR_AS_TEXT, ' sur ');
	const match = (mode === 'latex' ? SUR_IN_LATEX : SUR_IN_TEXT).exec(text);
	if (match === null) return { body: typed, written: null };
	return {
		body: text.slice(0, match.index).trim(),
		written: text.slice(match.index + match[0].length).trim()
	};
}

/** Lire l'ensemble écrit après « sur ». */
export function readInterval(written: string, letter: string = INTERNAL_LETTER): ReadInterval {
	if (written.trim() === '' || written.length > MAX_INTERVAL_LENGTH) {
		return { ok: false, message: UNREADABLE_INTERVAL };
	}
	const read = parseStudentDomain(written, letter);
	if (!read.success) return { ok: false, message: UNREADABLE_INTERVAL };
	const domain = read.domain;
	if (isUniversal(domain)) return { ok: true, domain: null };
	if (isEmpty(domain)) return { ok: false, message: "L'intervalle est vide." };
	const points = isolatedPoints(domain);
	if (points === 1) return { ok: false, message: "L'intervalle est réduit à un point." };
	if (points > 1) return { ok: false, message: "L'ensemble est réduit à des points isolés." };
	return { ok: true, domain };
}

/**
 * L'ensemble à ranger pour une définition (déjà en x), ou le refus : illisible,
 * vide, réduit à un point, ou qui déborde du domaine de la fonction (I3).
 *
 * La définition qui cite d'autres objets n'est pas jugée sur son domaine : il
 * dépend de leurs valeurs.
 */
export function checkInterval(
	written: string,
	definition: string,
	provenance: Provenance,
	functionNames: readonly string[],
	letter: string = INTERNAL_LETTER
): CheckedInterval {
	const read = readInterval(written, letter);
	if (!read.ok) return read;
	if (read.domain === null) return { ok: true, interval: undefined };

	const ast = astOf(definition, provenance, functionNames);
	const cites = referencesOf(definition, provenance, functionNames).some(
		(r) => r.name !== INTERNAL_LETTER
	);
	if (ast === null || cites) return { ok: true, interval: written.trim() };

	const computed = computeDomain(ast, INTERNAL_LETTER);
	if (computed.unresolved !== undefined) return { ok: true, interval: written.trim() };
	const outside = difference(
		expandExcludedPoints(read.domain),
		expandExcludedPoints(computed.domain)
	);
	if (isEmpty(outside)) return { ok: true, interval: written.trim() };

	const shown = letter === INTERNAL_LETTER ? ast : renameVariableIn(ast, INTERNAL_LETTER, letter);
	const point = faultyPoint(outside);
	return {
		ok: false,
		message: `${toCustom(shown)} n'est pas défini sur tout ${intervalText(read.domain)}${point === null ? '' : ` (pas en ${point})`}.`
	};
}

/** L'ensemble d'une fonction, ou `null` (pas une fonction, ou définie sur son domaine). */
export function intervalDomainOf(object: AtelierObject | undefined): Domain | null {
	if (object?.kind !== 'function' || object.interval === undefined) return null;
	const read = readInterval(object.interval, object.letter ?? INTERNAL_LETTER);
	return read.ok ? read.domain : null;
}

/** L'ensemble à l'écran : `[0 ; +∞[`, signe moins typographique. */
export function intervalText(domain: Domain): string {
	return formatInterval(domain).replace(/-/g, '−');
}

/** L'ensemble d'une fonction à l'écran, ou `null`. */
export function intervalLabelOf(object: AtelierObject): string | null {
	const domain = intervalDomainOf(object);
	return domain === null ? null : intervalText(domain);
}

/**
 * L'ensemble dans le champ MathLive de la carte. Venu d'un champ de maths, il
 * est rendu tel quel ; venu de Calcul (texte), il est réécrit en LaTeX depuis
 * sa lecture — l'écriture que `parseStudentDomain` relit.
 */
export function intervalFieldLatex(object: AtelierObject): string | null {
	if (object.kind !== 'function' || object.interval === undefined) return null;
	if (readingMode(object.provenance ?? 'url') === 'latex') return object.interval;
	const domain = intervalDomainOf(object);
	if (domain === null) return null;
	return formatInterval(domain)
		.replace(/∞/g, '\\infty ')
		.replace(/ℝ/g, '\\R ')
		.replace(/∪/g, '\\cup ')
		.replace(/π/g, '\\pi ')
		.replace(/\s\\\s/g, '\\setminus ')
		.replace(/\{/g, '\\{')
		.replace(/\}/g, '\\}')
		.replace(/\s+/g, '');
}

/**
 * I4 : le refus d'un calcul qui évalue une fonction hors de son ensemble
 * (`f(5)` avec f sur [0 ; 2]), ou `null`. Seuls les arguments NOMBRES sont
 * jugés (`f(2+3)` compris) ; `f(x+1)` est une expression, pas une image.
 */
export function outsideIntervalRefusal(
	get: (name: string) => AtelierObject | undefined,
	input: string
): string | null {
	for (const [, name, argument] of input.matchAll(CALL)) {
		const domain = intervalDomainOf(get(name));
		if (domain === null) continue;
		const value = constantValue(argument, get);
		if (value === null || containsValue(domain, value)) continue;
		return outsideIntervalMessage(name, argument.trim(), domain);
	}
	return null;
}

/** « 5 n'est pas dans l'ensemble de définition de f, [0 ; 2]. » */
export function outsideIntervalMessage(name: string, written: string, domain: Domain): string {
	return `${written} n'est pas dans l'ensemble de définition de ${name}, ${intervalText(domain)}.`;
}

/**
 * La valeur d'un argument, ou `null` s'il dépend d'une variable. Les VALEURS de
 * l'atelier y sont remplacées par la leur (`f(b)` avec b = 5, revue du lot 1).
 */
function constantValue(
	argument: string,
	get: (name: string) => AtelierObject | undefined
): number | null {
	const direct = readNumber(argument);
	if (direct !== null) return direct;
	const ast = astOf(argument);
	if (ast === null) return null;
	const bindings: Record<string, number> = {};
	for (const variable of getVariables(ast)) {
		const object = get(variable);
		const value =
			object?.kind === 'value' && object.status === 'ok' && object.unit === undefined
				? constantOf(object.definition, object.provenance, [])
				: null;
		if (value === null) return null;
		bindings[variable] = value;
	}
	return numericValue(substitute(ast, bindings));
}

function numericValue(node: MathNode): number | null {
	try {
		const result = evaluate(node, { mode: 'decimal' });
		return result.status === 'value' &&
			typeof result.value === 'number' &&
			Number.isFinite(result.value)
			? result.value
			: null;
	} catch {
		return null;
	}
}

/** Nombre de points isolés d'un ensemble fait SEULEMENT de points (`[2;2]`, `{1;2}`), sinon 0. */
function isolatedPoints(domain: Domain): number {
	if (domain.kind !== 'interval_set' || domain.intervals.length === 0) return 0;
	const degenerate = domain.intervals.every((interval) => {
		const lower = numericValue(interval.lower.value);
		return lower !== null && lower === numericValue(interval.upper.value);
	});
	return degenerate ? domain.intervals.length : 0;
}

/** Un point de l'ensemble où la fonction n'est pas définie, à l'écran — une borne fermée d'abord. */
function faultyPoint(outside: Domain): string | null {
	if (outside.kind !== 'interval_set' || outside.intervals.length === 0) return null;
	const [first]: readonly Interval[] = outside.intervals;
	const lower = numericValue(first.lower.value);
	const upper = numericValue(first.upper.value);
	const shown = (node: MathNode) => formatEndpointValue(node).replace(/-/g, '−');
	if (first.lower.type === 'closed' && lower !== null) return shown(first.lower.value);
	if (first.upper.type === 'closed' && upper !== null) return shown(first.upper.value);
	if (lower !== null && upper !== null) {
		return String((lower + upper) / 2)
			.replace('.', ',')
			.replace('-', '−');
	}
	return null;
}
