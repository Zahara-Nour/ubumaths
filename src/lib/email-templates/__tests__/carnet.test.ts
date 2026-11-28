/**
 * Carnet de liaison — les deux courriels aux parents (A2, Q18, Q26, A6)
 *
 * - confirmation : le prénom de l'élève et le nom du professeur, rien d'autre
 *   sur l'élève (Q18) ; le lien de confirmation, 7 jours ; « Je ne suis pas le
 *   parent » expliqué ;
 * - lien : le lien du carnet, et le chemin « lien perdu » (A6) ;
 * - exception (PR 4) : une phrase par motif, le lien du carnet et « ne plus
 *   recevoir », par le jeton du courriel (Q38) ;
 * - trimestriel : seulement les phrases vraies, sans aucun nombre (Q34) ;
 * - HTML échappé (un prénom saisi peut contenir du balisage).
 */

import { describe, it, expect } from 'vitest';
import {
	carnetExceptionPhrase,
	carnetQuarterlyPhrases,
	getCarnetConfirmationEmailHtml,
	getCarnetExceptionEmailHtml,
	getCarnetExceptionEmailText,
	getCarnetExceptionSubject,
	getCarnetQuarterlyEmailHtml,
	getCarnetQuarterlyEmailText,
	getCarnetQuarterlySubject,
	getCarnetStopLink,
	getCarnetConfirmationEmailText,
	getCarnetConfirmationSubject,
	getCarnetLinkEmailHtml,
	getCarnetLinkEmailText
} from '../carnet';

const JETON = 'J'.repeat(43);
/** Fin d'année d'une école fictive, à 23:59:59 UTC : le jour reste le 15 juillet à Paris. */
const FIN = new Date('2027-07-15T23:59:59Z');

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
	it("dit jusqu'à quand le lien vaut : la fin de l'année de l'école", () => {
		const data = { studentFirstname: 'Léa', token: JETON, expiresAt: FIN };
		for (const body of [getCarnetLinkEmailText(data), getCarnetLinkEmailHtml(data)]) {
			expect(body).toContain("reste valable jusqu'au 15 juillet 2027.");
			expect(body).not.toContain('31 août');
		}
	});

	it('lien du carnet et chemin « lien perdu »', () => {
		const data = { studentFirstname: 'Léa', token: JETON, expiresAt: FIN };
		for (const body of [getCarnetLinkEmailText(data), getCarnetLinkEmailHtml(data)]) {
			expect(body).toContain(`https://www.chiph.re/carnet/${JETON}`);
			expect(body).toContain('https://www.chiph.re/carnet/lien-perdu');
		}
	});

	it("« lien perdu » dit quand s'en servir : plus tard, sans ce courriel", () => {
		const data = { studentFirstname: 'Léa', token: JETON, expiresAt: FIN };
		const text = getCarnetLinkEmailText(data);
		const html = getCarnetLinkEmailHtml(data);
		expect(text).toContain('Gardez ce courriel. Si vous ne le retrouvez plus un jour,');
		expect(html).toContain('Gardez ce courriel. Si vous ne le retrouvez plus un jour,');
		expect(html).toContain("(l'ancien cessera de fonctionner)");
		for (const body of [text, html]) expect(body).not.toContain('Lien perdu ?');
	});
});

describe("courriel d'exception (E1, E5, Q38)", () => {
	const data = {
		studentFirstname: 'Léa',
		token: JETON,
		reasons: ['evaluation_missed', 'reviews_overdue', 'inactivity'] as const,
		overdueDays: 7,
		inactivityDays: 15
	};

	it('une phrase par motif, le lien du carnet et « ne plus recevoir »', () => {
		const text = getCarnetExceptionEmailText({ ...data, reasons: [...data.reasons] });
		expect(getCarnetExceptionSubject({ ...data, reasons: [...data.reasons] })).toContain('Léa');
		expect(text).toContain("Léa n'a pas fait une évaluation avant son échéance.");
		expect(text).toContain('depuis plus de 7 jours.');
		expect(text).toContain('ces 15 derniers jours de classe.');
		expect(text).toContain(`https://www.chiph.re/carnet/${JETON}\n`);
		expect(text).toContain(`https://www.chiph.re/carnet/${JETON}#courriels`);
		expect(getCarnetStopLink(JETON)).toBe(`https://www.chiph.re/carnet/${JETON}#courriels`);
	});

	it('un seul motif : une seule phrase, ni note ni titre d’évaluation', () => {
		const text = getCarnetExceptionEmailText({ ...data, reasons: ['inactivity'] });
		expect(text.match(/^- /gm)).toHaveLength(1);
		expect(text).not.toContain('évaluation');
		expect(text).not.toContain('révisions');
	});

	it('HTML échappé', () => {
		const html = getCarnetExceptionEmailHtml({
			...data,
			reasons: ['inactivity'],
			studentFirstname: '<b>Léa</b>'
		});
		expect(html).not.toContain('<b>Léa</b>');
		expect(html).toContain('&lt;b&gt;Léa&lt;/b&gt;');
	});

	it('prénom manquant : « Votre enfant » en début de phrase ; objet sans retour à la ligne', () => {
		const sans = { ...data, studentFirstname: 'votre enfant' };
		expect(carnetExceptionPhrase('inactivity', sans)).toMatch(/^Votre enfant /);
		const objet = getCarnetExceptionSubject({
			...data,
			reasons: ['inactivity'],
			studentFirstname: 'Léa\r\nBcc: x@example.test'
		});
		expect(objet).not.toMatch(/[\r\n]/);
	});

	it('chaque motif a sa phrase', () => {
		for (const reason of data.reasons) {
			expect(carnetExceptionPhrase(reason, data)).toMatch(/\.$/);
		}
	});
});

describe('message trimestriel (E4, Q34)', () => {
	const base = { studentFirstname: 'Léa', token: JETON };

	it('seulement les phrases vraies, sans aucun nombre', () => {
		expect(carnetQuarterlyPhrases({ ...base, regular: true, reviewsUpToDate: false })).toEqual([
			'Léa a travaillé régulièrement ce trimestre.'
		]);
		expect(carnetQuarterlyPhrases({ ...base, regular: false, reviewsUpToDate: true })).toEqual([
			'Ses révisions sont à jour.'
		]);
		const text = getCarnetQuarterlyEmailText({ ...base, regular: true, reviewsUpToDate: true });
		const sansLiens = text.replace(/https:\S+/g, '');
		expect(sansLiens).not.toMatch(/\d/);
		expect(getCarnetQuarterlySubject({ ...base, regular: true, reviewsUpToDate: true })).toContain(
			'Léa'
		);
		expect(
			getCarnetQuarterlyEmailHtml({ ...base, regular: true, reviewsUpToDate: false })
		).toContain(`/carnet/${JETON}#courriels`);
	});
});
