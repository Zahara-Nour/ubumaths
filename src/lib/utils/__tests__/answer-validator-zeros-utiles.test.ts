/**
 * Zéros finaux qui disent quelque chose (décision de l'auteur, 2026-11-26)
 * =======================================================================
 *
 * Un zéro final ne s'écrit que s'il dit quelque chose : arrondi, centimes, ou
 * demandé par l'auteur. Le juge ne retire donc plus les zéros finaux d'une
 * réponse sans regarder la case :
 *
 * - arrondi à N décimales : la bonne écriture a exactement N décimales
 *   (« 3,0 » au dixième de 3,04 est juste) ; moins de décimales, valeur
 *   exactement l'arrondi (« 3 ») → perfectible, avec un message ;
 * - arrondi à N chiffres significatifs : pareil avec N chiffres (pas
 *   d'exigence de zéros dans la partie entière : « 1 200 ») ;
 * - grandeur en euros : exactement deux décimales (« 3,70 € ») est juste ;
 * - partout ailleurs, la règle `zeros` ne change pas.
 */

import { describe, it, expect } from 'vitest';
import { blankStatuses, validateAnswer, validateNumerical } from '../answer-validator';
import type {
	ConstraintOptions,
	InstanceBlank,
	PrecisionType,
	QuestionInstance
} from '#lib/questions/types.ts';
import type { ResolvedMarkdown } from '#lib/ubumark/index.ts';

// ============================================================================
// OUTILS
// ============================================================================

function instanceOf(
	blanks: InstanceBlank[],
	options: { constraints?: ConstraintOptions; orderIndependent?: boolean } = {}
): QuestionInstance {
	return {
		templateId: 'test-zeros-utiles',
		statement: 'Test' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		level: 1,
		generatedAt: new Date().toISOString(),
		options
	};
}

function numberBlank(expectedAnswer: string, precision?: PrecisionType): InstanceBlank {
	return { expectedAnswer, type: 'math', ...(precision && { precision }) };
}

function quantityBlank(expectedAnswer: string, precision?: PrecisionType): InstanceBlank {
	return {
		expectedAnswer,
		type: 'math',
		unit: { expected: true },
		...(precision && { precision })
	};
}

/** Verdict d'une case seule : statut, violations, message */
function judge(answer: string, blank: InstanceBlank, constraints?: ConstraintOptions) {
	const instance = instanceOf([blank], constraints ? { constraints } : {});
	const result = validateAnswer([answer], instance, [answer]);
	return {
		status: blankStatuses([answer], instance, [answer])[0],
		violations: (result.constraintViolations ?? []).map((v) => v.constraint),
		feedback: result.feedback
	};
}

const TENTH: PrecisionType = { type: 'decimal', digits: 1 };
const HUNDREDTH: PrecisionType = { type: 'decimal', digits: 2 };

const MISSING_TENTH = "Arrondi au dixième : écris le chiffre des dixièmes, même si c'est 0.";
const MISSING_HUNDREDTH = "Arrondi au centième : écris le chiffre des centièmes, même si c'est 0.";

// ============================================================================
// 1. ARRONDI À N DÉCIMALES
// ============================================================================

describe('Arrondi à N décimales : exactement N décimales', () => {
	it.each(['3', '3{,}0', '3.04'])('« 3,0 » au dixième (attendu écrit %s) → correct', (expected) => {
		expect(judge('3{,}0', numberBlank(expected, TENTH))).toEqual({
			status: 'correct',
			violations: [],
			feedback: undefined
		});
	});

	it('« 3,0 » au dixième, `zeros` strict → correct quand même', () => {
		expect(judge('3{,}0', numberBlank('3', TENTH), { zeros: 'strict' }).status).toBe('correct');
	});

	it('« 3 » au dixième de 3,04 → perfectible, message du chiffre des dixièmes', () => {
		expect(judge('3', numberBlank('3.04', TENTH))).toEqual({
			status: 'unoptimal_form',
			violations: ['rounding'],
			feedback: MISSING_TENTH
		});
	});

	it('« 3,1 » au centième de 3,1 → perfectible, message du chiffre des centièmes', () => {
		const verdict = judge('3{,}1', numberBlank('3.1', HUNDREDTH));
		expect(verdict.status).toBe('unoptimal_form');
		expect(verdict.feedback).toBe(MISSING_HUNDREDTH);
	});

	it('« 3,10 » au centième de 3,1 → correct', () => {
		expect(judge('3{,}10', numberBlank('3.1', HUNDREDTH)).status).toBe('correct');
	});

	it.each<[number, string, string, string]>([
		[3, '2{,}5', '2.5', "Arrondi au millième : écris le chiffre des millièmes, même si c'est 0."],
		[4, '2{,}5', '2.5', 'Arrondi à 4 décimales : écris les 4 décimales, même les zéros.']
	])('message à %i décimales', (digits, answer, expected, message) => {
		const verdict = judge(answer, numberBlank(expected, { type: 'decimal', digits }));
		expect(verdict.status).toBe('unoptimal_form');
		expect(verdict.feedback).toBe(message);
	});

	it('à l’unité (N = 0) : « 3 » → correct, rien ne change', () => {
		expect(judge('3', numberBlank('3.04', { type: 'decimal', digits: 0 })).status).toBe('correct');
	});

	it('trop de chiffres (« 3,00 ») ou arrondi non fait (« 3,04 ») au dixième → inchangé (bad_form)', () => {
		expect(judge('3{,}00', numberBlank('3.04', TENTH)).status).toBe('bad_form');
		expect(judge('3{,}04', numberBlank('3.04', TENTH)).status).toBe('bad_form');
	});

	it('zéro de tête (« 03,0 ») → toujours signalé par `zeros`', () => {
		expect(judge('03{,}0', numberBlank('3.04', TENTH)).violations).toContain('zeros');
	});

	it('valeur fausse (« 3,1 » au dixième de 3,04) → incorrect, pas de message de zéros', () => {
		const verdict = judge('3{,}1', numberBlank('3.04', TENTH));
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).not.toBe(MISSING_TENTH);
	});
});

// ============================================================================
// 2. ARRONDI À N CHIFFRES SIGNIFICATIFS
// ============================================================================

describe('Arrondi à N chiffres significatifs : exactement N chiffres', () => {
	const TWO: PrecisionType = { type: 'significant', digits: 2 };

	it('« 3,0 » pour 3,04 à 2 chiffres → correct', () => {
		expect(judge('3{,}0', numberBlank('3.04', TWO)).status).toBe('correct');
	});

	it('« 3 » pour 3,04 à 2 chiffres → perfectible, message des chiffres significatifs', () => {
		expect(judge('3', numberBlank('3.04', TWO))).toEqual({
			status: 'unoptimal_form',
			violations: ['rounding'],
			feedback: 'Arrondi à 2 chiffres significatifs : écris les 2 chiffres, même les zéros.'
		});
	});

	it('« 0,50 » pour 0,504 à 2 chiffres → correct ; « 0,5 » → perfectible', () => {
		expect(judge('0{,}50', numberBlank('0.504', TWO)).status).toBe('correct');
		expect(judge('0{,}5', numberBlank('0.504', TWO)).status).toBe('unoptimal_form');
	});

	it.each(['1\\,200', '1200'])('entier : « %s » pour 1 234 à 2 chiffres → correct', (answer) => {
		expect(judge(answer, numberBlank('1234', TWO)).status).toBe('correct');
	});

	it('entier : « 1 000 » pour 1 004 à 2 chiffres → correct (pas de zéros exigés dans la partie entière)', () => {
		expect(judge('1\\,000', numberBlank('1004', TWO)).status).toBe('correct');
	});
});

// ============================================================================
// 3. GRANDEUR EN EUROS
// ============================================================================

describe('Grandeur en euros : deux décimales, les centimes', () => {
	it.each(['3{,}70\\,€', '3{,}70\\unit{€}', '3{,}70\\,\\text{euros}'])(
		'« %s » pour 3,7 € → correct, sans violation `zeros`',
		(answer) => {
			expect(judge(answer, quantityBlank('3.7\\unit{€}'))).toEqual({
				status: 'correct',
				violations: [],
				feedback: undefined
			});
		}
	);

	it('« 3,70 € » avec `zeros` strict → correct', () => {
		expect(judge('3{,}70\\,€', quantityBlank('3.7\\unit{€}'), { zeros: 'strict' }).status).toBe(
			'correct'
		);
	});

	it('« 3,7 € » reste correct', () => {
		expect(judge('3{,}7\\,€', quantityBlank('3.7\\unit{€}')).status).toBe('correct');
	});

	it('« 3,700 € » → règle `zeros` actuelle (perfectible)', () => {
		const verdict = judge('3{,}700\\,€', quantityBlank('3.7\\unit{€}'));
		expect(verdict.status).toBe('unoptimal_form');
		expect(verdict.violations).toEqual(['zeros']);
	});

	it('autre unité : « 3,70 m » reste perfectible (`zeros`)', () => {
		const verdict = judge('3{,}70\\,m', quantityBlank('3.7\\unit{m}'));
		expect(verdict.status).toBe('unoptimal_form');
		expect(verdict.violations).toEqual(['zeros']);
	});

	it('euros arrondis au centième : « 3,70 € » → correct ; « 3,7 € » → perfectible (arrondi)', () => {
		expect(judge('3{,}70\\,€', quantityBlank('3.7\\unit{€}', HUNDREDTH)).status).toBe('correct');
		const verdict = judge('3{,}7\\,€', quantityBlank('3.7\\unit{€}', HUNDREDTH));
		expect(verdict.status).toBe('unoptimal_form');
		expect(verdict.feedback).toBe(MISSING_HUNDREDTH);
	});

	it('longueur arrondie au dixième : « 3,0 m » pour 3,04 m → correct ; « 3 m » → perfectible', () => {
		expect(judge('3{,}0\\,m', quantityBlank('3.04\\unit{m}', TENTH)).status).toBe('correct');
		const verdict = judge('3\\,m', quantityBlank('3.04\\unit{m}', TENTH));
		expect(verdict.status).toBe('unoptimal_form');
		expect(verdict.feedback).toBe(MISSING_TENTH);
	});
});

// ============================================================================
// 4. INCHANGÉ
// ============================================================================

describe('Sans arrondi ni euros : la règle `zeros` ne change pas', () => {
	it('valeur exacte : « 3,70 » pour 3,7 → perfectible (`zeros`)', () => {
		const verdict = judge('3{,}70', numberBlank('3.7'));
		expect(verdict.status).toBe('unoptimal_form');
		expect(verdict.violations).toEqual(['zeros']);
	});

	it('`zeros` off : « 3,70 » pour 3,7 → correct', () => {
		expect(judge('3{,}70', numberBlank('3.7'), { zeros: 'off' }).status).toBe('correct');
	});

	it.each<PrecisionType>([
		{ type: 'none' },
		{ type: 'tolerance', tolerance: 0.1, mode: 'absolute' }
	])('precision %o : « 3,70 » pour 3,7 → perfectible (`zeros`)', (precision) => {
		const verdict = judge('3{,}70', numberBlank('3.7', precision));
		expect(verdict.status).toBe('unoptimal_form');
		expect(verdict.violations).toEqual(['zeros']);
	});
});

// ============================================================================
// 5. CASES SANS ORDRE
// ============================================================================

describe('orderIndependent : même jugement que la case seule', () => {
	function unordered(): QuestionInstance {
		return instanceOf([numberBlank('2.5', HUNDREDTH), numberBlank('1.136', HUNDREDTH)], {
			orderIndependent: true
		});
	}

	it('« 1,14 » et « 2,50 » dans le désordre → correct, correct', () => {
		const answers = ['1{,}14', '2{,}50'];
		expect(blankStatuses(answers, unordered(), answers)).toEqual(['correct', 'correct']);
	});

	it('« 1,14 » et « 2,5 » → correct, perfectible (message du centième)', () => {
		const answers = ['1{,}14', '2{,}5'];
		expect(blankStatuses(answers, unordered(), answers)).toEqual(['correct', 'unoptimal_form']);
		expect(validateAnswer(answers, unordered(), answers).feedback).toBe(MISSING_HUNDREDTH);
	});

	it('euros sans ordre : « 3,70 € » et « 1,25 € » → correct, correct', () => {
		const instance = instanceOf([quantityBlank('1.25\\unit{€}'), quantityBlank('3.7\\unit{€}')], {
			orderIndependent: true
		});
		const answers = ['3{,}70\\,€', '1{,}25\\,€'];
		expect(blankStatuses(answers, instance, answers)).toEqual(['correct', 'correct']);
	});
});

// ============================================================================
// 6. MESSAGE DE LA BONNE RÉPONSE ARRONDIE (étape 3)
// ============================================================================

describe('Message « La réponse arrondie … est … » : la valeur avec ses zéros utiles', () => {
	it('au dixième de 3,04 → « 3,0 »', () => {
		expect(validateNumerical('3.5', '3.04', TENTH).feedback).toBe(
			'La réponse arrondie à 1 décimale est 3,0'
		);
	});

	it('au centième de 2,5 → « 2,50 »', () => {
		expect(validateNumerical('2.4', '2.5', HUNDREDTH).feedback).toBe(
			'La réponse arrondie à 2 décimales est 2,50'
		);
	});

	it('à 2 chiffres significatifs de 3,04 → « 3,0 » ; de 1 234 → « 1200 »', () => {
		const TWO: PrecisionType = { type: 'significant', digits: 2 };
		expect(validateNumerical('3.5', '3.04', TWO).feedback).toBe(
			'La réponse avec 2 chiffres significatifs est 3,0'
		);
		expect(validateNumerical('1300', '1234', TWO).feedback).toBe(
			'La réponse avec 2 chiffres significatifs est 1200'
		);
	});
});
