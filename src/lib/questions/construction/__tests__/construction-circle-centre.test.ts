/**
 * Juge d'une case « figure » : construire un cercle de centre donné
 * (`verifier: cercle c = cercle(O, passant=A)` et `cercle c = cercle(O, rayon=distance(D, E))`,
 * chantier `cercle-triangle-rectangle`, n° 19 de `outils-manquants.md`, phase 0 validée
 * par David le 2026-11-08, `docs/wip/cercle-triangle-rectangle-progress.md` § 1).
 *
 * Papier uni : le compas piqué en O, ouvert jusqu'à A, ou le Report de [DE] piqué en O.
 * Quadrillage (passant= seulement) : O et A sur des nœuds, le compas aimanté aux nœuds.
 * Les autres cercles et droites sont des traits de construction, ignorés.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	centeredMissingFeedback,
	centeredRadiusEyeballedFeedback,
	centeredThroughEyeballedFeedback,
	goodCenterRadiusFeedback,
	goodCenterThroughFeedback,
	wrongCenterFeedback
} from '../circle';
import { solutionCircles } from '../drawing';
import { serializeConstructionAnswer, type DrawnObject } from '../answer';
import type { Position } from '../judge';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';

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

function figure(
	verifier: string,
	body: string[],
	header: string[] = [],
	window = '0 ; 10 ; 0 ; 8'
) {
	return [`fenetre: ${window}`, ...header, `verifier: ${verifier}`, '---', ...body].join('\n');
}

const cercle = (center: Position, through: Position): DrawnObject => ({
	kind: 'cercle',
	cx: center.x,
	cy: center.y,
	x: through.x,
	y: through.y
});
/** Report : écartement de `from` à `to`, piqué en `at` */
const report = (at: Position, from: Position, to: Position): DrawnObject => ({
	kind: 'report',
	cx: at.x,
	cy: at.y,
	ax: from.x,
	ay: from.y,
	bx: to.x,
	by: to.y
});
const droite = (p: Position, q: Position): DrawnObject => ({
	kind: 'droite',
	x1: p.x,
	y1: p.y,
	x2: q.x,
	y2: q.y
});

// Centre O(5 ; 4), passant par A(7 ; 4) : rayon 2, dans 0..10 × 0..8
const O = { x: 5, y: 4 };
const A = { x: 7, y: 4 };
const BODY = ['O = point(5, 4)', 'A = point(7, 4)'];
const PASSANT = figure('cercle c = cercle(O, passant=A)', BODY);

// Rayon pris sur [DE], D(6 ; 1), E(8 ; 1) : rayon 2 ; centre O(3 ; 4)
const O2 = { x: 3, y: 4 };
const D = { x: 6, y: 1 };
const E = { x: 8, y: 1 };
const BODY_RAYON = ['O = point(3, 4)', 'D = point(6, 1)', 'E = point(8, 1)', 'u = segment(D, E)'];
const RAYON = figure('cercle c = cercle(O, rayon=distance(D, E))', BODY_RAYON);

// Quadrillage : O(5 ; 4), A(7 ; 5) : rayon √5
const A_GRID = { x: 7, y: 5 };
const GRID = figure(
	'cercle c = cercle(O, passant=A)',
	['O = point(5, 4)', 'A = point(7, 5)'],
	['grille: 1']
);

describe('cercle de centre donné : lecture de l’en-tête', () => {
	it('passant= : palette déduite, le compas seul', () => {
		const { spec, errors } = readConstructionHeader(PASSANT);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{ kind: 'cercle', name: 'c', expression: 'cercle(O, passant=A)', line: 2 }
		]);
		expect(spec.tools).toEqual(['compas']);
	});

	it('rayon= : palette déduite, Compas · Report', () => {
		const { spec, errors } = readConstructionHeader(RAYON);
		expect(errors).toEqual([]);
		expect(spec.tools).toEqual(['compas', 'report']);
	});

	it('quadrillage admis pour passant= (CE1-072), le compas seul', () => {
		const { spec, errors } = readConstructionHeader(GRID);
		expect(errors).toEqual([]);
		expect(spec.tools).toEqual(['compas']);
	});

	it('quadrillage refusé pour rayon= (le Report se prend sur papier uni)', () => {
		const source = figure('cercle c = cercle(O, rayon=distance(D, E))', BODY_RAYON, ['grille: 1']);
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(/papier uni/);
	});

	it('quadrillage toujours refusé pour le cercle circonscrit', () => {
		const source = figure(
			'cercle c = cercle_circonscrit(A, B, C)',
			['A = point(3, 4)', 'B = point(7, 4)', 'C = point(4, 7)'],
			['grille: 1']
		);
		expect(readConstructionHeader(source).errors[0]?.message).toMatch(/papier uni/);
	});
});

describe('cercle de centre donné, passant= : verdicts', () => {
	it('compas piqué en O, ouvert jusqu’à A → juste', () => {
		expect(judge(PASSANT, [cercle(O, A)])).toEqual({ status: 'correct' });
	});

	it('d’autres traits à côté du bon cercle → juste (traits de construction)', () => {
		expect(judge(PASSANT, [cercle(A, O), droite(O, A), cercle(O, A)])).toEqual({
			status: 'correct'
		});
	});

	it('réponse vide → vide (rien à envoyer)', () => {
		expect(judge(PASSANT, [])).toEqual({ status: 'empty' });
	});

	it('une droite seule, aucun cercle → il manque le cercle', () => {
		expect(judge(PASSANT, [droite(O, A)])).toEqual({
			status: 'incorrect',
			feedback: centeredMissingFeedback('O', 'passant', 'A')
		});
		expect(centeredMissingFeedback('O', 'passant', 'A')).toBe(
			'Trace le cercle de centre O passant par A.'
		);
	});

	it('compas piqué en A au lieu de O → mauvais centre', () => {
		expect(judge(PASSANT, [cercle(A, O)])).toEqual({
			status: 'incorrect',
			feedback: wrongCenterFeedback('O')
		});
		expect(wrongCenterFeedback('O')).toBe('Pique ton compas en O.');
	});

	it('compas piqué à l’œil près de rien → mauvais centre', () => {
		expect(judge(PASSANT, [cercle({ x: 4, y: 3 }, A)])).toEqual({
			status: 'incorrect',
			feedback: wrongCenterFeedback('O')
		});
	});

	it('bon centre, ne passe pas par A', () => {
		expect(judge(PASSANT, [cercle(O, { x: 6, y: 4 })])).toEqual({
			status: 'incorrect',
			feedback: goodCenterThroughFeedback('O', 'A')
		});
		expect(goodCenterThroughFeedback('O', 'A')).toBe(
			'Ton cercle a le bon centre mais ne passe pas par A.'
		);
	});

	it('bon cercle, compas ouvert à l’œil (point de passage qui n’est pas A)', () => {
		expect(judge(PASSANT, [cercle(O, { x: 5, y: 6 })])).toEqual({
			status: 'incorrect',
			feedback: centeredThroughEyeballedFeedback('A')
		});
		expect(centeredThroughEyeballedFeedback('A')).toBe(
			'Ton compas est ouvert à l’œil : ouvre-le jusqu’à A.'
		);
	});

	it('le dernier cercle centré en O est l’essai jugé', () => {
		expect(judge(PASSANT, [cercle(A, O), cercle(O, { x: 6, y: 4 })])).toEqual({
			status: 'incorrect',
			feedback: goodCenterThroughFeedback('O', 'A')
		});
	});

	it('un point tracé (outil absent de la palette) → réponse forgée', () => {
		expect(judge(PASSANT, [cercle(O, A), { kind: 'point', x: 1, y: 1 }]).status).toBe('incorrect');
	});
});

describe('cercle de centre donné : deux cercles dans la figure (revue)', () => {
	// Rosace : c de centre O passant par A, k de centre A passant par O (rayon 2 chacun)
	const TWO = [
		'fenetre: 0 ; 12 ; 0 ; 8',
		'verifier: cercle c = cercle(O, passant=A)',
		'verifier: cercle k = cercle(A, passant=O)',
		'---',
		...BODY
	].join('\n');

	it('les deux cercles justes → juste', () => {
		expect(judge(TWO, [cercle(A, O), cercle(O, A)])).toEqual({ status: 'correct' });
	});

	it('seul le second est tracé → il manque le premier (pas « mauvais centre »)', () => {
		expect(judge(TWO, [cercle(A, O)])).toEqual({
			status: 'incorrect',
			feedback: centeredMissingFeedback('O', 'passant', 'A')
		});
	});
});

describe('cercle de centre donné, rayon= : verdicts', () => {
	it('Report de [DE] piqué en O → juste', () => {
		expect(judge(RAYON, [report(O2, D, E)])).toEqual({ status: 'correct' });
	});

	it('Report dans l’autre sens (de E à D) → juste', () => {
		expect(judge(RAYON, [report(O2, E, D)])).toEqual({ status: 'correct' });
	});

	it('une droite seule, aucun cercle → il manque le cercle', () => {
		expect(judge(RAYON, [droite(O2, D)])).toEqual({
			status: 'incorrect',
			feedback: centeredMissingFeedback('O', 'rayon', 'DE')
		});
		expect(centeredMissingFeedback('O', 'rayon', 'DE')).toBe(
			'Trace le cercle de centre O et de rayon DE.'
		);
	});

	it('Report piqué ailleurs qu’en O → mauvais centre', () => {
		expect(judge(RAYON, [report(D, D, E)])).toEqual({
			status: 'incorrect',
			feedback: wrongCenterFeedback('O')
		});
	});

	it('bon centre, rayon reporté d’une autre longueur', () => {
		expect(judge(RAYON, [report(O2, O2, D)])).toEqual({
			status: 'incorrect',
			feedback: goodCenterRadiusFeedback('DE')
		});
		expect(goodCenterRadiusFeedback('DE')).toBe(
			'Ton cercle a le bon centre mais pas le bon rayon : reporte la longueur DE.'
		);
	});

	it('bon rayon pris à l’œil au compas', () => {
		expect(judge(RAYON, [cercle(O2, { x: 5, y: 4 })])).toEqual({
			status: 'incorrect',
			feedback: centeredRadiusEyeballedFeedback('DE')
		});
		expect(centeredRadiusEyeballedFeedback('DE')).toBe(
			'Ton compas est ouvert à l’œil : prends l’écartement DE avec le Report.'
		);
	});
});

describe('cercle de centre donné, quadrillage : verdicts', () => {
	it('compas piqué en O, ouvert jusqu’à A → juste', () => {
		expect(judge(GRID, [cercle(O, A_GRID)])).toEqual({ status: 'correct' });
	});

	it('ouvert jusqu’à un autre nœud du même cercle → juste (les nœuds suffisent)', () => {
		expect(judge(GRID, [cercle(O, { x: 6, y: 6 })])).toEqual({ status: 'correct' });
	});

	it('bon centre, ne passe pas par A', () => {
		expect(judge(GRID, [cercle(O, { x: 7, y: 4 })])).toEqual({
			status: 'incorrect',
			feedback: goodCenterThroughFeedback('O', 'A')
		});
	});

	it('compas piqué sur un autre nœud → mauvais centre', () => {
		expect(judge(GRID, [cercle({ x: 4, y: 4 }, A_GRID)])).toEqual({
			status: 'incorrect',
			feedback: wrongCenterFeedback('O')
		});
	});
});

describe('cercle de centre donné : erreurs d’auteur', () => {
	it('figures faisables : rien à signaler', () => {
		expect(() => assertChecks(PASSANT)).not.toThrow();
		expect(() => assertChecks(RAYON)).not.toThrow();
		expect(() => assertChecks(GRID)).not.toThrow();
	});

	it('autre forme de cercle → refus qui cite les formes admises', () => {
		const source = figure('cercle c = cercle(O, 2)', BODY);
		expect(() => assertChecks(source)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(source)).toThrow(/cercle\(O, passant=A\)/);
	});

	it('centre invisible : l’élève ne peut pas y piquer le compas', () => {
		const source = figure('cercle c = cercle(O, passant=A)', [
			'O = point(5, 4, visible=faux)',
			'A = point(7, 4)'
		]);
		expect(() => assertChecks(source)).toThrow(/O n’est pas visible/);
	});

	it('point de passage invisible', () => {
		const source = figure('cercle c = cercle(O, passant=A)', [
			'O = point(5, 4)',
			'A = point(7, 4, visible=faux)'
		]);
		expect(() => assertChecks(source)).toThrow(/A n’est pas visible/);
	});

	it('bout du rayon invisible', () => {
		const source = figure('cercle c = cercle(O, rayon=distance(D, E))', [
			'O = point(3, 4)',
			'D = point(6, 1, visible=faux)',
			'E = point(8, 1)'
		]);
		expect(() => assertChecks(source)).toThrow(/D n’est pas visible/);
	});

	it('cercle qui sort de la fenêtre', () => {
		const source = figure('cercle c = cercle(O, passant=A)', BODY, [], '0 ; 10 ; 0 ; 5');
		expect(() => assertChecks(source)).toThrow(/sort de la fenêtre/);
	});

	it('quadrillage : centre hors des nœuds', () => {
		const source = figure(
			'cercle c = cercle(O, passant=A)',
			['O = point(5.5, 4)', 'A = point(7, 5)'],
			['grille: 1']
		);
		expect(() => assertChecks(source)).toThrow(/nœud/);
	});
});

describe('cercle de centre donné : correction', () => {
	it('le cercle et son centre, sans médiatrice', () => {
		const source = PASSANT;
		const [solution] = solutionCircles(
			checksOf(source),
			constructionExpected(source),
			constructionPositions(source),
			constructionShapes(source)
		);
		expect(solution.center.x).toBeCloseTo(O.x);
		expect(solution.center.y).toBeCloseTo(O.y);
		expect(solution.radius).toBeCloseTo(2);
		expect(solution.mediatrices).toEqual([]);
	});
});
