/**
 * Budgets d'exécution optionnels de l'interpréteur (bloc ubumark ```figure).
 *
 * Le bloc est rendu partout (chat élève, tableau blanc) : un script hostile ne
 * doit jamais figer l'onglet. Les boucles sont plafonnées à 1000 tours CHACUNE,
 * mais trois boucles imbriquées font 10^9 tours ; `polygone_regulier(O, 1, 10^7)`
 * crée 10^7 objets en une seule instruction. Sans option, rien ne change.
 */
import { describe, it, expect } from 'vitest';
import { parseDsl, interpretDsl, DslRuntimeError, Figure, FigureElementLimitError } from '../..';

const NESTED = [
	'pour i de 1 a 1000:',
	'    pour j de 1 a 1000:',
	'        pour k de 1 a 1000:',
	'            x = 1'
].join('\n');

describe('interpret — budget d’instructions (maxSteps)', () => {
	it('trois boucles imbriquées s’arrêtent vite, erreur située', () => {
		const start = performance.now();
		let caught: unknown = null;
		try {
			interpretDsl(parseDsl(NESTED), undefined, undefined, { maxSteps: 5000 });
		} catch (e) {
			caught = e;
		}
		expect(performance.now() - start).toBeLessThan(500);
		expect(caught).toBeInstanceOf(DslRuntimeError);
		expect((caught as DslRuntimeError).message).toMatch(/budget/i);
		expect((caught as DslRuntimeError).line).toBeGreaterThan(0);
	});

	it('une boucle dont le corps ne fait rien compte aussi ses tours', () => {
		const script = 'pour i de 1 a 900:\n    pour j de 1 a 900:\n        si 0:\n            x = 1';
		expect(() => interpretDsl(parseDsl(script), undefined, undefined, { maxSteps: 2000 })).toThrow(
			/budget/i
		);
	});

	it('sans option, le comportement historique est inchangé', () => {
		const script = 'pour i de 1 a 50:\n    pour j de 1 a 50:\n        x = 1';
		expect(() => interpretDsl(parseDsl(script))).not.toThrow();
	});

	it('un script normal tient dans le budget', () => {
		const script = 'A = point(0, 0)\nB = point(4, 0)\nC = point(0, 3)\np = polygone(A, B, C)';
		const { figure } = interpretDsl(parseDsl(script), undefined, undefined, { maxSteps: 100 });
		expect(figure.size).toBeGreaterThanOrEqual(4);
	});
});

describe('Figure — plafond d’objets (setElementLimit)', () => {
	it('polygone_regulier à 10^7 sommets refusé dès le plafond franchi', () => {
		const figure = new Figure();
		figure.setElementLimit(300);
		const start = performance.now();
		expect(() =>
			interpretDsl(parseDsl('O = point(0, 0)\np = polygone_regulier(O, 1, 10000000)'), figure)
		).toThrow(FigureElementLimitError);
		expect(performance.now() - start).toBeLessThan(500);
		expect(figure.size).toBeLessThanOrEqual(300);
	});

	it('sans plafond, aucune limite (comportement historique)', () => {
		const figure = new Figure();
		interpretDsl(parseDsl('O = point(0, 0)\np = polygone_regulier(O, 1, 400)'), figure);
		expect(figure.size).toBeGreaterThan(400);
	});
});
