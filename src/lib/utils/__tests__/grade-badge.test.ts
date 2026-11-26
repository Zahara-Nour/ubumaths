/**
 * Badge des niveaux d'une tuile du catalogue (chantier `automaths`, PR A)
 *
 * Phase 0 validée (2026-11-26) : « CM1–CM2 » si les niveaux se suivent, sinon
 * « CM1 · 6e ».
 */
import { describe, it, expect } from 'vitest';
import { formatGradeBadge } from '../grade-badge.ts';

describe('formatGradeBadge', () => {
	it('un seul niveau : son nom court', () => {
		expect(formatGradeBadge(['6'])).toBe('6e');
		expect(formatGradeBadge(['CE1'])).toBe('CE1');
	});

	it('niveaux qui se suivent : le premier et le dernier, reliés par un tiret', () => {
		expect(formatGradeBadge(['CM1', 'CM2'])).toBe('CM1–CM2');
		expect(formatGradeBadge(['CM1', 'CM2', '6'])).toBe('CM1–6e');
	});

	it('niveaux qui ne se suivent pas : séparés par un point', () => {
		expect(formatGradeBadge(['CM1', '6'])).toBe('CM1 · 6e');
	});

	it('mélange : chaque suite à part', () => {
		expect(formatGradeBadge(['CM1', 'CM2', '4'])).toBe('CM1–CM2 · 4e');
	});

	it("ordre de l'école, quel que soit l'ordre donné", () => {
		expect(formatGradeBadge(['6', 'CM1', 'CM2'])).toBe('CM1–6e');
	});

	it('lycée : la seconde suivie de la 1re spécialité se suivent', () => {
		expect(formatGradeBadge(['2', '1_SPE'])).toBe('2nde–1ère Spé');
	});

	it('même année, deux filières : ne se suivent pas', () => {
		expect(formatGradeBadge(['T_SPE', 'T_COMP'])).toBe('Term Spé · Term Comp');
	});

	it('code inconnu ignoré, doublon compté une fois ; aucun niveau : chaîne vide', () => {
		expect(formatGradeBadge(['CM1', 'CM1', 'inconnu', 'CM2'])).toBe('CM1–CM2');
		expect(formatGradeBadge([])).toBe('');
	});
});
