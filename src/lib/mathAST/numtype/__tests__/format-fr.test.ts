/**
 * Tests for French Type Descriptions (format-fr.ts)
 *
 * Tests the French pedagogical feedback functions.
 */

import { describe, it, expect } from 'vitest';
import {
	describeType,
	describeTypeDetailed,
	getTypeName,
	getTypeNameWithArticle,
	describeTypeRelation,
	getTypeMismatchMessage,
	getTypeHint,
	getTypeExamples,
	formatTypeExamples
} from '../format-fr';
import type { MathType, NumericType } from '../types';

// =============================================================================
// describeType Tests
// =============================================================================

describe('describeType', () => {
	it('should describe integer type', () => {
		const type: MathType = { base: 'integer' };
		expect(describeType(type)).toBe('un nombre entier');
	});

	it('should describe rational type', () => {
		const type: MathType = { base: 'rational' };
		expect(describeType(type)).toBe('un nombre rationnel');
	});

	it('should describe irrational_algebraic type', () => {
		const type: MathType = { base: 'irrational_algebraic' };
		expect(describeType(type)).toBe('un nombre algébrique irrationnel');
	});

	it('should describe algebraic type', () => {
		const type: MathType = { base: 'algebraic' };
		expect(describeType(type)).toBe('un nombre algébrique');
	});

	it('should describe transcendental type', () => {
		const type: MathType = { base: 'transcendental' };
		expect(describeType(type)).toBe('un nombre transcendant');
	});

	it('should describe real type', () => {
		const type: MathType = { base: 'real' };
		expect(describeType(type)).toBe('un nombre réel');
	});

	it('should describe complex type', () => {
		const type: MathType = { base: 'complex' };
		expect(describeType(type)).toBe('un nombre complexe');
	});

	it('should describe unknown type', () => {
		const type: MathType = { base: 'unknown' };
		expect(describeType(type)).toBe('un nombre de type inconnu');
	});

	it('should include positive sign suffix', () => {
		const type: MathType = { base: 'integer', sign: 'positive' };
		expect(describeType(type)).toBe('un nombre entier positif');
	});

	it('should include negative sign suffix', () => {
		const type: MathType = { base: 'integer', sign: 'negative' };
		expect(describeType(type)).toBe('un nombre entier négatif');
	});

	it('should include zero sign suffix', () => {
		const type: MathType = { base: 'integer', sign: 'zero' };
		expect(describeType(type)).toBe('un nombre entier nul');
	});

	it('should include nonzero sign suffix', () => {
		const type: MathType = { base: 'integer', sign: 'nonzero' };
		expect(describeType(type)).toBe('un nombre entier non nul');
	});

	it('should include infinite suffix', () => {
		const type: MathType = { base: 'real', finite: false };
		expect(describeType(type)).toBe('un nombre réel (infini)');
	});

	it('should combine sign and infinite suffixes', () => {
		const type: MathType = { base: 'real', sign: 'positive', finite: false };
		expect(describeType(type)).toBe('un nombre réel positif (infini)');
	});
});

// =============================================================================
// describeTypeDetailed Tests
// =============================================================================

describe('describeTypeDetailed', () => {
	it('should return full description for integer', () => {
		const type: MathType = { base: 'integer' };
		const desc = describeTypeDetailed(type);

		expect(desc.id).toBe('integer');
		expect(desc.nameFr).toBe('Entier');
		expect(desc.descriptionFr).toContain('nombre entier');
		expect(desc.examples).toContain('42');
		expect(desc.parents).toContain('rational');
		expect(desc.children).toEqual([]);
	});

	it('should return full description for rational', () => {
		const type: MathType = { base: 'rational' };
		const desc = describeTypeDetailed(type);

		expect(desc.id).toBe('rational');
		expect(desc.nameFr).toBe('Rationnel');
		expect(desc.examples).toContain('1/2');
		expect(desc.children).toContain('integer');
	});

	it('should return full description for complex', () => {
		const type: MathType = { base: 'complex' };
		const desc = describeTypeDetailed(type);

		expect(desc.id).toBe('complex');
		expect(desc.nameFr).toBe('Complexe');
		expect(desc.parents).toEqual([]);
		expect(desc.children).toContain('real');
	});

	it('should return full description for transcendental', () => {
		const type: MathType = { base: 'transcendental' };
		const desc = describeTypeDetailed(type);

		expect(desc.id).toBe('transcendental');
		expect(desc.nameFr).toBe('Transcendant');
		expect(desc.examples).toContain('π');
		expect(desc.examples).toContain('e');
	});
});

// =============================================================================
// getTypeName Tests
// =============================================================================

describe('getTypeName', () => {
	it('should return French name for all types', () => {
		const names: Record<NumericType, string> = {
			integer: 'Entier',
			rational: 'Rationnel',
			irrational_algebraic: 'Algébrique irrationnel',
			algebraic: 'Algébrique',
			transcendental: 'Transcendant',
			real: 'Réel',
			complex: 'Complexe',
			unknown: 'Inconnu'
		};

		for (const [type, expected] of Object.entries(names)) {
			expect(getTypeName(type as NumericType)).toBe(expected);
		}
	});
});

// =============================================================================
// getTypeNameWithArticle Tests
// =============================================================================

describe('getTypeNameWithArticle', () => {
	it('should return type name with article for all types', () => {
		const namesWithArticle: Record<NumericType, string> = {
			integer: 'un entier',
			rational: 'un rationnel',
			irrational_algebraic: 'un algébrique irrationnel',
			algebraic: 'un algébrique',
			transcendental: 'un transcendant',
			real: 'un réel',
			complex: 'un complexe',
			unknown: 'un type inconnu'
		};

		for (const [type, expected] of Object.entries(namesWithArticle)) {
			expect(getTypeNameWithArticle(type as NumericType)).toBe(expected);
		}
	});
});

// =============================================================================
// describeTypeRelation Tests
// =============================================================================

describe('describeTypeRelation', () => {
	it('should describe same types', () => {
		expect(describeTypeRelation('integer', 'integer')).toBe("C'est bien un entier.");
	});

	it('should describe subtype relationship', () => {
		const result = describeTypeRelation('integer', 'rational');
		expect(result).toContain('cas particulier');
		expect(result).toContain('entier');
		expect(result).toContain('rationnel');
	});

	it('should describe supertype relationship', () => {
		const result = describeTypeRelation('rational', 'integer');
		expect(result).toContain('cas particulier');
		expect(result).toContain("n'est pas vrai");
	});

	it('should describe incompatible types', () => {
		const result = describeTypeRelation('transcendental', 'integer');
		expect(result).toContain("n'est pas");
	});
});

// =============================================================================
// getTypeMismatchMessage Tests
// =============================================================================

describe('getTypeMismatchMessage', () => {
	it('should generate mismatch message', () => {
		const actual: MathType = { base: 'transcendental' };
		const result = getTypeMismatchMessage(actual, 'integer');

		expect(result).toContain('Attendu');
		expect(result).toContain('nombre entier');
		expect(result).toContain('Obtenu');
		expect(result).toContain('nombre transcendant');
		expect(result).toContain('π');
	});

	it('should include sign in message', () => {
		const actual: MathType = { base: 'rational', sign: 'negative' };
		const result = getTypeMismatchMessage(actual, 'integer');

		expect(result).toContain('négatif');
	});

	it('should handle unknown type', () => {
		const actual: MathType = { base: 'unknown' };
		const result = getTypeMismatchMessage(actual, 'integer');

		expect(result).toContain('Attendu');
		expect(result).toContain('Obtenu');
		// unknown has no examples, so no "(...)" part
		expect(result).not.toContain('...');
	});
});

// =============================================================================
// getTypeHint Tests
// =============================================================================

describe('getTypeHint', () => {
	it('should give hint for rational vs integer', () => {
		const hint = getTypeHint('rational', 'integer');
		expect(hint).toContain('fraction');
		expect(hint).toContain('1/2');
	});

	it('should give hint for irrational_algebraic vs integer', () => {
		const hint = getTypeHint('irrational_algebraic', 'integer');
		expect(hint).toContain('√2');
		expect(hint).toContain('irrationnel');
	});

	it('should give hint for transcendental vs integer', () => {
		const hint = getTypeHint('transcendental', 'integer');
		expect(hint).toContain('π');
		expect(hint).toContain('e');
	});

	it('should give hint for real vs integer', () => {
		const hint = getTypeHint('real', 'integer');
		expect(hint).toContain('décimal');
	});

	it('should give hint for irrational_algebraic vs rational', () => {
		const hint = getTypeHint('irrational_algebraic', 'rational');
		expect(hint).toContain('√2');
		expect(hint).toContain('fraction');
	});

	it('should give hint for transcendental vs rational', () => {
		const hint = getTypeHint('transcendental', 'rational');
		expect(hint).toContain('π');
		expect(hint).toContain('fraction');
	});

	it('should give hint for transcendental vs algebraic', () => {
		const hint = getTypeHint('transcendental', 'algebraic');
		expect(hint).toContain('polynomiale');
	});

	it('should give hint for complex vs real', () => {
		const hint = getTypeHint('complex', 'real');
		expect(hint).toContain('complexe');
		expect(hint).toContain('réel');
	});

	it('should fallback to relation description', () => {
		const hint = getTypeHint('integer', 'complex');
		expect(hint).toContain('cas particulier');
	});
});

// =============================================================================
// getTypeExamples Tests
// =============================================================================

describe('getTypeExamples', () => {
	it('should return examples for integer', () => {
		const examples = getTypeExamples('integer');
		expect(examples).toContain('0');
		expect(examples).toContain('1');
		expect(examples).toContain('42');
	});

	it('should return examples for rational', () => {
		const examples = getTypeExamples('rational');
		expect(examples).toContain('1/2');
	});

	it('should return examples for transcendental', () => {
		const examples = getTypeExamples('transcendental');
		expect(examples).toContain('π');
		expect(examples).toContain('e');
	});

	it('should return empty array for unknown', () => {
		const examples = getTypeExamples('unknown');
		expect(examples).toEqual([]);
	});
});

// =============================================================================
// formatTypeExamples Tests
// =============================================================================

describe('formatTypeExamples', () => {
	it('should format examples with default limit', () => {
		const result = formatTypeExamples('integer');
		expect(result).toContain('Exemples');
		expect(result).toContain('0');
		expect(result).toContain('1');
	});

	it('should respect maxExamples parameter', () => {
		const result = formatTypeExamples('integer', 2);
		expect(result).toContain('Exemples');
		// Should have at most 2 examples
		const commas = (result.match(/,/g) || []).length;
		expect(commas).toBeLessThanOrEqual(1); // 2 items means at most 1 comma
	});

	it('should return empty string for type with no examples', () => {
		const result = formatTypeExamples('unknown');
		expect(result).toBe('');
	});

	it('should format transcendental examples', () => {
		const result = formatTypeExamples('transcendental');
		expect(result).toContain('π');
		expect(result).toContain('e');
	});
});
