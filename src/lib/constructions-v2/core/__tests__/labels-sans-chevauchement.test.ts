/**
 * Noms qui ne se chevauchent pas sur les figures des constructions (E4,
 * `docs/wip/ecarts-verifs-progress.md`).
 *
 * Chaque script est joué pas à pas comme sur la page d'essais (cadre de
 * 500 × 450 px, 40 px par unité, origine au centre). À chaque pas, les noms
 * placés par `placeLabels` ne se recouvrent pas entre eux et ne touchent ni
 * un codage (carré d'angle droit, arc, traits de longueur) ni un arc de compas.
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor } from '../executor';
import { createTransformer } from '#lib/geometry-core/viewport/viewport.ts';
import {
	boxesOverlap,
	labelBox,
	pathSegments,
	placeLabels,
	segmentHitsBox
} from '#lib/geometry-core/rendering/label-avoidance.ts';
import {
	angleToSVG,
	arcToSVG,
	segmentMarkToSVG
} from '#lib/geometry-core/rendering/svg-primitives.ts';
import type { Figure } from '#lib/geometry-core/graph/figure.ts';

// =============================================================================
// Décor
// =============================================================================

const WIDTH = 500;
const HEIGHT = 450;
const PPU = 40;
const VIEWPORT = {
	xMin: -WIDTH / (2 * PPU),
	xMax: WIDTH / (2 * PPU),
	yMin: -HEIGHT / (2 * PPU),
	yMax: HEIGHT / (2 * PPU)
};
const transformer = createTransformer(VIEWPORT, WIDTH, HEIGHT);
const dims = { width: WIDTH, height: HEIGHT };

const SCRIPTS: Record<string, string[]> = {
	'#1633/#1621 — « e » et C*': [
		'A = point(0, 0)',
		'B = point(4, 1)',
		'P = point(1, 3)',
		'd = parallele(P, A, B) @euclide @double_perpendiculaire @complet'
	],
	'#1637 — « s » et le milieu I': [
		'A = point(-2, -1)',
		'B = point(4.37, 1.5)',
		's = segment(A, B)',
		'I = milieu(A, B) @mesure @complet'
	],
	'#1637 — milieu(s)': [
		'A = point(-2, -1)',
		'B = point(4.37, 1.5)',
		's = segment(A, B)',
		'I = milieu(s) @mesure @complet'
	],
	'#1647 — « s » et I de la médiatrice': [
		'A = point(-3, -1)',
		'B = point(3.4, 0.5)',
		's = segment(A, B)',
		'd = mediatrice(A, B) @mesure @complet'
	],
	'#1623 — P et le carré d’angle droit': [
		'A = point(0, 0)',
		'B = point(0, 4)',
		'P = point(3, 1)',
		'd = parallele(P, A, B) @equerre @double_perpendiculaire @complet'
	],
	'#1653 — P et « d » de la bissectrice mesurée': [
		'A = point(4, 0)',
		'V = point(0, 0)',
		'B = point(-4, 0)',
		'c1 = demidroite(V, A)',
		'c2 = demidroite(V, B)',
		'd = bissectrice(A, V, B) @mesure @complet'
	]
};

interface Clash {
	step: number;
	a: string;
	b: string;
}

/** Les chevauchements d'une figure : nom contre nom, nom contre codage */
function clashes(figure: Figure, step: number): Clash[] {
	const placements = placeLabels(figure, transformer, dims);
	const named = [...placements].map(([id, at]) => {
		const label = figure.getElementById(id)?.label ?? '';
		return { label, box: labelBox(label, at) };
	});
	const out: Clash[] = [];
	for (let i = 0; i < named.length; i++) {
		for (let j = i + 1; j < named.length; j++) {
			if (boxesOverlap(named[i].box, named[j].box))
				out.push({ step, a: named[i].label, b: named[j].label });
		}
	}
	for (const el of figure.getAllElements()) {
		if (!el.visible) continue;
		const segs =
			el.type === 'angle'
				? (angleToSVG(el.id, figure, transformer)?.paths ?? []).flatMap(pathSegments)
				: el.type === 'arcByAngles' || el.type === 'arcByPoints'
					? pathSegments(arcToSVG(el.id, figure, transformer)?.path ?? '')
					: el.type === 'segmentMark'
						? (segmentMarkToSVG(el.id, figure, transformer)?.ticks ?? [])
						: [];
		for (const s of segs) {
			for (const n of named) {
				if (segmentHitsBox(s, n.box)) out.push({ step, a: n.label, b: `codage ${el.type}` });
			}
		}
	}
	return out;
}

function play(lines: readonly string[]): Clash[] {
	const exec = new ConstructionExecutor();
	exec.load(lines.join('\n'));
	expect(exec.loadError).toBeNull();
	const out: Clash[] = [];
	let step = 0;
	while (exec.step()) {
		step++;
		out.push(...clashes(exec.figure, step));
	}
	// Le dernier appel (rendu `false`) applique la visibilité finale (codages en @complet)
	out.push(...clashes(exec.figure, step + 1));
	return out;
}

// =============================================================================
// Tests
// =============================================================================

describe('constructions : les noms ne se chevauchent pas (E4)', () => {
	for (const [title, script] of Object.entries(SCRIPTS)) {
		it(title, () => {
			expect(play(script)).toEqual([]);
		});
	}
});

describe('placeLabels : une figure sans conflit garde ses places habituelles', () => {
	it('nom de point en haut à droite, nom de segment au milieu', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(-3, -2)', 'B = point(3, 2)', 's = segment(A, B)'].join('\n'));
		while (exec.step());
		const figure = exec.figure;
		const placements = placeLabels(figure, transformer, dims);
		const A = figure.getAllElements().find((el) => el.label === 'A');
		const s = figure.getAllElements().find((el) => el.label === 's');
		const a = transformer.mathToSvg(-3, -2);
		const b = transformer.mathToSvg(3, 2);
		const placeA = A ? placements.get(A.id) : undefined;
		// En haut à droite du point
		expect(placeA && placeA.x > a.x && placeA.y < a.y).toBe(true);
		expect(s && placements.get(s.id)).toEqual({ x: (a.x + b.x) / 2 + 6, y: (a.y + b.y) / 2 - 8 });
	});
});
