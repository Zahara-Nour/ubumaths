/**
 * Exécution du script d'une figure stockée : jamais d'exception, une erreur
 * porte sa ligne, et le flocon de Koch (la première figure publique prévue)
 * tient dans le budget.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFigureScript } from '../geometry-figure-script';
import { buildKochDsl } from '../../../routes/(public)/geometry-demo/sliders/koch/koch-dsl';

describe('evaluateFigureScript', () => {
	it('un script correct rend la figure', () => {
		const result = evaluateFigureScript('A = point(0, 0)\nB = point(3, 0)\ns = segment(A, B)');
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.figure.getAllElements().length).toBeGreaterThanOrEqual(3);
	});

	it('une erreur rend son numéro de ligne, sans lever', () => {
		const result = evaluateFigureScript('A = point(0, 0)\nB = inconnue(1)');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.line).toBe(2);
			expect(result.message).toMatch(/^Ligne 2/);
		}
	});

	it('une erreur de syntaxe rend aussi sa ligne', () => {
		const result = evaluateFigureScript('A = point(0, 0)\n\nB = point(1,');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.line).toBe(3);
	});

	it('des boucles imbriquées démesurées sont arrêtées par le budget', () => {
		const result = evaluateFigureScript(
			'pour i de 1 a 1000:\n    pour j de 1 a 1000:\n        pour k de 1 a 1000:\n            x = 1'
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toMatch(/budget/i);
	});

	it('le flocon de Koch (4 étapes) tient dans le budget', () => {
		const script = buildKochDsl(4);
		expect(script.length).toBeGreaterThan(70_000);
		expect(evaluateFigureScript(script).ok).toBe(true);
	});
});
