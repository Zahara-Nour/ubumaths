/**
 * `factorCommonExponential` n'avale que les refus attendus de pedagogical-simplify
 * (`PedagogicalSimplifyNotImplemented`) : la primitive passe alors par `tidy`.
 * Toute autre erreur remonte (revue du lot 4 de l'ADR 0024).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toLatex } from '../../latex-generator';
import { parseLatex } from '../../parser';
import { PedagogicalSimplifyNotImplemented } from '../../pedagogical-simplify/types';
import { generatePedagogicalIntegrationSteps } from '..';

const failure = vi.hoisted(() => ({ error: null as Error | null }));

vi.mock('../../pedagogical-simplify/pipeline', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../pedagogical-simplify/pipeline')>();
	return {
		...original,
		generatePedagogicalSimplifySteps: (
			...args: Parameters<typeof original.generatePedagogicalSimplifySteps>
		) => {
			if (failure.error) throw failure.error;
			return original.generatePedagogicalSimplifySteps(...args);
		}
	};
});

afterEach(() => {
	failure.error = null;
});

describe('erreurs de pedagogical-simplify dans « On simplifie »', () => {
	it('un refus attendu : la primitive reste celle de tidy', () => {
		failure.error = new PedagogicalSimplifyNotImplemented('hors champ');
		const result = generatePedagogicalIntegrationSteps(parseLatex('3xe^x'), { level: 'lycee' });
		expect(toLatex(result.antiderivative)).toBe('3 x \\exponentialE^x - 3 \\exponentialE^x');
	});

	it('une autre erreur remonte', () => {
		failure.error = new Error('bogue imprévu');
		expect(() =>
			generatePedagogicalIntegrationSteps(parseLatex('3xe^x'), { level: 'lycee' })
		).toThrow('bogue imprévu');
	});
});
