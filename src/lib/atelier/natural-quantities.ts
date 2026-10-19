/**
 * Atelier — lire une grandeur écrite naturellement
 *
 * Phase 0 `docs/archive/wip/grandeurs-lot-c-phase0.md` (décisions de David du
 * 2026-10-11) : **« un nombre, une espace, une unité » est une grandeur** —
 * `5 km` se lit `5[km]` ; collé (`5m`) ou avec `*`, c'est un produit. C'est la
 * règle typographique officielle : une espace entre le nombre et l'unité, un
 * coefficient collé à sa lettre.
 *
 * - l'unité porte sur la fraction de nombres qui la précède : `1/2 m` se lit
 *   `(1/2)[m]` (décision de David) — pas `x/2 m`, qui reste de l'algèbre ;
 * - au-delà d'un nombre, l'unité porte sur TOUT le terme qui la précède
 *   (décision de David du 2026-10-18) : `10^3 m` → `(10^3)[m]`, `(1+2) m`,
 *   `sqrt(2) m`, `2π m`. Des NOMBRES seulement (décision de David du même
 *   jour : une unité ne s'emploie qu'avec une grandeur numérique) : une lettre,
 *   même une valeur du panneau, reste de l'algèbre (`x m`, `m g`, `2πr m`) ;
 *   `2πr[m]` impose l'unité ;
 * - deux grandeurs collées s'ajoutent : `2 h 30 min` → `2[h]+30[min]` ;
 * - une unité suivie d'une lettre (`3 a b`) ou d'une parenthèse (`2 h(3)`) reste
 *   de l'algèbre.
 *
 * Appliquée aux calculs et aux valeurs de l'atelier ; jamais aux définitions de
 * fonctions ni aux commandes (`.résoudre 2 a = 4` lirait des ares).
 *
 * @module atelier/natural-quantities
 */

import { parse as parseUnit } from '$lib/mathAST/units/parser';

// =============================================================================
// Types
// =============================================================================

/** Une unité d'une seule lettre lue comme unité : `3 t` (pour l'aide d'un refus). */
export interface SingleLetterUnit {
	readonly written: string;
	readonly letter: string;
}

export interface NaturalReading {
	/** Le texte où chaque grandeur est écrite entre crochets (`5[km]`) */
	readonly text: string;
	/** Les aides à montrer avec la réponse */
	readonly notes: readonly string[];
	/** Les unités d'une lettre lues comme unités : l'aide d'un refus de dimension */
	readonly singleLetters: readonly SingleLetterUnit[];
}

// =============================================================================
// Constantes
// =============================================================================

/** Un nombre : chiffres, décimale à virgule ou à point. */
const NUMBER = String.raw`\d+(?:[.,]\d+)?`;

/** Un symbole d'unité : lettres et caractères d'unité, un exposant entier éventuel. */
const SYMBOL = String.raw`[A-Za-zµμΩ°€$]+(?:\^-?\d+)?`;

/**
 * Un nombre (ou une fraction de nombres), AU MOINS UNE ESPACE, une écriture
 * d'unité (`km`, `km/h`, `m/s^2`, `kg.m`). Avant le nombre : rien qui l'attache
 * à un facteur (lettre, chiffre, `*`, `/`, `^`, `^-`, crochet, antislash) ; après
 * l'unité : ni lettre, ni chiffre, ni parenthèse, ni crochet — et pas une
 * lettre après des espaces (`3 a b` est un produit).
 */
const SPACED_QUANTITY = new RegExp(
	String.raw`(?<![\w.,\]\\*/^])(?<!\^[-+])(${NUMBER})(?:/(${NUMBER}))?([ \t]+)(${SYMBOL}(?:[./]${SYMBOL})*)(?![\w(\[])(?![ \t]+[A-Za-z(])`,
	'g'
);

/**
 * Une écriture d'unité précédée d'au moins une espace, après la fin d'un terme
 * (chiffre, lettre, parenthèse fermante, π) ; les mêmes refus après l'unité
 * que `SPACED_QUANTITY`. Le terme lui-même est lu par `termStart`.
 */
const UNIT_AFTER_TERM = new RegExp(
	String.raw`(?<=[\w)}π²³])[ \t]+(${SYMBOL}(?:[./]${SYMBOL})*)(?![\w(\[])(?![ \t]+[A-Za-z(])`,
	'g'
);

/** Les fonctions qu'un terme numérique peut appeler : `sqrt(2) m`. */
const NUMERIC_FUNCTIONS: ReadonlySet<string> = new Set([
	'sqrt',
	'cos',
	'sin',
	'tan',
	'ln',
	'log',
	'exp',
	'abs'
]);

/** Les opérateurs à côté desquels une espace ne coupe pas le terme : `3 * 10^8`. */
const TERM_OPERATORS = '*/^×÷·';

/** Un nombre collé à des lettres (`5km`), pour l'aide. */
const GLUED_QUANTITY = new RegExp(
	String.raw`(?<![\w.,\]\\*/^])(${NUMBER})([A-Za-z]{2,})(?![\w(\[])`,
	'g'
);

/** Une grandeur déjà écrite entre crochets : `2[h]`, `(1/2)[m]`. */
const QUANTITY_TOKEN = String.raw`(?:\(\d[\d.,]*\/\d[\d.,]*\)|\d[\d.,]*)\[[^\]]+\]`;

/**
 * Des grandeurs séparées seulement par des espaces : `2[h] 30[min]`. Leur
 * somme est mise entre parenthèses — c'est UN nombre : `1 h 30 min * 2` vaut
 * 3 h, pas 2 h (revue du lot C).
 */
const JUXTAPOSED = new RegExp(`${QUANTITY_TOKEN}(?:[ \\t]+${QUANTITY_TOKEN})+`, 'g');

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Le texte où chaque grandeur écrite naturellement est mise entre crochets,
 * avec les aides à montrer.
 *
 * @param objectNames - les noms des objets du panneau (une unité qui en est un
 *   reçoit une aide : `5 m` avec une valeur `m`)
 * @param afterTerms - lire aussi une unité après un terme (`10^3 m`) ; le champ
 *   de la carte s'en passe, il a ses propres lectures (`mathfield.ts`)
 */
export function readNaturalQuantities(
	text: string,
	objectNames: readonly string[],
	{ afterTerms = true }: { readonly afterTerms?: boolean } = {}
): NaturalReading {
	const notes = new Set<string>();
	const singleLetters: SingleLetterUnit[] = [];

	const spaced = text.replace(
		SPACED_QUANTITY,
		(whole, numerator: string, denominator: string | undefined, _space, writing: string) => {
			if (parseUnit(writing) === null) return whole;
			if (objectNames.includes(writing)) {
				notes.add(
					`${writing} est aussi un nom du panneau : pour ${numerator} × ${writing}, écris ${numerator}${writing}.`
				);
			}
			if (/^[A-Za-z]$/.test(writing)) {
				singleLetters.push({ written: whole.trim(), letter: writing });
			}
			const value = denominator === undefined ? numerator : `(${numerator}/${denominator})`;
			return `${value}[${writing}]`;
		}
	);

	const extended = afterTerms
		? quantitiesAfterTerms(spaced, objectNames, notes, singleLetters)
		: spaced;

	const glued = new Set<string>();
	for (const [, number, letters] of extended.matchAll(GLUED_QUANTITY)) {
		if (parseUnit(letters) === null) continue;
		// Une aide par unité : `5km + 3km` ne la répète pas (revue)
		if (glued.has(letters)) continue;
		glued.add(letters);
		// Des lettres qui sont toutes des valeurs du panneau : un produit voulu
		if ([...letters].every((letter) => objectNames.includes(letter))) continue;
		notes.add(`Pour une grandeur, écris ${number} ${letters} (avec une espace).`);
	}

	const summed = extended.replace(JUXTAPOSED, (run) => `(${run.split(/[ \t]+/).join('+')})`);
	return { text: summed, notes: [...notes], singleLetters };
}

/**
 * Chaque unité écrite après une espace derrière un terme numérique : `10^3 m`
 * → `(10^3)[m]`. Après la lecture des nombres (`spaced`) : ce qu'elle a déjà
 * mis entre crochets n'est plus lu ici.
 */
function quantitiesAfterTerms(
	text: string,
	objectNames: readonly string[],
	notes: Set<string>,
	singleLetters: SingleLetterUnit[]
): string {
	let result = text;
	let from = 0;
	for (;;) {
		UNIT_AFTER_TERM.lastIndex = from;
		const match = UNIT_AFTER_TERM.exec(result);
		if (match === null) return result;
		const [whole, writing] = match;
		const end = match.index;
		const start = termStart(result, end);
		const term = result.slice(start, end);
		if (parseUnit(writing) === null || !isNumericTerm(term)) {
			from = end + whole.length;
			continue;
		}
		// Comme `5 m` : l'unité l'emporte sur le nom du panneau, une note le dit
		if (objectNames.includes(writing)) {
			notes.add(
				`${writing} est aussi un nom du panneau : pour ${term} × ${writing}, écris ${term}${writing}.`
			);
		}
		if (/^[A-Za-z]$/.test(writing)) {
			singleLetters.push({ written: `${term} ${writing}`, letter: writing });
		}
		const value = isWrapped(term) ? term : `(${term})`;
		const quantity = `${value}[${writing}]`;
		result = result.slice(0, start) + quantity + result.slice(end + whole.length);
		from = start + quantity.length;
	}
}

/**
 * Le début du terme qui finit en `end` : on remonte jusqu'à un `+`, un `-`, un
 * `=`, un séparateur ou une parenthèse ouvrante du niveau du terme. Une espace
 * entre deux facteurs sans opérateur (`3 a 10^3`) le coupe aussi.
 */
function termStart(text: string, end: number): number {
	let depth = 0;
	let i = end;
	for (; i > 0; i--) {
		const char = text[i - 1];
		if (char === ')' || char === '}') depth++;
		else if (char === '(' || char === '{') {
			if (depth === 0) break;
			depth--;
		} else if (depth > 0) continue;
		// `10^-3` : le signe d'un exposant appartient au terme
		else if (char === '+' || char === '-') {
			if (text[i - 2] !== '^') break;
		}
		// `2,5` : une virgule entre deux chiffres est décimale
		else if (char === ',') {
			if (!/\d/.test(text[i - 2] ?? '') || !/\d/.test(text[i] ?? '')) break;
		} else if ('=;<>'.includes(char)) break;
		else if (/\s/.test(char)) {
			const before = text.slice(0, i).trimEnd().at(-1) ?? '';
			const after = text.slice(i).trimStart()[0] ?? '';
			if (!TERM_OPERATORS.includes(before) && !TERM_OPERATORS.includes(after)) break;
		}
	}
	while (/\s/.test(text[i] ?? '')) i++;
	return i;
}

/**
 * Un terme de nombres : chiffres, opérateurs, parenthèses, π, des fonctions
 * usuelles (`sqrt(2)`). Toute autre lettre, même une valeur du panneau, en
 * fait de l'algèbre : `m g` avec m = 70 est m × g, pas 70 grammes (revue).
 */
function isNumericTerm(term: string): boolean {
	if (term === '' || /[[\]\\]/.test(term)) return false;
	for (const identifier of term.matchAll(/[A-Za-z]+/g)) {
		const [name] = identifier;
		const isCall = /^\s*\(/.test(term.slice(identifier.index + name.length));
		if (!isCall || !NUMERIC_FUNCTIONS.has(name)) return false;
	}
	return true;
}

/** `(1+2)` : un terme déjà entre parenthèses, d'un bout à l'autre. */
function isWrapped(term: string): boolean {
	if (!term.startsWith('(') || !term.endsWith(')')) return false;
	let depth = 0;
	for (let i = 0; i < term.length; i++) {
		if (term[i] === '(') depth++;
		else if (term[i] === ')') depth--;
		if (depth === 0 && i < term.length - 1) return false;
	}
	return true;
}

/** L'aide d'un refus de dimension où une lettre a été lue comme unité. */
export function singleLetterHint(units: readonly SingleLetterUnit[]): string | null {
	if (units.length === 0) return null;
	const [{ written, letter }] = units;
	const number = written.slice(0, written.lastIndexOf(letter)).trim();
	return `« ${written} » se lit comme une grandeur (${letter} est une unité) : pour ${number} × ${letter}, écris ${number}${letter}.`;
}

/**
 * Le texte avec son ancien sens, d'avant la lecture des grandeurs : chaque
 * lettre lue comme unité collée à son nombre, comme le dit l'aide (`5 s + 1` →
 * `5s + 1`), ou `null` s'il n'y en a pas. Sert au rejeu d'un vieil historique.
 */
export function withSingleLettersGlued(text: string): string | null {
	const { singleLetters } = readNaturalQuantities(text, []);
	if (singleLetters.length === 0) return null;
	let glued = text;
	for (const { written, letter } of singleLetters) {
		const number = written.slice(0, written.lastIndexOf(letter)).trim();
		// `10^3 s` → `(10^3)s`, pas `10^3s` (= 10^(3s))
		const factor = /^[\d.,]+$/.test(number) ? number : `(${number})`;
		glued = glued.replace(written, `${factor}${letter}`);
	}
	return glued;
}
