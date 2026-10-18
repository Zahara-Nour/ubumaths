/**
 * La Chatterie de Faustroll — ce que l'élève LIT à l'écran.
 *
 * Spec : docs/wip/mathoux-conception.md § 9 (Mathoux rangés par race, stade,
 * sieste et « Réveiller », silhouettes à découvrir, compteurs, vocabulaire du
 * lore sans XP ni niveau ni score).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { MathouCollection } from '$lib/mathoux/collection-logic';
import ChatteriePage from '../+page.svelte';

const REVISION_HREF = '/dashboard/revisions/decks/programme';

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
					workablePoints: 4,
					acquiredPoints: 2,
					byGrade: []
				},
				{
					notionId: 'n-ent',
					notionName: 'Entiers : division',
					name: 'le Mathou des Entiers : division',
					raceIndex: 0,
					growth: 'a_decouvrir',
					asleep: false,
					workablePoints: 2,
					acquiredPoints: 0,
					byGrade: []
				}
			]
		},
		{
			branchId: 'b-geo',
			branchName: 'Géométrie',
			raceIndex: 8,
			mathoux: [
				{
					notionId: 'n-vec',
					notionName: 'Vecteurs',
					name: 'le Mathou des Vecteurs',
					raceIndex: 8,
					growth: 'grand_matou',
					asleep: false,
					workablePoints: 3,
					acquiredPoints: 3,
					byGrade: []
				}
			]
		}
	],
	counts: { born: 2, napping: 1, toDiscover: 1 }
};

const EMPTY: MathouCollection = { races: [], counts: { born: 0, napping: 0, toDiscover: 0 } };

async function renderPage(collection: MathouCollection, unavailable = false) {
	return await render(ChatteriePage, {
		props: { data: { collection, unavailable } } as never
	});
}

describe('La Chatterie de Faustroll', () => {
	it('porte le titre du lore et les compteurs', async () => {
		await renderPage(COLLECTION);
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'La Chatterie de Faustroll' }))
			.toBeVisible();
		await expect.element(page.getByText('2 Mathoux, 1 en sieste, 1 à découvrir')).toBeVisible();
	});

	it('range les Mathoux par race (une section titrée par branche)', async () => {
		await renderPage(COLLECTION);
		const headings = page.getByRole('heading', { level: 2 }).elements();
		expect(headings.map((h) => h.textContent?.trim())).toEqual(['Nombres et calculs', 'Géométrie']);
	});

	it('montre le nom et le stade de chaque Mathou', async () => {
		await renderPage(COLLECTION);
		await expect.element(page.getByText('le Mathou des Fractions')).toBeVisible();
		await expect.element(page.getByText('Matou', { exact: true })).toBeVisible();
		await expect.element(page.getByText('le Mathou des Vecteurs')).toBeVisible();
		await expect.element(page.getByText('Grand matou', { exact: true })).toBeVisible();
	});

	it('un Mathou en sieste porte un lien « Réveiller » vers la révision', async () => {
		await renderPage(COLLECTION);
		await expect.element(page.getByText('Fait la sieste', { exact: true })).toBeVisible();
		const links = page.getByRole('link', { name: /Réveiller/ }).elements();
		expect(links).toHaveLength(1);
		expect(links[0].getAttribute('href')).toBe(REVISION_HREF);
		expect(links[0].getAttribute('aria-label')).toBe('Réveiller le Mathou des Fractions');
	});

	it('une notion pas encore commencée apparaît en silhouette « à découvrir », sans son nom', async () => {
		await renderPage(COLLECTION);
		await expect.element(page.getByText('À découvrir', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Entiers : division')).toBeVisible();
		expect(page.getByText('le Mathou des Entiers : division').elements()).toHaveLength(0);
	});

	it('aucun mot interdit par le Compendium (XP, niveau, score), ni plein ni vide', async () => {
		for (const collection of [COLLECTION, EMPTY]) {
			const { unmount } = await renderPage(collection);
			const text = document.body.textContent ?? '';
			expect(text).not.toMatch(/\bXP\b|\bniveaux?\b|\bscore\b|\blevel\b/i);
			await unmount();
		}
	});

	it('pas de <main> imbriqué : le layout porte déjà le sien', async () => {
		await renderPage(COLLECTION);
		expect(document.querySelectorAll('main')).toHaveLength(0);
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'La Chatterie de Faustroll' }))
			.toBeVisible();
	});

	it('pas de bouton retour : page de la navigation', async () => {
		await renderPage(COLLECTION);
		expect(page.getByRole('link', { name: /Retour/ }).elements()).toHaveLength(0);
	});

	it('niveau sans notion travaillable : un état explicite, pas une page vide', async () => {
		await renderPage(EMPTY);
		await expect
			.element(page.getByText(/aucune notion travaillable pour ta classe pour l’instant/i))
			.toBeVisible();
		expect(page.getByText(/0 Mathoux/).elements()).toHaveLength(0);
	});

	it('lecture en échec : le dit, au lieu d’une Chatterie vide', async () => {
		await renderPage(EMPTY, true);
		await expect.element(page.getByText(/Chatterie est fermée pour l’instant/i)).toBeVisible();
		expect(page.getByText(/aucune notion travaillable/i).elements()).toHaveLength(0);
	});
});
