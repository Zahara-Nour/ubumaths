/**
 * Panier : 99 questions au plus par catégorie, y compris quand on ajoute une
 * catégorie déjà présente (même borne que la série enregistrée ou partagée).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { questionCart } from '../questionCart.svelte';

const CATEGORY = { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 };

describe('questionCart — plafond de 99', () => {
	beforeEach(() => {
		questionCart.clearCart();
	});

	it('ajouter à une catégorie présente ne dépasse pas 99', () => {
		questionCart.addToCart(CATEGORY, 60);
		questionCart.addToCart(CATEGORY, 60);
		expect(questionCart.allItems[0].quantity).toBe(99);
	});

	it('une première quantité au-delà de 99 est ramenée à 99', () => {
		questionCart.addToCart(CATEGORY, 150);
		expect(questionCart.allItems[0].quantity).toBe(99);
	});
});
