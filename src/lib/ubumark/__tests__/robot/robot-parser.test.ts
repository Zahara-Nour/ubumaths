/**
 * Bloc ```robot : parseur et réponse attendue (chantier `suite-fleches`)
 */

import { describe, it, expect } from 'vitest';
import {
	findRobotsToProduce,
	hasRobotToProduce,
	parseRobotContent
} from '#lib/ubumark/parser/robot-parser.ts';
import {
	expectedRobotAnswer,
	readExpectedRobotAnswer,
	robotAnswerVerdict,
	ROBOT_AILLEURS,
	ROBOT_INTERDITE,
	ROBOT_SORTIE
} from '#lib/ubumark/utils/robot-answer.ts';
import { ecrireCode } from '#lib/ubumark/utils/robot-moteur.ts';

const bloc = (...lignes: string[]) => lignes.join('\n');

const QUESTION = bloc('quadrillage: 8 x 5', 'départ: 2, 1', 'arrivée: 6, 4', 'produire: oui');

function messages(source: string): string {
	return parseRobotContent(source)
		.errors.map((e) => e.message)
		.join(' ; ');
}

describe('parseRobotContent', () => {
	it('question en flèches : scène et code le plus court', () => {
		const node = parseRobotContent(QUESTION);
		expect(node.errors).toEqual([]);
		expect(node.spec).toMatchObject({
			colonnes: 8,
			lignes: 5,
			codage: 'flèches',
			depart: { col: 2, ligne: 1 },
			sens: null,
			arrivee: { col: 6, ligne: 4 },
			interdites: [],
			produire: true
		});
		expect(node.spec?.solution).toHaveLength(7);
	});

	it('avance-pivote, cases grises, clés sans accents', () => {
		const node = parseRobotContent(
			bloc(
				'quadrillage: 8 x 5',
				'codage: avance-pivote',
				'depart: 2, 1, droite',
				'arrivee: 6, 4',
				'interdites: 4, 1 ; 4, 2',
				'produire: oui'
			)
		);
		expect(node.errors).toEqual([]);
		expect(node.spec?.sens).toBe('droite');
		expect(node.spec?.interdites).toEqual([
			{ col: 4, ligne: 1 },
			{ col: 4, ligne: 2 }
		]);
		expect(ecrireCode(node.spec!.solution!, 'avance-pivote')).not.toMatch(/^avance de 4/);
	});

	it('affichage seul : sans arrivée, sans solution', () => {
		const node = parseRobotContent(bloc('quadrillage: 6 x 4', 'départ: 1, 1'));
		expect(node.errors).toEqual([]);
		expect(node.spec?.produire).toBe(false);
		expect(node.spec?.arrivee).toBeNull();
		expect(node.spec?.solution).toBeNull();
	});

	it('interdites: point-virgule final toléré', () => {
		const node = parseRobotContent(
			bloc('quadrillage: 8 x 5', 'départ: 1, 1', 'interdites: 2, 1 ;')
		);
		expect(node.errors).toEqual([]);
		expect(node.spec?.interdites).toEqual([{ col: 2, ligne: 1 }]);
	});

	it('case: posée par le générateur', () => {
		expect(parseRobotContent(bloc('case: 0', QUESTION)).caseIndex).toBe(0);
	});

	it.each([
		[bloc('départ: 1, 1'), /il manque la ligne quadrillage/],
		[bloc('quadrillage: 8 x 5'), /il manque la ligne départ/],
		[bloc('quadrillage: 13 x 5', 'départ: 1, 1'), /de 2 à 12/],
		[bloc('quadrillage: 1 x 5', 'départ: 1, 1'), /de 2 à 12/],
		[bloc('quadrillage: huit', 'départ: 1, 1'), /colonnes x lignes/],
		[bloc('quadrillage: 8 x 5', 'départ: 9, 1'), /départ \(9, 1\) hors du quadrillage/],
		[bloc('quadrillage: 8 x 5', 'départ: 1, 1', 'arrivée: 1, 6'), /arrivée \(1, 6\) hors/],
		[
			bloc('quadrillage: 8 x 5', 'départ: 1, 1', 'interdites: 1, 1'),
			/départ est sur une case grise/
		],
		[
			bloc('quadrillage: 8 x 5', 'départ: 1, 1', 'arrivée: 2, 2', 'interdites: 2, 2'),
			/arrivée est sur une case grise/
		],
		[bloc('quadrillage: 8 x 5', 'départ: 1, 1', 'arrivée: 1, 1'), /l’arrivée est le départ/],
		[bloc('quadrillage: 8 x 5', 'départ: 1, 1', 'produire: oui'), /demande une arrivée/],
		[bloc('quadrillage: 8 x 5', 'codage: tortue', 'départ: 1, 1'), /codage « tortue »/],
		[
			bloc('quadrillage: 8 x 5', 'codage: avance-pivote', 'départ: 1, 1'),
			/écris aussi le sens du robot/
		],
		[
			bloc('quadrillage: 8 x 5', 'codage: avance-pivote', 'départ: 1, 1, nord'),
			/sens « nord » inconnu/
		],
		[bloc('quadrillage: 8 x 5', 'départ: 1, 1, droite'), /le sens ne sert qu'en codage/],
		[bloc('quadrillage: 8 x 5', 'départ: 1, 1', 'couleur: rouge'), /clé « couleur » inconnue/],
		[bloc('quadrillage: 8 x 5', 'départ: 1, 1', 'départ: 2, 2'), /déjà donnée ligne 2/],
		[bloc('quadrillage: 8 x 5', 'départ: 1, 1', 'produire: peut-être'), /choisis oui ou non/],
		[bloc('quadrillage: 8 x 5', 'départ: 1, 1', 'case: 0'), /case: seulement avec produire: oui/],
		[
			bloc(
				'quadrillage: 8 x 5',
				'départ: 1, 1',
				'arrivée: 8, 5',
				'interdites: 7, 5 ; 8, 4',
				'produire: oui'
			),
			/aucun code de 15 instructions et 4 virages au plus/
		]
	])('refusé : %s', (source, attendu) => {
		const node = parseRobotContent(source);
		expect(node.spec).toBeNull();
		expect(messages(source)).toMatch(attendu);
	});
});

describe('findRobotsToProduce', () => {
	it('seuls les blocs à produire portent une case', () => {
		const md = [
			'```robot',
			'quadrillage: 4 x 4',
			'départ: 1, 1',
			'```',
			'',
			'```robot',
			QUESTION,
			'```'
		].join('\n');
		const found = findRobotsToProduce(md);
		expect(found).toHaveLength(1);
		expect(found[0].startIndex).toBe(5);
		expect(hasRobotToProduce(md)).toBe(true);
		expect(hasRobotToProduce('```robot\nquadrillage: 4 x 4\ndépart: 1, 1\n```')).toBe(false);
	});
});

describe('réponse attendue et juge', () => {
	const spec = parseRobotContent(
		bloc('quadrillage: 8 x 5', 'départ: 2, 1', 'arrivée: 6, 4', 'interdites: 4, 1', 'produire: oui')
	).spec!;
	const attendu = expectedRobotAnswer(spec, spec.solution!);

	it('scène + code, relue à l’identique', () => {
		expect(attendu).toMatch(/^flèches 8x5 2,1 6,4 4,1 \| /);
		const lu = readExpectedRobotAnswer(attendu);
		expect(lu?.scene).toEqual({
			colonnes: 8,
			lignes: 5,
			codage: 'flèches',
			depart: { col: 2, ligne: 1 },
			sens: null,
			arrivee: { col: 6, ligne: 4 },
			interdites: [{ col: 4, ligne: 1 }]
		});
		expect(lu?.solution).toBe(ecrireCode(spec.solution!, 'flèches'));
	});

	it('avance-pivote : le sens fait partie du départ', () => {
		const s = parseRobotContent(
			bloc(
				'quadrillage: 8 x 5',
				'codage: avance-pivote',
				'départ: 2, 1, droite',
				'arrivée: 6, 4',
				'produire: oui'
			)
		).spec!;
		const e = expectedRobotAnswer(s, s.solution!);
		expect(e).toBe('avance-pivote 8x5 2,1,droite 6,4 | avance de 4, pivote à gauche, avance de 3');
		expect(readExpectedRobotAnswer(e)?.scene.sens).toBe('droite');
		expect(
			robotAnswerVerdict('pivote à gauche, avance de 3, pivote à droite, avance de 4', e)
		).toEqual({
			juste: true
		});
	});

	it('tout code qui finit sur l’arrivée est juste', () => {
		expect(robotAnswerVerdict('↑ ↑ ↑ → → → →', attendu)).toEqual({ juste: true });
		expect(robotAnswerVerdict('↑ → ↑ → ↑ → →', attendu)).toEqual({ juste: true });
		// Détour : juste aussi
		expect(robotAnswerVerdict('↑ ↑ ↑ ↑ → → → → ↓', attendu)).toEqual({ juste: true });
	});

	it('faux, avec la raison', () => {
		expect(robotAnswerVerdict('↓', attendu)).toEqual({ juste: false, message: ROBOT_SORTIE });
		expect(robotAnswerVerdict('→ →', attendu)).toEqual({ juste: false, message: ROBOT_INTERDITE });
		expect(robotAnswerVerdict('↑ ↑ ↑', attendu)).toEqual({ juste: false, message: ROBOT_AILLEURS });
		expect(robotAnswerVerdict('→ x', attendu)).toEqual({
			juste: false,
			message: 'Instruction inconnue : « x ».'
		});
		expect(robotAnswerVerdict(Array(16).fill('↑').join(' '), attendu)).toEqual({
			juste: false,
			message: '15 instructions au plus.'
		});
	});

	it('code vide ou attente illisible : faux, sans message', () => {
		expect(robotAnswerVerdict('', attendu)).toEqual({ juste: false });
		expect(robotAnswerVerdict('→', 'n’importe quoi')).toEqual({ juste: false });
		expect(readExpectedRobotAnswer('flèches 8x5 2,1,droite 6,4 | →')).toBeNull();
		expect(readExpectedRobotAnswer('avance-pivote 8x5 2,1 6,4 | →')).toBeNull();
	});
});
