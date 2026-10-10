/**
 * Changement de variable d'un nuage (manche 15, PR b) : ajustement affine de
 * (x ; z) ou (t ; y), relation retrouvée entre x et y, prévisions avec les
 * coefficients EXACTS (pleine précision, décision de David).
 *
 * Valeurs de référence (Python) : `docs/archive/wip/nuage-changement-variable-progress.md`.
 */

import { describe, it, expect } from 'vitest';
import {
	decimalFit,
	relationPole,
	relationX,
	relationY,
	squaredSign,
	transformValue,
	type VariableChange
} from '../variable-change';

// =============================================================================
// Helpers
// =============================================================================

const XS = [0, 1, 2, 3, 4, 5];
const YS = [2.1, 3, 4.6, 6.9, 10.2, 15.4];
const LN_Y: VariableChange = { variable: 'z', on: 'y', fn: 'ln' };

// =============================================================================
// Tests
// =============================================================================

describe('decimalFit — exemple de référence (z = ln(y))', () => {
	const zs = YS.map((y) => transformValue('ln', y)!);
	const fit = decimalFit(XS, zs)!;

	it('z = 0,401x + 0,723, r ≈ 0,9998, G(2,5 ; 1,726)', () => {
		expect(fit.slope).toBeCloseTo(0.4011126350407298, 12);
		expect(fit.intercept).toBeCloseTo(0.7230321754324351, 12);
		expect(fit.correlation).toBeCloseTo(0.9998054682649591, 12);
		expect(fit.meanX).toBe(2.5);
		expect(fit.meanY).toBeCloseTo(1.7258137630342596, 12);
	});

	it('prévisions sur la relation retrouvée, coefficients exacts', () => {
		expect(relationY(LN_Y, fit, 7, 1)).toBeCloseTo(34.1519819425406, 9);
		expect(relationX(LN_Y, fit, 50, 1)).toBeCloseTo(7.950362445381193, 9);
	});

	it('abscisses toutes égales : null ; ordonnées toutes égales : r null', () => {
		expect(decimalFit([1, 1], [2, 3])).toBeNull();
		expect(decimalFit([1, 2], [3, 3])!.correlation).toBeNull();
	});
});

describe('les huit changements de variable', () => {
	const fit = { meanX: 0, meanY: 0, slope: 2, intercept: 1, correlation: 1, minX: 0, maxX: 1 };
	const cases: [VariableChange, number][] = [
		[{ variable: 'z', on: 'y', fn: 'ln' }, 1],
		[{ variable: 'z', on: 'y', fn: 'square' }, 1],
		[{ variable: 'z', on: 'y', fn: 'sqrt' }, 1],
		[{ variable: 'z', on: 'y', fn: 'inverse' }, 1],
		[{ variable: 't', on: 'x', fn: 'ln' }, 1],
		[{ variable: 't', on: 'x', fn: 'square' }, 1],
		[{ variable: 't', on: 'x', fn: 'sqrt' }, 1],
		[{ variable: 't', on: 'x', fn: 'inverse' }, 1]
	];

	it.each(cases)('%o : y(x) puis x(y) reviennent au point de départ', (change, sign) => {
		const x = 1.5;
		const y = relationY(change, fit, x, sign)!;
		expect(Number.isFinite(y)).toBe(true);
		expect(relationX(change, fit, y, sign)).toBeCloseTo(x, 9);
	});

	it('formes naturelles : valeurs', () => {
		expect(relationY({ variable: 'z', on: 'y', fn: 'sqrt' }, fit, 1, 1)).toBe(9); // (2·1 + 1)²
		expect(relationY({ variable: 'z', on: 'y', fn: 'inverse' }, fit, 1, 1)).toBeCloseTo(1 / 3);
		expect(relationY({ variable: 't', on: 'x', fn: 'square' }, fit, 3, 1)).toBe(19); // 2·9 + 1
		expect(relationY({ variable: 't', on: 'x', fn: 'inverse' }, fit, 2, 1)).toBe(2); // 2/2 + 1
		expect(relationY({ variable: 'z', on: 'y', fn: 'square' }, fit, 4, -1)).toBe(-3); // −√9
	});

	it('hors du domaine : null (ln x pour x ⩽ 0, 1/x en 0, √ d’un négatif)', () => {
		expect(relationY({ variable: 't', on: 'x', fn: 'ln' }, fit, 0, 1)).toBeNull();
		expect(relationY({ variable: 't', on: 'x', fn: 'inverse' }, fit, 0, 1)).toBeNull();
		expect(relationY({ variable: 't', on: 'x', fn: 'sqrt' }, fit, -1, 1)).toBeNull();
		// z = y² : y = √(2x + 1), pas de valeur pour 2x + 1 < 0
		expect(relationY({ variable: 'z', on: 'y', fn: 'square' }, fit, -1, 1)).toBeNull();
		// z = 1/y : pôle en x = −b/a
		expect(relationY({ variable: 'z', on: 'y', fn: 'inverse' }, fit, -0.5, 1)).toBeNull();
	});

	it('x pour un y : aucune solution hors de l’image', () => {
		expect(relationX({ variable: 'z', on: 'y', fn: 'ln' }, fit, -3, 1)).toBeNull();
		expect(relationX({ variable: 'z', on: 'y', fn: 'sqrt' }, fit, -3, 1)).toBeNull();
		expect(relationX({ variable: 'z', on: 'y', fn: 'square' }, fit, -3, 1)).toBeNull();
		expect(relationX({ variable: 't', on: 'x', fn: 'sqrt' }, fit, 0, 1)).toBeNull();
	});

	it('pente nulle : « all » si y est la constante, sinon « flat »', () => {
		const flat = { ...fit, slope: 0, intercept: 2 };
		expect(relationX({ variable: 't', on: 'x', fn: 'ln' }, flat, 2, 1)).toBe('all');
		expect(relationX({ variable: 't', on: 'x', fn: 'ln' }, flat, 3, 1)).toBe('flat');
		expect(relationX({ variable: 'z', on: 'y', fn: 'ln' }, flat, Math.exp(2), 1)).toBe('all');
	});

	it('pente nulle mais y hors du domaine : le domaine d’abord (null, pas « flat »)', () => {
		const flat = { ...fit, slope: 0, intercept: 2 };
		expect(relationX({ variable: 'z', on: 'y', fn: 'ln' }, flat, -1, 1)).toBeNull();
	});

	it('valeurs directes : t = ln(x) et t = √x', () => {
		expect(relationY({ variable: 't', on: 'x', fn: 'ln' }, fit, Math.E, 1)).toBeCloseTo(3, 12);
		expect(relationY({ variable: 't', on: 'x', fn: 'sqrt' }, fit, 4, 1)).toBe(5);
	});

	it('débordement : « overflow », jamais Infinity (revue)', () => {
		// t = ln(x), y = 2000 : x = e^999,5
		expect(relationX({ variable: 't', on: 'x', fn: 'ln' }, fit, 2000, 1)).toBe('overflow');
		// z = ln(y), x = 2000 : y = e^4001
		expect(relationY({ variable: 'z', on: 'y', fn: 'ln' }, fit, 2000, 1)).toBe('overflow');
		// Fini mais au-delà de 10^15 : trop grand pour être écrit et dessiné
		expect(relationY({ variable: 'z', on: 'y', fn: 'ln' }, fit, 20, 1)).toBe('overflow');
	});

	it('pôles : 1/(ax + b) en −b/a, a/x + b en 0, sinon aucun', () => {
		expect(relationPole({ variable: 'z', on: 'y', fn: 'inverse' }, fit)).toBe(-0.5);
		expect(relationPole({ variable: 't', on: 'x', fn: 'inverse' }, fit)).toBe(0);
		expect(relationPole({ variable: 'z', on: 'y', fn: 'ln' }, fit)).toBeNull();
	});
});

describe('transformValue, squaredSign', () => {
	it('domaines', () => {
		expect(transformValue('ln', 0)).toBeNull();
		expect(transformValue('sqrt', -1)).toBeNull();
		expect(transformValue('inverse', 0)).toBeNull();
		expect(transformValue('square', -3)).toBe(9);
	});

	it('signe de la variable élevée au carré : un seul, sinon le point fautif', () => {
		expect(squaredSign([0, 1, 2])).toEqual({ sign: 1 });
		expect(squaredSign([-1, -2, 0])).toEqual({ sign: -1 });
		expect(squaredSign([1, 0, -2])).toEqual({ mixed: 3 });
	});
});
