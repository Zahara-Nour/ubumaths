/**
 * Perpendiculaire et parallèle par un point, à l'équerre, sur papier uni (outil n° 40,
 * chantier `outil-equerre-uni`, phase 0 validée par David le 2026-11-28,
 * `docs/wip/outil-equerre-uni-progress.md` § 1).
 *
 * `verifier: droite p = perpendiculaire(A, d)` / `parallele(A, d)` sans quadrillage :
 * l'élève pose l'équerre le long de (d) et la glisse jusqu'à A ; la parallèle se fait
 * en deux équerres (une perpendiculaire à (d) n'importe où sur (d), puis la
 * perpendiculaire à celle-ci par A). Messages qui disent la cause, sur papier uni et
 * sur quadrillage (décision 3) ; l'équerre exigée dans `outils:` (décision 2) ;
 * correction : angle droit codé, perpendiculaire intermédiaire en trait fin (décision 4).
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { assertConstructionChecks, judgeConstruction } from '../judge';
import {
	LINE_EYEBALLED_FEEDBACK,
	LINE_NOT_IN_PLACE_FEEDBACK,
	notThroughPointFeedback,
	swappedDirectionFeedback,
	throughLineMissingFeedback,
	throughPointWrongDirectionFeedback
} from '../line';
import { isStraight, perpendicularThrough, traitOf, type StraightTrait } from '../instruments';
import { solutionThroughLines } from '../drawing';
import { serializeConstructionAnswer, type DrawnLine, type DrawnObject } from '../answer';
import { readConstructionHeader } from '#lib/ubumark/parser/construction-parser.ts';

function checksOf(source: string) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return spec.checks;
}

function judge(source: string, objects: DrawnObject[]) {
	return judgeConstruction(
		checksOf(source),
		constructionPositions(source),
		serializeConstructionAnswer(objects),
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

// (d) oblique par (0 ; 2) et (10 ; 4), A(3 ; 6) hors de (d), C(8 ; 7) un autre point visible
const BODY = [
	'm = point(0, 2, visible=faux)',
	'n = point(10, 4, visible=faux)',
	'd = droite(m, n)',
	'A = point(3, 6)',
	'C = point(8, 7)'
];

function figure(verifier: string, body = BODY, header: string[] = []): string {
	return ['fenetre: 0 ; 10 ; 0 ; 8', ...header, `verifier: ${verifier}`, '---', ...body].join('\n');
}

const PERPENDICULAIRE = figure('droite p = perpendiculaire(A, d)');
const PARALLELE = figure('droite q = parallele(A, d)');

const droite = (x1: number, y1: number, x2: number, y2: number): DrawnLine => ({
	kind: 'droite',
	x1,
	y1,
	x2,
	y2
});

/** Le trait de (d) tel que la figure le donne aux instruments (l'équerre s'y pose) */
function guideOf(source: string): StraightTrait {
	const trait = constructionShapes(source).traits.find(isStraight);
	if (!trait) throw new Error('pas de trait droit');
	return trait;
}

/** L'équerre posée le long d'une droite tracée */
function along(line: DrawnLine): StraightTrait {
	return traitOf(line) as StraightTrait;
}

describe('outil 40 : lecture de l’en-tête', () => {
	it('papier uni, palette par défaut (l’équerre y est) : pas d’erreur', () => {
		expect(readConstructionHeader(PERPENDICULAIRE).errors).toEqual([]);
		expect(readConstructionHeader(PARALLELE).errors).toEqual([]);
	});

	it('papier uni sans équerre dans outils: → erreur d’auteur (décision 2)', () => {
		const source = figure('droite p = perpendiculaire(A, d)', BODY, ['outils: droite, compas']);
		const { errors } = readConstructionHeader(source);
		expect(errors.map((e) => e.message).join(' ')).toMatch(/se trace à l’équerre/);
		const parallel = figure('droite q = parallele(A, d)', BODY, ['outils: droite']);
		expect(
			readConstructionHeader(parallel)
				.errors.map((e) => e.message)
				.join(' ')
		).toMatch(/se trace à l’équerre/);
	});

	it('quadrillage sans équerre : toujours admis (compter les carreaux suffit)', () => {
		const source = figure('droite p = perpendiculaire(A, d)', BODY, [
			'grille: 1',
			'outils: droite'
		]);
		expect(readConstructionHeader(source).errors).toEqual([]);
	});
});

describe('outil 40 : erreurs d’auteur sur papier uni', () => {
	it('figure faisable : rien à signaler', () => {
		expect(() => assertChecks(PERPENDICULAIRE)).not.toThrow();
		expect(() => assertChecks(PARALLELE)).not.toThrow();
	});

	it('A invisible : l’élève ne peut pas y glisser l’équerre', () => {
		const body = [...BODY.slice(0, 3), 'A = point(3, 6, visible=faux)'];
		expect(() => assertChecks(figure('droite p = perpendiculaire(A, d)', body))).toThrow(
			/A n’est pas visible/
		);
	});

	it('(d) non tracée : l’élève ne peut pas y poser l’équerre', () => {
		const body = [BODY[0], BODY[1], 'd = droite(m, n, visible=faux)', BODY[3]];
		expect(() => assertChecks(figure('droite p = perpendiculaire(A, d)', body))).toThrow(
			/d n’est pas tracée/
		);
	});

	it('parallèle par un point de (d) : c’est (d) elle-même', () => {
		const body = [...BODY.slice(0, 3), 'A = point(5, 3)'];
		expect(() => assertChecks(figure('droite q = parallele(A, d)', body))).toThrow(/A est sur d/);
	});

	it('perpendiculaire par un point de (d) : admise', () => {
		const body = [...BODY.slice(0, 3), 'A = point(5, 3)'];
		expect(() => assertChecks(figure('droite p = perpendiculaire(A, d)', body))).not.toThrow();
	});

	it('droite attendue qui n’a pas 2 unités dans la fenêtre', () => {
		// (d) : y = x ; A(10 ; 8), coin de la fenêtre : la perpendiculaire n'y touche que le coin
		const body = [
			'm = point(0, 0, visible=faux)',
			'n = point(8, 8, visible=faux)',
			'd = droite(m, n)',
			'A = point(10, 8)'
		];
		expect(() => assertChecks(figure('droite p = perpendiculaire(A, d)', body))).toThrow(
			/n’a pas 2 unités dans la fenêtre/
		);
	});

	it('une autre expression reste refusée sur papier uni', () => {
		expect(() => assertChecks(figure('droite p = droite(A, C)'))).toThrow(
			/sans quadrillage, seulement une médiatrice/
		);
	});
});

describe('outil 40 : perpendiculaire sur papier uni', () => {
	it('l’équerre le long de (d), glissée jusqu’à A → juste', () => {
		const square = perpendicularThrough(guideOf(PERPENDICULAIRE), { x: 3, y: 6 });
		expect(judge(PERPENDICULAIRE, [square])).toEqual({ status: 'correct' });
	});

	it('A sur (d) : la perpendiculaire en A → juste', () => {
		const source = figure('droite p = perpendiculaire(A, d)', [
			...BODY.slice(0, 3),
			'A = point(5, 3)'
		]);
		const square = perpendicularThrough(guideOf(source), { x: 5, y: 3 });
		expect(judge(source, [square])).toEqual({ status: 'correct' });
	});

	it('à la bonne place, tracée à la règle par A et un point à l’œil → à l’œil', () => {
		// La perpendiculaire par A a la direction (−1 ; 5) : (2 ; 11) est dessus, posé à l'œil
		expect(judge(PERPENDICULAIRE, [droite(3, 6, 2, 11)])).toEqual({
			status: 'incorrect',
			feedback: LINE_EYEBALLED_FEEDBACK
		});
	});

	it('rien de tracé (un cercle seul) → trace la perpendiculaire', () => {
		expect(judge(PERPENDICULAIRE, [{ kind: 'cercle', cx: 3, cy: 6, x: 8, y: 7 }])).toEqual({
			status: 'incorrect',
			feedback: throughLineMissingFeedback('perpendiculaire', 'd', 'A')
		});
	});

	it('perpendiculaire à (d) ailleurs que par A → ne passe pas par A', () => {
		const square = perpendicularThrough(guideOf(PERPENDICULAIRE), { x: 5, y: 3 });
		expect(judge(PERPENDICULAIRE, [square])).toEqual({
			status: 'incorrect',
			feedback: notThroughPointFeedback('perpendiculaire', 'd', 'A')
		});
	});

	it('par A et C, deux points de la figure : (AC) est parallèle à (d) → on demande la perpendiculaire', () => {
		expect(judge(PERPENDICULAIRE, [droite(3, 6, 8, 7)])).toEqual({
			status: 'incorrect',
			// (AC) a la direction (5 ; 1), celle de (d)
			feedback: swappedDirectionFeedback('perpendiculaire', 'd')
		});
	});

	it('par A, ni perpendiculaire ni parallèle → pas perpendiculaire', () => {
		const source = figure('droite p = perpendiculaire(A, d)', [
			...BODY.slice(0, 4),
			'C = point(8, 1)'
		]);
		expect(judge(source, [droite(3, 6, 8, 1)])).toEqual({
			status: 'incorrect',
			feedback: throughPointWrongDirectionFeedback('perpendiculaire', 'd', 'A')
		});
	});

	it('la parallèle construite à la place → on demande la perpendiculaire', () => {
		const first = perpendicularThrough(guideOf(PERPENDICULAIRE), { x: 5, y: 3 });
		const second = perpendicularThrough(along(first), { x: 3, y: 6 });
		expect(judge(PERPENDICULAIRE, [first, second])).toEqual({
			status: 'incorrect',
			feedback: swappedDirectionFeedback('perpendiculaire', 'd')
		});
	});

	it('une droite construite quelconque, ni par A ni dans la bonne direction → pas à sa place', () => {
		const source = figure('droite p = perpendiculaire(A, d)', [...BODY, 'E = point(1, 1)']);
		expect(judge(source, [droite(1, 1, 8, 7)])).toEqual({
			status: 'incorrect',
			feedback: LINE_NOT_IN_PLACE_FEEDBACK
		});
	});
});

describe('outil 40 : parallèle sur papier uni', () => {
	it('deux équerres : perpendiculaire sur (d), puis perpendiculaire à celle-ci par A → juste', () => {
		const first = perpendicularThrough(guideOf(PARALLELE), { x: 5, y: 3 });
		const second = perpendicularThrough(along(first), { x: 3, y: 6 });
		expect(judge(PARALLELE, [first, second])).toEqual({ status: 'correct' });
	});

	it('la perpendiculaire intermédiaire PAR A, puis l’équerre en A → juste', () => {
		const first = perpendicularThrough(guideOf(PARALLELE), { x: 3, y: 6 });
		const second = perpendicularThrough(along(first), { x: 3, y: 6 });
		expect(judge(PARALLELE, [first, second])).toEqual({ status: 'correct' });
	});

	it('rien de tracé → trace la parallèle', () => {
		expect(judge(PARALLELE, [{ kind: 'cercle', cx: 3, cy: 6, x: 8, y: 7 }])).toEqual({
			status: 'incorrect',
			feedback: throughLineMissingFeedback('parallele', 'd', 'A')
		});
	});

	it('parallèle à (d) qui ne passe pas par A → ne passe pas par A', () => {
		const first = perpendicularThrough(guideOf(PARALLELE), { x: 5, y: 3 });
		// Le départ de la 2e équerre est posé SUR la 1re (comme un point quelconque du côté)
		const onFirst = { x: 5 - 0.2, y: 3 + 1 };
		const third = perpendicularThrough(along(first), onFirst);
		expect(judge(PARALLELE, [first, third])).toEqual({
			status: 'incorrect',
			feedback: notThroughPointFeedback('parallele', 'd', 'A')
		});
	});

	it('seulement la perpendiculaire par A (2e équerre oubliée) → on demande la parallèle', () => {
		const first = perpendicularThrough(guideOf(PARALLELE), { x: 3, y: 6 });
		expect(judge(PARALLELE, [first])).toEqual({
			status: 'incorrect',
			feedback: swappedDirectionFeedback('parallele', 'd')
		});
	});

	it('par A, mauvaise direction → pas parallèle', () => {
		const source = figure('droite q = parallele(A, d)', [...BODY.slice(0, 4), 'C = point(8, 1)']);
		expect(judge(source, [droite(3, 6, 8, 1)])).toEqual({
			status: 'incorrect',
			feedback: throughPointWrongDirectionFeedback('parallele', 'd', 'A')
		});
	});
});

describe('outil 40 : deux vérifications dans la même figure (revue)', () => {
	it('p fausse, q juste tracée après : le message de p ne lit pas q', () => {
		const source = [
			'fenetre: 0 ; 10 ; 0 ; 8',
			'verifier: droite p = perpendiculaire(A, d)',
			'verifier: droite q = parallele(C, d)',
			'---',
			...BODY
		].join('\n');
		const guide = guideOf(source);
		// p par un point de (d) au lieu de A ; puis q en deux équerres par C
		const wrongP = perpendicularThrough(guide, { x: 5, y: 3 });
		const first = perpendicularThrough(guide, { x: 8, y: 3.6 });
		const q = perpendicularThrough(along(first), { x: 8, y: 7 });
		expect(judge(source, [wrongP, first, q])).toEqual({
			status: 'incorrect',
			feedback: notThroughPointFeedback('perpendiculaire', 'd', 'A')
		});
		const p = perpendicularThrough(guide, { x: 3, y: 6 });
		expect(judge(source, [p, first, q])).toEqual({ status: 'correct' });
	});
});

describe('outil 40 : messages aussi sur quadrillage (décision 3)', () => {
	// (d) horizontale y = 3, A(4 ; 6)
	const GRID_BODY = [
		'm = point(0, 3, visible=faux)',
		'n = point(10, 3, visible=faux)',
		'd = droite(m, n)',
		'A = point(4, 6)'
	];

	it('perpendiculaire ailleurs que par A → ne passe pas par A', () => {
		const source = figure('droite p = perpendiculaire(A, d)', GRID_BODY, ['grille: 1']);
		expect(judge(source, [droite(4, 0, 4, 8)])).toEqual({ status: 'correct' });
		expect(judge(source, [droite(5, 0, 5, 8)])).toEqual({
			status: 'incorrect',
			feedback: notThroughPointFeedback('perpendiculaire', 'd', 'A')
		});
	});

	it('parallèle au lieu de la perpendiculaire → on demande la perpendiculaire', () => {
		const source = figure('droite p = perpendiculaire(A, d)', GRID_BODY, ['grille: 1']);
		expect(judge(source, [droite(0, 6, 10, 6)])).toEqual({
			status: 'incorrect',
			feedback: swappedDirectionFeedback('perpendiculaire', 'd')
		});
	});

	it('parallèle : par A en diagonale → pas parallèle', () => {
		const source = figure('droite q = parallele(A, d)', GRID_BODY, ['grille: 1']);
		expect(judge(source, [droite(0, 6, 10, 6)])).toEqual({ status: 'correct' });
		expect(judge(source, [droite(4, 6, 6, 8)])).toEqual({
			status: 'incorrect',
			feedback: throughPointWrongDirectionFeedback('parallele', 'd', 'A')
		});
	});
});

describe('outil 40 : correction (décision 4)', () => {
	it('perpendiculaire : l’angle droit codé au pied, sur (d)', () => {
		const [solution] = solutionThroughLines(
			checksOf(PERPENDICULAIRE),
			constructionPositions(PERPENDICULAIRE),
			constructionShapes(PERPENDICULAIRE)
		);
		expect(solution.guides).toEqual([]);
		expect(solution.rightAngles).toHaveLength(1);
		const [corner] = solution.rightAngles;
		// Pied de la perpendiculaire par A(3 ; 6) sur y = 2 + x / 5 : (95/26 ; 71/26)
		expect(corner.center.x).toBeCloseTo(95 / 26);
		expect(corner.center.y).toBeCloseTo(71 / 26);
	});

	it('parallèle : la perpendiculaire par A en trait fin, deux angles droits', () => {
		const [solution] = solutionThroughLines(
			checksOf(PARALLELE),
			constructionPositions(PARALLELE),
			constructionShapes(PARALLELE)
		);
		expect(solution.guides).toHaveLength(1);
		const [guide] = solution.guides;
		// Par A(3 ; 6), direction (−1 ; 5) (perpendiculaire à (d))
		expect(guide.x1).toBeCloseTo(3);
		expect(guide.y1).toBeCloseTo(6);
		expect((guide.x2 - guide.x1) * 5 + (guide.y2 - guide.y1) * 1).toBeCloseTo(0);
		expect(solution.rightAngles.map((c) => c.center)).toEqual([
			{ x: expect.closeTo(95 / 26), y: expect.closeTo(71 / 26) },
			{ x: 3, y: 6 }
		]);
	});

	it('médiatrice : pas de correction de ce genre', () => {
		const source = figure('droite m = mediatrice(A, C)');
		expect(
			solutionThroughLines(
				checksOf(source),
				constructionPositions(source),
				constructionShapes(source)
			)
		).toEqual([]);
	});
});
