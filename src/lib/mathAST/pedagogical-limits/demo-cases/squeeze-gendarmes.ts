/**
 * Pedagogical Limits — Squeeze / théorème des gendarmes demo cases.
 *
 * Application du théorème d'encadrement pour les expressions de la forme
 * `bornée(x) × g(x)` où `g(x) → 0` et `bornée(x)` reste finie. Émet
 * `identify-bounds` + `apply-squeeze` (vocab adaptive : « gendarmes »
 * lycée vs « encadrement (squeeze) » sup).
 *
 * Heuristique numérique V1.1.d : probe `evaluateAtPoint(expr, var, a±ε)`
 * à plusieurs échelles, vérifie boundedness (≤ 100) et convergence vers
 * 0 (≤ 10⁻²). Limitation : ne couvre que les limites valant 0.
 */

import type { DemoCategory } from '../demo-helpers';

export const SQUEEZE_GENDARMES: DemoCategory = {
	name: 'squeeze-gendarmes',
	cases: [
		{
			label: 'x · sin(1/x) à x=0 (cas iconique du théorème des gendarmes)',
			expression: 'x*sin(1/x)',
			approach: '0'
		},
		{
			label: 'x² · cos(1/x) à x=0',
			expression: '(x^2)*cos(1/x)',
			approach: '0'
		}
	]
};
