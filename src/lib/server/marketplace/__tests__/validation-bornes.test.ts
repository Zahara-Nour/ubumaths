/**
 * Bornes des schémas du marché : une annonce ne demande pas une liste illimitée
 * de modèles de cartes (même plafond qu'à la modification).
 */
import { describe, test, expect } from 'vitest';
import { createListingSchema } from '../validation';

function annonce(modeles: number) {
	return createListingSchema.safeParse({
		listing_type: 'buy',
		wanted_card_template_ids: Array.from({ length: modeles }, (_, i) => `modele-${i}`)
	});
}

describe('createListingSchema — modèles demandés', () => {
	test('10 modèles : acceptée', () => {
		expect(annonce(10).success).toBe(true);
	});

	test('11 modèles : refusée, avec le message de la borne', () => {
		const resultat = annonce(11);
		expect(resultat.success).toBe(false);
		expect(resultat.error?.issues[0].message).toBe(
			'Maximum 10 modèles de cartes peuvent être demandés'
		);
	});
});
