/**
 * Longueurs de segments, lot 2 : calcul et correction (spécification validée le 2026-10-12,
 * `docs/archive/wip/longueurs-segments-progress.md`).
 *
 * - une longueur se calcule comme une inconnue dont l'identité est la paire de points
 *   triée : `AB` = `BA` ;
 * - elle se nomme, se substitue, se dérive et se résout sous `AB` ou `BA` ;
 * - sans valeur, elle n'est pas évaluable (message en français) ;
 * - l'ordre des points est libre pour la forme (`checkForm`) ;
 * - un nom de figure (`ABC`) est refusé au calcul et à la correction (Q-A).
 *
 * Toujours en mode `capitalPairs: 'length'` explicite, sur des entrées parsées, coefficients ≠ 1.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../equivalence';
import { parseLatex } from '../parser';
import { tidy } from '../tidy';
import { toLatex } from '../latex-generator';
import { getVariables, hasVariable, substitute } from '../eval/substitute';
import { evaluate } from '../eval/evaluate';
import { containsVariable } from '../common/contains-variable';
import { figureNameRefusal } from '../common/segment-names';
import { checkForm } from '../cosmetic-transforms';
import { differentiate } from '../differentiation';
import { solve } from '../solve';
import { inferType } from '../numtype';
import { analyzeDimensions } from '../dimensional/analyzer';
import { unit } from '../units/factory';
import { unitsEqual } from '../units/operations';
import type { MathNode, RelationNode } from '../types';

// =============================================================================
// Helpers
// =============================================================================

const LENGTH = { capitalPairs: 'length' } as const;

function read(latex: string): MathNode {
	return parseLatex(latex, LENGTH);
}

function equivalent(a: string, b: string): boolean {
	return areEquivalent(read(a), read(b));
}

function readEquation(latex: string): RelationNode {
	const node = read(latex);
	if (node.type !== 'relation') throw new Error(`Pas une équation : ${latex}`);
	return node;
}

function decimalValue(node: MathNode): number | null {
	const result = evaluate(node, { mode: 'decimal' });
	if (result.status !== 'value' || typeof result.value !== 'number') return null;
	return result.value;
}

const FIGURE_MESSAGE =
	'ABC n’est pas une longueur : une longueur se nomme avec deux points (AB). Pour un produit, écris A×B×C.';

// =============================================================================
// Équivalence : cas réels de collège
// =============================================================================

describe('équivalence : cas réels de collège', () => {
	it.each([
		['AB^2=AC^2+BC^2', 'BA^2=CA^2+CB^2'],
		['\\frac{AM}{AB}=\\frac{AN}{AC}', '\\frac{MA}{BA}=\\frac{NA}{CA}'],
		['AB+BC+CA', 'CA+AB+BC'],
		['2AB=CD', 'CD=2BA'],
		['3AB+2BA', '5AB'],
		['AB^2', '(AB)^2'],
		["A'B'=3AB", "3BA=B'A'"]
	])('%s ≡ %s', (a, b) => {
		expect(equivalent(a, b)).toBe(true);
	});

	it.each([
		['AB^2=AC^2+BC^2', 'AB^2=AC^2-BC^2'],
		['\\frac{AM}{AB}=\\frac{AN}{AC}', '\\frac{AM}{AB}=\\frac{AC}{AN}'],
		['AB+BC+CA', 'AB+BC+AC+1'],
		['2AB=CD', 'AB=2CD'],
		['AB', 'A\\times B'],
		['2AB', '2AC']
	])('%s ≢ %s', (a, b) => {
		expect(equivalent(a, b)).toBe(false);
	});
});

// =============================================================================
// Écriture : l'ordre de l'élève
// =============================================================================

describe('tidy : la longueur garde l’ordre de sa première écriture', () => {
	it.each([
		['3AB+2BA', '5 AB'],
		['2BA+3AB', '5 BA'],
		['3AB-AB', '2 AB'],
		['4AB^2-AB^2', '3 AB^2']
	])('tidy(%s) = %s', (latex, expected) => {
		expect(toLatex(tidy(read(latex)))).toBe(expected);
	});
});

// =============================================================================
// Nommer, substituer, évaluer
// =============================================================================

describe('une longueur se nomme et se substitue sous AB ou BA', () => {
	it('getVariables rend les longueurs sous leur nom écrit (première écriture)', () => {
		expect(getVariables(read('3AB^2+2x'))).toEqual(new Set(['AB', 'x']));
	});

	it('containsVariable et hasVariable reconnaissent la longueur dans les deux ordres', () => {
		expect(containsVariable(read('3BA^2'), 'AB')).toBe(true);
		expect(containsVariable(read('3AB^2'), 'BA')).toBe(true);
		expect(containsVariable(read('3AB^2'), 'AC')).toBe(false);
		expect(hasVariable(read('3BA^2'), 'AB')).toBe(true);
	});

	it.each([
		['3AB^2+1', 'AB'],
		['3BA^2+1', 'AB'],
		['3AB^2+1', 'BA']
	])('substitute(%s, { %s: 4 }) vaut 49', (latex, name) => {
		expect(decimalValue(substitute(read(latex), { [name]: 4 }))).toBe(49);
	});

	it('une longueur sans valeur n’est pas évaluable, avec un message en français', () => {
		const result = evaluate(read('3AB+1'));
		expect(result.status).toBe('unevaluable');
		if (result.status !== 'unevaluable') return;
		expect(result.reason).toBe('On ne connaît pas la valeur de la longueur AB.');
	});
});

// =============================================================================
// Dériver, résoudre, typer
// =============================================================================

describe('une longueur se dérive et se résout comme une inconnue', () => {
	it('d/dAB (3AB^2) = 6AB, même écrite BA', () => {
		expect(areEquivalent(differentiate(read('3BA^2'), { variable: 'AB' }), read('6AB'))).toBe(true);
	});

	it('d/dx (3AB x^2) = 6AB x : la longueur est une constante pour x', () => {
		expect(areEquivalent(differentiate(read('3ABx^2'), { variable: 'x' }), read('6ABx'))).toBe(
			true
		);
	});

	it('AB^2 = 25 : AB = 5 (une longueur est positive, lot positivité)', () => {
		const result = solve(readEquation('AB^2=25'), { variable: 'AB' });
		const values = result.solutions
			.map((s) => decimalValue(s.value))
			.sort((a, b) => (a ?? 0) - (b ?? 0));
		expect(values).toEqual([5]);
	});

	it('3BA = 12, résolue pour AB : AB = 4', () => {
		const result = solve(readEquation('3BA=12'), { variable: 'AB' });
		expect(result.solutions.map((s) => decimalValue(s.value))).toEqual([4]);
	});

	it('numtype : une longueur est un réel, un nom de figure n’est pas un nombre', () => {
		expect(inferType(read('AB'), {}).base).toBe('real');
		expect(inferType(read('ABC'), {}).base).toBe('unknown');
	});
});

// =============================================================================
// Forme (checkForm)
// =============================================================================

describe('checkForm : l’ordre des points est libre', () => {
	it('3BA a la forme de 3AB', () => {
		const result = checkForm('3BA', '3AB', {}, LENGTH);
		expect(result.valid).toBe(true);
		expect(result.violations).toEqual([]);
	});

	it('(AB)^2 a la forme de AB^2, sans faute de parenthèses', () => {
		const result = checkForm('(AB)^2', 'AB^2', { brackets: 'strict' }, LENGTH);
		expect(result.valid).toBe(true);
		expect(result.violations).toEqual([]);
	});

	it('A×B n’a pas la forme de la longueur AB', () => {
		expect(checkForm('A\\times B', 'AB', {}, LENGTH).valid).toBe(false);
	});
});

// =============================================================================
// Nom de figure : refusé au calcul et à la correction (Q-A)
// =============================================================================

describe('nom de figure : refusé, avec un message', () => {
	it('le message dit ce qu’est une longueur et comment écrire un produit', () => {
		expect(figureNameRefusal(read('3ABC'))).toBe(FIGURE_MESSAGE);
		expect(figureNameRefusal(read('3AB'))).toBeNull();
	});

	it('ABC n’est équivalent à aucune autre écriture', () => {
		expect(equivalent('2ABC', '2AB\\times C')).toBe(false);
		expect(equivalent('ABC', 'A\\times B\\times C')).toBe(false);
	});

	it('evaluate refuse ABC avec le message', () => {
		const result = evaluate(read('2ABC'));
		expect(result.status).toBe('unevaluable');
		if (result.status !== 'unevaluable') return;
		expect(result.reason).toBe(FIGURE_MESSAGE);
	});

	it('checkForm refuse ABC avec le message', () => {
		const result = checkForm('ABC', 'AB', {}, LENGTH);
		expect(result.valid).toBe(false);
		expect(result.messages).toContain(FIGURE_MESSAGE);
	});
});

// =============================================================================
// Sans option : rien ne change
// =============================================================================

describe('sans option (produit) : rien ne change', () => {
	it('AB est le produit A·B, BA le même produit', () => {
		expect(areEquivalent(parseLatex('AB'), parseLatex('A\\times B'))).toBe(true);
		expect(getVariables(parseLatex('3AB'))).toEqual(new Set(['A', 'B']));
	});
});

// =============================================================================
// Analyse dimensionnelle
// =============================================================================

describe('analyse dimensionnelle : une longueur a l’unité déclarée sous AB ou BA', () => {
	const context = { variables: new Map([['AB', unit('m')!]]) };

	it('3BA + 2AB est en mètres', () => {
		const result = analyzeDimensions(read('3BA+2AB'), context);
		expect(result.valid).toBe(true);
		expect(result.resultUnit && unitsEqual(result.resultUnit, unit('m')!)).toBe(true);
	});

	it('une longueur sans unité déclarée est une erreur, comme une variable inconnue', () => {
		expect(analyzeDimensions(read('3AC'), context).valid).toBe(false);
	});
});

// =============================================================================
// Corrections de revue du lot 2
// =============================================================================

/** Les solutions d'une équation, écrites en LaTeX et triées. */
function solutionsOf(latex: string, variable?: string): string[] {
	const result = solve(readEquation(latex), variable === undefined ? {} : { variable });
	return result.solutions.map((s) => toLatex(s.value)).sort();
}

describe('solve : plusieurs longueurs, toutes des inconnues', () => {
	it('Thalès littéral : AM×AC = AN×AB, en AM → AM = AN·AB / AC', () => {
		const result = solve(readEquation('AM\\times AC=AN\\times AB'), { variable: 'AM' });
		expect(result.status).not.toBe('no-solution');
		expect(result.variable).toBe('AM');
		expect(result.solutions).toHaveLength(1);
		const [solution] = result.solutions;
		expect(solution && areEquivalent(solution.value, read('\\frac{AN\\times AB}{AC}'))).toBe(true);
	});

	it('la solution écrit les longueurs dans l’ordre de l’élève (BA reste BA)', () => {
		const [solution] = solutionsOf('2AM=3BA', 'AM');
		expect(solution).toContain('BA');
	});

	it('Pythagore littéral : AB^2 = AC^2 + BC^2, en AB → √(AC²+BC²) (AC = 3, BC = 4 : 5)', () => {
		const result = solve(readEquation('AB^2=AC^2+BC^2'), { variable: 'AB' });
		const values = result.solutions
			.map((s) => decimalValue(substitute(s.value, { AC: 3, CB: 4 })))
			.sort((a, b) => (a ?? 0) - (b ?? 0));
		expect(values).toEqual([5]);
	});

	it('AB + BC = 10, en AB → AB = 10 - BC', () => {
		const result = solve(readEquation('AB+BC=10'), { variable: 'AB' });
		const [solution] = result.solutions;
		expect(solution && areEquivalent(solution.value, read('10-BC'))).toBe(true);
	});

	it('x + AB = 3, en x → x = 3 - AB', () => {
		const result = solve(readEquation('x+AB=3'), { variable: 'x' });
		const [solution] = result.solutions;
		expect(solution && areEquivalent(solution.value, read('3-AB'))).toBe(true);
	});

	it('2x = AB, en x → x = AB / 2', () => {
		const result = solve(readEquation('2x=AB'), { variable: 'x' });
		const [solution] = result.solutions;
		expect(solution && areEquivalent(solution.value, read('\\frac{AB}{2}'))).toBe(true);
	});

	it('AB + BA = 10, sans variable : une seule inconnue, AB = 5', () => {
		const result = solve(readEquation('AB+BA=10'));
		expect(result.variable).toBe('AB');
		expect(result.solutions.map((s) => decimalValue(s.value))).toEqual([5]);
	});
});

describe('getVariables : une seule entrée par longueur', () => {
	it('AB et BA sont la même inconnue, nommée comme sa première écriture', () => {
		expect(getVariables(read('3AB+2BA+x'))).toEqual(new Set(['AB', 'x']));
		expect(getVariables(read('2BA+3AB'))).toEqual(new Set(['BA']));
	});
});

describe('checkForm : × entre deux longueurs, une notation', () => {
	it('AM = (AN×AB)/AC identique à l’attendu : correct, sans faute « products »', () => {
		const latex = 'AM=\\frac{AN\\times AB}{AC}';
		const result = checkForm(latex, latex, {}, LENGTH);
		expect(result.status).toBe('correct');
	});

	it('AN·AB a la forme de AN×AB', () => {
		expect(checkForm('AN\\cdot AB', 'AN\\times AB', {}, LENGTH).status).toBe('correct');
	});

	it('2×AB garde sa faute « products » (un nombre devant une longueur)', () => {
		const result = checkForm('2\\times AB', '2AB', {}, LENGTH);
		expect(result.violations.map((v) => v.id)).toContain('products');
	});

	it('(AB) a la forme de AB (pas de droite dans ce chantier)', () => {
		expect(checkForm('(AB)', 'AB', {}, LENGTH).status).toBe('correct');
	});
});

describe('numtype : une hypothèse sur AB vaut pour BA', () => {
	it('AB > 0 déclaré : BA est strictement positif', () => {
		const ctx = { assumptions: new Map([['AB', { sign: 'positive' as const }]]) };
		expect(inferType(read('BA'), ctx).sign).toBe('positive');
		expect(inferType(read('AB'), ctx).sign).toBe('positive');
	});
});

describe('noms de figure écrits à l’identique', () => {
	it('ABC ≡ ABC, mais ABC ≢ ACB et ABC ≢ AB', () => {
		expect(equivalent('ABC', 'ABC')).toBe(true);
		expect(equivalent('ABC', 'ACB')).toBe(false);
		expect(equivalent('ABC', 'AB')).toBe(false);
	});

	it('\\triangle ABC ≡ \\triangle ABC, mais 2ABC n’est pas calculé', () => {
		expect(equivalent('\\triangle ABC', '\\triangle ABC')).toBe(true);
		expect(equivalent('2ABC', 'ABC+ABC')).toBe(false);
	});
});
