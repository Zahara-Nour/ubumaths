/**
 * Riddle API Routes Tests
 * Tests submission endpoint and auto-select endpoint
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Import the handlers (we'll mock dependencies)
import * as submitHandler from '../[id]/submit/+server';
import * as autoSelectHandler from '../auto-select-daily/+server';

// Mock the utility functions
vi.mock('$lib/utils/riddle-validator', () => ({
	validateRiddleAnswer: vi.fn()
}));

vi.mock('$lib/server/riddle-messages', () => ({
	createRiddleValidationMessage: vi.fn(),
	getRiddleTeacherId: vi.fn()
}));

vi.mock('$lib/server/riddle-auto-select', () => ({
	checkAndAutoSelectToday: vi.fn()
}));

// Client service : `serviceRpc` délègue au `rpc` du mock de chaque test, mais reste un
// espion distinct — il prouve que la soumission passe par le serveur, pas par l'élève.
// `serviceFrom` sert `riddle_solutions` : la réponse attendue n'est lisible que par lui.
const serviceRpc = vi.fn();
const serviceFrom = vi.fn();
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ rpc: serviceRpc, from: serviceFrom })
}));

vi.mock('$lib/server/buddy-xp-service', () => ({
	addBuddyXpFromExercise: vi.fn().mockResolvedValue(null)
}));

import { validateRiddleAnswer } from '$lib/utils/riddle-validator';
import { createRiddleValidationMessage, getRiddleTeacherId } from '$lib/server/riddle-messages';

describe('POST /api/riddles/[id]/submit', () => {
	const RIDDLE_UUID = '12345678-1234-4234-8234-123456789012';

	let mockSupabase: SupabaseClient;
	let mockSession: { user: { id: string }; session: { access_token: string } };
	let mockRequest: Request;
	/** Solutions servies par le client service (`riddle_solutions`). */
	let solutionRows: Array<{ riddle_id: string; answer: unknown; correction: string }> = [];

	/** Returns a mock for `from('profiles').select('*').eq(id).single()` used by requireAuth */
	function makeProfileMock() {
		return {
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: {
							id: 'student-123',
							role: 'teacher',
							consent_required: false,
							consent_granted_at: null,
							consent_grace_period_ends: null
						},
						error: null
					})
				})
			})
		};
	}

	beforeEach(() => {
		vi.clearAllMocks();

		mockSession = {
			user: { id: 'student-123' },
			session: { access_token: 'mock-token' }
		};

		mockSupabase = {
			from: vi.fn(),
			rpc: vi.fn()
		} as unknown as SupabaseClient;
		serviceRpc.mockImplementation((...args: unknown[]) => (mockSupabase.rpc as Mock)(...args));
		solutionRows = [];
		serviceFrom.mockImplementation((table: string) => {
			if (table !== 'riddle_solutions') throw new Error(`table inattendue : ${table}`);
			return {
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockResolvedValue({ data: solutionRows, error: null })
				})
			};
		});
	});

	it('should reject unauthenticated requests', async () => {
		mockRequest = new Request('http://localhost/api/riddles/riddle-123/submit', {
			method: 'POST',
			body: JSON.stringify({ answer: 42 })
		});

		await expect(
			submitHandler.POST({
				params: { id: 'riddle-123' },
				request: mockRequest,
				locals: {
					supabase: mockSupabase,
					safeGetSession: async () => ({ user: null, session: null })
				}
			} as never)
		).rejects.toThrow();
	});

	it('should reject requests without answer', async () => {
		mockRequest = new Request('http://localhost/api/riddles/riddle-123/submit', {
			method: 'POST',
			body: JSON.stringify({})
		});

		await expect(
			submitHandler.POST({
				params: { id: 'riddle-123' },
				request: mockRequest,
				locals: {
					supabase: mockSupabase,
					safeGetSession: async () => mockSession
				}
			} as never)
		).rejects.toThrow();
	});

	it('should handle automatic validation for correct answer', async () => {
		const mockAnswer = 42;
		const mockRiddle = {
			id: RIDDLE_UUID,
			riddle_number: 10,
			title: 'Test Riddle'
		};
		const expectedAnswer = { type: 'numerical', value: 42 };
		solutionRows = [{ riddle_id: RIDDLE_UUID, answer: expectedAnswer, correction: '' }];

		mockRequest = new Request(`http://localhost/api/riddles/${RIDDLE_UUID}/submit`, {
			method: 'POST',
			body: JSON.stringify({ answer: mockAnswer })
		});

		// Call order: requireAuth profiles fetch, then riddle fetch, then attempt fetch
		// 1. requireAuth: from('profiles').select('*').eq(id).single()
		(mockSupabase.from as Mock).mockReturnValueOnce(makeProfileMock());

		// 2. riddle fetch
		(mockSupabase.from as Mock).mockReturnValueOnce({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: mockRiddle,
						error: null
					})
				})
			})
		});

		// Mock validation
		(validateRiddleAnswer as Mock).mockReturnValue({
			isCorrect: true
		});

		// Mock RPC call — rpcResult must have attempt_id field
		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: [
				{
					attempt_id: 'attempt-456',
					theoretical_reward: 9,
					actual_reward: 9,
					is_first_win: true,
					week_best_reward: 9
				}
			],
			error: null
		});

		// 3. riddle_attempts fetch
		(mockSupabase.from as Mock).mockReturnValueOnce({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: {
							id: 'attempt-456',
							is_correct: true,
							gidouilles_awarded: 9
						},
						error: null
					})
				})
			})
		});

		const response = await submitHandler.POST({
			params: { id: RIDDLE_UUID },
			request: mockRequest,
			locals: {
				supabase: mockSupabase,
				safeGetSession: async () => mockSession
			}
		} as never);

		const result = await response.json();

		expect(result.success).toBe(true);
		expect(result.isCorrect).toBe(true);
		expect(result.message).toContain('Bravo');
		expect(validateRiddleAnswer).toHaveBeenCalledWith(mockAnswer, expectedAnswer);
	});

	it('should handle automatic validation for incorrect answer', async () => {
		const mockAnswer = 100;
		const mockRiddle = {
			id: RIDDLE_UUID,
			riddle_number: 10,
			title: 'Test Riddle'
		};
		const expectedAnswer = { type: 'numerical', value: 42 };
		solutionRows = [{ riddle_id: RIDDLE_UUID, answer: expectedAnswer, correction: '' }];

		mockRequest = new Request(`http://localhost/api/riddles/${RIDDLE_UUID}/submit`, {
			method: 'POST',
			body: JSON.stringify({ answer: mockAnswer })
		});

		// 1. requireAuth profiles fetch
		(mockSupabase.from as Mock).mockReturnValueOnce(makeProfileMock());

		// 2. riddle fetch
		(mockSupabase.from as Mock).mockReturnValueOnce({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: mockRiddle,
						error: null
					})
				})
			})
		});

		(validateRiddleAnswer as Mock).mockReturnValue({
			isCorrect: false
		});

		// RPC — incorrect answer: is_first_win irrelevant, rewards block skipped
		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: [
				{
					attempt_id: 'attempt-456',
					theoretical_reward: 0,
					actual_reward: 0,
					is_first_win: false,
					week_best_reward: 0
				}
			],
			error: null
		});

		// 3. riddle_attempts fetch
		(mockSupabase.from as Mock).mockReturnValueOnce({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: {
							id: 'attempt-456',
							is_correct: false,
							gidouilles_awarded: 0
						},
						error: null
					})
				})
			})
		});

		const response = await submitHandler.POST({
			params: { id: RIDDLE_UUID },
			request: mockRequest,
			locals: {
				supabase: mockSupabase,
				safeGetSession: async () => mockSession
			}
		} as never);

		const result = await response.json();

		expect(result.success).toBe(true);
		expect(result.isCorrect).toBe(false);
		expect(result.message).toContain('incorrecte');
	});

	it('should handle manual validation and create teacher message', async () => {
		const mockAnswer = 'My detailed answer';
		const mockRiddle = {
			id: RIDDLE_UUID,
			riddle_number: 10,
			title: 'Essay Riddle',
			created_by: 'teacher-456'
		};
		// Pas de réponse attendue : validation manuelle.
		solutionRows = [{ riddle_id: RIDDLE_UUID, answer: null, correction: '' }];

		mockRequest = new Request(`http://localhost/api/riddles/${RIDDLE_UUID}/submit`, {
			method: 'POST',
			body: JSON.stringify({ answer: mockAnswer })
		});

		// requireAuth fetches from('profiles') first (full profile with all fields),
		// then later the manual-validation branch fetches from('profiles') again (firstname/lastname only).
		// Use mockImplementation discriminated by table name.
		(mockSupabase.from as Mock).mockImplementation((table: string) => {
			if (table === 'riddles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: mockRiddle,
								error: null
							})
						})
					})
				};
			} else if (table === 'profiles') {
				// Handles both requireAuth (full profile) and student name fetch (firstname/lastname)
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: 'student-123',
									role: 'teacher',
									consent_required: false,
									consent_granted_at: null,
									consent_grace_period_ends: null,
									firstname: 'Alice',
									lastname: 'Student'
								},
								error: null
							})
						})
					})
				};
			} else if (table === 'riddle_attempts') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									id: 'attempt-789',
									is_correct: null,
									gidouilles_awarded: 0
								},
								error: null
							})
						})
					})
				};
			}
			// fallback for any unexpected table (e.g. buddy tables)
			return {
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({ data: null, error: null })
					})
				})
			};
		});

		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: [
				{
					attempt_id: 'attempt-789',
					theoretical_reward: 0,
					actual_reward: 0,
					is_first_win: false,
					week_best_reward: 0
				}
			],
			error: null
		});

		(getRiddleTeacherId as Mock).mockResolvedValue('teacher-456');
		(createRiddleValidationMessage as Mock).mockResolvedValue({
			success: true,
			messageId: 'message-999'
		});

		const response = await submitHandler.POST({
			params: { id: RIDDLE_UUID },
			request: mockRequest,
			locals: {
				supabase: mockSupabase,
				safeGetSession: async () => mockSession
			}
		} as never);

		const result = await response.json();

		expect(result.success).toBe(true);
		expect(result.isCorrect).toBeNull();
		expect(result.message).toContain('envoyée au professeur pour validation');

		expect(createRiddleValidationMessage).toHaveBeenCalledWith(mockSupabase, {
			attemptId: 'attempt-789',
			riddleId: RIDDLE_UUID,
			riddleNumber: 10,
			riddleTitle: 'Essay Riddle',
			studentId: 'student-123',
			studentName: 'Alice Student',
			teacherId: 'teacher-456'
		});
	});

	it('should handle non-existent riddle', async () => {
		mockRequest = new Request('http://localhost/api/riddles/non-existent/submit', {
			method: 'POST',
			body: JSON.stringify({ answer: 42 })
		});

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

		await expect(
			submitHandler.POST({
				params: { id: 'non-existent' },
				request: mockRequest,
				locals: {
					supabase: mockSupabase,
					safeGetSession: async () => mockSession
				}
			} as never)
		).rejects.toThrow();
	});

	it('énigme cachée par la RLS : 404, et le client service ne lit aucune solution', async () => {
		mockRequest = new Request(`http://localhost/api/riddles/${RIDDLE_UUID}/submit`, {
			method: 'POST',
			body: JSON.stringify({ answer: 42 })
		});

		(mockSupabase.from as Mock).mockReturnValueOnce(makeProfileMock());
		// La lecture de l'élève ne rend rien : brouillon, énigme d'un autre, non assignée.
		(mockSupabase.from as Mock).mockReturnValueOnce({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { code: 'PGRST116', message: 'no rows' }
					})
				})
			})
		});

		await expect(
			submitHandler.POST({
				params: { id: RIDDLE_UUID },
				request: mockRequest,
				locals: {
					supabase: mockSupabase,
					safeGetSession: async () => mockSession
				}
			} as never)
		).rejects.toMatchObject({ status: 404 });
		expect(serviceFrom).not.toHaveBeenCalled();
		expect(serviceRpc).not.toHaveBeenCalled();
	});

	it('should handle RPC submission errors', async () => {
		const mockRiddle = {
			id: 'riddle-123',
			answer: { type: 'numerical', value: 42 }
		};

		mockRequest = new Request('http://localhost/api/riddles/riddle-123/submit', {
			method: 'POST',
			body: JSON.stringify({ answer: 42 })
		});

		(mockSupabase.from as Mock).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: mockRiddle,
						error: null
					})
				})
			})
		});

		(validateRiddleAnswer as Mock).mockReturnValue({ isCorrect: true });

		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: null,
			error: { message: 'RPC failed' }
		});

		await expect(
			submitHandler.POST({
				params: { id: 'riddle-123' },
				request: mockRequest,
				locals: {
					supabase: mockSupabase,
					safeGetSession: async () => mockSession
				}
			} as never)
		).rejects.toThrow();
	});

	it('should call RPC with correct parameters', async () => {
		const mockAnswer = 'test answer';
		const mockRiddle = { id: RIDDLE_UUID };
		solutionRows = [
			{ riddle_id: RIDDLE_UUID, answer: { type: 'text', value: 'test answer' }, correction: '' }
		];

		mockRequest = new Request(`http://localhost/api/riddles/${RIDDLE_UUID}/submit`, {
			method: 'POST',
			body: JSON.stringify({ answer: mockAnswer })
		});

		// 1. requireAuth profiles fetch
		(mockSupabase.from as Mock).mockReturnValueOnce(makeProfileMock());

		// 2. riddle fetch
		(mockSupabase.from as Mock).mockReturnValueOnce({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: mockRiddle,
						error: null
					})
				})
			})
		});

		(validateRiddleAnswer as Mock).mockReturnValue({ isCorrect: true });

		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: [
				{
					attempt_id: 'attempt-123',
					theoretical_reward: 0,
					actual_reward: 0,
					is_first_win: false,
					week_best_reward: 0
				}
			],
			error: null
		});

		// 3. riddle_attempts fetch
		(mockSupabase.from as Mock).mockReturnValueOnce({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: 'attempt-123', is_correct: true },
						error: null
					})
				})
			})
		});

		await submitHandler.POST({
			params: { id: RIDDLE_UUID },
			request: mockRequest,
			locals: {
				supabase: mockSupabase,
				safeGetSession: async () => mockSession
			}
		} as never);

		expect(mockSupabase.rpc).toHaveBeenCalledWith('submit_riddle_attempt', {
			p_riddle_id: RIDDLE_UUID,
			p_student_id: 'student-123',
			p_submitted_answer: { value: mockAnswer },
			p_is_correct: true
		});
		// La justesse est écrite par le client service, jamais par le client de l'élève.
		expect(serviceRpc).toHaveBeenCalledWith('submit_riddle_attempt', expect.anything());
	});

	it('juge avec la solution lue par le client service, pas avec riddles.answer', async () => {
		// Avant l'étape C, la ligne `riddles` porte encore une ancienne réponse : elle ne
		// doit plus servir. Seule `riddle_solutions`, lue par le client service, fait foi.
		const staleRiddle = {
			id: RIDDLE_UUID,
			riddle_number: 3,
			title: 'Périmée',
			answer: { type: 'numerical', value: 1 }
		};
		const solutionAnswer = { type: 'numerical', value: 42 };
		solutionRows = [{ riddle_id: RIDDLE_UUID, answer: solutionAnswer, correction: 'secrète' }];

		const riddleSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: staleRiddle, error: null })
			})
		});
		(mockSupabase.from as Mock).mockImplementation((table: string) => {
			if (table === 'profiles') return makeProfileMock();
			if (table === 'riddles') return { select: riddleSelect };
			if (table === 'riddle_attempts')
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { id: 'attempt-1', is_correct: true },
								error: null
							})
						})
					})
				};
			throw new Error(`table inattendue côté élève : ${table}`);
		});
		(validateRiddleAnswer as Mock).mockReturnValue({ isCorrect: true });
		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: [{ attempt_id: 'attempt-1' }],
			error: null
		});

		await submitHandler.POST({
			params: { id: RIDDLE_UUID },
			request: new Request(`http://localhost/api/riddles/${RIDDLE_UUID}/submit`, {
				method: 'POST',
				body: JSON.stringify({ answer: 42 })
			}),
			locals: {
				supabase: mockSupabase,
				safeGetSession: async () => mockSession
			}
		} as never);

		expect(validateRiddleAnswer).toHaveBeenCalledWith(42, solutionAnswer);
		expect(serviceFrom).toHaveBeenCalledWith('riddle_solutions');
		// Le client de l'élève ne lit ni la réponse ni la correction dans `riddles`.
		const columns = String(riddleSelect.mock.calls[0][0]);
		expect(columns).not.toMatch(/\*|answer|correction/);
	});
});

describe('GET /api/riddles/auto-select-daily', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();

		mockSupabase = {
			from: vi.fn()
		} as unknown as SupabaseClient;
	});

	it('should return riddle status when riddle exists', async () => {
		const today = new Date().toISOString().split('T')[0];

		(mockSupabase.from as Mock).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: {
							riddle: {
								riddle_number: 42,
								title: 'Test Riddle',
								difficulty: 2
							}
						},
						error: null
					})
				})
			})
		});

		const response = await autoSelectHandler.GET({
			locals: { supabase: mockSupabase }
		} as never);

		const result = await response.json();

		expect(result.date).toBe(today);
		expect(result.hasRiddle).toBe(true);
		expect(result.riddle).toMatchObject({
			riddleNumber: 42,
			title: 'Test Riddle',
			difficulty: 2
		});
	});

	it('should return no riddle when none exists', async () => {
		const today = new Date().toISOString().split('T')[0];

		(mockSupabase.from as Mock).mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: null,
						error: null
					})
				})
			})
		});

		const response = await autoSelectHandler.GET({
			locals: { supabase: mockSupabase }
		} as never);

		const result = await response.json();

		expect(result.date).toBe(today);
		expect(result.hasRiddle).toBe(false);
		expect(result.riddle).toBeNull();
	});
});
