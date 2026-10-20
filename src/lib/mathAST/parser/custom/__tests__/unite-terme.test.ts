/**
 * L'unité multiplie tout le terme qui la précède — chantier lecture-grandeurs, PR 4
 * (décision 1 de David, 2026-10-20 ; docs/wip/lecture-grandeurs-phase0.md, PR 4).
 *
 * Avant : le crochet d'unité, postfixe, ne prenait que l'atome qui le précède.
 * `1/2[m]` se lisait 1/(2 m) = 0,5 m⁻¹, alors que `\frac{1}{2}\unit{m}` vaut 0,5 m et
 * que l'atelier lit `1/2 m` = (1/2) m. Désormais le terme de nombres (produits,
 * quotients, signe unaire) porte l'unité, jusqu'au `+`/`-` d'addition ou jusqu'à une
 * grandeur déjà formée. Des accolades ferment le terme comme des parenthèses
 * (`braceWrap` y substitue les valeurs des tirages : `2/{7[km]}` reste 2/(7 km)).
 *
 * Aussi : espaces entre deux chiffres ignorés (`12 500` = 12500, sauf juste après `^`
 * ou `_`, où `x^2 3` reste refusé, décision 14) ; `π` = la constante (Q11 révisée :
 * `pi` reste p × i) ; refus `AMBIGUOUS_TERM` (E7) et `MISSING_NUMBER_BEFORE_UNIT` (K2).
 *
 * Expected forms are written with braces: `{1/2}[m]` is the quantity (1/2) m without
 * a delimiter node, which is exactly the tree the new reading must produce.
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPrattSafeRaw, parseCustomRDSafeRaw, parseCustomSafe } from '../index';
import { MathAST } from '../../../factory';
import { parse as parseUnit } from '../../../units/parser';
import { toCustom } from '../../../custom-generator';
import { toLatex } from '../../../latex-generator';
import { computeQuantity } from '../../../cli/quantities';
import { inFrench } from '../../../cli/web/french-errors';
import type { MathNode } from '../../../types';

// =============================================================================
// Constantes
// =============================================================================

const CUSTOM_PARSERS = [
	['Pratt', parseCustomPrattSafeRaw],
	['RD', parseCustomRDSafeRaw]
] as const;

const AMBIGUOUS_MESSAGE =
	'Ambiguous term before a unit after a quantity: write 6[m]/(2*3[s]) or (6[m]/2)*3[s]';

/** Écritures dont l'arbre change, et leur rendu d'avant (LaTeX, maison), mesuré sur main */
const RENDERINGS: readonly (readonly [string, string, string])[] = [
	['-5[m]', '-5~\\unit{m}', '-5[m]'],
	['+5[m]', '+5~\\unit{m}', '+5[m]'],
	['-10^3[m]', '-10^3~\\unit{m}', '-10^3[m]'],
	['2*3[m]', '2 \\times 3~\\unit{m}', '2*3[m]'],
	['2.5*10^3[m]', '2.5 \\times 10^3~\\unit{m}', '2.5*10^3[m]'],
	['2sqrt(2)[m]', '2 \\sqrt{2}~\\unit{m}', '2sqrt(2)[m]'],
	['3x[m]', '3 x~\\unit{m}', '3x[m]'],
	['x*2[m]', 'x \\times 2~\\unit{m}', 'x*2[m]'],
	['2*20[°C]', '2 \\times 20~\\unit{°C}', '2*20[°C]'],
	['-2.5[km]', '-2.5~\\unit{km}', '-2.5[km]'],
	['-x[m]', '-x~\\unit{m}', '-x[m]'],
	['2*3*4[m]', '2 \\times 3 \\times 4~\\unit{m}', '2*3*4[m]'],
	['-2*3[m]', '-2 \\times 3~\\unit{m}', '-2*3[m]'],
	['-5[m]+2[m]', '-5~\\unit{m} + 2~\\unit{m}', '-5[m]+2[m]'],
	['-2[h]-30[min]', '-2~\\unit{h} - 30~\\unit{min}', '-2[h]-30[min]'],
	// Arbre inchangé : témoins
	['5[m]', '5~\\unit{m}', '5[m]'],
	['10^-3[m]', '10^{-3}~\\unit{m}', '10^{-3}[m]'],
	['2+3[m]', '2 + 3~\\unit{m}', '2+3[m]'],
	['2[m]*3[m]', '2~\\unit{m} \\times 3~\\unit{m}', '2[m]*3[m]'],
	['6[m]/2[s]', '\\dfrac{6~\\unit{m}}{2~\\unit{s}}', '{6[m]}/{2[s]}'],
	['x[h]/y[min]', '\\dfrac{x~\\unit{h}}{y~\\unit{min}}', '{x[h]}/{y[min]}'],
	['1[km]+1[km]/3', '1~\\unit{km} + \\dfrac{1~\\unit{km}}{3}', '1[km]+{1[km]}/3'],
	[
		'(3[h]+20[min])*1[km/h]',
		'\\left( 3~\\unit{h} + 20~\\unit{min} \\right) \\times 1~\\unit{km/h}',
		'(3[h]+20[min])*1[km/h]'
	]
];

// =============================================================================
// Helpers
// =============================================================================

function quantity(expression: MathNode, unit: string): MathNode {
	const parsed = parseUnit(unit);
	if (!parsed) throw new Error(`unité de test inconnue : ${unit}`);
	return MathAST.withUnit(expression, parsed);
}

function valueOf(node: MathNode): string {
	const outcome = computeQuantity(node, 'exact');
	if (outcome.ok === true) return outcome.exact.text;
	if (outcome.ok === 'plain') return toCustom(outcome.node);
	return `refus : ${outcome.message}`;
}

/** Valeur d'une écriture maison lue par le parseur par défaut */
function valueOfWriting(written: string): string {
	const result = parseCustomSafe(written);
	expect(result.errors).toEqual([]);
	return valueOf(result.ast as MathNode);
}

// =============================================================================
// Tests
// =============================================================================

describe.each(CUSTOM_PARSERS)('parseur maison %s : l’unité multiplie le terme', (_, parse) => {
	function astOf(input: string) {
		const result = parse(input);
		expect(result.errors).toEqual([]);
		return result.ast;
	}

	function refusalOf(input: string) {
		const result = parse(input);
		expect(result.errors.length).toBeGreaterThan(0);
		return result.errors[0];
	}

	it.each([
		['1/2[m]', '{1/2}[m]'],
		['6/2[s]', '{6/2}[s]'],
		['10^3/2[m]', '{10^3/2}[m]'],
		['10^-3/2[m]', '{10^-3/2}[m]'],
		['2*3[m]', '{2*3}[m]'],
		['2.5*10^3[m]', '{2.5*10^3}[m]'],
		['2*1/2[m]', '{2*1/2}[m]'],
		['2*3*4[m]', '{2*3*4}[m]'],
		['-5[m]', '{-5}[m]'],
		['+5[m]', '{+5}[m]'],
		['-10^3[m]', '{-10^3}[m]'],
		['-1/2[m]', '{-1/2}[m]'],
		['-2*3[m]', '{-2*3}[m]'],
		['2sqrt(2)[m]', '{2sqrt(2)}[m]'],
		['3x[m]', '{3x}[m]'],
		['x*2[m]', '{x*2}[m]'],
		['x/2[m]', '{x/2}[m]'],
		['x:/2[m]', '{x:/2}[m]'],
		['1/2/3[m]', '{1/2/3}[m]'],
		['2*20[°C]', '{2*20}[°C]'],
		['1/2[km/h]', '{1/2}[km/h]']
	])('%s se lit comme %s', (written, expected) => {
		expect(astOf(written)).toEqual(astOf(expected));
	});

	describe('le terme s’arrête au + et au - d’addition', () => {
		it.each([
			['2+3[m]', 'addition'],
			['2-3[m]', 'subtraction'],
			['1/2[h]+30[min]', 'addition']
		])('%s : %s, l’unité sur le dernier terme seulement', (written, type) => {
			const ast = astOf(written) as MathNode & { right: MathNode };
			expect(ast.type).toBe(type);
			expect(ast.right.type).toBe('unit');
		});

		it('1/2[h]+30[min] = (1/2) h + 30 min', () => {
			expect(astOf('1/2[h]+30[min]')).toEqual(astOf('{1/2}[h]+30[min]'));
		});
	});

	describe('une grandeur déjà formée clôt le terme', () => {
		it.each([
			['6[m]/2[s]', 'division'],
			['a[m]*3[m]', 'multiplication'],
			['x[h]/y[min]', 'division'],
			['sqrt(9[km^2])/1[h]', 'division'],
			['(6[m]/2)*3[s]', 'multiplication'],
			['6[m]/(2*3[s])', 'division']
		])('%s reste un(e) %s de deux grandeurs', (written, type) => {
			expect(astOf(written)?.type).toBe(type);
		});

		it('6[m]/2 reste la grandeur 6 m divisée par 2', () => {
			expect(astOf('6[m]/2')?.type).toBe('division');
		});
	});

	describe('accolades et parenthèses ferment le terme', () => {
		it('2/{7[km]} reste 2 divisé par la grandeur 7 km (valeur substituée par braceWrap)', () => {
			expect(astOf('2/{7[km]}')).toEqual(
				MathAST.divide(MathAST.number('2'), quantity(MathAST.number('7'), 'km'), 'fraction')
			);
		});

		it('1/(2[s]) reste 1 divisé par (2 s)', () => {
			const ast = astOf('1/(2[s])') as MathNode & { denominator: MathNode };
			expect(ast.type).toBe('division');
			expect(ast.denominator.type).toBe('delimiter');
		});

		it('2*{3[m]} garde la grandeur 3 m comme second facteur', () => {
			expect(astOf('2*{3[m]}')?.type).toBe('multiplication');
		});
	});

	describe('espaces entre deux chiffres ignorés', () => {
		it.each([
			['12 500', '12500'],
			['12 500[m]', '12500[m]'],
			['12 5[m]', '125[m]'],
			['0.000 01', '0.00001'],
			['1 000 000', '1000000'],
			['2 3', '23']
		])('%s se lit comme %s', (written, expected) => {
			expect(astOf(written)).toEqual(astOf(expected));
		});

		it.each(['x 2', 'x^2 3', 'x_1 2', '(2) 3'])('%s reste refusé : MISSING_OPERATOR', (written) => {
			expect(refusalOf(written).code).toBe('MISSING_OPERATOR');
		});
	});

	describe('π (Q11 révisée)', () => {
		it.each([
			['π', '\\pi'],
			['2π', '2\\pi'],
			['π[m]', '\\pi[m]'],
			['2π[m]', '{2\\pi}[m]'],
			['cos(π/3)', 'cos(\\pi/3)']
		])('%s se lit comme %s : la constante', (written, expected) => {
			expect(astOf(written)).toEqual(astOf(expected));
		});

		it('pi reste p × i', () => {
			expect(astOf('pi')).toEqual(astOf('p i'));
		});
	});

	describe('refus : terme ambigu après une grandeur (E7)', () => {
		it.each(['6[m]/2*3[s]', '6[m]/2/3[s]', '6[m]*2/3[s]', '6[m]*2*3[s]', '2[m]*3x[m]'])(
			'%s est refusé : AMBIGUOUS_TERM',
			(written) => {
				const error = refusalOf(written);
				expect(error.code).toBe('AMBIGUOUS_TERM');
				expect(error.message).toBe(AMBIGUOUS_MESSAGE);
			}
		);

		it.each(['6[m]*-5[s]', '6[m]/-2[s]'])(
			'%s : un nombre signé reste UN nombre, pas de refus E7',
			(written) => {
				const result = parse(written);
				expect(result.errors.map((error) => error.code)).not.toContain('AMBIGUOUS_TERM');
			}
		);
	});

	describe('refus : unité sans nombre (K2)', () => {
		it.each([
			['[m]', 'm'],
			['2+[m]', 'm'],
			['[km/h]', 'km/h']
		])('%s est refusé : MISSING_NUMBER_BEFORE_UNIT', (written, unit) => {
			const error = refusalOf(written);
			expect(error.code).toBe('MISSING_NUMBER_BEFORE_UNIT');
			expect(error.message).toBe(`A unit needs a number before it (write 1[${unit}])`);
		});

		it.each(['[x-1]', '[x]', '2[x+1]'])('%s reste un crochet de calcul', (written) => {
			expect(parse(written).errors).toEqual([]);
		});
	});
});

describe('refus traduits pour l’atelier', () => {
	it.each([
		['[m]', 'Une unité a besoin d’un nombre devant elle : écris 1[m]'],
		[
			'6[m]/2*3[s]',
			'Plusieurs nombres devant l’unité, après une grandeur : écris 6[m]/(2*3[s]) ou (6[m]/2)*3[s]'
		]
	])('%s : %s', (written, french) => {
		const result = parseCustomSafe(written);
		expect(inFrench(result.errors[0].message)).toBe(french);
	});
});

describe('valeurs', () => {
	it.each([
		['1/2[m]', '0.5 m'],
		['-1/2[m]', '-0.5 m'],
		['10^3/2[m]', '500 m'],
		['1/2/3[m]', '1/6 m'],
		['1/2[km/h]', '0.5 km/h'],
		['2*1/2[m]', '1 m'],
		['-5[m]', '-5 m'],
		['6[m]/2[s]', '3 m/s'],
		['12 500[m]', '12500 m']
	])('%s vaut %s', (written, expected) => {
		expect(valueOfWriting(written)).toBe(expected);
	});
});

describe('températures (Q-T1 et Q-T2 de David, 2026-10-20)', () => {
	it.each([
		['(2*20)[°C]', '40 °C'],
		['1/2[°C]', '1/2 °C'],
		['-20[°C]', '-20 °C'],
		['-20[°C]-5[°C]', '-25 K']
	])('%s vaut %s', (written, expected) => {
		expect(valueOfWriting(written)).toBe(expected);
	});

	it.each(['2*20[°C]', '-2*20[°C]'])(
		'%s : refusé, une température ne se multiplie pas',
		(written) => {
			expect(valueOfWriting(written)).toMatch(/ne se multiplie pas/);
		}
	);

	it('-20[°C]+30[°C] : refusé, une somme de deux températures', () => {
		expect(valueOfWriting('-20[°C]+30[°C]')).toMatch(/^refus/);
	});
});

describe('rendu inchangé des écritures dont l’arbre change', () => {
	it.each(RENDERINGS)('%s : LaTeX %s, maison %s', (written, latex, custom) => {
		const result = parseCustomSafe(written);
		expect(result.errors).toEqual([]);
		const ast = result.ast as MathNode;
		expect(toLatex(ast)).toBe(latex);
		expect(toCustom(ast)).toBe(custom);
	});
});

describe('toCustom d’un arbre construit : relu, la même valeur', () => {
	const two = MathAST.number('2');
	const three = MathAST.number('3');
	const six = MathAST.number('6');
	const x = MathAST.variable('x');

	it.each([
		['1 / (2 m)', MathAST.divide(MathAST.number('1'), quantity(two, 'm'), 'fraction')],
		['x :/ (2 m)', MathAST.divide(x, quantity(two, 'm'), 'inline')],
		['x : (2 m)', MathAST.divide(x, quantity(two, 'm'), 'ratio')],
		['2 × (3 m)', MathAST.multiply(two, quantity(three, 'm'), 'cross')],
		['(1/2) m', quantity(MathAST.divide(MathAST.number('1'), two, 'fraction'), 'm')],
		['(2×3) m', quantity(MathAST.multiply(two, three, 'cross'), 'm')],
		['−(3 m)', MathAST.opposite(quantity(three, 'm'))],
		['(−3) m', quantity(MathAST.opposite(three), 'm')],
		['2 × −(3 m)', MathAST.multiply(two, MathAST.opposite(quantity(three, 'm')), 'cross')],
		[
			'6 m × (2/3) s',
			MathAST.multiply(
				quantity(six, 'm'),
				quantity(MathAST.divide(two, three, 'fraction'), 's'),
				'cross'
			)
		],
		[
			'6 m × (2×3) s',
			MathAST.multiply(
				quantity(six, 'm'),
				quantity(MathAST.multiply(two, three, 'cross'), 's'),
				'cross'
			)
		],
		[
			'(6 m / 2) × 3 s',
			MathAST.multiply(
				MathAST.divide(quantity(six, 'm'), two, 'fraction'),
				quantity(three, 's'),
				'cross'
			)
		],
		[
			'6 m / 2 / (3 s)',
			MathAST.divide(
				MathAST.divide(quantity(six, 'm'), two, 'fraction'),
				quantity(three, 's'),
				'fraction'
			)
		],
		[
			'6 m × (2 × 3 s)',
			MathAST.multiply(
				quantity(six, 'm'),
				MathAST.multiply(two, quantity(three, 's'), 'cross'),
				'cross'
			)
		]
	])('%s', (_, node) => {
		const written = toCustom(node);
		const reread = parseCustomSafe(written);
		expect(reread.errors, written).toEqual([]);
		expect(valueOf(reread.ast as MathNode), written).toBe(valueOf(node));
	});
});

describe('revue de la PR 4', () => {
	const twenty = quantity(MathAST.number('20'), '°C');
	const thirty = quantity(MathAST.number('30'), '°C');

	it.each([
		['−(20 °C) + 30 °C', MathAST.add(MathAST.opposite(twenty), thirty)],
		['−(−(5 m))', MathAST.opposite(MathAST.opposite(quantity(MathAST.number('5'), 'm')))],
		[
			'(6 m) · ((2×3) s), implicite',
			MathAST.multiply(
				quantity(MathAST.number('6'), 'm'),
				quantity(MathAST.multiply(MathAST.number('2'), MathAST.number('3'), 'cross'), 's'),
				'implicit'
			)
		]
	])('toCustom de %s se relit avec la même valeur, en mode simple et coloré', (_, node) => {
		for (const written of [toCustom(node), toCustom(node, { renderMetadata: true })]) {
			const reread = parseCustomSafe(written);
			expect(reread.errors, written).toEqual([]);
			expect(valueOf(reread.ast as MathNode), written).toBe(valueOf(node));
		}
	});

	it('-{-5[m]} s’écrit -(-5[m])', () => {
		expect(toCustom(parseCustomSafe('-{-5[m]}').ast as MathNode)).toBe('-(-5[m])');
	});

	it.each([
		['2--5[m]', '2 - \\left( -5~\\unit{m} \\right)'],
		['2[m]*-5[m]', '2~\\unit{m} \\times \\left( -5~\\unit{m} \\right)']
	])('LaTeX de %s : le signe de la grandeur garde ses parenthèses', (written, latex) => {
		expect(toLatex(parseCustomSafe(written).ast as MathNode)).toBe(latex);
	});

	it.each(['6[m]:/5[km]', '6[m]:2[s]'])('%s s’écrit sans accolades', (written) => {
		expect(toCustom(parseCustomSafe(written).ast as MathNode)).toBe(written);
	});

	it('2/@red{7[km]} : les accolades colorées ferment le terme comme les autres', () => {
		expect(valueOfWriting('2/@red{7[km]}')).toBe(valueOfWriting('2/{7[km]}'));
	});
});
