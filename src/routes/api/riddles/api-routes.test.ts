/**
 * Riddle API Routes Tests
 * Tests submission endpoint and auto-select endpoint
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Import the handlers (we'll mock dependencies)
import * as submitHandler from './[id]/submit/+server';
import * as autoSelectHandler from './auto-select-daily/+server';

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

import { validateRiddleAnswer } from '$lib/utils/riddle-validator';
import {
	createRiddleValidationMessage,
	getRiddleTeacherId
} from '$lib/server/riddle-messages';
import { checkAndAutoSelectToday } from '$lib/server/riddle-auto-select';

describe('POST /api/riddles/[id]/submit', () => {
	let mockSupabase: SupabaseClient;
	let mockSession: { user: { id: string } };
	let mockRequest: Request;

	beforeEach(() => {
		vi.clearAllMocks();

		mockSession = {
			user: { id: 'student-123' }
		};

		mockSupabase = {
			from: vi.fn(),
			rpc: vi.fn()
		} as unknown as SupabaseClient;
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
					safeGetSession: async () => ({ session: null })
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
					safeGetSession: async () => ({ session: mockSession })
				}
			} as never)
		).rejects.toThrow();
	});

	it('should handle automatic validation for correct answer', async () => {
		const mockAnswer = 42;
		const mockRiddle = {
			id: 'riddle-123',
			riddle_number: 10,
			title: 'Test Riddle',
			answer: {
				type: 'numerical',
				value: 42
			}
		};

		mockRequest = new Request('http://localhost/api/riddles/riddle-123/submit', {
			method: 'POST',
			body: JSON.stringify({ answer: mockAnswer })
		});

		// Mock riddle fetch
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

		// Mock validation
		(validateRiddleAnswer as Mock).mockReturnValue({
			isCorrect: true
		});

		// Mock RPC call
		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: 'attempt-456',
			error: null
		});

		// Mock attempt fetch
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
			params: { id: 'riddle-123' },
			request: mockRequest,
			locals: {
				supabase: mockSupabase,
				safeGetSession: async () => ({ session: mockSession })
			}
		} as never);

		const result = await response.json();

		expect(result.success).toBe(true);
		expect(result.isCorrect).toBe(true);
		expect(result.message).toContain('Bravo');
		expect(validateRiddleAnswer).toHaveBeenCalledWith(mockAnswer, mockRiddle.answer);
	});

	it('should handle automatic validation for incorrect answer', async () => {
		const mockAnswer = 100;
		const mockRiddle = {
			id: 'riddle-123',
			riddle_number: 10,
			title: 'Test Riddle',
			answer: {
				type: 'numerical',
				value: 42
			}
		};

		mockRequest = new Request('http://localhost/api/riddles/riddle-123/submit', {
			method: 'POST',
			body: JSON.stringify({ answer: mockAnswer })
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

		(validateRiddleAnswer as Mock).mockReturnValue({
			isCorrect: false
		});

		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: 'attempt-456',
			error: null
		});

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
			params: { id: 'riddle-123' },
			request: mockRequest,
			locals: {
				supabase: mockSupabase,
				safeGetSession: async () => ({ session: mockSession })
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
			id: 'riddle-123',
			riddle_number: 10,
			title: 'Essay Riddle',
			created_by: 'teacher-456',
			answer: null // Manual validation required
		};

		mockRequest = new Request('http://localhost/api/riddles/riddle-123/submit', {
			method: 'POST',
			body: JSON.stringify({ answer: mockAnswer })
		});

		// Mock riddle fetch
		const fromMock = vi.fn();
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
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
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
			return fromMock(table);
		});

		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: 'attempt-789',
			error: null
		});

		(getRiddleTeacherId as Mock).mockResolvedValue('teacher-456');
		(createRiddleValidationMessage as Mock).mockResolvedValue({
			success: true,
			messageId: 'message-999'
		});

		const response = await submitHandler.POST({
			params: { id: 'riddle-123' },
			request: mockRequest,
			locals: {
				supabase: mockSupabase,
				safeGetSession: async () => ({ session: mockSession })
			}
		} as never);

		const result = await response.json();

		expect(result.success).toBe(true);
		expect(result.isCorrect).toBeNull();
		expect(result.message).toContain('envoyée au professeur pour validation');

		expect(createRiddleValidationMessage).toHaveBeenCalledWith(mockSupabase, {
			attemptId: 'attempt-789',
			riddleId: 'riddle-123',
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
					safeGetSession: async () => ({ session: mockSession })
				}
			} as never)
		).rejects.toThrow();
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
					safeGetSession: async () => ({ session: mockSession })
				}
			} as never)
		).rejects.toThrow();
	});

	it('should call RPC with correct parameters', async () => {
		const mockAnswer = 'test answer';
		const mockRiddle = {
			id: 'riddle-123',
			answer: { type: 'text', value: 'test answer' }
		};

		mockRequest = new Request('http://localhost/api/riddles/riddle-123/submit', {
			method: 'POST',
			body: JSON.stringify({ answer: mockAnswer })
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
			data: 'attempt-123',
			error: null
		});

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
			params: { id: 'riddle-123' },
			request: mockRequest,
			locals: {
				supabase: mockSupabase,
				safeGetSession: async () => ({ session: mockSession })
			}
		} as never);

		expect(mockSupabase.rpc).toHaveBeenCalledWith('submit_riddle_attempt', {
			p_riddle_id: 'riddle-123',
			p_student_id: 'student-123',
			p_submitted_answer: { value: mockAnswer },
			p_is_correct: true
		});
	});
});

describe('POST /api/riddles/auto-select-daily', () => {
	let mockSupabase: SupabaseClient;
	let mockRequest: Request;

	beforeEach(() => {
		vi.clearAllMocks();

		mockSupabase = {
			from: vi.fn()
		} as unknown as SupabaseClient;
	});

	it('should successfully auto-select riddle', async () => {
		mockRequest = new Request('http://localhost/api/riddles/auto-select-daily', {
			method: 'POST'
		});

		(checkAndAutoSelectToday as Mock).mockResolvedValue({
			success: true,
			message: 'Énigme du jour sélectionnée automatiquement: riddle-123'
		});

		const response = await autoSelectHandler.POST({
			request: mockRequest,
			locals: { supabase: mockSupabase }
		} as never);

		const result = await response.json();

		expect(result.success).toBe(true);
		expect(result.message).toContain('sélectionnée automatiquement');
	});

	it('should skip if riddle already exists', async () => {
		mockRequest = new Request('http://localhost/api/riddles/auto-select-daily', {
			method: 'POST'
		});

		(checkAndAutoSelectToday as Mock).mockResolvedValue({
			success: true,
			message: 'Énigme du jour déjà définie'
		});

		const response = await autoSelectHandler.POST({
			request: mockRequest,
			locals: { supabase: mockSupabase }
		} as never);

		const result = await response.json();

		expect(result.success).toBe(true);
		expect(result.message).toBe('Énigme du jour déjà définie');
	});

	it('should handle auto-selection failure', async () => {
		mockRequest = new Request('http://localhost/api/riddles/auto-select-daily', {
			method: 'POST'
		});

		(checkAndAutoSelectToday as Mock).mockResolvedValue({
			success: false,
			message: 'Aucune énigme éligible disponible'
		});

		const response = await autoSelectHandler.POST({
			request: mockRequest,
			locals: { supabase: mockSupabase }
		} as never);

		const result = await response.json();

		expect(result.success).toBe(false);
		expect(result.message).toBe('Aucune énigme éligible disponible');
		expect(response.status).toBe(500);
	});

	it('should validate API key when configured', async () => {
		// Mock environment variable
		vi.stubEnv('VITE_RIDDLE_AUTO_SELECT_API_KEY', 'secret-key-123');

		mockRequest = new Request('http://localhost/api/riddles/auto-select-daily', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer wrong-key'
			}
		});

		await expect(
			autoSelectHandler.POST({
				request: mockRequest,
				locals: { supabase: mockSupabase }
			} as never)
		).rejects.toThrow();

		vi.unstubAllEnvs();
	});

	it('should accept valid API key', async () => {
		vi.stubEnv('VITE_RIDDLE_AUTO_SELECT_API_KEY', 'secret-key-123');

		mockRequest = new Request('http://localhost/api/riddles/auto-select-daily', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer secret-key-123'
			}
		});

		(checkAndAutoSelectToday as Mock).mockResolvedValue({
			success: true,
			message: 'Success'
		});

		const response = await autoSelectHandler.POST({
			request: mockRequest,
			locals: { supabase: mockSupabase }
		} as never);

		expect(response.status).toBe(200);

		vi.unstubAllEnvs();
	});

	it('should handle unexpected errors gracefully', async () => {
		mockRequest = new Request('http://localhost/api/riddles/auto-select-daily', {
			method: 'POST'
		});

		(checkAndAutoSelectToday as Mock).mockRejectedValue(new Error('Unexpected error'));

		const response = await autoSelectHandler.POST({
			request: mockRequest,
			locals: { supabase: mockSupabase }
		} as never);

		const result = await response.json();

		expect(result.success).toBe(false);
		expect(result.message).toBe('Erreur serveur');
		expect(response.status).toBe(500);
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
