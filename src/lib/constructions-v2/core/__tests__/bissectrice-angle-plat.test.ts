/**
 * `bissectrice(A, V, B)` sur un angle plat (A, V, B alignés, A et B de part
 * et d'autre de V) : la bissectrice est la perpendiculaire à (AB) en V.
 *
 * Au compas, les arcs se croisent du côté obtenu en tournant (VA) d'un
 * quart de tour dans le sens trigonométrique ; au rapporteur, on lit 180°.
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor } from '../executor';
import type { SubStep } from '../choreographies/types';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { isLine, isSegment } from '$lib/geometry-core/types/elements';

type Pt = { x: number; y: number };

const A0 = { x: 3, y: 1 };
const V0 = { x: 1, y: 2 };
const B0 = { x: -3, y: 4 };
const POINTS = [
	`A = point(${A0.x}, ${A0.y})`,
	`V = point(${V0.x}, ${V0.y})`,
	`B = point(${B0.x}, ${B0.y})`
];

function load(lines: string[]): { exec: ConstructionExecutor; steps: SubStep[] } {
	const exec = new ConstructionExecutor();
	exec.load(lines.join('\n'));
	expect(exec.loadError?.message ?? null).toBeNull();
	const steps = exec.plan.flatMap((e) => (e.subStep ? [e.subStep] : []));
	return { exec, steps };
}

function pos(exec: ConstructionExecutor, id: string): Pt {
	const p = exec.figure.getPosition(id);
	expect(p).toBeDefined();
	return { x: geoToNumber(p!.x), y: geoToNumber(p!.y) };
}

/** La droite (p1 p2) passe par V et est perpendiculaire à (AB). */
function expectPerpendicularAtV(p1: Pt, p2: Pt) {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const len = Math.hypot(dx, dy);
	expect(len).toBeGreaterThan(1e-6);
	expect(((V0.x - p1.x) * dy - (V0.y - p1.y) * dx) / len).toBeCloseTo(0, 9);
	const ab = { x: B0.x - A0.x, y: B0.y - A0.y };
	expect((dx * ab.x + dy * ab.y) / (len * Math.hypot(ab.x, ab.y))).toBeCloseTo(0, 9);
}

/** P est sur la perpendiculaire en V, du côté de (VA) tourné d'un quart de tour (trigo). */
function expectQuarterTurnSide(P: Pt) {
	const va = { x: A0.x - V0.x, y: A0.y - V0.y };
	const vp = { x: P.x - V0.x, y: P.y - V0.y };
	const lp = Math.hypot(vp.x, vp.y);
	expect(lp).toBeGreaterThan(1e-6);
	// VA tourné de +90° : (−y, x).
	const q = { x: -va.y, y: va.x };
	expect((vp.x * q.x + vp.y * q.y) / (lp * Math.hypot(q.x, q.y))).toBeCloseTo(1, 9);
}

/** Droite principale (la bissectrice du builtin) : ⟂ (AB) en V. */
function expectPrincipalPerpendicular(exec: ConstructionExecutor) {
	const id = exec.lastChoreographyResult?.produced.principal;
	const el = id ? exec.figure.getElementById(id) : undefined;
	expect(el && isLine(el)).toBe(true);
	if (!el || !isLine(el)) return;
	expectPerpendicularAtV(pos(exec, el.point1Id), pos(exec, el.point2Id));
}

/** Trait de la règle (dernière sous-étape) : ⟂ (AB) en V. */
function expectRulerTracePerpendicular(exec: ConstructionExecutor, steps: SubStep[]) {
	const last = steps[steps.length - 1];
	expect(last.kind).toBe('ruler-trace');
	const segId = last.animateDrawableIds[0];
	const seg = exec.figure.getElementById(segId);
	expect(seg && isSegment(seg)).toBe(true);
	if (!seg || !isSegment(seg)) return;
	expectPerpendicularAtV(pos(exec, seg.startId), pos(exec, seg.endId));
}

describe('bissectrice @euclide @arcs_egaux — angle plat', () => {
	const script = [...POINTS, 'd = bissectrice(A, V, B) @euclide'];

	it('les arcs se croisent en P, du côté de (VA) tourné d’un quart de tour', () => {
		const { exec } = load(script);
		exec.executeAll();
		const P = exec.lastChoreographyResult?.produced.charnieres[0];
		expect(P).toBeDefined();
		const p = pos(exec, P!);
		expectQuarterTurnSide(p);
	});

	it('la règle trace la perpendiculaire à (AB) en V, la droite finale aussi', () => {
		const { exec, steps } = load(script);
		exec.executeAll();
		expectRulerTracePerpendicular(exec, steps);
		expectPrincipalPerpendicular(exec);
	});

	it('forme bissectrice(α) : mêmes gestes', () => {
		const { exec, steps } = load([
			...POINTS,
			'al = angle(A, V, B)',
			'd = bissectrice(al) @euclide'
		]);
		exec.executeAll();
		expectRulerTracePerpendicular(exec, steps);
		expectPrincipalPerpendicular(exec);
	});
});

describe('bissectrice @euclide @arc_milieu — angle plat', () => {
	it('refusée : le milieu de [A′B′] est le sommet, on renvoie vers les arcs égaux', () => {
		const exec = new ConstructionExecutor();
		exec.load([...POINTS, 'd = bissectrice(A, V, B) @euclide @arc_milieu'].join('\n'));
		expect(exec.loadError?.message).toMatch(/angle plat/i);
		expect(exec.loadError?.message).toMatch(/@arcs_egaux/);
	});
});

describe('bissectrice @mesure — angle plat', () => {
	const script = [...POINTS, 'd = bissectrice(A, V, B) @mesure'];

	it('consignes : on lit 180°, 180 ÷ 2 = 90', () => {
		const { steps } = load(script);
		expect(steps.map((s) => s.instruction)).toEqual([
			'On place le centre du rapporteur sur V, le 0 sur [VA), et on lit l’angle AVB = 180°',
			'180 ÷ 2 = 90 : on repère la graduation 90°',
			'On marque le repère P en face de 90°',
			'Règle de V à P : on trace la bissectrice'
		]);
	});

	it('repère du côté de (VA) tourné d’un quart de tour, droite ⟂ (AB) en V', () => {
		const { exec, steps } = load(script);
		exec.executeAll();
		const P = exec.lastChoreographyResult?.produced.charnieres[0];
		expect(P).toBeDefined();
		expectQuarterTurnSide(pos(exec, P!));
		expectRulerTracePerpendicular(exec, steps);
		expectPrincipalPerpendicular(exec);
	});

	it('codage : même règle, seulement si les deux côtés sont tracés', () => {
		const markCount = (lines: string[]) => {
			const { exec } = load(lines);
			exec.executeAll();
			const tags = exec.lastChoreographyResult?.produced.traceTags ?? new Map();
			return [...tags.values()].filter((t) => t === 'marker').length;
		};
		const call = 'd = bissectrice(A, V, B) @mesure @complet';
		expect(markCount([...POINTS, call])).toBe(0);
		expect(markCount([...POINTS, 's1 = segment(V, A)', 's2 = segment(V, B)', call])).toBe(2);
	});
});
