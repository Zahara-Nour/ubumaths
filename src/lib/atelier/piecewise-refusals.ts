/**
 * Atelier — Q3 du chantier `fonctions-par-morceaux` (phase 0 validée par David
 * le 2026-11-28) : les commandes et les actions d'étude (`.résoudre`,
 * `.variations`, `.dériver`, tableau de valeurs…) REFUSENT clairement une
 * fonction par morceaux, et une fonction qui en cite une. Un second chantier
 * les fera morceau par morceau.
 *
 * Seules les images (`f(3)`, l'action « Image ») et l'ensemble (`.domaine f`)
 * se calculent.
 *
 * @module atelier/piecewise-refusals
 */

import type { MathNode } from '#lib/mathAST/types.ts';
import type { Atelier } from './atelier.svelte';
import { substitutedAstOf } from './engine';
import { displayName } from './names';
import { piecesOf } from './piecewise';
import { readingMode } from './parse';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * La première fonction citée dans `text` qui est par morceaux, ou qui en cite
 * une (`g(x) = f(x) + 1`), ou `null`. `f'` compte pour f.
 */
export function piecewiseCitedIn(
	atelier: Atelier,
	text: string
): { readonly name: string; readonly itself: boolean } | null {
	for (const object of atelier.objects) {
		if (object.kind !== 'function' || object.status === 'error') continue;
		const name = object.name.replace(/['′]+$/, '');
		const cited = new RegExp(`(?<![A-Za-z_\\\\])${escaped(name)}(?![A-Za-z0-9_])`);
		if (!cited.test(text)) continue;
		if (piecesOf(object.definition, readingMode(object.provenance ?? 'url')) !== null) {
			return { name, itself: true };
		}
		const substituted = substitutedAstOf(atelier, object.name);
		if (substituted.ok && hasPiecewise(substituted.ast)) return { name, itself: false };
	}
	return null;
}

/** « f est définie par morceaux : .résoudre ne l'étudie pas encore. … » */
export function piecewiseCommandMessage(
	cited: { readonly name: string; readonly itself: boolean },
	what: string
): string {
	const shown = displayName(cited.name);
	const why = cited.itself
		? `${shown} est définie par morceaux`
		: `${shown} cite une fonction définie par morceaux`;
	return `${why} : ${what} ne l'étudie pas encore. Calcule ses images, par exemple ${shown}(3), ou son ensemble avec .domaine ${shown}.`;
}

/** Le refus de Calcul pour une commande (`.résoudre`, `.dériver`…), ou `null`. */
export function piecewiseCommandRefusal(
	atelier: Atelier,
	command: string,
	argument: string
): string | null {
	const cited = piecewiseCitedIn(atelier, argument);
	return cited === null ? null : piecewiseCommandMessage(cited, `.${command}`);
}

/**
 * Une fonction par morceaux EN ATTENTE citée (`k` pas encore là), ou `null` :
 * son image ne se calcule pas, et la substitution passerait par le texte maison,
 * qui ne relit pas un nœud par morceaux (revue de la PR 2).
 */
export function pendingPiecewiseRefusal(atelier: Atelier, text: string): string | null {
	for (const object of atelier.objects) {
		if (object.kind !== 'function' || object.status !== 'pending') continue;
		if (piecesOf(object.definition, readingMode(object.provenance ?? 'url')) === null) continue;
		const cited = new RegExp(`(?<![A-Za-z_\\\\])${escaped(object.name)}(?![A-Za-z0-9_])`);
		if (!cited.test(text)) continue;
		const missing = (object.missing ?? []).map((reference) => reference.name);
		const shown = displayName(object.name);
		return missing.length === 0
			? `${shown} est en attente : elle se calculera quand ce qu'elle cite existera.`
			: `${shown} attend ${missing.join(', ')} : définis ${missing.length === 1 ? 'cette valeur' : 'ces valeurs'} d'abord (par exemple ${missing[0]} = 2).`;
	}
	return null;
}

/** L'arbre contient-il un nœud par morceaux ? */
function hasPiecewise(node: unknown): boolean {
	if (node === null || typeof node !== 'object') return false;
	if (Array.isArray(node)) return node.some(hasPiecewise);
	if ((node as MathNode).type === 'piecewise') return true;
	return Object.values(node).some(hasPiecewise);
}

function escaped(name: string): string {
	return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
