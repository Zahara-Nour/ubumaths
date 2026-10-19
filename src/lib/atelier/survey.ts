/**
 * Atelier — `.relever E1 ; E2 quand t va de a à b pas h` (géométrie, lot 2, PR 4).
 *
 * L6 de `docs/archive/wip/atelier-geometrie-lot2-phase0.md` (validée le 2026-10-18) :
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
import { nameRejectionMessage, nextName, validateName } from './names';
import { substitutedTextOf } from './engine';
import { positionTextOf, positionSliderFor, withPosition } from './construction';
import { evaluate } from '$lib/mathAST/eval';
import { transformAST } from '$lib/mathAST/visitor';
import { format as formatUnit } from '$lib/mathAST/units';
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
	/** `dans X ; Y` : les noms des deux listes (décision de David du 2026-10-19). */
	readonly names: readonly [string, string] | null;
}

export type Refusal = { readonly ok: false; readonly message: string };

/** Un rationnel exact, dénominateur positif. */
interface Rational {
	readonly n: bigint;
	readonly d: bigint;
}

/**
 * `scale` : la taille des termes du calcul, qui dit ce qu'est un résidu de
 * flottant ; `unit` : l'unité retirée (`°`, `rad`), qui va au titre de la colonne.
 */
type Reading =
	| {
			readonly ok: true;
			readonly value: number;
			readonly scale: number;
			readonly unit: string | null;
	  }
	| Refusal;

// =============================================================================
// Constantes
// =============================================================================

const USAGE =
	'Écris par exemple .relever AM ; S quand M va de 0 à 1 pas 0,05 (deux expressions séparées par « ; »).';

/**
 * `AM ; S quand M va de 0 à 1 pas 0,05` — `a` s'écrit aussi pour `à` (sans accent),
 * les mots-clés en majuscule aussi (`Quand`, `Pas`).
 */
const COMMAND =
	/^(.+?)\s+quand\s+(\S+)\s+va\s+de\s+(\S+)\s+(?:à|a)\s+(\S+)\s+pas\s+(\S+)(?:\s+dans\s+(.*))?$/is;

/** La même, sans le pas : le refus donne alors un exemple complet (décision de David). */
const WITHOUT_STEP =
	/^(.+?)\s+quand\s+(\S+)\s+va\s+de\s+(\S+)\s+(?:à|a)\s+(\S+)(?:\s+dans\s+.*)?$/is;

const NAMES_USAGE =
	'Écris les deux noms après « dans », séparés par « ; » : … pas 0,05 dans X ; Y.';

/** Un décimal (`-1,5`, `0.05`) ou une fraction (`1/3`). */
const DECIMAL = /^(-?)(\d+)(?:[.,](\d+))?$/;
const FRACTION = /^(-?)(\d+)\/(\d+)$/;

/** Au-delà, le nombre de pas d'un refus n'a plus de sens : « plus de ». */
const STEPS_SAID_MAX = 10_000n;

/** Un nom d'objet seul : la position d'un `point_sur` qui suit une valeur. */
const OBJECT_NAME = /^[A-Za-z](?:_\d+)?$/;

/** Chiffres significatifs d'une case : assez pour un tracé, et 200 cases tiennent dans l'URL. */
const CELL_DIGITS = 10;

/** Au-delà, une case ne tient plus dans une liste qui tient dans l'URL (D8). */
const CELL_MAX = 1e15;

/**
 * Sous cette fraction de la taille de ses termes (ou du plus grand nombre de sa
 * colonne), un nombre est un résidu de flottant (`sin(t)² + cos(t)² − 1`) : 0.
 */
const NOISE = 1e-12;

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
	if (full === null) return withoutStepRefusal(argument) ?? { ok: false, message: USAGE };
	const [, expressions, name, from, to, step, named] = full;
	const parts = topLevelParts(expressions);
	if (parts.length !== 2 || parts.some((part) => part === '')) {
		return { ok: false, message: USAGE };
	}
	let names: readonly [string, string] | null = null;
	if (named !== undefined) {
		const given = named.split(';').map((part) => part.trim());
		if (given.length !== 2 || given.some((part) => part === '' || /\s/.test(part))) {
			return { ok: false, message: NAMES_USAGE };
		}
		names = [given[0], given[1]];
	}
	return { expressions: [parts[0], parts[1]], name, from, to, step, names };
}

/**
 * Le pas manque : le refus récrit la commande de l'élève avec un pas, un
 * dixième de l'étendue (`de 0 à 1` → `pas 0,1`), sinon 1.
 */
function withoutStepRefusal(argument: string): Refusal | null {
	const partial = WITHOUT_STEP.exec(argument.trim());
	if (partial === null) return null;
	const [, expressions, name, from, to] = partial;
	const parts = topLevelParts(expressions);
	if (parts.length !== 2 || parts.some((part) => part === '')) return null;
	const [a, b] = [readRational(from), readRational(to)];
	const width = a === null || b === null ? null : plus(b, { n: -a.n, d: a.d });
	const step =
		width === null || width.n <= 0n ? '1' : writtenRational(rational(width.n, width.d * 10n));
	return {
		ok: false,
		message: `Il manque le pas : écris par exemple .relever ${parts[0]} ; ${parts[1]} quand ${name} va de ${shown(from)} à ${shown(to)} pas ${step}.`
	};
}

/** Les noms donnés après `dans`, refusés comme tout nom d'objet : jamais d'écrasement. */
function namesRefusal(atelier: Atelier, names: readonly [string, string]): Refusal | null {
	if (names[0] === names[1]) {
		return {
			ok: false,
			message: `Les deux listes doivent porter deux noms différents : « ${names[0]} » est donné deux fois.`
		};
	}
	for (const name of names) {
		const rejection = validateName(name, atelier.names);
		if (rejection !== null) return { ok: false, message: nameRejectionMessage(rejection, name) };
	}
	return null;
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

/** La valeur décimale d'un arbre, ou `null`. */
function decimalOf(ast: MathNode): number | null {
	const result = evaluate(ast, { mode: 'decimal' });
	return result.status === 'value' &&
		typeof result.value === 'number' &&
		Number.isFinite(result.value)
		? result.value
		: null;
}

/** La valeur calculée exactement, puis écrite en décimal ; `null` si le calcul exact échoue. */
function exactly(ast: MathNode): number | null {
	try {
		const exact = evaluate(ast, { mode: 'exact' });
		if (exact.status !== 'value' || typeof exact.value !== 'object' || exact.value === null) {
			return null;
		}
		return decimalOf(exact.value as MathNode);
	} catch {
		return null;
	}
}

/**
 * La taille des TERMES d'un calcul : la somme des valeurs absolues de ses
 * termes de premier niveau (différences et opposés compris). `sin(t)² + cos(t)² − 1`
 * a des termes de taille 2 : un résultat de 10⁻¹⁶ y est un résidu ; `10^(-20)`
 * est un seul terme, de la taille de sa valeur.
 */
function termsScale(ast: MathNode): number | null {
	switch (ast.type) {
		case 'addition':
		case 'subtraction': {
			const left = termsScale(ast.left);
			const right = termsScale(ast.right);
			return left === null || right === null ? null : left + right;
		}
		case 'opposite':
		case 'positive':
			return termsScale(ast.operand);
		case 'delimiter':
			return termsScale(ast.content);
		default: {
			const value = decimalOf(ast);
			return value === null ? null : Math.abs(value);
		}
	}
}

/** La valeur décimale d'une expression de l'atelier, mesures comprises, en ce moment. */
function readExpression(atelier: Atelier, text: string): Reading {
	const read = substitutedTextOf(atelier, text, 'text');
	if (!read.ok) return read;
	// Un angle mesuré est une grandeur (`45[°]`) : sa valeur est le nombre, dans
	// l'unité du réglage — l'unité retirée AVANT le calcul exact, qui passerait
	// en radians
	let unit: string | null = null;
	const ast = transformAST(read.ast, {
		leaveUnit: (node) => {
			unit ??= formatUnit(node.unit, 'original');
			return node.expression;
		}
	});
	// EXACT d'abord : sin(π) vaut 0, pas 1,2246 × 10⁻¹⁶ (revue de la PR 4) ;
	// le résultat exact passe ensuite en décimal
	const value = exactly(ast) ?? decimalOf(ast);
	if (value === null) return { ok: false, message: whyNoValue(atelier, read.ast) };
	return { ok: true, value, scale: termsScale(ast) ?? Math.abs(value), unit };
}

/**
 * Une case de la liste : 10 chiffres significatifs, virgule décimale, jamais
 * de notation scientifique (la liste ne la relirait pas), jamais `-0`.
 * La valeur est déjà sous `CELL_MAX`.
 */
function cellText(value: number): string {
	const rounded = Number(value.toPrecision(CELL_DIGITS));
	if (rounded === 0) return '0';
	const text = String(rounded);
	if (!text.includes('e')) return text.replace('.', ',');
	// `1e-21` : écrit en toutes lettres, 0,000…001 (`toFixed` s'arrête à 20 décimales)
	const [mantissa, exponent] = rounded.toExponential(CELL_DIGITS - 1).split('e');
	const negative = mantissa.startsWith('-');
	const digits = mantissa.replace('-', '').replace('.', '').replace(/0+$/, '');
	const zeros = '0'.repeat(-Number(exponent) - 1);
	return `${negative ? '-' : ''}0,${zeros}${digits}`;
}

/**
 * Les résidus de flottant d'une colonne, à 0 : sous `NOISE` fois la taille des
 * termes de leur calcul, ou du plus grand nombre de la colonne.
 */
function withoutNoise(readings: readonly (Reading | undefined)[]): (number | null)[] {
	const values = readings.map((r) => (r?.ok === true ? r.value : null));
	const column = Math.max(0, ...values.map((v) => (v === null ? 0 : Math.abs(v))));
	return readings.map((reading) => {
		if (reading?.ok !== true) return null;
		const scale = Math.max(column, reading.scale);
		return Math.abs(reading.value) <= NOISE * scale ? 0 : reading.value;
	});
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
	if (!OBJECT_NAME.test(name)) {
		return {
			ok: false,
			message: `« ${name} » n’est pas un nom : écris le nom de la valeur ou du point qui varie (quand t va de …).`
		};
	}
	const definitionAt = varyingOf(atelier, name);
	if (typeof definitionAt !== 'function') return definitionAt;
	if (request.names !== null) {
		const refused = namesRefusal(atelier, request.names);
		if (refused !== null) return refused;
	}

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

	// Une ligne par pas ; un pas sans valeur, ou trop grande pour une case,
	// laisse sa ligne VIDE dans les deux listes, pour que les lignes restent
	// appariées (P1)
	const numbers = [0, 1].map((i) => withoutNoise(readings.map((pair) => pair?.[i])));
	const kept = readings.map((_, row) => numbers.every((column) => column[row] !== null));
	const large = kept.filter(
		(isKept, row) => isKept && numbers.some((column) => Math.abs(column[row]!) >= CELL_MAX)
	).length;
	const missing = kept.filter((isKept) => !isKept).length;
	const columns = numbers.map((column) =>
		column
			.map((value, row) =>
				!kept[row] || numbers.some((c) => Math.abs(c[row]!) >= CELL_MAX) ? '' : cellText(value!)
			)
			.join(' ; ')
	);

	const created: string[] = [];
	for (const [i, definition] of columns.entries()) {
		const listName = request.names?.[i] ?? nextName('list', atelier.names);
		const done = atelier.create({ kind: 'list', name: listName, definition });
		if (!done.ok) {
			// Tout ou rien : les titres ne sont posés qu'une fois les deux listes créées
			for (const made of created) atelier.remove(made);
			return { ok: false, message: done.message };
		}
		created.push(listName);
	}
	// Comme une liste créée dans Calcul, le relevé n'est pas un geste de la grille :
	// ses titres non plus (rien à « Annuler » dans Données qui n'enlèverait qu'eux)
	for (const [i, listName] of created.entries()) {
		const object = atelier.get(listName);
		// Un angle : l'unité du réglage dans le titre (« angle(B, A, C) (°) »), le
		// nombre seul dans les cases (décision de David du 2026-10-19)
		const unit = readings
			.map((pair) => pair?.[i])
			.find((reading) => reading?.ok === true && reading.unit !== null);
		const title =
			unit?.ok === true && unit.unit !== null ? `${expressions[i]} (${unit.unit})` : expressions[i];
		if (object !== undefined && isList(object) && title.length <= MAX_TITLE_LENGTH) {
			atelier.setTitle(object.column, title, { recorded: false });
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
		`Relevé de ${expressions[0]} et ${expressions[1]} quand ${name} va de ${shown(request.from)} à ${shown(request.to)}, pas ${shown(request.step)} : ${steps} ${steps === 1n ? 'ligne' : 'lignes'}, dans ${x} et ${y}.`,
		...(shortOf === null ? [] : [shortOf]),
		...(missing === 0
			? []
			: [
					missing === 1
						? '1 pas sans valeur : sa ligne est laissée vide dans les deux listes.'
						: `${missing} pas sans valeur : leurs lignes sont laissées vides dans les deux listes.`
				]),
		...(large === 0
			? []
			: [
					large === 1
						? '1 valeur trop grande pour une case (10¹⁵ ou plus) : sa ligne est laissée vide dans les deux listes.'
						: `${large} valeurs trop grandes pour une case (10¹⁵ ou plus) : leurs lignes sont laissées vides dans les deux listes.`
				]),
		`Trace le nuage : sur la carte ${x}, « Nuage avec ${y} ».`
	];
	return { ok: true, text: lines.join('\n') };
}
