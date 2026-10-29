/**
 * Page d'un terme du glossaire (chantier seo, phase 0 validée le 2026-10-29) :
 * adresse inconnue → 404 ; renvoi nu → redirection vers le terme cité ; renvoi
 * qui a sa définition → sa page, avec le lien vers le terme cité.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MathTerm } from '$lib/dictionary/model';
import type { Glossary } from '$lib/server/dictionary/load';

const ENTRIES: MathTerm[] = [
	{
		term: 'multiplication',
		tags: ['operations'],
		grade: 'CP',
		definitions: { items: [{ grade: 'CP', content: 'Compter vite des paquets identiques.' }] }
	},
	{ term: 'multiplier', tags: ['operations'], grade: 'CP', derivedFrom: 'multiplication' },
	{
		term: 'Thalès',
		tags: ['geometrie'],
		grade: '4',
		derivedFrom: 'théorème de Thalès',
		definitions: { items: [{ grade: '4', content: 'Mathématicien grec.' }] }
	},
	{
		term: 'théorème de Thalès',
		tags: ['geometrie'],
		grade: '4',
		definitions: { items: [{ grade: '4', content: 'Droites sécantes et parallèles.' }] }
	},
	{ term: 'orphelin', tags: [], grade: '6', derivedFrom: 'absent' }
];

const glossary: Glossary = {
	entries: ENTRIES,
	addresses: new Map([
		['multiplication|', { slug: 'multiplication', lastmod: '2026-10-11' }],
		['multiplier|', { slug: 'multiplier', lastmod: '2026-10-11' }],
		['Thalès|', { slug: 'thales', lastmod: '2026-10-11' }],
		['théorème de Thalès|', { slug: 'theoreme-de-thales', lastmod: '2026-10-11' }],
		['orphelin|', { slug: 'orphelin', lastmod: '2026-10-11' }]
	])
};

const loadGlossary = vi.fn(async () => glossary);
vi.mock('$lib/server/dictionary/load', () => ({
	loadGlossary: (...args: unknown[]) => loadGlossary(...(args as [])),
	isDictionaryAdmin: () => false
}));

const { load } = await import('../+page.server');

type LoadEvent = Parameters<typeof load>[0];

async function loadSlug(slug: string) {
	return await load({ locals: { supabase: {} }, params: { slug } } as unknown as LoadEvent);
}

async function status(slug: string): Promise<{ status: number; location?: string }> {
	try {
		await loadSlug(slug);
		return { status: 200 };
	} catch (e) {
		const thrown = e as { status: number; location?: string };
		return { status: thrown.status, location: thrown.location };
	}
}

describe('/glossaire/[slug]', () => {
	beforeEach(() => {
		loadGlossary.mockClear();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('rend le terme de cette adresse, avec sa description', async () => {
		const data = await loadSlug('multiplication');
		expect(data).toMatchObject({
			term: { term: 'multiplication' },
			description: 'Compter vite des paquets identiques.',
			cited: null
		});
	});

	it('adresse inconnue → 404', async () => {
		expect(await status('inconnu')).toEqual({ status: 404, location: undefined });
	});

	it('adresse hors format → 404, sans lire la base', async () => {
		expect((await status('Multiplication')).status).toBe(404);
		expect((await status('a'.repeat(201))).status).toBe(404);
		expect(loadGlossary).not.toHaveBeenCalled();
	});

	it('renvoi nu → redirection permanente vers le terme cité', async () => {
		expect(await status('multiplier')).toEqual({
			status: 308,
			location: '/glossaire/multiplication'
		});
	});

	it('renvoi nu dont le terme cité manque → 404', async () => {
		expect((await status('orphelin')).status).toBe(404);
	});

	it('renvoi qui a sa propre définition → sa page, avec le lien vers le terme cité', async () => {
		const data = await loadSlug('thales');
		expect(data).toMatchObject({
			term: { term: 'Thalès' },
			cited: { term: { term: 'théorème de Thalès' }, slug: 'theoreme-de-thales' }
		});
	});

	it('dictionnaire illisible → 503', async () => {
		loadGlossary.mockRejectedValueOnce(new Error('injoignable'));
		expect((await status('multiplication')).status).toBe(503);
	});
});
