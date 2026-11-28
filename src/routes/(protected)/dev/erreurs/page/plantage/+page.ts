import { dev } from '$app/env';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * Exception inattendue (pas un `error()`), pour voir « Détails techniques ».
 * En dev seulement : en prod, elle polluerait le journal des erreurs.
 */
export const load: PageLoad = () => {
	if (!dev) error(404, 'Page introuvable');
	throw new Error('Plantage de démonstration : cette exception est voulue');
};
