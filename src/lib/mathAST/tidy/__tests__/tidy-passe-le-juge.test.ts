/**
 * Invariant « écrire ↔ juger » : ce que `tidy` écrit passe le juge de forme sans remarque.
 *
 * `tidy` met au propre les corrections et les résultats de l'Atelier ; `checkForm`
 * (`cosmetic-transforms.ts`) juge l'écriture d'une réponse d'élève. Une écriture de
 * `tidy` que le juge signalerait serait une correction qu'on reprocherait à l'élève
 * de recopier. Réponse comparée à elle-même : seules les règles de superflu
 * (`brackets`, `signs`, `reducedFractions`…) peuvent parler, pas la contrainte `form`.
 *
 * Chantier : docs/wip/simplify-carte-progress.md § 10.
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { parseCustom } from '../../parser/custom';
import { toLatex } from '../../latex-generator';
import { checkForm } from '../../cosmetic-transforms';

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
	'1/(x+1)+1'
];

// Écart connu (2026-10-22) : `toLatex` n'espace pas les chiffres (`1024`, `30000`),
// le juge exige `1\,024` dès 4 chiffres (contrainte `spaces`). Pas un défaut de `tidy` :
// à trancher par David (§ 10). Quand l'écart sera réglé, `it.fails` passera au rouge
const ECART_SPACES = ['2^10', '3*10^4', '12345/100'];

function judge(input: string) {
	const written = toLatex(tidy(parseCustom(input)));
	const verdict = checkForm(written, written, {});
	expect({ written, violations: verdict.violations, messages: verdict.messages }).toEqual({
		written,
		violations: [],
		messages: []
	});
	expect(verdict.status).toBe('correct');
}

describe('tidy passe le juge de forme', () => {
	it.each(PANEL.filter((s) => !ECART_SPACES.includes(s)))(
		'tidy(%s) ne reçoit aucune remarque',
		judge
	);

	it.fails.each(ECART_SPACES)('écart connu (spaces) : tidy(%s) reçoit une remarque', judge);
});
