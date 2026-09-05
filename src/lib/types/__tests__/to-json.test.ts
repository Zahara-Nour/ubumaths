import { describe, expect, it } from 'vitest';
import { toJson } from '../database-helpers';

describe('toJson', () => {
	it('conserve un objet métier sérialisable', () => {
		expect(toJson({ type: 'numeric', value: 42, options: { tolerance: 0.1 } })).toEqual({
			type: 'numeric',
			value: 42,
			options: { tolerance: 0.1 }
		});
	});

	it('supprime les champs undefined, comme le ferait la couche HTTP', () => {
		expect(toJson({ a: 1, b: undefined })).toEqual({ a: 1 });
	});

	it('rend null pour une valeur absente', () => {
		expect(toJson(undefined)).toBeNull();
		expect(toJson(null)).toBeNull();
	});

	it('échoue ici plutôt qu’au bord du réseau sur une structure cyclique', () => {
		const cyclique: Record<string, unknown> = {};
		cyclique.soi = cyclique;

		expect(() => toJson(cyclique)).toThrow();
	});
});
