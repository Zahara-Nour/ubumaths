/**
 * Catalogue Automaths : un aperçu n'est calculé que pour la rubrique dépliée
 * =========================================================================
 *
 * Avant (novembre 2026), le serveur calculait les 1 912 aperçus à chaque visite.
 * Piège : l'accordéon et les onglets de bits-ui gardent le contenu fermé dans
 * le DOM (attribut `hidden`) — la galerie ne doit être montée qu'ouverte.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const templatePreview = vi.hoisted(() => vi.fn());
vi.mock('$lib/questions/catalogue', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/questions/catalogue')>();
	templatePreview.mockImplementation(original.templatePreview);
	return { ...original, templatePreview };
});

import Page from '../+page.svelte';
import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';

function modele(id: string, nodeId: string) {
	return {
		id,
		type: 'fill_in_blanks',
		title: `Modèle ${id}`,
		classification_node_id: nodeId,
		level: 1,
		grades: ['6'],
		status: 'published',
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }]
	};
}

const NODES = [
	{ id: 'b', kind: 'branch', name: 'Nombres et calculs', parent_id: null, position: 0 },
	{ id: 'n-add', kind: 'notion', name: 'Addition', parent_id: 'b', position: 0 },
	{ id: 'n-mul', kind: 'notion', name: 'Multiplication', parent_id: 'b', position: 1 },
	{ id: 's-somme', kind: 'subnotion', name: 'Somme', parent_id: 'n-add', position: 0 },
	{ id: 's-diff', kind: 'subnotion', name: 'Différence', parent_id: 'n-add', position: 1 },
	{ id: 's-tables', kind: 'subnotion', name: 'Tables', parent_id: 'n-mul', position: 0 }
];

const TEMPLATES = [
	modele('a', 's-somme'),
	modele('b', 's-diff'),
	modele('c', 's-tables'),
	modele('d', 'n-add')
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

function calledIds(): string[] {
	return templatePreview.mock.calls.map(([t]) => (t as { id: string }).id);
}

describe('Catalogue Automaths — aperçus à la demande', () => {
	beforeEach(async () => {
		templatePreview.mockClear();
		await seedTemplatesCache();
	});

	it('à l’arrivée, toutes rubriques fermées : aucun aperçu calculé', async () => {
		await render(Page);

		await expect.element(page.getByRole('button', { name: 'Somme' })).toBeVisible();
		// Laisse passer le calcul différé (setTimeout) d'une galerie montée par erreur
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(calledIds()).toEqual([]);
	});

	it('déplier une rubrique : ses aperçus seulement, pas ceux des autres rubriques ni notions', async () => {
		await render(Page);

		await page.getByRole('button', { name: 'Somme' }).click();

		await vi.waitFor(() => expect(calledIds()).toContain('a'));
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(new Set(calledIds())).toEqual(new Set(['a']));
	});

	it('rangé selon l’arbre : notions en onglets, « Général » en tête des rubriques', async () => {
		await render(Page);

		await expect.element(page.getByRole('tab', { name: 'Addition' })).toBeVisible();
		await expect.element(page.getByRole('tab', { name: 'Multiplication' })).toBeVisible();
		const rubriques = page
			.getByRole('heading', { level: 3 })
			.elements()
			.map((e) => e.textContent?.trim());
		expect(rubriques).toEqual(['Général', 'Somme', 'Différence']);
	});

	it('modèle hors de l’arbre : « Non classés », replié, sans aperçu calculé avant l’ouverture', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		questionTemplatesCache.clear();
		vi.stubGlobal(
			'fetch',
			async () =>
				new Response(
					JSON.stringify({ templates: [...TEMPLATES, modele('perdu', 'inconnu')], nodes: NODES })
				)
		);
		await questionTemplatesCache.fetchTemplates();
		vi.unstubAllGlobals();
		templatePreview.mockClear();

		await render(Page);

		await expect.element(page.getByRole('button', { name: 'Non classés (1)' })).toBeVisible();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(calledIds()).not.toContain('perdu');

		await page.getByRole('button', { name: 'Non classés (1)' }).click();
		await vi.waitFor(() => expect(calledIds()).toContain('perdu'));
	});
});
