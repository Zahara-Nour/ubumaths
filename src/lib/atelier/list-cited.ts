/**
 * Une LISTE citée comme un nombre (`M = L`, `2L + 1`, `g(x) = x + L`) : la
 * même règle dans Calcul (#985) et sur les cartes. Le moteur prenait L pour
 * une lettre libre et rendait `2L+1`, une valeur « saine » sans aucun sens.
 */

import type { AtelierObject } from './types';

/**
 * Le refus à dire quand un des noms cités est une liste, sinon `null`.
 *
 * @param objects - Les objets de l'atelier
 * @param cited - Les noms que cite la saisie ou la définition
 */
export function listCitedMessage(
	objects: readonly AtelierObject[],
	cited: Iterable<string>
): string | null {
	const names = new Set(cited);
	// Une liste VIDE ne fournit rien : ceux qui la citent l'attendent, comme un
	// objet non défini (règle d'attente de l'atelier) — l'erreur vient avec ses valeurs
	const list = objects.find(
		(o) => o.kind === 'list' && o.definition.trim() !== '' && names.has(o.name)
	);
	return list === undefined ? null : `${list.name} est une liste : utilise .stats ${list.name}`;
}
