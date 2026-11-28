/**
 * Virgule décimale NUE dans une case (`3,14` collé ou tapé au clavier
 * physique, sans les accolades de MathLive) : même verdict que `3{,}14`.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import type { InstanceBlank, QuestionInstance } from '#lib/questions/types.ts';
import type { ResolvedMarkdown } from '#lib/ubumark/index.ts';

function check(answer: string, blank: InstanceBlank) {
	const instance: QuestionInstance = {
		templateId: 'test-bare-comma',
		statement: 'Test' as ResolvedMarkdown,
		blanks: [blank],
		grades: ['6'],
		level: 1,
		generatedAt: new Date().toISOString(),
		resolvedVariables: [{ name: 'n', value: '10' }]
	};
	return validateAnswer([answer], instance, [answer]);
}

const HUNDREDTH: InstanceBlank = {
	expectedAnswer: '3.14159',
	type: 'math',
	precision: { type: 'decimal', digits: 2 }
};

describe('virgule nue — arrondi (`precision`)', () => {
	it('3,14 au centième → juste', () => {
		const result = check('3,14', HUNDREDTH);
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('correct');
	});

	it('3,14159 au centième → « Arrondis au centième. »', () => {
		const result = check('3,14159', HUNDREDTH);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Arrondis au centième.');
	});

	it('1\\,200,5 au dixième → juste', () => {
		const blank: InstanceBlank = {
			expectedAnswer: '1200.48',
			type: 'math',
			precision: { type: 'decimal', digits: 1 }
		};
		expect(check('1\\,200,5', blank).isCorrect).toBe(true);
	});
});

describe('virgule nue — règles (`rulesSuffice`)', () => {
	const blank: InstanceBlank = {
		expectedAnswer: '2.5',
		type: 'math',
		validationRules: [{ type: 'custom', expression: 'answer < {{n}}' }],
		rulesSuffice: true
	};

	it('2,5 < 10 → juste', () => {
		const result = check('2,5', blank);
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('correct');
	});

	it('12,5 ≥ 10 → faux (la règle, pas la forme)', () => {
		const result = check('12,5', blank);
		expect(result.isCorrect).toBe(false);
		expect(result.status).not.toBe('bad_form');
	});
});

describe('virgule nue — grandeur', () => {
	it('12,5\\unit{cm} pour 12,5 cm → juste', () => {
		const result = check('12,5\\unit{cm}', {
			expectedAnswer: '12.5\\unit{cm}',
			type: 'math',
			unit: { expected: true }
		});
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('correct');
	});
});

describe('virgule nue — équivalence simple', () => {
	it('-0,5 pour -0.5 → juste', () => {
		expect(check('-0,5', { expectedAnswer: '-0.5', type: 'math' }).isCorrect).toBe(true);
	});

	it('(-3,5) pour -3.5 → juste (parenthèses autour d’un décimal)', () => {
		expect(check('(-3,5)', { expectedAnswer: '-3.5', type: 'math' }).isCorrect).toBe(true);
	});

	it('attendu couple (3,14) : 3,14 n’est pas ce couple', () => {
		expect(check('3,14', { expectedAnswer: '(3,14)', type: 'math' }).isCorrect).toBe(false);
	});
});

// #1574 (E31) : saisies relevées au clavier MathLive (`36, mm` → `36,\,mm`, `,036 m` → `,036\,m`)
describe('virgule nue — nombre mal écrit devant une unité : le message de forme', () => {
	const PERIMETER: InstanceBlank = {
		expectedAnswer: '36[mm]',
		type: 'math',
		unit: { expected: true }
	};
	const FORM = "Ta réponse n'est pas écrite sous la forme demandée.";

	it('36,\\,mm (virgule sans décimale) → refusé, message de forme, pas « Unité inconnue »', () => {
		const result = check('36,\\,mm', PERIMETER);
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
		expect(result.feedback).toBe(FORM);
	});

	it(',036\\,m (sans zéro devant la virgule) → refusé, message de forme', () => {
		const result = check(',036\\,m', PERIMETER);
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
		expect(result.feedback).toBe(FORM);
	});

	it('même verdict avec la virgule de MathLive : 36{,}\\,mm', () => {
		const result = check('36{,}\\,mm', PERIMETER);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe(FORM);
	});

	it('limite : 0,036\\,m et 36\\,mm restent justes', () => {
		expect(check('0,036\\,m', PERIMETER).status).toBe('correct');
		expect(check('36\\,mm', PERIMETER).status).toBe('correct');
	});

	it('valeur fausse mal écrite : 37,\\,mm et 37{,}\\mathrm{mm} → faux (pas la forme)', () => {
		for (const typed of ['37,\\,mm', '37{,}\\mathrm{mm}']) {
			const result = check(typed, PERIMETER);
			expect(result.isCorrect, typed).toBe(false);
			expect(result.status, typed).not.toBe('bad_form');
			expect(result.feedback, typed).not.toBe(FORM);
		}
	});

	it('unité illisible derrière un nombre mal écrit : 36,\\,xyz → « Unité inconnue : xyz. »', () => {
		const result = check('36,\\,xyz', PERIMETER);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Unité inconnue : xyz.');
	});

	it('comportement d’avant gardé : 36{,}\\mathrm{mm} → mauvaise forme, message de forme', () => {
		const result = check('36{,}\\mathrm{mm}', PERIMETER);
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
		expect(result.feedback).toBe(FORM);
	});

	it('une vraie unité inconnue garde son message : 36\\,xyz', () => {
		expect(check('36\\,xyz', PERIMETER).feedback).toBe('Unité inconnue : xyz.');
	});
});

// #1574 (E53) : la même règle que E31 dans une case SANS unité
describe('virgule nue — nombre mal écrit dans une case sans unité : le message de forme', () => {
	const WHOLE: InstanceBlank = { expectedAnswer: '58', type: 'math' };
	const HALF: InstanceBlank = { expectedAnswer: '0.5', type: 'math' };
	const TENTH: InstanceBlank = {
		expectedAnswer: '58.488',
		type: 'math',
		precision: { type: 'decimal', digits: 1 }
	};
	const FORM = "Ta réponse n'est pas écrite sous la forme demandée.";

	it('58, (virgule sans décimale) pour 58 → refusé, message de forme', () => {
		for (const typed of ['58,', '58{,}', '58.']) {
			const result = check(typed, WHOLE);
			expect(result.isCorrect, typed).toBe(false);
			expect(result.status, typed).toBe('bad_form');
			expect(result.feedback, typed).toBe(FORM);
		}
	});

	it(',5 (sans zéro devant la virgule) pour 0,5 → refusé, message de forme', () => {
		for (const typed of [',5', '{,}5', '-,5']) {
			const blank = typed.startsWith('-') ? { ...HALF, expectedAnswer: '-0.5' } : HALF;
			const result = check(typed, blank);
			expect(result.isCorrect, typed).toBe(false);
			expect(result.status, typed).toBe('bad_form');
			expect(result.feedback, typed).toBe(FORM);
		}
	});

	it('limite : 58 et 0,5 restent justes', () => {
		expect(check('58', WHOLE).status).toBe('correct');
		expect(check('0,5', HALF).status).toBe('correct');
	});

	it('valeur fausse mal écrite : 57, pour 58, et 58, pour 58,5 au dixième → faux (pas la forme)', () => {
		for (const [typed, blank] of [
			['57,', WHOLE],
			[',6', HALF],
			['58,', TENTH]
		] as const) {
			const result = check(typed, blank);
			expect(result.isCorrect, typed).toBe(false);
			expect(result.status, typed).not.toBe('bad_form');
			expect(result.feedback, typed).not.toBe(FORM);
		}
	});

	it('case à arrondi : 58,5 reste juste', () => {
		expect(check('58,5', TENTH).status).toBe('correct');
	});

	it('case à arrondi : 58, pour 58,488 à l’unité → refusé, message de forme', () => {
		const unit: InstanceBlank = { ...TENTH, precision: { type: 'decimal', digits: 0 } };
		const result = check('58,', unit);
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
		expect(result.feedback).toBe(FORM);
		// Valeur fausse : le refus, sans le message de forme
		expect(check('59,', unit).status).not.toBe('bad_form');
		expect(check('59,', unit).feedback).not.toBe(FORM);
	});

	it('une réponse qui n’est pas un nombre seul n’est pas relue : 58,+1', () => {
		expect(check('58,+1', { expectedAnswer: '59', type: 'math' }).status).not.toBe('correct');
	});
});
