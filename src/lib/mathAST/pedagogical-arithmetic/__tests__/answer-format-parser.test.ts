/**
 * Tests for `answer-format-parser.ts` — Phase 2a (classification only).
 *
 * Phase 7 will add matching/extraction tests once the matcher exists.
 */

import { describe, expect, it } from 'vitest';
import { multiply, number, opposite, sqrt, superscript } from '../../factory';
import {
	classifyAnswerFormat,
	countPlaceholders,
	extractAnswerFragment,
	isFractionFormat,
	isPlainFormat,
	isPowerFormat,
	isRadicalFormat,
	isScientificFormat
} from '../answer-format-parser';

describe('answer-format-parser — classification', () => {
	describe('isScientificFormat', () => {
		it.each([
			['10^?', true],
			['? \\times 10^?', true],
			['?\\times10^?', true],
			['? × 10^?', true],
			['? \\cdot 10^?', true],
			['?\\times{}10^{?}', true],
			['10^{?}', true]
		])('classifies %s as scientific=%s', (format, expected) => {
			expect(isScientificFormat(format)).toBe(expected);
		});

		it.each([
			['?/?', false],
			['?', false],
			['\\sqrt{?}', false],
			['?^?', false]
		])('rejects %s (not scientific)', (format) => {
			expect(isScientificFormat(format)).toBe(false);
		});

		it('returns false for format without placeholder', () => {
			expect(isScientificFormat('10^5')).toBe(false);
		});
	});

	describe('isFractionFormat', () => {
		it.each([
			['?/?', true],
			['\\dfrac{?}{?}', true],
			['\\frac{?}{?}', true],
			['\\tfrac{?}{?}', true]
		])('classifies %s as fraction', (format) => {
			expect(isFractionFormat(format)).toBe(true);
		});

		it.each([['10^?'], ['?'], ['\\sqrt{?}']])('rejects %s (not fraction)', (format) => {
			expect(isFractionFormat(format)).toBe(false);
		});
	});

	describe('isPowerFormat', () => {
		it.each([
			['?^?', true],
			['?^{?}', true],
			['2^?', true]
		])('classifies %s as power', (format) => {
			expect(isPowerFormat(format)).toBe(true);
		});

		it('does NOT classify scientific notation as power (precedence)', () => {
			expect(isPowerFormat('10^?')).toBe(false);
			expect(isPowerFormat('? \\times 10^?')).toBe(false);
		});

		it.each([['?/?'], ['?'], ['\\sqrt{?}']])('rejects %s (not power)', (format) => {
			expect(isPowerFormat(format)).toBe(false);
		});
	});

	describe('isRadicalFormat', () => {
		it.each([
			['\\sqrt{?}', true],
			['?\\sqrt{?}', true],
			['\\sqrt[?]{?}', true],
			['? \\sqrt{?}', true]
		])('classifies %s as radical', (format) => {
			expect(isRadicalFormat(format)).toBe(true);
		});

		it.each([['?/?'], ['?'], ['10^?']])('rejects %s (not radical)', (format) => {
			expect(isRadicalFormat(format)).toBe(false);
		});
	});

	describe('isPlainFormat', () => {
		it.each([
			['?', true],
			[' ? ', true],
			['?\\,', true]
		])('classifies %s as plain', (format) => {
			expect(isPlainFormat(format)).toBe(true);
		});

		it.each([['10^?'], ['?/?'], ['\\sqrt{?}']])('rejects %s (not plain)', (format) => {
			expect(isPlainFormat(format)).toBe(false);
		});
	});

	describe('classifyAnswerFormat — precedence', () => {
		it.each([
			['10^?', 'scientific'],
			['? \\times 10^?', 'scientific'],
			['\\sqrt{?}', 'radical'],
			['?\\sqrt{?}', 'radical'],
			['\\sqrt[?]{?}', 'radical'],
			['?/?', 'fraction'],
			['\\dfrac{?}{?}', 'fraction'],
			['?^?', 'power'],
			['2^?', 'power'],
			['?', 'plain'],
			['unknown_format', 'unknown'],
			['', 'unknown'],
			['?+?/?', 'unknown']
		])('classifies %s as %s', (format, expected) => {
			expect(classifyAnswerFormat(format)).toBe(expected);
		});
	});

	describe('countPlaceholders', () => {
		it.each([
			['10^?', 1],
			['? \\times 10^?', 2],
			['?/?', 2],
			['?', 1],
			['no placeholder', 0],
			['\\sqrt{?}', 1]
		])('counts placeholders in %s = %d', (format, expected) => {
			expect(countPlaceholders(format)).toBe(expected);
		});
	});

	describe('extractAnswerFragment', () => {
		it('plain "?" returns the full node as fragment', () => {
			const fragment = extractAnswerFragment(number('5'), '?');
			expect(fragment).toEqual({ latex: '5', placeholderPath: [] });
		});

		it('"10^?" extracts the exponent from 10^6', () => {
			const node = superscript(number('10'), number('6'));
			const fragment = extractAnswerFragment(node, '10^?');
			expect(fragment).toEqual({ latex: '6', placeholderPath: ['superscript'] });
		});

		it('"10^?" returns null when base is not 10', () => {
			const node = superscript(number('2'), number('6'));
			expect(extractAnswerFragment(node, '10^?')).toBeNull();
		});

		it('"? × 10^?" extracts the mantissa from 5 × 10^6', () => {
			const node = multiply(number('5'), superscript(number('10'), number('6')), 'cross');
			const fragment = extractAnswerFragment(node, '? \\times 10^?');
			expect(fragment).toEqual({ latex: '5', placeholderPath: ['left'] });
		});

		it('"? × 10^?" handles negative mantissa via opposite() wrapper', () => {
			const node = multiply(opposite(number('3')), superscript(number('10'), number('6')), 'cross');
			const fragment = extractAnswerFragment(node, '? \\times 10^?');
			expect(fragment?.latex).toBe('3');
		});

		it('"\\sqrt{?}" extracts the radicand from √8', () => {
			const fragment = extractAnswerFragment(sqrt(number('8')), '\\sqrt{?}');
			expect(fragment).toEqual({ latex: '8', placeholderPath: ['arg'] });
		});

		it('"?^?" extracts the exponent from 2^5', () => {
			const node = superscript(number('2'), number('5'));
			const fragment = extractAnswerFragment(node, '?^?');
			expect(fragment).toEqual({ latex: '5', placeholderPath: ['superscript'] });
		});

		it('returns null when format is unknown', () => {
			expect(extractAnswerFragment(number('5'), 'weird format')).toBeNull();
		});

		it('returns null when shape mismatches scientific template', () => {
			expect(extractAnswerFragment(number('5'), '10^?')).toBeNull();
		});
	});
});
