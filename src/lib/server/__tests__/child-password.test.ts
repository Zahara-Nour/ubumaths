/**
 * Mots de passe des élèves (PR 3) — fonctions pures
 *
 * Le circuit contre la base (jeton, demande au parent, mot de passe provisoire) est prouvé par
 * tests/integration/mots-de-passe-eleves.test.ts.
 */
import { describe, it, expect } from 'vitest';
import {
	generateProvisionalPassword,
	hasPasswordLogin,
	isFreshEmailLinkSession,
	mustChangePassword
} from '../child-password';
import { validatePasswordPolicy } from '../passwordPolicy';

describe('generateProvisionalPassword', () => {
	it('rend « Mot-Mot-NN », lisible à voix haute', () => {
		for (let i = 0; i < 50; i++) {
			expect(generateProvisionalPassword()).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-[0-9]{2}$/);
		}
	});

	it('respecte notre politique (majuscule, minuscule, chiffre, symbole, 8 caractères)', () => {
		for (let i = 0; i < 50; i++) {
			expect(validatePasswordPolicy(generateProvisionalPassword()).valid).toBe(true);
		}
	});

	it('varie d’un tirage à l’autre', () => {
		const tirages = new Set(Array.from({ length: 50 }, () => generateProvisionalPassword()));
		expect(tirages.size).toBeGreaterThan(45);
	});
});

describe('mustChangePassword', () => {
	it('vrai seulement quand la marque vaut true', () => {
		expect(mustChangePassword({ app_metadata: { must_change_password: true } })).toBe(true);
		expect(mustChangePassword({ app_metadata: { must_change_password: false } })).toBe(false);
		expect(mustChangePassword({ app_metadata: { must_change_password: 'true' } })).toBe(false);
		expect(mustChangePassword({ app_metadata: {} })).toBe(false);
		expect(mustChangePassword({})).toBe(false);
	});
});

describe('hasPasswordLogin', () => {
	it('vrai seulement si le fournisseur `email` figure parmi ceux du compte', () => {
		expect(hasPasswordLogin({ app_metadata: { providers: ['email'] } })).toBe(true);
		expect(hasPasswordLogin({ app_metadata: { providers: ['google', 'email'] } })).toBe(true);
		expect(hasPasswordLogin({ app_metadata: { providers: ['google'] } })).toBe(false);
		expect(hasPasswordLogin({ app_metadata: { providers: 'email' } })).toBe(false);
		expect(hasPasswordLogin({ app_metadata: {} })).toBe(false);
		expect(hasPasswordLogin({})).toBe(false);
	});
});

describe('isFreshEmailLinkSession', () => {
	const now = 1_800_000_000;

	it('vrai pour une session ouverte par un lien (otp) il y a moins d’une heure', () => {
		expect(isFreshEmailLinkSession([{ method: 'otp', timestamp: now - 600 }], now)).toBe(true);
	});

	it('faux pour un lien ouvert il y a plus d’une heure (session laissée ouverte)', () => {
		expect(isFreshEmailLinkSession([{ method: 'otp', timestamp: now - 3700 }], now)).toBe(false);
	});

	it('faux pour une connexion par mot de passe', () => {
		expect(isFreshEmailLinkSession([{ method: 'password', timestamp: now - 10 }], now)).toBe(false);
	});

	it('faux sans amr ou avec un amr mal formé', () => {
		expect(isFreshEmailLinkSession(undefined, now)).toBe(false);
		expect(isFreshEmailLinkSession('otp', now)).toBe(false);
		expect(isFreshEmailLinkSession([{ method: 'otp' }], now)).toBe(false);
	});
});
