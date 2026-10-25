/**
 * Une puissance numérique d'exposant fractionnaire (Q47, chantier
 * simplify-carte, David 2026-10-24, journal § 71-72).
 *
 * `2^{1/2}` s'affichait `√2` sur la ligne de l'Atelier, mais `2^{0,5}`,
 * `8^{1/2}` et `2^{3/2}` restaient écrits en puissance. Règle : un exposant de
 * dénominateur 2 s'écrit avec une racine carrée (`8^{1/2} → 2√2`) ; les autres
 * dénominateurs restent écrits, sauf une valeur exacte entière
 * (`27^{2/3} → 9`, mais `2^{1/3}` reste).
 */

import { describe, it, expect } from 'vitest';
import { tidy, TidyStepRecorder } from '../index';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';

const t = (s: string) => toCustom(tidy(parseCustom(s)));
const written = (s: string) => toCustom(parseCustom(s));

describe('exposant de dénominateur 2 → racine carrée', () => {
	it.each([
		['2^(1/2)', 'sqrt(2)'],
		['2^0.5', 'sqrt(2)'],
		['4^0.5', '2'],
		['9^0.5', '3'],
		['8^(1/2)', '2sqrt(2)'],
		['2^(3/2)', '2sqrt(2)'],
		['2^1.5', '2sqrt(2)'],
		['3^(5/2)', '9sqrt(3)'],
		['2^0.5*x', 'sqrt(2)x'],
		['x*8^(1/2)', '2sqrt(2)x'],
		['2^(-1/2)', 'sqrt(2)/2'],
		['(2^(1/2))^3', '2sqrt(2)'],
		['2^(1/2)+2^(1/2)', '2sqrt(2)']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(written(expected));
	});

	it('un décimal sous la racine garde son registre (Q8)', () => {
		expect(t('0.25^0.5')).toBe(written('0.5'));
		expect(t('0.5^0.5')).toBe(written('sqrt(2)/2'));
	});
});

describe('les autres dénominateurs : valeur exacte entière seulement', () => {
	it.each([
		['27^(2/3)', '9'],
		['8^(1/3)', '2'],
		['16^(3/4)', '8']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(written(expected));
	});

	it.each(['2^(1/3)', '2^(2/3)', '10^(1/5)', '(8/27)^(1/3)'])('%s reste écrit', (input) => {
		expect(t(input)).toBe(written(input));
	});
});

describe('hors règle', () => {
	it.each(['x^(1/2)', '(-4)^(1/2)', '(-8)^(1/3)', '0^(1/2)', '2^x'])('%s reste écrit', (input) => {
		expect(t(input)).toBe(written(input));
	});

	it('un exposant au-delà du plafond reste écrit', () => {
		expect(t('2^(1001/2)')).toBe(written('2^(1001/2)'));
	});
});

describe('contrat de tidy', () => {
	it.each([
		'2^0.5',
		'8^(1/2)',
		'2^(3/2)',
		'3^(5/2)',
		'2^(-1/2)',
		'2^0.5*x',
		'27^(2/3)',
		'(2/3)^(1/2)',
		'0.5^0.5',
		'0.25^0.5'
	])('%s : valeur conservée, idempotent', (input) => {
		const once = tidy(parseCustom(input));
		expect(areEquivalent(once, parseCustom(input))).toBe(true);
		expect(toCustom(tidy(once))).toBe(toCustom(once));
	});
});

describe('l’étape dit le geste', () => {
	it('2^0,5 x : « On écrit la puissance avec une racine carrée »', () => {
		const recorder = new TidyStepRecorder();
		tidy(parseCustom('2^0.5*x'), { recorder });
		const steps = recorder.getSteps();
		expect(steps.map((step) => step.rule)).toContain('tidy-power-to-root');
	});

	it('27^(2/3) : « On calcule les nombres »', () => {
		const recorder = new TidyStepRecorder();
		tidy(parseCustom('27^(2/3)'), { recorder });
		expect(recorder.getSteps().map((step) => step.rule)).toEqual(['tidy-fold-numbers']);
	});
});
