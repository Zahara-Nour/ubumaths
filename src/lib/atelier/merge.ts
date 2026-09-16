/**
 * Atelier — garder dans son atelier ce qu'on a reçu
 *
 * Décision Q2 (2026-09-16) : sur une collision de noms, **l'arrivant est
 * renommé**, et on dit ce qui a été fait.
 *
 * ⚠️ Jamais d'écrasement silencieux — c'est la règle du §2.2, et elle vaut ici
 * comme partout ailleurs dans l'atelier. Les deux autres voies étaient un écran
 * par collision (insupportable au-delà de deux) et le refus pur (l'élève ne
 * peut alors rien garder de ce qu'il a reçu).
 *
 * @module atelier/merge
 */

import type { Atelier } from './atelier.svelte';
import type { AtelierState } from './persistence';
import { nextName } from './names';

// =============================================================================
// Types
// =============================================================================

/** Ce qu'une fusion a fait — à montrer, jamais à taire. */
export interface MergeReport {
	/** Objets ajoutés sous leur nom d'origine. */
	readonly added: number;
	/** Objets ajoutés sous un autre nom, parce que le leur était pris. */
	readonly renamed: ReadonlyArray<{ readonly from: string; readonly to: string }>;
	/** Objets refusés, et pourquoi — un plafond atteint, par exemple. */
	readonly refused: ReadonlyArray<{ readonly name: string; readonly reason: string }>;
}

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Verser dans l'atelier ce qu'une URL portait.
 *
 * ⚠️ Les noms sont réservés **au fur et à mesure** : deux arrivants qui
 * réclament le même nom ne peuvent pas recevoir le même remplacement, sinon le
 * second écraserait le premier — l'écrasement qu'on cherche justement à éviter.
 */
export function mergeInto(atelier: Atelier, state: AtelierState): MergeReport {
	let added = 0;
	const renamed: Array<{ from: string; to: string }> = [];
	const refused: Array<{ name: string; reason: string }> = [];

	for (const stored of state.objects) {
		const taken = atelier.names;
		const wanted = stored.name;
		const chosen = taken.includes(wanted) ? nextName(stored.kind, taken) : wanted;

		const created = atelier.create(
			{ kind: stored.kind, name: chosen, definition: stored.definition },
			// Ce qui vient d'une URL a été écrit par nous : même lecture qu'au
			// rangement, pour que l'aller-retour ne change pas le sens (D10).
			'url'
		);

		if (!created.ok) {
			refused.push({ name: wanted, reason: created.message });
			continue;
		}

		if (chosen === wanted) added++;
		else renamed.push({ from: wanted, to: chosen });

		// L'état d'affichage suit l'objet : un atelier reçu avec ses courbes
		// tracées s'ouvre avec ses courbes tracées.
		if (stored.plotted) atelier.setPlotted(chosen, true);
	}

	return { added, renamed, refused };
}
