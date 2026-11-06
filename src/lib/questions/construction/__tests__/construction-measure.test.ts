/**
 * Case « figure » : mesurer un angle au rapporteur (`verifier: mesure AOB`,
 * chantier `controles-figure`, lot 6, phase 0 validée par David le 2026-11-03,
 * `docs/archive/wip/controles-figure-progress.md` § 19).
 *
 * L'angle est tracé ; l'élève pose le rapporteur (jamais noté) et tape la mesure
 * sous la figure (`mesure(50)`, en dernier dans la réponse). La mesure attendue
 * est calculée sur la figure ; juste = exacte ; 180 − a = « mauvaise graduation ».
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	measureWrongScaleFeedback,
	missingMeasureFeedback,
	wrongMeasureFeedback
} from '../measure';
import { solutionAngle, solutionLines } from '../drawing';
import { serializeMeasuredAnswer, splitMeasuredAnswer, type DrawnRepere } from '../answer';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';

function checksOf(source: string) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return spec.checks;
}

function judge(source: string, answer: string) {
	return judgeConstruction(
		checksOf(source),
		constructionPositions(source),
		answer,
		constructionShapes(source),
		constructionExpected(source)
	);
}

function assertChecks(source: string) {
	assertConstructionChecks(
		checksOf(source),
		constructionPositions(source),
		constructionShapes(source),
		constructionExpected(source)
	);
}

function figure(body: string[], header: string[] = [], window = '0 ; 10 ; 0 ; 8'): string {
	return [`fenetre: ${window}`, ...header, 'verifier: mesure AOB', '---', ...body].join('\n');
}

/** Angle AOB de `measure` degrés, sommet O(4 ; 3), [OA) horizontal, OA = OB = 3 (B dans la fenêtre) */
function body(measure: number): string[] {
	return [
		'O = point(4, 3)',
		'A = point(7, 3)',
		`B = rotation(A, angle=${measure}, centre=O)`,
		'x = demidroite(O, A)',
		'y = demidroite(O, B)'
	];
}

const SOURCE = figure(body(50));

/** Un repère posé par l'élève (jamais noté) */
const MARK: DrawnRepere = { kind: 'repere', vx: 4, vy: 3, ax: 9, ay: 3, r: 2.8, deg: 50, sens: 1 };

describe('Lecture de « verifier: mesure AOB »', () => {
	it('lit les trois points ; palette déduite : le rapporteur seul', () => {
		const { spec, errors } = readConstructionHeader(SOURCE);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([{ kind: 'mesure', points: ['A', 'O', 'B'], line: 2 }]);
		expect(spec.tools).toEqual(['rapporteur']);
	});

	it.each([
		['mesure AO', 'trois points'],
		['mesure AOA', 'trois points différents'],
		['mesure AOB = 50', 'trois points']
	])('« %s » : refusé', (verifier, message) => {
		const { errors } = readConstructionHeader(
			['fenetre: 0 ; 10 ; 0 ; 8', `verifier: ${verifier}`, '---', ...body(50)].join('\n')
		);
		expect(errors.map((e) => e.message).join()).toContain(message);
	});

	it('refuse un autre outil, un quadrillage, une autre vérification', () => {
		const tool = readConstructionHeader(figure(body(50), ['outils: rapporteur, segment']));
		expect(tool.errors.map((e) => e.message).join()).toContain('outil segment hors de la palette');
		const grid = readConstructionHeader(figure(body(50), ['grille: 1']));
		expect(grid.errors.map((e) => e.message).join()).toContain('papier uni');
		const mixed = readConstructionHeader(
			figure(body(50), ['outils: rapporteur', 'verifier: droite_par A ; B'])
		);
		expect(mixed.errors.map((e) => e.message).join()).toContain('ne se mêle pas');
	});

	it('le rapporteur reste refusé hors d’un angle', () => {
		const { errors } = readConstructionHeader(
			[
				'fenetre: 0 ; 10 ; 0 ; 8',
				'outils: rapporteur',
				'verifier: droite_par A ; B',
				'---',
				...body(50)
			].join('\n')
		);
		expect(errors.map((e) => e.message).join()).toContain('mesure AOB');
	});
});

describe('Réponse : repères puis mesure tapée', () => {
	it('écrit et relit la mesure en dernier', () => {
		const answer = serializeMeasuredAnswer([MARK], 50);
		expect(answer.endsWith('|mesure(50)')).toBe(true);
		expect(splitMeasuredAnswer(answer)?.measure).toBe(50);
		expect(serializeMeasuredAnswer([], 7)).toBe('mesure(7)');
		expect(splitMeasuredAnswer(serializeMeasuredAnswer([MARK], null))?.measure).toBeNull();
	});

	it('mesure ailleurs qu’en dernier, ou deux fois : illisible', () => {
		expect(splitMeasuredAnswer('mesure(50)|mesure(40)')).toBeNull();
		expect(splitMeasuredAnswer(`mesure(50)|${serializeMeasuredAnswer([MARK], null)}`)).toBeNull();
	});
});

describe('Juge : mesurer un angle', () => {
	it('nominal : 50 → juste, avec ou sans repère', () => {
		expect(judge(SOURCE, 'mesure(50)').status).toBe('correct');
		expect(judge(SOURCE, serializeMeasuredAnswer([MARK], 50)).status).toBe('correct');
	});

	it('angle obtus, angle orienté dans l’autre sens : juste', () => {
		expect(judge(figure(body(130)), 'mesure(130)').status).toBe('correct');
		expect(judge(figure(body(-70)), 'mesure(70)').status).toBe('correct');
	});

	it('130 au lieu de 50 : mauvaise graduation', () => {
		expect(judge(SOURCE, 'mesure(130)')).toEqual({
			status: 'incorrect',
			feedback: measureWrongScaleFeedback(130, 50)
		});
		expect(measureWrongScaleFeedback(130, 50)).toBe(
			'L’angle mesure 50°, pas 130° : tu as lu la mauvaise graduation du rapporteur.'
		);
	});

	it('autre mesure : faux, la mesure de la figure dite', () => {
		expect(judge(SOURCE, 'mesure(45)')).toEqual({
			status: 'incorrect',
			feedback: wrongMeasureFeedback(45, 50)
		});
		expect(wrongMeasureFeedback(45, 50)).toBe('L’angle mesure 50°, pas 45°.');
		// Exacte : 49 et 51 sont faux (décision de David, § 19)
		expect(judge(SOURCE, 'mesure(51)').status).toBe('incorrect');
	});

	it('rien : vide ; des repères sans mesure : faux, avec la consigne', () => {
		expect(judge(SOURCE, '').status).toBe('empty');
		expect(judge(SOURCE, serializeMeasuredAnswer([MARK], null))).toEqual({
			status: 'incorrect',
			feedback: missingMeasureFeedback('AOB')
		});
	});

	it('un trait ou une réponse forgée : faux sans message', () => {
		expect(judge(SOURCE, 'segment(4;3;8;6)|mesure(50)')).toEqual({ status: 'incorrect' });
		expect(judge(SOURCE, 'mesure(50)|mesure(50)')).toEqual({ status: 'incorrect' });
		expect(judge(SOURCE, 'mesure(5000)')).toEqual({ status: 'incorrect' });
	});

	it('une mesure tapée dans une autre case figure : réponse forgée', () => {
		const other = [
			'fenetre: 0 ; 10 ; 0 ; 8',
			'verifier: droite_par O ; A',
			'---',
			...body(50)
		].join('\n');
		expect(judge(other, 'droite(4;3;9;3)|mesure(50)')).toEqual({ status: 'incorrect' });
	});
});

describe('Erreurs d’auteur', () => {
	it('figure qui se mesure : rien', () => {
		expect(() => assertChecks(SOURCE)).not.toThrow();
	});

	it('mesure non entière', () => {
		const odd = figure([
			'O = point(4, 3)',
			'A = point(9, 3)',
			'B = point(6, 6)',
			'x = demidroite(O, A)',
			'y = demidroite(O, B)'
		]);
		expect(() => assertChecks(odd)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(odd)).toThrow(/56,3°.*rotation\(A, angle=…, centre=O\)/);
	});

	it('angle plat ou nul', () => {
		expect(() => assertChecks(figure(body(180)))).toThrow(/nul ou plat/);
		expect(() => assertChecks(figure(body(0)))).toThrow(/nul ou plat/);
	});

	it('côté non tracé, ou trop court pour le rapporteur', () => {
		const missing = figure(body(50).slice(0, 4));
		expect(() => assertChecks(missing)).toThrow(/\[OB\) n’est pas tracé/);
		const short = figure([
			...body(50).slice(0, 4),
			'C = rotation(A, angle=50, centre=O)',
			's = segment(O, point(5, 3.5))'
		]);
		expect(() => assertChecks(short)).toThrow(/\[OB\)/);
		// Segment le long de [OB) mais plus court que le rayon (2,8)
		const tooShort = figure([
			...body(50).slice(0, 3),
			'x = demidroite(O, A)',
			'M = rotation(point(5, 3), angle=50, centre=O)',
			's = segment(O, M)'
		]);
		expect(() => assertChecks(tooShort)).toThrow(/s’arrête avant le bord du rapporteur/);
	});

	it('côté tracé en segment assez long, ou en droite : se mesure', () => {
		const segment = figure([...body(50).slice(0, 4), 's = segment(O, B)']);
		expect(() => assertChecks(segment)).not.toThrow();
		const line = figure([...body(50).slice(0, 3), 'd = droite(O, A)', 'y = demidroite(O, B)']);
		expect(() => assertChecks(line)).not.toThrow();
	});

	it('A ou B invisible, ou hors de la fenêtre (revue)', () => {
		const hidden = figure(
			body(50).map((l) => (l.startsWith('A =') ? 'A = point(9, 3, visible=faux)' : l))
		);
		expect(() => assertChecks(hidden)).toThrow(/A n’est pas visible/);
		const outside = figure([
			'O = point(4, 3)',
			'A = point(10, 3)',
			'B = rotation(A, angle=90, centre=O)',
			'x = demidroite(O, A)',
			'y = demidroite(O, B)'
		]);
		expect(() => assertChecks(outside)).toThrow(/B est hors de la fenêtre/);
	});

	it('segment venu de l’autre côté de O : « n’est pas tracé » (revue)', () => {
		const opposite = figure([
			...body(50).slice(0, 4),
			'M = rotation(point(1, 3), angle=50, centre=O)',
			's = segment(M, O)'
		]);
		expect(() => assertChecks(opposite)).toThrow(/\[OB\) n’est pas tracé/);
	});

	it('rapporteur qui ne tient que posé sur [OB), corps vers A : se mesure (revue)', () => {
		// O près du bord gauche : posé sur [OA) (horizontal), corps vers B, il sort à gauche ;
		// posé sur [OB) (à 80°), corps vers A, il tient
		const source = figure([
			'O = point(1, 4)',
			'A = point(4, 4)',
			'B = rotation(A, angle=80, centre=O)',
			'x = demidroite(O, A)',
			'y = demidroite(O, B)'
		]);
		expect(() => assertChecks(source)).not.toThrow();
		expect(judge(source, 'mesure(80)').status).toBe('correct');
	});

	it('sommet invisible', () => {
		const hidden = figure(
			body(50).map((l) => (l.startsWith('O =') ? 'O = point(4, 3, visible=faux)' : l))
		);
		expect(() => assertChecks(hidden)).toThrow(/O n’est pas visible/);
	});

	it('rapporteur qui sort de la figure des deux côtés', () => {
		// O dans le coin bas gauche : posé sur [OA) vers B il sort à gauche ; posé sur [OB)
		// vers A, il sort en bas
		const source = figure([
			'O = point(0.5, 0.5)',
			'A = point(3, 0.5)',
			'B = rotation(A, angle=60, centre=O)',
			'x = demidroite(O, A)',
			'y = demidroite(O, B)'
		]);
		expect(() => assertChecks(source)).toThrow(/sort de la figure/);
	});

	it('M1 (§ 18) : fenêtre plus de deux fois plus large que haute, refusée', () => {
		const wide = figure(body(50), [], '0 ; 17 ; 0 ; 8');
		expect(() => assertChecks(wide)).toThrow(/fenêtre trop allongée/);
		const ok = figure(body(50), [], '0 ; 16 ; 0 ; 8');
		expect(() => assertChecks(ok)).not.toThrow();
	});
});

describe('Correction', () => {
	it('l’arc de l’angle, codé de la mesure de la figure ; aucun trait', () => {
		const checks = checksOf(SOURCE);
		const points = constructionPositions(SOURCE);
		const arc = solutionAngle(checks, points, constructionShapes(SOURCE), []);
		expect(arc?.measure).toBe(50);
		expect(arc?.sens).toBe(1);
		expect(arc?.center).toEqual({ x: 4, y: 3 });
		expect(solutionLines(checks, points, [], constructionShapes(SOURCE))).toEqual([]);
	});
});
