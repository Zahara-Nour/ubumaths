/**
 * Sans l'option `capitalPairs` (défaut du parseur : produit), rien ne change par rapport
 * à AVANT le chantier des longueurs.
 *
 * L'empreinte (`fixtures/sans-option-avant-longueurs.json`) a été calculée le 2026-10-12
 * avec le code de `4c1acc74c` (avant le lot 1) : `tidy`, `simplify`, `getVariables`,
 * `solve` et `checkForm` sur des expressions sans majuscules collées ET sur les mêmes
 * chaînes à majuscules collées que les tests des longueurs (`AB+BA`, `ABC`, `BA`/`AB`…),
 * lues en produit.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseLatex } from '../parser';
import { toLatex } from '../latex-generator';
import { simplify } from '../simplify';
import { solve } from '../solve';
import { getVariables } from '../eval/substitute';
import { tidy } from '../tidy';
import { checkForm } from '../cosmetic-transforms';

// =============================================================================
// Constantes
// =============================================================================

const BEFORE: Readonly<Record<string, unknown>> = JSON.parse(
	readFileSync(
		fileURLToPath(new URL('./fixtures/sans-option-avant-longueurs.json', import.meta.url)),
		'utf-8'
	)
);

/**
 * Les changements VOULUS depuis l'empreinte, qui la remplacent clé par clé :
 * - `simplify` ne factorise plus `x²+2x+1` (ADR 0007, chantier simplify-carte § 33).
 */
const CHANGED_SINCE: Readonly<Record<string, unknown>> = {
	'simplify x^2+2x+1': 'x^2 + 2 x + 1'
};

/** La valeur attendue : l'empreinte, sauf changement voulu. */
function expected(key: string): unknown {
	return key in CHANGED_SINCE ? CHANGED_SINCE[key] : BEFORE[key];
}

const EXPRESSIONS = [
	'2x+3x',
	'(x+1)^2-x^2',
	'\\frac{6x}{4}',
	'ab+ba',
	'2\\pi R',
	'\\sqrt{8}+\\sqrt{2}',
	'x^2+2x+1',
	'5y-2y+3',
	'3(x+2)',
	'AB+BA',
	'3AB^2-AB^2',
	'ABC',
	'2AB\\times CD'
];

const EQUATIONS = ['x^2=9', '3x-6=0', '2x+1=x+4', 'AB=6', 'A^2=16', '5y=20'];

const FORMS: ReadonlyArray<readonly [string, string]> = [
	['3x', '3x'],
	['x3', '3x'],
	['2\\times x', '2x'],
	['(x)+1', 'x+1'],
	['BA', 'AB'],
	['A\\,B', 'AB'],
	['(AB)^2', 'AB^2'],
	['ABC', 'ABC'],
	['\\frac{4}{6}', '\\frac{2}{3}'],
	['AN\\times AB', 'AN AB']
];

// =============================================================================
// Tests
// =============================================================================

describe('sans option : tidy, simplify, getVariables comme avant le chantier', () => {
	it.each(EXPRESSIONS)('%s', (latex) => {
		const node = parseLatex(latex);
		expect(toLatex(tidy(node))).toBe(BEFORE[`tidy ${latex}`]);
		expect(toLatex(simplify(node).result)).toBe(expected(`simplify ${latex}`));
		expect([...getVariables(node)].sort()).toEqual(BEFORE[`vars ${latex}`]);
	});
});

describe('sans option : solve comme avant le chantier', () => {
	it.each(EQUATIONS)('%s', (latex) => {
		const node = parseLatex(latex);
		if (node.type !== 'relation') throw new Error(`Pas une équation : ${latex}`);
		const result = solve(node);
		expect({
			status: result.status,
			variable: result.variable,
			solutions: result.solutions.map((s) => toLatex(s.value))
		}).toEqual(BEFORE[`solve ${latex}`]);
	});
});

describe('sans option : checkForm comme avant le chantier', () => {
	it.each(FORMS)('%s contre %s', (answer, expected) => {
		const result = checkForm(answer, expected, {});
		expect({
			valid: result.valid,
			status: result.status,
			violations: result.violations.map((v) => v.id)
		}).toEqual(BEFORE[`form ${answer} | ${expected}`]);
	});
});
