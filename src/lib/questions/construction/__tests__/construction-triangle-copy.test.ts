/**
 * Juge d'une case « figure » : reproduire un triangle sur quadrillage
 * (`verifier: triangle ABC : reproduit DEF`) — outil n° 47, chantier
 * `outil-triangle-quadrillage`, phase 0 validée par David le 2026-11-28
 * (`docs/wip/outil-triangle-quadrillage-progress.md` § 1).
 *
 * Le modèle DEF est tracé ; l'élève reproduit ABC, le même triangle déplacé, en
 * comptant les carreaux, au seul segment. Forme 1 : [AB] est tracé, l'élève
 * trace [AC] et [BC]. Forme 2 : seul A est placé, l'élève trace les trois côtés.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { assertConstructionChecks, judgeConstruction } from '../judge';
import { missingSideFeedback, missingSidesFeedback, notJoinedFeedback } from '../triangle';
import {
	FLIPPED_COPY_FEEDBACK,
	copyStartFeedback,
	wrongCornerFeedback,
	wrongCopyVertexFeedback,
	wrongCopyVerticesFeedback
} from '../triangle-copy';
import { EXTRA_SEGMENT_FEEDBACK, NOT_CLOSED_FEEDBACK } from '../polygon';
import { solutionLines, solutionTriangle } from '../drawing';
import { serializeConstructionAnswer, type DrawnObject } from '../answer';
import type { Position } from '../judge';
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

function errorOf(source: string): string | undefined {
	return readConstructionHeader(source).errors[0]?.message;
}

const MODEL = [
	'D = point(1, 1)',
	'E = point(5, 1)',
	'F = point(2, 4)',
	'de = segment(D, E)',
	'ef = segment(E, F)',
	'df = segment(D, F)'
];

function figure(
	body: string[],
	verifier = 'triangle ABC : reproduit DEF',
	header: string[] = ['grille: 1']
): string {
	return ['fenetre: 0 ; 14 ; 0 ; 8', ...header, `verifier: ${verifier}`, '---', ...body].join('\n');
}

const segment = (p: Position, q: Position): DrawnObject => ({
	kind: 'segment',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});

// Forme 1 : [AB] = [DE] déplacé de (7 ; 3) ; C attendu en F + (7 ; 3)
const A = { x: 8, y: 4 };
const B = { x: 12, y: 4 };
const C = { x: 9, y: 7 };
const SIDE = [...MODEL, 'A = point(8, 4)', 'B = point(12, 4)', 'ab = segment(A, B)'];
const COPY = figure(SIDE);

// Forme 2 : seul A, en (8 ; 1) ; B et C attendus en (12 ; 1) et (9 ; 4)
const A2 = { x: 8, y: 1 };
const B2 = { x: 12, y: 1 };
const C2 = { x: 9, y: 4 };
const FREE = figure([...MODEL, 'A = point(8, 1)']);

describe('triangle à reproduire : lecture de l’en-tête', () => {
	it('lit le modèle ; palette Segment seule', () => {
		const { spec, errors } = readConstructionHeader(COPY);
		expect(errors).toEqual([]);
		expect(spec.checks[0]).toMatchObject({
			kind: 'triangle',
			points: ['A', 'B', 'C'],
			lengths: [],
			angles: [],
			model: ['D', 'E', 'F']
		});
		expect(spec.tools).toEqual(['segment']);
	});

	it('demande un quadrillage', () => {
		expect(errorOf(figure(SIDE, 'triangle ABC : reproduit DEF', []))).toMatch(/quadrillage/);
	});

	it('refuse un autre outil que le segment', () => {
		expect(
			errorOf(
				figure(SIDE, 'triangle ABC : reproduit DEF', ['grille: 1', 'outils: segment, compas'])
			)
		).toMatch(/compas/);
	});

	it('refuse un modèle qui partage un sommet avec le triangle', () => {
		expect(errorOf(figure(SIDE, 'triangle ABC : reproduit ABF'))).toMatch(/modèle/);
	});

	it('refuse un modèle aux sommets répétés ou incomplet', () => {
		expect(errorOf(figure(SIDE, 'triangle ABC : reproduit DDF'))).toMatch(/trois sommets/);
		expect(errorOf(figure(SIDE, 'triangle ABC : reproduit DE'))).toMatch(/reproduit DEF/);
	});

	it('refuse « reproduit » mêlé à une autre donnée', () => {
		expect(errorOf(figure(SIDE, 'triangle ABC : reproduit DEF ; AC = DF'))).toMatch(
			/reproduit DEF/
		);
	});
});

describe('triangle à reproduire : erreurs d’auteur', () => {
	it('accepte les deux formes', () => {
		expect(() => assertChecks(COPY)).not.toThrow();
		expect(() => assertChecks(FREE)).not.toThrow();
	});

	it('un sommet du modèle absent', () => {
		const body = SIDE.filter((l) => !l.startsWith('F =') && !l.includes('F)'));
		expect(() => assertChecks(figure(body))).toThrow(/F n’existe pas/);
	});

	it('un sommet du modèle hors d’un nœud', () => {
		const body = SIDE.map((l) => (l.startsWith('F =') ? 'F = point(2.5, 4)' : l));
		expect(() => assertChecks(figure(body))).toThrow(/F n’est pas sur un nœud/);
	});

	it('un modèle aplati', () => {
		const body = SIDE.map((l) => (l.startsWith('F =') ? 'F = point(3, 1)' : l));
		expect(() => assertChecks(figure(body))).toThrow(/aplati/);
	});

	it('forme 1 : [AB] qui n’est pas [DE] déplacé', () => {
		const body = SIDE.map((l) => (l.startsWith('B =') ? 'B = point(11, 4)' : l));
		expect(() => assertChecks(figure(body))).toThrow(/\[AB\] n’est pas \[DE\] déplacé/);
	});

	it('forme 1 : [AB] non tracé', () => {
		const body = SIDE.filter((l) => !l.startsWith('ab ='));
		expect(() => assertChecks(figure(body))).toThrow(/\[AB\]/);
	});

	it('un côté du modèle non tracé', () => {
		const body = SIDE.filter((l) => !l.startsWith('ef ='));
		expect(() => assertChecks(figure(body))).toThrow(/\[EF\] du modèle n’est pas tracé/);
	});

	it('A posé sur D', () => {
		expect(() => assertChecks(figure([...MODEL, 'A = point(1, 1)']))).toThrow(/A est sur D/);
	});

	it('C déjà dans la figure', () => {
		expect(() => assertChecks(figure([...SIDE, 'C = point(9, 7)']))).toThrow(/C existe déjà/);
	});

	it('le triangle attendu sort de la fenêtre', () => {
		const body = [...MODEL, 'A = point(11, 6)', 'B = point(15, 6)'];
		expect(() => assertChecks(figure(body))).toThrow(/fenêtre/);
		expect(() => assertChecks(figure([...MODEL, 'A = point(8, 6)']))).toThrow(/C .*fenêtre/);
	});
});

describe('triangle à reproduire, forme 1 : [AB] tracé', () => {
	it('juste : [AC] et [BC] vers le bon nœud', () => {
		expect(judge(COPY, [segment(A, C), segment(B, C)])).toEqual({ status: 'correct' });
	});

	it('juste : autre ordre, autre sens, un côté en deux morceaux', () => {
		const mid = { x: 10.5, y: 5.5 };
		expect(judge(COPY, [segment(C, mid), segment(mid, B), segment(C, A)])).toEqual({
			status: 'correct'
		});
	});

	it('juste : [AB] repassé', () => {
		expect(judge(COPY, [segment(B, A), segment(A, C), segment(B, C)])).toEqual({
			status: 'correct'
		});
	});

	it('C décalé d’un carreau', () => {
		const off = { x: 10, y: 7 };
		expect(judge(COPY, [segment(A, off), segment(B, off)])).toEqual({
			status: 'incorrect',
			feedback: wrongCopyVertexFeedback('C', 'A')
		});
	});

	it('triangle retourné (de l’autre côté de [AB], ou C côté B)', () => {
		const below = { x: 9, y: 1 };
		expect(judge(COPY, [segment(A, below), segment(B, below)])).toEqual({
			status: 'incorrect',
			feedback: FLIPPED_COPY_FEEDBACK
		});
		const mirrored = { x: 11, y: 7 };
		expect(judge(COPY, [segment(A, mirrored), segment(B, mirrored)])).toEqual({
			status: 'incorrect',
			feedback: FLIPPED_COPY_FEEDBACK
		});
	});

	it('côtés manquants, côtés qui ne se rejoignent pas', () => {
		// Rien de tracé : réponse vide, rendue par le juge commun
		expect(judge(COPY, [])).toEqual({ status: 'empty' });
		expect(judge(COPY, [segment({ x: 1, y: 7 }, { x: 3, y: 7 })])).toEqual({
			status: 'incorrect',
			feedback: missingSidesFeedback('A', 'B', 'C')
		});
		expect(judge(COPY, [segment(A, C)])).toEqual({
			status: 'incorrect',
			feedback: missingSideFeedback('B', 'C')
		});
		expect(judge(COPY, [segment(A, C), segment(B, { x: 10, y: 7 })])).toEqual({
			status: 'incorrect',
			feedback: notJoinedFeedback('A', 'B', 'C')
		});
	});

	it('[AB] prolongé seul : les deux côtés manquent', () => {
		expect(judge(COPY, [segment(B, { x: 13, y: 4 })])).toEqual({
			status: 'incorrect',
			feedback: missingSidesFeedback('A', 'B', 'C')
		});
	});

	it('trait de trop', () => {
		expect(
			judge(COPY, [segment(A, C), segment(B, C), segment({ x: 1, y: 7 }, { x: 3, y: 7 })])
		).toEqual({ status: 'incorrect', feedback: EXTRA_SEGMENT_FEEDBACK });
	});

	it('un point placé : réponse forgée', () => {
		expect(
			judge(COPY, [segment(A, C), segment(B, C), { kind: 'point', x: 9, y: 7 } as DrawnObject])
		).toEqual({ status: 'incorrect' });
	});

	it('correction : [AC] et [BC], sans arc ni codage', () => {
		const checks = checksOf(COPY);
		const points = constructionPositions(COPY);
		const shapes = constructionShapes(COPY);
		expect(solutionLines(checks, points, [], shapes)).toEqual([segment(A, C), segment(B, C)]);
		expect(solutionTriangle(checks, points, shapes, [])).toEqual({
			arcs: [],
			marks: [],
			angles: [],
			rightAngles: [],
			guides: []
		});
	});
});

describe('triangle à reproduire, forme 2 : seul A placé', () => {
	it('juste : les trois côtés, dans n’importe quel ordre et sens', () => {
		expect(judge(FREE, [segment(A2, B2), segment(B2, C2), segment(C2, A2)])).toEqual({
			status: 'correct'
		});
		expect(judge(FREE, [segment(C2, B2), segment(A2, C2), segment(B2, A2)])).toEqual({
			status: 'correct'
		});
	});

	it('un sommet mal placé, puis les deux', () => {
		const offC = { x: 10, y: 4 };
		expect(judge(FREE, [segment(A2, B2), segment(B2, offC), segment(offC, A2)])).toEqual({
			status: 'incorrect',
			feedback: wrongCopyVertexFeedback('C', 'A')
		});
		const offB = { x: 11, y: 1 };
		expect(judge(FREE, [segment(A2, offB), segment(offB, C2), segment(C2, A2)])).toEqual({
			status: 'incorrect',
			feedback: wrongCopyVertexFeedback('B', 'A')
		});
		expect(judge(FREE, [segment(A2, offB), segment(offB, offC), segment(offC, A2)])).toEqual({
			status: 'incorrect',
			feedback: wrongCopyVerticesFeedback('B', 'C', 'A')
		});
	});

	it('triangle retourné', () => {
		const b = { x: 4, y: 1 };
		const c = { x: 7, y: 4 };
		expect(judge(FREE, [segment(A2, b), segment(b, c), segment(c, A2)])).toEqual({
			status: 'incorrect',
			feedback: FLIPPED_COPY_FEEDBACK
		});
	});

	it('le modèle déplacé, commencé à un autre coin que D', () => {
		// A au coin de E : (8 ; 1) → (4 ; 1) → (5 ; 4)
		const b = { x: 4, y: 1 };
		const c = { x: 5, y: 4 };
		expect(judge(FREE, [segment(A2, b), segment(b, c), segment(c, A2)])).toEqual({
			status: 'incorrect',
			feedback: wrongCornerFeedback('A', 'D')
		});
		// A au coin de F : (8 ; 1), (7 ; -2) hors fenêtre → sur une figure plus haute
		const high = [
			'fenetre: 0 ; 14 ; -4 ; 8',
			'grille: 1',
			'verifier: triangle ABC : reproduit DEF',
			'---',
			...MODEL,
			'A = point(8, 1)'
		].join('\n');
		const p = { x: 7, y: -2 };
		const q = { x: 11, y: -2 };
		expect(judge(high, [segment(A2, p), segment(p, q), segment(q, A2)])).toEqual({
			status: 'incorrect',
			feedback: wrongCornerFeedback('A', 'D')
		});
	});

	it('triangle qui ne part pas de A', () => {
		const shift = (p: Position) => ({ x: p.x + 1, y: p.y + 1 });
		expect(
			judge(FREE, [
				segment(shift(A2), shift(B2)),
				segment(shift(B2), shift(C2)),
				segment(shift(C2), shift(A2))
			])
		).toEqual({ status: 'incorrect', feedback: copyStartFeedback('A') });
	});

	it('figure pas fermée', () => {
		expect(judge(FREE, [segment(A2, B2), segment(B2, C2)])).toEqual({
			status: 'incorrect',
			feedback: NOT_CLOSED_FEEDBACK
		});
	});

	it('rien de tracé', () => {
		expect(judge(FREE, [])).toEqual({ status: 'empty' });
	});

	it('correction : les trois côtés', () => {
		const checks = checksOf(FREE);
		expect(
			solutionLines(checks, constructionPositions(FREE), [], constructionShapes(FREE))
		).toEqual([segment(A2, B2), segment(B2, C2), segment(A2, C2)]);
	});
});
