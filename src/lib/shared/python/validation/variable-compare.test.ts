/**
 * Tests for the pure JS variable comparison engine used by the
 * `variable_check` validation strategy.
 *
 * Each `it()` references a behavior tagged V1..Vn in the Phase 0 spec
 * (see docs/wip/python-variable-check-progress.md).
 */

import { describe, expect, it } from 'vitest';
import { compareValue } from './variable-compare';

describe('compareValue — nombres (scalaires)', () => {
	it('V1 — int égal int', () => {
		const r = compareValue(5, 5);
		expect(r.passed).toBe(true);
		expect(r.diff).toBeUndefined();
	});

	it('V2 — float 5.0 vs int 5 (tolérance par défaut)', () => {
		expect(compareValue(5, 5.0).passed).toBe(true);
	});

	it('V3 — 0.1 + 0.2 vs 0.3 (tolérance abs par défaut)', () => {
		expect(compareValue(0.3, 0.1 + 0.2).passed).toBe(true);
	});

	it('V4 — 3.14 vs 2.71 échec avec diff', () => {
		const r = compareValue(3.14, 2.71);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/attendu 3\.14, obtenu 2\.71/);
	});

	it('V5 — NaN vs NaN passe (cohérent avec output-compare)', () => {
		expect(compareValue(Number.NaN, Number.NaN).passed).toBe(true);
	});

	it('V5 — NaN vs 0 échec', () => {
		expect(compareValue(Number.NaN, 0).passed).toBe(false);
	});

	it('V6 — +inf vs +inf passe', () => {
		expect(compareValue(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY).passed).toBe(true);
	});

	it('V6 — +inf vs -inf échec', () => {
		expect(compareValue(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY).passed).toBe(false);
	});

	it('V — tolérance personnalisée (eps_abs très large)', () => {
		expect(compareValue(10, 12, { eps_abs: 5 }).passed).toBe(true);
	});

	it('V — tolérance personnalisée (eps_rel)', () => {
		expect(compareValue(1000, 1001, { eps_rel: 1e-2 }).passed).toBe(true);
	});
});

describe('compareValue — strings', () => {
	it('V7 — strings identiques', () => {
		expect(compareValue('hello', 'hello').passed).toBe(true);
	});

	it('V7 — casse différente échec (pas de case_insensitive)', () => {
		const r = compareValue('Hello', 'hello');
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/attendu/i);
	});

	it('V7 — string vide vs string vide passe', () => {
		expect(compareValue('', '').passed).toBe(true);
	});
});

describe('compareValue — booléens', () => {
	it('V8 — True vs True', () => {
		expect(compareValue(true, true).passed).toBe(true);
	});

	it('V8 — False vs False', () => {
		expect(compareValue(false, false).passed).toBe(true);
	});

	it('V8 — True vs 1 échec (types stricts)', () => {
		const r = compareValue(true, 1);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/[Tt]ype/);
	});

	it('V8 — 1 vs True échec', () => {
		expect(compareValue(1, true).passed).toBe(false);
	});
});

describe('compareValue — null (None Python)', () => {
	it('V9 — null vs null', () => {
		expect(compareValue(null, null).passed).toBe(true);
	});

	it('V9 — null vs 0 échec', () => {
		expect(compareValue(null, 0).passed).toBe(false);
	});

	it('V9 — null vs "" échec', () => {
		expect(compareValue(null, '').passed).toBe(false);
	});

	it('V9 — null vs undefined échec (strict)', () => {
		expect(compareValue(null, undefined).passed).toBe(false);
	});
});

describe('compareValue — listes (Array)', () => {
	it('V10 — listes égales', () => {
		expect(compareValue([1, 2, 3], [1, 2, 3]).passed).toBe(true);
	});

	it('V11 — tolérance numérique appliquée aux feuilles', () => {
		expect(compareValue([1, 2], [1.0, 2.0]).passed).toBe(true);
	});

	it('V12 — longueurs différentes', () => {
		const r = compareValue([1, 2, 3], [1, 2]);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/[Ll]ongueur.*attendu 3.*obtenu 2/);
	});

	it('V13 — élément différent', () => {
		const r = compareValue([1, 2, 3], [1, 2, 4]);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/index 2.*attendu 3.*obtenu 4/);
	});

	it('V14 — listes imbriquées égales', () => {
		expect(
			compareValue(
				[
					[1, 2],
					[3, 4]
				],
				[
					[1, 2],
					[3, 4]
				]
			).passed
		).toBe(true);
	});

	it('V14 — listes imbriquées avec diff (feuille)', () => {
		const r = compareValue(
			[
				[1, 2],
				[3, 4]
			],
			[
				[1, 2],
				[3, 5]
			]
		);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/index 1/);
	});

	it('V — liste vide vs liste vide passe', () => {
		expect(compareValue([], []).passed).toBe(true);
	});
});

describe('compareValue — dicts (Object)', () => {
	it('V16 — dicts égaux', () => {
		expect(compareValue({ a: 1, b: 2 }, { a: 1, b: 2 }).passed).toBe(true);
	});

	it('V16 — ordre clés indifférent', () => {
		expect(compareValue({ a: 1, b: 2 }, { b: 2, a: 1 }).passed).toBe(true);
	});

	it('V17 — clé manquante côté actual', () => {
		const r = compareValue({ a: 1, b: 2 }, { a: 1 });
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/manquante.*'b'/i);
	});

	it('V18 — clé en trop côté actual', () => {
		const r = compareValue({ a: 1 }, { a: 1, b: 2 });
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/en trop.*'b'/i);
	});

	it('V19 — valeur différente pour une clé', () => {
		const r = compareValue({ a: 1 }, { a: 2 });
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/clé 'a'.*attendu 1.*obtenu 2/);
	});

	it('V — dict vide vs dict vide passe', () => {
		expect(compareValue({}, {}).passed).toBe(true);
	});

	it('V — dict imbriqué passe', () => {
		expect(compareValue({ x: { y: 1 } }, { x: { y: 1 } }).passed).toBe(true);
	});

	it('V — dict imbriqué diff feuille', () => {
		const r = compareValue({ x: { y: 1 } }, { x: { y: 2 } });
		expect(r.passed).toBe(false);
	});
});

describe('compareValue — types incompatibles', () => {
	it('V21 — string vs number', () => {
		const r = compareValue('5', 5);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/[Tt]ype.*str.*int/);
	});

	it('V21 — number vs string', () => {
		const r = compareValue(5, '5');
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/[Tt]ype.*int.*str/);
	});

	it('V — list vs dict', () => {
		const r = compareValue([1, 2], { 0: 1, 1: 2 });
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/[Tt]ype/);
	});

	it('V — dict vs list', () => {
		const r = compareValue({ a: 1 }, [1]);
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/[Tt]ype/);
	});

	it('V — list vs Set (actual = Set, non supporté)', () => {
		const r = compareValue([1, 2, 3], new Set([1, 2, 3]));
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/[Tt]ype.*set/i);
	});

	it('V22 — type non sérialisable (Map)', () => {
		const r = compareValue({ a: 1 }, new Map([['a', 1]]));
		expect(r.passed).toBe(false);
		expect(r.diff).toMatch(/[Tt]ype/);
	});
});
