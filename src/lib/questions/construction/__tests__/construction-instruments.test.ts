/**
 * Instruments sur papier uni (chantier `controles-figure`, lot 2b, phase 0 validée
 * par David le 2026-11-02, `docs/wip/controles-figure-progress.md` § 7).
 *
 * Palette déduite sans `grille:` (Règle, Équerre, Compas, Point ; Segment en plus
 * pour un symétrique de figure) ; équerre = perpendiculaire à une droite par un
 * point ; compas = cercle par son centre et un point ; aimantation : point
 * nommé → intersection de deux traits → sur un trait → libre. Les constructions
 * sont jouées comme à l'écran : touchers aimantés, puis réponse jugée.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { assertConstructionChecks, judgeConstruction, type Position } from '../judge';
import {
	POINT_EYEBALLED_FEEDBACK,
	notPerpendicularFeedback,
	notSameDistanceFeedback
} from '../point';
import { SYMMETRY_MISSING_FEEDBACK } from '../symmetry';
import {
	addTap,
	canErase,
	cancelPending,
	chooseGuide,
	eraseLast,
	snapWithInstruments,
	type Drawing
} from '../drawing';
import {
	intersectTraits,
	intersectionsOf,
	lineCrossesFrame,
	perpendicularThrough,
	snapInstrument,
	straightAt,
	traitsOfObjects,
	type SnapTargets,
	type Trait
} from '../instruments';
import {
	CONSTRUCTION_ANSWER_LIMITS,
	parseConstructionAnswer,
	serializeConstructionAnswer
} from '../answer';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';
import type { ConstructionTool } from '$lib/ubumark/types/construction';

// ============================================================================
// FIGURES
// ============================================================================

function figure(verifier: string | string[], body: string[], header: string[] = []): string {
	const checks = Array.isArray(verifier) ? verifier : [verifier];
	return [
		'fenetre: 0 ; 12 ; 0 ; 8',
		...header,
		...checks.map((c) => `verifier: ${c}`),
		'---',
		...body
	].join('\n');
}

// Axe oblique y = x, papier uni ; A(2 ; 5) → A'(5 ; 2) ; pied de la perpendiculaire H(3,5 ; 3,5)
const AXIS_BODY = ['P = point(0, 0)', 'Q = point(8, 8)', 'd = droite(P, Q)', 'A = point(2, 5)'];
const OBLIQUE = figure("point A' = symetrie(A, axe=d)", AXIS_BODY);

// Centre O(6 ; 4) ; A(2 ; 5) → A'(10 ; 3)
const CENTRAL = figure("point A' = symetrie(A, centre=O)", ['O = point(6, 4)', 'A = point(2, 5)']);

// Triangle ABC et son symétrique par l'axe y = x : A'(5 ; 2), B'(2 ; 3), C'(2,5 ; 0,5)
const TRIANGLE = figure('symetrique par d', [
	...AXIS_BODY,
	'B = point(3, 2)',
	'C = point(0.5, 2.5)',
	'polygone(A, B, C)'
]);

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

// ============================================================================
// L'ÉCRAN, JOUÉ : touchers aimantés comme dans FigureACompleterView
// ============================================================================

/** Rayon d'aimantation en unités de la figure (≈ 24 px sur une figure de 12 unités) */
const RADIUS = 0.4;

class Screen {
	drawing: Drawing = { objects: [], start: null };
	constructor(private source: string) {}

	private targets(): SnapTargets {
		const traits = [
			...constructionShapes(this.source).traits,
			...traitsOfObjects(this.drawing.objects)
		];
		const placed = this.drawing.objects.flatMap((o) => (o.kind === 'point' ? [o] : []));
		return {
			points: [...constructionPositions(this.source).values(), ...placed],
			intersections: intersectionsOf(traits),
			traits
		};
	}

	/** Un toucher à peu près là (le doigt), avec l'outil donné */
	tap(tool: ConstructionTool, x: number, y: number): this {
		const targets = this.targets();
		if (tool === 'equerre' && !this.drawing.guide) {
			const guide = straightAt({ x, y }, targets.traits, RADIUS);
			if (guide) this.drawing = chooseGuide(this.drawing, guide);
			return this;
		}
		this.drawing = addTap(this.drawing, snapWithInstruments({ x, y }, targets, RADIUS), tool);
		return this;
	}

	get answer(): string {
		return serializeConstructionAnswer(this.drawing.objects);
	}
}

// ============================================================================
// LECTURE : palette déduite
// ============================================================================

describe('palette déduite', () => {
	it('point sans quadrillage : règle, équerre, compas, point', () => {
		expect(readConstructionHeader(OBLIQUE).spec.tools).toEqual([
			'droite',
			'equerre',
			'compas',
			'point'
		]);
	});

	it('symétrique sans quadrillage : segment, règle, équerre, compas', () => {
		expect(readConstructionHeader(TRIANGLE).spec.tools).toEqual([
			'segment',
			'droite',
			'equerre',
			'compas'
		]);
	});

	it('avec quadrillage : un seul outil, comme avant', () => {
		const source = figure("point A' = symetrie(A, axe=d)", AXIS_BODY, ['grille: 1']);
		expect(readConstructionHeader(source).spec.tools).toEqual(['point']);
	});

	it('« grille: non » : papier uni', () => {
		const source = figure("point A' = symetrie(A, axe=d)", AXIS_BODY, ['grille: non']);
		expect(readConstructionHeader(source).spec.tools).toContain('compas');
	});

	it('outils: écrit par le prof : restreint la palette', () => {
		const source = figure("point A' = symetrie(A, axe=d)", AXIS_BODY, ['outils: compas, point']);
		const { spec, errors } = readConstructionHeader(source);
		expect(errors).toEqual([]);
		expect(spec.tools).toEqual(['compas', 'point']);
	});

	it('sans quadrillage, sans instrument : refusé', () => {
		const source = figure("point A' = symetrie(A, axe=d)", AXIS_BODY, ['outils: point']);
		expect(
			readConstructionHeader(source)
				.errors.map((e) => e.message)
				.join(' ')
		).toContain('sans quadrillage, point demande les instruments');
	});

	it('plusieurs outils pour une droite : refusé', () => {
		const source = figure('droite_par P ; Q', AXIS_BODY, ['outils: droite, equerre']);
		expect(
			readConstructionHeader(source)
				.errors.map((e) => e.message)
				.join(' ')
		).toContain('droite_par : un seul outil par figure');
	});
});

describe('réponse `cercle(cx;cy;x;y)`', () => {
	it('lue et réécrite', () => {
		expect(parseConstructionAnswer('cercle(3.5;3.5;2;5)|point(5;2)')).toEqual([
			{ kind: 'cercle', cx: 3.5, cy: 3.5, x: 2, y: 5 },
			{ kind: 'point', x: 5, y: 2 }
		]);
		expect(serializeConstructionAnswer([{ kind: 'cercle', cx: 1, cy: 2, x: 3, y: 4 }])).toBe(
			'cercle(1;2;3;4)'
		);
	});

	it.each(['cercle(1;2;1;2)', 'cercle(1;2;3)', 'cercle(1e7;0;1;1)'])(
		'« %s » illisible',
		(answer) => {
			expect(parseConstructionAnswer(answer)).toBeNull();
		}
	);

	it('vingt traits en pleine précision tiennent dans le plafond', () => {
		const third = 1 / 3;
		const objects = Array.from({ length: CONSTRUCTION_ANSWER_LIMITS.objects }, () => ({
			kind: 'droite' as const,
			x1: -third * 7,
			y1: third * 11,
			x2: third * 13,
			y2: -third * 5
		}));
		const answer = serializeConstructionAnswer(objects);
		expect(answer.length).toBeLessThanOrEqual(CONSTRUCTION_ANSWER_LIMITS.chars);
		expect(parseConstructionAnswer(answer)).toHaveLength(CONSTRUCTION_ANSWER_LIMITS.objects);
	});
});

// ============================================================================
// GÉOMÉTRIE DES INSTRUMENTS
// ============================================================================

const line = (ax: number, ay: number, bx: number, by: number): Trait => ({
	kind: 'line',
	a: { x: ax, y: ay },
	b: { x: bx, y: by }
});
const segment = (ax: number, ay: number, bx: number, by: number): Trait => ({
	kind: 'segment',
	a: { x: ax, y: ay },
	b: { x: bx, y: by }
});
const circle = (x: number, y: number, radius: number): Trait => ({
	kind: 'circle',
	center: { x, y },
	radius
});

const sorted = (points: Position[]) =>
	points
		.map((p) => ({ x: Math.round(p.x * 1e9) / 1e9 + 0, y: Math.round(p.y * 1e9) / 1e9 + 0 }))
		.sort((p, q) => p.x - q.x || p.y - q.y);

describe('intersections', () => {
	it('deux droites', () => {
		expect(sorted(intersectTraits(line(0, 0, 1, 1), line(0, 4, 1, 3)))).toEqual([{ x: 2, y: 2 }]);
	});

	it('parallèles : aucune', () => {
		expect(intersectTraits(line(0, 0, 1, 1), line(0, 1, 1, 2))).toEqual([]);
	});

	it('un segment s’arrête à ses bouts', () => {
		expect(intersectTraits(segment(0, 0, 1, 1), line(0, 4, 1, 3))).toEqual([]);
		expect(sorted(intersectTraits(segment(0, 0, 2, 2), line(0, 4, 1, 3)))).toEqual([
			{ x: 2, y: 2 }
		]);
	});

	it('droite et cercle : deux, une (tangente) ou aucune', () => {
		expect(sorted(intersectTraits(line(-5, 0, 5, 0), circle(0, 0, 2)))).toEqual([
			{ x: -2, y: 0 },
			{ x: 2, y: 0 }
		]);
		expect(sorted(intersectTraits(line(-5, 2, 5, 2), circle(0, 0, 2)))).toEqual([{ x: 0, y: 2 }]);
		expect(intersectTraits(line(-5, 3, 5, 3), circle(0, 0, 2))).toEqual([]);
	});

	it('deux cercles : deux, ou aucune', () => {
		expect(sorted(intersectTraits(circle(0, 0, 5), circle(6, 0, 5)))).toEqual([
			{ x: 3, y: -4 },
			{ x: 3, y: 4 }
		]);
		expect(intersectTraits(circle(0, 0, 1), circle(6, 0, 1))).toEqual([]);
	});

	it('toutes les intersections, sans doublon', () => {
		// Trois droites concourantes en (0 ; 0) : un seul point
		const traits = [line(0, 0, 1, 0), line(0, 0, 0, 1), line(0, 0, 1, 1)];
		expect(sorted(intersectionsOf(traits))).toEqual([{ x: 0, y: 0 }]);
	});
});

describe('aimantation des instruments', () => {
	const targets: SnapTargets = {
		points: [{ x: 1, y: 1 }],
		intersections: [{ x: 2, y: 2 }],
		traits: [line(0, 0, 1, 1), circle(5, 5, 1)]
	};

	it('un point nommé passe avant une intersection', () => {
		expect(
			snapInstrument({ x: 1.3, y: 1.3 }, { ...targets, intersections: [{ x: 1.2, y: 1.2 }] }, 0.5)
		).toEqual({
			x: 1,
			y: 1
		});
	});

	it('une intersection passe avant un trait', () => {
		expect(snapInstrument({ x: 2.2, y: 2 }, targets, 0.5)).toEqual({ x: 2, y: 2 });
	});

	it('près d’un trait seulement : ramené sur le trait', () => {
		expect(snapInstrument({ x: 4, y: 3.8 }, targets, 0.5)).toEqual({ x: 3.9, y: 3.9 });
		expect(snapInstrument({ x: 6.2, y: 5 }, targets, 0.5)).toEqual({ x: 6, y: 5 });
	});

	it('loin de tout : libre (null), arrondi par l’écran', () => {
		expect(snapInstrument({ x: 9, y: 1 }, targets, 0.5)).toBeNull();
		expect(snapWithInstruments({ x: 9.123, y: 1.456 }, targets, 0.5)).toEqual({ x: 9.12, y: 1.46 });
	});

	it('équerre : la droite la plus proche, jamais un cercle', () => {
		expect(straightAt({ x: 5, y: 6.1 }, targets.traits, 0.5)).toBeNull();
		expect(straightAt({ x: 3, y: 3.2 }, targets.traits, 0.5)).toEqual(line(0, 0, 1, 1));
	});

	it('perpendiculaire par un point', () => {
		const perpendicular = perpendicularThrough(line(0, 0, 1, 1) as never, { x: 2, y: 5 });
		expect(perpendicular).toEqual({ kind: 'droite', x1: 2, y1: 5, x2: 1, y2: 6 });
	});

	it('une droite traverse-t-elle la fenêtre ?', () => {
		const frame = { xMin: 0, xMax: 12, yMin: 0, yMax: 8 };
		expect(lineCrossesFrame({ x: 0, y: 0 }, { x: 8, y: 8 }, frame)).toBe(true);
		expect(lineCrossesFrame({ x: 20, y: 0 }, { x: 20, y: 8 }, frame)).toBe(false);
	});
});

describe('gestes', () => {
	const guide = line(0, 0, 1, 1) as Extract<Trait, { a: Position }>;

	it('équerre : un toucher sans droite choisie ne trace rien', () => {
		const empty: Drawing = { objects: [], start: null };
		expect(addTap(empty, { x: 2, y: 5 }, 'equerre')).toBe(empty);
	});

	it('équerre : la droite, puis le point → la perpendiculaire ; la droite choisie s’efface', () => {
		const chosen = chooseGuide({ objects: [], start: null }, guide);
		expect(canErase(chosen)).toBe(true);
		expect(eraseLast(chosen)).toEqual({ objects: [], start: null });
		expect(addTap(chosen, { x: 2, y: 5 }, 'equerre')).toEqual({
			objects: [{ kind: 'droite', x1: 2, y1: 5, x2: 1, y2: 6 }],
			start: null
		});
	});

	it('compas : le centre, puis un point → le cercle ; deux fois le centre : rien', () => {
		const centred = addTap({ objects: [], start: null }, { x: 3, y: 3 }, 'compas');
		expect(centred.start).toEqual({ x: 3, y: 3 });
		expect(addTap(centred, { x: 3, y: 3 }, 'compas')).toBe(centred);
		expect(addTap(centred, { x: 2, y: 5 }, 'compas').objects).toEqual([
			{ kind: 'cercle', cx: 3, cy: 3, x: 2, y: 5 }
		]);
	});

	it('changer d’outil : le départ et la droite en attente sont oubliés', () => {
		expect(cancelPending({ objects: [], start: { x: 1, y: 1 } })).toEqual({
			objects: [],
			start: null
		});
		expect(cancelPending(chooseGuide({ objects: [], start: null }, guide))).toEqual({
			objects: [],
			start: null
		});
	});
});

// ============================================================================
// JUGE : symétrique d'un point sur papier uni
// ============================================================================

describe('symétrique d’un point, papier uni — juste', () => {
	it('équerre, compas au pied H, point à l’autre intersection', () => {
		const screen = new Screen(OBLIQUE)
			.tap('equerre', 6, 6.2) // la droite d
			.tap('equerre', 2.1, 5) // par A (aimanté)
			.tap('compas', 3.6, 3.4) // centre : H, intersection de d et de la perpendiculaire
			.tap('compas', 2, 5.1) // par A
			.tap('point', 5.1, 2.1); // l'autre intersection
		expect(judge(OBLIQUE, screen.answer)).toEqual({ status: 'correct' });
	});

	it('deux cercles centrés sur l’axe (compas piqué « sur l’axe »), passant par A', () => {
		const screen = new Screen(OBLIQUE)
			.tap('compas', 1.2, 0.9) // sur d, près de (1 ; 1)
			.tap('compas', 2, 5)
			.tap('compas', 6.1, 5.9) // sur d, près de (6 ; 6)
			.tap('compas', 2, 5)
			.tap('point', 5.1, 1.9);
		expect(judge(OBLIQUE, screen.answer)).toEqual({ status: 'correct' });
	});

	it('symétrie centrale : la règle par A et O, le compas centré en O par A', () => {
		const screen = new Screen(CENTRAL)
			.tap('droite', 2, 5)
			.tap('droite', 6, 4)
			.tap('compas', 6, 4)
			.tap('compas', 2, 5)
			.tap('point', 9.9, 3.1);
		expect(judge(CENTRAL, screen.answer)).toEqual({ status: 'correct' });
	});
});

describe('symétrique d’un point, papier uni — faux', () => {
	it('posé à l’œil, tout près de A’ : « placé à l’œil »', () => {
		expect(judge(OBLIQUE, 'point(5.01;2)')).toEqual({
			status: 'incorrect',
			feedback: POINT_EYEBALLED_FEEDBACK
		});
	});

	it('sur un seul trait (la perpendiculaire), pas à une intersection : « placé à l’œil »', () => {
		const screen = new Screen(OBLIQUE)
			.tap('equerre', 6, 6.2)
			.tap('equerre', 2.1, 5)
			.tap('point', 6.1, 1);
		expect(judge(OBLIQUE, screen.answer)).toEqual({
			status: 'incorrect',
			feedback: POINT_EYEBALLED_FEEDBACK
		});
	});

	it('sur la perpendiculaire, compas mal centré : « même distance »', () => {
		// Compas piqué en (0,5 ; 3), hors de l'axe, par A : recoupe la perpendiculaire en (2,5 ; 4,5)
		const screen = new Screen(OBLIQUE)
			.tap('equerre', 6, 6.2)
			.tap('equerre', 2.1, 5)
			.tap('compas', 0.5, 3)
			.tap('compas', 2, 5)
			.tap('point', 2.6, 4.4);
		expect(screen.drawing.objects.at(-1)).toEqual({ kind: 'point', x: 2.5, y: 4.5 });
		expect(judge(OBLIQUE, screen.answer)).toEqual({
			status: 'incorrect',
			feedback: notSameDistanceFeedback('A', "A'")
		});
	});

	it('à la bonne distance de l’axe, hors de la perpendiculaire : « perpendiculaire »', () => {
		// Parallèle à d par A (règle aimantée sur A puis sur d), coupée par la droite x = 4
		const screen = new Screen(OBLIQUE);
		screen.drawing = {
			objects: [
				{ kind: 'droite', x1: 2, y1: 5, x2: 3, y2: 6 },
				{ kind: 'droite', x1: 4, y1: 0, x2: 4, y2: 8 }
			],
			start: null
		};
		screen.tap('point', 4.1, 7.1);
		expect(screen.drawing.objects.at(-1)).toEqual({ kind: 'point', x: 4, y: 7 });
		expect(judge(OBLIQUE, screen.answer)).toEqual({
			status: 'incorrect',
			feedback: notPerpendicularFeedback('A', "A'")
		});
	});
});

describe('symétrique d’un point, papier uni — erreurs d’auteur', () => {
	it('symétrie par un axe ou un centre : admise', () => {
		expect(() => assertChecks(OBLIQUE)).not.toThrow();
		expect(() => assertChecks(CENTRAL)).not.toThrow();
	});

	it('autre expression (milieu) : refusée sans quadrillage', () => {
		expect(() => assertChecks(figure("point M' = milieu(A, Q)", AXIS_BODY))).toThrow(
			'sans quadrillage, seulement un symétrique'
		);
	});

	it('axe hors de la fenêtre : refusé (A hors de la fenêtre, A’ dedans)', () => {
		const source = figure("point A' = symetrie(A, axe=d)", [
			'P = point(20, 0)',
			'Q = point(20, 8)',
			'd = droite(P, Q)',
			'A = point(30, 5)'
		]);
		expect(() => assertChecks(source)).toThrow('l’axe d est hors de la fenêtre');
	});
});

// ============================================================================
// JUGE : symétrique d'une figure sur papier uni
// ============================================================================

describe('symétrique d’une figure, papier uni', () => {
	/** Les images des trois sommets, construites à l'équerre et au compas, puis les côtés */
	function constructed(): Screen {
		const screen = new Screen(TRIANGLE);
		for (const [x, y] of [
			[2, 5],
			[3, 2],
			[0.5, 2.5]
		]) {
			screen.tap('equerre', 7, 7.1).tap('equerre', x, y);
			const foot = (x + y) / 2;
			screen.tap('compas', foot, foot).tap('compas', x, y);
		}
		return screen;
	}

	it('sommets construits, côtés tracés au segment : juste (traits de construction ignorés)', () => {
		const screen = constructed()
			.tap('segment', 5, 2)
			.tap('segment', 2, 3)
			.tap('segment', 2, 3)
			.tap('segment', 2.5, 0.5)
			.tap('segment', 2.5, 0.5)
			.tap('segment', 5, 2);
		expect(judge(TRIANGLE, screen.answer)).toEqual({ status: 'correct' });
	});

	it('seulement les constructions : il manque le symétrique', () => {
		expect(judge(TRIANGLE, constructed().answer)).toEqual({
			status: 'incorrect',
			feedback: SYMMETRY_MISSING_FEEDBACK
		});
	});

	it('sans quadrillage : admis ; axe hors de la fenêtre : refusé', () => {
		expect(() => assertChecks(TRIANGLE)).not.toThrow();
		const away = figure('symetrique par d', [
			'P = point(20, 0)',
			'Q = point(20, 8)',
			'd = droite(P, Q)',
			'A = point(30, 5)',
			'B = point(30.5, 6)',
			'segment(A, B)'
		]);
		expect(() => assertChecks(away)).toThrow('l’axe est hors de la fenêtre');
	});
});
