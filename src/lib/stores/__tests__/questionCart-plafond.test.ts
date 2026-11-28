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

describe('questionCart — variations choisies (idée 2)', () => {
	beforeEach(() => {
		questionCart.clearCart();
	});

	it('setVariations enregistre le choix, trié', () => {
		questionCart.addToCart(TEMPLATE, 3);
		questionCart.setVariations(TEMPLATE, [2, 0]);
		expect(questionCart.getItem(TEMPLATE)?.variations).toEqual([0, 2]);
	});

	it('setVariations sans choix (toutes) retire le champ', () => {
		questionCart.addToCart(TEMPLATE, 3);
		questionCart.setVariations(TEMPLATE, [1]);
		questionCart.setVariations(TEMPLATE, undefined);
		expect(questionCart.getItem(TEMPLATE)).toEqual({
			templateId: TEMPLATE,
			quantity: 3,
			delay: 20
		});
	});

	it('un lien de série garde le choix de ses lignes', () => {
		questionCart.replaceWith([{ templateId: OTHER, quantity: 3, delay: 40, variations: [1] }]);
		expect(questionCart.allItems).toEqual([
			{ templateId: OTHER, quantity: 3, delay: 40, variations: [1] }
		]);
	});

	it('fusion : la ligne déjà là garde son choix, comme sa durée', () => {
		questionCart.addToCart(TEMPLATE, 2);
		questionCart.setVariations(TEMPLATE, [0]);
		questionCart.mergeItems([{ templateId: TEMPLATE, quantity: 1, delay: 20, variations: [1] }]);
		expect(questionCart.getItem(TEMPLATE)?.variations).toEqual([0]);
	});
});

describe('questionCart — durée par question (écart L92)', () => {
	beforeEach(() => {
		questionCart.clearCart();
	});

	it('une série à 10 min rechargée : « − » retire 5 s, pas 5 min', () => {
		questionCart.replaceWith([{ templateId: TEMPLATE, quantity: 3, delay: 600 }]);
		questionCart.updateDelay(TEMPLATE, 595);
		expect(questionCart.allItems[0].delay).toBe(595);
	});

	it('bornée à 600 s, comme la série enregistrée', () => {
		questionCart.addToCart(TEMPLATE, 1, 20);
		questionCart.updateDelay(TEMPLATE, 900);
		expect(questionCart.allItems[0].delay).toBe(600);
	});
});
