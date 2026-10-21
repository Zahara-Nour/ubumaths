/**
 * Virgule décimale dans les chaînes du DSL — chantier lecture-grandeurs, PR 6 (2026-10-21)
 *
 * Le parseur maison ne lit plus la virgule décimale (`DECIMAL_COMMA`). Le DSL, langue
 * d'auteur, la lisait dans ses chaînes (`courbe("y = 0,5x")`, `avec x > 1,5`,
 * `sur ]0,5 ; 1,5[`) : il passe chacune par `legacyDecimalCommas` (règle de l'ancien
 * tokenizer) et lit donc comme avant. Garde : l'écriture à virgule donne le même objet que
 * l'écriture au point.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '..';
import { parseDomainSuffix } from '../domain-parser';

// =============================================================================
// Helpers
// =============================================================================

/** L'objet de `c`, sans son identifiant ni son nom */
function curveOf(script: string): unknown {
	const { figure, symbols } = runDsl(script);
	const entry = symbols.get('c');
	expect(entry?.figureId).toBeDefined();
	const element = figure.getElementById(entry!.figureId!);
	expect(element).toBeDefined();
	// Les identifiants générés changent d'une figure à l'autre ; `equation*` garde le texte
	// tapé ; une borne tapée `1,5` est exacte (comme avant la PR 6), `1.5` numérique
	return JSON.parse(JSON.stringify(element), (key, value: unknown) => {
		if (key === 'id' || key === 'label' || key.endsWith('Id') || key.startsWith('equation')) {
			return undefined;
		}
		const bound = value as { kind?: string; node?: { type?: string; value?: string } };
		if (bound?.kind === 'exact' && bound.node?.type === 'number') {
			return { kind: 'numeric', value: Number(bound.node.value) };
		}
		return value;
	});
}

// =============================================================================
// Tests
// =============================================================================

describe('DSL : la virgule décimale des chaînes se lit comme le point', () => {
	it.each([
		['c = courbe("y = 0,5x")', 'c = courbe("y = 0.5x")'],
		['c = courbe("y = x^2 avec x > 1,5")', 'c = courbe("y = x^2 avec x > 1.5")'],
		['c = courbe("y = x^2 avec 0,5 < x <= 2")', 'c = courbe("y = x^2 avec 0.5 < x <= 2")'],
		[
			'c = courbe("x = 0,5cos(t)", "y = sin(t)", t_min=0, t_max=6)',
			'c = courbe("x = 0.5cos(t)", "y = sin(t)", t_min=0, t_max=6)'
		],
		[
			'c = courbe("r = 0,5*theta", theta_min=0, theta_max=6)',
			'c = courbe("r = 0.5*theta", theta_min=0, theta_max=6)'
		]
	])('%s = %s', (comma, point) => {
		expect(curveOf(comma)).toEqual(curveOf(point));
	});

	it('sur ]0,5 ; 1,5[ : bornes exactes, comme avant la PR 6', () => {
		const r = parseDomainSuffix(']0,5 ; 1,5[', 'sur', undefined, 1);
		expect(r.domain.lower).toEqual({ kind: 'exact', node: { type: 'number', value: '0.5' } });
		expect(r.domain.upper).toEqual({ kind: 'exact', node: { type: 'number', value: '1.5' } });
	});
});
