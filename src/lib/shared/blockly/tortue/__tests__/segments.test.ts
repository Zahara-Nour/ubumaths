import { describe, expect, it } from 'vitest';

import { memesTraces, normaliserSegments, sortDuCadre, type Segment } from '../segments';

function seg(x1: number, y1: number, x2: number, y2: number): Segment {
	return { de: { x: x1, y: y1 }, a: { x: x2, y: y2 } };
}

describe('normaliserSegments', () => {
	it('le sens de parcours ne compte pas', () => {
		expect(normaliserSegments([seg(3, 0, 0, 0)])).toEqual([seg(0, 0, 3, 0)]);
	});

	it('l’ordre ne compte pas', () => {
		expect(normaliserSegments([seg(0, 1, 0, 2), seg(0, 0, 1, 0)])).toEqual([
			seg(0, 0, 1, 0),
			seg(0, 1, 0, 2)
		]);
	});

	it('segments alignés bout à bout ou qui se chevauchent : fusionnés', () => {
		expect(normaliserSegments([seg(0, 0, 1, 0), seg(1, 0, 3, 0)])).toEqual([seg(0, 0, 3, 0)]);
		expect(normaliserSegments([seg(0, 0, 2, 0), seg(3, 0, 1, 0)])).toEqual([seg(0, 0, 3, 0)]);
		expect(normaliserSegments([seg(0, 0, 2, 2), seg(1, 1, 3, 3)])).toEqual([seg(0, 0, 3, 3)]);
	});

	it('alignés mais séparés par un trou : gardés à part', () => {
		expect(normaliserSegments([seg(0, 0, 1, 0), seg(2, 0, 3, 0)])).toEqual([
			seg(0, 0, 1, 0),
			seg(2, 0, 3, 0)
		]);
	});

	it('parallèles sur deux droites différentes : jamais fusionnés', () => {
		expect(normaliserSegments([seg(0, 0, 1, 0), seg(0, 1, 1, 1)])).toHaveLength(2);
	});

	it('segment de longueur nulle : retiré', () => {
		expect(normaliserSegments([seg(1, 1, 1, 1)])).toEqual([]);
	});

	it('écarts d’arrondi absorbés', () => {
		expect(normaliserSegments([seg(0, 0, 1.0000000000001, 0), seg(1, 0, 2, 0)])).toEqual([
			seg(0, 0, 2, 0)
		]);
	});
});

describe('normaliserSegments — frontière d’arrondi', () => {
	it('une même droite à cheval sur une frontière de la clé : fusionnée', () => {
		// y = 4,99e-7 et 5,01e-7 : points confondus à la tolérance près, clés arrondies différentes
		expect(
			normaliserSegments([seg(0, 4.99e-7, 2, 4.99e-7), seg(1, 5.01e-7, 3, 5.01e-7)])
		).toHaveLength(1);
	});
});

describe('memesTraces', () => {
	it('deux carrés parcourus différemment : même tracé', () => {
		const sensDirect = [seg(0, 0, 2, 0), seg(2, 0, 2, 2), seg(2, 2, 0, 2), seg(0, 2, 0, 0)];
		const autre = [
			seg(0, 0, 0, 1),
			seg(0, 1, 0, 2),
			seg(0, 2, 2, 2),
			seg(2, 2, 2, 0),
			seg(2, 0, 0, 0)
		];
		expect(memesTraces(sensDirect, autre)).toBe(true);
	});

	it('un côté de moins : tracés différents', () => {
		const carre = [seg(0, 0, 2, 0), seg(2, 0, 2, 2), seg(2, 2, 0, 2), seg(0, 2, 0, 0)];
		expect(memesTraces(carre, carre.slice(1))).toBe(false);
	});
});

describe('sortDuCadre', () => {
	it('dans le cadre 20 × 20 (de -10 à 10), bords compris', () => {
		expect(sortDuCadre([seg(-10, -10, 10, 10)], { x: 0, y: 0 })).toBe(false);
	});

	it('un segment qui dépasse, ou la tortue hors cadre : signalé', () => {
		expect(sortDuCadre([seg(0, 0, 11, 0)], { x: 0, y: 0 })).toBe(true);
		expect(sortDuCadre([], { x: 0, y: -12 })).toBe(true);
	});
});
