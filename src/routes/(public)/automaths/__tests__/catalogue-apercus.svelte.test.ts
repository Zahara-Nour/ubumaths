/**
 * Catalogue Automaths : un aperçu n'est calculé qu'à l'approche de sa section
 * ===========================================================================
 *
 * Avant (novembre 2026), le serveur calculait les 1 912 aperçus à chaque visite.
 * Depuis la PR 3a, les sous-notions sont toutes dépliées : la galerie d'une
 * section n'est montée que quand elle approche de l'écran (IntersectionObserver,
 * simulé ici pour décider de l'approche), ou quand une pastille vise une
 * section plus bas (les sections du dessus sont alors calculées aussi).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const templatePreview = vi.hoisted(() => vi.fn());
vi.mock('#lib/questions/catalogue.ts', async (importOriginal) => {
	const original = await importOriginal<typeof import('#lib/questions/catalogue.ts')>();
	templatePreview.mockImplementation(original.templatePreview);
	return { ...original, templatePreview };
});

import Page from '../+page.svelte';
import { notionButton, useWideScreen } from './catalogue-helpers.ts';
import { questionTemplatesCache } from '#lib/stores/questionTemplates.svelte.ts';

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

// Observateurs simulés : chaque réserve de galerie observée, et son rappel
const observed: { target: Element; callback: IntersectionObserverCallback }[] = [];

class FakeIntersectionObserver {
	constructor(private readonly callback: IntersectionObserverCallback) {}
	observe(target: Element) {
		observed.push({ target, callback: this.callback });
	}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}
}

/** La section de cette sous-notion approche de l'écran */
function approach(sectionName: string) {
	const section = page.getByRole('region', { name: new RegExp(`^${sectionName}`) }).element();
	const placeholder = section.querySelector('[data-gallery-placeholder]');
	const entry = observed.find((o) => o.target === placeholder);
	if (!entry) throw new Error(`section « ${sectionName} » non observée`);
	entry.callback(
		[{ isIntersecting: true, target: entry.target } as IntersectionObserverEntry],
		{} as IntersectionObserver
	);
}

describe('Catalogue Automaths — aperçus à la demande', () => {
	beforeEach(async () => {
		await useWideScreen();
		// Le catalogue reprend la dernière adresse de la visite : chaque test part de zéro
		sessionStorage.clear();
		templatePreview.mockClear();
		await seedTemplatesCache();
		observed.length = 0;
		vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('à l’arrivée, sous-notions dépliées mais aucune n’a approché : aucun aperçu calculé', async () => {
		await render(Page);

		await expect.element(page.getByRole('heading', { name: /^Somme/ })).toBeVisible();
		// Laisse passer le calcul différé (setTimeout) d'une galerie montée par erreur
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(calledIds()).toEqual([]);
	});

	it('une section approche : ses aperçus seulement, pas ceux des autres sections ni notions', async () => {
		await render(Page);
		await expect.element(page.getByRole('heading', { name: /^Somme/ })).toBeVisible();

		approach('Somme');

		await vi.waitFor(() => expect(calledIds()).toContain('a'));
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(new Set(calledIds())).toEqual(new Set(['a']));
	});

	it('pastille d’une section plus bas : les sections jusqu’à elle sont calculées, puis la page y descend', async () => {
		const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
		await render(Page);

		await page
			.getByRole('navigation', { name: 'Sous-notions' })
			.getByRole('button', { name: /^Différence\s*,/ })
			.click();

		await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
		expect(new Set(calledIds())).toEqual(new Set(['d', 'a', 'b']));
		expect(scrollIntoView.mock.contexts.at(-1)).toBe(
			page.getByRole('region', { name: /^Différence/ }).element()
		);
	});

	it('rangé selon l’arbre : notions dans la liste, « Général » en tête des sections', async () => {
		await render(Page);

		await expect.element(notionButton('Addition')).toBeVisible();
		await expect.element(notionButton('Multiplication')).toBeVisible();
		const rubriques = page
			.getByRole('heading', { level: 3 })
			.elements()
			.map((e) => e.textContent?.split('·')[0].trim());
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
		vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
		templatePreview.mockClear();

		await render(Page);

		await expect.element(page.getByRole('button', { name: 'Non classés (1)' })).toBeVisible();
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(calledIds()).not.toContain('perdu');

		await page.getByRole('button', { name: 'Non classés (1)' }).click();
		await vi.waitFor(() => expect(calledIds()).toContain('perdu'));
	});
});
