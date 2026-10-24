/**
 * Programmes officiels par niveau (2026-10-24).
 *
 *   - chaque niveau qui a des maths renvoie à un PDF présent dans static/ ;
 *   - la terminale générale (pas de maths au tronc commun) n'en a pas ;
 *   - les trois niveaux d'un cycle partagent le PDF du cycle.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GRADE_CODES } from '$lib/types/grades';
import { OFFICIAL_PROGRAMMES } from '../official-programmes';

describe('OFFICIAL_PROGRAMMES', () => {
	it.each(GRADE_CODES.filter((grade) => grade !== 'T_GEN'))(
		'%s : un PDF présent dans static/',
		(grade) => {
			const programme = OFFICIAL_PROGRAMMES[grade];
			expect(programme).not.toBeNull();
			expect(existsSync(resolve('static', `.${programme?.pdfUrl}`))).toBe(true);
		}
	);

	it('T_GEN : pas de programme', () => {
		expect(OFFICIAL_PROGRAMMES.T_GEN).toBeNull();
	});

	it('un cycle, un PDF', () => {
		expect(OFFICIAL_PROGRAMMES.CE1?.pdfUrl).toBe('/programmes/cycle-2.pdf');
		expect(OFFICIAL_PROGRAMMES['6']?.pdfUrl).toBe('/programmes/cycle-3.pdf');
		expect(OFFICIAL_PROGRAMMES['3']?.pdfUrl).toBe('/programmes/cycle-4.pdf');
	});
});
