/**
 * Les valeurs du tableau de variations passent par la valeur exacte à afficher
 * (lot 5c, `eval/exact-value.ts`) : la même écriture que l'Atelier et le grapheur.
 */

import { describe, it, expect } from 'vitest';
import { computeVariations } from '../compute';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { closedEndpoint, interval } from '$lib/math/intervals/factory';
import { intervalSet } from '../../domain/factory';

describe('valeurs du tableau de variations', () => {
	// Mesuré sur main (§ 49) : `π/12 + cos(π/6)` dans le tableau, `π/12 + √3/2` au grapheur
	it('calcule cos(π/6) dans l’ordonnée d’un extremum', () => {
		const domain = intervalSet([
			interval(closedEndpoint(parseLatex('0')), closedEndpoint(parseLatex('\\pi')))
		]);
		const result = computeVariations(parseLatex('\\cos(x)+\\frac{x}{2}'), { domain });
		const values = result.extrema.map((extremum) => toLatex(extremum.y));

		expect(values).toContain('\\dfrac{\\pi}{12} + \\dfrac{\\sqrt{3}}{2}');
		expect(values.join(' ')).not.toContain('\\cos');
	});
});
