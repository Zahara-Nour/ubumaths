/**
 * Scènes d'objets — le code commun (collection et monnaie)
 *
 * Phase 0 : `docs/wip/monnaie-progress.md` § 7, décision 8. Le vrac doit
 * marcher pour toute taille de case (les pièces de 2 € sont plus grosses que
 * les cubes) : rien ne se touche, tout reste dans la zone, même graine → même
 * dessin.
 */

import { describe, expect, it } from 'vitest';
import {
	findBoxAt,
	hashText,
	scatterCenters,
	seededRandom,
	shiftBox,
	type ScatterOptions
} from '$lib/ubumark/utils/scene-commune';

// ============================================================================
// CONSTANTES
// ============================================================================

const GRANDES_CASES: ScatterOptions = {
	cell: 40,
	jitter: 6,
	spread: 1.6,
	minColumns: 3,
	maxColumns: 6
};

// ============================================================================
// TESTS
// ============================================================================

describe('scene-commune — hasard déterministe', () => {
	it('même texte → même graine ; textes différents → graines différentes', () => {
		expect(hashText('3×2 1×1')).toBe(hashText('3×2 1×1'));
		expect(hashText('3×2 1×1')).not.toBe(hashText('3×2 1×2'));
	});

	it('même graine → même suite, dans [0, 1)', () => {
		const a = seededRandom(42);
		const b = seededRandom(42);
		const suite = Array.from({ length: 20 }, () => a());
		expect(Array.from({ length: 20 }, () => b())).toEqual(suite);
		for (const x of suite) {
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThan(1);
		}
	});
});

describe('scene-commune — vrac', () => {
	it('le nombre de centres demandé, chacun dans la zone, marge de jitter comprise', () => {
		const { centers, width, height } = scatterCenters(30, 7, GRANDES_CASES);
		expect(centers).toHaveLength(30);
		const half = GRANDES_CASES.cell / 2 - GRANDES_CASES.jitter;
		for (const { cx, cy } of centers) {
			expect(cx).toBeGreaterThanOrEqual(half);
			expect(cy).toBeGreaterThanOrEqual(half);
			expect(cx).toBeLessThanOrEqual(width - half);
			expect(cy).toBeLessThanOrEqual(height - half);
		}
	});

	it('deux centres restent à au moins cell − 2 jitter, quelle que soit la case', () => {
		const { centers } = scatterCenters(30, 7, GRANDES_CASES);
		const min = GRANDES_CASES.cell - 2 * GRANDES_CASES.jitter;
		for (const [i, a] of centers.entries()) {
			for (const b of centers.slice(i + 1)) {
				// Deux cases voisines en diagonale ou de côté : au moins min sur un axe
				expect(Math.max(Math.abs(a.cx - b.cx), Math.abs(a.cy - b.cy))).toBeGreaterThanOrEqual(
					min - 1e-9
				);
			}
		}
	});

	it('même graine → mêmes centres ; autre graine → autre désordre', () => {
		expect(scatterCenters(12, 1, GRANDES_CASES)).toEqual(scatterCenters(12, 1, GRANDES_CASES));
		expect(scatterCenters(12, 2, GRANDES_CASES)).not.toEqual(scatterCenters(12, 1, GRANDES_CASES));
	});

	it('aucun objet : zone vide de centres', () => {
		expect(scatterCenters(0, 1, GRANDES_CASES).centers).toEqual([]);
	});
});

describe('scene-commune — décalage et toucher', () => {
	const boxes = [
		{ x: 0, y: 0, width: 20, height: 10, cx: 10, cy: 5, value: 5 },
		{ x: 24, y: 0, width: 10, height: 10, cx: 29, cy: 5, value: 1 }
	];

	it('décaler garde les autres champs et arrondit au centième', () => {
		expect(shiftBox(boxes[0], 1.006, 2)).toEqual({
			x: 1.01,
			y: 2,
			width: 20,
			height: 10,
			cx: 11.01,
			cy: 7,
			value: 5
		});
	});

	it('un point dans une boîte, ou juste à côté, la désigne ; loin de tout : rien', () => {
		expect(findBoxAt(boxes, { x: 5, y: 5 }, 3)).toBe(0);
		expect(findBoxAt(boxes, { x: 36, y: 5 }, 3)).toBe(1);
		expect(findBoxAt(boxes, { x: 80, y: 80 }, 3)).toBeNull();
	});

	it('dans deux boîtes élargies à la fois : celle dont le centre est le plus proche', () => {
		// x = 22 : dans la 1re (bord 20 + 3) et la 2e (bord 24 − 3) ; centres à 12 et 7
		expect(findBoxAt(boxes, { x: 22, y: 5 }, 3)).toBe(1);
	});
});
