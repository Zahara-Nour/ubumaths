/**
 * `handleError` côté client : ce que voit l'élève, ce que reçoit le journal.
 *
 * Avant : le message affiché contenait le début de la pile d'appels, et une 404
 * de navigation remontait comme une erreur. Désormais le message reste celui de
 * SvelteKit, la pile part dans `detail` (repliée par la page d'erreur), et une
 * 404 est journalisée en avertissement.
 *
 * SvelteKit 3 : le hook reçoit `kind` (`app` = `error(...)` voulu, `framework` =
 * erreur de SvelteKit comme une 404, `unknown` = exception). Une erreur voulue
 * n'est pas une panne : rien n'est journalisé.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavigationEvent } from '@sveltejs/kit';

const { handleError } = await import('../hooks.client');

const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
const event = { url: new URL('https://www.chiph.re/chifrement') } as NavigationEvent;

function loggedBody(): { severity: string; message: string } {
	const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
	return JSON.parse(String(init.body));
}

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	fetchMock.mockClear();
});

describe('handleError (client)', () => {
	it('404 : message de SvelteKit gardé, sans pile, journalisée en avertissement', async () => {
		const result = await handleError({
			kind: 'framework',
			error: { status: 404, message: 'Not Found' },
			event
		});

		expect(result).toBeUndefined();
		expect(loggedBody().severity).toBe('warning');
		expect(loggedBody().message).toContain('/chifrement');
	});

	it('erreur inattendue : la pile part dans `detail`, pas dans le message', async () => {
		const result = await handleError({
			kind: 'unknown',
			error: new TypeError('x is undefined'),
			event
		});

		expect(result).toEqual({ detail: expect.stringContaining('x is undefined') });
		expect(loggedBody().severity).toBe('error');
	});

	it('erreur voulue (`error(...)`) : rien de journalisé, message gardé', async () => {
		const result = await handleError({
			kind: 'app',
			error: { status: 403, message: 'Accès refusé' },
			event
		});

		expect(result).toBeUndefined();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
