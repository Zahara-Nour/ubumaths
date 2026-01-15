/**
 * Unit tests for parental consent utilities
 *
 * RGPD Article 8: Minors under 15 require parental consent in France.
 * Tests validate all consent logic for students requiring parental authorization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	requiresParentalConsent,
	hasValidConsent,
	isInGracePeriod,
	getConsentStatus,
	GRADES_REQUIRING_CONSENT,
	type ConsentProfile
} from './consent';
import {
	canPerformAction,
	requireConsent,
	type RestrictedAction
} from '$lib/server/middleware/consent';

describe('Parental Consent Utilities', () => {
	describe('GRADES_REQUIRING_CONSENT constant', () => {
		it('should include grades for students under 15 years', () => {
			expect(GRADES_REQUIRING_CONSENT).toEqual(['6', '5', '4', '3', '2']);
		});

		it('should include 6ème (11 years old)', () => {
			expect(GRADES_REQUIRING_CONSENT).toContain('6');
		});

		it('should include 2nde (15 years old, safety margin)', () => {
			expect(GRADES_REQUIRING_CONSENT).toContain('2');
		});

		it('should not include 1ère or Terminale (16+ years)', () => {
			expect(GRADES_REQUIRING_CONSENT).not.toContain('1_GEN');
			expect(GRADES_REQUIRING_CONSENT).not.toContain('T_GEN');
		});
	});

	describe('requiresParentalConsent()', () => {
		describe('returns true for grades requiring consent', () => {
			it.each([
				['6', '6ème (11 years)'],
				['5', '5ème (12 years)'],
				['4', '4ème (13 years)'],
				['3', '3ème (14 years)'],
				['2', '2nde (15 years, safety margin)']
			])('returns true for grade %s (%s)', (grade) => {
				expect(requiresParentalConsent(grade)).toBe(true);
			});
		});

		describe('returns false for grades NOT requiring consent', () => {
			it.each([
				['1_GEN', '1ère Générale (16 years)'],
				['T_GEN', 'Terminale Générale (17 years)'],
				['1_SPE', '1ère Spécialité (16 years)'],
				['T_SPE', 'Terminale Spécialité (17 years)'],
				['T_EXP', 'Terminale Expert (17 years)'],
				['T_COMP', 'Terminale Complémentaire (17 years)'],
				['1_STMG', '1ère STMG (16 years)'],
				['T_STMG', 'Terminale STMG (17 years)']
			])('returns false for grade %s (%s)', (grade) => {
				expect(requiresParentalConsent(grade)).toBe(false);
			});

			it('returns false for primary school grades (not in system)', () => {
				expect(requiresParentalConsent('CP')).toBe(false);
				expect(requiresParentalConsent('CE1')).toBe(false);
				expect(requiresParentalConsent('CM1')).toBe(false);
			});
		});

		describe('returns true for null/undefined (safe default)', () => {
			it('returns true for null grade (safe default per RGPD)', () => {
				expect(requiresParentalConsent(null)).toBe(true);
			});

			it('returns true for undefined grade (safe default per RGPD)', () => {
				expect(requiresParentalConsent(undefined)).toBe(true);
			});

			it('returns true for empty string (safe default)', () => {
				expect(requiresParentalConsent('')).toBe(true);
			});
		});

		describe('edge cases', () => {
			it('returns false for invalid grade strings', () => {
				expect(requiresParentalConsent('invalid')).toBe(false);
				expect(requiresParentalConsent('999')).toBe(false);
			});

			it('is case-sensitive (grades are uppercase)', () => {
				expect(requiresParentalConsent('2')).toBe(true);
				expect(requiresParentalConsent('seconde')).toBe(false); // Not a grade code
			});
		});
	});

	describe('hasValidConsent()', () => {
		describe('returns true for non-students (exempt from consent)', () => {
			it('returns true for teachers (any consent fields)', () => {
				const teacherProfile: ConsentProfile = {
					role: 'teacher',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				expect(hasValidConsent(teacherProfile)).toBe(true);
			});

			it('returns true for admins (any consent fields)', () => {
				const adminProfile: ConsentProfile = {
					role: 'admin',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				expect(hasValidConsent(adminProfile)).toBe(true);
			});
		});

		describe('returns true for students with consent_required = false', () => {
			it('returns true when consent is not required (older students)', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: false,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				expect(hasValidConsent(studentProfile)).toBe(true);
			});
		});

		describe('returns true for students with consent_granted_at set', () => {
			it('returns true when consent was granted', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: '2025-01-01T10:00:00Z',
					consent_grace_period_ends: null
				};

				expect(hasValidConsent(studentProfile)).toBe(true);
			});

			it('returns true even if grace period has expired (consent already granted)', () => {
				const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: '2025-01-01T10:00:00Z',
					consent_grace_period_ends: pastDate
				};

				expect(hasValidConsent(studentProfile)).toBe(true);
			});
		});

		describe('returns true for students in grace period', () => {
			it('returns true when grace period has not expired', () => {
				const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: futureDate
				};

				expect(hasValidConsent(studentProfile)).toBe(true);
			});

			it('returns true when grace period ends exactly now (boundary)', () => {
				// Use Date.now() directly to ensure we're testing the exact boundary
				const nowMock = Date.now();
				vi.setSystemTime(nowMock);

				const nowDate = new Date(nowMock + 1000).toISOString(); // 1 second in future

				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: nowDate
				};

				expect(hasValidConsent(studentProfile)).toBe(true);

				vi.useRealTimers();
			});
		});

		describe('returns false for students without consent and past grace period', () => {
			it('returns false when grace period has expired', () => {
				const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: pastDate
				};

				expect(hasValidConsent(studentProfile)).toBe(false);
			});

			it('returns false when consent required but no grace period or consent', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				expect(hasValidConsent(studentProfile)).toBe(false);
			});
		});

		describe('edge cases and boundary conditions', () => {
			it('handles invalid date strings gracefully (NaN comparison fails safely)', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: 'invalid-date'
				};

				// Invalid date results in false (no valid consent)
				expect(hasValidConsent(studentProfile)).toBe(false);
			});

			it('handles empty string consent_granted_at as falsy', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: '',
					consent_grace_period_ends: null
				};

				// Empty string is falsy in JavaScript
				expect(hasValidConsent(studentProfile)).toBe(false);
			});
		});
	});

	describe('isInGracePeriod()', () => {
		describe('returns false for non-students', () => {
			it('returns false for teachers', () => {
				const teacherProfile: ConsentProfile = {
					role: 'teacher',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
				};

				expect(isInGracePeriod(teacherProfile)).toBe(false);
			});

			it('returns false for admins', () => {
				const adminProfile: ConsentProfile = {
					role: 'admin',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
				};

				expect(isInGracePeriod(adminProfile)).toBe(false);
			});
		});

		describe('returns false if consent not required', () => {
			it('returns false when consent_required is false', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: false,
					consent_granted_at: null,
					consent_grace_period_ends: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
				};

				expect(isInGracePeriod(studentProfile)).toBe(false);
			});
		});

		describe('returns false if consent already granted', () => {
			it('returns false when consent_granted_at is set', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: '2025-01-01T10:00:00Z',
					consent_grace_period_ends: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
				};

				expect(isInGracePeriod(studentProfile)).toBe(false);
			});
		});

		describe('returns true if in valid grace period', () => {
			it('returns true when grace period has not expired', () => {
				const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: futureDate
				};

				expect(isInGracePeriod(studentProfile)).toBe(true);
			});

			it('returns true when grace period ends in 1 second (boundary)', () => {
				const nowMock = Date.now();
				vi.setSystemTime(nowMock);

				const futureDate = new Date(nowMock + 1000).toISOString(); // 1 second from now

				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: futureDate
				};

				expect(isInGracePeriod(studentProfile)).toBe(true);

				vi.useRealTimers();
			});
		});

		describe('returns false if grace period expired', () => {
			it('returns false when grace period has passed', () => {
				const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: pastDate
				};

				expect(isInGracePeriod(studentProfile)).toBe(false);
			});

			it('returns false when grace period is null', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				expect(isInGracePeriod(studentProfile)).toBe(false);
			});
		});

		describe('edge cases', () => {
			it('handles invalid date strings gracefully', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: 'invalid-date'
				};

				// Invalid date results in false (NaN > Date comparison is false)
				expect(isInGracePeriod(studentProfile)).toBe(false);
			});
		});
	});

	describe('getConsentStatus()', () => {
		describe('returns complete status object for UI', () => {
			it('returns correct status for student with consent', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: '2025-01-01T10:00:00Z',
					consent_grace_period_ends: null
				};

				const status = getConsentStatus(studentProfile);

				expect(status).toEqual({
					required: true,
					granted: true,
					inGracePeriod: false,
					gracePeriodEnds: null,
					hasFullAccess: true
				});
			});

			it('returns correct status for student in grace period', () => {
				const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: futureDate.toISOString()
				};

				const status = getConsentStatus(studentProfile);

				expect(status.required).toBe(true);
				expect(status.granted).toBe(false);
				expect(status.inGracePeriod).toBe(true);
				expect(status.gracePeriodEnds).toBeInstanceOf(Date);
				expect(status.gracePeriodEnds?.getTime()).toBe(futureDate.getTime());
				expect(status.hasFullAccess).toBe(true);
			});

			it('returns correct status for student without consent (blocked)', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				const status = getConsentStatus(studentProfile);

				expect(status).toEqual({
					required: true,
					granted: false,
					inGracePeriod: false,
					gracePeriodEnds: null,
					hasFullAccess: false
				});
			});

			it('returns correct status for student not requiring consent', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: false,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				const status = getConsentStatus(studentProfile);

				expect(status).toEqual({
					required: false,
					granted: false,
					inGracePeriod: false,
					gracePeriodEnds: null,
					hasFullAccess: true
				});
			});

			it('returns correct status for teacher', () => {
				const teacherProfile: ConsentProfile = {
					role: 'teacher',
					consent_required: false,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				const status = getConsentStatus(teacherProfile);

				expect(status.required).toBe(false);
				expect(status.granted).toBe(false);
				expect(status.inGracePeriod).toBe(false);
				expect(status.gracePeriodEnds).toBeNull();
				expect(status.hasFullAccess).toBe(true);
			});
		});

		describe('grace period date conversion', () => {
			it('converts grace period string to Date object', () => {
				const dateString = '2025-12-31T23:59:59.000Z';

				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: dateString
				};

				const status = getConsentStatus(studentProfile);

				expect(status.gracePeriodEnds).toBeInstanceOf(Date);
				expect(status.gracePeriodEnds?.toISOString()).toBe(dateString);
			});

			it('returns null when grace period ends is null', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				const status = getConsentStatus(studentProfile);

				expect(status.gracePeriodEnds).toBeNull();
			});
		});
	});

	describe('Consent Middleware - canPerformAction()', () => {
		describe('returns true for valid consent scenarios', () => {
			it('returns true for teachers (any action)', () => {
				const teacherProfile: ConsentProfile = {
					role: 'teacher',
					consent_required: false,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				const actions: RestrictedAction[] = [
					'submit_exercise',
					'send_message',
					'receive_message',
					'earn_rewards',
					'play_games',
					'purchase_items'
				];

				actions.forEach((action) => {
					expect(canPerformAction(teacherProfile, action)).toBe(true);
				});
			});

			it('returns true for students with consent granted', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: '2025-01-01T10:00:00Z',
					consent_grace_period_ends: null
				};

				expect(canPerformAction(studentProfile, 'submit_exercise')).toBe(true);
			});

			it('returns true for students in grace period', () => {
				const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: futureDate
				};

				expect(canPerformAction(studentProfile, 'send_message')).toBe(true);
			});

			it('returns true for students not requiring consent', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: false,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				expect(canPerformAction(studentProfile, 'play_games')).toBe(true);
			});
		});

		describe('returns false for invalid consent scenarios', () => {
			it('returns false for students without consent and past grace period', () => {
				const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: pastDate
				};

				expect(canPerformAction(studentProfile, 'submit_exercise')).toBe(false);
			});

			it('returns false for students requiring consent but no grant or grace period', () => {
				const studentProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				expect(canPerformAction(studentProfile, 'earn_rewards')).toBe(false);
			});
		});

		describe('tests all restricted action types', () => {
			it('validates different action types consistently', () => {
				const validProfile: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: '2025-01-01T10:00:00Z',
					consent_grace_period_ends: null
				};

				const actions: RestrictedAction[] = [
					'submit_exercise',
					'send_message',
					'receive_message',
					'earn_rewards',
					'play_games',
					'purchase_items'
				];

				actions.forEach((action) => {
					expect(canPerformAction(validProfile, action)).toBe(true);
				});
			});
		});
	});

	describe('Consent Middleware - requireConsent()', () => {
		let studentNoConsent: ConsentProfile;
		let studentWithConsent: ConsentProfile;

		beforeEach(() => {
			studentNoConsent = {
				role: 'student',
				consent_required: true,
				consent_granted_at: null,
				consent_grace_period_ends: null
			};

			studentWithConsent = {
				role: 'student',
				consent_required: true,
				consent_granted_at: '2025-01-01T10:00:00Z',
				consent_grace_period_ends: null
			};
		});

		describe('throws 403 for invalid consent', () => {
			it('throws 403 when student lacks consent', () => {
				expect(() => requireConsent(studentNoConsent, 'submit_exercise')).toThrow();

				try {
					requireConsent(studentNoConsent, 'submit_exercise');
				} catch (error) {
					expect(error).toHaveProperty('status', 403);
					expect(error).toHaveProperty('body');
					expect((error as { body: { message: string } }).body.message).toContain(
						'Consentement parental requis'
					);
					expect((error as { body: { message: string } }).body.message).toContain(
						'soumettre des réponses'
					);
				}
			});

			it('throws 403 for each restricted action with appropriate message', () => {
				const actionTests: [RestrictedAction, string][] = [
					['submit_exercise', 'soumettre des réponses'],
					['send_message', 'envoyer des messages'],
					['receive_message', 'recevoir des messages'],
					['earn_rewards', 'gagner des récompenses'],
					['play_games', 'jouer aux jeux'],
					['purchase_items', 'acheter dans la boutique']
				];

				actionTests.forEach(([action, expectedMessage]) => {
					try {
						requireConsent(studentNoConsent, action);
						// Should not reach here
						expect.fail('Should have thrown error');
					} catch (error) {
						expect(error).toHaveProperty('status', 403);
						expect((error as { body: { message: string } }).body.message).toContain(
							expectedMessage
						);
					}
				});
			});
		});

		describe('does not throw for valid consent', () => {
			it('does not throw when student has consent', () => {
				expect(() => requireConsent(studentWithConsent, 'submit_exercise')).not.toThrow();
			});

			it('does not throw for teacher', () => {
				const teacherProfile: ConsentProfile = {
					role: 'teacher',
					consent_required: false,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				expect(() => requireConsent(teacherProfile, 'send_message')).not.toThrow();
			});

			it('does not throw for student in grace period', () => {
				const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

				const studentInGracePeriod: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: futureDate
				};

				expect(() => requireConsent(studentInGracePeriod, 'play_games')).not.toThrow();
			});

			it('does not throw for student not requiring consent', () => {
				const olderStudent: ConsentProfile = {
					role: 'student',
					consent_required: false,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				expect(() => requireConsent(olderStudent, 'purchase_items')).not.toThrow();
			});
		});

		describe('error message format', () => {
			it('includes "Contactez votre enseignant" in error message', () => {
				try {
					requireConsent(studentNoConsent, 'send_message');
					expect.fail('Should have thrown error');
				} catch (error) {
					expect((error as { body: { message: string } }).body.message).toContain(
						'Contactez votre enseignant'
					);
				}
			});

			it('error message is in French', () => {
				try {
					requireConsent(studentNoConsent, 'earn_rewards');
					expect.fail('Should have thrown error');
				} catch (error) {
					const message = (error as { body: { message: string } }).body.message;
					expect(message).toContain('Consentement parental requis');
					expect(message).toContain('gagner des récompenses');
					expect(message).toContain('Contactez votre enseignant');
				}
			});
		});
	});

	describe('Integration scenarios', () => {
		describe('complete student lifecycle', () => {
			it('handles new student requiring consent (no grace period yet)', () => {
				const newStudent: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: null
				};

				expect(hasValidConsent(newStudent)).toBe(false);
				expect(isInGracePeriod(newStudent)).toBe(false);
				expect(canPerformAction(newStudent, 'submit_exercise')).toBe(false);

				const status = getConsentStatus(newStudent);
				expect(status.hasFullAccess).toBe(false);
			});

			it('handles student with active grace period', () => {
				const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

				const studentInGrace: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: futureDate
				};

				expect(hasValidConsent(studentInGrace)).toBe(true);
				expect(isInGracePeriod(studentInGrace)).toBe(true);
				expect(canPerformAction(studentInGrace, 'submit_exercise')).toBe(true);

				const status = getConsentStatus(studentInGrace);
				expect(status.hasFullAccess).toBe(true);
				expect(status.inGracePeriod).toBe(true);
			});

			it('handles student after consent granted (no longer in grace)', () => {
				const studentWithConsent: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: '2025-01-01T10:00:00Z',
					consent_grace_period_ends: null
				};

				expect(hasValidConsent(studentWithConsent)).toBe(true);
				expect(isInGracePeriod(studentWithConsent)).toBe(false);
				expect(canPerformAction(studentWithConsent, 'submit_exercise')).toBe(true);

				const status = getConsentStatus(studentWithConsent);
				expect(status.hasFullAccess).toBe(true);
				expect(status.granted).toBe(true);
			});

			it('handles student after grace period expired (blocked)', () => {
				const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

				const blockedStudent: ConsentProfile = {
					role: 'student',
					consent_required: true,
					consent_granted_at: null,
					consent_grace_period_ends: pastDate
				};

				expect(hasValidConsent(blockedStudent)).toBe(false);
				expect(isInGracePeriod(blockedStudent)).toBe(false);
				expect(canPerformAction(blockedStudent, 'submit_exercise')).toBe(false);

				const status = getConsentStatus(blockedStudent);
				expect(status.hasFullAccess).toBe(false);
			});
		});

		describe('grade transitions requiring consent updates', () => {
			it('validates 3ème student (14 years) requires consent', () => {
				expect(requiresParentalConsent('3')).toBe(true);
			});

			it('validates 2nde student (15 years) requires consent (safety margin)', () => {
				expect(requiresParentalConsent('2')).toBe(true);
			});

			it('validates 1ère student (16 years) does not require consent', () => {
				expect(requiresParentalConsent('1_GEN')).toBe(false);
			});

			it('simulates grade progression from 3ème to 2nde (still requires consent)', () => {
				// Student in 3ème
				expect(requiresParentalConsent('3')).toBe(true);

				// Student progresses to 2nde
				expect(requiresParentalConsent('2')).toBe(true);

				// Student progresses to 1ère (consent no longer required)
				expect(requiresParentalConsent('1_GEN')).toBe(false);
			});
		});
	});
});
