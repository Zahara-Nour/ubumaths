/**
 * Codes précis des refus qui existent déjà — chantier lecture-grandeurs, PR 3
 * (docs/wip/lecture-grandeurs-phase0.md ; décisions de David du 2026-10-20).
 *
 * Lecture inchangée : seul le code du refus change, et son texte anglais reste le
 * même (l'atelier traduit encore par le texte, `french-errors.ts`), sauf
 * `LEADING_DECIMAL_POINT` dont le texte est nouveau. `INVALID_UNIT` disparaît ;
 * `UNEXPECTED_TOKEN` reste en dernier recours.
 *
 * Garde : chaque écriture du tableau de la phase 0 est vérifiée dans les deux
 * implémentations (Pratt, RD), et dans les deux parseurs LaTeX quand le refus y
 * existe aussi.
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPrattSafeRaw, parseCustomRDSafeRaw } from '../custom/index';
import { parsePrattSafe, parseRDSafe } from '../latex';
import { numberAfterFactorMessage } from '../number-after-factor';

// =============================================================================
// Constantes
// =============================================================================

const CUSTOM_PARSERS = [
	['Pratt', parseCustomPrattSafeRaw],
	['RD', parseCustomRDSafeRaw]
] as const;

const LATEX_PARSERS = [
	['Pratt', parsePrattSafe],
	['RD', parseRDSafe]
] as const;

/** Écriture maison → [code, texte anglais] */
const CUSTOM_REFUSALS: readonly (readonly [string, string, string])[] = [
	['5[xyz]', 'UNKNOWN_UNIT', 'Invalid unit: xyz'],
	['5[M]', 'UNKNOWN_UNIT', 'Invalid unit: M'],
	['5[]', 'EMPTY_UNIT', 'Invalid unit: '],
	[
		'10[m]^3',
		'UNIT_EXPONENT_OUTSIDE',
		'Exponent after a unit: write 3[m^2] for 3 m², or (3[m])^2 for (3 m)²'
	],
	['3[kg/m.s]', 'AMBIGUOUS_UNIT', 'Ambiguous unit "kg/m.s": write kg/(m.s) for kg/(m·s)'],
	[
		'3[m s]',
		'SPACE_IN_UNIT',
		'Space inside a unit: join the symbols with "." or "/" (m.s^-1, km/h)'
	],
	['(1+2', 'MISSING_DELIMITER', "Expected ')' after expression"],
	['[1,2', 'MISSING_DELIMITER', "Expected ']' after expression"],
	['5[m', 'MISSING_DELIMITER', "Expected ']' after unit"],
	['.5[m]', 'LEADING_DECIMAL_POINT', 'Missing zero before the decimal point (write 0.5)'],
	['.5', 'LEADING_DECIMAL_POINT', 'Missing zero before the decimal point (write 0.5)'],
	['2+.25', 'LEADING_DECIMAL_POINT', 'Missing zero before the decimal point (write 0.25)'],
	['(.5)', 'LEADING_DECIMAL_POINT', 'Missing zero before the decimal point (write 0.5)'],
	['x+ .5', 'LEADING_DECIMAL_POINT', 'Missing zero before the decimal point (write 0.5)'],
	// Un nombre juste après une lettre
	['x2', 'MISSING_OPERATOR', 'Unexpected token: 2'],
	['x 2', 'MISSING_OPERATOR', 'Unexpected token: 2'],
	['ab2', 'MISSING_OPERATOR', 'Unexpected token: 2'],
	['2x3', 'MISSING_OPERATOR', 'Unexpected token: 3'],
	['pi2', 'MISSING_OPERATOR', 'Unexpected token: 2'],
	['(x 2)', 'MISSING_OPERATOR', "Expected ')' after expression"],
	// Un nombre juste après une parenthèse fermante
	['(1+x)2', 'MISSING_OPERATOR', 'Unexpected token: 2'],
	['(1+x) 2', 'MISSING_OPERATOR', 'Unexpected token: 2'],
	['sqrt(2)3', 'MISSING_OPERATOR', 'Unexpected token: 3'],
	['f(x)2', 'MISSING_OPERATOR', 'Unexpected token: 2'],
	['(2) 3', 'MISSING_OPERATOR', 'Unexpected token: 3'],
	// Un nombre juste après tout autre facteur, comme le LaTeX (David : « suis LaTeX »)
	['x^2 3', 'MISSING_OPERATOR', 'Unexpected token: 3'],
	['|x|2', 'MISSING_OPERATOR', 'Unexpected token: 2'],
	['x_1 2', 'MISSING_OPERATOR', 'Unexpected token: 2'],
	// `2 3` se lit 23 depuis la PR 4 (espaces entre chiffres ignorés : unite-terme.test.ts)
	['{2}3', 'MISSING_OPERATOR', 'Unexpected token: 3'],
	// `2[m]3[m]` : JUXTAPOSED_QUANTITIES depuis la PR 5 (juxtaposed-quantities.test.ts)
	['2[m] 3', 'MISSING_OPERATOR', 'Unexpected token: 3']
];

/** Refus maison qui gardent `UNEXPECTED_TOKEN` */
const STILL_UNEXPECTED: readonly string[] = [
	'x;2', // le « ; » n'est pas une lettre (PR 6 : SEMICOLON)
	'(1+2]',
	'true2',
	// Un `.` collé à un facteur n'est pas un point de tête (revue de #1558)
	'1.2.3',
	'1..2',
	'x.5',
	'5[m].5'
];

/** Écritures toujours lues */
const STILL_READ: readonly string[] = ['(2)(3)', '2x', 'x(2)', '0.5', '2.5[m]', '2(x+1)'];

/** Écriture LaTeX → [code, texte anglais] */
const LATEX_REFUSALS: readonly (readonly [string, string, string])[] = [
	['5\\unit{xyz}', 'UNKNOWN_UNIT', 'Invalid unit: xyz'],
	['3\\unit{kg/m.s}', 'AMBIGUOUS_UNIT', 'Ambiguous unit "kg/m.s": write kg/(m.s) for kg/(m·s)'],
	[
		'3\\unit{m s}',
		'SPACE_IN_UNIT',
		'Space inside a unit: join the symbols with "." or "/" (m.s^-1, km/h)'
	],
	[
		'10\\unit{m}^3',
		'UNIT_EXPONENT_OUTSIDE',
		'Exponent after a unit: write 3~\\unit{m^2} for 3 m², or \\left(3~\\unit{m}\\right)^2 for (3 m)²'
	],
	['(1+2', 'MISSING_DELIMITER', "Expected ')' after expression"],
	['x2', 'MISSING_OPERATOR', numberAfterFactorMessage('2')],
	['x 2', 'MISSING_OPERATOR', numberAfterFactorMessage('2')],
	['(1+x)2', 'MISSING_OPERATOR', numberAfterFactorMessage('2')],
	['\\sqrt{2}3', 'MISSING_OPERATOR', numberAfterFactorMessage('3')],
	['x^{2}3', 'MISSING_OPERATOR', numberAfterFactorMessage('3')],
	['|x|2', 'MISSING_OPERATOR', numberAfterFactorMessage('2')],
	['2 3', 'MISSING_OPERATOR', numberAfterFactorMessage('3')]
];

// =============================================================================
// Tests
// =============================================================================

describe.each(CUSTOM_PARSERS)('parseur maison %s : code précis du refus', (_, parse) => {
	it.each(CUSTOM_REFUSALS)('%s est refusé avec %s', (written, code, message) => {
		const result = parse(written);
		expect(result.ast).toBeNull();
		expect(result.errors[0]).toMatchObject({ code, message });
	});

	it('le refus de .5 couvre le point et le nombre', () => {
		expect(parse('2*.5').errors[0]).toMatchObject({ position: 2, length: 2 });
	});

	it.each(STILL_UNEXPECTED)('%s garde UNEXPECTED_TOKEN', (written) => {
		const result = parse(written);
		expect(result.errors[0]?.code).toBe('UNEXPECTED_TOKEN');
	});

	it.each(STILL_READ)('%s est toujours lu', (written) => {
		expect(parse(written).errors).toEqual([]);
	});
});

describe.each(LATEX_PARSERS)('parseur LaTeX %s : code précis du refus', (_, parse) => {
	it.each(LATEX_REFUSALS)('%s est refusé avec %s', (written, code, message) => {
		const result = parse(written);
		expect(result.ast).toBeNull();
		expect(result.errors[0]).toMatchObject({ code, message });
	});

	it('.5 reste lu (le LaTeX n’a jamais refusé le point de tête)', () => {
		expect(parse('.5').errors).toEqual([]);
	});
});
