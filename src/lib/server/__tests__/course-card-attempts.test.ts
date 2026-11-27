/**
 * Jour de l'élève (Europe/Paris), sur lequel repose le garde-fou FSRS des
 * cartes de cours (`srs/best-of-day.ts`).
 */
import { describe, it, expect } from 'vitest';
import { schoolDay } from '../course-card-attempts';

describe('schoolDay (Europe/Paris)', () => {
	it('23 h 30 UTC le 28 septembre = le 29 à Paris', () => {
		expect(schoolDay(new Date('2026-09-28T23:30:00Z'))).toBe('2026-09-29');
		expect(schoolDay(new Date('2026-09-28T21:30:00Z'))).toBe('2026-09-28');
	});
});
