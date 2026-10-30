/**
 * Bloc ```cubes + `dessiner:` / `retrouver:` — analyse, réponses et jugement
 * (spécification : `docs/wip/solides-progress.md` § 7)
 */

import { describe, expect, it } from 'vitest';
import { findCubesToBuild, parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import {
	NOTHING_COLORED_CUBES,
	MISSING_HEIGHTS,
	drawingAnswer,
	drawingGridSize,
	drawingMistakes,
	expectedCubesAnswer,
	heightsAnswer,
	isCubesAnswerCorrect,
	isDrawingCorrect,
	isRetrouverCorrect,
	readDrawingAnswer,
	readHeightsAnswer,
	retrouverHasOtherSolutions,
	retrouverMistakes,
	viewGrid
} from '$lib/ubumark/utils/cubes-gestes';

const parse = (...lines: string[]) => parseEspaceContent(lines.join('\n'));
const messages = (...lines: string[]) => parse(...lines).errors.join(' | ');

const HEIGHTS = [
	[2, 1, 1],
	[1, 0, 1]
];

describe('dessiner: / retrouver: — analyse', () => {
	it('dessiner: face, case posée par le générateur', () => {
		const node = parse('hauteurs: 2 1 1 / 1 0 1', 'dessiner: face', 'case: 3');
		expect(node.errors).toEqual([]);
		expect(node.spec?.task).toEqual({ kind: 'dessiner', view: 'face' });
		expect(node.spec?.view).toBe('perspective');
		expect(node.caseIndex).toBe(3);
	});

	it('retrouver: face, droite (dessus toujours donnée)', () => {
		const node = parse('hauteurs: 2 1 1 / 1 0 1', 'retrouver: face, droite');
		expect(node.errors).toEqual([]);
		expect(node.spec?.task).toEqual({ kind: 'retrouver', views: ['face', 'droite'] });
	});

	it('sans geste : pas de task', () => {
		expect(parse('hauteurs: 1').spec?.task).toBeUndefined();
	});

	it('dessiner: et retrouver: ensemble : refusé', () => {
		expect(messages('hauteurs: 1', 'dessiner: face', 'retrouver: face')).toMatch(
			/dessiner: et retrouver: ne vont pas ensemble/
		);
	});

	it('un geste avec vue: : refusé', () => {
		expect(messages('hauteurs: 1', 'vue: face', 'dessiner: dessus')).toMatch(
			/vue: ne va pas avec dessiner:/
		);
		expect(messages('hauteurs: 1', 'vue: face', 'retrouver: face')).toMatch(
			/vue: ne va pas avec retrouver:/
		);
	});

	it('dessiner: perspective ou dessous : refusé, vues permises listées', () => {
		expect(messages('hauteurs: 1', 'dessiner: perspective')).toMatch(
			/dessus, face, droite, gauche/
		);
		expect(messages('hauteurs: 1', 'dessiner: dessous')).toMatch(/dessus, face, droite, gauche/);
	});

	it('retrouver: dessus, vide ou vue inconnue : refusé', () => {
		expect(messages('hauteurs: 1', 'retrouver: dessus')).toMatch(
			/vue de dessus est toujours donnée/
		);
		expect(messages('hauteurs: 1', 'retrouver:')).toMatch(/face, droite, gauche/);
		expect(messages('hauteurs: 1', 'retrouver: face, dessous')).toMatch(/face, droite, gauche/);
		expect(messages('hauteurs: 1', 'retrouver: face, face')).toMatch(/deux fois/);
	});

	it('case: sans geste : refusé ; case: non entière : refusée', () => {
		expect(messages('hauteurs: 1', 'case: 2')).toMatch(/case: sans objet/);
		expect(messages('hauteurs: 1', 'dessiner: face', 'case: x')).toMatch(/case/);
	});
});

describe('findCubesToBuild — repérage dans un énoncé', () => {
	it('un bloc à geste, pas un bloc d’affichage', () => {
		const statement = [
			'Dessine la vue de face.',
			'',
			'```cubes',
			'hauteurs: 1',
			'```',
			'',
			'```cubes',
			'hauteurs: 2 1',
			'dessiner: face',
			'```'
		].join('\n');
		const found = findCubesToBuild(statement);
		expect(found).toHaveLength(1);
		expect(found[0].startIndex).toBe(6);
		expect(found[0].body).toEqual(['hauteurs: 2 1', 'dessiner: face']);
		expect(found[0].closed).toBe(true);
		expect(found[0].nested).toBe(false);
	});

	it('bloc cité ou en retrait : nested', () => {
		const found = findCubesToBuild(
			['> ```cubes', '> hauteurs: 1', '> retrouver: face', '> ```'].join('\n')
		);
		expect(found[0].nested).toBe(true);
	});
});

describe('vues en grilles', () => {
	it('face de 2 1 1 / 1 0 1 : 3 colonnes 2, 1, 1, rangée du haut d’abord', () => {
		expect(viewGrid(HEIGHTS, 'face')).toEqual([
			[true, false, false],
			[true, true, true]
		]);
	});

	it('dessus : le trou devant-milieu', () => {
		expect(viewGrid(HEIGHTS, 'dessus')).toEqual([
			[true, true, true],
			[true, false, true]
		]);
	});

	it('droite : le devant à gauche ; gauche : le devant à droite', () => {
		expect(viewGrid(HEIGHTS, 'droite')).toEqual([
			[false, true],
			[true, true]
		]);
		expect(viewGrid(HEIGHTS, 'gauche')).toEqual([
			[true, false],
			[true, true]
		]);
	});
});

describe('dessiner: — quadrillage, réponse, jugement', () => {
	it('quadrillage = la vue agrandie d’un carreau de chaque côté', () => {
		expect(drawingGridSize(HEIGHTS, 'face')).toEqual({ rows: 4, cols: 5 });
		expect(drawingGridSize(HEIGHTS, 'droite')).toEqual({ rows: 4, cols: 4 });
	});

	it('réponse : rangées de 0 / 1 séparées par /, vide si rien colorié', () => {
		const grid = [
			[false, false, false],
			[false, true, false]
		];
		expect(drawingAnswer(grid)).toBe('000/010');
		expect(drawingAnswer([[false, false]])).toBe('');
		expect(readDrawingAnswer('000/010')).toEqual(grid);
		expect(readDrawingAnswer('')).toEqual([]);
		expect(readDrawingAnswer('01/0')).toBeNull();
		expect(readDrawingAnswer('0x')).toBeNull();
	});

	it('réponse attendue : la vue juste, sans marge', () => {
		const node = parse('hauteurs: 2 1 1 / 1 0 1', 'dessiner: face');
		expect(expectedCubesAnswer(node.spec!)).toBe('100/111');
	});

	it('juste à une translation près', () => {
		expect(isDrawingCorrect('00000/01000/01110/00000', '100/111')).toBe(true);
		expect(isDrawingCorrect('00000/00000/00100/00111', '100/111')).toBe(true);
		expect(isDrawingCorrect('100/111', '100/111')).toBe(true);
	});

	it('faux : autre vue, carreau de trop, rien colorié, illisible', () => {
		// la vue de droite à la place de la vue de face
		expect(isDrawingCorrect('0000/0010/0110/0000', '100/111')).toBe(false);
		expect(isDrawingCorrect('00000/01100/01110/00000', '100/111')).toBe(false);
		expect(isDrawingCorrect('', '100/111')).toBe(false);
		expect(isDrawingCorrect('n’importe quoi', '100/111')).toBe(false);
	});

	it('phrases de la correction', () => {
		expect(drawingMistakes('', 'face')).toEqual([NOTHING_COLORED_CUBES]);
		expect(drawingMistakes('0110', 'face')).toEqual([
			'Ce n’est pas la vue de face de l’assemblage.'
		]);
		expect(drawingMistakes('1', 'droite')).toEqual([
			'Ce n’est pas la vue de droite de l’assemblage.'
		]);
	});
});

describe('retrouver: — réponse, jugement', () => {
	it('réponse : écriture du bloc, - pour une case non remplie', () => {
		expect(
			heightsAnswer([
				[2, 1, null],
				[1, 0, 1]
			])
		).toBe('2 1 - / 1 0 1');
		expect(readHeightsAnswer('2 1 - / 1 0 1')).toEqual([
			[2, 1, null],
			[1, 0, 1]
		]);
		expect(readHeightsAnswer('2 1 / 1')).toBeNull();
		expect(readHeightsAnswer('2 x')).toBeNull();
		expect(readHeightsAnswer('7')).toBeNull();
	});

	it('réponse attendue : les vues jugées, puis l’assemblage du bloc', () => {
		const node = parse('hauteurs: 2 1 1 / 1 0 1', 'retrouver: face, droite');
		expect(expectedCubesAnswer(node.spec!)).toBe('face, droite : 2 1 1 / 1 0 1');
	});

	it('juste : l’assemblage du bloc, et un autre aux mêmes vues', () => {
		const expected = 'face, droite : 2 1 / 1 2';
		expect(isRetrouverCorrect('2 1 / 1 2', expected)).toBe(true);
		expect(isRetrouverCorrect('1 2 / 2 1', expected)).toBe(true);
		expect(isRetrouverCorrect('2 2 / 2 2', expected)).toBe(true);
	});

	it('faux : une vue différente, la vue de dessus changée, une case vide', () => {
		const expected = 'face, droite : 2 1 / 1 2';
		expect(isRetrouverCorrect('2 2 / 1 1', expected)).toBe(false);
		// une case à 0 change la vue de dessus
		expect(isRetrouverCorrect('2 0 / 1 2', 'face : 2 1 / 1 2')).toBe(false);
		expect(isRetrouverCorrect('2 - / 1 2', expected)).toBe(false);
		expect(isRetrouverCorrect('', expected)).toBe(false);
		expect(isRetrouverCorrect('2 1 2 / 1 2 1', expected)).toBe(false);
	});

	it('seules les vues listées comptent', () => {
		// vue de face seule : la vue de droite peut différer
		expect(isRetrouverCorrect('2 2 / 1 1', 'face : 2 1 / 1 2')).toBe(true);
	});

	it('phrases de la correction : une par vue fausse, case vide', () => {
		expect(retrouverMistakes('2 2 / 1 1', 'face, droite : 2 1 / 1 2')).toEqual([
			'Ton assemblage n’a pas la même vue de droite.'
		]);
		expect(retrouverMistakes('2 - / 1 2', 'face, droite : 2 1 / 1 2')).toEqual([MISSING_HEIGHTS]);
		expect(retrouverMistakes('', 'face, droite : 2 1 / 1 2')).toEqual([MISSING_HEIGHTS]);
	});

	it('d’autres réponses justes ?', () => {
		expect(
			retrouverHasOtherSolutions(
				[
					[2, 1],
					[1, 2]
				],
				['face', 'droite']
			)
		).toBe(true);
		// 1 1 / 1 1 : toutes les vues à 1, seule réponse
		expect(
			retrouverHasOtherSolutions(
				[
					[1, 1],
					[1, 1]
				],
				['face', 'droite']
			)
		).toBe(false);
		// une seule colonne, vue de face : la pile est fixée
		expect(retrouverHasOtherSolutions([[3]], ['face'])).toBe(false);
		// 2 1 / 1 1 avec face + droite : le 2 est seul à donner la hauteur 2
		expect(
			retrouverHasOtherSolutions(
				[
					[2, 1],
					[1, 1]
				],
				['face', 'droite']
			)
		).toBe(false);
		// la vue de face seule ne fixe pas la rangée de devant
		expect(
			retrouverHasOtherSolutions(
				[
					[2, 1],
					[1, 1]
				],
				['face']
			)
		).toBe(true);
	});

	it('aiguillage : isCubesAnswerCorrect lit le genre sur la réponse attendue', () => {
		expect(isCubesAnswerCorrect('00/10', '1')).toBe(true);
		expect(isCubesAnswerCorrect('1 2 / 2 1', 'face, droite : 2 1 / 1 2')).toBe(true);
	});
});
