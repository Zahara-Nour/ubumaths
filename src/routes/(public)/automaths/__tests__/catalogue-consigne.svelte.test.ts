/**
 * Catalogue Automaths : la consigne d'exercice du modèle s'affiche sur la carte
 * ============================================================================
 *
 * La liste `/api/questions/templates/all` envoie les lignes de la base
 * (`exercise_instruction`), le générateur lit `exerciseInstruction` : jusqu'en
 * novembre 2026, la consigne (« Calcule. ») disparaissait des cartes Automaths
 * (catalogue, panier, test) — 19 modèles publiés concernés.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

import Page from '../+page.svelte';
import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';

const NODES = [
	{ id: 'b', kind: 'branch', name: 'Nombres et calculs', parent_id: null, position: 0 },
	{ id: 'n-add', kind: 'notion', name: 'Addition', parent_id: 'b', position: 0 },
	{ id: 's-tables', kind: 'subnotion', name: 'Tables', parent_id: 'n-add', position: 0 }
];

/** Ligne telle que l'API l'envoie (colonnes de la base, snake_case) */
function ligne(id: string, title: string, consigne: string | null) {
	return {
		id,
		type: 'fill_in_blanks',
		title,
		classification_node_id: 's-tables',
		level: 1,
		grades: ['CP'],
		status: 'published',
		exercise_instruction: consigne,
		default_display_options: null,
		// Variation du vrai modèle « Table d'addition' » (prod, novembre 2026)
		variations: [
			{
				statement: '$${{expression}}$$',
				variables: [
					{ name: 'a', expression: '0..9' },
					{ name: 'expression', expression: 'a+6' }
				],
				blanks: [{ expectedAnswer: 'eval:expression' }]
			}
		]
	};
}

async function seedTemplatesCache(templates: unknown[]) {
	questionTemplatesCache.clear();
	vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ templates, nodes: NODES })));
	await questionTemplatesCache.fetchTemplates();
	vi.unstubAllGlobals();
}

describe('Catalogue Automaths — consigne d’exercice', () => {
	beforeEach(async () => {
		await seedTemplatesCache([
			ligne('avec', "Table d'addition", 'Calcule.'),
			ligne('sans', 'Sans consigne', null)
		]);
	});

	it('la carte d’un modèle avec consigne l’affiche au-dessus de l’énoncé', async () => {
		await render(Page);
		await page.getByRole('button', { name: 'Tables' }).click();

		await expect.element(page.getByText('Calcule.', { exact: true })).toBeVisible();
	});

	it('un modèle sans consigne n’affiche pas de consigne', async () => {
		await render(Page);
		await page.getByRole('button', { name: 'Tables' }).click();

		await expect.element(page.getByText('Sans consigne')).toBeVisible();
		await expect.element(page.getByText('Calcule.', { exact: true })).toBeVisible();
		// Une seule consigne sur la page : celle du modèle qui en a une
		expect(page.getByText('Calcule.', { exact: true }).elements()).toHaveLength(1);
	});
});
