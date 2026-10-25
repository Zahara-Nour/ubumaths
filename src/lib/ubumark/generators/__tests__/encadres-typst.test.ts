/**
 * Encadrés et détails en ligne d'une correction, au PDF (ADR 0017, D8 ; 2026-10-11)
 *
 * Avant : `> [!méthode]` s'imprimait comme une citation simple, sans titre, et
 * `[…]{.rappel}` comme du texte ordinaire. Décisions de David (2026-10-11) :
 * titre + bord + fond pâle par type ; le rappel se place à sa place (pas en
 * marge) ; titres selon la langue du document ; lisible en noir et blanc (le
 * titre et le bord portent l'information).
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '../typst-generator';

const typst = (md: string, language?: string) =>
	(generateTypst(parseMarkdown(md), { includeSetup: false, language }).split(
		'// ubumark: fin de l’en-tête'
	)[1] ?? '') as string;

describe('encadrés typés au PDF', () => {
	it.each([
		['méthode', 'Méthode'],
		['rappel', 'Rappel'],
		['attention', 'Attention']
	])('`> [!%s]` : un bloc à bord gauche, fond pâle et titre « %s »', (word, label) => {
		const out = typst(`> [!${word}] On isole la variable.`);
		expect(out).toContain('#block(');
		expect(out).toMatch(/stroke: \(left: [\d.]+pt \+ rgb\("#[0-9a-f]{6}"\)\)/);
		expect(out).toMatch(/fill: rgb\("#[0-9a-f]{6}"\)/);
		expect(out).toContain(`#text(weight: "bold"`);
		expect(out).toContain(`[${label}]`);
		expect(out).toContain('On isole la variable.');
		expect(out).not.toContain('#quote');
	});

	it('les trois types ont trois couleurs de bord différentes', () => {
		const border = (word: string) =>
			/stroke: \(left: [\d.]+pt \+ (rgb\("#[0-9a-f]{6}"\))\)/.exec(typst(`> [!${word}] x`))?.[1];
		const colors = new Set(['méthode', 'rappel', 'attention'].map(border));
		expect(colors.size).toBe(3);
	});

	it('le rappel : texte un peu plus petit, à sa place (pas de marge)', () => {
		const out = typst('Avant.\n\n> [!rappel] Une propriété.\n\nAprès.');
		expect(out).toMatch(/#text\(size: 0\.9\dem\)/);
		expect(out.indexOf('Avant.')).toBeLessThan(out.indexOf('Une propriété.'));
		expect(out.indexOf('Une propriété.')).toBeLessThan(out.indexOf('Après.'));
	});

	it('titres en anglais pour un document en anglais', () => {
		expect(typst('> [!méthode] x', 'en')).toContain('[Method]');
		expect(typst('> [!rappel] x', 'en')).toContain('[Reminder]');
		expect(typst('> [!attention] x', 'en')).toContain('[Warning]');
	});

	it('une citation ordinaire ne change pas', () => {
		expect(typst('> Une citation.')).toContain('#quote(block: true)[');
	});

	it('un encadré avec une formule et plusieurs paragraphes', () => {
		const out = typst('> [!méthode] On pose $u=2x$.\n>\n> Puis on dérive.');
		expect(out).toContain('[Méthode]');
		// La formule sort comme dans un paragraphe ordinaire
		const math = /\$[^$]+\$/.exec(typst('On pose $u=2x$.'))![0];
		expect(out).toContain(math);
		expect(out).toContain('Puis on dérive.');
	});
});

describe('détails en ligne au PDF', () => {
	it('`[…]{.calcul}` : texte gris', () => {
		const out = typst('On a [2 fois 3]{.calcul} six.');
		expect(out).toMatch(/#text\(fill: rgb\("#[0-9a-f]{6}"\)\)\[2 fois 3\]/);
	});

	it.each(['rappel', 'méthode', 'attention'])('`[…]{.%s}` : fond teinté', (word) => {
		const out = typst(`C'est [une propriété]{.${word}} connue.`);
		expect(out).toMatch(/#highlight\(fill: rgb\("#[0-9a-f]{6}"\)\)\[une propriété\]/);
	});

	// Revue du 2026-10-11, prouvée au compilateur de la prod : sans `;`, Typst lit
	// `(voir)`, `[y]` ou `.suite` collés comme la suite de l'appel → TOUTE la fiche
	// échoue (« unknown variable: voir »). Le `;` termine l'appel et ne s'imprime pas.
	it.each([
		['[x]{.rappel}(voir page 3)', '(voir page 3)'],
		// Crochets du texte échappés depuis #1791
		['[x]{.calcul}[y]', '\\[y\\]'],
		['[x]{.méthode}.suite', '.suite']
	])('détail collé à la suite (%s) : appel terminé par « ; »', (md, after) => {
		expect(typst(md)).toContain(`[x];${after}`);
	});

	it('texte hors détail : inchangé', () => {
		expect(typst('Un texte simple.')).not.toMatch(/#highlight|#text\(fill/);
	});
});
