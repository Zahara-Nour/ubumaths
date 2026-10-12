import { describe, it, expect } from 'vitest';
import { parseCookieHeader, serializeCookieHeader, type CookieOptions } from '@supabase/ssr';
import { MAX_SESSION_AGE, browserCookieMethods, capSessionCookieOptions } from '../session-cookies';

const FOUR_HUNDRED_DAYS = 400 * 24 * 60 * 60;

/** Faux `document` : chaque écriture est gardée telle quelle ; la lecture rend un en-tête fixe. */
function fakeDocument(header = '') {
	const writes: string[] = [];
	return {
		writes,
		get cookie() {
			return header;
		},
		set cookie(line: string) {
			writes.push(line);
		}
	};
}

describe('capSessionCookieOptions', () => {
	it('ramène les 400 jours de la bibliothèque à 30 jours', () => {
		const capped = capSessionCookieOptions({
			path: '/',
			sameSite: 'lax',
			maxAge: FOUR_HUNDRED_DAYS
		});
		expect(capped).toEqual({ path: '/', sameSite: 'lax', maxAge: MAX_SESSION_AGE });
	});

	it('laisse passer un effacement (maxAge 0) et un cookie plus court', () => {
		expect(capSessionCookieOptions({ maxAge: 0 })).toEqual({ maxAge: 0 });
		expect(capSessionCookieOptions({ maxAge: 3600 })).toEqual({ maxAge: 3600 });
	});

	it("n'ajoute pas de durée à un cookie qui n'en a pas", () => {
		// Type réel des options que rend @supabase/ssr
		const options: CookieOptions = { path: '/' };
		expect(capSessionCookieOptions(options)).toEqual({ path: '/' });
	});
});

describe('browserCookieMethods (client navigateur)', () => {
	const codec = { parse: parseCookieHeader, serialize: serializeCookieHeader };

	it('écrit le cookie de session avec Max-Age plafonné à 30 jours', () => {
		const doc = fakeDocument();
		browserCookieMethods(codec, doc).setAll([
			{
				name: 'sb-x-auth-token',
				value: 'base64-abc',
				options: { path: '/', sameSite: 'lax', maxAge: FOUR_HUNDRED_DAYS }
			}
		]);
		expect(doc.writes).toEqual([
			`sb-x-auth-token=base64-abc; Max-Age=${MAX_SESSION_AGE}; Path=/; SameSite=Lax`
		]);
	});

	it('efface un morceau de cookie avec Max-Age=0', () => {
		const doc = fakeDocument();
		browserCookieMethods(codec, doc).setAll([
			{ name: 'sb-x-auth-token.1', value: '', options: { path: '/', maxAge: 0 } }
		]);
		expect(doc.writes).toEqual(['sb-x-auth-token.1=; Max-Age=0; Path=/']);
	});

	it('relit tous les cookies du document', () => {
		const doc = fakeDocument('sb-x-auth-token=base64-abc; theme=dark');
		expect(browserCookieMethods(codec, doc).getAll()).toEqual([
			{ name: 'sb-x-auth-token', value: 'base64-abc' },
			{ name: 'theme', value: 'dark' }
		]);
	});
});
