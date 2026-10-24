/**
 * Nœud serveur de l'espace réservé (chantier demo-debug)
 * ======================================================
 *
 * Sans lui, une navigation côté client vers cet espace ne demande pas `__data.json`
 * et le hook (`reservedAreasHandle`) ne tourne pas : la page s'afficherait chez un
 * élève. Ce load force la requête à l'entrée dans l'espace et refait le contrôle.
 */

import { checkReservedArea } from '$lib/server/reservedAreasHandle';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	checkReservedArea(event);
	return {};
};
