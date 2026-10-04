/**
 * Bloc ```figure : un hex d'auteur peu lisible en mode sombre donne un
 * AVERTISSEMENT avec le nom de palette le plus proche (décision D2, lot 3) ;
 * la couleur reste telle quelle (D2a) et la figure s'affiche.
 */
import { describe, expect, it } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';

const content = (body: string) => parseFigureContent(`fenetre: -1 ; 8 ; -1 ; 6\n---\n${body}`);

describe('figure — contraste en mode sombre', () => {
	it('#000080 : avertissement qui propose « bleu », figure dessinée', () => {
		const result = buildFigureScene(content('A = point(1, 1, couleur="#000080")'));
		expect(result.scene).not.toBeNull();
		const messages = result.warnings.map((w) => w.message);
		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatch(/« A »/);
		expect(messages[0]).toMatch(/#000080/);
		expect(messages[0]).toMatch(/« bleu »/);
	});

	it('#1a1a1a : propose « noir »', () => {
		const result = buildFigureScene(content('A = point(1, 1, couleur="#1a1a1a")'));
		expect(result.warnings.map((w) => w.message).join()).toMatch(/« noir »/);
	});

	it('hex lisible, nom de palette, défaut #000000 (qui suit le texte) : aucun avertissement', () => {
		for (const color of ['#ff9900', 'rouge', 'blue', '#000000']) {
			const result = buildFigureScene(content(`A = point(1, 1, couleur="${color}")`));
			expect(result.warnings).toEqual([]);
		}
		expect(buildFigureScene(content('A = point(1, 1)')).warnings).toEqual([]);
	});

	it('un même hex sur plusieurs objets : un seul avertissement', () => {
		const result = buildFigureScene(
			content('A = point(1, 1, couleur="#000080")\nB = point(2, 2, couleur="#000080")')
		);
		expect(result.warnings).toHaveLength(1);
	});
});
