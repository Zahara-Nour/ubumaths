/**
 * Bloc ```partage + `unites:` — plusieurs figures, fractions > 1
 * (phase 0 : `docs/wip/fractions-a-colorier-progress.md` § 9)
 */

import { describe, expect, it } from 'vitest';
import { parsePartageContent } from '$lib/ubumark/parser/partage-parser';
import { buildPartageScenes, partageFigureLabel } from '$lib/ubumark/utils/partage-scene';
import {
	coloringMistakes,
	expectedColoringAnswer,
	isColoringCorrect
} from '$lib/ubumark/utils/partage-colorier';
import { generatePartageTypst } from '$lib/ubumark/generators/partage-typst';
import { partageSpecTotal, type PartageSpec } from '$lib/ubumark/types/partage';

const parse = (...lines: string[]) => parsePartageContent(lines.join('\n'));
const messages = (...lines: string[]) => parse(...lines).errors.join(' | ');

function specOf(...lines: string[]): PartageSpec {
	const { spec, errors } = parse(...lines);
	expect(errors).toEqual([]);
	return spec as PartageSpec;
}

describe('unites: — analyse', () => {
	it('sans unites: : une figure', () => {
		expect(specOf('forme: bande 8').units).toBe(1);
	});

	it('unites: 3 : trois figures, parts comptées sur l’ensemble', () => {
		const spec = specOf('forme: bande 4', 'unites: 3');
		expect(spec.units).toBe(3);
		expect(partageSpecTotal(spec)).toBe(12);
	});

	it('gris: 7 sur deux bandes de 4 : la première pleine, 3 parts de la seconde', () => {
		expect(specOf('forme: bande 4', 'unites: 2', 'gris: 7').gray).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it('gris: des rangs sur plusieurs figures', () => {
		expect(specOf('forme: bande 4', 'unites: 3', 'gris: 1, 2, 5, 9').gray).toEqual([1, 2, 5, 9]);
	});

	it('colorier: 7/4 sur deux bandes de 4 : 7 parts', () => {
		expect(specOf('forme: bande 4', 'unites: 2', 'colorier: 7/4').colorier).toEqual({
			num: 7,
			den: 4,
			parts: 7
		});
	});

	it('plus de figures que nécessaire : permis (figure à laisser vide)', () => {
		expect(specOf('forme: bande 4', 'unites: 3', 'colorier: 7/4').colorier?.parts).toBe(7);
	});

	it('fraction équivalente sur plusieurs figures : 3/2 sur des bandes de 4 = 6 parts', () => {
		expect(specOf('forme: bande 4', 'unites: 2', 'colorier: 3/2').colorier?.parts).toBe(6);
	});

	it('grille 10 × 10 et unites: 2 : 137/100 = 137 parts', () => {
		expect(specOf('forme: grille 10×10', 'unites: 2', 'colorier: 137/100').colorier?.parts).toBe(
			137
		);
	});

	it('unites: 1 écrit : une figure, comme sans la clé', () => {
		expect(specOf('forme: bande 8', 'unites: 1', 'colorier: 3/8').units).toBe(1);
	});
});

describe('unites: — messages au prof', () => {
	it('fraction > 1 sans unites: : le nombre de figures qu’il faut', () => {
		expect(messages('forme: bande 4', 'colorier: 7/4')).toMatch(
			/7\/4 dépasse 1 : ajoute unites: 2/
		);
		expect(messages('forme: bande 4', 'colorier: 11/4')).toMatch(/ajoute unites: 3/);
	});

	it('unites: trop petit : le nombre qu’il faut', () => {
		expect(messages('forme: bande 4', 'unites: 2', 'colorier: 11/4')).toMatch(
			/11\/4 demande 3 figures : écris unites: 3 \(ou plus\)/
		);
	});

	it('fraction qui demanderait plus de 5 figures : le plafond', () => {
		expect(messages('forme: bande 4', 'unites: 5', 'colorier: 21/4')).toMatch(
			/demande 6 figures : au plus 5/
		);
	});

	it('gris: au-delà des figures : le nombre de figures qu’il faut', () => {
		expect(messages('forme: bande 4', 'gris: 7')).toMatch(
			/la figure n’a que 4 parts : écris unites: 2/
		);
		expect(messages('forme: bande 4', 'unites: 2', 'gris: 1, 11')).toMatch(
			/la part 11 n’existe pas \(les 2 figures ont 8 parts.*écris unites: 3/
		);
	});

	it('unites: hors bornes ou illisible', () => {
		expect(messages('forme: bande 4', 'unites: 0')).toMatch(/unites: 0 : de 1 à 5 figures/);
		expect(messages('forme: bande 4', 'unites: 6')).toMatch(/unites: 6 : de 1 à 5 figures/);
		expect(messages('forme: bande 4', 'unites: deux')).toMatch(/nombre de figures/);
	});

	it('la fraction qui ne tombe pas juste reste dite d’abord', () => {
		expect(messages('forme: bande 4', 'unites: 2', 'colorier: 4/3')).toMatch(/ne tombe pas juste/);
	});
});

describe('unites: — scènes', () => {
	it('une scène par figure, rangs à la suite', () => {
		const scenes = buildPartageScenes(specOf('forme: bande 4', 'unites: 3', 'gris: 6'));
		expect(scenes).toHaveLength(3);
		expect(scenes.map((s) => s.parts.map((p) => p.rank))).toEqual([
			[1, 2, 3, 4],
			[5, 6, 7, 8],
			[9, 10, 11, 12]
		]);
		expect(scenes.map((s) => s.parts.filter((p) => p.shaded).length)).toEqual([4, 2, 0]);
		// Mêmes figures : mêmes polygones
		expect(scenes[1].parts.map((p) => p.points)).toEqual(scenes[0].parts.map((p) => p.points));
	});

	it('nom accessible : la forme, et « figure 2 sur 3 » quand il y en a plusieurs', () => {
		expect(partageFigureLabel(specOf('forme: bande 4'), 0)).toBe('Bande partagée en parts égales');
		expect(partageFigureLabel(specOf('forme: bande 4', 'unites: 3'), 1)).toBe(
			'Bande partagée en parts égales, figure 2 sur 3'
		);
	});
});

describe('unites: — réponse et jugement', () => {
	const spec = specOf('forme: bande 4', 'unites: 3', 'colorier: 7/4');

	it('réponse attendue : parts à colorier / parts d’une figure', () => {
		expect(expectedColoringAnswer(spec)).toBe('7/4');
	});

	it('7 parts quelconques des trois figures : juste', () => {
		expect(isColoringCorrect('1, 2, 3, 4, 5, 6, 7', '7/4')).toBe(true);
		expect(isColoringCorrect('1, 2, 5, 6, 9, 10, 11', '7/4')).toBe(true);
	});

	it('mauvais nombre de parts : faux', () => {
		expect(isColoringCorrect('1, 2, 3, 4, 5', '7/4')).toBe(false);
		expect(isColoringCorrect('1, 2, 3, 4, 5, 6, 7, 8', '7/4')).toBe(false);
	});

	it('rang au-delà de cinq figures : illisible, faux', () => {
		expect(isColoringCorrect('1, 2, 3, 4, 5, 6, 21', '7/4')).toBe(false);
	});

	it('phrase de la correction : sans « sur N », avec les parts d’une figure', () => {
		expect(coloringMistakes(5, spec)).toEqual([
			'Tu as colorié 5 parts ; il fallait en colorier 7 (7/4, chaque figure a 4 parts).'
		]);
		expect(coloringMistakes(0, spec)).toEqual(['Tu n’as rien colorié.']);
	});
});

describe('unites: — PDF', () => {
	it('une boîte par figure, séparées', () => {
		const out = generatePartageTypst(parse('forme: bande 4', 'unites: 3', 'gris: 6'));
		expect(out.match(/#box\(/g)).toHaveLength(3);
		expect(out.match(/#h\(/g)).toHaveLength(2);
		expect(out.match(/fill: luma\(/g)).toHaveLength(6);
	});

	it('figure à colorier : vide ; corrigé : les unités pleines d’abord', () => {
		const node = parse('forme: bande 4', 'unites: 3', 'colorier: 7/4');
		const grey = (out: string) => (out.match(/fill: luma\(/g) ?? []).length;
		expect(grey(generatePartageTypst(node))).toBe(0);
		const solved = generatePartageTypst(node, { solved: true });
		expect(grey(solved)).toBe(7);
		// Troisième figure : aucune part grisée
		expect(grey(solved.split('#h(')[2])).toBe(0);
	});

	it('une seule figure : pas de séparateur', () => {
		expect(generatePartageTypst(parse('forme: bande 8', 'gris: 3'))).not.toMatch(/#h\(/);
	});
});
