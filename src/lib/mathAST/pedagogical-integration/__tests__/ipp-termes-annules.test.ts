/**
 * Intégration par parties dont des termes s'annulent (R4, Q43 — David, 2026-10-24)
 *
 * `∫(x + 1)eˣ` finissait sur `(x + 1)eˣ − eˣ`, sans « On simplifie » :
 * développée, la primitive n'a plus qu'un terme (`xeˣ + eˣ − eˣ = xeˣ`), et
 * l'exponentielle n'était plus « partagée ». Elle s'écrit `xeˣ`, dans une
 * étape « On simplifie », comme `(2x + 1)eˣ − 2eˣ = (2x − 1)eˣ`.
 */
import { describe, expect, it } from 'vitest';
import { toLatex } from '../../latex-generator';
import { parseLatex } from '../../parser';
import { generatePedagogicalIntegrationSteps } from '..';

function primitive(integrand: string) {
	return generatePedagogicalIntegrationSteps(parseLatex(integrand), { level: 'lycee' });
}

describe('R4 : (x + 1)eˣ − eˣ → xeˣ, avec son étape', () => {
	it('∫(x + 1)eˣ = xeˣ', () => {
		expect(toLatex(primitive('(x+1)e^x').antiderivative)).toBe('x \\exponentialE^x');
	});

	it('l’étape « On simplifie » part de la primitive brute', () => {
		const step = primitive('(x+1)e^x').steps.find((s) => s.rule === 'simplify-result');
		expect(step && toLatex(step.before)).toBe(
			'\\left( x + 1 \\right) \\exponentialE^x - \\exponentialE^x'
		);
		expect(step && toLatex(step.after)).toBe('x \\exponentialE^x');
	});

	it('∫(x + 1)e^{−x} = (−x − 2)e^{−x} : inchangé (rien ne s’annule)', () => {
		const before = toLatex(primitive('(x+1)e^{-x}').antiderivative);
		expect(before).not.toContain('\\left( x + 1 \\right) \\exponentialE^{-x} -');
	});

	it.each([
		['(2x+1)e^x', '\\left( 2 x - 1 \\right) \\exponentialE^x'],
		['xe^x', '\\left( x - 1 \\right) \\exponentialE^x'],
		['(x+2)e^{x}', '\\left( x + 1 \\right) \\exponentialE^x']
	])('∫ %s → %s : inchangé', (integrand, expected) => {
		expect(toLatex(primitive(integrand).antiderivative)).toBe(expected);
	});
});
