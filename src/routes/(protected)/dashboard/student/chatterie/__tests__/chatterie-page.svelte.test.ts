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
import type { Mathou, MathouCollection } from '$lib/mathoux/collection-logic';
import { buildSeriesLink, type SeriesCategories } from '$lib/validation/series';
import ChatteriePage from '../+page.svelte';

const REVISION_HREF = '/dashboard/revisions/decks/programme';

/** Catégories d'Entraînement d'une notion : une par domaine fictif. */
function categoriesFor(...domains: string[]): SeriesCategories {
	return domains.map((domain, i) => ({
		category: { theme: 'Nombres', domain, subdomain: null, level: i + 1 },
		quantity: 1,
		delay: 20
	}));
}

/** Le lien attendu, par l'encodeur des liens de série. */
function linkOf(categories: SeriesCategories): string {
	return buildSeriesLink('', categories, { mode: 'interactive' });
}

const CAT_FRAC = categoriesFor('Fractions', 'Somme');
const CAT_ENT = categoriesFor('Entiers');
const CAT_VEC = categoriesFor('Vecteurs');
const TRAIN_FRAC = linkOf(CAT_FRAC);
const TRAIN_VEC = linkOf(CAT_VEC);

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
					decoration: null,
					trainingCategories: CAT_FRAC,
					stars: [],
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
					dueForRevision: false,
					decoration: null,
					// La logique n'en donne pas à une silhouette : la page ne doit pas le montrer non plus
					trainingCategories: CAT_ENT,
					stars: [],
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
					dueForRevision: false,
					decoration: null,
					trainingCategories: CAT_VEC,
					stars: ['2', '1_SPE'],
					workablePoints: 3,
					acquiredPoints: 3,
					byGrade: []
				}
			]
		}
	],
	counts: { born: 2, napping: 1, toDiscover: 1 }
};

/** Collection d'un seul Mathou (même race que les Fractions). */
function single(mathou: Partial<Mathou>): MathouCollection {
	const base = COLLECTION.races[0].mathoux[0];
	return {
		races: [{ ...COLLECTION.races[0], mathoux: [{ ...base, ...mathou }] }],
		counts: { born: 1, napping: mathou.asleep ? 1 : 0, toDiscover: 0 }
	};
}

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

	it('un Mathou né se présente « Nom, Race », sa notion dessous ; une silhouette, sans race', async () => {
		await renderPage(COLLECTION);
		const fractions = page.getByText('le Mathou des Fractions').element();
		expect(fractions.textContent?.replace(/\s+/g, ' ').trim()).toBe(
			'le Mathou des Fractions, le Noir de Nombrilie'
		);
		await expect.element(page.getByText('Fractions', { exact: true })).toBeVisible();
		// race de l'index 8, celle de la section Géométrie du décor
		await expect.element(page.getByText(', le Discret Bigarré')).toBeVisible();
		// la silhouette (même race que Fractions) ne montre pas la race
		expect(page.getByText('le Noir de Nombrilie').elements()).toHaveLength(1);
	});

	it('un Mathou en sieste porte un lien « Réveiller » vers la révision', async () => {
		await renderPage(COLLECTION);
		await expect.element(page.getByText('Fait la sieste', { exact: true })).toBeVisible();
		const links = page.getByRole('link', { name: /Réveiller/ }).elements();
		expect(links).toHaveLength(1);
		expect(links[0].getAttribute('href')).toBe(REVISION_HREF);
		expect(links[0].getAttribute('aria-label')).toBe('Réveiller le Mathou des Fractions');
	});

	it('chaque Mathou né porte « Faire grandir » vers son Entraînement ; une silhouette, non', async () => {
		await renderPage(COLLECTION);
		const links = page.getByRole('link', { name: /^Faire grandir/ }).elements();
		expect(links.map((l) => l.getAttribute('aria-label'))).toEqual([
			'Faire grandir le Mathou des Fractions',
			'Faire grandir le Mathou des Vecteurs'
		]);
		expect(links.map((l) => l.getAttribute('href'))).toEqual([TRAIN_FRAC, TRAIN_VEC]);
		expect(links[0].textContent?.trim()).toBe('Faire grandir');
		expect(
			page.getByRole('link', { name: 'Faire grandir le Mathou des Entiers : division' }).elements()
		).toHaveLength(0);
	});

	it('une notion sans modèle publié : pas de « Faire grandir »', async () => {
		await renderPage(single({ asleep: false, dueForRevision: false, trainingCategories: null }));
		expect(page.getByRole('link', { name: /Faire grandir/ }).elements()).toHaveLength(0);
	});

	it('endormi sans carte due (point perdu seul) : « Réveiller » mène à l’Entraînement', async () => {
		await renderPage(single({ asleep: true, dueForRevision: false }));
		const links = page.getByRole('link', { name: /Réveiller/ }).elements();
		expect(links).toHaveLength(1);
		expect(links[0].getAttribute('href')).toBe(TRAIN_FRAC);
		// Un seul bouton : « Faire grandir » mènerait au même endroit
		expect(page.getByRole('link', { name: /Faire grandir/ }).elements()).toHaveLength(0);
	});

	it('endormi sans carte due ni Entraînement possible : il dort, aucun bouton', async () => {
		await renderPage(single({ asleep: true, dueForRevision: false, trainingCategories: null }));
		await expect.element(page.getByText('Fait la sieste', { exact: true })).toBeVisible();
		expect(page.getByRole('link', { name: /Réveiller|Faire grandir/ }).elements()).toHaveLength(0);
	});

	it('endormi avec carte due : « Réveiller » vers les révisions ET « Faire grandir »', async () => {
		await renderPage(single({ asleep: true, dueForRevision: true }));
		const wake = page.getByRole('link', { name: /Réveiller/ }).elements();
		expect(wake.map((l) => l.getAttribute('href'))).toEqual([REVISION_HREF]);
		const grow = page.getByRole('link', { name: /Faire grandir/ }).elements();
		expect(grow.map((l) => l.getAttribute('href'))).toEqual([TRAIN_FRAC]);
	});

	it('les étoiles portent le nom de la classe, du plus ancien au plus récent', async () => {
		await renderPage(COLLECTION);
		const lists = page.getByRole('list', { name: 'Étoiles' }).elements();
		// Seul le grand matou en a : pas de liste vide pour les autres
		expect(lists).toHaveLength(1);
		const items = [...lists[0].querySelectorAll('li')].map((li) =>
			li.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(items).toEqual(['★ 2nde', '★ 1ère Spé']);
		// Le symbole n'est pas lu (« étoile noire ») ; le nom de la classe, si
		const hidden = [...lists[0].querySelectorAll('[aria-hidden="true"]')].map((e) =>
			e.textContent?.trim()
		);
		expect(hidden).toEqual(['★', '★']);
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
