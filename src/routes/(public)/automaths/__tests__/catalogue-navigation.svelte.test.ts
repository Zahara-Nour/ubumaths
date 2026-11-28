/**
 * Catalogue Automaths : vue « Notions » (PR 3a)
 * =============================================
 *
 * Phase 0 validée par David le 2026-11-18 : liste des branches et notions à
 * compteurs (colonne à gauche sur grand écran, panneau du bas sur téléphone),
 * seule la branche de la notion affichée dépliée ; compteurs selon le niveau ;
 * pastilles des sous-notions avec compteurs ; sous-notions toutes dépliées ;
 * cartes plus basses sur téléphone seulement.
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
import { branchButton, notionButton, useWideScreen } from './catalogue-helpers.ts';
import { questionTemplatesCache } from '#lib/stores/questionTemplates.svelte.ts';
// Modèle réel relu (Entiers #139) : son aperçu se calcule, sa carte s'affiche
import fixture from '../../../../../data/relecture/entiers/139.json';

const NODES = [
	{ id: 'b-nombres', kind: 'branch', name: 'Nombres et calculs', parent_id: null, position: 0 },
	{ id: 'b-geo', kind: 'branch', name: 'Géométrie', parent_id: null, position: 1 },
	{ id: 'n-add', kind: 'notion', name: 'Addition', parent_id: 'b-nombres', position: 0 },
	{ id: 'n-frac', kind: 'notion', name: 'Fractions', parent_id: 'b-nombres', position: 1 },
	{ id: 'n-pyth', kind: 'notion', name: 'Pythagore', parent_id: 'b-geo', position: 0 },
	{ id: 's-somme', kind: 'subnotion', name: 'Somme', parent_id: 'n-add', position: 0 },
	{ id: 's-diff', kind: 'subnotion', name: 'Différence', parent_id: 'n-add', position: 1 }
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
		id: 'somme-1',
		classification_node_id: 's-somme',
		grades: ['CP'],
		status: 'published'
	},
	modele('somme-2', 's-somme', ['CE1']),
	modele('diff-1', 's-diff', ['CE1']),
	modele('frac-1', 'n-frac', ['6']),
	modele('pyth-1', 'n-pyth', ['4'])
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

function subnotionChip(name: string) {
	return page
		.getByRole('navigation', { name: 'Sous-notions' })
		.getByRole('button', { name: new RegExp(`^${name}\\s*,`) });
}

beforeEach(async () => {
	replaceState.mockClear();
	sessionStorage.clear();
	pageState.url = new URL('http://localhost:5175/automaths');
	await seedTemplatesCache();
});

describe('Catalogue Automaths — liste des notions (grand écran)', () => {
	beforeEach(async () => {
		await useWideScreen();
	});

	it('chaque notion porte son nombre de questions', async () => {
		await render(Page);

		await expect
			.element(notionButton('Addition'))
			.toHaveAccessibleName(/^Addition\s*, 3 questions$/);
		await expect
			.element(notionButton('Fractions'))
			.toHaveAccessibleName(/^Fractions\s*, 1 question$/);
	});

	it('seule la branche de la notion affichée est dépliée ; un clic ouvre une autre branche', async () => {
		await render(Page);

		await expect
			.element(branchButton('Nombres et calculs'))
			.toHaveAttribute('aria-expanded', 'true');
		await expect.element(branchButton('Géométrie')).toHaveAttribute('aria-expanded', 'false');
		expect(notionButton('Pythagore').elements()).toHaveLength(0);

		await branchButton('Géométrie').click();

		await expect.element(notionButton('Pythagore')).toBeVisible();
		// La notion affichée ne change pas tant qu'on n'en choisit pas une autre
		await expect.element(notionButton('Addition')).toHaveAttribute('aria-current', 'true');
	});

	it('choisir une notion : elle s’affiche, l’adresse la prend', async () => {
		await render(Page);

		await notionButton('Fractions').click();

		await expect.element(page.getByRole('heading', { level: 2, name: 'Fractions' })).toBeVisible();
		await expect.element(notionButton('Fractions')).toHaveAttribute('aria-current', 'true');
		expect(lastUrl().searchParams.get('notion')).toBe('n-frac');
	});

	it('le bouton d’une branche annonce aussi son nombre de questions', async () => {
		await render(Page);

		await expect
			.element(branchButton('Géométrie'))
			.toHaveAccessibleName(/^Géométrie\s*, 1 question$/);
	});

	it('choisir une notion met le focus sur son titre (clavier, lecteur d’écran)', async () => {
		await render(Page);

		await notionButton('Fractions').click();

		await expect.element(page.getByRole('heading', { level: 2, name: 'Fractions' })).toHaveFocus();
	});

	it('branche de la notion fermée à la main, puis autre notion : sa branche s’ouvre', async () => {
		await render(Page);
		await branchButton('Nombres et calculs').click();
		await expect
			.element(branchButton('Nombres et calculs'))
			.toHaveAttribute('aria-expanded', 'false');

		await branchButton('Géométrie').click();
		await notionButton('Pythagore').click();
		await branchButton('Nombres et calculs').click();
		await notionButton('Addition').click();

		await expect
			.element(branchButton('Nombres et calculs'))
			.toHaveAttribute('aria-expanded', 'true');
		await expect.element(branchButton('Géométrie')).toHaveAttribute('aria-expanded', 'false');
	});

	it('les compteurs suivent le niveau ; une notion sans question au niveau est absente', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?niveau=CE1');

		await render(Page);

		await expect
			.element(notionButton('Addition'))
			.toHaveAccessibleName(/^Addition\s*, 2 questions$/);
		expect(notionButton('Fractions').elements()).toHaveLength(0);
	});
});

describe('Catalogue Automaths — sous-notions', () => {
	beforeEach(async () => {
		await useWideScreen();
	});

	it('pastilles des sous-notions, avec leur nombre de questions', async () => {
		await render(Page);

		await expect.element(subnotionChip('Somme')).toHaveAccessibleName(/^Somme\s*, 2 questions$/);
		await expect
			.element(subnotionChip('Différence'))
			.toHaveAccessibleName(/^Différence\s*, 1 question$/);
	});

	it('toutes les sous-notions sont dépliées, l’une sous l’autre', async () => {
		await render(Page);

		await expect.element(page.getByRole('heading', { level: 3, name: /^Somme/ })).toBeVisible();
		await expect
			.element(page.getByRole('heading', { level: 3, name: /^Différence/ }))
			.toBeVisible();
		// La première section est à l'écran : sa carte s'affiche sans aucun clic
		await expect
			.element(
				page
					.getByRole('region', { name: /^Somme/ })
					.getByRole('button', { name: /ma série/ })
					.first()
			)
			.toBeVisible();
	});

	it('une notion sans sous-notion n’a pas de pastilles', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?notion=n-frac');

		await render(Page);

		await expect.element(page.getByRole('heading', { level: 2, name: 'Fractions' })).toBeVisible();
		expect(page.getByRole('navigation', { name: 'Sous-notions' }).elements()).toHaveLength(0);
	});
});

describe('Catalogue Automaths — téléphone', () => {
	beforeEach(async () => {
		await page.viewport(390, 844);
	});

	it('la liste est dans un panneau, ouvert par le bouton de la notion', async () => {
		await render(Page);

		// La colonne de gauche est masquée : la liste n'est que dans le panneau
		await expect.element(page.getByRole('heading', { level: 2, name: 'Addition' })).toBeVisible();
		expect(document.querySelector('aside')?.checkVisibility()).toBe(false);
		const opener = page.getByRole('button', { name: 'Notion : Addition · 3' });
		await expect.element(opener).toBeVisible();

		await opener.click();
		const panel = page.getByRole('dialog', { name: 'Notions', exact: true });
		await expect.element(panel).toBeVisible();
		await panel.getByRole('button', { name: /^Fractions\s*,/ }).click();

		await expect.element(panel).not.toBeInTheDocument();
		await expect.element(page.getByRole('heading', { level: 2, name: 'Fractions' })).toBeVisible();
		expect(lastUrl().searchParams.get('notion')).toBe('n-frac');
	});

	it('cartes plus basses sur téléphone (13,5rem au lieu de 18rem)', async () => {
		await render(Page);

		const card = page.getByRole('region', { name: /^Somme/ }).element();
		await vi.waitFor(() => expect(card.querySelector('.flip-card')).not.toBeNull());
		const height = card.querySelector('.flip-card')!.getBoundingClientRect().height;
		const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
		expect(height).toBe(13.5 * rem);
	});
});

describe('Catalogue Automaths — hauteur des cartes sur grand écran', () => {
	it('18rem (12rem × 1,5, 2026-11-26)', async () => {
		await useWideScreen();
		await render(Page);

		const card = page.getByRole('region', { name: /^Somme/ }).element();
		await vi.waitFor(() => expect(card.querySelector('.flip-card')).not.toBeNull());
		const height = card.querySelector('.flip-card')!.getBoundingClientRect().height;
		const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
		expect(height).toBe(18 * rem);
	});
});
