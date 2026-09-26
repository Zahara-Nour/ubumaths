/**
 * Exclusions arithmétiques des tirages : m(x), d(x), cd(x)
 * ========================================================
 *
 * Reprises de TinyMath (`extern/new-tinymath/packages/tinycas/src/math/transform.ts`),
 * où elles servent dans ~140 anciennes questions :
 * - `m(x)`  : exclut les MULTIPLES de x            (e mod x = 0) ;
 * - `d(x)`  : exclut les DIVISEURS de x            (x mod e = 0) ;
 * - `cd(x)` : exclut les nombres ayant un DIVISEUR COMMUN avec x (pgcd ≠ 1),
 *             autrement dit ne garde que les nombres premiers avec x.
 * L'opérande est un nombre ou une variable, entre parenthèses (un nom nu comme
 * `m2` serait ambigu avec une variable).
 */

import { describe, it, expect } from 'vitest';
import { parseRandomSpec } from '../../../parameterization/parser/random-parser';
import { generateRandomNumber } from '../../../parameterization/resolver/random-generator';
import type { RandomSpec, ResolvedVariable } from '../../../types';

// ============================================================================
// HELPERS
// ============================================================================

function spec(token: string): RandomSpec {
	const parsed = parseRandomSpec(token);
	if (!parsed) throw new Error(`spec non reconnue : ${token}`);
	return parsed;
}

function variables(values: Record<string, number>): ResolvedVariable[] {
	return Object.entries(values).map(([name, value]) => ({ name, value: String(value) }));
}

/** 300 tirages (graines distinctes) : l'ensemble des valeurs obtenues */
function draws(token: string, vars: ResolvedVariable[] = []): Set<number> {
	const parsed = spec(token);
	const values = new Set<number>();
	for (let seed = 1; seed <= 300; seed++) {
		values.add(Number(generateRandomNumber(parsed, vars, seed)));
	}
	return values;
}

function gcd(a: number, b: number): number {
	return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

// ============================================================================
// ANALYSE DE LA SYNTAXE
// ============================================================================

describe('parseRandomSpec — exclusions arithmétiques', () => {
	it.each([
		['{{2..9!m(2)}}', { type: 'multiple-of', of: { type: 'number', value: 2 } }],
		['{{2..9!d(a)}}', { type: 'divisor-of', of: { type: 'variable', name: 'a' } }],
		['{{2..19!cd(a)}}', { type: 'common-divisor-with', of: { type: 'variable', name: 'a' } }],
		['{{2..19!cd({{a}})}}', { type: 'common-divisor-with', of: { type: 'variable', name: 'a' } }]
	])('%s', (token, exclusion) => {
		expect(spec(token)).toMatchObject({ exclusions: [exclusion] });
	});

	it('se combine avec des exclusions de valeurs', () => {
		expect(spec('{{2..9!a,cd(b),m(3)}}')).toMatchObject({
			exclusions: [
				{ type: 'value', value: { type: 'variable', name: 'a' } },
				{ type: 'common-divisor-with', of: { type: 'variable', name: 'b' } },
				{ type: 'multiple-of', of: { type: 'number', value: 3 } }
			]
		});
	});

	it('une variable nommée comme une fonction reste une variable', () => {
		expect(spec('{{2..9!m}}')).toMatchObject({
			exclusions: [{ type: 'value', value: { type: 'variable', name: 'm' } }]
		});
	});
});

// ============================================================================
// TIRAGE
// ============================================================================

describe('generateRandomNumber — exclusions arithmétiques', () => {
	it('m(2) : jamais pair', () => {
		const values = draws('{{1..20!m(2)}}');
		expect(values.size).toBeGreaterThan(5);
		expect([...values].every((v) => v % 2 !== 0)).toBe(true);
	});

	it('d(a) : jamais un diviseur de a (a = 12)', () => {
		const values = draws('{{1..12!d(a)}}', variables({ a: 12 }));
		expect(values.size).toBeGreaterThan(2);
		expect([...values].every((v) => 12 % v !== 0)).toBe(true);
		expect([...values].sort((x, y) => x - y)).toEqual([5, 7, 8, 9, 10, 11]);
	});

	it('cd(a) : toujours premier avec a (a = 6)', () => {
		const values = draws('{{2..19!cd(a)}}', variables({ a: 6 }));
		expect([...values].sort((x, y) => x - y)).toEqual([5, 7, 11, 13, 17, 19]);
	});

	it('cd sur des relatifs : pgcd des valeurs absolues', () => {
		const values = draws('{{1..9;±!cd(a)}}', variables({ a: 4 }));
		expect(values.size).toBeGreaterThan(3);
		expect([...values].every((v) => gcd(v, 4) === 1)).toBe(true);
		expect([...values].some((v) => v < 0)).toBe(true);
	});

	it('combinaison : ni a, ni un nombre non premier avec b', () => {
		const values = draws('{{2..9!a,cd(b)}}', variables({ a: 5, b: 2 }));
		expect([...values].sort((x, y) => x - y)).toEqual([3, 7, 9]);
	});

	it('tout est exclu : erreur explicite, pas de boucle infinie', () => {
		expect(() => generateRandomNumber(spec('{{2..4!m(2),m(3)}}'), [], 1)).toThrow();
	});
});
