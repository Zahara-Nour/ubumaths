/**
 * Logger serveur (écart L8, lot 1) : une erreur journalisée garde ses champs propres.
 *
 * `PostgrestError` hérite de `Error` et porte `code`, `details`, `hint` : le masquage
 * ne gardait que `name`, `message` et `stack`, si bien qu'un `23505` (clé en double)
 * ou un `42501` (droit refusé) disparaissait des journaux en passant par le logger.
 * Les champs propres restent masqués comme le reste (données personnelles, clés sensibles).
 */
import { PostgrestError } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServerLogger } from '$lib/utils/logger';

afterEach(() => {
	vi.restoreAllMocks();
});

function loggedError(error: unknown): Record<string, unknown> {
	const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
	createServerLogger('x.ts').error('échec', error);
	return spy.mock.calls[0][2] as Record<string, unknown>;
}

describe('createServerLogger — erreurs', () => {
	it('garde code, details et hint d’une PostgrestError', () => {
		const error = new PostgrestError({
			message: 'duplicate key value violates unique constraint',
			details: 'Key (deck_id) already exists.',
			hint: 'Relire le paquet',
			code: '23505'
		});

		const logged = loggedError(error);

		expect(logged).toMatchObject({
			name: 'PostgrestError',
			message: 'duplicate key value violates unique constraint',
			code: '23505',
			details: 'Key (deck_id) already exists.',
			hint: 'Relire le paquet'
		});
	});

	it('masque les données personnelles dans les champs propres d’une erreur', () => {
		const error = new PostgrestError({
			message: 'échec',
			details: 'Key (email)=(eleve@example.com) already exists.',
			hint: '',
			code: '23505'
		});

		const details = String(loggedError(error).details);
		expect(details).not.toContain('eleve@example.com');
		expect(details).toContain('[email@redacted]');
	});

	it('masque un champ propre au nom sensible', () => {
		const error = Object.assign(new Error('échec'), { token: 'abc', status: 401 });

		expect(loggedError(error)).toMatchObject({ token: '[REDACTED]', status: 401 });
	});
});
