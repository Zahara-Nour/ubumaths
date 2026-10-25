/**
 * La Chatterie de Faustroll — ce que l'élève LIT à l'écran.
 *
 * Spec : docs/wip/mathoux-conception.md § 9 (Mathoux rangés par race, stade,
 * sieste et « Réveiller », silhouettes à découvrir, compteurs, vocabulaire du
 * lore sans XP ni niveau ni score).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { Mathou, MathouCollection } from '$lib/mathoux/collection-logic';
import { buildSeriesLink, type SeriesCategories } from '$lib/validation/series';
import { consent } from '$lib/stores/consent.svelte';
import type { MathouCatalogId } from '$lib/mathoux/decorations';
import ChatteriePage from '../+page.svelte';

vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn(async () => {}) }));

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
					collar: null,
					glasses: null,
					hat: null,
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
					collar: null,
					glasses: null,
					hat: null,
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
					collar: null,
					glasses: null,
					hat: null,
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

describe('Décorer un Mathou (panse, cou, yeux, tête)', () => {
	const fetchMock = vi.fn();

	async function renderDecor(
		collection: MathouCollection,
		ownedDecorations: MathouCatalogId[] | null,
		balance = 0
	) {
		return await render(ChatteriePage, {
			props: { data: { collection, unavailable: false, ownedDecorations, balance } } as never
		});
	}

	/** La carte d'une décoration dans la fenêtre « Décorer ». */
	function card(id: MathouCatalogId): HTMLElement {
		const el = document.querySelector<HTMLElement>(`[role="dialog"] li[data-decoration="${id}"]`);
		if (!el) throw new Error(`carte ${id} absente`);
		return el;
	}

	beforeEach(() => {
		fetchMock.mockReset();
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ balance: 0 }), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		consent.reset();
	});

	it('« Décorer » sur chaque Mathou né, jamais sur une silhouette', async () => {
		await renderDecor(COLLECTION, []);
		const buttons = page.getByRole('button', { name: /^Décorer / }).elements();
		expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
			'Décorer le Mathou des Fractions',
			'Décorer le Mathou des Vecteurs'
		]);
	});

	it('décorations illisibles (null) : pas de « Décorer »', async () => {
		await renderDecor(COLLECTION, null);
		expect(page.getByRole('button', { name: /^Décorer / }).elements()).toHaveLength(0);
	});

	it('la décoration portée se voit sur le Mathou de la Chatterie', async () => {
		const { container } = await renderDecor(single({ decoration: 'medal' }), ['medal']);
		const deco = container.querySelector('[data-part="decoration"]');
		expect(deco?.getAttribute('data-decoration')).toBe('medal');
	});

	it('la fenêtre montre les six décorations sur CE Mathou, avec prix, « Achetée » ou « Portée par … »', async () => {
		const collection: MathouCollection = {
			...COLLECTION,
			races: COLLECTION.races.map((race) => ({
				...race,
				mathoux: race.mathoux.map((m) =>
					m.notionId === 'n-vec' ? { ...m, decoration: 'cockade' as const } : m
				)
			}))
		};
		await renderDecor(collection, ['cockade', 'heart'], 15);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		await expect
			.element(page.getByRole('heading', { name: 'Décorer le Mathou des Fractions' }))
			.toBeVisible();

		const cards = document.querySelectorAll(
			'[role="dialog"] [data-row="panse"] li[data-decoration]'
		);
		expect([...cards].map((c) => c.getAttribute('data-decoration'))).toEqual([
			'heart',
			'star',
			'gidouille',
			'cockade',
			'medal',
			'coat_of_arms'
		]);
		// Chaque dessin : le Mathou des Fractions (race 0, matou, endormi) avec la décoration
		for (const c of cards) {
			const svg = c.querySelector('svg');
			expect(svg?.getAttribute('data-stage')).toBe('matou');
			expect(svg?.getAttribute('data-asleep')).toBe('true');
			expect(c.querySelector('[data-part="decoration"]')?.getAttribute('data-decoration')).toBe(
				c.getAttribute('data-decoration')
			);
		}

		expect(card('heart').textContent).toContain('Achetée');
		expect(card('cockade').textContent).toContain('Portée par le Mathou des Vecteurs');
		expect(card('star').textContent).toContain('10');
		// 15 gidouilles : la médaille (40) est hors de portée
		expect(card('medal').textContent).toContain('Il te manque 25 gidouilles');
		expect(card('medal').querySelector('button')).toBeNull();
	});

	it('acheter : une requête pour CE Mathou, la page se recharge', async () => {
		const { invalidateAll } = await import('$app/navigation');
		await renderDecor(single({}), [], 30);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		await page
			.getByRole('button', { name: 'Acheter Cocarde pour le Mathou des Fractions' })
			.click();
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalled());
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/student/mathoux/decorations/buy',
			expect.objectContaining({ method: 'POST' })
		);
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			decoration: 'cockade',
			notionId: 'n-frac'
		});
	});

	it('refus (page périmée : déjà achetée dans un autre onglet) : le message, puis la page se recharge', async () => {
		const { invalidateAll } = await import('$app/navigation');
		vi.mocked(invalidateAll).mockClear();
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ message: 'Tu as déjà cette décoration.' }), { status: 409 })
		);
		await renderDecor(single({}), [], 30);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		const buy = page.getByRole('button', { name: 'Acheter Cœur pour le Mathou des Fractions' });
		await buy.click();
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
		// Les boutons se libèrent
		await expect.element(buy).toBeEnabled();
	});

	it('panne : pas de rechargement, les boutons se libèrent', async () => {
		const { invalidateAll } = await import('$app/navigation');
		vi.mocked(invalidateAll).mockClear();
		fetchMock.mockRejectedValue(new Error('réseau'));
		await renderDecor(single({}), [], 30);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		const buy = page.getByRole('button', { name: 'Acheter Cœur pour le Mathou des Fractions' });
		await buy.click();
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		await expect.element(buy).toBeEnabled();
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('poser une décoration portée ailleurs, ou retirer celle de ce Mathou : gratuit', async () => {
		await renderDecor(single({ decoration: 'heart' }), ['heart', 'star'], 0);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		await page
			.getByRole('button', { name: 'Retirer Cœur, portée par le Mathou des Fractions' })
			.click();
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		expect(fetchMock.mock.calls[0][0]).toBe('/api/student/mathoux/decorations/wear');
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			notionId: 'n-frac',
			decoration: null
		});

		await page.getByRole('button', { name: 'Poser Étoile sur le Mathou des Fractions' }).click();
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
			notionId: 'n-frac',
			decoration: 'star'
		});
	});

	it('le collier porté se voit sur le Mathou de la Chatterie, avec la décoration de panse', async () => {
		const { container } = await renderDecor(single({ decoration: 'heart', collar: 'bell' }), [
			'heart',
			'bell'
		]);
		expect(container.querySelector('[data-part="collier"]')?.getAttribute('data-collar')).toBe(
			'bell'
		);
		expect(
			container.querySelector('[data-part="decoration"]')?.getAttribute('data-decoration')
		).toBe('heart');
	});

	it('rangée « Cou » : les quatre colliers sur CE Mathou, avec sa décoration de panse', async () => {
		const collection: MathouCollection = {
			...COLLECTION,
			races: COLLECTION.races.map((race) => ({
				...race,
				mathoux: race.mathoux.map((m) =>
					m.notionId === 'n-vec'
						? { ...m, collar: 'leather' as const }
						: m.notionId === 'n-frac'
							? { ...m, decoration: 'star' as const }
							: m
				)
			}))
		};
		await renderDecor(collection, ['star', 'leather', 'bell'], 15);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		await expect.element(page.getByRole('heading', { name: 'Panse' })).toBeVisible();
		await expect.element(page.getByRole('heading', { name: 'Cou' })).toBeVisible();

		const cards = document.querySelectorAll('[role="dialog"] [data-row="cou"] li[data-decoration]');
		expect([...cards].map((c) => c.getAttribute('data-decoration'))).toEqual([
			'bell',
			'bow_tie',
			'leather',
			'order_chain'
		]);
		for (const c of cards) {
			expect(c.querySelector('[data-part="collier"]')?.getAttribute('data-collar')).toBe(
				c.getAttribute('data-decoration')
			);
			// Les deux se cumulent : l'étoile qu'il porte reste sur la panse
			expect(c.querySelector('[data-part="decoration"]')?.getAttribute('data-decoration')).toBe(
				'star'
			);
		}
		// Et la rangée « Panse » montre le collier qu'il porte : aucun ici
		const belly = document.querySelector('[role="dialog"] [data-row="panse"] li');
		expect(belly?.querySelector('[data-part="collier"]')).toBeNull();

		expect(card('bell').textContent).toContain('Acheté');
		expect(card('bell').textContent).not.toContain('Achetée');
		expect(card('leather').textContent).toContain('Porté par le Mathou des Vecteurs');
		expect(card('bow_tie').textContent).toContain('10');
		expect(card('order_chain').textContent).toContain('Il te manque 25 gidouilles');
	});

	it('acheter un collier : la même route d’achat, pour CE Mathou', async () => {
		await renderDecor(single({}), [], 30);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		await page
			.getByRole('button', { name: 'Acheter Collier de cuir pour le Mathou des Fractions' })
			.click();
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		expect(fetchMock.mock.calls[0][0]).toBe('/api/student/mathoux/decorations/buy');
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			decoration: 'leather',
			notionId: 'n-frac'
		});
	});

	it('poser un collier, ou retirer celui de ce Mathou : la route des colliers, gratuit', async () => {
		await renderDecor(single({ collar: 'bell' }), ['bell', 'bow_tie'], 0);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		await page
			.getByRole('button', { name: 'Retirer Ruban à grelot, porté par le Mathou des Fractions' })
			.click();
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		expect(fetchMock.mock.calls[0][0]).toBe('/api/student/mathoux/decorations/wear-collar');
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			notionId: 'n-frac',
			collar: null
		});

		await page
			.getByRole('button', { name: 'Poser Nœud papillon sur le Mathou des Fractions' })
			.click();
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		expect(fetchMock.mock.calls[1][0]).toBe('/api/student/mathoux/decorations/wear-collar');
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
			notionId: 'n-frac',
			collar: 'bow_tie'
		});
	});

	it('lunettes et chapeau portés se voient sur le Mathou de la Chatterie', async () => {
		const pieces = { glasses: 'monocle', hat: 'top_hat' } as const;
		const { container } = await renderDecor(single({ asleep: false, ...pieces }), [
			'monocle',
			'top_hat'
		]);
		expect(container.querySelector('[data-part="lunettes"]')?.getAttribute('data-glasses')).toBe(
			'monocle'
		);
		expect(container.querySelector('[data-part="chapeau"]')?.getAttribute('data-hat')).toBe(
			'top_hat'
		);

		// En sieste, il les retire
		const asleep = await renderDecor(single({ asleep: true, ...pieces }), ['monocle', 'top_hat']);
		expect(asleep.container.querySelector('[data-part="lunettes"]')).toBeNull();
		expect(asleep.container.querySelector('[data-part="chapeau"]')).toBeNull();
	});

	it('rangées « Yeux » et « Tête » : chaque pièce sur CE Mathou, avec ce qu’il porte ailleurs', async () => {
		const collection: MathouCollection = {
			...COLLECTION,
			races: COLLECTION.races.map((race) => ({
				...race,
				mathoux: race.mathoux.map((m) =>
					m.notionId === 'n-vec'
						? { ...m, glasses: 'monocle' as const, hat: 'beret' as const }
						: m.notionId === 'n-frac'
							? { ...m, collar: 'bell' as const, glasses: 'sunglasses' as const }
							: m
				)
			}))
		};
		await renderDecor(collection, ['bell', 'sunglasses', 'monocle', 'round_glasses', 'beret'], 15);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		await expect.element(page.getByRole('heading', { name: 'Yeux' })).toBeVisible();
		await expect.element(page.getByRole('heading', { name: 'Tête' })).toBeVisible();

		const eyes = document.querySelectorAll('[role="dialog"] [data-row="yeux"] li[data-decoration]');
		expect([...eyes].map((c) => c.getAttribute('data-decoration'))).toEqual([
			'round_glasses',
			'sunglasses',
			'monocle',
			'pince_nez',
			'spiral_glasses'
		]);
		for (const c of eyes) {
			expect(c.querySelector('[data-part="lunettes"]')?.getAttribute('data-glasses')).toBe(
				c.getAttribute('data-decoration')
			);
			// Le collier qu'il porte reste au cou
			expect(c.querySelector('[data-part="collier"]')?.getAttribute('data-collar')).toBe('bell');
		}
		const heads = document.querySelectorAll(
			'[role="dialog"] [data-row="tete"] li[data-decoration]'
		);
		expect([...heads].map((c) => c.getAttribute('data-decoration'))).toEqual([
			'bowler',
			'beret',
			'boater',
			'top_hat',
			'pointed_hat'
		]);
		for (const c of heads) {
			expect(c.querySelector('[data-part="chapeau"]')?.getAttribute('data-hat')).toBe(
				c.getAttribute('data-decoration')
			);
			// Les lunettes qu'il porte restent sur ses yeux
			expect(c.querySelector('[data-part="lunettes"]')?.getAttribute('data-glasses')).toBe(
				'sunglasses'
			);
		}

		// Accords : les lunettes, le monocle, le chapeau
		expect(card('round_glasses').textContent).toContain('Achetées');
		expect(card('sunglasses').textContent).toContain('Portées par le Mathou des Fractions');
		expect(card('monocle').textContent).toContain('Porté par le Mathou des Vecteurs');
		expect(card('monocle').textContent).not.toContain('Portée');
		expect(card('beret').textContent).toContain('Porté par le Mathou des Vecteurs');
		expect(card('pince_nez').textContent).toContain('Il te manque 5 gidouilles');
		expect(card('spiral_glasses').textContent).toContain('Il te manque 25 gidouilles');
	});

	it('en sieste, le Mathou montre quand même les lunettes et chapeaux à essayer', async () => {
		await renderDecor(single({ asleep: true, hat: 'bowler' }), ['bowler'], 0);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		expect(card('monocle').querySelector('[data-part="lunettes"]')).not.toBeNull();
		expect(card('beret').querySelector('[data-part="chapeau"]')).not.toBeNull();
		// Les rangées de la panse et du cou le montrent endormi, sans son chapeau
		expect(card('heart').querySelector('svg')?.getAttribute('data-asleep')).toBe('true');
		expect(card('heart').querySelector('[data-part="chapeau"]')).toBeNull();
	});

	it('acheter des lunettes ou un chapeau : la même route d’achat, pour CE Mathou', async () => {
		await renderDecor(single({}), [], 30);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		await page
			.getByRole('button', { name: 'Acheter Monocle pour le Mathou des Fractions' })
			.click();
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		expect(fetchMock.mock.calls[0][0]).toBe('/api/student/mathoux/decorations/buy');
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			decoration: 'monocle',
			notionId: 'n-frac'
		});
	});

	it('poser ou retirer lunettes et chapeau : leur route, gratuit', async () => {
		await renderDecor(single({ glasses: 'sunglasses' }), ['sunglasses', 'boater'], 0);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		await page
			.getByRole('button', {
				name: 'Retirer Lunettes de soleil, portées par le Mathou des Fractions'
			})
			.click();
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		expect(fetchMock.mock.calls[0][0]).toBe('/api/student/mathoux/decorations/wear-glasses');
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			notionId: 'n-frac',
			glasses: null
		});

		await page.getByRole('button', { name: 'Poser Canotier sur le Mathou des Fractions' }).click();
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		expect(fetchMock.mock.calls[1][0]).toBe('/api/student/mathoux/decorations/wear-hat');
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
			notionId: 'n-frac',
			hat: 'boater'
		});
	});

	it('sans consentement parental : « Acheter » est grisé', async () => {
		consent.set({
			required: true,
			hasFullAccess: false,
			inGracePeriod: false,
			gracePeriodEnds: null
		} as never);
		await renderDecor(single({}), [], 100);
		await page.getByRole('button', { name: 'Décorer le Mathou des Fractions' }).click();
		const button = card('heart').querySelector('button');
		expect(button?.disabled).toBe(true);
		await expect.element(page.getByText(/il faut l’accord de tes parents/)).toBeVisible();
	});
});
