/**
 * Atelier — lire une grandeur écrite naturellement
 *
 * Phase 0 `docs/wip/grandeurs-lot-c-phase0.md` (décisions de David du
 * 2026-10-11) : **« un nombre, une espace, une unité » est une grandeur** —
 * `5 km` se lit `5[km]` ; collé (`5m`) ou avec `*`, c'est un produit. C'est la
 * règle typographique officielle : une espace entre le nombre et l'unité, un
 * coefficient collé à sa lettre.
 *
 * - l'unité porte sur la fraction de nombres qui la précède : `1/2 m` se lit
 *   `(1/2)[m]` (décision de David) — pas `x/2 m`, qui reste de l'algèbre ;
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
 * à un facteur (lettre, chiffre, `*`, `/`, `^`, crochet, antislash) ; après
 * l'unité : ni lettre, ni chiffre, ni parenthèse, ni crochet — et pas une
 * lettre après des espaces (`3 a b` est un produit).
 */
const SPACED_QUANTITY = new RegExp(
	String.raw`(?<![\w.,\]\\*/^])(${NUMBER})(?:/(${NUMBER}))?([ \t]+)(${SYMBOL}(?:[./]${SYMBOL})*)(?![\w(\[])(?![ \t]+[A-Za-z(])`,
	'g'
);

/** Un nombre collé à des lettres (`5km`), pour l'aide. */
const GLUED_QUANTITY = new RegExp(
	String.raw`(?<![\w.,\]\\*/^])(${NUMBER})([A-Za-z]{2,})(?![\w(\[])`,
	'g'
);

/** Deux grandeurs séparées seulement par des espaces : `2[h] 30[min]`. */
const JUXTAPOSED = /\][ \t]+(?=\(?\d[\d.,/]*\)?\[)/g;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Le texte où chaque grandeur écrite naturellement est mise entre crochets,
 * avec les aides à montrer.
 *
 * @param objectNames - les noms des objets du panneau (une unité qui en est un
 *   reçoit une aide : `5 m` avec une valeur `m`)
 */
export function readNaturalQuantities(
	text: string,
	objectNames: readonly string[]
): NaturalReading {
	const notes: string[] = [];
	const singleLetters: SingleLetterUnit[] = [];

	const spaced = text.replace(
		SPACED_QUANTITY,
		(whole, numerator: string, denominator: string | undefined, _space, writing: string) => {
			if (parseUnit(writing) === null) return whole;
			if (objectNames.includes(writing)) {
				notes.push(
					`${writing} est aussi une valeur du panneau : pour ${numerator} × ${writing}, écris ${numerator}${writing}.`
				);
			}
			if (/^[A-Za-z]$/.test(writing)) {
				singleLetters.push({ written: whole.trim(), letter: writing });
			}
			const value = denominator === undefined ? numerator : `(${numerator}/${denominator})`;
			return `${value}[${writing}]`;
		}
	);

	for (const [, number, letters] of spaced.matchAll(GLUED_QUANTITY)) {
		if (parseUnit(letters) === null) continue;
		// Des lettres qui sont toutes des valeurs du panneau : un produit voulu
		if ([...letters].every((letter) => objectNames.includes(letter))) continue;
		notes.push(`Pour une grandeur, écris ${number} ${letters} (avec une espace).`);
	}

	return { text: spaced.replace(JUXTAPOSED, ']+'), notes, singleLetters };
}

/** L'aide d'un refus de dimension où une lettre a été lue comme unité. */
export function singleLetterHint(units: readonly SingleLetterUnit[]): string | null {
	if (units.length === 0) return null;
	const [{ written, letter }] = units;
	const number = written.slice(0, written.lastIndexOf(letter)).trim();
	return `« ${written} » se lit comme une grandeur (${letter} est une unité) : pour ${number} × ${letter}, écris ${number}${letter}.`;
}
