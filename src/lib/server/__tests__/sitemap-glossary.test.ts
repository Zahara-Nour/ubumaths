/**
 * Pages du glossaire dans le plan du site : une par terme visible, sauf les renvois
 * nus (leur adresse redirige) ; une panne rend une liste vide, jamais une 500.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { Glossary } from '$lib/server/dictionary/load';

const glossary: Glossary = {
	entries: [
		{
			term: 'multiplication',
			tags: [],
			grade: 'CP',
			definitions: { items: [{ grade: 'CP', content: 'Paquets.' }] }
		},
		{ term: 'multiplier', tags: [], grade: 'CP', derivedFrom: 'multiplication' },
		{
			term: 'Thalès',
			tags: [],
			grade: '4',
			derivedFrom: 'théorème de Thalès',
			definitions: { items: [{ grade: '4', content: 'Mathématicien grec.' }] }
		}
	],
	addresses: new Map([
		['multiplication|', { slug: 'multiplication', lastmod: '2026-10-11' }],
		['multiplier|', { slug: 'multiplier', lastmod: '2026-10-11' }],
		['Thalès|', { slug: 'thales', lastmod: '2026-10-12' }]
	])
};

const loadGlossary = vi.fn(async () => glossary);
vi.mock('$lib/server/dictionary/load', () => ({
	loadGlossary: (...args: unknown[]) => loadGlossary(...(args as []))
}));

const { fetchGlossaryPages } = await import('../sitemap-glossary');
const client = {} as SupabaseClient<Database>;

describe('fetchGlossaryPages', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('une page par terme visible, sans les renvois nus', async () => {
		expect(await fetchGlossaryPages(client)).toEqual([
			{ path: '/glossaire/multiplication', lastmod: '2026-10-11' },
			{ path: '/glossaire/thales', lastmod: '2026-10-12' }
		]);
	});

	it('dictionnaire illisible : liste vide', async () => {
		loadGlossary.mockRejectedValueOnce(new Error('injoignable'));
		expect(await fetchGlossaryPages(client)).toEqual([]);
	});
});
