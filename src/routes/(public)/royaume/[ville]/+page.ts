/**
 * Page d'une ville du Royaume, `/royaume/<ville>` (chantier cartes-site) :
 * ville connue → ses données ; adresse inconnue → 404.
 */
import { error } from '@sveltejs/kit';
import { capitalTitle, cityBySlug } from '$lib/kingdom-tour/cities';
import type { PageLoad } from './$types';

// Constantes

/** Au-delà, Google coupe la description */
const DESCRIPTION_MAX = 160;

// Functions

export const load = (({ params }) => {
	const city = cityBySlug(params.ville);
	if (!city) throw error(404, 'Cette ville n’est pas sur la carte du Royaume.');
	const description = `${city.name}, ${capitalTitle(city).replace(/^C/, 'c')} : la carte de la ville et ses ${city.places.length} lieux à visiter, dans le Royaume de Chiphre.`;
	return { city, description: description.slice(0, DESCRIPTION_MAX) };
}) satisfies PageLoad;
