/**
 * Réponses qu'aucun cache partagé ne doit garder (audit sécurité de la
 * lecture du dictionnaire, 2026-10-10, constat I1).
 */

import { describe, expect, it } from 'vitest';
import { mustStayPrivate } from '../private-response';

function headers(init: Record<string, string>): Headers {
	return new Headers(init);
}

describe('mustStayPrivate', () => {
	it('JSON public sans cookie (dictionnaire, visiteur) : peut être gardé', () => {
		expect(mustStayPrivate(headers({ 'content-type': 'application/json' }), false)).toBe(false);
		expect(mustStayPrivate(headers({ 'content-type': 'application/json' }), true)).toBe(false);
	});

	it('JSON public qui pose un cookie (session rafraîchie) : privé', () => {
		const h = headers({ 'content-type': 'application/json' });
		h.append('set-cookie', 'sb-x-auth-token=jeton; Path=/; HttpOnly');
		expect(mustStayPrivate(h, true)).toBe(true);
		expect(mustStayPrivate(h, false)).toBe(true);
	});

	it('page HTML d’un utilisateur connecté : privée (H2)', () => {
		expect(mustStayPrivate(headers({ 'content-type': 'text/html; charset=utf-8' }), true)).toBe(
			true
		);
	});

	it('page HTML d’un visiteur sans cookie : peut être gardée', () => {
		expect(mustStayPrivate(headers({ 'content-type': 'text/html' }), false)).toBe(false);
	});
});
