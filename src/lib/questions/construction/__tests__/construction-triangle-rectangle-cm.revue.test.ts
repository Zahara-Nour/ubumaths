/**
 * Juge d'une case « figure » : triangle rectangle coté en cm
 * (`verifier: triangle ABC : CAB = 90 ; AC = 3 cm`) — chantier `regle-graduee`,
 * PR 4 (`docs/wip/regle-graduee-progress.md` § 4, décisions de David du
 * 2026-11-08). [AB] est tracé ; l'élève trace la perpendiculaire à l'équerre en
 * A, pose la règle graduée avec son 0 en A, arrête [AC] sur la graduation, puis
 * trace [BC]. Les deux côtés de (AB) sont justes.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { judgeConstruction } from '../judge';
import { isStraight, perpendicularThrough, type StraightTrait } from '../instruments';
import { serializeConstructionAnswer, type DrawnObject, type DrawnRegle } from '../answer';
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

function figure(
	verifier: string,
	body: string[] = BODY,
	header: string[] = [],
	window = '0 ; 12 ; 0 ; 8'
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
/** Règle posée : le 0 en `origin`, vers `toward` */
const regle = (toward: Position, origin: Position = A): DrawnRegle => ({
	kind: 'regle',
	ox: origin.x,
	oy: origin.y,
	bx: toward.x,
	by: toward.y,
	sens: 1
});

/** Le trait droit de la figure qui joint p et q (ce que l'équerre longe) */
function figureTrait(source: string, p: Position, q: Position): StraightTrait {
	const near = (u: Position, v: Position) => Math.hypot(u.x - v.x, u.y - v.y) < 1e-9;
	const trait = constructionShapes(source)
		?.traits.filter(isStraight)
		.find((t) => (near(t.a, p) && near(t.b, q)) || (near(t.a, q) && near(t.b, p)));
	if (!trait) throw new Error('trait introuvable');
	return trait;
}

// Papier uni, fenêtre 12 × 8 (règle de 12 cm) : A(3 ; 3), B(9 ; 3), [AB] = 6 cm
const A = { x: 3, y: 3 };
const B = { x: 9, y: 3 };
const BODY = ['A = point(3, 3)', 'B = point(9, 3)', 's = segment(A, B)'];
const RIGHT = figure('triangle ABC : CAB = 90 ; AC = 3 cm');
/** L'équerre le long de [AB], en A */
const SQUARE_A = perpendicularThrough(figureTrait(RIGHT, A, B), A);
const C = { x: 3, y: 6 };
const UP = { x: 3, y: 4 };

describe('revue : sondes', () => {
	const at = (y: number) => ({ x: 3, y });
	it('éventail : deux triangles, 3 cm et 4 cm, depuis la même règle → faux attendu (Q9)', () => {
		const objects = [
			SQUARE_A,
			regle(UP),
			segment(A, at(6)),
			segment(B, at(6)),
			segment(A, at(7)),
			segment(B, at(7))
		];
		expect(judge(RIGHT, objects)).toMatchObject({ status: 'incorrect' });
	});
	it('fusil à graduations : 2, 3, 4, 5 cm et [B..] à chacun → faux attendu', () => {
		const ys = [5, 6, 7, 7.5];
		const objects: DrawnObject[] = [
			SQUARE_A,
			regle(UP),
			...ys.flatMap((y) => [segment(A, at(y)), segment(B, at(y))])
		];
		expect(judge(RIGHT, objects)).toMatchObject({ status: 'incorrect' });
	});
	it('prolongement : [AD] de 4,5 cm superposé à [AC] de 3 cm, [BC] → faux attendu (comme seenSegments)', () => {
		const objects = [SQUARE_A, regle(UP), segment(A, at(7.5)), segment(A, C), segment(B, C)];
		expect(judge(RIGHT, objects)).toMatchObject({ status: 'incorrect' });
	});
	it('éventail de part et d’autre de (AB) : C au-dessus et C en dessous', () => {
		const objects = [
			SQUARE_A,
			regle(UP),
			segment(A, C),
			segment(B, C),
			regle({ x: 3, y: 2 }),
			segment(A, at(0.5)),
			segment(B, at(0.5))
		];
		expect(judge(RIGHT, objects)).toMatchObject({ status: 'incorrect' });
	});
	it('[BC] à l’œil avant la règle, puis [AC] à la règle : faux', () => {
		expect(judge(RIGHT, [SQUARE_A, segment(B, C), regle(UP), segment(A, C)])).toMatchObject({
			status: 'incorrect'
		});
	});
});
