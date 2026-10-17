/**
 * Logger serveur (écart L35) : formes de données personnelles que le masquage laissait
 * passer, prouvées par une sonde lors de l'audit du lot 3 de L8 (#1298).
 *
 * Le masquage marche par liste (motifs dans les chaînes, noms de champs) : une forme
 * absente de la liste arrive en clair dans les journaux Vercel. Chaque forme a son test ;
 * en face, ce qui doit rester lisible pour trier une erreur (codes d'erreur, chemins de pile).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServerLogger } from '$lib/utils/logger';

afterEach(() => {
	vi.restoreAllMocks();
});

/** Ce que le logger écrit réellement : message masqué, puis chaque argument masqué. */
function logged(message: unknown, ...args: unknown[]): unknown[] {
	const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
	createServerLogger('x.ts').error(message, ...args);
	// Dernier appel : dans un même test, `spyOn` rend le même espion, qui garde les appels
	// précédents
	return (spy.mock.lastCall ?? []).slice(1);
}

function loggedText(message: unknown, ...args: unknown[]): string {
	return JSON.stringify(logged(message, ...args));
}

describe('createServerLogger — noms des élèves', () => {
	it('masque les métadonnées d’un compte (full_name, name, pseudo)', () => {
		const user = {
			id: 'b3f1c2d4-0000-4000-8000-000000000001',
			user_metadata: { full_name: 'Léa Martin', name: 'Léa Martin', pseudo: 'leam' }
		};

		const text = loggedText('connexion', user);

		expect(text).not.toContain('Léa');
		expect(text).not.toContain('leam');
	});

	it('masque les champs de nom d’un profil', () => {
		const profile = { firstname: 'Léa', lastname: 'Martin', full_name: 'Léa Martin' };

		expect(loggedText('profil', profile)).not.toMatch(/Léa|Martin/);
	});

	it('masque les noms d’un compte connecté par Google (identities)', () => {
		const user = {
			id: 'b3f1c2d4-0000-4000-8000-000000000001',
			identities: [
				{
					provider: 'google',
					identity_data: { name: 'Léa Martin', given_name: 'Léa', family_name: 'Martin' }
				}
			],
			given_name: 'Léa',
			family_name: 'Martin'
		};

		expect(loggedText('connexion', user)).not.toMatch(/Léa|Martin/);
	});

	it('garde le champ name d’un objet qui n’est pas une personne', () => {
		expect(logged('catégorie', { name: 'Fractions' })[1]).toEqual({ name: 'Fractions' });
	});
});

describe('createServerLogger — codes de connexion', () => {
	it('masque les paramètres code et token_hash d’une URL', () => {
		const text = loggedText(
			'callback /auth/callback?code=9f8e7d6c-1111-4222-8333-444455556666&next=/dashboard',
			'confirm /auth/confirm?token_hash=pkce_abcdef123456&type=email'
		);

		expect(text).not.toContain('9f8e7d6c');
		expect(text).not.toContain('pkce_abcdef123456');
		expect(text).toContain('next=/dashboard');
		expect(text).toContain('type=email');
	});

	it('masque un code à usage unique écrit dans une chaîne', () => {
		expect(loggedText('OTP 482913 refusé')).not.toContain('482913');
		expect(loggedText('code: 482913')).not.toContain('482913');
		expect(loggedText('réponse {"code": "482913"}')).not.toContain('482913');
		expect(loggedText('otp_code: 482913')).not.toContain('482913');
	});

	it('garde un code d’erreur Postgres écrit dans une chaîne', () => {
		expect(loggedText('échec (code: "23505")')).toContain('23505');
	});

	it('masque les clés mdp, pwd et otp', () => {
		const [, value] = logged('saisie', { mdp: 'secret1', pwd: 'secret2', otp: '482913' });

		expect(value).toEqual({ mdp: '[REDACTED]', pwd: '[REDACTED]', otp: '[REDACTED]' });
	});

	it('masque la clé code quand elle porte un code de connexion', () => {
		const [, value] = logged('échange', {
			verify: { code: '482913' },
			oauth: { code: '9f8e7d6c-1111-4222-8333-444455556666' },
			numeric: { code: 482913 }
		});

		expect(JSON.stringify(value)).not.toMatch(/482913|9f8e7d6c/);
	});

	it('garde la clé code quand elle porte un code d’erreur', () => {
		const [, value] = logged('échecs', [
			{ code: '23505' },
			{ code: '42501' },
			{ code: 'PGRST116' },
			{ code: 'otp_expired' },
			{ code: 'ECONNRESET' },
			{ code: 'EAI_AGAIN' },
			{ code: 'UND_ERR_CONNECT_TIMEOUT' },
			{ code: 'ERR_HTTP2_STREAM_ERROR' },
			{ code: 401 }
		]);

		expect(value).toEqual([
			{ code: '23505' },
			{ code: '42501' },
			{ code: 'PGRST116' },
			{ code: 'otp_expired' },
			{ code: 'ECONNRESET' },
			{ code: 'EAI_AGAIN' },
			{ code: 'UND_ERR_CONNECT_TIMEOUT' },
			{ code: 'ERR_HTTP2_STREAM_ERROR' },
			{ code: 401 }
		]);
	});

	it('garde un booléen sous une clé sensible (il ne dit rien du secret)', () => {
		const [, value] = logged('confirmation', { hasOtpHash: true, session: false });

		expect(value).toEqual({ hasOtpHash: true, session: false });
	});
});

describe('createServerLogger — e-mails', () => {
	it('masque un e-mail sans point dans le domaine', () => {
		expect(loggedText('inscription de eleve@college')).not.toContain('eleve@college');
	});

	it('masque un e-mail sans point sous la clé email', () => {
		const [, value] = logged('profil', { email: 'eleve@college' });

		expect(value).toEqual({ email: '[email@redacted]' });
	});

	it('masque en entier un e-mail à domaine numérique ou à lettres accentuées', () => {
		for (const email of [
			'eleve@163.com',
			'x@123.fr',
			'marie@école.fr',
			'zoé.martin@gmail.com',
			'jérôme@laposte.net'
		]) {
			expect(logged(`connexion de ${email}`)[0]).toBe('connexion de [email@redacted]');
		}
	});

	it('garde lisibles les chemins de pile des paquets', () => {
		const frame =
			'at f (/var/task/node_modules/.pnpm/@supabase+postgrest-js@1.21.4/node_modules/@supabase/postgrest-js/dist/index.js:1:2)';

		expect(logged(frame)[0]).toBe(frame);
	});

	it('masque une adresse dont la partie locale ou le domaine commence par des chiffres', () => {
		// Fuites trouvées par sonde lors de l'audit des pairs pnpm : une date de naissance
		// dans l'adresse ressemble à une version de paquet
		for (const email of [
			'1.2@x.fr',
			'06.12.2010.dupont@gmail.com',
			'12.5eleve@x.fr',
			'3.14159@pi.fr',
			'x@12.34.fr',
			'x@1.2.example.fr',
			'x@0.1truc.fr',
			'1.2.3.4@x.fr'
		]) {
			expect(logged(`connexion de ${email}`)[0]).toBe('connexion de [email@redacted]');
		}
		expect(loggedText('1.2@x.fr@y.fr')).not.toMatch(/1\.2|x\.fr/);
		expect(loggedText('kit@2.8.0_@eleve.fr')).not.toContain('eleve.fr');
	});

	it('garde lisible un chemin de pile pnpm avec pairs (`_@`)', () => {
		const frame =
			'at g (/var/task/node_modules/.pnpm/@sveltejs+kit@2.8.0_@sveltejs+vite-plugin-svelte@4.0.0-next.6_svelte@5.1.0__vite@5.4.0/node_modules/@sveltejs/kit/src/runtime/server/index.js:3:4)';

		expect(logged(frame)[0]).toBe(frame);
	});

	it('masque une chaîne de 100 000 caractères en temps linéaire', () => {
		// Le motif e-mail reparcourait la chaîne depuis chaque position : 5 à 10 s
		// pour 100 Ko sans `@` (mesuré le 2026-10-13), le temps d'une fonction Vercel
		for (const long of ['a'.repeat(100_000), 'a.'.repeat(50_000), 'a-'.repeat(50_000)]) {
			const start = performance.now();
			logged(long);
			expect(performance.now() - start).toBeLessThan(1000);
		}
	});
});
