/**
 * Demo equations — Index
 *
 * Each category is a thematic group of `DemoCase[]`. The exported `ALL_CATEGORIES`
 * is consumed by:
 * - `__tests__/linear-demo.test.ts` (one `describe()` per category for snapshot tests)
 * - `scripts/pedagogical-solve-demo.ts` (CLI runs all by default, or a single
 *   category passed as arg)
 *
 * To add a new equation: append to the relevant category file. To add a new
 * category: create a new file and import it here.
 *
 * @module mathAST/pedagogical-solve/demo-equations
 */

import type { DemoCategory } from '../demo-helpers';
import { SIMPLE } from './simple';
import { SIMPLE_NEGATIFS } from './simple-negatifs';
import { SIMPLES_FRACTIONS } from './simples-fractions';
import { SIMPLES_FRACTIONS_NEGATIFS } from './simples-fractions-negatifs';
import { REGROUPEMENT } from './regroupement';
import { REGROUPEMENT_FRACTIONS } from './regroupement-fractions';
import { EDGE_CASES } from './edge-cases';

export const ALL_CATEGORIES: readonly DemoCategory[] = [
	{ name: 'simple', cases: SIMPLE },
	{ name: 'simple-negatifs', cases: SIMPLE_NEGATIFS },
	{ name: 'simples-fractions', cases: SIMPLES_FRACTIONS },
	{ name: 'simples-fractions-negatifs', cases: SIMPLES_FRACTIONS_NEGATIFS },
	{ name: 'regroupement', cases: REGROUPEMENT },
	{ name: 'regroupement-fractions', cases: REGROUPEMENT_FRACTIONS },
	{ name: 'edge-cases', cases: EDGE_CASES }
];

export {
	SIMPLE,
	SIMPLE_NEGATIFS,
	SIMPLES_FRACTIONS,
	SIMPLES_FRACTIONS_NEGATIFS,
	REGROUPEMENT,
	REGROUPEMENT_FRACTIONS,
	EDGE_CASES
};
