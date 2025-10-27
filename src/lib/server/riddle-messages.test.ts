/**
 * Riddle Messages Tests
 * Tests automatic message creation for manual riddle validation
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
	createRiddleValidationMessage,
	getRiddleTeacherId,
	sendValidationResultMessage
} from './riddle-messages';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabase = () => {
	return {
		from: vi.fn()
	} as unknown as SupabaseClient;
};

describe('createRiddleValidationMessage', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	it('should create message with correct subject and body', async () => {
		let insertedData: unknown;

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data) => {
				insertedData = data;
				return {
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'message-123' },
							error: null
						})
					})
				};
			})
		});

		const result = await createRiddleValidationMessage(mockSupabase, {
			attemptId: 'attempt-456',
			riddleId: 'riddle-789',
			riddleNumber: 42,
			riddleTitle: 'Le Triangle Magique',
			studentId: 'student-001',
			studentName: 'Alice Dupont',
			teacherId: 'teacher-001'
		});

		expect(result.success).toBe(true);
		expect(result.messageId).toBe('message-123');

		// Verify inserted data structure
		expect(insertedData).toMatchObject({
			sender_id: 'student-001',
			recipient_id: 'teacher-001',
			subject: 'Validation énigme #42 - Alice Dupont',
			trigger_type: 'enigma_answer',
			trigger_metadata: {
				attempt_id: 'attempt-456',
				riddle_id: 'riddle-789',
				riddle_number: 42,
				riddle_title: 'Le Triangle Magique'
			}
		});
	});

	it('should include validation link in message body', async () => {
		let messageBody: string = '';

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data: { body: string }) => {
				messageBody = data.body;
				return {
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'message-123' },
							error: null
						})
					})
				};
			})
		});

		await createRiddleValidationMessage(mockSupabase, {
			attemptId: 'attempt-abc',
			riddleId: 'riddle-xyz',
			riddleNumber: 10,
			riddleTitle: 'Test Riddle',
			studentId: 'student-001',
			studentName: 'Bob Martin',
			teacherId: 'teacher-001'
		});

		expect(messageBody).toContain('/dashboard/teacher/riddles/validations/attempt-abc');
		expect(messageBody).toContain('Bob Martin');
		expect(messageBody).toContain('#10');
		expect(messageBody).toContain('Test Riddle');
	});

	it('should include styled validation button in HTML', async () => {
		let messageBody: string = '';

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data: { body: string }) => {
				messageBody = data.body;
				return {
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'message-123' },
							error: null
						})
					})
				};
			})
		});

		await createRiddleValidationMessage(mockSupabase, {
			attemptId: 'attempt-456',
			riddleId: 'riddle-789',
			riddleNumber: 5,
			riddleTitle: 'Test',
			studentId: 'student-001',
			studentName: 'Charlie',
			teacherId: 'teacher-001'
		});

		expect(messageBody).toContain('<a href=');
		expect(messageBody).toContain('background-color: #3b82f6');
		expect(messageBody).toContain('Voir et valider la réponse');
	});

	it('should handle database errors', async () => {
		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: 'Database insert failed' }
					})
				})
			})
		});

		const result = await createRiddleValidationMessage(mockSupabase, {
			attemptId: 'attempt-456',
			riddleId: 'riddle-789',
			riddleNumber: 5,
			riddleTitle: 'Test',
			studentId: 'student-001',
			studentName: 'Charlie',
			teacherId: 'teacher-001'
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe('Database insert failed');
	});

	it('should handle unexpected errors', async () => {
		(mockSupabase.from as Mock).mockImplementation(() => {
			throw new Error('Unexpected error');
		});

		const result = await createRiddleValidationMessage(mockSupabase, {
			attemptId: 'attempt-456',
			riddleId: 'riddle-789',
			riddleNumber: 5,
			riddleTitle: 'Test',
			studentId: 'student-001',
			studentName: 'Charlie',
			teacherId: 'teacher-001'
		});

		expect(result.success).toBe(false);
		expect(result.error).toContain('Unexpected error');
	});

	it('should create message with special characters in names', async () => {
		let insertedData: unknown;

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data) => {
				insertedData = data;
				return {
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'message-123' },
							error: null
						})
					})
				};
			})
		});

		await createRiddleValidationMessage(mockSupabase, {
			attemptId: 'attempt-456',
			riddleId: 'riddle-789',
			riddleNumber: 15,
			riddleTitle: "L'énigme de π & ∞",
			studentId: 'student-001',
			studentName: 'François-José María',
			teacherId: 'teacher-001'
		});

		const data = insertedData as { subject: string; body: string };
		expect(data.subject).toContain('François-José María');
		expect(data.body).toContain("L'énigme de π & ∞");
	});

	it('should use correct trigger type for enigma answer', async () => {
		let triggerType: string = '';

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data: { trigger_type: string }) => {
				triggerType = data.trigger_type;
				return {
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'message-123' },
							error: null
						})
					})
				};
			})
		});

		await createRiddleValidationMessage(mockSupabase, {
			attemptId: 'attempt-456',
			riddleId: 'riddle-789',
			riddleNumber: 5,
			riddleTitle: 'Test',
			studentId: 'student-001',
			studentName: 'Charlie',
			teacherId: 'teacher-001'
		});

		expect(triggerType).toBe('enigma_answer');
	});
});

describe('getRiddleTeacherId', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	it('should return teacher ID for existing riddle', async () => {
		(mockSupabase.from as Mock).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { created_by: 'teacher-123' },
						error: null
					})
				})
			})
		});

		const teacherId = await getRiddleTeacherId(mockSupabase, 'riddle-456');

		expect(teacherId).toBe('teacher-123');
	});

	it('should return null for non-existent riddle', async () => {
		(mockSupabase.from as Mock).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: 'Not found' }
					})
				})
			})
		});

		const teacherId = await getRiddleTeacherId(mockSupabase, 'non-existent');

		expect(teacherId).toBeNull();
	});

	it('should return null on database error', async () => {
		(mockSupabase.from as Mock).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: 'Database error' }
					})
				})
			})
		});

		const teacherId = await getRiddleTeacherId(mockSupabase, 'riddle-456');

		expect(teacherId).toBeNull();
	});

	it('should query correct table and field', async () => {
		let queriedTable: string = '';
		let selectedField: string = '';
		let filteredId: string = '';

		(mockSupabase.from as Mock).mockImplementation((table: string) => {
			queriedTable = table;
			return {
				select: vi.fn().mockImplementation((field: string) => {
					selectedField = field;
					return {
						eq: vi.fn().mockImplementation((column: string, value: string) => {
							if (column === 'id') filteredId = value;
							return {
								single: vi.fn().mockResolvedValue({
									data: { created_by: 'teacher-123' },
									error: null
								})
							};
						})
					};
				})
			};
		});

		await getRiddleTeacherId(mockSupabase, 'riddle-789');

		expect(queriedTable).toBe('riddles');
		expect(selectedField).toBe('created_by');
		expect(filteredId).toBe('riddle-789');
	});
});

describe('sendValidationResultMessage', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	it('should send success message when answer is correct', async () => {
		let insertedData: unknown;

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data) => {
				insertedData = data;
				return {
					error: null
				};
			})
		});

		const result = await sendValidationResultMessage(mockSupabase, {
			studentId: 'student-001',
			teacherId: 'teacher-001',
			riddleNumber: 42,
			riddleTitle: 'Triangle Mystery',
			isCorrect: true,
			gidouillesAwarded: 9
		});

		expect(result.success).toBe(true);

		const data = insertedData as { subject: string; body: string };
		expect(data.subject).toContain('Réponse validée');
		expect(data.subject).toContain('#42');
		expect(data.body).toContain('✓');
		expect(data.body).toContain('validée');
		expect(data.body).toContain('9 gidouilles');
	});

	it('should send failure message when answer is incorrect', async () => {
		let insertedData: unknown;

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data) => {
				insertedData = data;
				return {
					error: null
				};
			})
		});

		const result = await sendValidationResultMessage(mockSupabase, {
			studentId: 'student-001',
			teacherId: 'teacher-001',
			riddleNumber: 42,
			riddleTitle: 'Triangle Mystery',
			isCorrect: false,
			gidouillesAwarded: 0
		});

		expect(result.success).toBe(true);

		const data = insertedData as { subject: string; body: string };
		expect(data.subject).toContain('Réponse refusée');
		expect(data.body).toContain('✗');
		expect(data.body).toContain("n'a pas été validée");
		expect(data.body).toContain('réessayer');
	});

	it('should include teacher feedback when provided', async () => {
		let messageBody: string = '';

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data: { body: string }) => {
				messageBody = data.body;
				return {
					error: null
				};
			})
		});

		await sendValidationResultMessage(mockSupabase, {
			studentId: 'student-001',
			teacherId: 'teacher-001',
			riddleNumber: 10,
			riddleTitle: 'Test',
			isCorrect: true,
			gidouillesAwarded: 6,
			feedback: 'Excellent travail! Très bien expliqué.'
		});

		expect(messageBody).toContain('Commentaire du professeur');
		expect(messageBody).toContain('Excellent travail! Très bien expliqué.');
	});

	it('should not include feedback section when feedback is not provided', async () => {
		let messageBody: string = '';

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data: { body: string }) => {
				messageBody = data.body;
				return {
					error: null
				};
			})
		});

		await sendValidationResultMessage(mockSupabase, {
			studentId: 'student-001',
			teacherId: 'teacher-001',
			riddleNumber: 10,
			riddleTitle: 'Test',
			isCorrect: true,
			gidouillesAwarded: 6
		});

		expect(messageBody).not.toContain('Commentaire du professeur');
	});

	it('should use correct sender and recipient', async () => {
		let insertedData: unknown;

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data) => {
				insertedData = data;
				return {
					error: null
				};
			})
		});

		await sendValidationResultMessage(mockSupabase, {
			studentId: 'student-123',
			teacherId: 'teacher-456',
			riddleNumber: 5,
			riddleTitle: 'Test',
			isCorrect: true,
			gidouillesAwarded: 3
		});

		expect(insertedData).toMatchObject({
			sender_id: 'teacher-456',
			recipient_id: 'student-123',
			trigger_type: 'system_notification'
		});
	});

	it('should use system_notification trigger type', async () => {
		let triggerType: string = '';

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data: { trigger_type: string }) => {
				triggerType = data.trigger_type;
				return {
					error: null
				};
			})
		});

		await sendValidationResultMessage(mockSupabase, {
			studentId: 'student-001',
			teacherId: 'teacher-001',
			riddleNumber: 10,
			riddleTitle: 'Test',
			isCorrect: true,
			gidouillesAwarded: 6
		});

		expect(triggerType).toBe('system_notification');
	});

	it('should handle database errors', async () => {
		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockReturnValue({
				error: { message: 'Insert failed' }
			})
		});

		const result = await sendValidationResultMessage(mockSupabase, {
			studentId: 'student-001',
			teacherId: 'teacher-001',
			riddleNumber: 10,
			riddleTitle: 'Test',
			isCorrect: true,
			gidouillesAwarded: 6
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe('Insert failed');
	});

	it('should handle unexpected errors', async () => {
		(mockSupabase.from as Mock).mockImplementation(() => {
			throw new Error('Unexpected error');
		});

		const result = await sendValidationResultMessage(mockSupabase, {
			studentId: 'student-001',
			teacherId: 'teacher-001',
			riddleNumber: 10,
			riddleTitle: 'Test',
			isCorrect: true,
			gidouillesAwarded: 6
		});

		expect(result.success).toBe(false);
		expect(result.error).toContain('Unexpected error');
	});

	it('should show different gidouilles amounts correctly', async () => {
		const testCases = [
			{ gidouilles: 9, expected: '9 gidouilles' }, // 1st attempt, difficulty 3
			{ gidouilles: 6, expected: '6 gidouilles' }, // 2nd attempt, difficulty 3
			{ gidouilles: 3, expected: '3 gidouilles' }, // 3rd+ attempt, difficulty 3
			{ gidouilles: 1, expected: '1 gidouilles' } // 3rd+ attempt, difficulty 1
		];

		for (const { gidouilles, expected } of testCases) {
			let messageBody: string = '';

			(mockSupabase.from as Mock).mockReturnValue({
				insert: vi.fn().mockImplementation((data: { body: string }) => {
					messageBody = data.body;
					return {
						error: null
					};
				})
			});

			await sendValidationResultMessage(mockSupabase, {
				studentId: 'student-001',
				teacherId: 'teacher-001',
				riddleNumber: 10,
				riddleTitle: 'Test',
				isCorrect: true,
				gidouillesAwarded: gidouilles
			});

			expect(messageBody).toContain(expected);
		}
	});

	it('should include riddle information in body', async () => {
		let messageBody: string = '';

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data: { body: string }) => {
				messageBody = data.body;
				return {
					error: null
				};
			})
		});

		await sendValidationResultMessage(mockSupabase, {
			studentId: 'student-001',
			teacherId: 'teacher-001',
			riddleNumber: 99,
			riddleTitle: 'La Grande Énigme',
			isCorrect: true,
			gidouillesAwarded: 9
		});

		expect(messageBody).toContain('#99');
		expect(messageBody).toContain('La Grande Énigme');
	});

	it('should handle HTML special characters in feedback', async () => {
		let messageBody: string = '';

		(mockSupabase.from as Mock).mockReturnValue({
			insert: vi.fn().mockImplementation((data: { body: string }) => {
				messageBody = data.body;
				return {
					error: null
				};
			})
		});

		await sendValidationResultMessage(mockSupabase, {
			studentId: 'student-001',
			teacherId: 'teacher-001',
			riddleNumber: 10,
			riddleTitle: 'Test',
			isCorrect: true,
			gidouillesAwarded: 6,
			feedback: 'Great use of <strong>formulas</strong> & symbols like π!'
		});

		// Should preserve HTML in feedback (it's already trusted teacher content)
		expect(messageBody).toContain('Great use of <strong>formulas</strong> & symbols like π!');
	});
});
