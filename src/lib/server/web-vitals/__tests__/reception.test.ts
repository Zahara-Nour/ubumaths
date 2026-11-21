/**
 * Réception des mesures de performance : ce que le serveur accepte d'écrire.
 *
 * La table n'accepte qu'un identifiant de route bien formé ; c'est un filet. La
 * garantie d'anonymat est ici : seule une route qui existe dans le site passe (un
 * jeton écrit en minuscules a la forme d'un segment de route).
 */
import { describe, it, expect } from 'vitest';
import {
	KNOWN_ROUTES,
	keepValidSamples,
	rateLimitKey,
	rateLimitSubject,
	routeIdFromPageFile,
	webVitalsBatchSchema
} from '../reception.ts';

const ROUTES = new Set(['/', '/(public)/cours/[token]', '/(protected)/dashboard/admin/errors']);

describe('routeIdFromPageFile', () => {
	it('rend l’identifiant de route d’un fichier de page', () => {
		expect(routeIdFromPageFile('/src/routes/(public)/cours/[token]/+page.svelte')).toBe(
			'/(public)/cours/[token]'
		);
	});

	it('rend « / » pour la page d’accueil', () => {
		expect(routeIdFromPageFile('/src/routes/+page.svelte')).toBe('/');
	});

	it('accepte une page qui change de layout (+page@….svelte)', () => {
		expect(routeIdFromPageFile('/src/routes/(public)/atelier/+page@.svelte')).toBe(
			'/(public)/atelier'
		);
	});
});

describe('KNOWN_ROUTES', () => {
	it('contient les pages du site, sous leur identifiant de route', () => {
		expect(KNOWN_ROUTES.has('/(public)')).toBe(true); // l'accueil
		expect(KNOWN_ROUTES.has('/(public)/automaths')).toBe(true);
		expect(KNOWN_ROUTES.size).toBeGreaterThan(300);
	});

	it('ne contient ni route d’API ni adresse réelle', () => {
		expect(KNOWN_ROUTES.has('/api/web-vitals')).toBe(false);
		expect(KNOWN_ROUTES.has('/automaths')).toBe(false);
	});
});

describe('webVitalsBatchSchema', () => {
	const sample = { route: '/', metric: 'LCP', value: 1200 };

	it('accepte un envoi bien formé', () => {
		expect(
			webVitalsBatchSchema.safeParse({ device_type: 'mobile', samples: [sample] }).success
		).toBe(true);
	});

	it.each([
		['type d’appareil inconnu', { device_type: 'tv', samples: [sample] }],
		['aucune mesure', { device_type: 'mobile', samples: [] }],
		['trop de mesures', { device_type: 'mobile', samples: Array(11).fill(sample) }],
		['mesures absentes', { device_type: 'mobile' }],
		['corps qui n’est pas un objet', 'LCP']
	])('refuse : %s', (_cas, body) => {
		expect(webVitalsBatchSchema.safeParse(body).success).toBe(false);
	});
});

describe('keepValidSamples', () => {
	it('garde une mesure d’une route connue, réduite à ses trois champs', () => {
		const kept = keepValidSamples(
			[{ route: '/(public)/cours/[token]', metric: 'LCP', value: 1200, user_id: 'x' }],
			ROUTES
		);
		expect(kept).toEqual([{ route: '/(public)/cours/[token]', metric: 'LCP', value: 1200 }]);
	});

	it('écarte une adresse réelle, même de la forme d’une route', () => {
		// Un jeton en minuscules passe le filtre de la table : la liste l'arrête
		expect(
			keepValidSamples([{ route: '/cours/abcdef123456', metric: 'LCP', value: 1200 }], ROUTES)
		).toEqual([]);
	});

	it('écarte une page d’admin, même connue', () => {
		expect(
			keepValidSamples(
				[{ route: '/(protected)/dashboard/admin/errors', metric: 'LCP', value: 1200 }],
				ROUTES
			)
		).toEqual([]);
	});

	it.each([
		['valeur absurde', { route: '/', metric: 'LCP', value: 5_648_992 }],
		['valeur négative', { route: '/', metric: 'TTFB', value: -1 }],
		['CLS au-delà de 100', { route: '/', metric: 'CLS', value: 101 }],
		['valeur en texte', { route: '/', metric: 'LCP', value: '1200' }],
		['valeur nulle (NaN sérialisé)', { route: '/', metric: 'LCP', value: null }],
		['indicateur retiré (FID)', { route: '/', metric: 'FID', value: 12 }],
		['route absente', { metric: 'LCP', value: 1200 }],
		['route trop longue', { route: `/${'a'.repeat(200)}`, metric: 'LCP', value: 1200 }],
		['mesure qui n’est pas un objet', 'LCP']
	])('écarte : %s', (_cas, sample) => {
		expect(keepValidSamples([sample], ROUTES)).toEqual([]);
	});

	it('garde les bonnes mesures d’un envoi qui en contient une mauvaise', () => {
		const kept = keepValidSamples(
			[
				{ route: '/', metric: 'LCP', value: 5_648_992 },
				{ route: '/', metric: 'TTFB', value: 90 },
				{ route: '/', metric: 'CLS', value: 0 }
			],
			ROUTES
		);
		expect(kept).toEqual([
			{ route: '/', metric: 'TTFB', value: 90 },
			{ route: '/', metric: 'CLS', value: 0 }
		]);
	});
});

describe('rateLimitSubject', () => {
	it('garde une adresse IPv4 entière, même sous sa forme IPv6', () => {
		expect(rateLimitSubject('203.0.113.7')).toBe('203.0.113.7');
		expect(rateLimitSubject('::ffff:203.0.113.7')).toBe('203.0.113.7');
	});

	it('réduit une adresse IPv6 à son préfixe /64, quelle que soit son écriture', () => {
		expect(rateLimitSubject('2001:db8:12:34:aaaa:bbbb:cccc:dddd')).toBe('2001:db8:12:34');
		expect(rateLimitSubject('2001:0DB8:0012:0034::1')).toBe('2001:db8:12:34');
		expect(rateLimitSubject('2001:db8::1')).toBe('2001:db8:0:0');
	});
});

describe('rateLimitKey', () => {
	it('est la même pour deux adresses IPv6 du même abonné (/64)', () => {
		expect(rateLimitKey('2001:db8:12:34::1')).toBe(rateLimitKey('2001:db8:12:34:ffff::2'));
		expect(rateLimitKey('2001:db8:12:34::1')).not.toBe(rateLimitKey('2001:db8:12:35::1'));
	});

	it('ne contient pas l’adresse du visiteur', () => {
		const key = rateLimitKey('203.0.113.7');
		expect(key.startsWith('web-vitals:')).toBe(true);
		expect(key).not.toContain('203.0.113.7');
	});

	it('est la même pour la même adresse, différente pour une autre', () => {
		expect(rateLimitKey('203.0.113.7')).toBe(rateLimitKey('203.0.113.7'));
		expect(rateLimitKey('203.0.113.7')).not.toBe(rateLimitKey('203.0.113.8'));
	});
});
