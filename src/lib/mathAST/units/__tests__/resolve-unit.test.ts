/**
 * `resolveUnit` — cas repris de `questions/units/__tests__/operations.test.ts`
 * quand `questions/units/definitions.ts`, qui ne faisait que la réexporter,
 * a été supprimé (code mort, lot D des grandeurs). Ces cas (préfixes rares,
 * unités spéciales, pièges `cd`/`mol`, alias) n'étaient testés que là-bas.
 */

import { describe, test, expect } from 'vitest';
import { resolveUnit, SPECIAL_UNITS } from '../definitions';

describe('resolveUnit - unités préfixées', () => {
	test.each([
		['km', 1000, 'm'],
		['cm', 0.01, 'm'],
		['mm', 0.001, 'm'],
		['μm', 1e-6, 'm'],
		['nm', 1e-9, 'm'],
		['Mm', 1e6, 'm'],
		['Gm', 1e9, 'm'],
		['kg', 1000, 'g'],
		['mg', 0.001, 'g'],
		['μg', 1e-6, 'g']
	])('%s = %s %s', (symbol, coefficient, baseSymbol) => {
		const result = resolveUnit(symbol);
		expect(result?.coefficient).toBe(coefficient);
		expect(result?.baseSymbol).toBe(baseSymbol);
	});
});

describe('resolveUnit - unités spéciales', () => {
	test.each(['h', 'min', 'ms', '€', '$', '°', 't', 'q'])('%s', (symbol) => {
		expect(resolveUnit(symbol)).toEqual(SPECIAL_UNITS.get(symbol));
	});

	test('coefficients des unités spéciales', () => {
		expect(resolveUnit('h')?.coefficient).toBe(3600);
		expect(resolveUnit('min')?.coefficient).toBe(60);
		expect(resolveUnit('ms')?.coefficient).toBe(0.001);
		expect(resolveUnit('t')?.coefficient).toBe(1000000);
		expect(resolveUnit('q')?.coefficient).toBe(100000);
		expect(resolveUnit('°')?.coefficient).toBe(Math.PI / 180);
		expect(resolveUnit('€')?.dimension).toBe('currency');
	});

	test('le radian est une unité de base', () => {
		expect(resolveUnit('rad')).toEqual({
			symbol: 'rad',
			name: 'radian',
			baseSymbol: 'rad',
			coefficient: 1,
			dimension: 'angle'
		});
	});

	test('le litre porte la signature d’un volume', () => {
		expect(resolveUnit('L')).toEqual({
			symbol: 'L',
			name: 'litre',
			baseSymbol: 'm',
			components: new Map([['m', 3]]),
			coefficient: 0.001,
			dimension: 'volume'
		});
	});
});

describe('resolveUnit - pièges de lecture', () => {
	test('cd est la candela, pas centi + d', () => {
		expect(resolveUnit('cd')?.dimension).toBe('luminous_intensity');
	});

	test('mol est la mole, pas milli + ol', () => {
		expect(resolveUnit('mol')?.dimension).toBe('amount');
	});

	test('symbole inconnu → null', () => {
		expect(resolveUnit('xyz')).toBeNull();
		expect(resolveUnit('qwerty')).toBeNull();
	});
});

describe('resolveUnit - alias', () => {
	test('euro et euros → €', () => {
		expect(resolveUnit('euro')).toEqual(SPECIAL_UNITS.get('€'));
		expect(resolveUnit('euros')).toEqual(SPECIAL_UNITS.get('€'));
	});

	test('litre et l → L', () => {
		expect(resolveUnit('litre')?.symbol).toBe('L');
		expect(resolveUnit('l')?.symbol).toBe('L');
	});
});
