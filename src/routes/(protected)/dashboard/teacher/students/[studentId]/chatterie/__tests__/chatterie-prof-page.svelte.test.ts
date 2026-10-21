/**
 * La Chatterie d'un élève, ce que le PROF lit à l'écran : les mêmes Mathoux que
 * l'élève (stade, sieste, étoiles), sans les actions de l'élève, et un retour
 * vers l'onglet Mathoux.
 *
 * Phase 0 : docs/wip/mathoux-prof-progress.md.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { MathouCollection } from '$lib/mathoux/collection-logic';
import ChatterieProfPage from '../+page.svelte';

const CATEGORIES = [
	{
		category: { theme: 'Nombres', domain: 'Fractions', subdomain: null, level: 1 },
		quantity: 1,
		delay: 20
	}
];

const COLLECTION: MathouCollection = {
	races: [
		{
			branchId: 'b-nb',
			branchName: 'Nombres et calculs',
			raceIndex: 0,
			mathoux: [
				{
					notionId: 'n-frac',
					notionName: 'Fractions',
					name: 'le Mathou des Fractions',
					raceIndex: 0,
					growth: 'matou',
					asleep: true,
					dueForRevision: true,
					trainingCategories: CATEGORIES,
					stars: ['2'],
					workablePoints: 4,
					acquiredPoints: 2,
					byGrade: []
				},
				{
					notionId: 'n-ent',
					notionName: 'Entiers',
					name: 'le Mathou des Entiers',
					raceIndex: 0,
					growth: 'chaton',
					asleep: false,
					dueForRevision: false,
					trainingCategories: CATEGORIES,
					stars: [],
					workablePoints: 2,
					acquiredPoints: 0,
					byGrade: []
				}
			]
		}
	],
	counts: { born: 2, napping: 1, toDiscover: 0 }
};

const EMPTY: MathouCollection = { races: [], counts: { born: 0, napping: 0, toDiscover: 0 } };

async function renderPage(
	data: Partial<{ collection: MathouCollection; unavailable: boolean; hasGrade: boolean }>
) {
	return await render(ChatterieProfPage, {
		props: {
			data: {
				student: { id: 's1', fullName: 'Alix Martin' },
				collection: COLLECTION,
				unavailable: false,
				hasGrade: true,
				...data
			}
		} as never
	});
}

describe('Chatterie d’un élève, vue du prof', () => {
	it('titre au nom de l’élève, compteurs, retour vers l’onglet Mathoux', async () => {
		await renderPage({});
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Chatterie de Alix Martin' }))
			.toBeVisible();
		await expect.element(page.getByText('2 Mathoux, 1 en sieste, 0 à découvrir')).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: /Retour aux Mathoux/ }))
			.toHaveAttribute('href', '/dashboard/teacher/gamification/mathoux');
	});

	it('montre stades, sieste et étoiles, comme chez l’élève', async () => {
		await renderPage({});
		await expect.element(page.getByText('Matou', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Chaton', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Fait la sieste')).toBeVisible();
		await expect.element(page.getByRole('list', { name: 'Étoiles' })).toBeVisible();
	});

	it('aucune action de l’élève : ni « Réveiller » ni « Faire grandir »', async () => {
		await renderPage({});
		await expect.element(page.getByText('le Mathou des Fractions')).toBeVisible();
		expect(page.getByRole('link', { name: /Réveiller/ }).elements()).toHaveLength(0);
		expect(page.getByRole('link', { name: /Faire grandir/ }).elements()).toHaveLength(0);
	});

	it('élève sans niveau : le dit, sans Chatterie', async () => {
		await renderPage({ hasGrade: false, collection: EMPTY });
		await expect.element(page.getByText('Pas encore de niveau : pas de Chatterie.')).toBeVisible();
	});

	it('lecture en échec : « fermée », jamais une Chatterie vide', async () => {
		await renderPage({ unavailable: true, collection: EMPTY });
		await expect.element(page.getByText(/La Chatterie est fermée pour l’instant/)).toBeVisible();
	});
});
