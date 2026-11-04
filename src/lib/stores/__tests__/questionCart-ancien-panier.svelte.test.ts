/**
 * Panier du navigateur enregistré avant l'ADR 0035 : des catégories
 * =================================================================
 *
 * Relu au chargement, il attend les modèles (`resolveLegacy`) pour devenir des
 * lignes `{ templateId, … }` ; une ancienne ligne sans modèle est abandonnée et
 * comptée ; une ligne illisible est ignorée, jamais un plantage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuestionCartStore } from '../questionCart.svelte';

// Constantes
const STORAGE_KEY = 'chiphre_question_cart';
const ADDITION_ID = '0a11f0e0-0000-4000-8000-000000000001';
const FRACTIONS_ID = '0a11f0e0-0000-4000-8000-000000000002';

const TEMPLATES = [
	{ id: ADDITION_ID, theme: 'Nombres', domain: 'Calcul', subdomain: null, level: 2 },
	{ id: FRACTIONS_ID, theme: 'Nombres', domain: 'Fractions', subdomain: null, level: 3 }
];

// Functions
/** Un panier tout neuf, relu depuis ce que contient le localStorage */
async function freshCart() {
	return new QuestionCartStore();
}

describe('questionCart — ancien panier du navigateur', () => {
	beforeEach(() => localStorage.removeItem(STORAGE_KEY));
	afterEach(() => localStorage.removeItem(STORAGE_KEY));

	it('les catégories attendent les modèles, puis deviennent des lignes', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify([
				{
					category: { theme: 'Nombres', domain: 'Calcul', subdomain: null, level: '2' },
					quantity: 4,
					delay: 25
				},
				{ templateId: FRACTIONS_ID, quantity: 1, delay: 20 }
			])
		);
		const cart = await freshCart();
		// Avant les modèles : la ligne nouvelle est là, l'ancienne compte déjà
		expect(cart.allItems).toEqual([{ templateId: FRACTIONS_ID, quantity: 1, delay: 20 }]);
		expect(cart.totalItems).toBe(2);

		expect(cart.resolveLegacy(TEMPLATES)).toBe(0);
		expect(cart.allItems).toEqual([
			{ templateId: FRACTIONS_ID, quantity: 1, delay: 20 },
			{ templateId: ADDITION_ID, quantity: 4, delay: 25 }
		]);
		// Réécrit dans la nouvelle forme
		expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(cart.allItems);
	});

	it('très ancien panier sans durée : 20 s', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify([
				{ category: { theme: 'Nombres', domain: 'Calcul', subdomain: null, level: 2 }, quantity: 1 }
			])
		);
		const cart = await freshCart();
		cart.resolveLegacy(TEMPLATES);
		expect(cart.allItems).toEqual([{ templateId: ADDITION_ID, quantity: 1, delay: 20 }]);
	});

	it('une catégorie sans modèle publié est abandonnée et comptée', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify([
				{
					category: { theme: 'Disparu', domain: 'Nulle part', subdomain: null, level: 1 },
					quantity: 2,
					delay: 20
				}
			])
		);
		const cart = await freshCart();
		expect(cart.resolveLegacy(TEMPLATES)).toBe(1);
		expect(cart.totalItems).toBe(0);
	});

	it('une ligne illisible est ignorée, les autres gardées ; un JSON abîmé vide le panier', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify([{ n_importe: 'quoi' }, { templateId: ADDITION_ID, quantity: 2, delay: 20 }])
		);
		expect((await freshCart()).allItems).toEqual([
			{ templateId: ADDITION_ID, quantity: 2, delay: 20 }
		]);

		localStorage.setItem(STORAGE_KEY, '{abîmé');
		expect((await freshCart()).totalItems).toBe(0);
	});

	it('lien fabriqué : un modèle présent deux fois ne fait qu’une ligne (quantités additionnées)', async () => {
		const cart = await freshCart();
		cart.replaceWith([
			{ templateId: ADDITION_ID, quantity: 2, delay: 20 },
			{ templateId: ADDITION_ID, quantity: 3, delay: 40 }
		]);
		expect(cart.allItems).toEqual([{ templateId: ADDITION_ID, quantity: 5, delay: 20 }]);
	});
});
