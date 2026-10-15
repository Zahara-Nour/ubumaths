/**
 * Atelier — tabuler une fonction dans la grille (tableur intégré, lot 3).
 *
 * Phase 0 `docs/wip/atelier-tableur-lot3-phase0.md` : le tableau de valeurs est
 * écrit EN FORMULES — `-2`, `=A1+0,5`, `=A2+0,5`… et `=f(A1)`, `=f(A2)`… —
 * pour rester vivant : redéfinir f, bouger un curseur, changer la première case
 * recalcule tout. Ce module prépare le tableau et dit ses refus ; l'`Atelier`
 * l'écrit en un seul geste (`Atelier.tabulate`).
 *
 * @module atelier/tabulate
 */

import type { AtelierObject } from './types';
import type { Atelier } from './atelier.svelte';
import type { CellEdit } from './grid';
import { GRID_ROWS, cellName, columnLetter } from './grid';
import { displayName, nextName, reciprocalOf } from './names';
import { dependsOnMessage, parametersOf } from './types';
import { indexedFunctionMessage } from './formula';
import { intervalDomainOf } from './interval';
import { INTERNAL_LETTER } from './letter';
import { readListValue } from '$lib/statistics/read-value';
import { toCustom } from '$lib/mathAST/custom-generator';
import { decimalCommaText } from './decimal-comma';

// =============================================================================
// Types
// =============================================================================

/** Ce que l'élève a tapé : début, fin, pas, en texte (`-2`, `3`, `0,5`, `1/2`). */
export interface TabulationRequest {
	readonly name: string;
	readonly from: string;
	readonly to: string;
	readonly step: string;
}

export interface TabulationPlan {
	readonly ok: true;
	readonly edits: readonly CellEdit[];
	readonly titles: readonly [string, string];
	readonly rows: number;
	/**
	 * Le pas ne tombe pas juste sur la fin : la fin tapée (`3`), pour la note que
	 * l'`Atelier` écrit avec la dernière abscisse telle que la case la montre.
	 */
	readonly shortOf: string | null;
}

export type Refusal = { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

const DEFAULTS = { from: '-5', to: '5', step: '1' } as const;

/** Au-delà de cette largeur, un intervalle fermé se tabule en 10 pas. */
const UNIT_STEP_MAX_WIDTH = 20;

/** Un nom d'objet seul : `f`, `f_1`, `f'`, `f''`, `f^-1`. */
const OBJECT_NAME = /^[A-Za-z](?:_\d+)?(?:'*|\^-1)$/;

/** Au-delà, le nombre de lignes d'un refus n'a plus de sens (`1e-320`) : « plus de ». */
const ROWS_SAID_MAX = 10_000;

/** Les lettres proposées pour nommer une expression, quand `nextName` irait à l'indice. */
const SUGGESTED_LETTERS = ['g', 'h', 'k', 'm', 'p', 'q', 'r', 's', 'w'];

/** `.tabuler f de -2 à 3 pas 0,5` */
const COMMAND = /^(\S+)\s+de\s+(\S+)\s+à\s+(\S+)\s+pas\s+(\S+)$/;

const USAGE = 'Écris par exemple .tabuler f de -2 à 3 pas 0,5 (ou .tabuler f).';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Q-L3-3 : de −5 à 5, pas 1 ; une fonction sur un intervalle FERMÉ et borné
 * `[a ; b]` se tabule de a à b, pas 1 si b − a ⩽ 20, sinon (b − a)/10.
 */
export function tabulationDefaults(object: AtelierObject | undefined): {
	from: string;
	to: string;
	step: string;
} {
	const domain = intervalDomainOf(object);
	if (domain?.kind !== 'interval_set' || domain.intervals.length !== 1) return { ...DEFAULTS };
	const [interval] = domain.intervals;
	if (interval.lower.type !== 'closed' || interval.upper.type !== 'closed') return { ...DEFAULTS };
	const from = decimalCommaText(toCustom(interval.lower.value));
	const to = decimalCommaText(toCustom(interval.upper.value));
	const a = readListValue(from);
	const b = readListValue(to);
	if (a === null || b === null || b <= a) return { ...DEFAULTS };
	const width = b - a;
	// Un entier, jamais `2,966666666666667` (bornes `[1/3 ; 30]`, revue) : un pas
	// flottant tronqué n'arrivait plus à la fin en calcul exact
	const step = width <= UNIT_STEP_MAX_WIDTH ? '1' : String(Math.ceil(width / 10));
	return { from, to, step };
}

/** Un nombre tapé, écrit à la française pour une cellule (`−1.5` → `-1,5`). */
function written(text: string): string {
	return text.trim().replaceAll('−', '-').replaceAll('.', ',');
}

/**
 * Le tableau de `request.name`, dans les colonnes `x` (abscisses) et `image`.
 * Tout ou rien : un refus n'écrit rien.
 */
export function planTabulation(
	object: AtelierObject | undefined,
	request: TabulationRequest,
	letter: string,
	columns: { readonly x: number; readonly image: number }
): TabulationPlan | Refusal {
	if (object === undefined) return { ok: false, message: unknownMessage(request.name) };
	if (object.kind !== 'function') {
		return { ok: false, message: `On tabule une fonction : « ${request.name} » n’en est pas une.` };
	}
	// La grille ne sait pas encore appeler `f_1(…)` ni `f^-1(…)` (revue) : un
	// tableau faux ou plein d'erreurs vaut moins qu'un refus qui dit quoi faire
	const notYet = tabulationNotYet(object.name);
	if (notYet !== null) return { ok: false, message: notYet };
	// En attente (`f(x) = k*x` sans k) : la phrase de Calcul, plutôt que des cases muettes
	if (object.status !== 'ok') {
		const parameters = parametersOf(object);
		return {
			ok: false,
			message:
				parameters !== null && parameters.length > 0
					? dependsOnMessage(parameters)
					: (object.message ?? `${displayName(object.name)} ne se calcule pas encore.`)
		};
	}
	const bounds: [keyof typeof DEFAULTS, string][] = [
		['from', 'le début'],
		['to', 'la fin'],
		['step', 'le pas']
	];
	const values: Partial<Record<keyof typeof DEFAULTS, number>> = {};
	for (const [key, label] of bounds) {
		const text = request[key].trim();
		if (text === '') return { ok: false, message: `Écris ${label} du tableau.` };
		const value = readListValue(written(text));
		if (value === null) return { ok: false, message: `« ${text} » n’est pas un nombre.` };
		values[key] = value;
	}
	const { from = 0, to = 0, step = 0 } = values;
	if (step <= 0) return { ok: false, message: 'Le pas doit être positif.' };
	if (to < from) return { ok: false, message: 'La fin doit être après le début.' };

	// La marge absorbe l'erreur des flottants (`5 / 0,1` = 49,999…) : le calcul
	// des cases, lui, est exact
	const rows = Math.floor((to - from) / step + 1e-9) + 1;
	if (!Number.isFinite(rows) || rows > ROWS_SAID_MAX) {
		return {
			ok: false,
			message: `Ce tableau aurait plus de 10 000 lignes, la grille en a ${GRID_ROWS} : agrandis le pas.`
		};
	}
	if (rows > GRID_ROWS) {
		return {
			ok: false,
			message: `Ce tableau aurait ${rows} lignes, la grille en a ${GRID_ROWS} : agrandis le pas.`
		};
	}
	const last = from + (rows - 1) * step;
	const fits = Math.abs(last - to) <= 1e-9 * Math.max(1, Math.abs(to));

	const stepText = written(request.step);
	const edits: CellEdit[] = [];
	for (let row = 1; row <= rows; row++) {
		edits.push({
			column: columns.x,
			row,
			text: row === 1 ? written(request.from) : `=${cellName(columns.x, row - 1)}+${stepText}`
		});
		edits.push({
			column: columns.image,
			row,
			text: `=${object.name}(${cellName(columns.x, row)})`
		});
	}
	return {
		ok: true,
		edits,
		titles: [letter, `${displayName(object.name)}(${letter})`],
		rows,
		shortOf: fits ? null : written(request.to)
	};
}

/**
 * Ce que la grille ne sait pas encore tabuler, et pourquoi : une réciproque
 * (`f^-1(…)`) et une fonction à indice (`f_1(…)`) ne s'appellent pas dans une
 * formule (revue de la PR 1). Aussi la raison du bouton « Tabuler » de leur carte.
 */
export function tabulationNotYet(name: string): string | null {
	const base = reciprocalOf(name);
	if (base !== null) {
		return `La réciproque ${displayName(name)} ne se tabule pas encore : tabule ${base}, et lis son tableau à l’envers.`;
	}
	return /_\d/.test(name) ? indexedFunctionMessage(name) : null;
}

/** La phrase qui dit où le tableau a été écrit (Calcul et carte). */
export function tabulationReport(
	name: string,
	done: {
		readonly columns: readonly [number, number];
		readonly rows: number;
		readonly note: string | null;
	}
): string {
	const [x, image] = done.columns.map(columnLetter);
	const said = `Tableau de ${displayName(name)} écrit dans la grille, colonnes ${x} et ${image} (${done.rows} lignes).`;
	return done.note === null ? said : `${said} ${done.note}`;
}

function unknownMessage(name: string): string {
	return `« ${name} » n’existe pas dans l’atelier : définis-la d’abord, par exemple ${name}(x) = x^2.`;
}

/** Ce que `.tabuler` a lu : un nom et ses bornes (celles par défaut si absentes). */
export function readTabulationCommand(
	argument: string,
	get: (name: string) => AtelierObject | undefined,
	taken: readonly string[]
): TabulationRequest | Refusal {
	// `f⁻¹` s'écrit comme le nom rangé de la réciproque (`f^-1`)
	const text = argument.trim().replaceAll('⁻¹', '^-1').replaceAll('^{-1}', '^-1');
	if (text === '') return { ok: false, message: USAGE };
	const full = COMMAND.exec(text);
	const name = full === null ? text.split(/\s+/)[0] : full[1];
	if (!OBJECT_NAME.test(name)) {
		// Une expression (`.tabuler x^2 de 0 à 5`) : le tableau doit citer une
		// fonction pour rester vivant — refus qui dit comment faire (Q-L2-3)
		const expression = text.split(/\s+de\s+/)[0];
		const bounds = /\s+de\s+(\S+)\s+à\s+(\S+)(?:\s+pas\s+(\S+))?/.exec(text);
		const free = suggestedName(taken);
		const range =
			bounds === null
				? ''
				: ` de ${bounds[1]} à ${bounds[2]}${bounds[3] === undefined ? '' : ` pas ${bounds[3]}`}`;
		const then = `.tabuler ${free}${range}`;
		return {
			ok: false,
			message: `On tabule une fonction nommée : définis-la d’abord, par exemple ${free}(${INTERNAL_LETTER}) = ${expression}, puis ${then}.`
		};
	}
	if (full === null) {
		// `.tabuler f` seul : les valeurs par défaut ; `.tabuler f de 0` : l'usage
		if (text !== name) return { ok: false, message: USAGE };
		const object = get(name);
		if (object === undefined) return { ok: false, message: unknownMessage(name) };
		return { name, ...tabulationDefaults(object) };
	}
	return { name, from: full[2], to: full[3], step: full[4] };
}

/**
 * Un nom à proposer pour une expression : celui de `nextName`, sauf un nom à
 * indice (`f_1`), que la grille ne sait pas encore appeler (revue).
 */
function suggestedName(taken: readonly string[]): string {
	const next = nextName('function', taken);
	if (!next.includes('_')) return next;
	return SUGGESTED_LETTERS.find((letter) => !taken.includes(letter)) ?? next;
}

export function isRefusal(value: object): value is Refusal {
	return 'ok' in value && value.ok === false;
}

/** `.tabuler f de -2 à 3 pas 0,5` : le tableau dans la grille, et la ligne qui dit où. */
export function tabulateCommand(
	atelier: Atelier,
	argument: string
): { ok: true; text: string } | Refusal {
	const request = readTabulationCommand(argument, (name) => atelier.get(name), atelier.names);
	if (isRefusal(request)) return request;
	const done = atelier.tabulate(request);
	if (!done.ok) return done;
	return { ok: true, text: tabulationReport(request.name, done) };
}
