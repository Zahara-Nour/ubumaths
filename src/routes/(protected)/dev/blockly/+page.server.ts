/**
 * Blockly Playground Server Load
 *
 * Ne renvoie rien : la page n'en a pas besoin, et l'objet `User` complet n'a
 * pas à partir vers le navigateur (audit du chantier demo-debug, PR 2). La
 * sauvegarde d'un espace de travail le demandera le jour où Blockly deviendra
 * une vraie fonctionnalité.
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};
