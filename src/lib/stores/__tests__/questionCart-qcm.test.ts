/**
 * Panier : variations « en QCM » d'une ligne (chantier `idees-format`, idée 4, PR 4)
 *
 * Le choix se garde comme celui des variations : enregistré trié, retiré quand
 * vide, porté par un lien de série, gardé par la ligne déjà là à la fusion.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { questionCart } from '../questionCart.svelte';

const TEMPLATE = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

describe('questionCart — variations en QCM (idée 4)', () => {
	beforeEach(() => {
		questionCart.clearCart();
	});

	it('setChoiceVariations enregistre le choix, trié', () => {
		questionCart.addToCart(TEMPLATE, 3);
		questionCart.setChoiceVariations(TEMPLATE, [2, 0]);
		expect(questionCart.getItem(TEMPLATE)?.choiceVariations).toEqual([0, 2]);
	});

	it('setChoiceVariations sans choix retire le champ', () => {
		questionCart.addToCart(TEMPLATE, 3);
		questionCart.setChoiceVariations(TEMPLATE, [1]);
		questionCart.setChoiceVariations(TEMPLATE, undefined);
		expect(questionCart.getItem(TEMPLATE)).toEqual({
			templateId: TEMPLATE,
			quantity: 3,
			delay: 20
		});
	});

	it('un lien de série garde les variations en QCM de ses lignes', () => {
		questionCart.replaceWith([
			{ templateId: OTHER, quantity: 3, delay: 40, variations: [0, 1], choiceVariations: [1] }
		]);
		expect(questionCart.allItems).toEqual([
			{ templateId: OTHER, quantity: 3, delay: 40, variations: [0, 1], choiceVariations: [1] }
		]);
	});

	it('fusion : une ligne nouvelle garde son QCM, la ligne déjà là garde le sien', () => {
		questionCart.addToCart(TEMPLATE, 2);
		questionCart.mergeItems([
			{ templateId: TEMPLATE, quantity: 1, delay: 20, choiceVariations: [0] },
			{ templateId: OTHER, quantity: 1, delay: 20, choiceVariations: [0] }
		]);
		expect(questionCart.getItem(TEMPLATE)?.choiceVariations).toBeUndefined();
		expect(questionCart.getItem(OTHER)?.choiceVariations).toEqual([0]);
	});

	it('retirer une variation retire son QCM', () => {
		questionCart.addToCart(TEMPLATE, 3);
		questionCart.setChoiceVariations(TEMPLATE, [0, 2]);
		questionCart.setVariations(TEMPLATE, [1, 2]);
		expect(questionCart.getItem(TEMPLATE)?.choiceVariations).toEqual([2]);
		questionCart.setVariations(TEMPLATE, [1]);
		expect(questionCart.getItem(TEMPLATE)?.choiceVariations).toBeUndefined();
	});
});
