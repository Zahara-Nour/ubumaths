/**
 * Case « solution-ed » (`answerKind: 'solution-ed'`) : verdict seul, par
 * substitution dans l'équation. Comportements validés par David (Phase 0, 2026-10-04).
 */

import { describe, it, expect } from 'vitest';
import {
	judgeDifferentialEquationAnswer,
	readExpectedSolution,
	DIFFERENTIAL_EQUATION_FEEDBACK
} from '../differential-equation-answer';

const HOMOGENEOUS = { equation: "y'=2y" };
const AFFINE = { equation: "y'=2y-6" };

describe('mode « generale »', () => {
	const general = (equation: string) => ({ equation, solutionMode: 'generale' as const });

	it.each([
		["y'=2y", 'Ce^{2x}', 'correct'],
		["y'=2y", 'K\\mathrm{e}^{2x}', 'correct'],
		["y'=2y", 'y=Ce^{2x}', 'correct'],
		["y'=2y", 'y(x)=\\lambda e^{2x}', 'correct'],
		["y'=2y", 'Ce^{2x}+3', 'incorrect'],
		["y'=2y-6", 'Ce^{2x}+3', 'correct'],
		["y'-2y=-6", 'Ce^{2x}+3', 'correct'],
		["y'=2y-6", 'Ce^{2x}', 'incorrect'],
		["y'=2y-6", '', 'empty'],
		["y'=2y-6", 'e^{2x', 'incorrect']
	] as const)('%s : %s → %s', (equation, answer, status) => {
		expect(judgeDifferentialEquationAnswer(answer, general(equation)).status).toBe(status);
	});

	it('solution particulière : il manque la constante', () => {
		expect(judgeDifferentialEquationAnswer('5e^{2x}', general("y'=2y"))).toEqual({
			status: 'incorrect',
			feedback: DIFFERENTIAL_EQUATION_FEEDBACK.particular
		});
		expect(DIFFERENTIAL_EQUATION_FEEDBACK.particular).toBe(
			"C'est une solution particulière : il manque la constante."
		);
	});

	it('constante sans effet (0·C) : solution particulière', () => {
		expect(judgeDifferentialEquationAnswer('5e^{2x}+0C', general("y'=2y")).feedback).toBe(
			DIFFERENTIAL_EQUATION_FEEDBACK.particular
		);
	});

	it('constante écrite mais pas une solution : faux sans message', () => {
		expect(judgeDifferentialEquationAnswer('Ce^{3x}', general("y'=2y"))).toEqual({
			status: 'incorrect'
		});
	});
});

describe('mode « une » (défaut)', () => {
	it.each([
		[HOMOGENEOUS, '5e^{2x}', 'correct'],
		[HOMOGENEOUS, 'Ce^{2x}', 'correct'],
		[HOMOGENEOUS, '0', 'correct'],
		[HOMOGENEOUS, 'e^{3x}', 'incorrect'],
		[AFFINE, '3', 'correct'],
		[AFFINE, '-e^{2x}+3', 'correct'],
		[AFFINE, 'e^{2x}', 'incorrect']
	] as const)('%o : %s → %s', (spec, answer, status) => {
		expect(judgeDifferentialEquationAnswer(answer, spec).status).toBe(status);
	});

	it('condition initiale y(0)=4 : la réponse doit la vérifier', () => {
		const spec = { ...AFFINE, initial: 'y(0)=4' };
		expect(judgeDifferentialEquationAnswer('e^{2x}+3', spec).status).toBe('correct');
		expect(judgeDifferentialEquationAnswer('3', spec).status).toBe('incorrect');
		expect(judgeDifferentialEquationAnswer('Ce^{2x}+3', spec).status).toBe('incorrect');
	});

	it("variable et fonction déclarées : f'(t)=-f(t)", () => {
		const spec = { equation: "f'(t)=-f(t)", variable: 't', function: 'f' };
		expect(judgeDifferentialEquationAnswer('2e^{-t}', spec).status).toBe('correct');
		expect(judgeDifferentialEquationAnswer('2e^{t}', spec).status).toBe('incorrect');
	});
});

describe('readExpectedSolution (specs de test du modèle)', () => {
	it('attendue solution : ok', () => {
		expect(readExpectedSolution('Ce^{2x}+3', { ...AFFINE, solutionMode: 'generale' })).toEqual({
			ok: true
		});
	});

	it('attendue qui n’est pas solution : erreur', () => {
		const result = readExpectedSolution('Ce^{2x}', AFFINE);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/solution/);
	});

	it('équation absente, illisible ou du 2d ordre : erreur', () => {
		expect(readExpectedSolution('3', {}).ok).toBe(false);
		expect(readExpectedSolution('3', { equation: 'y=2' }).ok).toBe(false);
		expect(readExpectedSolution('3', { equation: "y''=2y" }).ok).toBe(false);
	});

	it('condition initiale en mode « generale » : erreur', () => {
		const result = readExpectedSolution('Ce^{2x}+3', {
			...AFFINE,
			solutionMode: 'generale',
			initial: 'y(0)=4'
		});
		expect(result.ok).toBe(false);
	});
});
