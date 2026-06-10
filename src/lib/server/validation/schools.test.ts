/**
 * UAI / RNE + Annuaire validation tests
 */

import { describe, it, expect } from 'vitest';
import {
	uaiSchema,
	optionalUaiSchema,
	schoolUpsertSchema,
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

describe('schoolUpsertSchema', () => {
	const valid = {
		name: 'Collège Jean Moulin',
		city: 'Marseille',
		country: 'France',
		address: '26 rue Fortuné Chaillan',
		logo_url: 'https://example.com/logo.png',
		uai: '0132407W'
	};

	it('accepts a fully valid school and normalizes', () => {
		const result = schoolUpsertSchema.safeParse({ ...valid, uai: '0132407w', name: '  Lycée  ' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe('Lycée');
			expect(result.data.uai).toBe('0132407W');
		}
	});

	it.each([
		['name', ''],
		['name', '   '],
		['city', ''],
		['country', '']
	])('rejects empty required field %s="%s"', (field, value) => {
		expect(schoolUpsertSchema.safeParse({ ...valid, [field]: value }).success).toBe(false);
	});

	it('rejects a name over 200 chars', () => {
		expect(schoolUpsertSchema.safeParse({ ...valid, name: 'x'.repeat(201) }).success).toBe(false);
	});

	it('maps empty address and logo to null', () => {
		const result = schoolUpsertSchema.safeParse({ ...valid, address: '  ', logo_url: '' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.address).toBeNull();
			expect(result.data.logo_url).toBeNull();
		}
	});

	it('rejects an invalid logo URL', () => {
		expect(schoolUpsertSchema.safeParse({ ...valid, logo_url: 'not-a-url' }).success).toBe(false);
	});

	it('rejects an invalid UAI inside the upsert', () => {
		expect(schoolUpsertSchema.safeParse({ ...valid, uai: '123' }).success).toBe(false);
	});

	it('tolerates missing optional fields (bulk import without uai)', () => {
		const result = schoolUpsertSchema.safeParse({
			name: 'École X',
			city: 'Lyon',
			country: 'France',
			uai: ''
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.address).toBeNull();
			expect(result.data.logo_url).toBeNull();
			expect(result.data.uai).toBeNull();
		}
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
