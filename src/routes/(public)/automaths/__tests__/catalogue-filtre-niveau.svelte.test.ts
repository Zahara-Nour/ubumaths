/**
 * Catalogue Automaths : filtre par niveau (rendu de la page)
 * ==========================================================
 *
 * Menu « Niveau » (Tous les niveaux par défaut) et case « et niveaux
 * inférieurs », décochée au départ. Le choix est gardé dans l'adresse
 * (`?niveau=4&inferieurs=1`) : un rechargement ou un lien le conserve.
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
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/navigation')>()),
	replaceState
}));

import Page from '../+page.svelte';
import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';

const NODES = [
	{ id: 'b-nombres', kind: 'branch', name: 'Nombres et calculs', parent_id: null, position: 0 },
	{ id: 'b-geo', kind: 'branch', name: 'Géométrie', parent_id: null, position: 1 },
	{ id: 'n-add', kind: 'notion', name: 'Addition', parent_id: 'b-nombres', position: 0 },
	{ id: 'n-frac', kind: 'notion', name: 'Fractions', parent_id: 'b-nombres', position: 1 },
	{ id: 'n-pyth', kind: 'notion', name: 'Pythagore', parent_id: 'b-geo', position: 0 }
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
	modele('add', 'n-add', ['CP']),
	modele('frac', 'n-frac', ['6']),
	modele('pyth', 'n-pyth', ['4'])
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

async function chooseGrade(label: string) {
	await page.getByRole('combobox', { name: /^Niveau :/ }).click();
	await page.getByRole('option', { name: label, exact: true }).click();
}

describe('Catalogue Automaths — filtre par niveau', () => {
	beforeEach(async () => {
		replaceState.mockClear();
		pageState.url = new URL('http://localhost:5175/automaths');
		await seedTemplatesCache();
	});

	it('à l’arrivée : tous les niveaux, pas de case « inférieurs »', async () => {
		await render(Page);

		await expect.element(page.getByRole('tab', { name: 'Addition' })).toBeVisible();
		await expect.element(page.getByRole('tab', { name: 'Fractions' })).toBeVisible();
		expect(page.getByRole('checkbox').elements()).toHaveLength(0);
	});

	it('un niveau choisi : ses seules notions, case décochée, niveau dans l’adresse', async () => {
		await render(Page);

		await chooseGrade('6ème');

		await expect.element(page.getByRole('tab', { name: 'Fractions' })).toBeVisible();
		expect(page.getByRole('tab', { name: 'Addition' }).elements()).toHaveLength(0);
		await expect.element(page.getByRole('checkbox')).not.toBeChecked();
		expect(lastUrl().searchParams.get('niveau')).toBe('6');
		expect(lastUrl().searchParams.has('inferieurs')).toBe(false);
	});

	it('cocher « et niveaux inférieurs » : les niveaux en dessous reviennent', async () => {
		await render(Page);
		await chooseGrade('6ème');

		await page.getByRole('checkbox').click();

		await expect.element(page.getByRole('tab', { name: 'Addition' })).toBeVisible();
		await expect.element(page.getByRole('tab', { name: 'Fractions' })).toBeVisible();
		expect(lastUrl().searchParams.get('inferieurs')).toBe('1');
	});

	it('la branche affichée n’a plus de modèle : la page passe à celle qui reste', async () => {
		await render(Page);

		await chooseGrade('4ème');

		await expect.element(page.getByRole('tab', { name: 'Pythagore' })).toBeVisible();
		expect(page.getByRole('tab', { name: 'Addition' }).elements()).toHaveLength(0);
	});

	it('niveau sans aucun modèle : message, et le menu reste pour en changer', async () => {
		await render(Page);

		await chooseGrade('2nde');

		await expect.element(page.getByText('Aucune question pour ce niveau.')).toBeVisible();
		await expect.element(page.getByRole('combobox', { name: /^Niveau :/ })).toBeVisible();
	});

	it('adresse ?niveau=4&inferieurs=1 : le filtre est repris au chargement', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?niveau=4&inferieurs=1');

		await render(Page);

		await expect.element(page.getByRole('checkbox')).toBeChecked();
		await expect.element(page.getByRole('tab', { name: 'Addition' })).toBeVisible();
		await expect.element(page.getByRole('tab', { name: 'Fractions' })).toBeVisible();
	});

	it('niveau inconnu dans l’adresse : ignoré, tous les niveaux', async () => {
		pageState.url = new URL('http://localhost:5175/automaths?niveau=zzz');

		await render(Page);

		await expect.element(page.getByRole('tab', { name: 'Addition' })).toBeVisible();
		await expect.element(page.getByRole('tab', { name: 'Fractions' })).toBeVisible();
	});
});
