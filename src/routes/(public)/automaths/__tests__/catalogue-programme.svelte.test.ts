/**
 * Catalogue Automaths : vue « Programme » (PR 3b)
 * ===============================================
 *
 * Phase 0 validée par David le 2026-11-18 (journal `automaths`, points 8-13) :
 * bascule « Notions | Programme » dès qu'un niveau est choisi, « Programme »
 * par défaut ; parties et chapitres à compteurs ; une section par point, ses
 * questions dessous (lecture A : rattachées au point, sinon celles de son
 * nœud) ; point sans question → « Pas encore de question » ; « et niveaux
 * inférieurs » ne change que les questions ; adresse `?vue=programme&chapitre=…` ;
 * la recherche remplace les deux vues.
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
import { notionButton, useWideScreen } from './catalogue-helpers.ts';
import { questionTemplatesCache } from '#lib/stores/questionTemplates.svelte.ts';
// Modèle réel relu (Entiers #139) : son aperçu se calcule, sa carte s'affiche
import fixture from '../../../../../data/relecture/entiers/139.json';

const NODES = [
	{ id: 'b-nombres', kind: 'branch', name: 'Nombres et calculs', parent_id: null, position: 0 },
	{ id: 'n-frac', kind: 'notion', name: 'Fractions', parent_id: 'b-nombres', position: 0 },
	{ id: 's-simpl', kind: 'subnotion', name: 'Simplifier', parent_id: 'n-frac', position: 0 },
	{ id: 'n-rel', kind: 'notion', name: 'Relatifs', parent_id: 'b-nombres', position: 1 }
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

/** Modèle dont la carte s'affiche (aperçu calculable) */
function modeleAvecCarte(id: string, nodeId: string, grades: string[]) {
	return {
		...fixture.template,
		id,
		title: `Modèle ${id}`,
		classification_node_id: nodeId,
		grades,
		status: 'published'
	};
}

function point(id: string, name: string, rubrique: string, order: number, nodeId: string) {
	return { id, name, grade: '5', rubrique, display_order: order, node_id: nodeId };
}

const TEMPLATES = [
	modeleAvecCarte('rel-lie', 'n-rel', ['5']),
	modele('rel-autre', 'n-rel', ['5']),
	modeleAvecCarte('frac-5', 'n-frac', ['5']),
	modele('simpl-6', 's-simpl', ['6'])
];

const POINTS = [
	point('p-rel', 'Additionner des relatifs', 'Nombres et calculs > Nombres relatifs', 1, 'n-rel'),
	point('p-frac', 'Comparer des fractions', 'Nombres et calculs > Fractions', 2, 'n-frac'),
	point('p-vide', 'Point sans question', 'Nombres et calculs > Fractions', 3, 'n-absent'),
	point('p-algo', 'Écrire un programme', 'La pensée informatique', 4, 'n-absent'),
	// Autre niveau : jamais dans le programme de 5e
	point('p-4e', 'Point de 4e', 'Nombres et calculs > Puissances', 0, 'n-frac')
];
POINTS[4].grade = '4';

async function seedTemplatesCache(withProgramme = true) {
	questionTemplatesCache.clear();
	const body = withProgramme
		? {
				templates: TEMPLATES,
				nodes: NODES,
				points: POINTS,
				templatePoints: { 'rel-lie': ['p-rel'] }
			}
		: { templates: TEMPLATES, nodes: NODES };
	vi.stubGlobal('fetch', async () => new Response(JSON.stringify(body)));
	await questionTemplatesCache.fetchTemplates();
	vi.unstubAllGlobals();
}

function lastUrl(): URL {
	const call = replaceState.mock.calls.at(-1);
	if (!call) throw new Error('adresse jamais réécrite');
	return new URL(String(call[0]), 'http://localhost:5175');
}

function chapterButton(name: string) {
	return page
		.getByRole('navigation', { name: 'Chapitres', exact: true })
		.getByRole('button', { name: new RegExp(`^${name}\\s*,`) });
}

function viewButton(name: 'Programme' | 'Notions') {
	return page.getByRole('group', { name: 'Parcourir par' }).getByRole('button', { name });
}

function cardsOf(sectionName: RegExp) {
	return page.getByRole('region', { name: sectionName }).getByRole('button', { name: /ma série/ });
}

beforeEach(async () => {
	replaceState.mockClear();
	sessionStorage.clear();
	pageState.url = new URL('http://localhost:5175/automaths?niveau=5');
	await useWideScreen();
	await seedTemplatesCache();
});

describe('Catalogue Automaths — bascule Notions | Programme', () => {
	it('niveau choisi : « Programme » par défaut, chapitres du niveau à compteurs', async () => {
		await render(Page);

		await expect.element(viewButton('Programme')).toHaveAttribute('aria-pressed', 'true');
		await expect.element(viewButton('Notions')).toHaveAttribute('aria-pressed', 'false');
		await expect
			.element(chapterButton('Nombres relatifs'))
			.toHaveAccessibleName(/^Nombres relatifs\s*, 1 question$/);
		// Fractions : repli sur le nœud du point, sous-notions comprises, au niveau 5 seul
		await expect
			.element(chapterButton('Fractions'))
			.toHaveAccessibleName(/^Fractions\s*, 1 question$/);
		// Partie sans chapitre : une seule entrée
		await expect.element(chapterButton('La pensée informatique')).toBeVisible();
		expect(chapterButton('Puissances').elements()).toHaveLength(0);
		// Premier chapitre affiché
		await expect
			.element(page.getByRole('heading', { level: 2, name: 'Nombres relatifs' }))
			.toBeVisible();
	});

	it('« Tous les niveaux » : pas de bascule, vue « Notions »', async () => {
		pageState.url = new URL('http://localhost:5175/automaths');

		await render(Page);

		await expect.element(notionButton('Fractions')).toBeVisible();
		expect(page.getByRole('group', { name: 'Parcourir par' }).elements()).toHaveLength(0);
	});

	it('liste servie sans programme (cache d’avant le déploiement) : vue « Notions » seule', async () => {
		await seedTemplatesCache(false);

		await render(Page);

		await expect.element(notionButton('Fractions')).toBeVisible();
		expect(page.getByRole('group', { name: 'Parcourir par' }).elements()).toHaveLength(0);
	});

	it('passer à « Notions » : la liste des notions, l’adresse suit', async () => {
		await render(Page);

		await viewButton('Notions').click();

		await expect.element(notionButton('Fractions')).toBeVisible();
		expect(lastUrl().searchParams.get('vue')).toBe('notions');
		expect(lastUrl().searchParams.get('notion')).toBe('n-frac');
		expect(lastUrl().searchParams.has('chapitre')).toBe(false);
	});

	it('ancien lien avec une notion, sans vue : la vue « Notions » est gardée', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?niveau=5&notion=n-rel');

		await render(Page);

		await expect.element(page.getByRole('heading', { level: 2, name: 'Relatifs' })).toBeVisible();
		await expect.element(viewButton('Notions')).toHaveAttribute('aria-pressed', 'true');
	});
});

describe('Catalogue Automaths — un chapitre du programme', () => {
	it('questions rattachées au point seulement', async () => {
		await render(Page);

		const section = page.getByRole('region', { name: /^Additionner des relatifs/ });
		await expect.element(section).toBeVisible();
		await expect.element(cardsOf(/^Additionner des relatifs/).first()).toBeVisible();
		expect(cardsOf(/^Additionner des relatifs/).elements()).toHaveLength(1);
		expect(section.getByText(/Questions de/).elements()).toHaveLength(0);
	});

	it('point sans question rattachée : celles de son nœud, on le dit ; point sans rien : ligne grise', async () => {
		await render(Page);

		await chapterButton('Fractions').click();

		await expect.element(page.getByRole('heading', { level: 2, name: 'Fractions' })).toBeVisible();
		const comparer = page.getByRole('region', { name: /^Comparer des fractions/ });
		await expect.element(comparer.getByText('Questions de « Fractions »')).toBeVisible();
		await expect.element(cardsOf(/^Comparer des fractions/).first()).toBeVisible();
		await expect
			.element(
				page
					.getByRole('region', { name: /^Point sans question/ })
					.getByText('Pas encore de question')
			)
			.toBeVisible();
		expect(lastUrl().searchParams.get('vue')).toBe('programme');
		expect(lastUrl().searchParams.get('chapitre')).toBe('fractions');
	});

	it('choisir un chapitre met le focus sur son titre', async () => {
		await render(Page);

		await chapterButton('Fractions').click();

		await expect.element(page.getByRole('heading', { level: 2, name: 'Fractions' })).toHaveFocus();
	});

	it('« et niveaux inférieurs » : même programme, questions des niveaux inférieurs en plus', async () => {
		pageState.url = new URL(
			'http://localhost:5175/automaths?niveau=5&inferieurs=1&vue=programme&chapitre=fractions'
		);

		await render(Page);

		await expect.element(page.getByRole('heading', { level: 2, name: 'Fractions' })).toBeVisible();
		await expect
			.element(chapterButton('Fractions'))
			.toHaveAccessibleName(/^Fractions\s*, 2 questions$/);
		expect(chapterButton('Puissances').elements()).toHaveLength(0);
	});

	it('chapitre inconnu dans l’adresse : premier chapitre', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?niveau=5&vue=programme&chapitre=zzz');

		await render(Page);

		await expect
			.element(page.getByRole('heading', { level: 2, name: 'Nombres relatifs' }))
			.toBeVisible();
	});

	it('la recherche remplace la vue « Programme »', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?niveau=5&q=modele');

		await render(Page);

		await expect.element(page.getByText('3 questions', { exact: true })).toBeVisible();
		expect(
			page.getByRole('navigation', { name: 'Chapitres', exact: true }).elements()
		).toHaveLength(0);
		expect(page.getByRole('group', { name: 'Parcourir par' }).elements()).toHaveLength(0);
	});
});

describe('Catalogue Automaths — programme sur téléphone', () => {
	it('liste des chapitres dans un panneau, ouvert par le bouton du chapitre', async () => {
		await page.viewport(390, 844);

		await render(Page);

		const opener = page.getByRole('button', { name: 'Chapitre : Nombres relatifs · 1' });
		await expect.element(opener).toBeVisible();
		await opener.click();
		const panel = page.getByRole('dialog', { name: 'Chapitres', exact: true });
		await panel.getByRole('button', { name: /^Fractions\s*,/ }).click();

		await expect.element(panel).not.toBeInTheDocument();
		await expect.element(page.getByRole('heading', { level: 2, name: 'Fractions' })).toBeVisible();
	});
});
