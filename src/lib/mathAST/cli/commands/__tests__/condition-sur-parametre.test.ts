/**
 * `.solve` montre la CONDITION sur le paramètre que porte une solution
 * (lot 1 « réciproque », 2026-10-13) : `e^{2x+1} = a` → x = ln(a)/2 − 1/2
 * SI a > 0. Sans elle, la réponse serait fausse pour a ≤ 0.
 *
 * Et `x^2 = a` ne dit plus « Delta < 0, pas de solution reelle » au-dessus
 * de x = ±√a : le Δ littéral (4a) était lu par `parseFloat` (NaN) comme
 * négatif.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../../web/web-repl-engine';

function run(command: string): { success: boolean; output: string; latex: string } {
	const result = new WebReplEngine().execute(command);
	return {
		success: result.success,
		output: result.output,
		latex: (result.latex ?? '').replace(/\s/g, '')
	};
}

describe('la condition sur le paramètre accompagne la solution', () => {
	it('e^{2x+1}=a : si a > 0, dans le texte et le LaTeX', () => {
		const r = run('.solve e^{2x+1}=a');
		expect(r.success).toBe(true);
		expect(r.output).toMatch(/, si a>0$/);
		expect(r.latex).toMatch(/\\quad\\text\{si\}a>0$/);
	});

	it('x^2=a : la condition une seule fois pour les deux solutions', () => {
		const r = run('.solve x^2=a');
		expect(r.latex).toMatch(/^S=\\left\\\{.*\\right\\\}\\quad\\text\{si\}a\\geqslant0$/);
	});

	it('\\ln(x-1)=a : aucune condition', () => {
		const r = run('.solve \\ln(x-1)=a');
		expect(r.output).not.toContain(' si ');
		expect(r.latex).not.toContain('si');
	});

	it('x^2=4 : inchangé, sans condition', () => {
		expect(run('.solve x^2=4').latex).toBe('S=\\left\\{-2\\,;\\,2\\right\\}');
	});
});

describe('Δ littéral : pas de conclusion sur son signe', () => {
	it('x^2=a : ni « Delta < 0 » ni « pas de solution reelle »', () => {
		const r = run('.solve x^2=a');
		expect(r.output).not.toContain('pas de solution reelle');
		expect(r.output).not.toContain('< 0');
	});
});
