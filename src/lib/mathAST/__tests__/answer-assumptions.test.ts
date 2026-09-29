/**
 * Hypothèses de l'énoncé (ADR 0012) : le vocabulaire et sa traduction en
 * `TypeContext` de `numtype`.
 */

import { describe, it, expect } from 'vitest';
import { answerAssumptionsToTypeContext } from '../assumptions';
import { variable, opposite, multiply } from '../factory';
import {
	inferType,
	isIntegerType,
	isNonNegativeType,
	isNonzeroType,
	isPositiveType,
	describeType
} from '../numtype';

describe('answerAssumptionsToTypeContext', () => {
	it('aucune hypothèse → aucun contexte (comportement actuel)', () => {
		expect(answerAssumptionsToTypeContext(undefined)).toBeUndefined();
		expect(answerAssumptionsToTypeContext({})).toBeUndefined();
	});

	it('strictement positif → signe positif', () => {
		const ctx = answerAssumptionsToTypeContext({ x: 'positive' });
		expect(isPositiveType(variable('x'), ctx)).toBe(true);
		expect(isNonNegativeType(variable('x'), ctx)).toBe(true);
		expect(isNonzeroType(variable('x'), ctx)).toBe(true);
		expect(isIntegerType(variable('x'), ctx)).toBe(false);
	});

	it('positif ou nul → signe « nonnegative », pas positif', () => {
		const ctx = answerAssumptionsToTypeContext({ x: 'nonnegative' });
		expect(inferType(variable('x'), ctx).sign).toBe('nonnegative');
		expect(isNonNegativeType(variable('x'), ctx)).toBe(true);
		expect(isPositiveType(variable('x'), ctx)).toBe(false);
		expect(isNonzeroType(variable('x'), ctx)).toBe(false);
	});

	it('non nul → signe nonzero, ni positif ni positif ou nul', () => {
		const ctx = answerAssumptionsToTypeContext({ x: 'nonzero' });
		expect(isNonzeroType(variable('x'), ctx)).toBe(true);
		expect(isPositiveType(variable('x'), ctx)).toBe(false);
		expect(isNonNegativeType(variable('x'), ctx)).toBe(false);
	});

	it('entier → type entier, signe inconnu', () => {
		const ctx = answerAssumptionsToTypeContext({ n: 'integer' });
		expect(isIntegerType(variable('n'), ctx)).toBe(true);
		expect(isNonNegativeType(variable('n'), ctx)).toBe(false);
	});

	it('entier naturel → entier ET positif ou nul', () => {
		const ctx = answerAssumptionsToTypeContext({ n: 'natural' });
		expect(isIntegerType(variable('n'), ctx)).toBe(true);
		expect(isNonNegativeType(variable('n'), ctx)).toBe(true);
		expect(isPositiveType(variable('n'), ctx)).toBe(false);
	});

	it('une variable non déclarée reste réelle, sans signe', () => {
		const ctx = answerAssumptionsToTypeContext({ x: 'positive' });
		expect(inferType(variable('y'), ctx)).toEqual({ base: 'real' });
	});
});

describe('« positif ou nul » ne se propage pas en « positif »', () => {
	const ctx = answerAssumptionsToTypeContext({ x: 'nonnegative' });

	it('son opposé n’est ni positif ni positif ou nul', () => {
		expect(isPositiveType(opposite(variable('x')), ctx)).toBe(false);
		expect(isNonNegativeType(opposite(variable('x')), ctx)).toBe(false);
	});

	it('un produit par un positif n’est pas strictement positif', () => {
		expect(isPositiveType(multiply(variable('x'), variable('x')), ctx)).toBe(false);
	});

	it('un produit de facteurs ≥ 0 est ≥ 0', () => {
		expect(isNonNegativeType(multiply(variable('x'), variable('x')), ctx)).toBe(true);
	});

	it('la description le dit', () => {
		expect(describeType(inferType(variable('x'), ctx))).toContain('positif ou nul');
	});
});
