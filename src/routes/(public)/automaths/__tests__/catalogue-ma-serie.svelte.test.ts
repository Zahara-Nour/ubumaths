/**
 * Catalogue Automaths : « Ma série » (PR 4)
 * =========================================
 *
 * Phase 0 validée par David le 2026-11-19 : aperçu « Ma série · 2 questions ·
 * environ 1 min 40 » (chaque question, ses répétitions, une croix qui la
 * retire ; aucun réglage) et lien « Ouvrir ma série » vers la page détaillée.
 * Grand écran (≥ 1 280 px) : colonne à droite, plus de bouton rond. Tablette :
 * bouton rond → panneau. Téléphone : barre en bas → panneau du bas, absente si
 * la série est vide. « Ma série » à la place de « panier » sur les tuiles.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const pageState = vi.hoisted(() => ({
	url: new URL('http://localhost:5175/automaths'),
	state: {}
}));
const replaceState = vi.hoisted(() => vi.fn());
vi.mock('$app/state', () => ({ page: pageState }));
vi.mock('$app/navigation', async () =>
	(await import('#tests/helpers/app-navigation-mock.ts')).appNavigationMock({ replaceState })
);

import Page from '../+page.svelte';
import { questionTemplatesCache } from '#lib/stores/questionTemplates.svelte.ts';
import { questionCart } from '#lib/stores/questionCart.svelte.ts';
// Modèle réel relu (Entiers #139) : son aperçu se calcule, sa tuile a son bouton
import fixture from '../../../../../data/relecture/entiers/139.json';

const NODES = [
	{ id: 'b-nombres', kind: 'branch', name: 'Nombres et calculs', parent_id: null, position: 0 },
	{ id: 'n-add', kind: 'notion', name: 'Addition', parent_id: 'b-nombres', position: 0 },
	{ id: 'n-frac', kind: 'notion', name: 'Fractions', parent_id: 'b-nombres', position: 1 }
];

const TEMPLATES = [
	{
		...fixture.template,
		id: 'add',
		title: 'Somme de deux entiers',
		classification_node_id: 'n-add',
		grades: ['CP'],
		status: 'published'
	},
	{
		id: 'frac',
		type: 'fill_in_blanks',
		title: 'Fractions égales',
		classification_node_id: 'n-frac',
		level: 1,
		grades: ['6'],
		status: 'published',
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }]
	},
	{
		id: 'moitie',
		type: 'fill_in_blanks',
		title: 'Moitié de $\\frac{1}{2}$',
		classification_node_id: 'n-frac',
		level: 1,
		grades: ['6'],
		status: 'published',
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }]
	}
];

async function seedTemplatesCache() {
	questionTemplatesCache.clear();
	vi.stubGlobal(
		'fetch',
		async () => new Response(JSON.stringify({ templates: TEMPLATES, nodes: NODES }))
	);
	await questionTemplatesCache.fetchTemplates();
	vi.unstubAllGlobals();
}

/** « Somme de deux entiers » ×4 (20 s) + « Fractions égales » ×1 (20 s) = 100 s */
function fillSeries() {
	questionCart.addToCart('add', 4, 20);
	questionCart.addToCart('frac', 1, 20);
}

function seriesColumn() {
	return page.getByRole('complementary', { name: 'Ma série' });
}

beforeEach(async () => {
	replaceState.mockClear();
	sessionStorage.clear();
	questionCart.clearCart();
	pageState.url = new URL('http://localhost:5175/automaths');
	await seedTemplatesCache();
});

describe('Ma série — grand écran (≥ 1 280 px)', () => {
	beforeEach(async () => {
		await page.viewport(1280, 900);
	});

	it('colonne à droite : nombre de questions, durée totale, chaque question et ses répétitions', async () => {
		fillSeries();
		await render(Page);

		const column = seriesColumn();
		await expect.element(column).toBeVisible();
		await expect.element(column.getByText('2 questions · environ 1 min 40')).toBeVisible();
		await expect.element(column.getByText('Somme de deux entiers')).toBeVisible();
		await expect.element(column.getByText('×4')).toBeVisible();
		await expect.element(column.getByText('Fractions égales')).toBeVisible();
		await expect.element(column.getByText('×1')).toBeVisible();
	});

	it('la colonne est à droite du contenu et reste visible quand on descend', async () => {
		fillSeries();
		await page.viewport(1280, 400);
		await render(Page);
		await expect.element(seriesColumn()).toBeVisible();

		const column = seriesColumn().element();
		const search = page.getByRole('searchbox', { name: 'Chercher une question' }).element();
		expect(column.getBoundingClientRect().left).toBeGreaterThan(
			search.getBoundingClientRect().right
		);

		// Page défilée tout en bas : l'aperçu reste collé en haut de l'écran (top-4)
		// Contenu de test court : la grille est allongée pour que la page défile ;
		// le banc de test bloque le défilement (overflow: hidden sur html et body)
		const grid = column.parentElement!;
		grid.style.minHeight = '3000px';
		document.documentElement.style.overflow = 'auto';
		document.body.style.overflow = 'visible';
		window.scrollTo(0, 1500);
		await expect.poll(() => window.scrollY).toBeGreaterThan(100);
		const sticky = column.querySelector<HTMLElement>('[data-series-sticky]')!;
		await expect.poll(() => Math.round(sticky.getBoundingClientRect().top)).toBe(16);
		window.scrollTo(0, 0);
		grid.style.minHeight = '';
		document.documentElement.style.overflow = '';
		document.body.style.overflow = '';
	});

	it('titre avec formule : la croix porte un nom neutre', async () => {
		questionCart.addToCart('moitie', 1, 20);
		await render(Page);

		await expect
			.element(seriesColumn().getByRole('button', { name: 'Retirer la question 1' }))
			.toBeVisible();
	});

	it('pas de bouton rond ni de barre', async () => {
		fillSeries();
		await render(Page);

		await expect.element(seriesColumn()).toBeVisible();
		// Masqués (display: none) : hors de l'arbre d'accessibilité
		expect(page.getByRole('button', { name: 'Voir ma série' }).elements()).toHaveLength(0);
		expect(page.getByRole('button', { name: /^Ma série ·/ }).elements()).toHaveLength(0);
	});

	it('la croix retire la question entière ; la tuile redevient « Ajouter »', async () => {
		questionCart.addToCart('add', 3, 20);
		await render(Page);

		await seriesColumn().getByRole('button', { name: 'Retirer « Somme de deux entiers »' }).click();

		expect(questionCart.hasTemplate('add')).toBe(false);
		await expect.element(page.getByRole('button', { name: 'Ajouter à ma série' })).toBeVisible();
		await expect
			.element(seriesColumn().getByText('Ta série est vide', { exact: false }))
			.toBeVisible();
	});

	it('aucun réglage dans l’aperçu ; « Ouvrir ma série » mène à la page détaillée', async () => {
		fillSeries();
		await render(Page);

		const column = seriesColumn();
		expect(column.getByRole('spinbutton').elements()).toHaveLength(0);
		expect(
			column.getByRole('button', { name: /question de plus|seconde/i }).elements()
		).toHaveLength(0);
		await expect
			.element(column.getByRole('link', { name: 'Ouvrir ma série' }))
			.toHaveAttribute('href', '/automaths/panier');
	});

	it('série vide : le message le dit', async () => {
		await render(Page);

		await expect
			.element(
				seriesColumn().getByText('Ta série est vide : ajoute des questions avec « Ajouter ».')
			)
			.toBeVisible();
		expect(seriesColumn().getByRole('link', { name: 'Ouvrir ma série' }).elements()).toHaveLength(
			0
		);
	});

	it('la tuile dit « Ma série » : « Ajouter », puis « Dans ma série » qui retire', async () => {
		await render(Page);

		const add = page.getByRole('button', { name: 'Ajouter à ma série' });
		await expect.element(add).toHaveTextContent('Ajouter');
		await add.click();

		const inSeries = page.getByRole('button', { name: 'Dans ma série : retirer' });
		await expect.element(inSeries).toHaveTextContent('Dans ma série');
		await expect.element(seriesColumn().getByText('Somme de deux entiers')).toBeVisible();
	});
});

describe('Ma série — tablette', () => {
	beforeEach(async () => {
		await page.viewport(1024, 800);
	});

	it('pas de colonne ; le bouton rond ouvre « Ma série » dans un panneau, sans changer de page', async () => {
		fillSeries();
		await render(Page);

		const round = page.getByRole('button', { name: 'Voir ma série' });
		await expect.element(round).toBeVisible();
		expect(seriesColumn().elements()).toHaveLength(0);
		await round.click();

		const panel = page.getByRole('dialog', { name: 'Ma série' });
		await expect.element(panel).toBeVisible();
		await expect.element(panel.getByText('Fractions égales')).toBeVisible();
		await expect.element(panel.getByText('2 questions · environ 1 min 40')).toBeVisible();
	});

	it('le bouton rond ne pulse pas', async () => {
		fillSeries();
		await render(Page);

		const round = page.getByRole('button', { name: 'Voir ma série' });
		await expect.element(round).toBeVisible();
		expect(getComputedStyle(round.element()).animationName).toBe('none');
	});
});

describe('Ma série — téléphone', () => {
	beforeEach(async () => {
		await page.viewport(390, 700);
	});

	it('barre en bas « Ma série · 2 questions · 1 min 40 » → panneau du bas', async () => {
		fillSeries();
		await render(Page);

		const bar = page.getByRole('button', { name: /^Ma série · 2 questions · 1 min 40/ });
		await expect.element(bar).toBeVisible();
		expect(page.getByRole('button', { name: 'Voir ma série' }).elements()).toHaveLength(0);
		const rect = bar.element().getBoundingClientRect();
		expect(window.innerHeight - rect.bottom).toBeLessThan(24);

		await bar.click();
		const panel = page.getByRole('dialog', { name: 'Ma série' });
		await expect.element(panel).toBeVisible();
		await expect.element(panel.getByText('Somme de deux entiers')).toBeVisible();
	});

	it('retrait depuis le panneau : le focus passe à la croix suivante, puis au message', async () => {
		fillSeries();
		await render(Page);
		await page.getByRole('button', { name: /^Ma série ·/ }).click();
		const panel = page.getByRole('dialog', { name: 'Ma série' });

		await panel.getByRole('button', { name: 'Retirer « Somme de deux entiers »' }).click();
		await expect
			.element(panel.getByRole('button', { name: 'Retirer « Fractions égales »' }))
			.toHaveFocus();
		await expect.element(panel.getByText('1 question · environ 20 s')).toBeVisible();

		await panel.getByRole('button', { name: 'Retirer « Fractions égales »' }).click();
		await expect.element(panel.getByText('Ta série est vide', { exact: false })).toHaveFocus();
		expect(questionCart.totalItems).toBe(0);
	});

	it('série vide : pas de barre', async () => {
		await render(Page);

		await expect.element(page.getByRole('button', { name: 'Ajouter à ma série' })).toBeVisible();
		expect(page.getByRole('button', { name: /^Ma série ·/ }).elements()).toHaveLength(0);
	});

	it('en bas de page, le dernier « Ajouter » peut remonter au-dessus de la barre', async () => {
		questionCart.addToCart('frac', 1, 20);
		await page.viewport(390, 500);
		await render(Page);
		const add = page.getByRole('button', { name: 'Ajouter à ma série' });
		await expect.element(add).toBeVisible();

		const pageBottom = document.querySelector('.container')!.getBoundingClientRect().bottom;
		const spaceBelowAdd = pageBottom - add.element().getBoundingClientRect().bottom;
		const bar = page.getByRole('button', { name: /^Ma série ·/ }).element();
		const barBand = window.innerHeight - bar.getBoundingClientRect().top;
		expect(spaceBelowAdd).toBeGreaterThan(barBand);
	});
});
