import { describe, it, expect } from 'vitest';
import { runDsl } from '$lib/geometry-core/dsl/index';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { isPolygon } from '$lib/geometry-core/types/elements';
import { buildKochDsl } from './koch-dsl';

type Pt = { x: number; y: number };

function shoelace(pts: Pt[]): number {
	let s = 0;
	pts.forEach((p, i) => {
		const q = pts[(i + 1) % pts.length];
		s += p.x * q.y - q.x * p.y;
	});
	return Math.abs(s) / 2;
}

/** Construit le flocon ; `ratioAt(n)` place le curseur et rend l'aire rapportée à a_0. */
function setup(steps: number) {
	const { figure, symbols } = runDsl(buildKochDsl(steps));
	const sliderId = symbols.get('n')!.figureId!;
	const polygon = figure.getElementById(symbols.get('F')!.figureId!);
	if (!polygon || !isPolygon(polygon)) throw new Error('F n’est pas un polygone');
	const vertices = (): Pt[] =>
		polygon.dependsOn.map((id) => {
			const p = figure.getPosition(id)!;
			return { x: geoToNumber(p.x), y: geoToNumber(p.y) };
		});
	const a0 = shoelace(vertices());
	const ratioAt = (n: number) => {
		figure.moveSlider(sliderId, n);
		figure.recompute();
		return shoelace(vertices()) / a0;
	};
	return { vertices, ratioAt };
}

describe('buildKochDsl — flocon piloté par un curseur', () => {
	it('construit 3·4^n sommets', () => {
		expect(setup(4).vertices()).toHaveLength(768);
	});

	it('à n entier, l’aire est celle de l’étape n : a_n / a_0 = 8/5 − (3/5)(4/9)^n', () => {
		const { ratioAt } = setup(4);
		for (const n of [0, 1, 2, 3, 4]) {
			expect(ratioAt(n)).toBeCloseTo(8 / 5 - (3 / 5) * (4 / 9) ** n, 6);
		}
	});

	it('le curseur avance par pas de 1 : pas d’étape intermédiaire', () => {
		// n = 2,4 est ramené à 2 : on voit l'étape 2, pas des pointes à 40 % de leur hauteur
		expect(setup(4).ratioAt(2.4)).toBeCloseTo(8 / 5 - (3 / 5) * (4 / 9) ** 2, 6);
	});

	it('revenir en arrière rend la figure de l’étape demandée', () => {
		const { ratioAt } = setup(3);
		ratioAt(3);
		expect(ratioAt(1)).toBeCloseTo(4 / 3, 6);
	});
});
