/**
 * Case « figure » (bloc ```construction) corrigée au serveur (évaluations
 * notées, ADR 0015) : les modules de correction inscrivent le calcul des
 * positions (registre `questions/construction/positions`).
 */
import { describe, it, expect, vi } from 'vitest';

describe('correction serveur — registre des positions inscrit', () => {
	it('par la correction des envois (grading-budget)', async () => {
		vi.resetModules();
		await import('../grading-budget');
		const { hasConstructionPositions } = await import('$lib/questions/construction/positions');
		expect(hasConstructionPositions()).toBe(true);
	});

	it('par la copie corrigée (corrected-detail)', async () => {
		vi.resetModules();
		await import('../corrected-detail');
		const { hasConstructionPositions } = await import('$lib/questions/construction/positions');
		expect(hasConstructionPositions()).toBe(true);
	});
});

describe('tests du modèle (testSpecs) — éditeur et publication', () => {
	it('le lanceur des testSpecs inscrit le registre', async () => {
		vi.resetModules();
		await import('$lib/questions/test-spec-runner');
		const { hasConstructionPositions } = await import('$lib/questions/construction/positions');
		expect(hasConstructionPositions()).toBe(true);
	});
});
