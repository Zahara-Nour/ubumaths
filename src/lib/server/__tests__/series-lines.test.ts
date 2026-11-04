/**
 * Composition enregistrée → lignes `{ templateId, … }` (ADR 0035)
 * ==============================================================
 *
 * Aucune requête : la composition est relue telle quelle. Une composition
 * illisible (forme inconnue, ancienne forme par catégorie) est absente du
 * résultat ; les autres sont lues.
 */

import { describe, it, expect, vi } from 'vitest';
import { readStoredSeriesMany } from '$lib/server/series-lines';

vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() })
}));

// Constantes
const FRACTIONS_ID = '0a11f0e0-0000-4000-8000-000000000002';
const ANCIENNE = { category: { level: 2 }, quantity: 3, delay: 20 };

describe('readStoredSeriesMany', () => {
	it('lignes de modèle rendues telles quelles, par id', () => {
		const line = { templateId: FRACTIONS_ID, quantity: 1, delay: 30 };
		const read = readStoredSeriesMany([{ id: 's1', items: [line] }]);
		expect(read.get('s1')).toEqual([line]);
	});

	it('composition illisible : absente du résultat, les autres lues', () => {
		const line = { templateId: FRACTIONS_ID, quantity: 1, delay: 30 };
		const read = readStoredSeriesMany([
			{ id: 'abimee', items: { pas: 'un tableau' } },
			{ id: 'saine', items: [line] }
		]);
		expect(read.has('abimee')).toBe(false);
		expect(read.get('saine')).toEqual([line]);
	});

	it('ancienne forme par catégorie : plus relue, absente du résultat', () => {
		const read = readStoredSeriesMany([{ id: 's1', items: [ANCIENNE] }]);
		expect(read.has('s1')).toBe(false);
	});
});
