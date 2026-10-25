/**
 * Tracé de l'élève (toucher A puis B, aimantation, Effacer) : comportements
 * validés par David le 2026-10-25 (`docs/wip/geometrie-validation-progress.md` § 5).
 */
import { describe, it, expect } from 'vitest';
import {
	addTap,
	canErase,
	clipLineToWindow,
	eraseLast,
	snapTap,
	solutionLines,
	type Drawing
} from '../drawing';
import {
	CONSTRUCTION_ANSWER_LIMITS,
	parseConstructionAnswer,
	serializeConstructionAnswer
} from '../answer';
import { judgeConstruction } from '../judge';

const POINTS = new Map([
	['A', { x: 1, y: 2 }],
	['B', { x: 7, y: 2 }],
	['C', { x: 4, y: 5 }]
]);
const EMPTY: Drawing = { lines: [], start: null };

describe('aimantation', () => {
	it('près d’un point : sa position exacte', () => {
		expect(snapTap({ x: 1.3, y: 2.2 }, POINTS, 0.5)).toEqual({ x: 1, y: 2 });
	});

	it('deux points dans le rayon : le plus proche', () => {
		const close = new Map([
			['A', { x: 0, y: 0 }],
			['B', { x: 1, y: 0 }]
		]);
		expect(snapTap({ x: 0.6, y: 0 }, close, 1)).toEqual({ x: 1, y: 0 });
	});

	it('ailleurs : l’endroit touché, arrondi au centième', () => {
		expect(snapTap({ x: 3.14159, y: -0.001 }, POINTS, 0.5)).toEqual({ x: 3.14, y: 0 });
	});

	it('jamais de « -0 » dans la réponse', () => {
		const tap = snapTap({ x: -0.001, y: 1 }, POINTS, 0.1);
		expect(Object.is(tap.x, -0)).toBe(false);
	});
});

describe('toucher A puis B', () => {
	it('premier toucher : un départ, aucune droite', () => {
		const d = addTap(EMPTY, { x: 1, y: 2 });
		expect(d).toEqual({ lines: [], start: { x: 1, y: 2 } });
	});

	it('second toucher : la droite par les deux, jugée juste', () => {
		const d = addTap(addTap(EMPTY, { x: 1, y: 2 }), { x: 7, y: 2 });
		expect(d.start).toBeNull();
		expect(d.lines).toEqual([{ kind: 'droite', x1: 1, y1: 2, x2: 7, y2: 2 }]);
		const checks = [
			{ kind: 'droite_par' as const, points: ['A', 'B'] as [string, string], line: 1 }
		];
		expect(judgeConstruction(checks, POINTS, serializeConstructionAnswer(d.lines))).toEqual({
			status: 'correct'
		});
	});

	it('toucher le départ une seconde fois : rien ne se passe', () => {
		const started = addTap(EMPTY, { x: 1, y: 2 });
		expect(addTap(started, { x: 1, y: 2 })).toEqual(started);
	});

	it('au plafond du juge : la droite n’est pas ajoutée, la réponse reste lisible', () => {
		let d = EMPTY;
		for (let i = 0; i < CONSTRUCTION_ANSWER_LIMITS.objects + 3; i++) {
			d = addTap(addTap(d, { x: 0, y: i }), { x: 1, y: i + 0.5 });
		}
		expect(d.lines).toHaveLength(CONSTRUCTION_ANSWER_LIMITS.objects);
		expect(d.start).toBeNull();
		expect(parseConstructionAnswer(serializeConstructionAnswer(d.lines))).not.toBeNull();
	});

	it('positions longues (tiers) : jamais au-delà de la longueur lisible', () => {
		let d = EMPTY;
		for (let i = 0; i < CONSTRUCTION_ANSWER_LIMITS.objects; i++) {
			d = addTap(addTap(d, { x: 1 / 3, y: i / 7 }), { x: 2 / 3, y: i / 11 + 1 / 3 });
		}
		expect(serializeConstructionAnswer(d.lines).length).toBeLessThanOrEqual(
			CONSTRUCTION_ANSWER_LIMITS.chars
		);
		expect(parseConstructionAnswer(serializeConstructionAnswer(d.lines))).not.toBeNull();
	});
});

describe('Effacer', () => {
	it('rien à effacer : bouton grisé', () => {
		expect(canErase(EMPTY)).toBe(false);
	});

	it('un départ en attente : on l’enlève, les droites restent', () => {
		const oneLine = addTap(addTap(EMPTY, { x: 1, y: 2 }), { x: 7, y: 2 });
		const pending = addTap(oneLine, { x: 4, y: 5 });
		expect(canErase(pending)).toBe(true);
		expect(eraseLast(pending)).toEqual(oneLine);
	});

	it('sinon : la dernière droite', () => {
		const one = addTap(addTap(EMPTY, { x: 1, y: 2 }), { x: 7, y: 2 });
		const two = addTap(addTap(one, { x: 1, y: 2 }), { x: 4, y: 5 });
		expect(eraseLast(two)).toEqual(one);
	});
});

describe('bonne droite et découpe', () => {
	it('une droite par vérification, par ses deux points', () => {
		const checks = [
			{ kind: 'droite_par' as const, points: ['A', 'C'] as [string, string], line: 1 }
		];
		expect(solutionLines(checks, POINTS)).toEqual([{ kind: 'droite', x1: 1, y1: 2, x2: 4, y2: 5 }]);
	});

	it('la droite dépasse des deux côtés, jusqu’aux bords de la fenêtre', () => {
		const window = { xMin: 0, xMax: 10, yMin: 0, yMax: 6 };
		expect(clipLineToWindow({ kind: 'droite', x1: 1, y1: 2, x2: 7, y2: 2 }, window)).toEqual({
			x1: 0,
			y1: 2,
			x2: 10,
			y2: 2
		});
		const oblique = clipLineToWindow({ kind: 'droite', x1: 1, y1: 2, x2: 4, y2: 5 }, window);
		expect(oblique).toEqual({ x1: 0, y1: 1, x2: 5, y2: 6 });
	});

	it('verticale', () => {
		const window = { xMin: 0, xMax: 10, yMin: 0, yMax: 6 };
		expect(clipLineToWindow({ kind: 'droite', x1: 3, y1: 1, x2: 3, y2: 4 }, window)).toEqual({
			x1: 3,
			y1: 0,
			x2: 3,
			y2: 6
		});
	});

	it('hors de la fenêtre : rien à dessiner', () => {
		const window = { xMin: 0, xMax: 10, yMin: 0, yMax: 6 };
		expect(clipLineToWindow({ kind: 'droite', x1: 0, y1: 8, x2: 1, y2: 8 }, window)).toBeNull();
	});
});
