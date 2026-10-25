/**
 * Fiche d'un bloc du catalogue (`/aide-ecriture/blocs/<bloc>`). Contenu
 * statique, rien lu en base ; la garde de l'espace reste celle du layout.
 */
import { error } from '@sveltejs/kit';
import { findBlockEntry } from '$lib/block-catalog';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const entry = findBlockEntry(params.bloc);
	// Une fiche qui a sa propre adresse (cercle trigo) n'a pas de double ici
	if (!entry || entry.href) error(404, 'Bloc inconnu');
	return { slug: entry.slug };
};
