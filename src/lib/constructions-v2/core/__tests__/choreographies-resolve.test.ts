/**
 * Tests for `resolveDecorators` (P0.3 spec).
 *
 * Validates strict resolution of DSL decorator suffixes into a
 * (contrainte, methode, visibilite) triple, with explicit error messages
 * on conflicts and unknown identifiers.
 */

import { describe, it, expect } from 'vitest';
import {
	resolveDecorators,
	lookupVoie,
	DecoratorResolveError,
	DEFAULT_CONTRAINTE,
	DEFAULT_VISIBILITE
} from '../choreographies/resolve';

describe('resolveDecorators — nominal cases', () => {
	it('empty decorators → defaults', () => {
		const r = resolveDecorators([], 'mediatrice');
		expect(r.contrainte).toBe(DEFAULT_CONTRAINTE);
		expect(r.visibilite).toBe(DEFAULT_VISIBILITE);
		expect(r.methode).toBeNull();
	});

	it('single constraint @euclide', () => {
		const r = resolveDecorators(['euclide'], 'mediatrice');
		expect(r.contrainte).toBe('euclide');
		expect(r.visibilite).toBe(DEFAULT_VISIBILITE);
		expect(r.methode).toBeNull();
	});

	it('constraint + method', () => {
		const r = resolveDecorators(['euclide', 'arcs_egaux'], 'mediatrice');
		expect(r).toEqual({ contrainte: 'euclide', methode: 'arcs_egaux', visibilite: 'squelette' });
	});

	it('constraint + method + visibility', () => {
		const r = resolveDecorators(['euclide', 'cercles_rayon_ab', 'complet'], 'mediatrice');
		expect(r).toEqual({
			contrainte: 'euclide',
			methode: 'cercles_rayon_ab',
			visibilite: 'complet'
		});
	});

	it('only visibility (constraint stays direct)', () => {
		const r = resolveDecorators(['epure'], 'mediatrice');
		expect(r.contrainte).toBe('direct');
		expect(r.visibilite).toBe('epure');
		expect(r.methode).toBeNull();
	});

	it('order independent : same output for permuted lists', () => {
		const a = resolveDecorators(['euclide', 'arcs_egaux', 'epure'], 'mediatrice');
		const b = resolveDecorators(['arcs_egaux', 'epure', 'euclide'], 'mediatrice');
		const c = resolveDecorators(['epure', 'euclide', 'arcs_egaux'], 'mediatrice');
		expect(a).toEqual(b);
		expect(b).toEqual(c);
	});

	it('cercle_circonscrit @euclide → method defaults to mediatrices voie', () => {
		const r = resolveDecorators(['euclide'], 'cercle_circonscrit');
		expect(r.contrainte).toBe('euclide');
		expect(r.methode).toBeNull();
	});

	it('bissectrice @euclide @arc_milieu', () => {
		const r = resolveDecorators(['euclide', 'arc_milieu'], 'bissectrice');
		expect(r).toEqual({ contrainte: 'euclide', methode: 'arc_milieu', visibilite: 'squelette' });
	});

	it('parallele @euclide @double_perpendiculaire', () => {
		const r = resolveDecorators(['euclide', 'double_perpendiculaire'], 'parallele');
		expect(r).toEqual({
			contrainte: 'euclide',
			methode: 'double_perpendiculaire',
			visibilite: 'squelette'
		});
	});
});

describe('resolveDecorators — error cases', () => {
	it('two constraints → error mentioning both', () => {
		expect(() => resolveDecorators(['euclide', 'mesure'], 'mediatrice')).toThrow(
			/mutuellement exclusives/i
		);
		try {
			resolveDecorators(['euclide', 'mesure'], 'mediatrice');
		} catch (e) {
			if (e instanceof DecoratorResolveError) {
				expect(e.message).toContain('@euclide');
				expect(e.message).toContain('@mesure');
			}
		}
	});

	it('two visibilities → error', () => {
		expect(() => resolveDecorators(['epure', 'squelette'], 'mediatrice')).toThrow(
			/mutuellement exclusives/i
		);
	});

	it('unknown decorator on a choreographed builtin → error with hint', () => {
		// 'inconnu' is not a constraint, not a visibility, and not a method for mediatrice/euclide.
		// Currently it'd be treated as a "method" candidate, then rejected during validation.
		expect(() => resolveDecorators(['euclide', 'inconnu'], 'mediatrice')).toThrow(
			/@inconnu.*méthode.*disponible/i
		);
	});

	it('method that exists on another builtin but not this one → error', () => {
		expect(() => resolveDecorators(['euclide', 'parallelogramme'], 'mediatrice')).toThrow(
			/@parallelogramme.*méthode.*disponible/i
		);
	});

	it('two methods → error mentioning both', () => {
		expect(() => resolveDecorators(['arcs_egaux', 'arc_milieu'], 'bissectrice')).toThrow(
			/Deux méthodes/i
		);
	});

	it('method on a non-choreographed builtin → error', () => {
		expect(() => resolveDecorators(['inconnu'], 'pas_un_builtin')).toThrow(
			/n’a pas de chorégraphie/i
		);
	});

	it('constraint not declared for builtin → error', () => {
		// `equerre` has no voies for mediatrice in V1.
		expect(() => resolveDecorators(['equerre'], 'mediatrice')).toThrow(/non disponible/i);
	});

	it('constraint @mesure not declared for cercle_circonscrit → error', () => {
		expect(() => resolveDecorators(['mesure'], 'cercle_circonscrit')).toThrow(/non disponible/i);
	});
});

describe('resolveDecorators — direct mode (no constraint chosen explicitly)', () => {
	it('@direct explicitly preserves direct semantics', () => {
		const r = resolveDecorators(['direct'], 'mediatrice');
		expect(r.contrainte).toBe('direct');
	});

	it('@direct with @squelette', () => {
		const r = resolveDecorators(['direct', 'squelette'], 'mediatrice');
		expect(r).toEqual({ contrainte: 'direct', methode: null, visibilite: 'squelette' });
	});
});

describe('lookupVoie', () => {
	it('returns null for @direct', () => {
		const triple = resolveDecorators(['direct'], 'mediatrice');
		expect(lookupVoie(triple, 'mediatrice')).toBeNull();
	});

	it('returns the default voie when methode is null', () => {
		const triple = resolveDecorators(['euclide'], 'mediatrice');
		const voie = lookupVoie(triple, 'mediatrice');
		expect(voie).not.toBeNull();
		expect(voie!.id).toBe('arcs_egaux'); // declared as defaut: true
	});

	it('returns the named voie', () => {
		const triple = resolveDecorators(['euclide', 'cercles_rayon_ab'], 'mediatrice');
		const voie = lookupVoie(triple, 'mediatrice');
		expect(voie).not.toBeNull();
		expect(voie!.id).toBe('cercles_rayon_ab');
	});

	it('returns null for unknown builtin', () => {
		// Type-bypass for testing.
		const fakeTriple = {
			contrainte: 'euclide' as const,
			methode: null,
			visibilite: 'squelette' as const
		};
		expect(lookupVoie(fakeTriple, 'unknown_builtin')).toBeNull();
	});
});
