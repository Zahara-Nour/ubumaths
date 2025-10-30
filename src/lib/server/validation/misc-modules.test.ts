/**
 * Tests for miscellaneous validation modules
 * Covers: riddles, errors, latex, auth, classes
 */

import { describe, it, expect } from 'vitest';

// Riddles
import { riddleAnswerSchema, riddleFormSchema, riddleOfTheDaySchema } from './riddles';

// Errors
import { logErrorSchema, resolveErrorSchema, cleanupErrorsSchema } from './errors';

// LaTeX
import { compileLatexSchema } from './latex';

// Auth
import {
	loginFormSchema,
	signupFormSchema,
	requestPasswordResetSchema,
	updatePasswordSchema,
	updateProfileSchema
} from './auth';

// Classes
import {
	schoolYearSchema,
	createClassSchema,
	updateClassSchema,
	getClassStudentsSchema,
	createScheduleEntrySchema,
	getClassWarningsSchema,
	getClassGidouillesSchema
} from './classes';

describe('miscellaneous validation modules', () => {
	// ============================================================================
	// RIDDLES
	// ============================================================================

	describe('riddleAnswerSchema', () => {
		it('should accept string answer', () => {
			const data = { answer: 'Paris' };
			const result = riddleAnswerSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept number answer', () => {
			const data = { answer: 42 };
			const result = riddleAnswerSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept boolean answer', () => {
			const data = { answer: true };
			const result = riddleAnswerSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject string exceeding max length', () => {
			const data = { answer: 'a'.repeat(1001) };
			const result = riddleAnswerSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject infinite number', () => {
			const data = { answer: Infinity };
			const result = riddleAnswerSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject NaN', () => {
			const data = { answer: NaN };
			const result = riddleAnswerSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('riddleFormSchema', () => {
		it('should accept valid riddle form', () => {
			const data = {
				title: 'Math Riddle',
				genre: 'Logic',
				difficulty: '2',
				statement: 'What is 2 + 2?',
				correction: 'The answer is 4 because...',
				image_url: 'https://example.com/image.png',
				answer: JSON.stringify({ value: 4 }),
				status: 'published'
			};

			const result = riddleFormSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept minimal riddle form', () => {
			const data = {
				title: 'Riddle',
				genre: null,
				difficulty: '1',
				statement: 'Question',
				correction: 'Answer',
				image_url: null,
				status: 'draft'
			};

			const result = riddleFormSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject empty title', () => {
			const data = {
				title: '   ',
				difficulty: '1',
				statement: 'Q',
				correction: 'A',
				status: 'draft'
			};

			const result = riddleFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid difficulty', () => {
			const data = {
				title: 'Riddle',
				difficulty: '4',
				statement: 'Q',
				correction: 'A',
				status: 'draft'
			};

			const result = riddleFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid status', () => {
			const data = {
				title: 'Riddle',
				difficulty: '1',
				statement: 'Q',
				correction: 'A',
				status: 'invalid'
			};

			const result = riddleFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('riddleOfTheDaySchema', () => {
		it('should accept valid riddle UUID', () => {
			const data = {
				riddle_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = riddleOfTheDaySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid UUID', () => {
			const data = {
				riddle_id: 'not-a-uuid'
			};

			const result = riddleOfTheDaySchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// ERROR LOGGING
	// ============================================================================

	describe('logErrorSchema', () => {
		it('should accept valid error log', () => {
			const data = {
				error_type: 'frontend',
				message: 'TypeError: Cannot read property',
				url: 'https://example.com/page',
				stack_trace: 'Error\n  at Component.render',
				user_agent: 'Mozilla/5.0...',
				severity: 'high',
				metadata: { userId: '123', route: '/dashboard' }
			};

			const result = logErrorSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept minimal error log', () => {
			const data = {
				error_type: 'unknown',
				message: 'Error occurred',
				url: 'https://example.com'
			};

			const result = logErrorSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept all error types', () => {
			const types = ['frontend', 'backend', 'api', 'database', 'unknown'] as const;
			types.forEach((error_type) => {
				const data = {
					error_type,
					message: 'Test error',
					url: 'https://example.com'
				};

				const result = logErrorSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should accept all severity levels', () => {
			const levels = ['low', 'medium', 'high', 'critical'] as const;
			levels.forEach((severity) => {
				const data = {
					error_type: 'frontend',
					message: 'Error',
					url: 'https://example.com',
					severity
				};

				const result = logErrorSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should reject invalid URL', () => {
			const data = {
				error_type: 'frontend',
				message: 'Error',
				url: 'not-a-url'
			};

			const result = logErrorSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject message exceeding max length', () => {
			const data = {
				error_type: 'frontend',
				message: 'a'.repeat(1001),
				url: 'https://example.com'
			};

			const result = logErrorSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('resolveErrorSchema', () => {
		it('should accept notes field', () => {
			const data = {
				notes: 'Fixed by restarting server'
			};

			const result = resolveErrorSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept empty object (notes optional)', () => {
			const result = resolveErrorSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should accept undefined notes', () => {
			const data = {
				notes: undefined
			};

			const result = resolveErrorSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject notes exceeding max length', () => {
			const data = {
				notes: 'a'.repeat(2001)
			};

			const result = resolveErrorSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('max 2000');
			}
		});

		it('should accept notes at exactly max length', () => {
			const data = {
				notes: 'a'.repeat(2000)
			};

			const result = resolveErrorSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept long detailed notes', () => {
			const data = {
				notes:
					'Error was caused by race condition in authentication flow. ' +
					'Fixed by implementing proper mutex locks. ' +
					'Added tests to prevent regression. ' +
					'Deployed to production and monitoring shows no recurrence.'
			};

			const result = resolveErrorSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe('cleanupErrorsSchema', () => {
		it('should accept valid days_old', () => {
			const data = {
				days_old: 90
			};

			const result = cleanupErrorsSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default value', () => {
			const result = cleanupErrorsSchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.days_old).toBe(90);
			}
		});

		it('should accept undefined days_old', () => {
			const data = {
				days_old: undefined
			};

			const result = cleanupErrorsSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.days_old).toBe(90);
			}
		});

		it('should accept days_old from 1 to 365', () => {
			const validValues = [1, 30, 90, 180, 365];
			validValues.forEach((days_old) => {
				const result = cleanupErrorsSchema.safeParse({ days_old });
				expect(result.success).toBe(true);
			});
		});

		it('should reject zero days_old', () => {
			const data = {
				days_old: 0
			};

			const result = cleanupErrorsSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('positive');
			}
		});

		it('should reject negative days_old', () => {
			const data = {
				days_old: -30
			};

			const result = cleanupErrorsSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('positive');
			}
		});

		it('should reject days_old exceeding max', () => {
			const data = {
				days_old: 366
			};

			const result = cleanupErrorsSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('365');
			}
		});

		it('should reject decimal days_old', () => {
			const data = {
				days_old: 90.5
			};

			const result = cleanupErrorsSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('integer');
			}
		});

		it('should reject infinite days_old', () => {
			const data = {
				days_old: Infinity
			};

			const result = cleanupErrorsSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject NaN days_old', () => {
			const data = {
				days_old: NaN
			};

			const result = cleanupErrorsSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// LATEX
	// ============================================================================

	describe('compileLatexSchema', () => {
		it('should accept valid LaTeX compilation request', () => {
			const data = {
				latex: 'x^2 + 2x + 1',
				format: 'svg',
				fontSize: 14,
				displayMode: true
			};

			const result = compileLatexSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default values', () => {
			const data = {
				latex: 'E = mc^2'
			};

			const result = compileLatexSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.format).toBe('svg');
				expect(result.data.fontSize).toBe(12);
				expect(result.data.displayMode).toBe(false);
			}
		});

		it('should accept all formats', () => {
			['svg', 'png', 'pdf'].forEach((format) => {
				const data = {
					latex: 'x^2',
					format
				};

				const result = compileLatexSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should reject empty latex', () => {
			const data = {
				latex: ''
			};

			const result = compileLatexSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject latex exceeding max length', () => {
			const data = {
				latex: 'a'.repeat(50001)
			};

			const result = compileLatexSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject fontSize below minimum', () => {
			const data = {
				latex: 'x',
				fontSize: 7
			};

			const result = compileLatexSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject fontSize above maximum', () => {
			const data = {
				latex: 'x',
				fontSize: 73
			};

			const result = compileLatexSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// AUTHENTICATION
	// ============================================================================

	describe('loginFormSchema', () => {
		it('should accept valid login', () => {
			const data = {
				email: 'user@example.com',
				password: 'password123'
			};

			const result = loginFormSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid email', () => {
			const data = {
				email: 'not-an-email',
				password: 'password123'
			};

			const result = loginFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty password', () => {
			const data = {
				email: 'user@example.com',
				password: ''
			};

			const result = loginFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('signupFormSchema', () => {
		it('should accept valid signup', () => {
			const data = {
				email: 'new@example.com',
				password: 'SecurePass123',
				confirmPassword: 'SecurePass123'
			};

			const result = signupFormSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject password shorter than 8 characters', () => {
			const data = {
				email: 'user@example.com',
				password: 'Short1',
				confirmPassword: 'Short1'
			};

			const result = signupFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should require confirmPassword', () => {
			const data = {
				email: 'user@example.com',
				password: 'SecurePass123',
				confirmPassword: ''
			};

			const result = signupFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('requestPasswordResetSchema', () => {
		it('should accept valid email', () => {
			const data = {
				email: 'user@example.com'
			};

			const result = requestPasswordResetSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid email', () => {
			const data = {
				email: 'invalid'
			};

			const result = requestPasswordResetSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('updatePasswordSchema', () => {
		it('should accept valid password update', () => {
			const data = {
				password: 'NewSecurePass123',
				confirmPassword: 'NewSecurePass123'
			};

			const result = updatePasswordSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject short password', () => {
			const data = {
				password: 'Short1',
				confirmPassword: 'Short1'
			};

			const result = updatePasswordSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('updateProfileSchema', () => {
		it('should accept valid profile update', () => {
			const data = {
				firstname: 'John',
				lastname: 'Doe',
				avatar_url: 'https://example.com/avatar.jpg',
				grade: '6eme'
			};

			const result = updateProfileSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept null values', () => {
			const data = {
				firstname: null,
				lastname: null,
				avatar_url: null,
				grade: null
			};

			const result = updateProfileSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should convert empty strings to null', () => {
			const data = {
				firstname: '   ',
				lastname: '',
				avatar_url: '  ',
				grade: ''
			};

			const result = updateProfileSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.firstname).toBe(null);
				expect(result.data.lastname).toBe(null);
			}
		});
	});

	// ============================================================================
	// CLASSES
	// ============================================================================

	describe('schoolYearSchema', () => {
		it('should accept valid school year', () => {
			const validYears = ['2024-2025', '2025-2026', '2023-2024'];
			validYears.forEach((year) => {
				const result = schoolYearSchema.safeParse(year);
				expect(result.success).toBe(true);
			});
		});

		it('should reject invalid format', () => {
			const invalidYears = ['2024-25', '24-25', '2024/2025', '2024-2024'];
			invalidYears.forEach((year) => {
				const result = schoolYearSchema.safeParse(year);
				expect(result.success).toBe(false);
			});
		});

		it('should reject non-consecutive years', () => {
			const result = schoolYearSchema.safeParse('2024-2026');
			expect(result.success).toBe(false);
		});

		it('should reject reversed years', () => {
			const result = schoolYearSchema.safeParse('2025-2024');
			expect(result.success).toBe(false);
		});
	});

	describe('createClassSchema', () => {
		it('should accept valid class data', () => {
			const data = {
				name: '6ème A',
				grade: '6eme',
				school_year: '2024-2025',
				description: 'Math class for advanced students'
			};

			const result = createClassSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept class without description', () => {
			const data = {
				name: '5ème B',
				grade: '5eme',
				school_year: '2024-2025'
			};

			const result = createClassSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject empty name', () => {
			const data = {
				name: '   ',
				grade: '6eme',
				school_year: '2024-2025'
			};

			const result = createClassSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid grade', () => {
			const data = {
				name: 'Class A',
				grade: 'invalid',
				school_year: '2024-2025'
			};

			const result = createClassSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid school year', () => {
			const data = {
				name: 'Class A',
				grade: '6eme',
				school_year: '2024-2026'
			};

			const result = createClassSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('updateClassSchema', () => {
		it('should accept partial updates', () => {
			const updates = [
				{ name: 'Updated Name' },
				{ grade: '5eme' },
				{ school_year: '2025-2026' },
				{ description: 'New description' }
			];

			updates.forEach((update) => {
				const result = updateClassSchema.safeParse(update);
				expect(result.success).toBe(true);
			});
		});

		it('should accept empty object', () => {
			const result = updateClassSchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});

	describe('getClassStudentsSchema', () => {
		it('should accept full parameter', () => {
			const data = { full: 'true' };
			const result = getClassStudentsSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept empty object (transform undefined to false)', () => {
			const result = getClassStudentsSchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				// The transform converts undefined string to false boolean
				expect(result.data.full).toBe(false);
			}
		});

		it('should coerce string to boolean', () => {
			const data = { full: 'true' };
			const result = getClassStudentsSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.full).toBe(true);
				expect(typeof result.data.full).toBe('boolean');
			}
		});

		it('should transform "false" string to false boolean', () => {
			const data = { full: 'false' };
			const result = getClassStudentsSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.full).toBe(false);
			}
		});
	});

	describe('createScheduleEntrySchema', () => {
		it('should accept valid schedule entry', () => {
			const data = {
				class_id: '550e8400-e29b-41d4-a716-446655440000',
				day_of_week: '1',
				period_number: '3',
				start_time: '09:00',
				end_time: '10:00',
				subject: 'Mathematics',
				room: 'Room 101',
				notes: 'Bring calculator'
			};

			const result = createScheduleEntrySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept minimal schedule entry', () => {
			const data = {
				class_id: '550e8400-e29b-41d4-a716-446655440000',
				day_of_week: '0',
				period_number: '1',
				start_time: '08:00',
				end_time: '09:00',
				subject: null,
				room: null,
				notes: null
			};

			const result = createScheduleEntrySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid day_of_week', () => {
			const data = {
				class_id: '550e8400-e29b-41d4-a716-446655440000',
				day_of_week: '5', // Max is 4 (Israeli school week)
				period_number: '1',
				start_time: '08:00',
				end_time: '09:00'
			};

			const result = createScheduleEntrySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid time format', () => {
			const data = {
				class_id: '550e8400-e29b-41d4-a716-446655440000',
				day_of_week: '1',
				period_number: '1',
				start_time: '9:00', // Missing leading zero
				end_time: '10:00'
			};

			const result = createScheduleEntrySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject period_number exceeding max', () => {
			const data = {
				class_id: '550e8400-e29b-41d4-a716-446655440000',
				day_of_week: '1',
				period_number: '11', // Max is 10
				start_time: '08:00',
				end_time: '09:00'
			};

			const result = createScheduleEntrySchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('getClassWarningsSchema', () => {
		it('should accept valid classId and period_id', () => {
			const data = {
				classId: '550e8400-e29b-41d4-a716-446655440000',
				period_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = getClassWarningsSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid classId UUID', () => {
			const data = {
				classId: 'not-a-uuid',
				period_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = getClassWarningsSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Invalid class ID');
			}
		});

		it('should reject invalid period_id UUID', () => {
			const data = {
				classId: '550e8400-e29b-41d4-a716-446655440000',
				period_id: 'invalid-uuid'
			};

			const result = getClassWarningsSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Invalid period ID');
			}
		});

		it('should reject missing fields', () => {
			const missingFields = [
				{ classId: '550e8400-e29b-41d4-a716-446655440000' },
				{ period_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' },
				{}
			];

			missingFields.forEach((data) => {
				const result = getClassWarningsSchema.safeParse(data);
				expect(result.success).toBe(false);
			});
		});
	});

	describe('getClassGidouillesSchema', () => {
		it('should accept valid classId', () => {
			const data = {
				classId: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = getClassGidouillesSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid classId UUID', () => {
			const data = {
				classId: 'not-a-uuid'
			};

			const result = getClassGidouillesSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Invalid class ID');
			}
		});

		it('should reject missing classId', () => {
			const result = getClassGidouillesSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('should reject empty string classId', () => {
			const data = {
				classId: ''
			};

			const result = getClassGidouillesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});
});
