/**
 * Panier du navigateur enregistré avant l'ADR 0035 : des catégories
 * =================================================================
 *
 * Ces lignes ne sont plus relues : au chargement elles sont retirées, le panier
 * est réécrit sans elles et un message le dit. Une ligne illisible est ignorée,
 * jamais un plantage.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const toaster = vi.hoisted(() => ({
	success: vi.fn(),
	error: vi.fn(),
	warning: vi.fn(),
	info: vi.fn()
}));
vi.mock('$lib/stores/toaster.svelte', () => ({ toaster }));

import { QuestionCartStore } from '../questionCart.svelte';

// Constantes
const STORAGE_KEY = 'chiphre_question_cart';
const ADDITION_ID = '0a11f0e0-0000-4000-8000-000000000001';
const FRACTIONS_ID = '0a11f0e0-0000-4000-8000-000000000002';
const ANCIENNE = { category: { level: 2 }, quantity: 4, delay: 25 };

// Functions
/** Un panier tout neuf, relu depuis ce que contient le localStorage */
async function freshCart() {
	return new QuestionCartStore();
}

describe('questionCart — ancien panier du navigateur', () => {
	beforeEach(() => {
		localStorage.removeItem(STORAGE_KEY);
		Object.values(toaster).forEach((fn) => fn.mockClear());
	});
	afterEach(() => localStorage.removeItem(STORAGE_KEY));

	it('panier entièrement ancien : vidé, réécrit, message', async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify([ANCIENNE, { ...ANCIENNE, quantity: 1 }]));
		const cart = await freshCart();
		expect(cart.totalItems).toBe(0);
		expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual([]);
		expect(toaster.info).toHaveBeenCalledWith("Panier d'une ancienne version vidé.");
	});

	it('panier mixte : les anciennes lignes sont retirées et comptées, les neuves gardées', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify([ANCIENNE, { templateId: FRACTIONS_ID, quantity: 1, delay: 20 }, ANCIENNE])
		);
		const cart = await freshCart();
		expect(cart.allItems).toEqual([{ templateId: FRACTIONS_ID, quantity: 1, delay: 20 }]);
		expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual(cart.allItems);
		expect(toaster.info).toHaveBeenCalledWith(
			"2 questions d'une ancienne version retirées du panier."
		);
	});

	it('panier à jour : aucun message, rien de réécrit', async () => {
		const stored = JSON.stringify([{ templateId: ADDITION_ID, quantity: 2, delay: 20 }]);
		localStorage.setItem(STORAGE_KEY, stored);
		const cart = await freshCart();
		expect(cart.totalItems).toBe(1);
		expect(localStorage.getItem(STORAGE_KEY)).toBe(stored);
		expect(toaster.info).not.toHaveBeenCalled();
	});

	it('très ancien panier sans durée : 20 s', async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify([{ templateId: ADDITION_ID, quantity: 1 }]));
		const cart = await freshCart();
		expect(cart.allItems).toEqual([{ templateId: ADDITION_ID, quantity: 1, delay: 20 }]);
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
