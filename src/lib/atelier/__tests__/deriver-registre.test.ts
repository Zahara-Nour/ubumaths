/**
 * `.dériver` : les étapes de l'Atelier aboutissent à la réponse du registre
 * (chantier `registre-reference`, D1, D3 et R5).
 *
 * L'Atelier affiche la réponse du registre (`diff.command`) ; ses étapes
 * viennent d'un autre calcul (`deriveSteps` : `pedagogical-differentiation`,
 * puis la forme finale). Si les deux divergeaient, la dernière étape
 * contredirait la ligne affichée. Comparé sur le corpus de l'oracle des
 * dérivées, saisies de l'atelier (les lignes à définitions préalables,
 * `setup`, dérivent une expression substituée par l'Atelier : hors de ce test).
 */

import { describe, expect, it } from 'vitest';
import { CORPUS } from '$lib/mathAST/differentiation/__tests__/oracle/derivatives-corpus';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { deriveSteps } from '../derive-steps';
import { decimalCommaLatex } from '../decimal-comma';

const CASES = CORPUS.filter((c) => c.custom !== undefined && c.setup === undefined).map(
	(c) => [c.id, c.custom ?? '', c.variable] as const
);

/** La réponse des étapes et celle du registre, `null` si l'une manque. */
function answers(
	custom: string,
	variable: string | undefined
): { readonly steps: string; readonly registre: string } | null {
	const derived = deriveSteps(custom, undefined, variable);
	const registre = new WebReplEngine().execute(
		`.diff ${custom}${variable === undefined ? '' : ` ; ${variable}`}`
	);
	if (derived === null || !registre.success || registre.answer === undefined) return null;
	// La virgule décimale est l'habillage de l'Atelier, appliqué aux deux
	return { steps: decimalCommaLatex(derived.answer), registre: decimalCommaLatex(registre.answer) };
}

/** Les lignes où les deux répondent (sans étapes : `sec`, valeur absolue — R4). */
const PAIRS = CASES.flatMap(([id, custom, variable]) => {
	const pair = answers(custom, variable);
	return pair === null ? [] : [[id, custom, pair] as const];
});

describe('.dériver : la dernière étape est la réponse du registre', () => {
	it.each(PAIRS)('%s : %s', (_id, _custom, pair) => {
		expect(pair.steps).toBe(pair.registre);
	});

	it('le corpus a bien des lignes comparées', () => {
		expect(PAIRS.length).toBeGreaterThan(250);
	});
});
