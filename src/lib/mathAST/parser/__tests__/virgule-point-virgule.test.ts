/**
 * Virgule et point-virgule dans le parseur maison — chantier lecture-grandeurs, PR 6
 * (décisions 2-3 ; page virgule validée 31/31 le 2026-10-20).
 *
 * Le parseur maison est la langue interne du moteur : point décimal, virgule
 * toujours séparatrice (arguments d'une fonction, éléments d'une matrice), pas de
 * point-virgule. Le français (virgule décimale, « ; ») est traduit avant lui par
 * l'atelier et la lecture LaTeX.
 *
 * Garde : chaque écriture est vérifiée dans les deux implémentations (Pratt, RD),
 * avec les fonctions génériques par défaut (f, g, h…). Le RD maison n'a ni
 * fonctions génériques ni matrices : ces lectures-là sont vérifiées en Pratt seul.
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPrattSafe, parseCustomRDSafe } from '../custom/index';
import { toCustom } from '../../index';
import { inFrench } from '../../cli/web/french-errors';

// =============================================================================
// Constantes
// =============================================================================

const PARSERS = [
	['Pratt', parseCustomPrattSafe],
	['RD', parseCustomRDSafe]
] as const;

const SEMICOLON_MESSAGE = "';' is not a separator: use ',' between arguments";
const UNEXPECTED_COMMA_MESSAGE = "Unexpected comma: ',' only separates function arguments";

/** Écriture → nombre à écrire au point (dans le message) */
const DECIMAL_COMMAS: readonly (readonly [string, string])[] = [
	['1,2', '1.2'],
	['2,5*3,5', '2.5'],
	['(1,2)', '1.2'],
	['{2,5}', '2.5'],
	['[1,2]', '1.2'],
	['1,2,3', '1.2'],
	['max((2,5),3)', '2.5'],
	['2,5[m]', '2.5'],
	['√2,5', '2.5'],
	['x+0,25', '0.25']
];

const UNEXPECTED_COMMAS: readonly string[] = ['1, 2', '1 ,2', '1 , 2', ',5', '5,', 'x,2', '2,x'];

const SEMICOLONS: readonly string[] = [
	'max(2;5)',
	'mod(16;4)',
	'g(1;2)',
	'max(2,5;3)',
	'x;y',
	'x;2',
	'f(x;y)',
	'max(x;y)',
	'1;2',
	'(1;2)',
	'A(1;2)',
	'[1;2]',
	'{1;2}'
];

/** Lectures inchangées, dans les deux implémentations : écriture → relecture */
const UNCHANGED: readonly (readonly [string, string])[] = [
	['max(2,5)', 'max(2,5)'],
	['max(2, 5)', 'max(2,5)'],
	['max(2,5,3)', 'max(2,5,3)'],
	['mod(16,4)', 'mod(16,4)'],
	['gcd(12,8)', 'gcd(12,8)'],
	['max(2.5,3)', 'max(2.5,3)']
];

// =============================================================================
// Tests
// =============================================================================

describe('PR 6 — virgule décimale refusée (DECIMAL_COMMA)', () => {
	for (const [name, parse] of PARSERS) {
		describe(name, () => {
			it.each(DECIMAL_COMMAS)('%s → DECIMAL_COMMA (write %s)', (input, written) => {
				const result = parse(input);
				expect(result.ast).toBeNull();
				expect(result.errors[0]?.code).toBe('DECIMAL_COMMA');
				expect(result.errors[0]?.message).toBe(
					`Decimal comma: the decimal separator is '.' (write ${written})`
				);
			});
		});
	}

	it('le refus désigne le nombre entier, virgule comprise', () => {
		for (const [, parse] of PARSERS) {
			const error = parse('x+2,5').errors[0];
			expect(error?.position).toBe(2);
			expect(error?.length).toBe(3);
		}
	});
});

describe('PR 6 — virgule hors fonction et matrice (UNEXPECTED_COMMA)', () => {
	for (const [name, parse] of PARSERS) {
		it.each(UNEXPECTED_COMMAS)(`${name} : %s → UNEXPECTED_COMMA`, (input) => {
			const result = parse(input);
			expect(result.ast).toBeNull();
			expect(result.errors[0]?.code).toBe('UNEXPECTED_COMMA');
			expect(result.errors[0]?.message).toBe(UNEXPECTED_COMMA_MESSAGE);
		});
	}
});

describe('PR 6 — point-virgule refusé (SEMICOLON)', () => {
	for (const [name, parse] of PARSERS) {
		it.each(SEMICOLONS)(`${name} : %s → SEMICOLON`, (input) => {
			const result = parse(input);
			expect(result.ast).toBeNull();
			expect(result.errors[0]?.code).toBe('SEMICOLON');
			expect(result.errors[0]?.message).toBe(SEMICOLON_MESSAGE);
		});
	}
});

describe('PR 6 — la virgule sépare toujours', () => {
	for (const [name, parse] of PARSERS) {
		it.each(UNCHANGED)(`${name} : %s se relit %s`, (input, expected) => {
			const result = parse(input);
			expect(result.errors).toEqual([]);
			expect(toCustom(result.ast!)).toBe(expected);
		});
	}

	it('f(1,5) : deux arguments, 1 et 5, comme f(1, 5) (Pratt)', () => {
		const result = parseCustomPrattSafe('f(1,5)');
		expect(result.errors).toEqual([]);
		expect(result.ast).toMatchObject({
			type: 'function',
			name: 'f',
			args: [
				{ type: 'number', value: '1' },
				{ type: 'number', value: '5' }
			]
		});
		expect(result.ast).toEqual(parseCustomPrattSafe('f(1, 5)').ast);
	});

	it("f''(0.2) : le décimal s'écrit au point (Pratt)", () => {
		const result = parseCustomPrattSafe("f''(0.2)");
		expect(result.errors).toEqual([]);
		expect(toCustom(result.ast!)).toBe("f''(0.2)");
	});

	it.each([
		[
			'[[1,2],[3,4]]',
			[
				['1', '2'],
				['3', '4']
			]
		],
		[
			'[[1, 2],[3, 4]]',
			[
				['1', '2'],
				['3', '4']
			]
		],
		['[[1,5, 2]]', [['1', '5', '2']]],
		['[[1.5,2]]', [['1.5', '2']]]
	] as const)('matrice %s : la virgule sépare les éléments (Pratt)', (input, rows) => {
		const result = parseCustomPrattSafe(input);
		expect(result.errors).toEqual([]);
		const ast = result.ast as unknown as { type: string; rows: { value: string }[][] };
		expect(ast.type).toBe('matrix');
		expect(ast.rows.map((row) => row.map((cell) => cell.value))).toEqual(rows);
	});
});

describe('PR 6 — les trois refus en français (console, french-errors.ts)', () => {
	it.each([
		['2,5', 'Le séparateur décimal est le point : écris 2.5'],
		['1, 2', 'Virgule inattendue : elle ne sépare que les arguments d’une fonction'],
		['max(2;5)', 'Sépare les arguments par une virgule : max(2,5)']
	])('%s → %s', (input, french) => {
		expect(inFrench(parseCustomPrattSafe(input).errors[0].message)).toBe(french);
	});
});
