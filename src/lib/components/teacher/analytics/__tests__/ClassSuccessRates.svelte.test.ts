/**
 * ClassSuccessRates — taux de réussite par notion, dépliable en points
 * (chantier `taux-par-point`).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lore } from '$lib/config/lore';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ClassSuccessRates from '../ClassSuccessRates.svelte';

const NOTION = {
	id: 'n1',
	name: 'Fractions',
	branch_name: 'Nombres',
	rate: 0.64,
	students: 18,
	onlyDeclared: false,
	points: [
		{ id: 'p1', name: 'Simplifier une fraction', rate: 0.7, students: 18, onlyDeclared: false },
		{ id: 'p2', name: 'Comparer des fractions', rate: null, students: 2, onlyDeclared: false },
		{ id: 'p3', name: 'Placer sur une droite', rate: null, students: 0, onlyDeclared: true }
	]
};

describe('ClassSuccessRates', () => {
	let originalFetch: typeof globalThis.fetch;
	beforeEach(() => {
		originalFetch = globalThis.fetch;
	});
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	function mockFetch(payload: unknown) {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => payload
		} as Response);
	}

	it('liste les notions avec leur taux, points repliés', async () => {
		mockFetch({ notions: [NOTION] });
		await render(ClassSuccessRates, { classId: 'class-1' });
		await expect.element(page.getByText('Fractions', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Nombres', { exact: true })).toBeVisible();
		await expect.element(page.getByText('64 %', { exact: true })).toBeVisible();
		await expect
			.element(page.getByText(new RegExp(`18 ${lore.entities.student}s`)).first())
			.toBeVisible();
		await expect.element(page.getByText('Simplifier une fraction')).not.toBeInTheDocument();
	});

	it('un clic sur la notion déplie ses points : taux, seuil, seulement déclaré', async () => {
		mockFetch({ notions: [NOTION] });
		await render(ClassSuccessRates, { classId: 'class-1' });
		await page.getByRole('button', { name: /Fractions/ }).click();
		await expect.element(page.getByText('Simplifier une fraction')).toBeVisible();
		await expect.element(page.getByText('70 %', { exact: true })).toBeVisible();
		await expect.element(page.getByText(/Pas assez de réponses/)).toBeVisible();
		await expect.element(page.getByText(/Seulement déclaré/)).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: /Fractions/ }))
			.toHaveAttribute('aria-expanded', 'true');
	});

	it('classe sans réponse depuis la rentrée → message', async () => {
		mockFetch({ notions: [] });
		await render(ClassSuccessRates, { classId: 'class-1' });
		await expect.element(page.getByText(/Aucune réponse depuis la rentrée/)).toBeVisible();
	});

	it('aucune réponse corrigée, seulement du déclaré → message', async () => {
		mockFetch({
			notions: [
				{ ...NOTION, rate: null, students: 0, onlyDeclared: true, points: [NOTION.points[2]] }
			]
		});
		await render(ClassSuccessRates, { classId: 'class-1' });
		await expect.element(page.getByText(/Aucune réponse corrigée depuis la rentrée/)).toBeVisible();
	});

	it('points hors de l’arbre : groupe sans notion', async () => {
		mockFetch({ notions: [{ ...NOTION, id: null, name: null, branch_name: null }] });
		await render(ClassSuccessRates, { classId: 'class-1' });
		await expect.element(page.getByText('Points sans notion')).toBeVisible();
	});

	it('erreur de lecture → message dans le cadre du widget', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			json: async () => ({ error: 'Boom' })
		} as Response);
		await render(ClassSuccessRates, { classId: 'class-1' });
		await expect.element(page.getByText('⚠ Boom')).toBeVisible();
	});
});
