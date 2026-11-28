/**
 * Relais de Supabase local par le serveur de dev (`src/lib/dev/supabase-relay.ts`,
 * `scripts/relais/plugin.ts`).
 */

import { describe, expect, it } from 'vitest';
import {
	SUPABASE_RELAY_PATH,
	directAddress,
	isRelayed,
	relayTarget,
	relayedAddress,
	relayedSupabaseUrl,
	sessionCookieName
} from '../../src/lib/dev/supabase-relay.ts';
import {
	RELAY_RULE,
	appliesTo,
	relayErrorBody,
	relayServerConfig,
	supabaseRelay
} from '../relais/plugin.ts';

const LOCAL = 'http://127.0.0.1:54321';
const PROD = 'https://abcdefgh.supabase.co';
const TAILNET = 'https://serveur.tail0000.ts.net:8443';

describe('relais — quand sert-il', () => {
	it('base locale, en dev : oui', () => {
		expect(isRelayed(LOCAL, true)).toBe(true);
		expect(isRelayed('http://localhost:54321', true)).toBe(true);
	});

	it('hors dev (site construit, prod) : jamais, même sur la base locale', () => {
		expect(isRelayed(LOCAL, false)).toBe(false);
	});

	it('base distante : jamais de relais, ni vers la prod ni vers une adresse du tailnet', () => {
		expect(relayTarget(PROD)).toBeNull();
		expect(relayTarget(TAILNET)).toBeNull();
		expect(relayTarget('https://127.0.0.1:54321')).toBeNull();
		expect(relayTarget(undefined)).toBeNull();
		expect(relayTarget('pas une adresse')).toBeNull();
		expect(isRelayed(PROD, true)).toBe(false);
	});

	it('adresse piégée qui ressemble à la base locale : jamais de relais', () => {
		for (const trap of [
			'http://127.0.0.1.evil.example:54321',
			'http://localhost@evil.example:54321',
			'http://localhost.:54321',
			'http://localhost.evil.example',
			'http://[::ffff:127.0.0.1]:54321'
		])
			expect(relayTarget(trap), trap).toBeNull();
	});
});

describe('relais — adresse de Supabase pour le navigateur', () => {
	it('le relais, sur l’origine de la page : Mac mini, tunnel ou lien du tailnet', () => {
		expect(relayedSupabaseUrl(LOCAL, 'http://localhost:5176', true)).toBe(
			`http://localhost:5176${SUPABASE_RELAY_PATH}`
		);
		expect(relayedSupabaseUrl(LOCAL, 'https://serveur.tail0000.ts.net:8444', true)).toBe(
			`https://serveur.tail0000.ts.net:8444${SUPABASE_RELAY_PATH}`
		);
	});

	it('prod et site construit : l’adresse de Supabase, inchangée', () => {
		expect(relayedSupabaseUrl(PROD, 'https://chiph.re', false)).toBe(PROD);
		expect(relayedSupabaseUrl(PROD, 'http://localhost:5176', true)).toBe(PROD);
		expect(relayedSupabaseUrl(LOCAL, 'http://localhost:4173', false)).toBe(LOCAL);
	});
});

describe('relais — cookie de session', () => {
	it('le nom que supabase-js déduit de l’adresse directe', () => {
		expect(sessionCookieName(LOCAL)).toBe('sb-127-auth-token');
		expect(sessionCookieName(PROD)).toBe('sb-abcdefgh-auth-token');
	});

	it('le navigateur garde le nom du serveur, quel que soit l’appareil', async () => {
		// Ce que supabase-js déduirait SANS nom imposé : un nom par adresse de page
		const { createClient } = await import('@supabase/supabase-js');
		const keyOf = (url: string) =>
			(
				createClient(url, 'cle', { auth: { persistSession: false } }) as unknown as {
					storageKey: string;
				}
			).storageKey;
		expect(keyOf(LOCAL)).toBe(sessionCookieName(LOCAL));
		expect(keyOf(relayedSupabaseUrl(LOCAL, 'https://serveur.tail0000.ts.net:8444', true))).not.toBe(
			sessionCookieName(LOCAL)
		);
	});

	it('supabase-js garde le chemin du relais dans ses adresses', async () => {
		const { createClient } = await import('@supabase/supabase-js');
		const client = createClient(relayedSupabaseUrl(LOCAL, 'http://localhost:5176', true), 'cle', {
			auth: { persistSession: false }
		});
		const { data } = client.storage.from('question-images').getPublicUrl('a/b.webp');
		expect(data.publicUrl).toBe(
			`http://localhost:5176${SUPABASE_RELAY_PATH}/storage/v1/object/public/question-images/a/b.webp`
		);
	});
});

describe('relais — adresses du stockage rendues au navigateur', () => {
	it('adresse de Supabase local : chemin du relais, sans origine', () => {
		expect(relayedAddress(`${LOCAL}/storage/v1/object/sign/b/f.pdf?token=x`, LOCAL, true)).toBe(
			`${SUPABASE_RELAY_PATH}/storage/v1/object/sign/b/f.pdf?token=x`
		);
	});

	it('toute autre adresse : telle quelle', () => {
		const prodImage = `${PROD}/storage/v1/object/public/b/f.webp`;
		expect(relayedAddress(prodImage, LOCAL, true)).toBe(prodImage);
		expect(relayedAddress('/shtam/image.webp', LOCAL, true)).toBe('/shtam/image.webp');
		expect(relayedAddress('http://127.0.0.1:543210/x', LOCAL, true)).toBe(
			'http://127.0.0.1:543210/x'
		);
	});

	it('prod et site construit : rien n’est réécrit', () => {
		const prodImage = `${PROD}/storage/v1/object/public/b/f.webp`;
		expect(relayedAddress(prodImage, PROD, false)).toBe(prodImage);
		expect(relayedAddress(prodImage, PROD, true)).toBe(prodImage);
		expect(relayedAddress(`${LOCAL}/storage/v1/x`, LOCAL, false)).toBe(`${LOCAL}/storage/v1/x`);
	});
});

describe('relais — adresses enregistrées', () => {
	const PAGE = 'https://serveur.tail0000.ts.net:8444';

	it('adresse fabriquée par le relais : l’adresse directe, la même sur tous les appareils', () => {
		const made = `${PAGE}${SUPABASE_RELAY_PATH}/storage/v1/object/public/b/f.webp`;
		expect(directAddress(made, LOCAL, PAGE, true)).toBe(
			`${LOCAL}/storage/v1/object/public/b/f.webp`
		);
		expect(relayedAddress(directAddress(made, LOCAL, PAGE, true), LOCAL, true)).toBe(
			`${SUPABASE_RELAY_PATH}/storage/v1/object/public/b/f.webp`
		);
	});

	it('prod, site construit, autre adresse : rien n’est réécrit', () => {
		const prodImage = `${PROD}/storage/v1/object/public/b/f.webp`;
		expect(directAddress(prodImage, PROD, 'https://chiph.re', false)).toBe(prodImage);
		expect(directAddress(prodImage, LOCAL, PAGE, true)).toBe(prodImage);
		const made = `${PAGE}${SUPABASE_RELAY_PATH}/storage/v1/x`;
		expect(directAddress(made, LOCAL, PAGE, false)).toBe(made);
	});
});

describe('relais — serveur de dev', () => {
	it('n’existe que sur le serveur de dev : ni build, ni preview du site construit', () => {
		expect(supabaseRelay(() => LOCAL).apply).toBe(appliesTo);
		expect(appliesTo({}, { command: 'serve' })).toBe(true);
		expect(appliesTo({}, { command: 'build' })).toBe(false);
		expect(appliesTo({}, { command: 'serve', isPreview: true })).toBe(false);
	});

	it('base locale : relaie le chemin vers Supabase, sockets compris, et retire le préfixe', () => {
		const config = relayServerConfig(LOCAL);
		const rule = config?.proxy[RELAY_RULE];
		expect(rule?.target).toBe(LOCAL);
		expect(rule?.ws).toBe(true);
		expect(rule?.rewrite(`${SUPABASE_RELAY_PATH}/auth/v1/token?grant_type=password`)).toBe(
			'/auth/v1/token?grant_type=password'
		);
		expect(rule?.rewrite(SUPABASE_RELAY_PATH)).toBe('/');
	});

	it('ne relaie que son chemin, pas ce qui commence pareil', () => {
		const rule = new RegExp(RELAY_RULE);
		expect(rule.test(`${SUPABASE_RELAY_PATH}/rest/v1/x`)).toBe(true);
		expect(rule.test(SUPABASE_RELAY_PATH)).toBe(true);
		expect(rule.test(`${SUPABASE_RELAY_PATH}-autre/x`)).toBe(false);
		expect(rule.test('/__dev/retours')).toBe(false);
	});

	it('base locale : le nom du Mac sur le tailnet est accepté d’office', () => {
		expect(relayServerConfig(LOCAL)?.allowedHosts).toEqual(['.ts.net']);
	});

	it('base distante ou adresse absente : aucun relais, aucun nom accepté en plus', () => {
		expect(relayServerConfig(PROD)).toBeNull();
		expect(relayServerConfig(TAILNET)).toBeNull();
		expect(relayServerConfig(undefined)).toBeNull();
	});

	it('Supabase local arrêté : erreur claire', () => {
		expect(relayErrorBody().message).toContain('pnpm db:start');
	});
});
