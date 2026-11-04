/**
 * Panier : 99 questions au plus par modèle, y compris quand on ajoute un
 * modèle déjà présent (même borne que la série enregistrée ou partagée).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { questionCart } from '../questionCart.svelte';

const TEMPLATE = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

describe('questionCart — plafond de 99', () => {
	beforeEach(() => {
		questionCart.clearCart();
	});

	it('ajouter à un modèle présent ne dépasse pas 99', () => {
		questionCart.addToCart(TEMPLATE, 60);
		questionCart.addToCart(TEMPLATE, 60);
		expect(questionCart.allItems[0].quantity).toBe(99);
	});

	it('une première quantité au-delà de 99 est ramenée à 99', () => {
		questionCart.addToCart(TEMPLATE, 150);
		expect(questionCart.allItems[0].quantity).toBe(99);
	});

	it('Q45 : replaceWith remplace tout le panier', () => {
		questionCart.addToCart(TEMPLATE, 5);
		questionCart.replaceWith([{ templateId: OTHER, quantity: 3, delay: 40 }]);
		expect(questionCart.allItems).toEqual([{ templateId: OTHER, quantity: 3, delay: 40 }]);
	});

	it('Q45 : mergeItems additionne (plafond 99), garde la durée en place, ajoute le reste', () => {
		questionCart.addToCart(TEMPLATE, 60, 20);
		questionCart.mergeItems([
			{ templateId: TEMPLATE, quantity: 60, delay: 45 },
			{ templateId: OTHER, quantity: 2, delay: 30 }
		]);
		expect(questionCart.allItems).toEqual([
			{ templateId: TEMPLATE, quantity: 99, delay: 20 },
			{ templateId: OTHER, quantity: 2, delay: 30 }
		]);
	});
});
