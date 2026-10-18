/**
 * Atelier — `.relever E1 ; E2 quand t va de a à b pas h` (géométrie, lot 2, PR 4).
 *
 * L6 de `docs/wip/atelier-geometrie-lot2-phase0.md` (validée le 2026-10-18) :
 * fermer la boucle du problème de l'aire. `t` est une VALEUR à curseur, ou un
 * `point_sur` dont la position est un nombre écrit ; à chaque pas, elle prend
 * la valeur du pas, tout l'atelier qui en dépend est recalculé
 * (`Atelier.sweep`), E1 et E2 sont évaluées. À la fin, l'atelier est rendu tel
 * qu'il était : seules les deux LISTES créées restent (colonnes de Données),
 * que l'élève trace en nuage depuis la carte de la première.
 *
 * L'atelier ne valide rien (décision figée n° 2) : il relève, l'élève conjecture.
 *
 * @module atelier/survey
 */

import type { Atelier } from './atelier.svelte';
import type { MathNode } from '$lib/mathAST/types';
import { MAX_LISTS, MAX_LIST_VALUES, isList, isValue } from './types';
import { MAX_TITLE_LENGTH } from './grid';
import { constantOf } from './constant';
import { nextName } from './names';
import { substitutedTextOf } from './engine';
import { positionTextOf, positionSliderFor, withPosition } from './construction';
import { evaluate } from '$lib/mathAST/eval';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { bareFunctionRefusal } from '$lib/mathAST/cli/core/variable-argument';

// =============================================================================
// Types
// =============================================================================

/** Ce que l'élève a tapé, en texte. */
export interface SurveyRequest {
	readonly expressions: readonly [string, string];
	readonly name: string;
	readonly from: string;
	readonly to: string;
	readonly step: string;
}

export type Refusal = { readonly ok: false; readonly message: string };

/** Un rationnel exact, dénominateur positif. */
interface Rational {
	readonly n: bigint;
	readonly d: bigint;
}

type Reading = { readonly ok: true; readonly value: number } | Refusal;

// =============================================================================
// Constantes
// =============================================================================

const USAGE =
	'Écris par exemple .relever AM ; S quand M va de 0 à 1 pas 0,05 (deux expressions séparées par « ; »).';

/** `AM ; S quand M va de 0 à 1 pas 0,05` — `a` s'écrit aussi pour `à` (sans accent). */
const COMMAND = /^(.+?)\s+quand\s+(\S+)\s+va\s+de\s+(\S+)\s+(?:à|a)\s+(\S+)\s+pas\s+(\S+)$/s;

/** Un décimal (`-1,5`, `0.05`) ou une fraction (`1/3`). */
const DECIMAL = /^(-?)(\d+)(?:[.,](\d+))?$/;
const FRACTION = /^(-?)(\d+)\/(\d+)$/;

/** Au-delà, le nombre de pas d'un refus n'a plus de sens : « plus de ». */
const STEPS_SAID_MAX = 10_000n;

/** Un nom d'objet seul : la position d'un `point_sur` qui suit une valeur. */
const OBJECT_NAME = /^[A-Za-z](?:_\d+)?$/;

/** Chiffres significatifs d'une case : assez pour un tracé, et 200 cases tiennent dans l'URL. */
const CELL_DIGITS = 10;

/** Au-delà, une case s'écrirait en notation scientifique, que la liste ne relit pas. */
const CELL_MAX = 1e15;

// =============================================================================
// Rationnels
// =============================================================================

function gcd(a: bigint, b: bigint): bigint {
	let [x, y] = [a < 0n ? -a : a, b < 0n ? -b : b];
	while (y !== 0n) [x, y] = [y, x % y];
	return x === 0n ? 1n : x;
}

function rational(n: bigint, d: bigint): Rational {
	const sign = d < 0n ? -1n : 1n;
	const g = gcd(n, d);
	return { n: (sign * n) / g, d: (sign * d) / g };
}

/** `0,05` → 1/20, `1/3`, `-1.5` ; `null` pour tout le reste (`π`, `a`). */
function readRational(text: string): Rational | null {
	const t = text.trim().replaceAll('−', '-');
	const decimal = DECIMAL.exec(t);
	if (decimal !== null) {
		const [, sign, whole, fraction = ''] = decimal;
		const n = BigInt(`${sign}${whole}${fraction}`);
		return rational(n, 10n ** BigInt(fraction.length));
	}
	const fraction = FRACTION.exec(t);
	if (fraction === null) return null;
	const [, sign, top, bottom] = fraction;
	if (BigInt(bottom) === 0n) return null;
	return rational(BigInt(`${sign}${top}`), BigInt(bottom));
}

function plus(a: Rational, b: Rational): Rational {
	return rational(a.n * b.d + b.n * a.d, a.d * b.d);
}

function times(a: Rational, k: bigint): Rational {
	return rational(a.n * k, a.d);
}

/** Un rationnel écrit comme l'élève l'écrirait : `0,05` s'il tombe juste, sinon `1/3`. */
function writtenRational(value: Rational): string {
	let rest = value.d;
	let twos = 0;
	let fives = 0;
	while (rest % 2n === 0n) [rest, twos] = [rest / 2n, twos + 1];
	while (rest % 5n === 0n) [rest, fives] = [rest / 5n, fives + 1];
	if (rest !== 1n) return `${value.n}/${value.d}`;
	const places = Math.max(twos, fives);
	const scale = 10n ** BigInt(places);
	const scaled = value.n * (scale / value.d);
	const negative = scaled < 0n;
	const digits = (negative ? -scaled : scaled).toString().padStart(places + 1, '0');
	const whole = digits.slice(0, digits.length - places);
	const fraction = digits.slice(digits.length - places).replace(/0+$/, '');
	return `${negative ? '-' : ''}${whole}${fraction === '' ? '' : `,${fraction}`}`;
}

// =============================================================================
// Lecture
// =============================================================================

/** Couper au « ; » de premier niveau : `aire(A ; M ; N ; P) ; AM` donne deux morceaux. */
function topLevelParts(text: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if ('([{'.includes(c)) depth++;
		else if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
		else if (c === ';' && depth === 0) {
			parts.push(text.slice(start, i).trim());
			start = i + 1;
		}
	}
	parts.push(text.slice(start).trim());
	return parts;
}

/** Ce que `.relever` a lu, ou la forme attendue. */
export function readSurveyCommand(argument: string): SurveyRequest | Refusal {
	const full = COMMAND.exec(argument.trim());
	if (full === null) return { ok: false, message: USAGE };
	const [, expressions, name, from, to, step] = full;
	const parts = topLevelParts(expressions);
	if (parts.length !== 2 || parts.some((part) => part === '')) {
		return { ok: false, message: USAGE };
	}
	return { expressions: [parts[0], parts[1]], name, from, to, step };
}

/** Un nombre tapé, écrit à la française pour un message (`0.5` → `0,5`). */
function shown(text: string): string {
	return text.trim().replaceAll('−', '-').replaceAll('.', ',');
}

// =============================================================================
// Ce qui varie
// =============================================================================

/**
 * La définition que prend `name` à chaque pas : le nombre lui-même pour une
 * valeur, `point_sur(s ; nombre)` pour un point. Refus : ce qui ne peut pas
 * varier sans effacer une formule de l'élève.
 */
function varyingOf(atelier: Atelier, name: string): ((written: string) => string) | Refusal {
	const object = atelier.get(name);
	if (object === undefined) {
		return {
			ok: false,
			message: `« ${name} » n’existe pas dans l’atelier : crée d’abord la valeur, par exemple ${name} = 0.`
		};
	}
	if (isValue(object)) {
		if (object.unit !== undefined) {
			return {
				ok: false,
				message: `« ${name} » est une grandeur en ${object.unit} : on fait varier une valeur sans unité.`
			};
		}
		if (constantOf(object.definition, object.provenance, atelier.functionNames) === null) {
			return {
				ok: false,
				message: `« ${name} » est calculée à partir d’autres objets : fais varier une valeur à curseur.`
			};
		}
		return (written) => written;
	}
	if (object.kind === 'point') {
		const position = positionTextOf(atelier, name);
		if (position === null) {
			return {
				ok: false,
				message: `« ${name} » n’est pas un point posé sur un objet : on fait varier une valeur à curseur, ou la position d’un point_sur.`
			};
		}
		if (positionSliderFor(atelier, name) === null) {
			return {
				ok: false,
				message: OBJECT_NAME.test(position)
					? `« ${name} » suit la valeur « ${position} » : écris .relever … quand ${position} va de … à … pas ….`
					: `La position de « ${name} » est une formule : écris-la en nombre (0,5) pour la faire varier.`
			};
		}
		const provenance = object.provenance ?? 'url';
		return (written) => withPosition(object.definition, provenance, written) ?? object.definition;
	}
	return {
		ok: false,
		message: `On fait varier une valeur à curseur, ou la position d’un point_sur : « ${name} » n’en est pas une.`
	};
}

// =============================================================================
// Ce qui est relevé
// =============================================================================

/** Pourquoi une expression n'a pas de valeur : ce qu'elle cite et qui manque. */
function whyNoValue(atelier: Atelier, ast: MathNode): string {
	for (const name of getVariables(ast)) {
		const object = atelier.get(name);
		if (object === undefined) return `« ${name} » n’est pas défini dans l’atelier.`;
		if (object.kind === 'point') {
			return `« ${name} » est un point ; relève une mesure (AM, aire(…)).`;
		}
		if (object.status !== 'ok') return object.message ?? `« ${name} » n’a pas de valeur.`;
	}
	return 'Cette expression n’a pas de valeur.';
}

/** La valeur décimale d'une expression de l'atelier, mesures comprises, en ce moment. */
function readExpression(atelier: Atelier, text: string): Reading {
	const read = substitutedTextOf(atelier, text, 'text');
	if (!read.ok) return read;
	// Un angle mesuré est une grandeur (`45[°]`) : sa valeur est le nombre, dans
	// l'unité du réglage
	const result = evaluate(read.ast, { mode: 'decimal' });
	if (result.status === 'value' && typeof result.value === 'number') {
		if (Number.isFinite(result.value)) return { ok: true, value: result.value };
	}
	return { ok: false, message: whyNoValue(atelier, read.ast) };
}

/**
 * Une case de la liste : 10 chiffres significatifs, virgule décimale, jamais
 * de notation scientifique (la liste ne la relirait pas). `null` : trop grand.
 */
function cellText(value: number): string | null {
	const rounded = Number(value.toPrecision(CELL_DIGITS));
	if (Math.abs(rounded) >= CELL_MAX) return null;
	if (rounded === 0) return '0';
	const text = String(rounded).includes('e')
		? rounded.toFixed(20).replace(/0+$/, '').replace(/\.$/, '')
		: String(rounded);
	return text.replace('.', ',');
}

// =============================================================================
// La commande
// =============================================================================

/** `.relever AM ; S quand M va de 0 à 1 pas 0,05` : deux listes, et la ligne qui dit où. */
export function surveyCommand(
	atelier: Atelier,
	argument: string
): { readonly ok: true; readonly text: string } | Refusal {
	const request = readSurveyCommand(argument);
	if ('ok' in request) return request;
	const { expressions, name } = request;
	// Le refus d'une ligne de Calcul (V59) : `ln t` se lirait l·n·t
	for (const expression of expressions) {
		const bare = bareFunctionRefusal(expression);
		if (bare !== null) return { ok: false, message: bare };
	}
	const definitionAt = varyingOf(atelier, name);
	if (typeof definitionAt !== 'function') return definitionAt;

	const bounds: Rational[] = [];
	for (const text of [request.from, request.to, request.step]) {
		const value = readRational(text);
		if (value === null) {
			return {
				ok: false,
				message: `« ${text} » n’est pas un nombre : écris un décimal ou une fraction (1,5 ; 1/3).`
			};
		}
		bounds.push(value);
	}
	const [from, to, step] = bounds;
	if (step.n <= 0n) return { ok: false, message: 'Le pas doit être positif.' };
	const width = plus(to, { n: -from.n, d: from.d });
	if (width.n < 0n) return { ok: false, message: 'La fin doit être après le début.' };
	// Exact : (fin − début) / pas, arrondi en dessous
	const steps = (width.n * step.d) / (width.d * step.n) + 1n;
	if (steps > BigInt(MAX_LIST_VALUES)) {
		const said = steps > STEPS_SAID_MAX ? 'plus de 10 000' : String(steps);
		return {
			ok: false,
			message: `Ce relevé ferait ${said} pas : ${MAX_LIST_VALUES} au plus. Agrandis le pas.`
		};
	}

	// D8 : deux listes de plus, et deux colonnes libres
	const held = atelier.objects.filter(isList).length;
	if (held + 2 > MAX_LISTS) {
		return {
			ok: false,
			message: `Un relevé crée deux listes, et l’atelier en a déjà ${held} sur ${MAX_LISTS} : supprime-en une d’abord.`
		};
	}
	if (atelier.freeColumns.length < 2) {
		return { ok: false, message: 'Il faut deux colonnes libres dans la grille.' };
	}

	const values = Array.from({ length: Number(steps) }, (_, k) =>
		writtenRational(plus(from, times(step, BigInt(k))))
	);
	const readings = atelier.sweep(
		name,
		values.map((value) => definitionAt(value)),
		() => expressions.map((expression) => readExpression(atelier, expression))
	);

	// Une expression sans valeur à AUCUN pas : refus, rien n'est créé
	for (const [i, expression] of expressions.entries()) {
		const failures = readings.map((pair) => pair?.[i]);
		if (failures.some((reading) => reading?.ok === true)) continue;
		const first = failures.find((reading) => reading !== undefined && !reading.ok);
		const reason =
			first !== undefined && !first.ok ? first.message : `« ${name} » ne prend pas ces valeurs.`;
		return {
			ok: false,
			message: `« ${expression} » n’a de valeur à aucun pas du relevé : ${reason}`
		};
	}

	// Une ligne par pas ; un pas sans valeur laisse sa ligne VIDE dans les deux
	// listes, pour que les lignes restent appariées (P1)
	const rows = readings.map((pair) => {
		const texts = (pair ?? []).map((reading) => (reading.ok ? cellText(reading.value) : null));
		return texts.length === 2 && texts.every((text) => text !== null) ? texts : null;
	});
	const missing = rows.filter((row) => row === null).length;
	const columns = [0, 1].map((i) => rows.map((row) => row?.[i] ?? '').join(' ; '));

	const created: string[] = [];
	for (const [i, definition] of columns.entries()) {
		const listName = nextName('list', atelier.names);
		const done = atelier.create({ kind: 'list', name: listName, definition });
		if (!done.ok) {
			for (const made of created) atelier.remove(made);
			return { ok: false, message: done.message };
		}
		created.push(listName);
		const object = atelier.get(listName);
		const title = expressions[i];
		if (object !== undefined && isList(object) && title.length <= MAX_TITLE_LENGTH) {
			atelier.setTitle(object.column, title);
		}
	}
	const [x, y] = created;

	// Exact, jamais à un flottant près : `0,3` de 0 à 1 s'arrête à 0,9
	const last = values[values.length - 1];
	const shortOf =
		last !== writtenRational(to)
			? `Le pas ne tombe pas juste sur ${shown(request.to)} : le relevé s’arrête à ${last}.`
			: null;
	const lines = [
		`Relevé de ${expressions[0]} et ${expressions[1]} quand ${name} va de ${shown(request.from)} à ${shown(request.to)}, pas ${shown(request.step)} : ${steps} lignes, dans ${x} et ${y}.`,
		...(shortOf === null ? [] : [shortOf]),
		...(missing === 0
			? []
			: [
					missing === 1
						? '1 pas sans valeur : sa ligne est laissée vide dans les deux listes.'
						: `${missing} pas sans valeur : leurs lignes sont laissées vides dans les deux listes.`
				]),
		`Trace le nuage : sur la carte ${x}, « Nuage avec ${y} ».`
	];
	return { ok: true, text: lines.join('\n') };
}
