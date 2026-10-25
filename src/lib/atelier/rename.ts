/**
 * Atelier — réécrire une définition quand un objet qu'elle cite change de nom
 *
 * Une seule règle pour les deux chemins qui renomment : `Atelier.rename` (l'élève
 * renomme une carte) et la fusion (`mergeInto` : un arrivant renommé pour cause
 * de collision emmène les arrivants qui le citent, B9 de
 * `docs/archive/wip/atelier-remplacer-phase0.md`). Deux copies de la règle finiraient par
 * diverger — c'est ainsi que la fusion avait oublié de réécrire.
 *
 * @module atelier/rename
 */

import type { ObjectKind } from './types';
import type { Provenance } from './parse';
import { renameInDefinition, renameTermsInDefinition } from './parse';
import { renameInConstruction } from './construction-read';
import { renamePairs } from './measures-read';

/** Ce qu'il faut d'un objet pour réécrire sa définition. */
export interface RenamableObject {
	readonly kind: ObjectKind;
	readonly definition: string;
	readonly provenance?: Provenance;
}

/**
 * La définition après le renommage de `from` en `to`.
 *
 * ⚠️ Une liste n'est JAMAIS réécrite (Q87) : renommer un objet `A` changeait
 * `A ; B ; A ; O`, une liste de groupes sanguins. Ses formules de grille suivent
 * par `renameInFormula`.
 *
 * @param isPoint - Ce nom est-il un point, APRÈS le renommage (`from` s'appelle
 *   déjà `to`) ? Sert aux longueurs `AM`.
 * @param isTerm - `from` est une suite ou une fonction : ce nom indicé (`u_3`)
 *   est-il son terme, qui suit le renommage (`v_3`) ? Absent : aucun terme.
 */
export function renameInObject(
	object: RenamableObject,
	from: string,
	to: string,
	isPoint: (name: string) => boolean,
	isTerm?: (indexedName: string) => boolean
): string {
	if (object.kind === 'list') return object.definition;
	if (isTerm !== undefined) {
		const withTerms = renameTermsInDefinition(object.definition, from, to, isTerm);
		if (withTerms !== object.definition) {
			return renameInObject({ ...object, definition: withTerms }, from, to, isPoint);
		}
	}
	// `(AB)` : une expression régulière de mots n'y voit pas l'identifiant A
	const construction =
		object.kind === 'point' || object.kind === 'curve' || object.kind === 'value'
			? renameInConstruction(object.definition, object.provenance ?? 'url', from, to)
			: null;
	const renamed = construction ?? renameInDefinition(object.definition, from, to);
	// `AM` (lot 2, L4) : une longueur entre deux points, qu'une expression régulière
	// de mots lit comme l'identifiant AM. Appelé APRÈS que `from` s'appelle `to`
	if (object.kind !== 'value' && object.kind !== 'function' && object.kind !== 'sequence') {
		return renamed;
	}
	return renamePairs(renamed, from, to, isPoint);
}
