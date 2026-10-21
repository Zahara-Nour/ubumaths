import { describe, expect, it } from 'vitest';
import {
	getChildRegistrationEmailHtml,
	getChildRegistrationEmailText,
	getChildRegistrationSubject,
	type ChildRegistrationEmailData
} from '../child-registration';

const DATA: ChildRegistrationEmailData = {
	childFirstname: 'Noélie',
	loginId: 'noelie42',
	schoolName: 'Akadada',
	consentToken: '11111111-1111-4111-8111-111111111111',
	expiresAt: new Date('2026-10-28T12:00:00Z'),
	consentRequired: true
};

describe('courriel au parent qui inscrit son enfant', () => {
	it("donne l'identifiant et le lien unique, dans les deux versions", () => {
		for (const body of [getChildRegistrationEmailText(DATA), getChildRegistrationEmailHtml(DATA)]) {
			expect(body).toContain('noelie42');
			expect(body).toContain(`/consent/${DATA.consentToken}`);
		}
		expect(getChildRegistrationSubject(DATA)).toBe('Inscription de Noélie sur Chiphre');
	});

	it('niveau soumis au consentement : demande le consentement', () => {
		expect(getChildRegistrationEmailText(DATA)).toContain('Donner mon consentement');
		expect(getChildRegistrationEmailText(DATA)).toContain('lecture seule');
	});

	it('1re/Tle : demande seulement de confirmer l’adresse', () => {
		const text = getChildRegistrationEmailText({ ...DATA, consentRequired: false });
		expect(text).toContain('Confirmer mon adresse');
		expect(text).not.toContain('consentement');
		expect(text).not.toContain('lecture seule');
	});

	it('échappe le prénom et l’école dans la version HTML', () => {
		const html = getChildRegistrationEmailHtml({
			...DATA,
			childFirstname: '<b>x</b>',
			schoolName: '<script>'
		});
		expect(html).not.toContain('<b>x</b>');
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
	});

	it('dit au parent comment réinitialiser le mot de passe (PR 3), dans les deux versions', () => {
		for (const body of [getChildRegistrationEmailText(DATA), getChildRegistrationEmailHtml(DATA)]) {
			expect(body).toContain('Mot de passe oublié');
			expect(body).toContain('noelie42');
		}
	});
});
