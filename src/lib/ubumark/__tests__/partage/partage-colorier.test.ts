/**
 * Bloc ```partage + `colorier:` — analyse, réponse et jugement
 * (phase 0 : `docs/wip/fractions-a-colorier-progress.md` § 4 et 6)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import {
	findPartagesToColorier,
	hasPartageToColorier,
	parsePartageContent
} from '$lib/ubumark/parser/partage-parser';
import {
	coloredAnswer,
	coloringMistakes,
	expectedColoringAnswer,
	isColoringCorrect,
	ranksOfAnswer
} from '$lib/ubumark/utils/partage-colorier';
import { generatePartageTypst } from '$lib/ubumark/generators/partage-typst';
import type { PartageNode } from '$lib/ubumark/types/partage';

const parse = (...lines: string[]) => parsePartageContent(lines.join('\n'));
const messages = (...lines: string[]) => parse(...lines).errors.join(' | ');

describe('colorier: — analyse', () => {
	it('bande de 8, 3/8 : 3 parts à colorier, aucune part grise', () => {
		const node = parse('forme: bande 8', 'colorier: 3/8');
		expect(node.errors).toEqual([]);
		expect(node.spec?.gray).toEqual([]);
		expect(node.spec?.colorier).toEqual({ num: 3, den: 8, parts: 3 });
	});

	it('fraction équivalente : 1/2 sur une bande de 4 = 2 parts', () => {
		expect(parse('forme: bande 4', 'colorier: 1/2').spec?.colorier).toEqual({
			num: 1,
			den: 2,
			parts: 2
		});
	});

	it('espaces tolérés, case posée par le générateur', () => {
		const node = parse('forme: grille 10×10', 'colorier: 37 / 100', 'case: 2');
		expect(node.errors).toEqual([]);
		expect(node.spec?.colorier?.parts).toBe(37);
		expect(node.caseIndex).toBe(2);
	});

	it('fraction égale à 1 : toute la figure', () => {
		expect(parse('forme: bande 4', 'colorier: 4/4').spec?.colorier?.parts).toBe(4);
	});

	it('gris: et colorier: ensemble : refusé', () => {
		expect(messages('forme: bande 8', 'gris: 2', 'colorier: 3/8')).toMatch(
			/gris: et colorier: ne vont pas ensemble/
		);
	});

	it('fraction mal écrite : refusée', () => {
		expect(messages('forme: bande 8', 'colorier: trois huitièmes')).toMatch(/colorier.*3\/8/);
		expect(messages('forme: bande 8', 'colorier: 3')).toMatch(/colorier/);
		expect(messages('forme: bande 8', 'colorier: 3/0')).toMatch(/dénominateur/);
	});

	it('fraction > 1 : plusieurs figures, pas encore disponible', () => {
		expect(messages('forme: bande 4', 'colorier: 5/4')).toMatch(/plusieurs figures.*unites:/);
	});

	it('0 part : refusé (rien à colorier)', () => {
		expect(messages('forme: bande 4', 'colorier: 0/4')).toMatch(/rien à colorier/);
	});

	it('fraction qui ne tombe pas juste sur le partage : refusée', () => {
		expect(messages('forme: bande 8', 'colorier: 1/3')).toMatch(/1\/3 ne tombe pas juste.*8 parts/);
	});

	it('case: sans colorier: : sans objet', () => {
		expect(messages('forme: bande 8', 'case: 0')).toMatch(/case: sans objet/);
	});

	it('le bloc dans un document : nœud partage avec sa spec', () => {
		const doc = parseMarkdown(['```partage', 'forme: bande 8', 'colorier: 3/8', '```'].join('\n'));
		const node = doc.children.find((c) => c.type === 'partage') as PartageNode;
		expect(node.spec?.colorier?.parts).toBe(3);
	});
});

describe('colorier: — repérage dans un énoncé', () => {
	const statement = ['Colorie.', '', '```partage', 'forme: bande 8', 'colorier: 3/8', '```'].join(
		'\n'
	);
	it('hasPartageToColorier / findPartagesToColorier', () => {
		expect(hasPartageToColorier(statement)).toBe(true);
		expect(hasPartageToColorier('```partage\nforme: bande 8\ngris: 3\n```')).toBe(false);
		const [found] = findPartagesToColorier(statement);
		expect(found).toMatchObject({ startIndex: 2, closed: true, nested: false });
		expect(found.body).toEqual(['forme: bande 8', 'colorier: 3/8']);
	});

	it('bloc cité : signalé nested', () => {
		const [found] = findPartagesToColorier('> ```partage\n> colorier: 1/2\n> ```');
		expect(found.nested).toBe(true);
	});
});

describe('réponse de l’élève : les rangs coloriés', () => {
	it('écriture : triée, séparée par « , »', () => {
		expect(coloredAnswer([4, 1, 6])).toBe('1, 4, 6');
		expect(coloredAnswer([])).toBe('');
	});

	it('lecture : rangs distincts dans la figure', () => {
		expect(ranksOfAnswer('1, 4, 6', 8)).toEqual([1, 4, 6]);
		expect(ranksOfAnswer('', 8)).toEqual([]);
		expect(ranksOfAnswer('9', 8)).toBeNull();
		expect(ranksOfAnswer('1, 1', 8)).toBeNull();
		expect(ranksOfAnswer('a', 8)).toBeNull();
	});
});

describe('jugement : la part coloriée vaut la fraction', () => {
	const spec = (...lines: string[]) => parse(...lines).spec!;

	it('réponse attendue : parts à colorier sur total', () => {
		expect(expectedColoringAnswer(spec('forme: bande 8', 'colorier: 3/8'))).toBe('3/8');
		expect(expectedColoringAnswer(spec('forme: bande 4', 'colorier: 1/2'))).toBe('2/4');
	});

	it('3 parts quelconques de 8 pour 3/8', () => {
		expect(isColoringCorrect('1, 2, 3', '3/8')).toBe(true);
		expect(isColoringCorrect('2, 5, 8', '3/8')).toBe(true);
	});

	it('2 parts sur 4 : juste pour 1/2', () => {
		expect(isColoringCorrect('1, 4', '2/4')).toBe(true);
	});

	it('mauvais nombre de parts, rien, illisible : faux', () => {
		expect(isColoringCorrect('1, 2', '3/8')).toBe(false);
		expect(isColoringCorrect('1, 2, 3, 4', '3/8')).toBe(false);
		expect(isColoringCorrect('', '3/8')).toBe(false);
		expect(isColoringCorrect('1, 2, 99', '3/8')).toBe(false);
	});

	it('phrases de la correction', () => {
		const s = spec('forme: bande 8', 'colorier: 3/8');
		expect(coloringMistakes(2, s)).toEqual([
			'Tu as colorié 2 parts sur 8 ; il fallait en colorier 3 (3/8).'
		]);
		expect(coloringMistakes(1, s)[0]).toBe(
			'Tu as colorié 1 part sur 8 ; il fallait en colorier 3 (3/8).'
		);
		expect(coloringMistakes(0, s)).toEqual(['Tu n’as rien colorié.']);
	});
});

describe('PDF : la figure à colorier au crayon', () => {
	it('figure vide par défaut, figure juste au corrigé', () => {
		const node = parse('forme: bande 8', 'colorier: 3/8');
		const grey = (out: string) => (out.match(/fill: luma\(/g) ?? []).length;
		expect(grey(generatePartageTypst(node))).toBe(0);
		expect(grey(generatePartageTypst(node, { solved: true }))).toBe(3);
	});
});
