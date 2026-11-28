/**
 * Médiatrice et milieu à la règle graduée et à l'équerre, sur papier uni (outil n° 38,
 * chantier `outil-equerre-uni`, phase 0 validée par David le 2026-11-28,
 * `docs/wip/outil-equerre-uni-progress.md` § 2).
 *
 * `outils: droite, regle, point, equerre` + `verifier: droite m = mediatrice(A, B)` :
 * l'élève pose la règle (0 en A ou en B) le long de [AB], marque le milieu au Point sur
 * une graduation, puis trace à l'équerre la perpendiculaire par ce point. Même geste
 * pour `verifier: point M = milieu(A, B)` (`outils: regle, point`, décision 4). Milieu
 * posé à l'œil : un message à lui (décision 3). Garde de l'auteur : [AB] mesure un
 * nombre pair de millimètres et tient sur la règle ; Point et Équerre dans `outils:`.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { assertConstructionChecks, judgeConstruction } from '../judge';
import {
	LINE_EYEBALLED_FEEDBACK,
	mediatriceMissingFeedback,
	midpointEyeballedFeedback,
	notMidpointFeedback
} from '../line';
import { POINT_NOT_IN_PLACE_FEEDBACK } from '../point';
import {
	isStraight,
	perpendicularThrough,
	rulerGraduation,
	type StraightTrait
} from '../instruments';
import {
	serializeConstructionAnswer,
	type DrawnObject,
	type DrawnPoint,
	type DrawnRegle
} from '../answer';
import type { Position } from '../judge';
import { nudgeRulerEnd, rulerSegmentMm } from '../drawing';
import { readConstructionHeader } from '#lib/ubumark/parser/construction-parser.ts';

function checksOf(source: string) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return spec.checks;
}

function headerErrors(source: string): string[] {
	return readConstructionHeader(source).errors.map((e) => e.message);
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

const TOOLS = 'outils: droite, regle, point, equerre';

/** [AB] de 6 cm, horizontal : milieu (5 ; 3) */
const AB_BODY = ['A = point(2, 3)', 'B = point(8, 3)', 's = segment(A, B)'];
/** [AB] de 6 cm, oblique (3,6 ; 4,8) : milieu (2,8 ; 3,4) */
const OBLIQUE_BODY = ['A = point(1, 1)', 'B = point(4.6, 5.8)', 's = segment(A, B)'];
/** A et B seuls, sans segment tracé */
const POINTS_BODY = ['A = point(2, 3)', 'B = point(8, 3)'];

function figure(verifier: string, body = AB_BODY, header: string[] = [TOOLS]): string {
	return ['fenetre: 0 ; 10 ; 0 ; 8', ...header, `verifier: ${verifier}`, '---', ...body].join('\n');
}

const MEDIATRICE = figure('droite m = mediatrice(A, B)');
const MILIEU = figure('point M = milieu(A, B)', AB_BODY, ['outils: regle, point']);

const ruler = (from: Position, toward: Position): DrawnRegle => ({
	kind: 'regle',
	ox: from.x,
	oy: from.y,
	bx: toward.x,
	by: toward.y,
	sens: 1
});

const pointAt = (p: Position): DrawnPoint => ({ kind: 'point', x: p.x, y: p.y });

function positionsOf(source: string): { a: Position; b: Position } {
	const points = constructionPositions(source);
	const a = points.get('A');
	const b = points.get('B');
	if (!a || !b) throw new Error('A ou B absent');
	return { a, b };
}

/** Le trait de [AB] tel que la figure le donne aux instruments (l'équerre s'y pose) */
function guideOf(source: string): StraightTrait {
	const trait = constructionShapes(source).traits.find(isStraight);
	if (!trait) throw new Error('pas de trait droit');
	return trait;
}

/**
 * Le geste du cahier : règle posée de `from` vers `toward`, point marqué sur la
 * graduation `mm`, puis l'équerre le long de `guide` glissée jusqu'à ce point
 */
function construction(
	from: Position,
	toward: Position,
	mm: number,
	guide: StraightTrait
): DrawnObject[] {
	const r = ruler(from, toward);
	const m = rulerGraduation(r, mm);
	return [r, pointAt(m), perpendicularThrough(guide, m)];
}

describe('médiatrice à la règle graduée et à l’équerre : verdicts', () => {
	it('nominal : règle de A vers B, milieu à 3 cm, équerre par ce point → juste', () => {
		const { a, b } = positionsOf(MEDIATRICE);
		expect(judge(MEDIATRICE, construction(a, b, 30, guideOf(MEDIATRICE)))).toEqual({
			status: 'correct'
		});
	});

	it('le 0 en B → juste aussi', () => {
		const { a, b } = positionsOf(MEDIATRICE);
		expect(judge(MEDIATRICE, construction(b, a, 30, guideOf(MEDIATRICE)))).toEqual({
			status: 'correct'
		});
	});

	it('[AB] oblique → juste', () => {
		const source = figure('droite m = mediatrice(A, B)', OBLIQUE_BODY);
		const { a, b } = positionsOf(source);
		expect(judge(source, construction(a, b, 30, guideOf(source)))).toEqual({
			status: 'correct'
		});
	});

	it('A et B seuls (pas de segment) : règle posée de A vers B, équerre le long de la règle → juste', () => {
		const source = figure('droite m = mediatrice(A, B)', POINTS_BODY);
		const { a, b } = positionsOf(source);
		// Sans segment, l'élève trace (AB) à la règle, puis pose l'équerre le long de ce trait
		const ab = { kind: 'droite' as const, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
		const guide: StraightTrait = { kind: 'line', a, b };
		expect(judge(source, [ab, ...construction(a, b, 30, guide)])).toEqual({ status: 'correct' });
	});

	it('mauvaise graduation (3,5 cm) → perpendiculaire mais pas par le milieu', () => {
		const { a, b } = positionsOf(MEDIATRICE);
		expect(judge(MEDIATRICE, construction(a, b, 35, guideOf(MEDIATRICE)))).toEqual({
			status: 'incorrect',
			feedback: notMidpointFeedback('A', 'B')
		});
	});

	it('milieu posé à l’œil sur [AB] (hors graduation) → message du milieu à l’œil', () => {
		const m = { x: 5.03, y: 3 };
		const objects: DrawnObject[] = [pointAt(m), perpendicularThrough(guideOf(MEDIATRICE), m)];
		expect(judge(MEDIATRICE, objects)).toEqual({
			status: 'incorrect',
			feedback: midpointEyeballedFeedback('A', 'B')
		});
	});

	it('règle posée ailleurs qu’en A ou B (0 à l’œil) → milieu à l’œil', () => {
		const { b } = positionsOf(MEDIATRICE);
		// 0 posé à l'œil sur [AB], en (2,37 ; 3) : la graduation 2,5 cm tombe à côté du milieu
		const objects = construction({ x: 2.37, y: 3 }, b, 25, guideOf(MEDIATRICE));
		expect(judge(MEDIATRICE, objects)).toEqual({
			status: 'incorrect',
			feedback: midpointEyeballedFeedback('A', 'B')
		});
	});

	it('bon milieu, droite tracée à la règle (deuxième point à l’œil) → tracée à l’œil', () => {
		const { a, b } = positionsOf(MEDIATRICE);
		const r = ruler(a, b);
		const m = rulerGraduation(r, 30);
		const objects: DrawnObject[] = [
			r,
			pointAt(m),
			{ kind: 'droite', x1: m.x, y1: m.y, x2: 5, y2: 7 }
		];
		expect(judge(MEDIATRICE, objects)).toEqual({
			status: 'incorrect',
			feedback: LINE_EYEBALLED_FEEDBACK
		});
	});

	it('bon milieu, droite tracée vers un Point posé à l’œil hors de (AB) → tracée à l’œil (revue)', () => {
		const { a, b } = positionsOf(MEDIATRICE);
		const r = ruler(a, b);
		const m = rulerGraduation(r, 30);
		const q = { x: 5, y: 7 };
		const objects: DrawnObject[] = [
			r,
			pointAt(m),
			pointAt(q),
			{ kind: 'droite', x1: m.x, y1: m.y, x2: q.x, y2: q.y }
		];
		expect(judge(MEDIATRICE, objects)).toEqual({
			status: 'incorrect',
			feedback: LINE_EYEBALLED_FEEDBACK
		});
	});

	it('« médiatrice » avec accent : la palette n’est pas refusée à tort (revue ; l’expression, elle, ne se calcule pas)', () => {
		expect(headerErrors(figure('droite m = médiatrice(A, B)'))).toEqual([]);
	});

	it('règle et point marqué, rien d’autre → « Trace la médiatrice »', () => {
		const { a, b } = positionsOf(MEDIATRICE);
		const r = ruler(a, b);
		expect(judge(MEDIATRICE, [r, pointAt(rulerGraduation(r, 30))])).toEqual({
			status: 'incorrect',
			feedback: mediatriceMissingFeedback('A', 'B')
		});
	});

	it('compas aussi dans la palette : les deux cercles de même rayon restent justes', () => {
		const source = figure('droite m = mediatrice(A, B)', AB_BODY, [
			'outils: droite, regle, point, equerre, compas'
		]);
		const objects: DrawnObject[] = [
			{ kind: 'cercle', cx: 2, cy: 3, x: 6, y: 3 },
			{ kind: 'cercle', cx: 8, cy: 3, x: 4, y: 3 },
			{ kind: 'droite', x1: 5, y1: 3 - Math.sqrt(7), x2: 5, y2: 3 + Math.sqrt(7) }
		];
		expect(judge(source, objects)).toEqual({ status: 'correct' });
	});

	it('sans la règle dans la palette : une règle posée reste une réponse forgée', () => {
		const source = figure('droite m = mediatrice(A, B)', AB_BODY, ['outils: droite, compas']);
		const { a, b } = positionsOf(source);
		expect(judge(source, construction(a, b, 30, guideOf(source)))).toEqual({
			status: 'incorrect'
		});
	});

	it('un point sur la graduation n’est construit que dans une figure qui vérifie une médiatrice ou un milieu', () => {
		// Perpendiculaire par un point : la règle graduée n'y entre pas (palette refusée)
		const source = figure('droite p = perpendiculaire(A, s)', AB_BODY, [TOOLS]);
		expect(headerErrors(source).join(' ')).toMatch(/règle graduée/);
	});
});

describe('médiatrice à la règle graduée : garde de l’auteur', () => {
	it('[AB] de 6 cm : accepté', () => {
		expect(() => assertChecks(MEDIATRICE)).not.toThrow();
	});

	it('[AB] de 6,5 cm (milieu à 3,25 cm, sur aucune graduation) : refusé', () => {
		const source = figure('droite m = mediatrice(A, B)', [
			'A = point(1, 3)',
			'B = point(7.5, 3)',
			's = segment(A, B)'
		]);
		expect(() => assertChecks(source)).toThrow(/nombre pair de millimètres/);
	});

	it('[AB] de 6,4 cm (milieu à 3,2 cm) : accepté', () => {
		const source = figure('droite m = mediatrice(A, B)', [
			'A = point(1, 3)',
			'B = point(7.4, 3)',
			's = segment(A, B)'
		]);
		expect(() => assertChecks(source)).not.toThrow();
	});

	it('[AB] plus long que la règle : refusé', () => {
		const source = [
			// Fenêtre de 7 : règle de 7 cm ; [AB] de 8 cm
			'fenetre: 0 ; 6 ; 0 ; 7',
			TOOLS,
			'verifier: droite m = mediatrice(A, B)',
			'---',
			'A = point(0.5, 0.3)',
			'B = point(5.3, 6.7)',
			's = segment(A, B)'
		].join('\n');
		expect(() => assertChecks(source)).toThrow(/plus long que la règle/);
	});

	it('6,5 cm sans la règle dans la palette (compas) : accepté', () => {
		const source = figure(
			'droite m = mediatrice(A, B)',
			['A = point(1, 3)', 'B = point(7.5, 3)', 's = segment(A, B)'],
			['outils: droite, compas']
		);
		expect(() => assertChecks(source)).not.toThrow();
	});

	it('règle sans point ni équerre : refusé à la lecture', () => {
		const sansPoint = figure('droite m = mediatrice(A, B)', AB_BODY, [
			'outils: droite, regle, equerre'
		]);
		expect(headerErrors(sansPoint).join(' ')).toMatch(/outils: droite, regle, point, equerre/);
		const sansEquerre = figure('droite m = mediatrice(A, B)', AB_BODY, [
			'outils: droite, regle, point'
		]);
		expect(headerErrors(sansEquerre).join(' ')).toMatch(/outils: droite, regle, point, equerre/);
	});

	it('règle sur quadrillage : refusé à la lecture', () => {
		const source = figure('droite m = mediatrice(A, B)', AB_BODY, [TOOLS, 'grille: 1']);
		expect(headerErrors(source).join(' ')).toMatch(/papier uni/);
	});
});

describe('milieu d’un segment à la règle graduée (décision 4)', () => {
	it('nominal : règle de A vers B, point sur la graduation 3 cm → juste', () => {
		const { a, b } = positionsOf(MILIEU);
		const r = ruler(a, b);
		expect(judge(MILIEU, [r, pointAt(rulerGraduation(r, 30))])).toEqual({ status: 'correct' });
	});

	it('le 0 en B → juste', () => {
		const { a, b } = positionsOf(MILIEU);
		const r = ruler(b, a);
		expect(judge(MILIEU, [r, pointAt(rulerGraduation(r, 30))])).toEqual({ status: 'correct' });
	});

	it('mauvaise graduation → point pas à sa place', () => {
		const { a, b } = positionsOf(MILIEU);
		const r = ruler(a, b);
		expect(judge(MILIEU, [r, pointAt(rulerGraduation(r, 35))])).toEqual({
			status: 'incorrect',
			feedback: POINT_NOT_IN_PLACE_FEEDBACK
		});
	});

	it('milieu posé à l’œil → message du milieu à l’œil', () => {
		const { a, b } = positionsOf(MILIEU);
		expect(judge(MILIEU, [ruler(a, b), pointAt({ x: 5.03, y: 3 })])).toEqual({
			status: 'incorrect',
			feedback: midpointEyeballedFeedback('A', 'B')
		});
	});

	it('garde : 6,5 cm refusé, 6 cm accepté', () => {
		expect(() => assertChecks(MILIEU)).not.toThrow();
		const source = figure(
			'point M = milieu(A, B)',
			['A = point(1, 3)', 'B = point(7.5, 3)', 's = segment(A, B)'],
			['outils: regle, point']
		);
		expect(() => assertChecks(source)).toThrow(/nombre pair de millimètres/);
	});

	it('palette : regle, point accepté ; regle sur un autre point (symétrique) refusé', () => {
		expect(headerErrors(MILIEU)).toEqual([]);
		const source = figure('point M = symetrie(A, centre=B)', AB_BODY, ['outils: regle, point']);
		expect(headerErrors(source).join(' ')).toMatch(/règle graduée/);
	});
});

describe('‹ › déplacent le point marqué sur la règle (décision 2)', () => {
	const r = ruler({ x: 2, y: 3 }, { x: 8, y: 3 });
	const options = { rulerLength: 10, shape: 'point' as const };

	it('le dernier point sur une graduation avance d’un millimètre', () => {
		const drawing = { objects: [r, pointAt(rulerGraduation(r, 29))], start: null };
		const next = nudgeRulerEnd(drawing, 1, options);
		expect(next.objects).toEqual([r, pointAt(rulerGraduation(r, 30))]);
		expect(rulerSegmentMm(next, 10)).toBe(30);
	});

	it('sans point marqué, ‹ › en posent un sur la graduation', () => {
		const next = nudgeRulerEnd({ objects: [r], start: null }, 1, options);
		expect(next.objects).toEqual([r, pointAt(rulerGraduation(r, 1))]);
	});
});
