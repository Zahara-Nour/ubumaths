/**
 * `tidy` garde le registre décimal (S1, lot 4b du chantier simplify-carte,
 * décision de David du 2026-10-22, comportements validés le 2026-10-23,
 * journal § 35).
 *
 * Un décimal reste décimal. Le résultat s'écrit en fraction si un opérande est
 * une fraction — une barre de fraction en est une (Q3) — ou si le résultat n'a
 * pas d'écriture décimale finie. Un entier ne compte ni pour l'un ni pour l'autre.
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { TidyStepRecorder } from '../step-recorder';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';

const t = (s: string) => toCustom(tidy(parseCustom(s)));

describe('tidy — un décimal reste décimal', () => {
	it.each([
		['0.5+0.25', '0.75'],
		['x*0.5', '0.5x'],
		['1.5^2', '2.25'],
		['2.5', '2.5'],
		['0.50', '0.5'],
		['3*0.5', '1.5'],
		['0.5*0.4', '0.2'],
		['0.1+0.2', '0.3'],
		['-0.5*0.5', '-0.25'],
		['0.5x+0.25x', '0.75x'],
		['x-0.5x', '0.5x'],
		['0.5x+0.5x', 'x'],
		['0.5x^2+1.5x-2', '0.5x^2+1.5x-2'],
		['sqrt(0.25)', '0.5'],
		// Une puissance négative n'est pas une barre : le résultat décide
		['0.4^(-1)', '2.5'],
		['1.5*10^(-2)', '0.015']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('tidy — un décimal devant une somme ne la distribue ni ne la met en fraction', () => {
	it.each([
		['0.5(x+1)', '0.5(x+1)'],
		['1.5(x+1)', '1.5(x+1)'],
		['0.5x(x+0.2)', '0.5x(x+0.2)'],
		// Pas de − entré dans le numérateur : il n'y a pas de barre
		['-0.5(x-1)', '-0.5(x-1)']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it('un nombre commun qui laisse un entier se simplifie toujours : 0,5(2x+4) → x+2', () => {
		expect(t('0.5(2x+4)')).toBe('x+2');
	});
});

describe('tidy — une fraction parmi les opérandes : le résultat est une fraction', () => {
	it.each([
		['0.3x+1/2', '0.3x+1/2'],
		['1/2+0.5', '1'],
		['1/3+0.5', '5/6'],
		['0.5x+x/2', 'x'],
		['0.5x+x/3', '{5x}/6'],
		// Résultat sans écriture décimale finie
		['0.5*3^(-1)', '1/6']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('tidy — une barre de fraction compte comme opérande fraction (Q3)', () => {
	it.each([
		['0.5/2', '1/4'],
		['2.5x/5', 'x/2'],
		['x/0.5', '2x'],
		// Table A.1 de la spec, gardée
		['(0.5x+1)/3', '{x+2}/6']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('tidy — les grandeurs gardent leur écriture décimale (§D.3)', () => {
	it.each([
		['2.5[m]+1[m]', '3.5[m]'],
		['0.5x[km]', '0.5x[km]']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('tidy — la narration ne parle pas de dénominateur pour des décimaux', () => {
	it('0,5 + 0,25 : pas « on met au même dénominateur »', () => {
		const recorder = new TidyStepRecorder();
		const result = tidy(parseCustom('0.5+0.25'), { recorder });
		expect(toCustom(result)).toBe('0.75');
		expect(recorder.getSteps().map((s) => s.rule)).not.toContain('tidy-add-fractions');
	});
});

describe('tidy — invariants sur les décimaux', () => {
	const cases = [
		'0.5+0.25',
		'x*0.5',
		'1.5^2',
		'0.5(x+1)',
		'-0.5(x-1)',
		'0.5x(x+0.2)',
		'0.3x+1/2',
		'0.5x^2+1.5x-2',
		'1/3+0.5',
		'(0.5x+1)/3',
		// Revue : une puissance négative s'écrit sous une barre, le décimal ne survit pas
		'0.5*x^(-1)',
		'0.5*(x+1)^(-1)',
		'1.5*x^(-1)',
		'0.5x^(-2)',
		'(x+1)^(-1)*(x-1)*0.5',
		'0.25x^(-1)+0.25x^(-1)',
		'0.5x^(-1)*x^2'
	];

	it.each(cases)('idempotent : %s', (input) => {
		const once = tidy(parseCustom(input));
		expect(toCustom(tidy(once))).toBe(toCustom(once));
	});

	it.each(cases)('valeur conservée : %s', (input) => {
		const node = parseCustom(input);
		expect(areEquivalent(tidy(node), node)).toBe(true);
	});
});
