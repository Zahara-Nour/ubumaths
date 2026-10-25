/**
 * Invariant « écrire ↔ juger » : ce que `tidy` écrit passe le juge de forme sans remarque.
 *
 * `tidy` met au propre les corrections et les résultats de l'Atelier ; `checkForm`
 * (`cosmetic-transforms.ts`) juge l'écriture d'une réponse d'élève. Une écriture de
 * `tidy` que le juge signalerait serait une correction qu'on reprocherait à l'élève
 * de recopier. On juge l'écriture AFFICHÉE (`toFrenchDecimal`, qui pose les espaces
 * de groupement, règle du BIPM, § 15), celle que l'élève lit. Réponse comparée à elle-même : seules les règles de superflu
 * (`brackets`, `signs`, `reducedFractions`…) peuvent parler, pas la contrainte `form`.
 *
 * Garde par règle (§ 47) : chaque règle du registre `SUPERFLU_RULES` a au moins un
 * cas fautif ; le juge y nomme la règle, et `tidy` du même cas passe le juge. Une
 * règle ajoutée au registre sans cas fait échouer le test.
 *
 * Chantier : docs/archive/wip/simplify-carte-progress.md § 10.
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { parseCustom } from '../../parser/custom';
import { toLatex } from '../../latex-generator';
import { checkForm, cosmeticViolations } from '../../cosmetic-transforms';
import { parseLatexSafe } from '../../parser';
import { SUPERFLU_RULES, type SuperfluRuleId } from '../../superflu/rules';
import { toFrenchDecimal } from '../../../utils/french-math';

// Le panel des invariants de `tidy.test.ts`, puis une entrée par réécriture de `tidy`
// (inventaire du § 10) et des écritures courantes de corrections
const PANEL = [
	'2/6+1/4',
	'(2x)/(4y)',
	'sqrt(8)',
	'sqrt(12)+sqrt(3)',
	'1/sqrt(2)',
	'x+x',
	'3x+2x-x',
	'2x+3-x+1',
	'x*x*x',
	'(x+1)^2',
	'(x+1)*(x-1)',
	'2*(x+h)^2-2*x^2',
	'3*(x+1)^2*2',
	'x*(x+1)',
	'2*3*x*(x^2+1)^2',
	'2*x*sin(x)+x^2*cos(x)',
	'x/x',
	'sin(x)^2+cos(x)^2',
	'-(-x)',
	'x+(-3)',
	'(-x)/(-y)',
	'-(x+2)',
	'2(x+1)^2+3(x+1)^2',
	'(x+1)^2*(x+1)',
	'x^2*cos(x)+cos(x)*x^2',
	'0.5+0.25',
	'3x*0.5',
	'(6x+3)/9',
	'(2x-1)/(-3)',
	'3(-x-1)',
	'x^1',
	'(-x)^3',
	'-2^2',
	'2^10',
	'x^0',
	'(x^2)^3',
	'x^(-1)',
	'1/x^2',
	'sqrt(2)*sqrt(8)',
	'sqrt(1/2)',
	'2*sqrt(3)/3',
	'sqrt(x)*sqrt(x)',
	'ln(x+x)',
	'ln(9)',
	'2*ln(3)',
	'y*x',
	'sin(x)*x',
	'3-(-2x)',
	'x/(2y)',
	'2*(x+1)',
	'x*(-2)',
	'-x*3',
	'4*x*y*2',
	'x*1+0',
	'0*x+3',
	'(1/2)*x^3',
	'x^3/3',
	'-x^2/4',
	'2/3*pi',
	'pi/4+2pi',
	'e^x*e^(2x)',
	'(x+1)*e^x',
	'e^(-x)',
	'1/e^x',
	'3*10^4',
	'12345/100',
	'1-x',
	'x^2-3x+2',
	'(x-1)/(x+1)',
	'1/(x+1)+1',
	// Espaces de groupement (E2) : `2^10`, `3*10^4`, `12345/100` plus haut
	'1234.5678',
	'0.12345',
	'123456*2'
];

function judge(input: string) {
	const written = toFrenchDecimal(toLatex(tidy(parseCustom(input))));
	const verdict = checkForm(written, written, {});
	expect({ written, violations: verdict.violations, messages: verdict.messages }).toEqual({
		written,
		violations: [],
		messages: []
	});
	expect(verdict.status).toBe('correct');
}

describe('tidy passe le juge de forme', () => {
	it.each(PANEL)('tidy(%s) ne reçoit aucune remarque', judge);
});

describe('espaces de groupement écrits dans une correction (E2)', () => {
	it.each([
		['2^10', '1024'],
		['3*10^4', '30\\,000'],
		['1234.5678', '1234{,}5678'],
		['0.12345', '0{,}123\\,45']
	])('tidy(%s) s’affiche %s', (input, shown) => {
		expect(toFrenchDecimal(toLatex(tidy(parseCustom(input))))).toBe(shown);
	});
});

// Écritures fautives d'élève, en LaTeX : au moins une par règle du registre
const CAS_FAUTIFS: Record<SuperfluRuleId, readonly string[]> = {
	zeros: ['3.50', '007'],
	spaces: ['30000', '0.12345'],
	reducedRadicals: ['\\sqrt{12}', '3\\sqrt{8}', '\\sqrt{4}'],
	reducedFractions: ['\\frac{4}{6}', '\\frac{2x}{4}', '\\frac{3x}{6y}'],
	factorZero: ['0x+3', '0\\times x+2'],
	nullTerms: ['x+0'],
	brackets: ['(x)+1', '((x+1))', '-(3)'],
	signs: ['--x', 'x+(-3)', 'x-(-3)', '\\frac{-x}{-2}'],
	factorOne: ['1x+2', 'x\\times1'],
	products: ['2\\times x', 'x\\times\\sqrt{2}']
};

function violationIds(latex: string): string[] {
	return cosmeticViolations(latex, {}).map((violation) => violation.id);
}

describe('garde par règle : le juge nomme la faute, tidy la corrige', () => {
	it('chaque règle du registre a au moins un cas fautif', () => {
		for (const rule of SUPERFLU_RULES) {
			expect(CAS_FAUTIFS[rule.id].length, rule.id).toBeGreaterThan(0);
		}
	});

	describe.each(SUPERFLU_RULES.map((rule) => rule.id))('%s', (id) => {
		it.each(CAS_FAUTIFS[id])('%s', (latex) => {
			expect(violationIds(latex)).toContain(id);
			const parsed = parseLatexSafe(latex);
			expect(parsed.errors).toEqual([]);
			if (!parsed.ast) throw new Error(`analyse impossible : ${latex}`);
			const written = toFrenchDecimal(toLatex(tidy(parsed.ast)));
			expect({ written, violations: violationIds(written) }).toEqual({ written, violations: [] });
		});
	});
});
