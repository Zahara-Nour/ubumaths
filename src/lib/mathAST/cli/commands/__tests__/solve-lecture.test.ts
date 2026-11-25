/**
 * `.solve` lit comme l'Atelier (chantier `registre-reference`, PR 2c, phase 0
 * validée par David le 2026-11-09) : paramètre refusé (V57), décimaux tapés
 * gardés (Q46), degrés lus (valeurs remarquables, angle quelconque gardé en
 * degrés), virgule décimale lue ; le texte du terminal conclut sur S.
 */

import { describe, expect, it } from 'vitest';
import { WebReplEngine } from '../../web/web-repl-engine';

const DEPENDS_ON = (letter: string) =>
	`Le résultat dépend de ${letter} : donne-lui une valeur (${letter} = 2) pour l'étudier.`;

function solved(...lines: string[]) {
	const engine = new WebReplEngine();
	const setup = lines.slice(0, -1);
	for (const line of setup) engine.execute(line);
	return engine.execute(`.solve ${lines[lines.length - 1]}`);
}

function flat(latex: string | undefined): string {
	return (latex ?? '').replace(/\s+/g, '');
}

/** La dernière ligne du texte du terminal. */
function lastLine(output: string): string {
	return output.trim().split('\n').at(-1) ?? '';
}

describe('.solve : un paramètre non posé est refusé (V57)', () => {
	it.each([
		['a x = 4', 'a'],
		['a t = 3 ; t', 'a'],
		['b*x+5=14', 'b'],
		['a x > 1', 'a'],
		['x/a = 1', 'a'],
		['1/x = a', 'a']
	])('%s', (line, letter) => {
		const result = solved(line);
		expect(result.success).toBe(false);
		expect(result.answer).toBeUndefined();
		expect(result.error?.message ?? result.output).toBe(DEPENDS_ON(letter));
	});

	it.each([
		['x + a = 0', 'S = \\left\\{ -a \\right\\}'],
		['2x = a', 'S = \\left\\{ \\dfrac{a}{2} \\right\\}'],
		[
			'x^2 = a',
			'S = \\left\\{ \\sqrt{a} \\,;\\, -\\sqrt{a} \\right\\} \\quad \\text{si } a \\geqslant 0'
		]
	])('%s reste résolu', (line, answer) => {
		expect(flat(solved(line).answer)).toBe(flat(answer));
	});

	it('une lettre posée est une valeur : a := 2 puis a x = 4', () => {
		expect(flat(solved('a := 2', 'a x = 4').answer)).toBe(flat('S = \\left\\{ 2 \\right\\}'));
	});
});

describe('.solve : les décimaux tapés restent décimaux (Q46)', () => {
	it.each([
		['x+0.5=2', 'S = \\left\\{ 1{,}5 \\right\\}'],
		['0.5x+3=1', 'S = \\left\\{ -4 \\right\\}'],
		['2x = 0.6', 'S = \\left\\{ 0{,}3 \\right\\}'],
		// Pas d'écriture décimale finie : la fraction
		['0.3x = 1', 'S = \\left\\{ \\dfrac{10}{3} \\right\\}']
	])('%s', (line, answer) => {
		expect(flat(solved(line).answer)).toBe(flat(answer));
	});
});

describe('.solve : la virgule décimale est lue (Q3)', () => {
	it.each([
		['2x = 0,6', 'S = \\left\\{ 0{,}3 \\right\\}'],
		['0,5x + 1 = 2', 'S = \\left\\{ 2 \\right\\}']
	])('%s', (line, answer) => {
		expect(flat(solved(line).answer)).toBe(flat(answer));
	});
});

describe('.solve : les degrés sont lus', () => {
	it.each([
		['cos(60°)x=1', 'S = \\left\\{ 2 \\right\\}'],
		['cos(-60°)x=1', 'S = \\left\\{ 2 \\right\\}'],
		['x+cos(420°)=1', 'S = \\left\\{ \\dfrac{1}{2} \\right\\}'],
		['x^3 = cos(60°)', 'S = \\left\\{ \\sqrt[3]{\\dfrac{1}{2}} \\right\\}']
	])('valeur remarquable : %s', (line, answer) => {
		expect(flat(solved(line).answer)).toBe(flat(answer));
	});

	// Q1 : un angle quelconque reste en degrés, comme `.simplify cos(20°)x`
	it.each([
		['cos(20°)x=1', 'S = \\left\\{ \\dfrac{1}{\\cos\\left( 20~\\unit{°} \\right)} \\right\\}'],
		[
			'x^2 = cos(20°) dans [0;5]',
			'S = \\left\\{ \\sqrt{\\cos\\left( 20~\\unit{°} \\right)} \\right\\}'
		],
		// Revue : le moteur sort le signe d'un angle opposé (`-sin(π/9)`)
		['sin(-20°)x=1', 'S = \\left\\{ -\\dfrac{1}{\\sin\\left( 20~\\unit{°} \\right)} \\right\\}']
	])('angle quelconque : %s', (line, answer) => {
		expect(flat(solved(line).answer)).toBe(flat(answer));
	});

	// E54 (David, 2026-11-24) : une famille venue d'un angle tapé en degrés
	// s'écrit en degrés, période comprise — « 20° + k·360° et −20° + k·360° »,
	// sans arccos ni radians
	it.each([
		['cos(x) = cos(20°)', ['-20', '20'], '360'],
		['sin(x) = sin(20°)', ['20', '160'], '360'],
		['tan(x) = tan(20°)', ['20'], '180'],
		// Angle remarquable tapé en degrés : en degrés aussi
		['cos(x) = cos(60°)', ['-60', '60'], '360'],
		// Argument multiple : la période se divise
		['cos(2x) = cos(20°)', ['-10', '10'], '180'],
		// Angle négatif, angle au-delà d'un tour : la mesure principale
		['cos(x) = cos(-20°)', ['-20', '20'], '360'],
		['cos(x) = cos(400°)', ['-40', '40'], '360'],
		['sin(x) = sin(-20°)', ['-20', '200'], '360'],
		// Un angle décimal garde sa virgule
		['cos(x) = cos(22,5°)', ['-22{,}5', '22{,}5'], '360'],
		// sin = cos, −cos : la mesure de la solution, pas un arcsin
		['sin(x) = cos(20°)', ['70', '110'], '360'],
		['cos(x) = -cos(20°)', ['-160', '160'], '360']
	])('famille en degrés : %s', (line, bases, period) => {
		const k = `k \\cdot ${period}~\\unit{°}`;
		const members = bases.map((base) => `${base}~\\unit{°} + ${k}`).join(' \\,;\\, ');
		expect(flat(solved(line).answer)).toBe(
			flat(`S = \\left\\{ ${members} ,\\; k \\in \\mathbb{Z} \\right\\}`)
		);
	});

	it('famille en degrés : une solution nulle se réduit à la période', () => {
		expect(flat(solved('sin(x) = sin(0°)').answer)).toBe(
			flat('S = \\left\\{ k \\cdot 180~\\unit{°} ,\\; k \\in \\mathbb{Z} \\right\\}')
		);
	});

	it('famille en degrés : une période fractionnaire reste exacte (cos(7x) = cos(20°))', () => {
		expect(flat(solved('cos(7x) = cos(20°)').answer)).toBe(
			flat(
				'S = \\left\\{ -\\dfrac{20}{7}~\\unit{°} + k \\cdot \\dfrac{360}{7}~\\unit{°} \\,;\\, \\dfrac{20}{7}~\\unit{°} + k \\cdot \\dfrac{360}{7}~\\unit{°} ,\\; k \\in \\mathbb{Z} \\right\\}'
			)
		);
	});

	it('famille en degrés : le texte du terminal dit la même chose', () => {
		expect(lastLine(solved('cos(x) = cos(20°)').output)).toBe(
			'S = {-20[°] + k·360[°] ; 20[°] + k·360[°], k ∈ ℤ}'
		);
	});

	// Sans degré tapé, rien ne change (E54) — `cos(π/5)` garde son arccos (écart
	// à part, signalé), le cas mêlé degrés + radians aussi, et `cos(x°)` résout x
	// en nombre de degrés
	it.each([
		[
			'cos(x) = cos(π/5)',
			'S = \\left\\{ -\\arccos\\left( \\cos\\left( \\dfrac{\\pi}{5} \\right) \\right) + 2k\\pi \\,;\\, \\arccos\\left( \\cos\\left( \\dfrac{\\pi}{5} \\right) \\right) + 2k\\pi ,\\; k \\in \\mathbb{Z} \\right\\}'
		],
		['cos(2x) = cos(x)', 'S = \\left\\{ \\dfrac{2k\\pi}{3} ,\\; k \\in \\mathbb{Z} \\right\\}'],
		[
			'cos(x) = 0,5',
			'S = \\left\\{ -\\dfrac{\\pi}{3} + 2k\\pi \\,;\\, \\dfrac{\\pi}{3} + 2k\\pi ,\\; k \\in \\mathbb{Z} \\right\\}'
		],
		[
			'cos(x+π/3) = cos(20°)',
			'S = \\left\\{ -\\dfrac{\\pi}{3} - \\arccos\\left( \\cos\\left( 20~\\unit{°} \\right) \\right) + 2k\\pi \\,;\\, \\arccos\\left( \\cos\\left( 20~\\unit{°} \\right) \\right) - \\dfrac{\\pi}{3} + 2k\\pi ,\\; k \\in \\mathbb{Z} \\right\\}'
		],
		[
			'cos(x°) = cos(20°)',
			'S = \\left\\{ -20 + 360k \\,;\\, 20 + 360k ,\\; k \\in \\mathbb{Z} \\right\\}'
		]
	])('famille sans degré tapé seul, inchangée : %s', (line, answer) => {
		expect(flat(solved(line).answer)).toBe(flat(answer));
	});
});

describe('.solve : le texte du terminal conclut sur S (Q2)', () => {
	it.each([
		['2x+1=7', 'S = {3}'],
		['x^2=4', 'S = {-2 ; 2}'],
		['e^x=3', 'S = {ln(3)}'],
		['x+0.5=2', 'S = {1.5}'],
		['2x+1<7', 'S = ]-∞ ; 3['],
		['0.8^n<0.1 ; n', 'n > ln(0.1)/ln(0.8) ≈ 10.32'],
		// Revue : le texte d'une inéquation s'écrit comme son LaTeX
		['x^2>0.25', 'S = ]-∞ ; -0.5[ ∪ ]0.5 ; +∞[']
	])('%s', (line, text) => {
		expect(lastLine(solved(line).output)).toBe(text);
	});

	it('mode décimal : e^x=3 → S ≈ {1.0986}', () => {
		expect(lastLine(solved('.mode decimal', 'e^x=3').output)).toBe('S ≈ {1.0986}');
	});

	it('les étapes ne changent pas : 2x+1=7 passe par x = 3', () => {
		const output = solved('2x+1=7').output;
		expect(output).toContain('On divise les deux membres par 2: x = 3');
	});
});
