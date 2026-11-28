/**
 * Catalogue Automaths : recherche
 * ===============================
 *
 * Phase 0 validée par David le 2026-11-18 : champ en haut, sans curseur
 * automatique, « / » y met le curseur ; dès 2 lettres les résultats remplacent
 * la liste des notions, groupés par sous-notion avec leur chemin, et
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
import { notionButton, useWideScreen } from './catalogue-helpers.ts';
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
	modele('pyth', 'n-pyth', ['4'], 'Pythagore : calculer une longueur')
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
		await useWideScreen();
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

	it('dès 2 lettres : résultats groupés par sous-notion, à la place de la liste des notions', async () => {
		await render(Page);

		await searchBox().fill('fraction');

		await expect.element(page.getByText('2 questions', { exact: true })).toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: /Nombres et calculs › Fractions › simplifier/ }))
			.toBeVisible();
		expect(page.getByRole('navigation', { name: 'Notions', exact: true }).elements()).toHaveLength(
			0
		);
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

	it('une seule lettre : pas de recherche, la liste des notions reste', async () => {
		await render(Page);

		await searchBox().fill('f');

		await expect.element(notionButton('Addition')).toBeVisible();
	});

	it('mot seulement dans un point du programme : groupe « aussi », replié', async () => {
		await render(Page);

		await searchBox().fill('théorème');

		await expect
			.element(page.getByText('Aucune question dans les titres et les énoncés'))
			.toBeVisible();
		const aussi = page.getByRole('button', { name: /Aussi dans les corrigés et le programme · 1/ });
		await expect.element(aussi).toHaveAttribute('aria-expanded', 'false');

		await aussi.click();

		await expect.element(aussi).toHaveAttribute('aria-expanded', 'true');
	});

	it('nom d’une notion : raccourci « Aller à », qui efface la recherche et ouvre la notion', async () => {
		await render(Page);
		await searchBox().fill('fractions');
		const raccourci = page
			.getByRole('navigation', { name: 'Aller à' })
			.getByRole('button', { name: /^Fractions\s*, 2 questions$/ });
		await expect.element(raccourci).toBeVisible();

		await raccourci.click();

		await expect.element(searchBox()).toHaveValue('');
		await expect.element(notionButton('Fractions')).toHaveAttribute('aria-current', 'true');
		expect(lastUrl().searchParams.get('q')).toBeNull();
		expect(lastUrl().searchParams.get('notion')).toBe('n-frac');
	});

	it('nom d’une sous-notion : le raccourci ouvre sa notion, avec la section de la sous-notion', async () => {
		await render(Page);
		await searchBox().fill('simplifier');

		await page
			.getByRole('navigation', { name: 'Aller à' })
			.getByRole('button', { name: /^Fractions › simplifier\s*, 2 questions$/ })
			.click();

		await expect.element(notionButton('Fractions')).toHaveAttribute('aria-current', 'true');
		await expect.element(page.getByRole('region', { name: /simplifier/ })).toBeInTheDocument();
	});

	it('aucun raccourci quand le mot n’est le nom d’aucune notion', async () => {
		await render(Page);
		await searchBox().fill('longueur');

		await expect.element(page.getByText('1 question', { exact: true })).toBeVisible();
		expect(page.getByRole('navigation', { name: 'Aller à' }).elements()).toHaveLength(0);
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
		await expect.element(page.getByText('2 questions', { exact: true })).toBeVisible();
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

		await expect.element(notionButton('Fractions')).toHaveAttribute('aria-current', 'true');
		expect(lastUrl().searchParams.get('q')).toBeNull();
		expect(lastUrl().searchParams.get('notion')).toBe('n-frac');
	});

	it('effacer par Échap', async () => {
		await render(Page);
		await searchBox().fill('pythagore');
		await expect.element(page.getByText('1 question', { exact: true })).toBeVisible();

		await userEvent.keyboard('{Escape}');

		await expect.element(searchBox()).toHaveValue('');
		await expect.element(notionButton('Addition')).toBeVisible();
	});
});
