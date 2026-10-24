/**
 * Des termes qui s'annulent ne font pas perdre le domaine (S3 étendue aux
 * sommes, chantier simplify-carte, David 2026-10-24, journal § 65).
 *
 * `x/x` restait `x/x` (lot 4a), mais `ln(x) − ln(x)` devenait `0`, défini
 * partout : la même perte de domaine, par une soustraction. Des termes
 * semblables de somme nulle ne disparaissent que si leur domaine est ℝ, ou
 * acquis (hypothèse déclarée `typeCtx`, domaine `domain`).
 */

import { describe, it, expect } from 'vitest';
import { tidy, TidyStepRecorder } from '../index';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';
import type { TypeContext } from '../../numtype';

const t = (s: string, typeCtx?: TypeContext) => toCustom(tidy(parseCustom(s), { typeCtx }));
const written = (s: string) => toCustom(parseCustom(s));

const nonZero: TypeContext = { assumptions: new Map([['x', { sign: 'nonzero' as const }]]) };
const positive: TypeContext = { assumptions: new Map([['x', { sign: 'positive' as const }]]) };

describe('des termes à domaine restreint ne s’annulent pas', () => {
	it.each([
		'ln(x)-ln(x)',
		'1/x-1/x',
		'sqrt(x)-sqrt(x)',
		'x/x-x/x',
		'1/(x-1)-1/(x-1)',
		'x^(1/2)-x^(1/2)',
		'log(x)-log(x)',
		'arcsin(x)-arcsin(x)',
		'2ln(x)-ln(x)-ln(x)',
		'ln(x)+3-ln(x)',
		'sin(1/x)-sin(1/x)',
		'x^x-x^x'
	])('%s reste écrit', (input) => {
		const result = t(input);
		expect(result).not.toBe('0');
		expect(result).not.toBe('3');
		expect(areEquivalent(parseCustom(result), parseCustom(input))).toBe(true);
	});

	it.each([
		['ln(x)-ln(x)', 'ln(x)-ln(x)'],
		['1/x-1/x', '1/x-1/x']
	])('%s → %s (rien ne change)', (input, expected) => {
		expect(t(input)).toBe(written(expected));
	});

	// Un terme qui ne s'annule pas se regroupe toujours : le domaine reste dit
	it.each([
		['2ln(x)+3ln(x)', '5ln(x)'],
		['ln(x)-ln(x)+ln(x)', 'ln(x)'],
		['1/x+1/x', '2/x']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(written(expected));
	});
});

describe('des termes définis partout s’annulent', () => {
	it.each([
		'x-x',
		'x^2-x^2',
		'e^x-e^x',
		'2^x-2^x',
		'sin(x)-sin(x)',
		'abs(x)-abs(x)',
		'ln(2)-ln(2)',
		'ln(x^2+1)-ln(x^2+1)',
		'sqrt(x^2)-sqrt(x^2)',
		'sqrt(x^2+1)-sqrt(x^2+1)',
		'1/(x^2+1)-1/(x^2+1)',
		'1/e^x-1/e^x'
	])('%s → 0', (input) => {
		expect(t(input)).toBe('0');
	});

	// Un zéro absorbant n'est pas une annulation de termes : inchangé
	it.each([
		['0/x', '0'],
		['0*ln(x)', '0']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it('x − x + 3 → 3', () => {
		expect(t('x-x+3')).toBe('3');
	});
});

describe('sous hypothèse ou sur un domaine acquis, ils s’annulent', () => {
	it('ln(x) − ln(x) → 0 pour x > 0', () => {
		expect(t('ln(x)-ln(x)', positive)).toBe('0');
	});

	it('1/x − 1/x → 0 pour x non nul', () => {
		expect(t('1/x-1/x', nonZero)).toBe('0');
	});

	it('ln(x) − ln(x) → 0 sur le domaine de ln(x)', () => {
		expect(toCustom(tidy(parseCustom('ln(x)-ln(x)'), { domain: [parseCustom('ln(x)')] }))).toBe(
			'0'
		);
	});

	it('1/x − 1/x → 0 sur le domaine de 1/x', () => {
		expect(toCustom(tidy(parseCustom('1/x-1/x'), { domain: [parseCustom('1/x')] }))).toBe('0');
	});
});

// Revue Opus : un domaine qui dit « ≠ 0 » ne dit pas « > 0 »
describe('un domaine acquis ne lève que ce qu’il garantit', () => {
	const onDomain = (s: string, d: string) =>
		toCustom(tidy(parseCustom(s), { domain: [parseCustom(d)] }));

	it.each([
		['ln(x)-ln(x)', '1/x'],
		['ln(x)-ln(x)', 'ln(x^2)'],
		['ln(x)-ln(x)', 'ln(-x)'],
		['x^(1/2)-x^(1/2)', '1/x'],
		['x^x-x^x', '1/x'],
		['ln(x-1)-ln(x-1)', '1/(x-1)']
	])('%s reste écrit sur le domaine de %s', (input, domain) => {
		expect(onDomain(input, domain)).not.toBe('0');
	});

	it.each([
		['x^(1/2)-x^(1/2)', 'ln(x)'],
		['x^x-x^x', 'x^x'],
		['1/x-1/x', 'ln(x)']
	])('%s → 0 sur le domaine de %s', (input, domain) => {
		expect(onDomain(input, domain)).toBe('0');
	});
});

describe('fonctions hors de ℝ entier', () => {
	it.each(['arccosh(x)-arccosh(x)', 'arctanh(x)-arctanh(x)', 'factorial(x)-factorial(x)'])(
		'%s reste écrit',
		(input) => {
			expect(t(input)).not.toBe('0');
		}
	);
});

// Lot 5f-1 (R3, Q41 tranchée par David le 2026-10-24, journal § 71-72)
describe('une racine d’indice impair est définie partout', () => {
	it.each(['sqrt[3](x)-sqrt[3](x)', 'sqrt[5](x)-sqrt[5](x)', 'sqrt[3](x)+2-sqrt[3](x)'])(
		'%s : ∛x s’annule',
		(input) => {
			expect(t(input)).not.toContain('sqrt');
		}
	);

	it.each(['sqrt(x)-sqrt(x)', 'sqrt[4](x)-sqrt[4](x)', 'sqrt[3](ln(x))-sqrt[3](ln(x))'])(
		'%s reste écrit',
		(input) => {
			expect(t(input)).not.toBe('0');
		}
	);
});

describe('en ordre rangé, les termes gardés pour le domaine restent côte à côte', () => {
	it.each([
		['3-ln(x)+x+ln(x)', 'ln(x)-ln(x)+x+3'],
		['ln(x)+3-ln(x)', 'ln(x)-ln(x)+3'],
		['x+ln(x)+3-ln(x)', 'ln(x)-ln(x)+x+3'],
		['1/x+x-1/x', 'x+1/x-1/x']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(written(expected));
	});

	it.each(['3-ln(x)+x+ln(x)', 'ln(x)+3-ln(x)', '1/x+x-1/x'])('%s : idempotent', (input) => {
		const once = tidy(parseCustom(input));
		expect(toCustom(tidy(once))).toBe(toCustom(once));
	});

	it('ln(x) + 3 − ln(x) : le récit ne revient pas à l’écriture de départ', () => {
		const recorder = new TidyStepRecorder();
		const source = parseCustom('ln(x)+3-ln(x)');
		tidy(source, { recorder });
		const afters = recorder.getSteps().map((step) => toCustom(step.after));
		expect(afters).not.toContain(toCustom(source));
		expect(afters.at(-1)).toBe(written('ln(x)-ln(x)+3'));
	});
});
