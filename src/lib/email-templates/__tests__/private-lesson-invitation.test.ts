import { describe, expect, it } from 'vitest';
import {
	getPrivateLessonInvitationEmailHtml,
	getPrivateLessonInvitationEmailText,
	getPrivateLessonInvitationLink,
	getPrivateLessonInvitationSubject,
	type PrivateLessonInvitationEmailData
} from '../private-lesson-invitation';

const DATA: PrivateLessonInvitationEmailData = {
	childFirstname: 'Jade',
	schoolName: 'Akadada',
	token: 'AbC-123_xyzAbC-123_xyzAbC-123_xyzAbC-123_x',
	expiresAt: new Date('2026-12-02T23:30:00Z')
};

describe("courriel d'invitation de cours particulier", () => {
	it('sujet de la phase 0', () => {
		expect(getPrivateLessonInvitationSubject(DATA)).toBe("Créez l'espace de Jade sur Chiphre");
	});

	it('le lien de la page du parent, dans les deux versions', () => {
		const link = getPrivateLessonInvitationLink(DATA.token);
		expect(link).toBe(`https://www.chiph.re/auth/register/invitation/${DATA.token}`);
		for (const body of [
			getPrivateLessonInvitationEmailText(DATA),
			getPrivateLessonInvitationEmailHtml(DATA)
		]) {
			expect(body).toContain(link);
			expect(body).toContain('Akadada');
			expect(body).toContain('consentement');
		}
	});

	it("l'échéance est dite à l'heure de Paris (23 h 30 UTC = le lendemain)", () => {
		expect(getPrivateLessonInvitationEmailText(DATA)).toContain('jeudi 3 décembre 2026');
	});

	it('prénom et école échappés en HTML', () => {
		const html = getPrivateLessonInvitationEmailHtml({
			...DATA,
			childFirstname: '<b>x</b>',
			schoolName: 'A & B'
		});
		expect(html).not.toContain('<b>x</b>');
		expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
		expect(html).toContain('A &amp; B');
	});
});
