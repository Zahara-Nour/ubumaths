/**
 * Lecture facilitée des PDF de fiche (accessibilité, élèves dys)
 *
 * Phase 0 validée par David le 2026-11-19 (chantier `lecture-facilitee`) :
 * TOUT le document en Luciole, formules en Luciole Math, lettres, mots et
 * lignes un peu espacés comme à l'écran ; un gabarit de prof passe aussi en
 * Luciole ; repli dans la police habituelle si la compilation échoue.
 */
import { describe, it, expect } from 'vitest';
import {
	EASY_READING_FONT_FILES,
	EASY_READING_RULES,
	hasEasyReading,
	withEasyReading,
	withoutEasyReading
} from '../easy-reading';
import { STUDENT_STYLE_COMMON } from '../templates/default-templates';

describe('EASY_READING_RULES', () => {
	it('texte en Luciole, formules en Luciole Math', () => {
		expect(EASY_READING_RULES).toContain('#set text(font: "Luciole"');
		expect(EASY_READING_RULES).toContain('#show math.equation: set text(font: "Luciole Math"');
	});

	it('lettres, mots et lignes un peu espacés (comme à l’écran)', () => {
		expect(EASY_READING_RULES).toContain('tracking: 0.02em');
		expect(EASY_READING_RULES).toContain('spacing: 100% + 0.08em');
		expect(EASY_READING_RULES).toMatch(/#set par\(leading: [\d.]+em/);
	});

	it('texte aligné à gauche, jamais justifié (blancs irréguliers gênants pour un dys)', () => {
		expect(EASY_READING_RULES).toMatch(/#set par\([^)]*justify: false/);
	});

	it('les formules ne sont pas espacées (lettres des formules à leur place)', () => {
		expect(EASY_READING_RULES).toMatch(/math\.equation: set text\([^)]*tracking: 0em/);
	});

	it('les cinq fichiers de Luciole servis par static/', () => {
		expect(EASY_READING_FONT_FILES).toEqual([
			'/fonts/luciole/Luciole-Regular.ttf',
			'/fonts/luciole/Luciole-Bold.ttf',
			'/fonts/luciole/Luciole-Italic.ttf',
			'/fonts/luciole/Luciole-BoldItalic.ttf',
			'/fonts/luciole/Luciole-Math.otf'
		]);
	});
});

describe('withEasyReading', () => {
	it('règles en tête du document (pied de page, numéros de page)', () => {
		const typst = withEasyReading('#set text(font: "New Computer Modern")\nCONTENU');
		expect(typst.startsWith(EASY_READING_RULES)).toBe(true);
	});

	it('règles reposées après le dernier `#set text` du gabarit : Luciole l’emporte', () => {
		const typst = withEasyReading(STUDENT_STYLE_COMMON);
		const lastTemplateFont = typst.lastIndexOf('#set text(font: "New Computer Modern"');
		const lastRules = typst.lastIndexOf(EASY_READING_RULES);
		expect(lastTemplateFont).toBeGreaterThan(-1);
		expect(lastRules).toBeGreaterThan(lastTemplateFont);
	});

	it('règles reposées après un `#set par` du gabarit : l’interligne élargi l’emporte', () => {
		const source = [
			'#set text(font: "New Computer Modern", size: 11pt)',
			'#set par(justify: true, leading: 0.8em)',
			'CONTENU'
		].join('\n');
		const typst = withEasyReading(source);
		expect(typst.lastIndexOf(EASY_READING_RULES)).toBeGreaterThan(
			typst.indexOf('#set par(justify: true, leading: 0.8em)')
		);
		expect(typst.endsWith('CONTENU')).toBe(true);
	});

	it('un `#set text` imbriqué (dans un bloc) ne déplace pas les règles', () => {
		const source = '#set text(size: 10pt)\n#[\n  #set text(fill: gray)\n  pied\n]\nCONTENU';
		const typst = withEasyReading(source);
		const second = typst.indexOf(EASY_READING_RULES, EASY_READING_RULES.length);
		expect(second).toBeLessThan(typst.indexOf('#['));
	});

	it('document sans `#set text` : règles en tête seulement', () => {
		const typst = withEasyReading('CONTENU');
		expect(typst).toBe(`${EASY_READING_RULES}\nCONTENU`);
	});
});

describe('hasEasyReading / withoutEasyReading (repli)', () => {
	it('repère un document en lecture facilitée', () => {
		expect(hasEasyReading(withEasyReading(STUDENT_STYLE_COMMON))).toBe(true);
		expect(hasEasyReading(STUDENT_STYLE_COMMON)).toBe(false);
	});

	it('retire TOUTES les règles : le document d’origine revient', () => {
		const source = '#set text(font: "New Computer Modern")\n#set par(leading: 0.8em)\nCONTENU';
		const typst = withEasyReading(source);
		expect(withoutEasyReading(typst)).toBe(source);
		expect(hasEasyReading(withoutEasyReading(typst))).toBe(false);
	});

	it('le gabarit d’un style complet revient tel quel', () => {
		expect(withoutEasyReading(withEasyReading(STUDENT_STYLE_COMMON))).toBe(STUDENT_STYLE_COMMON);
	});
});
