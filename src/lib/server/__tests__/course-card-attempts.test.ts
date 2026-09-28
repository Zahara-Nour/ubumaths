/**
 * Garde-fou FSRS des cartes de cours : au plus une mise à jour de la fiche
 * par carte et par JOUR (jour de l'élève, Europe/Paris).
 */
import { describe, it, expect } from 'vitest';
import { reviewedToday, schoolDay } from '../course-card-attempts';

describe('schoolDay (Europe/Paris)', () => {
	it('23 h 30 UTC le 28 septembre = le 29 à Paris', () => {
		expect(schoolDay(new Date('2026-09-28T23:30:00Z'))).toBe('2026-09-29');
		expect(schoolDay(new Date('2026-09-28T21:30:00Z'))).toBe('2026-09-28');
	});
});

describe('reviewedToday', () => {
	const now = new Date('2026-09-28T10:00:00Z');
	it('jamais révisée → faux', () => {
		expect(reviewedToday(null, now)).toBe(false);
	});
	it('révisée plus tôt le même jour → vrai', () => {
		expect(reviewedToday('2026-09-28T06:00:00Z', now)).toBe(true);
	});
	it('révisée la veille → faux', () => {
		expect(reviewedToday('2026-09-27T21:00:00Z', now)).toBe(false);
	});
});
