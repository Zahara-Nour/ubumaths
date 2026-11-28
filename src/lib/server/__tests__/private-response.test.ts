/**
 * Réponses qu'aucun cache partagé ne doit garder (audit sécurité de la
 * lecture du dictionnaire, 2026-10-10, constat I1).
 */

import { describe, expect, it } from 'vitest';
import { enforcePrivacy, makePrivate, mustStayPrivate } from '../private-response';

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

describe('makePrivate', () => {
	it('retire aussi les consignes des caches de CDN, qui passent avant Cache-Control (E85)', () => {
		const h = headers({
			'cache-control': 'public, max-age=0',
			'cdn-cache-control': 'max-age=300',
			'vercel-cdn-cache-control': 'max-age=300, stale-while-revalidate=300'
		});
		h.append('set-cookie', 'sb-x-auth-token=jeton; Path=/; HttpOnly');

		makePrivate(h);

		expect(h.get('cache-control')).toBe('private, no-store');
		expect(h.has('cdn-cache-control')).toBe(false);
		expect(h.has('vercel-cdn-cache-control')).toBe(false);
	});
});

describe('enforcePrivacy (ce que fait le hook)', () => {
	it('liste des modèles qui pose un cookie : ni le navigateur ni Vercel ne la gardent', () => {
		const h = headers({
			'content-type': 'application/json',
			'cache-control': 'public, max-age=0',
			'vercel-cdn-cache-control': 'max-age=300, stale-while-revalidate=300'
		});
		h.append('set-cookie', 'sb-x-auth-token=jeton; Path=/; HttpOnly');

		expect(enforcePrivacy(h, false)).toBe(true);

		expect(h.get('cache-control')).toBe('private, no-store');
		expect(h.has('vercel-cdn-cache-control')).toBe(false);
	});

	it('liste des modèles sans cookie : consignes gardées telles quelles', () => {
		const h = headers({
			'content-type': 'application/json',
			'cache-control': 'public, max-age=0',
			'vercel-cdn-cache-control': 'max-age=300, stale-while-revalidate=300'
		});

		expect(enforcePrivacy(h, true)).toBe(false);

		expect(h.get('cache-control')).toBe('public, max-age=0');
		expect(h.get('vercel-cdn-cache-control')).toBe('max-age=300, stale-while-revalidate=300');
	});
});
