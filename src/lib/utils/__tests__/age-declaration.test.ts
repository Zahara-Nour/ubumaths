import { describe, it, expect } from 'vitest';
import { shouldAskAgeQuestion, describeAgeDeclaration } from '../age-declaration';

describe('shouldAskAgeQuestion', () => {
	it('élève de 2nde sans réponse → vrai', () => {
		expect(
			shouldAskAgeQuestion({
				role: 'student',
				grade: '2',
				age_declaration: null,
				consent_required: true
			})
		).toBe(true);
	});

	it.each([
		[{ role: 'student', grade: '2', age_declaration: '15_plus', consent_required: true }],
		[{ role: 'student', grade: '2', age_declaration: 'under_15', consent_required: true }],
		[{ role: 'student', grade: '3', age_declaration: null, consent_required: true }],
		[{ role: 'student', grade: '1_SPE', age_declaration: null, consent_required: true }],
		[{ role: 'student', grade: null, age_declaration: null, consent_required: true }],
		[{ role: 'teacher', grade: '2', age_declaration: null, consent_required: true }],
		// Q74 : élève de 2nde déjà dispensé par le professeur
		[{ role: 'student', grade: '2', age_declaration: null, consent_required: false }]
	])('%o → faux', (profile) => {
		expect(shouldAskAgeQuestion(profile)).toBe(false);
	});

	it('profil absent → faux', () => {
		expect(shouldAskAgeQuestion(null)).toBe(false);
	});
});

describe('describeAgeDeclaration', () => {
	it('15_plus → phrase avec date JJ/MM/AAAA', () => {
		expect(describeAgeDeclaration('15_plus', '2026-10-01T12:00:00Z')).toBe(
			'a déclaré avoir 15 ans ou plus, le 01/10/2026'
		);
	});

	it('under_15 → phrase avec date', () => {
		expect(describeAgeDeclaration('under_15', '2026-03-05T12:00:00Z')).toBe(
			'a déclaré avoir moins de 15 ans, le 05/03/2026'
		);
	});

	it('pas de réponse → null', () => {
		expect(describeAgeDeclaration(null, null)).toBeNull();
		expect(describeAgeDeclaration('autre', '2026-10-01T12:00:00Z')).toBeNull();
	});
});
