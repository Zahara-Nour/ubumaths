/**
 * Suivi des erreurs côté client : chaque erreur distincte doit partir.
 *
 * Deux défauts du calcul de l'empreinte de doublon (`btoa(clé).substring(0, 32)`) :
 * 1. `btoa` refuse les caractères hors Latin-1 (`’`, `—`, `…`, `œ`, fréquents
 *    dans nos messages ; « é » passe) : l'erreur levait une exception et
 *    n'était jamais envoyée ;
 * 2. 32 caractères de base64 = 24 caractères de la clé : une erreur qui
 *    commençait comme une erreur DÉJÀ ENVOYÉE passait pour un doublon pendant
 *    5 minutes et n'était pas envoyée.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureError, flushErrors } from '../errorMonitoring';

/** Les messages réellement envoyés à l'API */
let sent: string[] = [];

beforeEach(() => {
	sent = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (_url: string, init?: { body?: string }) => {
			sent.push(JSON.parse(init?.body ?? '{}').message);
			return new Response(null, { status: 200 });
		})
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('suivi des erreurs — chaque erreur distincte part', () => {
	it('envoie une erreur dont le message contient des caractères hors Latin-1', async () => {
		const message = 'Ligne 8 : `corde()` ne retourne plus un tuple — l’ancienne forme…';
		captureError(message);
		await flushErrors();

		expect(sent).toEqual([message]);
	});

	it('envoie une erreur qui commence comme une erreur déjà envoyée', async () => {
		captureError("TypeError: Cannot read properties of undefined (reading 'alpha')");
		await flushErrors();
		captureError("TypeError: Cannot read properties of undefined (reading 'beta')");
		await flushErrors();

		expect(sent).toEqual([
			"TypeError: Cannot read properties of undefined (reading 'alpha')",
			"TypeError: Cannot read properties of undefined (reading 'beta')"
		]);
	});

	it('écarte toujours une erreur identique déjà envoyée', async () => {
		captureError('Même erreur répétée');
		await flushErrors();
		captureError('Même erreur répétée');
		await flushErrors();

		expect(sent).toEqual(['Même erreur répétée']);
	});
});
