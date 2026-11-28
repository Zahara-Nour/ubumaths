/**
 * Droite à graduer (` ```line ` + `graduer:`, outil n° 61) : parseur, calcul pur,
 * PDF (`unite:`) — phase 0 : `docs/wip/outil-graduer-segment-progress.md`
 *
 * L'élève partage lui-même chaque intervalle de `step` en n parts égales (− / +),
 * puis pose les points de `placer:` sur SES graduations. Une case pour le nombre
 * de parts (`3`), puis une par point ; chaque point est jugé sur sa valeur.
 */

import { describe, it, expect } from 'vitest';
import {
	findLinesToPlace,
	hasLineToPlace,
	parseNumberLineContent
} from '#lib/ubumark/parser/number-line-parser.ts';
import {
	graduerCaseCount,
	graduerConfig,
	graduerPointAnswer,
	graduerSolutionNode,
	MAX_PARTS,
	partsAnswer,
	partsMistake,
	partsOfAnswer
} from '#lib/ubumark/utils/number-line-graduer.ts';
import {
	graduationCount,
	indexOfValue,
	placerAnswer,
	placerText
} from '#lib/ubumark/utils/number-line-placer.ts';
import { computeGraduations, numVal } from '#lib/ubumark/utils/number-line-render.ts';
import { generateNumberLineTypst } from '#lib/ubumark/generators/number-line-typst.ts';

const LINE = ['start: 0', 'end: 2', 'step: 1'];
const parse = (...lines: string[]) => parseNumberLineContent(lines);
const messages = (...lines: string[]) =>
	parse(...lines)
		.errors.map((e) => e.message)
		.join(' ');
const nodeOf = (...lines: string[]) => {
	const { node, errors } = parse(...lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node;
};

describe('parseur : graduer:', () => {
	it('graduer: 3 et placer: A=5/3 lus ; la droite garde son pas', () => {
		const node = nodeOf(...LINE, 'graduer: 3', 'placer: A=5/3');
		expect(node.graduer).toEqual({ parts: 3 });
		expect(node.placer?.map((t) => [t.name, numVal(t.value)])).toEqual([['A', 5 / 3]]);
		expect(numVal(node.config.step)).toBe(1);
	});

	it('graduer: sans placer: permis, et case: lue', () => {
		const node = nodeOf('case: 4', ...LINE, 'graduer: 4');
		expect(node.graduer).toEqual({ parts: 4 });
		expect(node.placer).toBeUndefined();
		expect(node.caseIndex).toBe(4);
	});

	it('graduer: hors de 2..12 ou non entier → refusé', () => {
		for (const written of ['1', '13', '2.5', 'trois', '']) {
			expect(messages(...LINE, `graduer: ${written}`)).toMatch(/graduer.*entier de 2 à 12/);
		}
	});

	it('point de placer: hors de la grille step/d → refusé', () => {
		expect(messages(...LINE, 'graduer: 3', 'placer: 5/4')).toMatch(
			/placer.*n’est pas sur une graduation/
		);
		expect(messages(...LINE, 'graduer: 3', 'placer: 7/3')).toMatch(/placer.*hors de la droite/);
	});

	it('point juste sur la grille fine, pas sur celle de step : accepté', () => {
		expect(parse(...LINE, 'graduer: 4', 'placer: A=3/4 ; B=3/2').errors).toEqual([]);
	});

	it('graduer: avec points:, representer:, segments:, scale: log → refusé', () => {
		expect(messages(...LINE, 'graduer: 3', 'points: B=1')).toMatch(/graduer.*points:/);
		expect(messages(...LINE, 'graduer: 3', 'representer: [1, +inf[')).toMatch(
			/graduer.*representer:/
		);
		expect(messages(...LINE, 'graduer: 3', 'segments: [0, 1]')).toMatch(/graduer.*segments:/);
		expect(messages('start: 1', 'end: 100', 'step: 1', 'scale: log', 'graduer: 3')).toMatch(
			/graduer.*log/
		);
	});

	it('trop de graduations une fois partagée → refusé', () => {
		expect(messages('start: 0', 'end: 100', 'step: 1', 'graduer: 10')).toMatch(
			/graduer.*graduations/
		);
	});

	it('graduer: ? (énoncé envoyé) : nombre de parts inconnu, geste gardé', () => {
		const node = nodeOf(...LINE, 'graduer: ?', 'placer: A=?');
		expect(node.graduer).toEqual({ parts: null });
		expect(node.placer).toHaveLength(1);
	});

	it('findLinesToPlace trouve une droite à graduer, même sans placer:', () => {
		const statement = ['Partage.', '', '```line', ...LINE, 'graduer: 4', '```'].join('\n');
		expect(findLinesToPlace(statement)).toHaveLength(1);
		expect(hasLineToPlace(statement)).toBe(true);
	});
});

describe('parseur : unite: (PDF)', () => {
	it('unite: 6 cm lue, aussi sans graduer:', () => {
		expect(nodeOf(...LINE, 'unite: 6 cm').unitCm).toBe(6);
		expect(nodeOf(...LINE, 'unite: 2,5 cm').unitCm).toBe(2.5);
		expect(nodeOf(...LINE, 'unite: 4.5cm').unitCm).toBe(4.5);
	});

	it('unité illisible → refusé', () => {
		for (const written of ['6', 'six cm', '0 cm', '-2 cm']) {
			expect(messages(...LINE, `unite: ${written}`)).toMatch(/unite.*en cm/);
		}
	});

	it('droite trop longue pour la page → refusé', () => {
		expect(messages(...LINE, 'unite: 9 cm')).toMatch(/unite.*18 cm.*17 cm au plus/);
		expect(parse(...LINE, 'unite: 8.5 cm').errors).toEqual([]);
	});
});

describe('calcul pur : graduerConfig', () => {
	const C = nodeOf(...LINE).config;

	it('n parts : pas step/n, grandes graduations sur celles de step', () => {
		const fine = graduerConfig(C, 3);
		expect(numVal(fine.step)).toBeCloseTo(1 / 3);
		expect(graduationCount(fine)).toBe(7);
		const labelled = computeGraduations(fine).filter((g) => g.label !== null);
		expect(labelled.map((g) => Math.round(g.value * 1e9) / 1e9)).toEqual([0, 1, 2]);
		expect(computeGraduations(fine).filter((g) => g.isMajor)).toHaveLength(3);
	});

	it('une part : la droite telle quelle', () => {
		expect(graduerConfig(C, 1)).toBe(C);
	});

	it('les graduations de l’élève se lisent en fraction de ses parts', () => {
		expect(placerText(graduerConfig(C, 3), 5)).toBe('5/3');
		expect(placerText(graduerConfig(C, 6), 10)).toBe('10/6');
		expect(placerText(graduerConfig(C, 3), 3)).toBe('1');
	});

	it('réponse d’un point : sa valeur, la même écriture quel que soit le partage', () => {
		expect(placerAnswer(graduerConfig(C, 6), 10)).toBe('\\frac{5}{3}');
		expect(graduerPointAnswer(C, 3, 5 / 3)).toBe('\\frac{5}{3}');
		expect(graduerPointAnswer(C, 3, 5 / 4)).toBeNull();
		expect(indexOfValue(graduerConfig(C, 6), 5 / 3)).toBe(10);
	});

	it('pas décimal partagé : graduations en fraction', () => {
		const half = nodeOf('start: 0', 'end: 1', 'step: 0.5').config;
		expect(placerText(graduerConfig(half, 2), 3)).toBe('3/4');
	});
});

describe('calcul pur : la case des parts', () => {
	it('réponse = le nombre de parts', () => {
		expect(partsAnswer(3)).toBe('3');
		expect(partsOfAnswer('3')).toBe(3);
		expect(partsOfAnswer(' 12 ')).toBe(12);
		expect(partsOfAnswer('')).toBeNull();
		expect(partsOfAnswer(String(MAX_PARTS + 1))).toBeNull();
		expect(partsOfAnswer('2.5')).toBeNull();
	});

	it('nombre de cases : une pour les parts, une par point', () => {
		expect(graduerCaseCount(nodeOf(...LINE, 'graduer: 3', 'placer: A=1/3 ; B=5/3'))).toBe(3);
		expect(graduerCaseCount(nodeOf(...LINE, 'graduer: 3'))).toBe(1);
	});

	it('phrases de la correction', () => {
		expect(partsMistake(4, 3)).toBe('Tu as partagé l’unité en 4 parts ; il en fallait 3.');
		expect(partsMistake(1, 3)).toBe(
			'Tu n’as pas partagé l’unité ; il fallait la partager en 3 parts.'
		);
		expect(partsMistake(null, 3)).toBe(
			'Tu n’as pas partagé l’unité ; il fallait la partager en 3 parts.'
		);
		expect(partsMistake(4, null)).toBe('Tu as partagé l’unité en 4 parts.');
	});

	it('droite juste : d parts, points en vert, sans geste', () => {
		const solution = graduerSolutionNode(nodeOf(...LINE, 'graduer: 3', 'placer: A=5/3'));
		expect(solution).not.toBeNull();
		expect(numVal(solution!.config.step)).toBeCloseTo(1 / 3);
		expect(solution!.graduer).toBeUndefined();
		expect(solution!.placer).toBeUndefined();
		expect(solution!.points).toMatchObject([{ label: 'A', color: 'vert' }]);
		expect(graduerSolutionNode(nodeOf(...LINE, 'graduer: ?'))).toBeNull();
	});
});

describe('PDF : unite: et graduer:', () => {
	/** Nombre de traits de graduation dessinés */
	const ticks = (typst: string) =>
		typst
			.split('// Graduations')[1]
			.split('\n')
			.filter((line) => line.trim().startsWith('line(')).length;

	it('unite: 6 cm → droite de 12 cm, jamais réduite', () => {
		const typst = generateNumberLineTypst(nodeOf(...LINE, 'unite: 6 cm'));
		expect(typst).toContain('line((0, 0), (12, 0))');
		expect(typst).not.toContain('scale(');
	});

	it('unite: 3 cm de 0 à 2 → 6 cm', () => {
		const typst = generateNumberLineTypst(nodeOf(...LINE, 'unite: 3 cm'));
		expect(typst).toContain('line((0, 0), (6, 0))');
	});

	it('graduer: sans graduations intermédiaires (l’élève partage au guide-âne)', () => {
		const typst = generateNumberLineTypst(
			nodeOf(...LINE, 'graduer: 3', 'placer: A=5/3', 'unite: 6 cm')
		);
		expect(ticks(typst)).toBe(3);
		expect(typst).not.toContain('circle(');
	});

	it('sans unite: la droite reste réduite à la colonne', () => {
		expect(generateNumberLineTypst(nodeOf(...LINE))).toContain('scale(');
	});
});
