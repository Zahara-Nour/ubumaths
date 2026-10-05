/**
 * Bloc ```figure — nombres d'un texte selon la langue du document (#448) :
 * virgule en français, point en anglais, à l'écran (`figureToSvg`) et au PDF
 * (`generateFigureTypst`). L'auteur écrit le point (`texte(3, 0.8, "0.3")`).
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';
import { figureToSvg, type FigureShape } from '../../utils/figure-svg';
import { generateFigureTypst } from '../../generators/figure-typst';
import { localizeFigureText } from '../../utils/figure-text-locale';
import type { ContentLocale } from '$lib/types/locale';

type LabelShape = Extract<FigureShape, { kind: 'label' }>;

const SOURCE = [
	'fenetre: -1 ; 8 ; -1 ; 4',
	'---',
	'A = point(0, 0, visible=faux)',
	'B = point(4, 0, visible=faux)',
	'texte(3, 1, "0.3")',
	'texte(5, 2, "p = 0.25")',
	'texte(1, 3, "Etat A")'
].join('\n');

function screenTexts(locale?: ContentLocale): string[] {
	const { scene } = buildFigureScene(parseFigureContent(SOURCE), locale ? { locale } : {});
	if (!scene) throw new Error('scène');
	return figureToSvg(scene, 'moyenne')
		.shapes.filter((s): s is LabelShape => s.kind === 'label')
		.map((s) => s.text);
}

describe('texte de figure : nombres selon la langue', () => {
	it('écran FR : 0.3 → 0,3, p = 0.25 → p = 0,25', () => {
		expect(screenTexts('fr')).toEqual(expect.arrayContaining(['0,3', 'p = 0,25', 'Etat A']));
	});

	it('écran sans langue : français (défaut)', () => {
		expect(screenTexts()).toEqual(expect.arrayContaining(['0,3']));
	});

	it('écran EN : 0.3 reste 0.3', () => {
		expect(screenTexts('en')).toEqual(expect.arrayContaining(['0.3', 'p = 0.25']));
	});

	it('PDF FR : "0,3" ; PDF EN : "0.3"', () => {
		const fr = generateFigureTypst(parseFigureContent(SOURCE), { language: 'fr' });
		const en = generateFigureTypst(parseFigureContent(SOURCE), { language: 'en' });
		expect(fr).toContain('0,3');
		expect(fr).toContain('p = 0,25');
		expect(fr).not.toMatch(/"0\.3"|\[0\.3\]/);
		expect(en).toContain('0.3');
		expect(en).toContain('p = 0.25');
	});

	it('valeur calculée affichée ({d:.2f}) : virgule en français', () => {
		const source = [
			'fenetre: -1 ; 8 ; -1 ; 4',
			'---',
			'A = point(0, 0)',
			'B = point(1.5, 0)',
			'd = distance(A, B)',
			'texte(3, 2, "AB = {d:.2f}")'
		].join('\n');
		const { scene } = buildFigureScene(parseFigureContent(source), { locale: 'fr' });
		if (!scene) throw new Error('scène');
		const texts = figureToSvg(scene, 'moyenne')
			.shapes.filter((s): s is LabelShape => s.kind === 'label')
			.map((s) => s.text);
		expect(texts).toContain('AB = 1,50');
	});
});

describe('localizeFigureText', () => {
	it('seuls les nombres décimaux changent, en français', () => {
		expect(localizeFigureText('0.3', 'fr')).toBe('0,3');
		expect(localizeFigureText('-12.75 m', 'fr')).toBe('-12,75 m');
		expect(localizeFigureText('Fin.', 'fr')).toBe('Fin.');
		expect(localizeFigureText('version 1.2.3', 'fr')).toBe('version 1.2.3');
		expect(localizeFigureText('A. 3', 'fr')).toBe('A. 3');
		expect(localizeFigureText('0.3', 'en')).toBe('0.3');
		expect(localizeFigureText('0,3', 'en')).toBe('0,3');
	});
});
