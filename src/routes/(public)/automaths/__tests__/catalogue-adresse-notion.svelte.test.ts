/**
 * Catalogue Automaths : notion gardée dans l'adresse, retour du panier
 * ====================================================================
 *
 * La notion affichée s'écrit dans l'adresse (`?notion=…`, sans entrée
 * d'historique) : un rechargement ou un lien rouvre la même branche et la
 * même notion. Le catalogue retient sa dernière adresse le temps de la visite
 * (onglet) : revenu sans paramètre (retour du panier), il la reprend.
 * Bouton rond du panier : fixe (aucune pulsation), et la dernière carte peut
 * remonter au-dessus de lui.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

// Adresse de la page simulée, et réécriture de l'adresse espionnée
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
// Modèle réel relu (Entiers #139) : son aperçu se calcule, sa tuile a un bouton « Ajouter »
import fixture from '../../../../../data/relecture/entiers/139.json';

const MEMORY_KEY = 'chiphre_automaths_adresse';

const NODES = [
	{ id: 'b-nombres', kind: 'branch', name: 'Nombres et calculs', parent_id: null, position: 0 },
	{ id: 'b-geo', kind: 'branch', name: 'Géométrie', parent_id: null, position: 1 },
	{ id: 'n-add', kind: 'notion', name: 'Addition', parent_id: 'b-nombres', position: 0 },
	{ id: 'n-frac', kind: 'notion', name: 'Fractions', parent_id: 'b-nombres', position: 1 },
	{ id: 'n-pyth', kind: 'notion', name: 'Pythagore', parent_id: 'b-geo', position: 0 },
	{ id: 'n-thales', kind: 'notion', name: 'Thalès', parent_id: 'b-geo', position: 1 }
];

function modele(id: string, nodeId: string, grades: string[]) {
	return {
		id,
		type: 'fill_in_blanks',
		title: `Modèle ${id}`,
		classification_node_id: nodeId,
		level: 1,
		grades,
		status: 'published',
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }]
	};
}

const TEMPLATES = [
	{
		...fixture.template,
		id: 'add',
		classification_node_id: 'n-add',
		grades: ['CP'],
		status: 'published'
	},
	modele('frac', 'n-frac', ['6']),
	modele('pyth', 'n-pyth', ['4']),
	modele('thales', 'n-thales', ['3'])
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

function lastUrl(): URL {
	const call = replaceState.mock.calls.at(-1);
	if (!call) throw new Error('adresse jamais réécrite');
	return new URL(String(call[0]), 'http://localhost:5175');
}

async function chooseInCombobox(name: RegExp, option: string) {
	await page.getByRole('combobox', { name }).click();
	await page.getByRole('option', { name: option, exact: true }).click();
}

describe('Catalogue Automaths — notion dans l’adresse', () => {
	beforeEach(async () => {
		replaceState.mockClear();
		sessionStorage.clear();
		questionCart.clearCart();
		pageState.url = new URL('http://localhost:5175/automaths');
		await seedTemplatesCache();
	});

	it('choisir une notion : elle s’écrit dans l’adresse, niveau gardé', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?niveau=6&inferieurs=1');
		await render(Page);

		await page.getByRole('tab', { name: 'Fractions' }).click();

		expect(lastUrl().searchParams.get('notion')).toBe('n-frac');
		expect(lastUrl().searchParams.get('niveau')).toBe('6');
		expect(lastUrl().searchParams.get('inferieurs')).toBe('1');
	});

	it('adresse ?notion=n-thales : la branche et la notion sont reprises', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?notion=n-thales');

		await render(Page);

		await expect
			.element(page.getByRole('tab', { name: 'Thalès' }))
			.toHaveAttribute('aria-selected', 'true');
		await expect
			.element(page.getByRole('combobox', { name: /^Branche/ }))
			.toHaveTextContent('Géométrie');
	});

	it('changer de branche : l’adresse prend sa première notion', async () => {
		await render(Page);

		await chooseInCombobox(/^Branche/, 'Géométrie');

		expect(lastUrl().searchParams.get('notion')).toBe('n-pyth');
	});

	it('notion absente au niveau choisi : première notion, et l’adresse suit', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?notion=n-thales');
		await render(Page);

		await chooseInCombobox(/^Niveau :/, '4ème');

		await expect
			.element(page.getByRole('tab', { name: 'Pythagore' }))
			.toHaveAttribute('aria-selected', 'true');
		expect(lastUrl().searchParams.get('notion')).toBe('n-pyth');
	});

	it('notion inconnue dans l’adresse : ignorée, première notion', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?notion=zzz');

		await render(Page);

		await expect
			.element(page.getByRole('tab', { name: 'Addition' }))
			.toHaveAttribute('aria-selected', 'true');
	});

	it('retour sans paramètre : la dernière adresse de la visite est reprise', async () => {
		sessionStorage.setItem(MEMORY_KEY, '?niveau=3&inferieurs=1&notion=n-thales');

		await render(Page);

		await expect
			.element(page.getByRole('tab', { name: 'Thalès' }))
			.toHaveAttribute('aria-selected', 'true');
		await expect.element(page.getByRole('checkbox')).toBeChecked();
		expect(lastUrl().search).toBe('?niveau=3&inferieurs=1&notion=n-thales');
	});

	it('une adresse avec paramètres l’emporte sur celle retenue', async () => {
		sessionStorage.setItem(MEMORY_KEY, '?notion=n-thales');
		pageState.url = new URL('http://localhost:5175/automaths?notion=n-frac');

		await render(Page);

		await expect
			.element(page.getByRole('tab', { name: 'Fractions' }))
			.toHaveAttribute('aria-selected', 'true');
	});

	it('chaque choix est retenu pour la visite', async () => {
		await render(Page);

		await page.getByRole('tab', { name: 'Fractions' }).click();

		expect(sessionStorage.getItem(MEMORY_KEY)).toBe('?notion=n-frac');
	});
});

describe('Catalogue Automaths — bouton rond du panier', () => {
	beforeEach(async () => {
		replaceState.mockClear();
		sessionStorage.clear();
		questionCart.clearCart();
		pageState.url = new URL('http://localhost:5175/automaths');
		await seedTemplatesCache();
	});

	it('panier non vide : le bouton ne pulse pas', async () => {
		questionCart.addToCart('add');
		await render(Page);

		const cart = page.getByRole('button', { name: 'Voir le panier' });
		await expect.element(cart).toBeVisible();
		expect(getComputedStyle(cart.element()).animationName).toBe('none');
	});

	it('en bas de page, le dernier « Ajouter » peut remonter au-dessus du bouton rond', async () => {
		await page.viewport(390, 500);
		await render(Page);
		await page.getByRole('button', { name: 'Général' }).click();
		const add = page.getByRole('button', { name: 'Ajouter au panier' });
		await expect.element(add).toBeVisible();

		// Page défilée tout en bas : le bas de la page touche le bas de l'écran.
		// Le bouton rond occupe la bande du bas de l'écran (de son haut au bord) :
		// l'espace sous « Ajouter », jusqu'au bas de la page, doit la dépasser.
		const pageBottom = document.querySelector('.container')!.getBoundingClientRect().bottom;
		const spaceBelowAdd = pageBottom - add.element().getBoundingClientRect().bottom;
		const cart = page.getByRole('button', { name: 'Voir le panier' }).element();
		const cartBand = window.innerHeight - cart.getBoundingClientRect().top;
		expect(spaceBelowAdd).toBeGreaterThan(cartBand);
	});
});
