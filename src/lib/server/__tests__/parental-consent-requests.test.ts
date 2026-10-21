/**
 * Renvoi d'une demande de consentement : réutiliser le lien, ou en créer un neuf ?
 * Le circuit contre la base (demande fermée, jeton refusé) est prouvé par
 * tests/integration/consentement-changement-adresse.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { consentRequestPlan } from '../parental-consent-requests';

const NOW = new Date('2026-10-21T12:00:00Z');
const DEMAIN = '2026-10-22T12:00:00Z';
const HIER = '2026-10-20T12:00:00Z';
const A = 'a@exemple.fr';

describe('consentRequestPlan', () => {
	it('aucune demande → nouvelle', () => {
		expect(consentRequestPlan(null, A, NOW)).toBe('create');
	});

	it('en attente, même adresse, lien valable → même lien', () => {
		expect(
			consentRequestPlan({ status: 'pending', parent_email: A, expires_at: DEMAIN }, A, NOW)
		).toBe('reuse');
	});

	it('en attente, AUTRE adresse → l’ancienne fermée, une nouvelle (jeton neuf)', () => {
		expect(
			consentRequestPlan(
				{ status: 'pending', parent_email: A, expires_at: DEMAIN },
				'b@exemple.fr',
				NOW
			)
		).toBe('replace');
	});

	it('en attente, lien échu → nouvelle (l’ancien lien est déjà mort)', () => {
		expect(
			consentRequestPlan({ status: 'pending', parent_email: A, expires_at: HIER }, A, NOW)
		).toBe('create');
	});

	it.each(['expired', 'granted'] as const)('demande %s → nouvelle', (status) => {
		expect(consentRequestPlan({ status, parent_email: A, expires_at: DEMAIN }, A, NOW)).toBe(
			'create'
		);
	});
});
