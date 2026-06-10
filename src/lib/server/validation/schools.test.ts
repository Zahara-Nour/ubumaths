/**
 * UAI / RNE + Annuaire validation tests
 */

import { describe, it, expect } from 'vitest';
import {
	uaiSchema,
	optionalUaiSchema,
	annuaireSearchQuerySchema,
	annuaireResponseSchema
} from './schools';

describe('uaiSchema (strict)', () => {
	it('accepts a valid UAI', () => {
		const result = uaiSchema.safeParse('0750001H');
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe('0750001H');
	});

	it('normalizes a lowercase letter to uppercase', () => {
		const result = uaiSchema.safeParse('0132407w');
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe('0132407W');
	});

	it('trims surrounding whitespace', () => {
		const result = uaiSchema.safeParse('  0750001H  ');
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe('0750001H');
	});

	it.each([
		['', 'empty'],
		['12345678', 'no trailing letter'],
		['075001H', '6 digits'],
		['07500012H', '8 digits + letter'],
		['0750001HH', 'two letters'],
		['A750001H', 'leading letter'],
		['0750-01H', 'special char']
	])('rejects "%s" (%s)', (value) => {
		expect(uaiSchema.safeParse(value).success).toBe(false);
	});
});

describe('optionalUaiSchema', () => {
	it('returns null for an empty string', () => {
		const result = optionalUaiSchema.safeParse('');
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBeNull();
	});

	it('returns null for whitespace only', () => {
		const result = optionalUaiSchema.safeParse('   ');
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBeNull();
	});

	it('returns the normalized UAI for valid input', () => {
		const result = optionalUaiSchema.safeParse('0132407w');
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe('0132407W');
	});

	it('rejects a malformed non-empty value', () => {
		expect(optionalUaiSchema.safeParse('not-a-uai').success).toBe(false);
	});
});

describe('annuaireSearchQuerySchema', () => {
	it('accepts a 2+ char query', () => {
		expect(annuaireSearchQuerySchema.safeParse({ q: 'jean moulin' }).success).toBe(true);
	});

	it('rejects a 1-char query', () => {
		expect(annuaireSearchQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
	});

	it('rejects an over-long query', () => {
		expect(annuaireSearchQuerySchema.safeParse({ q: 'x'.repeat(101) }).success).toBe(false);
	});
});

describe('annuaireResponseSchema', () => {
	it('parses a realistic Opendatasoft envelope', () => {
		const payload = {
			total_count: 1,
			results: [
				{
					identifiant_de_l_etablissement: '0132407W',
					nom_etablissement: 'Collège Jean Moulin',
					type_etablissement: 'Collège',
					nom_commune: 'Marseille',
					code_postal: '13015',
					adresse_1: '26 rue Fortuné Chaillan',
					libelle_academie: 'Aix-Marseille'
				}
			]
		};
		expect(annuaireResponseSchema.safeParse(payload).success).toBe(true);
	});

	it('tolerates null fields in a record', () => {
		const payload = {
			total_count: 1,
			results: [
				{
					identifiant_de_l_etablissement: '0132407W',
					nom_etablissement: null,
					type_etablissement: null,
					nom_commune: null,
					code_postal: null,
					adresse_1: null,
					libelle_academie: null
				}
			]
		};
		expect(annuaireResponseSchema.safeParse(payload).success).toBe(true);
	});
});
