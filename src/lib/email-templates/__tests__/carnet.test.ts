/**
 * Carnet de liaison — les deux courriels aux parents (A2, Q18, Q26, A6)
 *
 * - confirmation : le prénom de l'élève et le nom du professeur, rien d'autre
 *   sur l'élève (Q18) ; le lien de confirmation, 7 jours ; « Je ne suis pas le
 *   parent » expliqué ;
 * - lien : le lien du carnet, et le chemin « lien perdu » (A6) ;
 * - HTML échappé (un prénom saisi peut contenir du balisage).
 */

import { describe, it, expect } from 'vitest';
import {
	getCarnetConfirmationEmailHtml,
	getCarnetConfirmationEmailText,
	getCarnetConfirmationSubject,
	getCarnetLinkEmailHtml,
	getCarnetLinkEmailText
} from '../carnet';

const JETON = 'J'.repeat(43);

describe('courriel de confirmation', () => {
	const data = { studentFirstname: 'Léa', teacherName: 'Prof Fictif', token: JETON };

	it('prénom, professeur, lien de confirmation, 7 jours, refus possible', () => {
		const text = getCarnetConfirmationEmailText(data);
		expect(getCarnetConfirmationSubject(data)).toContain('Léa');
		expect(text).toContain('Léa');
		expect(text).toContain('Prof Fictif');
		expect(text).toContain(`https://www.chiph.re/carnet/confirmer/${JETON}`);
		expect(text).toContain('7 jours');
		expect(text).toContain('Je ne suis pas le parent de cet élève');
		// Aucun lien du carnet lui-même avant la confirmation
		expect(text).not.toMatch(new RegExp(`/carnet/${JETON}`));
	});

	it('sans nom de professeur → phrase neutre', () => {
		const text = getCarnetConfirmationEmailText({ ...data, teacherName: null });
		expect(text).toContain("qu'utilise son professeur. ");
	});

	it('HTML échappé', () => {
		const html = getCarnetConfirmationEmailHtml({ ...data, studentFirstname: '<b>Léa</b>' });
		expect(html).not.toContain('<b>Léa</b>');
		expect(html).toContain('&lt;b&gt;Léa&lt;/b&gt;');
	});
});

describe('courriel du lien', () => {
	it('lien du carnet et chemin « lien perdu »', () => {
		const data = { studentFirstname: 'Léa', token: JETON };
		for (const body of [getCarnetLinkEmailText(data), getCarnetLinkEmailHtml(data)]) {
			expect(body).toContain(`https://www.chiph.re/carnet/${JETON}`);
			expect(body).toContain('https://www.chiph.re/carnet/lien-perdu');
		}
	});
});
