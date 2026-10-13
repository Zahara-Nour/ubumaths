/**
 * T5 : une expression de défi (`game_challenges`, écrite par le prof) est évaluée dans le
 * navigateur de l'élève. Seule l'arithmétique passe ; tout autre code rend NaN sans
 * s'exécuter.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Challenge } from '$lib/types/game';
import { generateChallengeVariables } from '../challenge-variables';

function withExpression(expression: string): Challenge {
	return {
		variables: {
			a: { type: 'random', min: 3, max: 4 },
			r: { type: 'expression', expression }
		},
		answer: { type: 'expression', value: '{r}' }
	} as unknown as Challenge;
}

describe("expressions d'un défi", () => {
	afterEach(() => {
		delete (globalThis as Record<string, unknown>).__pwned;
		vi.restoreAllMocks();
	});

	it("évalue l'arithmétique : opérateurs, puissance, racine, parenthèses", () => {
		const { variables } = generateChallengeVariables(
			withExpression('sqrt({a}^2 + 16) * (2 - 1) / 1')
		);
		expect(variables.r).toBe(5);
	});

	it('accepte une valeur en notation scientifique', () => {
		const { variables } = generateChallengeVariables({
			variables: { r: { type: 'expression', expression: '1e-7 * 2' } },
			answer: { type: 'expression', value: '{r}' }
		} as unknown as Challenge);
		expect(variables.r).toBeCloseTo(2e-7);
	});

	it("n'exécute pas de code arbitraire venu de la base", () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { variables } = generateChallengeVariables(
			withExpression('(globalThis.__pwned = 1) && 2')
		);
		expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
		expect(variables.r).toBeNaN();
	});

	it('refuse aussi une réponse-expression qui contient du code', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { correct_answer } = generateChallengeVariables({
			variables: {},
			answer: { type: 'expression', value: '(globalThis.__pwned = 3)' }
		} as unknown as Challenge);
		expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
		expect(correct_answer).toBeNaN();
	});

	it("refuse `Math.sqrt` collé à d'autres lettres", () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { variables } = generateChallengeVariables(withExpression('Math.sqrtMath.sqrt(4)'));
		expect(variables.r).toBeNaN();
	});

	it('un nom de variable piégé ne fait ni planter ni geler le combat', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const challenge = {
			variables: {
				'a(': { type: 'random', min: 1, max: 2 },
				'(x+)+y': { type: 'random', min: 1, max: 2 },
				r: { type: 'expression', expression: '{a(} + 1' }
			},
			answer: { type: 'expression', value: '{r}' }
		} as unknown as Challenge;

		const { variables } = generateChallengeVariables(challenge);

		expect(variables.r).toBeNaN();
	});
});
