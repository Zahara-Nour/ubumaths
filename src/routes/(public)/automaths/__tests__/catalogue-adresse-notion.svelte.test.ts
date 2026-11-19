/**
 * Catalogue Automaths : notion gardée dans l'adresse, retour du panier
 * ====================================================================
 *
 * La notion affichée s'écrit dans l'adresse (`?notion=…`, sans entrée
 * d'historique) : un rechargement ou un lien rouvre la même notion, sa
 * branche dépliée dans la liste. Le catalogue retient sa dernière adresse le temps de la visite
 * (onglet) : revenu sans paramètre (retour du panier), il la reprend.
 * (Bouton rond et barre de « Ma série » : catalogue-ma-serie.svelte.test.ts.)
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
import { branchButton, notionButton, useWideScreen } from './catalogue-helpers.ts';
import { questionTemplatesCache } from '#lib/stores/questionTemplates.svelte.ts';
import { questionCart } from '#lib/stores/questionCart.svelte.ts';
// Modèle réel relu (Entiers #139) : son aperçu se calcule, sa tuile s'affiche
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
		await useWideScreen();
		replaceState.mockClear();
		sessionStorage.clear();
		questionCart.clearCart();
		pageState.url = new URL('http://localhost:5175/automaths');
		await seedTemplatesCache();
	});

	it('choisir une notion : elle s’écrit dans l’adresse, niveau gardé', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?niveau=6&inferieurs=1');
		await render(Page);

		await notionButton('Fractions').click();

		expect(lastUrl().searchParams.get('notion')).toBe('n-frac');
		expect(lastUrl().searchParams.get('niveau')).toBe('6');
		expect(lastUrl().searchParams.get('inferieurs')).toBe('1');
	});

	it('adresse ?notion=n-thales : la branche et la notion sont reprises', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?notion=n-thales');

		await render(Page);

		await expect.element(notionButton('Thalès')).toHaveAttribute('aria-current', 'true');
		await expect.element(branchButton('Géométrie')).toHaveAttribute('aria-expanded', 'true');
		await expect
			.element(branchButton('Nombres et calculs'))
			.toHaveAttribute('aria-expanded', 'false');
	});

	it('ouvrir une autre branche, puis choisir une de ses notions : l’adresse la prend', async () => {
		await render(Page);

		await branchButton('Géométrie').click();
		await notionButton('Pythagore').click();

		expect(lastUrl().searchParams.get('notion')).toBe('n-pyth');
		await expect.element(notionButton('Pythagore')).toHaveAttribute('aria-current', 'true');
	});

	it('notion absente au niveau choisi : première notion, et l’adresse suit', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?notion=n-thales');
		await render(Page);

		await chooseInCombobox(/^Niveau :/, '4ème');

		await expect.element(notionButton('Pythagore')).toHaveAttribute('aria-current', 'true');
		expect(lastUrl().searchParams.get('notion')).toBe('n-pyth');
	});

	it('notion inconnue dans l’adresse : ignorée, première notion', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?notion=zzz');

		await render(Page);

		await expect.element(notionButton('Addition')).toHaveAttribute('aria-current', 'true');
	});

	it('retour sans paramètre : la dernière adresse de la visite est reprise', async () => {
		sessionStorage.setItem(MEMORY_KEY, '?niveau=3&inferieurs=1&notion=n-thales');

		await render(Page);

		await expect.element(notionButton('Thalès')).toHaveAttribute('aria-current', 'true');
		await expect.element(page.getByRole('checkbox')).toBeChecked();
		expect(lastUrl().search).toBe('?niveau=3&inferieurs=1&notion=n-thales');
	});

	it('une adresse avec paramètres l’emporte sur celle retenue', async () => {
		sessionStorage.setItem(MEMORY_KEY, '?notion=n-thales');
		pageState.url = new URL('http://localhost:5175/automaths?notion=n-frac');

		await render(Page);

		await expect.element(notionButton('Fractions')).toHaveAttribute('aria-current', 'true');
	});

	it('arrivée par un lien avec paramètres : la visite retient cette adresse', async () => {
		sessionStorage.setItem(MEMORY_KEY, '?notion=n-thales');
		pageState.url = new URL('http://localhost:5175/automaths?niveau=6&notion=n-frac');

		await render(Page);

		await expect.element(notionButton('Fractions')).toBeVisible();
		expect(sessionStorage.getItem(MEMORY_KEY)).toBe('?niveau=6&notion=n-frac');
	});

	it('chaque choix est retenu pour la visite', async () => {
		await render(Page);

		await notionButton('Fractions').click();

		expect(sessionStorage.getItem(MEMORY_KEY)).toBe('?notion=n-frac');
	});
});
