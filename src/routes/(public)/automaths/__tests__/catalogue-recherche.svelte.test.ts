/**
 * Catalogue Automaths : recherche
 * ===============================
 *
 * Phase 0 validée par David le 2026-11-18 : champ en haut, sans curseur
 * automatique, « / » y met le curseur ; dès 2 lettres les résultats remplacent
 * le menu Branche et les onglets, groupés par sous-notion avec leur chemin, et
 * un compteur ; le niveau filtre aussi ; aucun résultat avec un niveau →
 * « Chercher dans tous les niveaux » ; effacer (croix ou Échap) → retour à la
 * notion ; recherche dans l'adresse (`?q=…`).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';

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
// Modèle réel relu (Entiers #139) : son aperçu se calcule, sa carte s'affiche
import fixture from '../../../../../data/relecture/entiers/139.json';

const NODES = [
	{ id: 'b-nombres', kind: 'branch', name: 'Nombres et calculs', parent_id: null, position: 0 },
	{ id: 'b-geo', kind: 'branch', name: 'Géométrie', parent_id: null, position: 1 },
	{ id: 'n-add', kind: 'notion', name: 'Addition', parent_id: 'b-nombres', position: 0 },
	{ id: 'n-frac', kind: 'notion', name: 'Fractions', parent_id: 'b-nombres', position: 1 },
	{ id: 's-simplifier', kind: 'subnotion', name: 'simplifier', parent_id: 'n-frac', position: 0 },
	{ id: 'n-pyth', kind: 'notion', name: 'Pythagore', parent_id: 'b-geo', position: 0 }
];

function modele(id: string, nodeId: string, grades: string[], title: string) {
	return {
		id,
		type: 'fill_in_blanks',
		title,
		classification_node_id: nodeId,
		level: 1,
		grades,
		status: 'published',
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }]
	};
}

const TEMPLATES = [
	modele('add', 'n-add', ['CP'], 'Ajouter deux nombres'),
	modele('frac-1', 's-simplifier', ['5'], 'Simplifier une fraction'),
	modele('frac-2', 's-simplifier', ['4'], 'Fraction irréductible'),
	modele('pyth', 'n-pyth', ['4'], 'Calculer une longueur')
];

const POINT_NAMES = { pyth: ['Utiliser le théorème de Pythagore'] };

async function seedTemplatesCache() {
	questionTemplatesCache.clear();
	vi.stubGlobal(
		'fetch',
		async () =>
			new Response(JSON.stringify({ templates: TEMPLATES, nodes: NODES, pointNames: POINT_NAMES }))
	);
	await questionTemplatesCache.fetchTemplates();
	vi.unstubAllGlobals();
}

function lastUrl(): URL {
	const call = replaceState.mock.calls.at(-1);
	if (!call) throw new Error('adresse jamais réécrite');
	return new URL(String(call[0]), 'http://localhost:5175');
}

function searchBox() {
	return page.getByRole('searchbox', { name: 'Chercher une question' });
}

describe('Catalogue Automaths — recherche', () => {
	beforeEach(async () => {
		replaceState.mockClear();
		sessionStorage.clear();
		questionCart.clearCart();
		pageState.url = new URL('http://localhost:5175/automaths');
		await seedTemplatesCache();
	});

	it('le champ est là, sans curseur automatique ; « / » y met le curseur', async () => {
		await render(Page);

		await expect.element(searchBox()).toBeVisible();
		await expect.element(searchBox()).not.toHaveFocus();

		await userEvent.keyboard('/');

		await expect.element(searchBox()).toHaveFocus();
		await expect.element(searchBox()).toHaveValue('');
	});

	it('dès 2 lettres : résultats groupés par sous-notion, à la place du menu Branche et des onglets', async () => {
		await render(Page);

		await searchBox().fill('fraction');

		await expect.element(page.getByText('2 questions')).toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: /Nombres et calculs › Fractions › simplifier/ }))
			.toBeVisible();
		expect(page.getByRole('combobox', { name: /^Branche/ }).elements()).toHaveLength(0);
		expect(page.getByRole('tab').elements()).toHaveLength(0);
	});

	it('un groupe de résultats se replie et se rouvre d’un clic', async () => {
		await render(Page);
		await searchBox().fill('fraction');
		const groupe = page.getByRole('button', {
			name: /Nombres et calculs › Fractions › simplifier/
		});
		await expect.element(groupe).toHaveAttribute('aria-expanded', 'true');

		await groupe.click();
		await expect.element(groupe).toHaveAttribute('aria-expanded', 'false');

		await groupe.click();
		await expect.element(groupe).toHaveAttribute('aria-expanded', 'true');
	});

	it('plus de 60 cartes : le groupe replié s’ouvre d’un clic, avec ses cartes', async () => {
		questionTemplatesCache.clear();
		const beaucoup = [
			...Array.from({ length: 61 }, (_, i) =>
				modele(`f-${i}`, 's-simplifier', ['5'], `Fraction numéro ${i}`)
			),
			{
				...fixture.template,
				id: 'pyth-frac',
				title: 'Fraction de longueur',
				classification_node_id: 'n-pyth',
				grades: ['4'],
				status: 'published'
			}
		];
		vi.stubGlobal(
			'fetch',
			async () => new Response(JSON.stringify({ templates: beaucoup, nodes: NODES }))
		);
		await questionTemplatesCache.fetchTemplates();
		vi.unstubAllGlobals();
		await render(Page);

		await searchBox().fill('fraction');
		const replie = page.getByRole('button', { name: /Géométrie › Pythagore/ });
		await expect.element(replie).toHaveAttribute('aria-expanded', 'false');

		await replie.click();

		await expect.element(page.getByText('Fraction de longueur')).toBeVisible();
	});

	it('une seule lettre : pas de recherche, les onglets restent', async () => {
		await render(Page);

		await searchBox().fill('f');

		await expect.element(page.getByRole('tab', { name: 'Addition' })).toBeVisible();
	});

	it('cherche aussi dans les intitulés des points du programme', async () => {
		await render(Page);

		await searchBox().fill('théorème');

		await expect.element(page.getByText('1 question', { exact: true })).toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: /Géométrie › Pythagore/ }))
			.toBeVisible();
	});

	it('le niveau filtre les résultats', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?niveau=5');
		await render(Page);

		await searchBox().fill('fraction');

		await expect.element(page.getByText('1 question', { exact: true })).toBeVisible();
	});

	it('aucun résultat avec un niveau : « Chercher dans tous les niveaux »', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?niveau=CP');
		await render(Page);

		await searchBox().fill('pythagore');

		await expect.element(page.getByText('Aucune question pour « pythagore »')).toBeVisible();
		await page.getByRole('button', { name: 'Chercher dans tous les niveaux' }).click();

		await expect.element(page.getByText('1 question', { exact: true })).toBeVisible();
		expect(lastUrl().searchParams.get('niveau')).toBeNull();
	});

	it('la recherche s’écrit dans l’adresse, et une adresse ?q= la reprend', async () => {
		await render(Page);
		await searchBox().fill('fraction');
		await expect.element(page.getByText('2 questions')).toBeVisible();
		expect(lastUrl().searchParams.get('q')).toBe('fraction');
	});

	it('adresse ?q=… : la recherche est reprise', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?q=pythagore');

		await render(Page);

		await expect.element(searchBox()).toHaveValue('pythagore');
		await expect.element(page.getByText('1 question', { exact: true })).toBeVisible();
	});

	it('effacer par la croix : retour à la notion où l’on était, adresse sans q', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?notion=n-frac');
		await render(Page);
		await searchBox().fill('pythagore');
		await expect.element(page.getByText('1 question', { exact: true })).toBeVisible();

		await page.getByRole('button', { name: 'Effacer la recherche' }).click();

		await expect
			.element(page.getByRole('tab', { name: 'Fractions' }))
			.toHaveAttribute('aria-selected', 'true');
		expect(lastUrl().searchParams.get('q')).toBeNull();
		expect(lastUrl().searchParams.get('notion')).toBe('n-frac');
	});

	it('effacer par Échap', async () => {
		await render(Page);
		await searchBox().fill('pythagore');
		await expect.element(page.getByText('1 question', { exact: true })).toBeVisible();

		await userEvent.keyboard('{Escape}');

		await expect.element(searchBox()).toHaveValue('');
		await expect.element(page.getByRole('tab', { name: 'Addition' })).toBeVisible();
	});
});
