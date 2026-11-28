import { describe, expect, it } from 'vitest';
import { schoolYearConflictMessage } from '../school-year-errors';

describe('schoolYearConflictMessage', () => {
	it('nomme l’année quand le nom existe déjà dans l’école', () => {
		const message = schoolYearConflictMessage(
			{
				code: '23505',
				message: 'duplicate key value violates unique constraint "unique_school_year"'
			},
			'2026-2027'
		);
		expect(message).toBe(
			"Une année « 2026-2027 » existe déjà pour cette école. Modifiez-la ou activez-la plutôt que d'en créer une autre."
		);
	});

	it('explique le conflit d’année active', () => {
		const message = schoolYearConflictMessage(
			{
				code: '23505',
				message: 'duplicate key value violates unique constraint "idx_one_active_year_per_school"'
			},
			'2026-2027'
		);
		expect(message).toContain('Une autre année est déjà active');
	});

	it('rend null pour une autre erreur (message générique de l’appelant)', () => {
		expect(schoolYearConflictMessage({ code: '42501', message: 'permission denied' }, 'x')).toBe(
			null
		);
		expect(
			schoolYearConflictMessage({ code: '23505', message: 'autre contrainte "foo_key"' }, 'x')
		).toBe(null);
		expect(schoolYearConflictMessage(null, 'x')).toBe(null);
	});
});
