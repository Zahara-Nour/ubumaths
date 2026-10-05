/**
 * Un extremum n'est GLOBAL que si aucune limite aux bornes ne le dépasse —
 * revue de #857 (2026-10-05). Les limites infinies ou indéterminées étaient
 * écartées de la comparaison (`Number.isFinite`) : un maximum local devenait
 * « global » alors que f → +∞ (x³ − 3x : « Maximum global : f(−1) = 2 »),
 * et une limite indéterminée laissait conclure sans savoir.
 */

import { describe, it, expect } from 'vitest';
import { computeVariations } from '../compute';
import { parseCustom } from '../../parser/custom';
import type { VariationResult } from '../types';

function study(custom: string): VariationResult {
	return computeVariations(parseCustom(custom), { variable: 'x', includeBoundaryLimits: true });
}

/** Les extrema, sous la forme « type@x approché ». */
function extrema(custom: string): string[] {
	return study(custom).extrema.map(
		(e) => `${e.type}@${Number((e.xApproximate ?? NaN).toFixed(4))}`
	);
}

describe('extremum global : pas si une limite le dépasse', () => {
	it('x³ − 3x : deux extrema LOCAUX (f → ±∞)', () => {
		expect(extrema('x^3-3x')).toEqual(['local_maximum@-1', 'local_minimum@1']);
	});

	it('√x − x : maximum global en 1/4, pas de minimum global (f → −∞)', () => {
		const found = extrema('sqrt(x)-x');
		expect(found).toContain('global_maximum@0.25');
		expect(found.some((e) => e.startsWith('global_minimum'))).toBe(false);
	});

	it('x + 1/x : extrema locaux seulement', () => {
		expect(extrema('x+1/x').every((e) => e.startsWith('local_'))).toBe(true);
	});

	it('x⁴ − 2x² : minima globaux en ±1, maximum LOCAL en 0', () => {
		expect(extrema('x^4-2x^2')).toEqual([
			'global_minimum@-1',
			'local_maximum@0',
			'global_minimum@1'
		]);
	});

	it('une limite indéterminée interdit de conclure « global »', () => {
		const result = study('x^2*e^(-x)');
		const unknown = (result.boundaryLimits ?? []).some((l) => l.limit === 'indeterminate');
		if (unknown) expect(result.extrema.every((e) => e.type.startsWith('local_'))).toBe(true);
	});
});

describe('extremum global atteint : conservé', () => {
	it('x² : minimum global 0', () => {
		expect(extrema('x^2')).toEqual(['global_minimum@0']);
	});

	// Ses limites en ±∞ (0) sortent « indéterminées » : le moteur des limites ne
	// lit pas encore `e^…` (connu). Sans elles, on ne conclut pas « global ».
	it('e^{−x²} : maximum en 0 (local tant que les limites en e^… sont inconnues)', () => {
		expect(extrema('e^(-x^2)')).toEqual(['local_maximum@0']);
	});
});
