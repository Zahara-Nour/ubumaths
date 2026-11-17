/**
 * Juge d'une case « figure » : construire un triangle de trois longueurs données
 * (`verifier: triangle ABC : AC = u ; BC = v`, chantier `controles-figure`, lot 4,
 * phase 0 validée par David le 2026-11-03, `docs/archive/wip/controles-figure-progress.md`
 * § 13).
 *
 * Le côté [AB] est tracé ; les longueurs à reporter sont des segments de la figure
 * (ou deux points visibles : `AC = AB`). L'élève reporte au compas (geste Report),
 * puis trace [AC] et [BC] au segment ; C = leur extrémité commune, construite
 * (intersection de deux cercles construits). Les deux côtés de (AB) sont justes.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	missingSideFeedback,
	missingSidesFeedback,
	notJoinedFeedback,
	vertexEyeballedFeedback,
	wrongLengthFeedback
} from '../triangle';
import { intersectTraits, traitOf, type Trait } from '../instruments';
import { solutionLines } from '../drawing';
import { serializeConstructionAnswer, type DrawnObject } from '../answer';
import type { Position } from '../judge';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';

function checksOf(source: string) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return spec.checks;
}

function judge(source: string, objects: DrawnObject[] | string) {
	const answer = typeof objects === 'string' ? objects : serializeConstructionAnswer(objects);
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

function figure(
	verifier: string,
	body: string[],
	header: string[] = [],
	window = '0 ; 12 ; 0 ; 9'
): string {
	return [`fenetre: ${window}`, ...header, `verifier: ${verifier}`, '---', ...body].join('\n');
}

const segment = (p: Position, q: Position): DrawnObject => ({
	kind: 'segment',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});
const cercle = (center: Position, through: Position): DrawnObject => ({
	kind: 'cercle',
	cx: center.x,
	cy: center.y,
	x: through.x,
	y: through.y
});
/** Report : cercle centré en `center`, de l'écartement [ab] */
const report = (center: Position, a: Position, b: Position): DrawnObject => ({
	kind: 'report',
	cx: center.x,
	cy: center.y,
	ax: a.x,
	ay: a.y,
	bx: b.x,
	by: b.y
});

/** Intersections de deux objets tracés, comme l'aimantation les donne (triées par y) */
function cross(p: DrawnObject, q: DrawnObject): Position[] {
	return intersectTraits(traitOf(p) as Trait, traitOf(q) as Trait).sort((u, v) => u.y - v.y);
}

// A(2 ; 2), B(8 ; 2) : AB = 6 ; u = 4 (de U1 à U2), v = 3 (de V1 à V2)
const A = { x: 2, y: 2 };
const B = { x: 8, y: 2 };
const U1 = { x: 1, y: 8 };
const U2 = { x: 5, y: 8 };
const V1 = { x: 7, y: 8 };
const V2 = { x: 10, y: 8 };
const BODY = [
	'A = point(2, 2)',
	'B = point(8, 2)',
	's = segment(A, B)',
	'u = segment(point(1, 8), point(5, 8))',
	'v = segment(point(7, 8), point(10, 8))'
];
const TRIANGLE = figure('triangle ABC : AC = u ; BC = v', BODY);

const REPORT_A = report(A, U1, U2);
const REPORT_B = report(B, V1, V2);
const [C_LOW, C_HIGH] = cross(REPORT_A, REPORT_B);

describe('vérification triangle : lecture de l’en-tête', () => {
	it('lit les sommets et les longueurs ; palette Segment · Compas · Report · Règle', () => {
		const { spec, errors } = readConstructionHeader(TRIANGLE);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{
				kind: 'triangle',
				points: ['A', 'B', 'C'],
				lengths: [
					{ side: ['A', 'C'], source: ['u'] },
					{ side: ['B', 'C'], source: ['v'] }
				],
				angles: [],
				line: 2
			}
		]);
		expect(spec.tools).toEqual(['segment', 'compas', 'report', 'droite']);
	});

	it('une longueur par deux points : AC = AB (isocèle)', () => {
		const { spec, errors } = readConstructionHeader(
			figure('triangle ABC : AC = AB ; BC = v', BODY)
		);
		expect(errors).toEqual([]);
		expect(spec.checks[0]).toMatchObject({
			lengths: [
				{ side: ['A', 'C'], source: ['A', 'B'] },
				{ side: ['B', 'C'], source: ['v'] }
			]
		});
	});

	it('longueurs dans l’autre ordre, côté écrit CA', () => {
		const { spec, errors } = readConstructionHeader(figure('triangle ABC : BC = v ; CA = u', BODY));
		expect(errors).toEqual([]);
		expect(spec.checks[0]).toMatchObject({
			lengths: [
				{ side: ['A', 'C'], source: ['u'] },
				{ side: ['B', 'C'], source: ['v'] }
			]
		});
	});

	it('refuse un côté qui ne passe pas par C', () => {
		const source = figure('triangle ABC : AB = u ; BC = v', BODY);
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(/\[AC\] ou \[BC\]/);
	});

	it('refuse une longueur manquante', () => {
		const source = figure('triangle ABC : AC = u', BODY);
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(
			/triangle ABC : AC = u ; BC = v/
		);
	});

	it('refuse le quadrillage', () => {
		const source = figure('triangle ABC : AC = u ; BC = v', BODY, ['grille: 1']);
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(/papier uni/);
	});

	it('refuse de mêler un triangle à d’autres vérifications', () => {
		const source = [
			'fenetre: 0 ; 12 ; 0 ; 9',
			'verifier: triangle ABC : AC = u ; BC = v',
			'verifier: droite_par A ; B',
			'---',
			...BODY
		].join('\n');
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(/ne se mêle pas/);
	});
});

describe('triangle : juste', () => {
	it('deux reports, côtés jusqu’à l’intersection du haut', () => {
		const objects = [REPORT_A, REPORT_B, segment(A, C_HIGH), segment(B, C_HIGH)];
		expect(judge(TRIANGLE, objects)).toEqual({ status: 'correct' });
	});

	it('l’autre côté de (AB) aussi (décision 4)', () => {
		const objects = [REPORT_A, REPORT_B, segment(A, C_LOW), segment(B, C_LOW)];
		expect(judge(TRIANGLE, objects)).toEqual({ status: 'correct' });
	});

	it('côtés tracés depuis C, traits de construction en trop', () => {
		const extra = report(A, V1, V2);
		const objects = [
			REPORT_A,
			extra,
			REPORT_B,
			{ kind: 'droite', x1: 0, y1: 5, x2: 3, y2: 6 } as DrawnObject,
			segment(C_HIGH, A),
			segment(C_HIGH, B)
		];
		expect(judge(TRIANGLE, objects)).toEqual({ status: 'correct' });
	});

	it('équilatéral au compas, sans report (AC = AB ; BC = AB)', () => {
		const source = figure('triangle ABC : AC = AB ; BC = AB', BODY);
		const arcs = [cercle(A, B), cercle(B, A)];
		const top = cross(arcs[0], arcs[1])[1];
		expect(judge(source, [...arcs, segment(A, top), segment(B, top)])).toEqual({
			status: 'correct'
		});
	});
});

describe('triangle : faux, première cause', () => {
	it('aucun côté', () => {
		expect(judge(TRIANGLE, [REPORT_A, REPORT_B])).toEqual({
			status: 'incorrect',
			feedback: missingSidesFeedback('A', 'B', 'C')
		});
		expect(missingSidesFeedback('A', 'B', 'C')).toBe('Trace les côtés [AC] et [BC] du triangle.');
	});

	it('un seul côté', () => {
		expect(judge(TRIANGLE, [REPORT_A, REPORT_B, segment(A, C_HIGH)])).toEqual({
			status: 'incorrect',
			feedback: missingSideFeedback('B', 'C')
		});
		expect(missingSideFeedback('B', 'C')).toBe('Il manque le côté [BC].');
	});

	it('deux côtés qui ne se rejoignent pas', () => {
		const objects = [REPORT_A, REPORT_B, segment(A, C_HIGH), segment(B, C_LOW)];
		expect(judge(TRIANGLE, objects)).toEqual({
			status: 'incorrect',
			feedback: notJoinedFeedback('A', 'B', 'C')
		});
		expect(notJoinedFeedback('A', 'B', 'C')).toBe(
			'Tes côtés [AC] et [BC] doivent se rejoindre en C.'
		);
	});

	it('C à l’œil, même au bon endroit arrondi', () => {
		const eyeballed = { x: Math.round(C_HIGH.x * 100) / 100, y: Math.round(C_HIGH.y * 100) / 100 };
		const objects = [segment(A, eyeballed), segment(B, eyeballed)];
		expect(judge(TRIANGLE, objects)).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedFeedback('C')
		});
		expect(vertexEyeballedFeedback('C')).toBe(
			'Ton sommet C est placé à l’œil : construis-le avec ton compas.'
		);
	});

	it('compas ouvert à l’œil pile au bon rayon : C n’est pas construit', () => {
		// Rayon 4 depuis A, pris sur un point libre (6 ; 2) de [AB]
		const free = cercle(A, { x: 6, y: 2 });
		const top = cross(free, REPORT_B)[1];
		const objects = [free, REPORT_B, segment(A, top), segment(B, top)];
		expect(judge(TRIANGLE, objects)).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedFeedback('C')
		});
	});

	it('report d’un écartement pris à l’œil : C n’est pas construit', () => {
		const loose = report(A, { x: 1, y: 7 }, { x: 5, y: 7 });
		const top = cross(loose, REPORT_B)[1];
		const objects = [loose, REPORT_B, segment(A, top), segment(B, top)];
		expect(judge(TRIANGLE, objects)).toEqual({
			status: 'incorrect',
			feedback: vertexEyeballedFeedback('C')
		});
	});

	it('C construit, mauvaise longueur (u reporté des deux côtés)', () => {
		const wrong = report(B, U1, U2);
		const top = cross(REPORT_A, wrong)[1];
		const objects = [REPORT_A, wrong, segment(A, top), segment(B, top)];
		expect(judge(TRIANGLE, objects)).toEqual({
			status: 'incorrect',
			feedback: wrongLengthFeedback('B', 'C')
		});
		expect(wrongLengthFeedback('B', 'C')).toBe('Ton côté [BC] n’a pas la bonne longueur.');
	});

	it('longueurs échangées : [AC] fautif d’abord', () => {
		const swappedA = report(A, V1, V2);
		const swappedB = report(B, U1, U2);
		const top = cross(swappedA, swappedB)[1];
		const objects = [swappedA, swappedB, segment(A, top), segment(B, top)];
		expect(judge(TRIANGLE, objects)).toEqual({
			status: 'incorrect',
			feedback: wrongLengthFeedback('A', 'C')
		});
	});

	it('un point posé (outil absent de la palette) : réponse forgée', () => {
		const objects = [
			REPORT_A,
			REPORT_B,
			segment(A, C_HIGH),
			segment(B, C_HIGH),
			{ kind: 'point', x: C_HIGH.x, y: C_HIGH.y } as DrawnObject
		];
		expect(judge(TRIANGLE, objects)).toEqual({ status: 'incorrect' });
	});

	it('rien tracé : vide', () => {
		expect(judge(TRIANGLE, [])).toEqual({ status: 'empty' });
	});
});

describe('triangle : erreurs d’auteur', () => {
	it('figure faisable : rien', () => {
		expect(() => assertChecks(TRIANGLE)).not.toThrow();
	});

	it('longueurs impossibles (inégalité triangulaire)', () => {
		const body = [...BODY.slice(0, 4), 'v = segment(point(7, 8), point(8, 8))'];
		const source = figure('triangle ABC : AC = u ; BC = v', body);
		expect(() => assertChecks(source)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(source)).toThrow(/ne font pas un triangle/);
	});

	it('les deux C possibles hors de la fenêtre', () => {
		const source = figure('triangle ABC : AC = u ; BC = v', BODY, [], '0 ; 12 ; 1.5 ; 9');
		// C du bas (y ≈ 0,22) hors ; celui du haut (y ≈ 3,78) dedans : faisable
		expect(() => assertChecks(source)).not.toThrow();
		// Équilatéral de côté 6 sur [AB] : C à y ≈ 7,2 ou y ≈ −3,2, fenêtre 0..7
		const body = [...BODY.slice(0, 3), 'u = segment(point(1, 6.5), point(7, 6.5))'];
		const tight = figure('triangle ABC : AC = u ; BC = u', body, [], '0 ; 12 ; 0 ; 7');
		expect(() => assertChecks(tight)).toThrow(/hors de la fenêtre/);
	});

	it('longueur d’un segment inconnu', () => {
		const source = figure('triangle ABC : AC = w ; BC = v', BODY);
		expect(() => assertChecks(source)).toThrow(/w/);
	});

	it('C déjà dans la figure', () => {
		const source = figure('triangle ABC : AC = u ; BC = v', [...BODY, 'C = point(5, 5)']);
		expect(() => assertChecks(source)).toThrow(/existe déjà/);
	});

	it('A hors de la fenêtre (revue du lot 4)', () => {
		const body = ['A = point(-0.5, 2)', 'B = point(5.5, 2)', ...BODY.slice(2)];
		const source = figure('triangle ABC : AC = u ; BC = v', body);
		expect(() => assertChecks(source)).toThrow(/A est hors de la fenêtre/);
	});

	it('A invisible', () => {
		const body = ['A = point(2, 2, visible=faux)', ...BODY.slice(1)];
		const source = figure('triangle ABC : AC = u ; BC = v', body);
		expect(() => assertChecks(source)).toThrow(/n’est pas visible/);
	});
});

describe('triangle : correction', () => {
	it('les côtés [AC] et [BC], du côté où l’élève a tracé', () => {
		const lines = solutionLines(
			checksOf(TRIANGLE),
			constructionPositions(TRIANGLE),
			[segment(A, C_LOW)],
			constructionShapes(TRIANGLE),
			constructionExpected(TRIANGLE)
		);
		expect(lines).toHaveLength(2);
		const ends = lines.map((l) => ({ x: l.x2, y: l.y2 }));
		for (const end of ends) {
			expect(end.x).toBeCloseTo(C_LOW.x, 9);
			expect(end.y).toBeCloseTo(C_LOW.y, 9);
		}
		expect(lines.every((l) => l.kind === 'segment')).toBe(true);
	});

	it('égalité (seulement [AB] repassé) : le C du haut (revue du lot 4)', () => {
		const lines = solutionLines(
			checksOf(TRIANGLE),
			constructionPositions(TRIANGLE),
			[segment(A, B)],
			constructionShapes(TRIANGLE),
			constructionExpected(TRIANGLE)
		);
		expect(lines[0].y2).toBeCloseTo(C_HIGH.y, 9);
	});

	it('sans tracé : le C du haut', () => {
		const lines = solutionLines(
			checksOf(TRIANGLE),
			constructionPositions(TRIANGLE),
			[],
			constructionShapes(TRIANGLE),
			constructionExpected(TRIANGLE)
		);
		expect(lines[0].y2).toBeCloseTo(C_HIGH.y, 9);
	});
});

describe('aide à l’écriture : les exemples du lot 4 se construisent', () => {
	it.each([
		'Construire un triangle de trois longueurs données',
		'Placer le 4e sommet d’un parallélogramme'
	])('%s', async (title) => {
		const { figureACompleterEntry } = await import('$lib/block-catalog/figure-a-completer');
		const example = figureACompleterEntry.examples.find((e) => e.title === title);
		expect(example).toBeDefined();
		const lines = (example?.source ?? '').split('\n');
		const source = lines.slice(1, -1).join('\n');
		expect(() => assertChecks(source)).not.toThrow();
	});
});
