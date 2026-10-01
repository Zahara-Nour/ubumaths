/**
 * Panier : 99 questions au plus par catégorie, y compris quand on ajoute une
 * catégorie déjà présente (même borne que la série enregistrée ou partagée).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { questionCart } from '../questionCart.svelte';

const CATEGORY = { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 };
const OTHER = { theme: 'Géométrie', domain: 'Angles', subdomain: 'Mesure', level: 2 };

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

	it('Q45 : replaceWith remplace tout le panier', () => {
		questionCart.addToCart(CATEGORY, 5);
		questionCart.replaceWith([{ category: OTHER, quantity: 3, delay: 40 }]);
		expect(questionCart.allItems).toEqual([{ category: OTHER, quantity: 3, delay: 40 }]);
	});

	it('Q45 : mergeItems additionne (plafond 99), garde la durée en place, ajoute le reste', () => {
		questionCart.addToCart(CATEGORY, 60, 20);
		questionCart.mergeItems([
			{ category: { ...CATEGORY }, quantity: 60, delay: 45 },
			{ category: OTHER, quantity: 2, delay: 30 }
		]);
		expect(questionCart.allItems).toEqual([
			{ category: CATEGORY, quantity: 99, delay: 20 },
			{ category: OTHER, quantity: 2, delay: 30 }
		]);
	});
});
