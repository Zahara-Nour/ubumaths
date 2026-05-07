/**
 * Pedagogical Domain — Arcs trigonométriques demo cases.
 *
 * Cas pédagogiques pour `arcsin_constraint` / `arccos_constraint`.
 */

import type { DemoCategory } from '../demo-helpers';

export const ARCS_TRIGO: DemoCategory = {
	name: 'arcs-trigo',
	cases: [
		{
			label: 'arcsin(x)',
			expression: '\\arcsin(x)'
		},
		{
			label: 'arccos(x/2)',
			expression: '\\arccos\\left(\\dfrac{x}{2}\\right)'
		}
	]
};
