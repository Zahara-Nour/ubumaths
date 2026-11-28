/**
 * Une fonction par morceaux dans la console, par le chemin de l'Atelier :
 * `syncEngine` (atelier/engine.ts) lie f par `createFunctionBinding` à l'arbre
 * où les valeurs de l'atelier (ici k) sont DÉJÀ remplacées (`expressionOf`),
 * et lie k par `setBinding`. Puis l'élève tape `f(3)`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';
import { createFunctionBinding, setBinding } from '../../core/eval-state';
import { parseLatex } from '../../../parser';
import { substitute } from '../../../eval/substitute';
import { piecewise, piecewisePiece, number } from '../../../factory';

describe('WebReplEngine — f(x) = 3x pour x < k, x² pour x ≥ k, k = 2', () => {
	let engine: WebReplEngine;

	beforeEach(() => {
		engine = new WebReplEngine();
		const state = engine.getState();
		const body = piecewise([
			piecewisePiece(parseLatex('x<k'), parseLatex('3x')),
			piecewisePiece(parseLatex('x\\geq k'), parseLatex('x^2'))
		]);
		const k = number('2');
		setBinding(state, 'k', k);
		createFunctionBinding(state, 'f', ['x'], substitute(body, { k }));
	});

	it('f(3) = 9', () => {
		const result = engine.execute('f(3)');
		expect(result.success).toBe(true);
		expect(result.output).toBe('9');
	});

	it('f(1) = 3', () => {
		expect(engine.execute('f(1)').output).toBe('3');
	});

	it('f(2) = 4 (la borne va au morceau ≥)', () => {
		expect(engine.execute('f(2)').output).toBe('4');
	});

	it('f(√2) = 3√2, exact', () => {
		const result = engine.execute('f(\\sqrt{2})');
		expect(result.success).toBe(true);
		expect(result.answer).toMatch(/^3 ?\\sqrt\{2\}$/);
	});
});

describe('WebReplEngine — valeur hors des morceaux', () => {
	it('f(1/2) avec f(x) = 3x pour x < 0, x² pour x > 1 : refus en français', () => {
		const engine = new WebReplEngine();
		createFunctionBinding(
			engine.getState(),
			'f',
			['x'],
			piecewise([
				piecewisePiece(parseLatex('x<0'), parseLatex('3x')),
				piecewisePiece(parseLatex('x>1'), parseLatex('x^2'))
			])
		);
		const result = engine.execute('f(1/2)');
		expect(result.success).toBe(false);
		expect(result.output).toContain('Aucun morceau');
	});
});
