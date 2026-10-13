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

import { Atelier, sequenceInputOf } from './atelier.svelte';
import { loadAtelier, saveAtelier, type AtelierState } from './persistence';
import { nextName, derivativeOf, displayName, reciprocalName, reciprocalOf } from './names';

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

	// Les fonctions renommées à l'arrivée : leurs dérivées doivent les suivre
	const arrivedAs = new Map<string, string>();

	// Les fonctions AVANT leurs dérivées : supprimer puis recréer `f` range `f′`
	// devant elle, et `f′` aurait suivi la `f` locale (revue du lot 3a, C1)
	// (et avant leur réciproque `f⁻¹`, qui suit f de la même façon)
	const order = (name: string) =>
		derivativeOf(name)?.order ?? (reciprocalOf(name) !== null ? 1 : 0);
	const ordered = [...state.objects].sort((a, b) => order(a.name) - order(b.name));

	for (const stored of ordered) {
		const taken = atelier.names;
		const wanted = stored.name;
		const derivative = derivativeOf(wanted);
		const reciprocal = reciprocalOf(wanted);
		let chosen: string;
		if (reciprocal !== null) {
			// `f⁻¹` suit f : arrivée sous le nom `g`, sa réciproque devient `g⁻¹`
			chosen = reciprocalName(arrivedAs.get(reciprocal) ?? reciprocal);
			if (taken.includes(chosen)) {
				refused.push({ name: wanted, reason: `${displayName(chosen)} existe déjà.` });
				continue;
			}
		} else if (derivative !== null) {
			// `f′` suit `f` : si `f` est arrivée sous le nom `g`, elle devient `g′`
			const base = arrivedAs.get(derivative.base) ?? derivative.base;
			chosen = `${base}${"'".repeat(derivative.order)}`;
			if (taken.includes(chosen)) {
				refused.push({ name: wanted, reason: `${displayName(chosen)} existe déjà.` });
				continue;
			}
		} else {
			chosen = taken.includes(wanted) ? nextName(stored.kind, taken) : wanted;
		}
		arrivedAs.set(wanted, chosen);

		const input = {
			kind: stored.kind,
			name: chosen,
			// La définition d'une dérivée est son propre nom : `g′(x)`, pas `f′(x)`
			definition: derivative !== null ? `${chosen}(x)` : stored.definition,
			...(stored.kind === 'function' &&
				stored.reciprocalOn !== undefined && { reciprocalOn: stored.reciprocalOn }),
			...(stored.kind === 'sequence' && { sequence: sequenceInputOf(stored) })
		};
		// Ce qui vient d'une URL a été écrit par nous : même lecture qu'au
		// rangement, pour que l'aller-retour ne change pas le sens (D10).
		// L'ensemble d'une fonction suit ; refusé, la fonction arrive sur son domaine.
		let created =
			stored.kind === 'function' && stored.interval !== undefined
				? atelier.create({ ...input, interval: stored.interval }, 'url')
				: atelier.create(input, 'url');
		if (!created.ok && stored.interval !== undefined) created = atelier.create(input, 'url');

		if (!created.ok) {
			refused.push({ name: wanted, reason: created.message });
			continue;
		}

		if (chosen === wanted) added++;
		else renamed.push({ from: wanted, to: chosen });

		// L'état d'affichage suit l'objet : un atelier reçu avec ses courbes
		// tracées s'ouvre avec ses courbes tracées, et de leurs couleurs. Les
		// réglages AVANT le tracé, sinon `setPlotted` en attribuerait de neufs.
		if (stored.display) atelier.adoptDisplay(chosen, stored.display);
		if (stored.sequenceDisplay) atelier.adoptSequenceDisplay(chosen, stored.sequenceDisplay);
		if (stored.slider) atelier.adoptSlider(chosen, stored.slider);
		if (stored.plotted) atelier.setPlotted(chosen, true);
	}

	return { added, renamed, refused };
}

/**
 * « Garder dans mon atelier » : verser un atelier reçu dans l'atelier
 * PERSONNEL, celui du navigateur, et l'enregistrer.
 *
 * ⚠️ Revue du lot 6 (C1) : la barre de partage versait dans l'atelier affiché
 * — l'atelier ÉPHÉMÈRE du lien, qui contenait déjà ces objets. Il en sortait
 * des copies renommées, et rien n'était enregistré.
 */
export function keepReceived(
	storage: Storage | null,
	received: AtelierState
): { ok: true; report: MergeReport } | { ok: false; message: string } {
	const personal = new Atelier();
	const loaded = loadAtelier(storage);
	if (loaded.kind === 'loaded') personal.restore(loaded.state);
	else if (
		loaded.kind === 'too-recent' ||
		loaded.kind === 'corrupt' ||
		loaded.kind === 'unavailable'
	) {
		return {
			ok: false,
			message: 'Ton atelier enregistré ne peut pas être ouvert ici : rien n’a été versé.'
		};
	}
	const report = mergeInto(personal, received);
	const saved = saveAtelier(storage, personal.serialize());
	if (saved.kind !== 'saved') {
		return { ok: false, message: 'Ton atelier n’a pas pu être enregistré : rien n’a été versé.' };
	}
	return { ok: true, report };
}
