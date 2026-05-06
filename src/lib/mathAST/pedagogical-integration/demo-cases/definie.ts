/**
 * Pedagogical Integration — Intégrales définies demo cases.
 *
 * Definite-integral demos : exercises the full fundamental-theorem trio
 * (`apply-fundamental-theorem`, `substitute-bounds`, `simplify-bounds-result`).
 */

import type { DemoCategory } from '../demo-helpers';

export const DEFINIE: DemoCategory = {
	name: 'definie',
	cases: [
		{
			label: '(int_0^1 x dx)',
			latex: 'x',
			definite: { lower: '0', upper: '1' }
		},
		{
			label: '(int_0^2 x^2 dx)',
			latex: 'x^2',
			definite: { lower: '0', upper: '2' }
		},
		{
			label: '(int_0^1 e^x dx)',
			latex: 'e^x',
			definite: { lower: '0', upper: '1' }
		},
		{
			label: '(int_1^e 1/x dx)',
			latex: '\\dfrac{1}{x}',
			definite: { lower: '1', upper: 'e' }
		}
	]
};
