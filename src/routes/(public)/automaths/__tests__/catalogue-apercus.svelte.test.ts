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

function modele(id: string, domain: string, subdomain: string) {
	return {
		id,
		type: 'fill_in_blanks',
		title: `Modèle ${id}`,
		theme: 'Entiers',
		domain,
		subdomain,
		level: 1,
		grades: ['6'],
		status: 'published',
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }]
	};
}

const TEMPLATES = [
	modele('a', 'Additionner', 'Somme'),
	modele('b', 'Additionner', 'Différence'),
	modele('c', 'Multiplier', 'Tables')
];

async function seedTemplatesCache() {
	questionTemplatesCache.clear();
	vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ templates: TEMPLATES })));
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

	it('déplier une rubrique : ses aperçus seulement, pas ceux des autres rubriques ni domaines', async () => {
		await render(Page);

		await page.getByRole('button', { name: 'Somme' }).click();

		await vi.waitFor(() => expect(calledIds()).toContain('a'));
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(new Set(calledIds())).toEqual(new Set(['a']));
	});
});
