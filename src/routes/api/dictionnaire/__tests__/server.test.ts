/**
 * GET /api/dictionnaire (ADR 0022, comportement 3 de
 * docs/wip/dictionnaire-en-base-spec.md) : une réponse publique, gardée en
 * cache ; une lecture fraîche pour l'admin seulement.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

const loadDictionary = vi.fn();
vi.mock('$lib/server/dictionary/load', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/dictionary/load')>()),
	loadDictionary: (...args: unknown[]) => loadDictionary(...args)
}));

const { GET } = await import('../+server');

const ENTRIES = [{ term: 'carré', tags: [], grade: 'CP' }];

type Who = 'visiteur' | 'élève' | 'prof' | 'admin' | 'prof élevé';

function call(who: Who, search = '') {
	const headers: Record<string, string> = {};
	const user = who === 'visiteur' ? null : { id: 'u1' };
	const role = {
		visiteur: null,
		élève: 'student',
		prof: 'teacher',
		admin: 'admin',
		'prof élevé': 'teacher'
	}[who];
	const locals = {
		supabase: {},
		user,
		profile: role ? { role } : null,
		adminElevation: who === 'prof élevé' ? { active: true, adminUserId: 'a1', expiresAt: 0 } : null,
		adminSupabase: who === 'prof élevé' ? {} : undefined
	};
	const event = {
		locals,
		url: new URL(`http://localhost/api/dictionnaire${search}`),
		setHeaders: (h: Record<string, string>) => Object.assign(headers, h)
	} as unknown as RequestEvent;
	return { response: GET(event as Parameters<typeof GET>[0]), headers };
}

describe('GET /api/dictionnaire', () => {
	beforeEach(() => {
		loadDictionary.mockReset();
		loadDictionary.mockResolvedValue(ENTRIES);
	});

	it('rend les entrées, en cache public (1 min au navigateur, 2 min au CDN)', async () => {
		const { response, headers } = call('visiteur');
		expect(await (await response).json()).toEqual(ENTRIES);
		expect(headers['cache-control']).toBe('public, max-age=60, s-maxage=120');
		expect(loadDictionary).toHaveBeenCalledWith({}, { fresh: false });
	});

	it.each<Who>(['admin', 'prof élevé'])(
		'3. lecture fraîche, jamais en cache, pour %s',
		async (who) => {
			const { response, headers } = call(who, '?frais=1760000000000');
			await response;
			expect(loadDictionary).toHaveBeenCalledWith({}, { fresh: true });
			expect(headers['cache-control']).toBe('private, no-store');
		}
	);

	it.each<Who>(['visiteur', 'élève', 'prof'])(
		'?frais est ignoré pour %s : la base n’est pas relue à volonté',
		async (who) => {
			const { response, headers } = call(who, '?frais=1');
			await response;
			expect(loadDictionary).toHaveBeenCalledWith({}, { fresh: false });
			expect(headers['cache-control']).toBe('public, max-age=60, s-maxage=120');
		}
	);

	it('base illisible : 503, sans cache', async () => {
		loadDictionary.mockRejectedValue(new Error('panne'));
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { response, headers } = call('visiteur');
		expect((await response).status).toBe(503);
		expect(headers['cache-control']).toBeUndefined();
	});
});
