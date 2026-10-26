/**
 * La variante `{ result, conditions }` de `tidy` (chantier tidy-conditions,
 * David 2026-10-26 ; décision S3 de simplify-carte, 2026-10-22).
 *
 * `tidy` garde le domaine : `x/x` et `ln(x) − ln(x)` restent écrits.
 * `tidyWithConditions` fait ces simplifications et dit à quelle condition
 * elles valent : `x/x → 1`, pour x ≠ 0 ; `ln(x) − ln(x) → 0`, pour x > 0.
 * Une condition qu'on ne sait pas écrire simplement (`tan`, `arcsin`) : la
 * simplification n'a pas lieu, plutôt qu'une condition fausse.
 */

import { describe, it, expect } from 'vitest';
import { tidy, tidyWithConditions, describeConditions, domainLoss } from '../index';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';
import type { TypeContext } from '../../numtype';
import type { TidyOptions } from '../step-recorder';

function run(input: string, options?: TidyOptions) {
	const { result, conditions } = tidyWithConditions(parseCustom(input), options);
	return {
		result: toCustom(result),
		conditions: describeConditions(conditions).map((c) => c.text)
	};
}

const written = (s: string) => toCustom(parseCustom(s));

const nonZero: TypeContext = { assumptions: new Map([['x', { sign: 'nonzero' as const }]]) };

describe('la simplification que tidy refuse, avec sa condition', () => {
	it.each([
		['x/x', '1', ['x ≠ 0']],
		['x^2/x', 'x', ['x ≠ 0']],
		['(2x)/(4x)', '1/2', ['x ≠ 0']],
		['(x+1)/(x+1)', '1', ['x ≠ -1']],
		['(x-2)/(x-2)', '1', ['x ≠ 2']],
		['(2x+1)/(2x+1)', '1', ['x ≠ -1/2']],
		['(x+1)^2/(x+1)', 'x+1', ['x ≠ -1']],
		['x*(1/x)', '1', ['x ≠ 0']],
		['y/y', '1', ['y ≠ 0']],
		['(x^2-1)/(x^2-1)', '1', ['x^2-1 ≠ 0']],
		['ln(x)-ln(x)', '0', ['x > 0']],
		['1/x-1/x', '0', ['x ≠ 0']],
		['1/(x-1)-1/(x-1)', '0', ['x ≠ 1']],
		['sqrt(x)-sqrt(x)', '0', ['x ≥ 0']],
		['x^(1/2)-x^(1/2)', '0', ['x ≥ 0']],
		['sqrt(x)/sqrt(x)', '1', ['x > 0']],
		['sin(1/x)-sin(1/x)', '0', ['x ≠ 0']],
		['x^x-x^x', '0', ['x > 0']],
		['ln(x)+3-ln(x)', '3', ['x > 0']]
	])('%s → %s, pour %j', (input, result, conditions) => {
		const got = run(input);
		expect(got.result).toBe(written(result));
		expect(got.conditions).toEqual(conditions);
	});

	it('la valeur est gardée, là où l’entrée est définie', () => {
		for (const input of ['x/x', '(x+1)^2/(x+1)', 'ln(x)-ln(x)', 'sqrt(x)/sqrt(x)']) {
			const { result } = tidyWithConditions(parseCustom(input));
			expect(areEquivalent(result, parseCustom(input))).toBe(true);
		}
	});
});

describe('les conditions se disent une fois, la plus forte', () => {
	it('deux fois la même : une seule', () => {
		expect(run('x/x+1/x-1/x')).toEqual({ result: '1', conditions: ['x ≠ 0'] });
	});

	it('x > 0 contient x ≠ 0', () => {
		expect(run('ln(x)-ln(x)+x/x')).toEqual({ result: '1', conditions: ['x > 0'] });
	});

	it('x ≥ 0 et x ≠ 0 donnent x > 0', () => {
		expect(run('sqrt(x)-sqrt(x)+x/x')).toEqual({ result: '1', conditions: ['x > 0'] });
	});

	it('deux variables : une condition chacune, dans l’ordre de lecture', () => {
		expect(run('x/x+y/y')).toEqual({ result: '2', conditions: ['x ≠ 0', 'y ≠ 0'] });
	});
});

describe('rien à lever : le résultat de tidy, sans condition', () => {
	it.each(['x+1', 'x/x^2', 'e^x/e^x', '(x^2+1)/(x^2+1)', 'x-x', '2/6+1/4', '(x+1)^2', 'x^0'])(
		'%s',
		(input) => {
			const { result, conditions } = tidyWithConditions(parseCustom(input));
			expect(toCustom(result)).toBe(toCustom(tidy(parseCustom(input))));
			expect(conditions).toEqual([]);
		}
	);

	it('une hypothèse déclarée n’est pas redite', () => {
		expect(run('x/x', { typeCtx: nonZero })).toEqual({ result: '1', conditions: [] });
	});

	it('un domaine acquis n’est pas redit (dérivée de x ln x)', () => {
		expect(run('x*(1/x)', { domain: [parseCustom('x*ln(x)')] })).toEqual({
			result: '1',
			conditions: []
		});
	});

	it('idempotente : le résultat ne demande plus rien', () => {
		for (const input of ['x/x', 'ln(x)-ln(x)', '(x+1)^2/(x+1)']) {
			const once = tidyWithConditions(parseCustom(input)).result;
			const twice = tidyWithConditions(once);
			expect(toCustom(twice.result)).toBe(toCustom(once));
			expect(twice.conditions).toEqual([]);
		}
	});
});

describe('une condition qu’on ne sait pas écrire : pas de simplification', () => {
	it.each(['tan(x)-tan(x)', 'arcsin(x)-arcsin(x)', 'tan(x)/tan(x)'])(
		'%s reste comme tidy',
		(input) => {
			const { result, conditions } = tidyWithConditions(parseCustom(input));
			expect(toCustom(result)).toBe(toCustom(tidy(parseCustom(input))));
			expect(conditions).toEqual([]);
		}
	);
});

describe('l’écriture LaTeX', () => {
	it.each([
		['x/x', ['x \\neq 0']],
		['(2x+1)/(2x+1)', ['x \\neq -\\dfrac{1}{2}']],
		['ln(x)-ln(x)', ['x > 0']],
		['sqrt(x)-sqrt(x)', ['x \\geq 0']]
	])('%s → %j', (input, latex) => {
		const { conditions } = tidyWithConditions(parseCustom(input));
		expect(describeConditions(conditions).map((c) => c.latex.replace(/\s/g, ''))).toEqual(
			latex.map((l) => l.replace(/\s/g, ''))
		);
	});
});

describe('ce que le résultat garde n’est pas redit', () => {
	it('x/x + ln(x) → ln(x) + 1 : x > 0 reste dit par ln(x), aucune condition', () => {
		expect(run('x/x+ln(x)')).toEqual({ result: written('ln(x)+1'), conditions: [] });
	});
});

describe('domainLoss : ce qu’une réécriture a perdu du domaine', () => {
	const loss = (before: string, after: string) => {
		const lost = domainLoss(parseCustom(before), parseCustom(after));
		return lost === null ? null : describeConditions(lost).map((c) => c.text);
	};

	it.each([
		['(x^2-1)/(x+1)', 'x-1', ['x ≠ -1']],
		['sqrt(x)^2', 'x', ['x ≥ 0']],
		['e^(ln(x))', 'x', ['x > 0']],
		['ln(x)-ln(x)', '0', ['x > 0']],
		['1/(1/x)', 'x', ['x ≠ 0']],
		['x/x+ln(x)', 'ln(x)+1', []],
		['x^2/x', 'x^2/x', []],
		['ln(e^x)', 'x', []],
		['sqrt(x^2)', 'abs(x)', []],
		['(x+1)/(x+1)+y/y', '2', ['x ≠ -1', 'y ≠ 0']]
	])('%s → %s perd %j', (before, after, expected) => {
		expect(loss(before, after)).toEqual(expected);
	});

	it('une condition qui ne s’écrit pas : null', () => {
		expect(loss('tan(x)/tan(x)', '1')).toBeNull();
	});
});
