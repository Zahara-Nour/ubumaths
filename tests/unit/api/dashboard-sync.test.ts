/**
 * Unit tests for Teacher Dashboard Sync API Endpoint
 *
 * Tests the GET /api/teacher/dashboard-sync endpoint that fetches
 * both warnings and gidouilles data in a single request.
 *
 * Coverage:
 * 1. Authentication check (401 if not logged in)
 * 2. Validation check (400 if missing classId or periodId)
 * 3. Authorization check (403 if teacher doesn't own class)
 * 4. Successful data fetch (both warnings and gidouilles)
 * 5. Parallel execution optimization
 * 6. Response format validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// Mock @sveltejs/kit error function
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		error: (status: number, message: string) => {
			const err = new Error(message) as Error & { status: number; body: { message: string } };
			err.status = status;
			err.body = { message };
			return err;
		}
	};
});

// Mock cache modules
const mockGetClassWarnings = vi.fn();
const mockGetClassGidouilles = vi.fn();

vi.mock('$lib/server/cache/warnings', () => ({
	getClassWarnings: mockGetClassWarnings
}));

vi.mock('$lib/server/cache/gidouilles', () => ({
	getClassGidouilles: mockGetClassGidouilles
}));

// Import the endpoint handler
const { GET } = await import('$lib/../routes/api/teacher/dashboard-sync/+server');

describe('Teacher Dashboard Sync API', () => {
	// Helper to create mock request event
	const createMockEvent = (params: {
		authenticated?: boolean;
		userId?: string;
		queryParams?: Record<string, string>;
	}): RequestEvent => {
		const { authenticated = true, userId = 'teacher-user-id', queryParams = {} } = params;

		const url = new URL('http://localhost:5175/api/teacher/dashboard-sync');
		Object.entries(queryParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});

		const mockSupabase = {
			from: vi.fn()
		} as unknown as SupabaseClient<Database>;

		return {
			url,
			locals: {
				safeGetSession: async () => ({
					user: authenticated ? { id: userId } : null,
					session: authenticated ? {} : null
				}),
				supabase: mockSupabase
			},
			request: {} as Request
		} as unknown as RequestEvent;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Authentication Check', () => {
		it('should return 401 if not authenticated', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: false,
				queryParams: { classId: 'class-123', periodId: 'period-456' }
			});

			// Act & Assert
			await expect(GET(event)).rejects.toThrow('Non authentifié');

			// Verify error status
			try {
				await GET(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 401
				});
			}
		});
	});

	describe('Query Parameter Validation', () => {
		it('should return 400 if classId is missing', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				queryParams: { periodId: 'period-456' } // Missing classId
			});

			// Act & Assert
			await expect(GET(event)).rejects.toThrow('Class ID requis');

			try {
				await GET(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 400,
					body: { message: 'Class ID requis (query param: classId)' }
				});
			}
		});

		it('should return 400 if periodId is missing', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				queryParams: { classId: 'class-123' } // Missing periodId
			});

			// Act & Assert
			await expect(GET(event)).rejects.toThrow('Period ID requis');

			try {
				await GET(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 400,
					body: { message: 'Period ID requis (query param: periodId)' }
				});
			}
		});

		it('should return 400 if both parameters are missing', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				queryParams: {} // No parameters
			});

			// Act & Assert
			await expect(GET(event)).rejects.toThrow('Class ID requis');
		});
	});

	describe('Authorization Check', () => {
		it('should return 403 if teacher does not own class', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				userId: 'teacher-123',
				queryParams: { classId: 'class-456', periodId: 'period-789' }
			});

			// Mock getClassWarnings to throw 403 error (teacher doesn't own class)
			const authError = new Error('You do not have permission to view warnings for this class');
			(authError as Error & { status: number }).status = 403;
			mockGetClassWarnings.mockRejectedValue(authError);

			// Act & Assert
			await expect(GET(event)).rejects.toThrow(
				'You do not have permission to view warnings for this class'
			);

			try {
				await GET(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 403
				});
			}
		});
	});

	describe('Successful Data Fetch', () => {
		it('should return combined warnings and gidouilles data', async () => {
			// Arrange
			const classId = 'class-123';
			const periodId = 'period-456';
			const teacherId = 'teacher-789';

			const event = createMockEvent({
				authenticated: true,
				userId: teacherId,
				queryParams: { classId, periodId }
			});

			// Mock warnings data (Map structure)
			const mockWarnings = new Map([
				[
					'student-1',
					{
						C: 1,
						M: 0,
						R: 2,
						T: 0,
						total: 3,
						score: 17,
						warnings: []
					}
				],
				[
					'student-2',
					{
						C: 0,
						M: 1,
						R: 0,
						T: 1,
						total: 2,
						score: 18,
						warnings: []
					}
				]
			]);

			// Mock gidouilles data (array structure)
			const mockGidouilles = [
				{
					student_id: 'student-1',
					gidouilles: 150,
					vip_cards: { vip1: 2, vip2: 1 }
				},
				{
					student_id: 'student-2',
					gidouilles: 200,
					vip_cards: { vip1: 3 }
				}
			];

			mockGetClassWarnings.mockResolvedValue(mockWarnings);
			mockGetClassGidouilles.mockResolvedValue(mockGidouilles);

			// Act
			const response = await GET(event);
			const data = await response.json();

			// Assert: Response structure
			expect(data).toHaveProperty('success', true);
			expect(data).toHaveProperty('warnings');
			expect(data).toHaveProperty('gidouilles');

			// Assert: Warnings data converted to object
			expect(data.warnings['student-1']).toEqual({
				C: 1,
				M: 0,
				R: 2,
				T: 0,
				total: 3,
				score: 17,
				warnings: []
			});

			// Assert: Gidouilles data with VIP cards count
			expect(data.gidouilles['student-1']).toEqual({
				gidouilles_count: 150,
				vip_cards: 3 // 2 + 1
			});
			expect(data.gidouilles['student-2']).toEqual({
				gidouilles_count: 200,
				vip_cards: 3
			});

			// Assert: Cache functions called with correct params
			expect(mockGetClassWarnings).toHaveBeenCalledWith(
				classId,
				periodId,
				teacherId,
				expect.anything()
			);
			expect(mockGetClassGidouilles).toHaveBeenCalledWith(classId, teacherId, expect.anything());
		});

		it('should handle empty warnings and gidouilles', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				queryParams: { classId: 'empty-class', periodId: 'period-123' }
			});

			mockGetClassWarnings.mockResolvedValue(new Map());
			mockGetClassGidouilles.mockResolvedValue([]);

			// Act
			const response = await GET(event);
			const data = await response.json();

			// Assert: Empty data structures
			expect(data.success).toBe(true);
			expect(data.warnings).toEqual({});
			expect(data.gidouilles).toEqual({});
		});

		it('should handle students with zero VIP cards', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				queryParams: { classId: 'class-123', periodId: 'period-456' }
			});

			mockGetClassWarnings.mockResolvedValue(new Map());
			mockGetClassGidouilles.mockResolvedValue([
				{
					student_id: 'student-1',
					gidouilles: 100,
					vip_cards: {} // No VIP cards
				}
			]);

			// Act
			const response = await GET(event);
			const data = await response.json();

			// Assert: VIP cards count is 0
			expect(data.gidouilles['student-1'].vip_cards).toBe(0);
		});
	});

	describe('Parallel Execution', () => {
		it('should fetch warnings and gidouilles in parallel', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				queryParams: { classId: 'class-123', periodId: 'period-456' }
			});

			let warningsResolved = false;
			let gidouillesResolved = false;
			const executionOrder: string[] = [];

			// Mock with delays to verify parallel execution
			mockGetClassWarnings.mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 50));
				executionOrder.push('warnings');
				warningsResolved = true;
				return new Map();
			});

			mockGetClassGidouilles.mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 50));
				executionOrder.push('gidouilles');
				gidouillesResolved = true;
				return [];
			});

			// Act
			const start = performance.now();
			await GET(event);
			const duration = performance.now() - start;

			// Assert: Both resolved (parallel execution)
			expect(warningsResolved).toBe(true);
			expect(gidouillesResolved).toBe(true);

			// Assert: Execution time should be ~50ms (parallel), not ~100ms (sequential)
			// Allow 30ms margin for test overhead
			expect(duration).toBeLessThan(80);
			expect(executionOrder).toHaveLength(2);
		});
	});

	describe('Error Handling', () => {
		it('should return 500 if warnings fetch fails', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				queryParams: { classId: 'class-123', periodId: 'period-456' }
			});

			mockGetClassWarnings.mockRejectedValue(new Error('Database connection failed'));
			mockGetClassGidouilles.mockResolvedValue([]);

			// Act & Assert
			await expect(GET(event)).rejects.toThrow(
				'Erreur lors du chargement des données du tableau de bord'
			);

			try {
				await GET(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 500
				});
			}
		});

		it('should return 500 if gidouilles fetch fails', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				queryParams: { classId: 'class-123', periodId: 'period-456' }
			});

			mockGetClassWarnings.mockResolvedValue(new Map());
			mockGetClassGidouilles.mockRejectedValue(new Error('Redis timeout'));

			// Act & Assert
			await expect(GET(event)).rejects.toThrow(
				'Erreur lors du chargement des données du tableau de bord'
			);
		});

		it('should preserve error status codes from cache helpers', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				queryParams: { classId: 'forbidden-class', periodId: 'period-123' }
			});

			// Mock 403 error from getClassWarnings (teacher doesn't own class)
			const forbiddenError = new Error('Access denied') as Error & { status: number };
			forbiddenError.status = 403;
			mockGetClassWarnings.mockRejectedValue(forbiddenError);

			// Act & Assert
			try {
				await GET(event);
			} catch (err) {
				expect(err).toMatchObject({
					status: 403
				});
			}
		});
	});

	describe('Response Format', () => {
		it('should match expected TypeScript interface', async () => {
			// Arrange
			const event = createMockEvent({
				authenticated: true,
				queryParams: { classId: 'class-123', periodId: 'period-456' }
			});

			mockGetClassWarnings.mockResolvedValue(
				new Map([
					[
						'student-1',
						{
							C: 1,
							M: 2,
							R: 0,
							T: 1,
							total: 4,
							score: 16,
							warnings: []
						}
					]
				])
			);

			mockGetClassGidouilles.mockResolvedValue([
				{
					student_id: 'student-1',
					gidouilles: 250,
					vip_cards: { vip1: 5 }
				}
			]);

			// Act
			const response = await GET(event);
			const data = await response.json();

			// Assert: Top-level structure
			expect(data).toEqual({
				success: true,
				warnings: expect.any(Object),
				gidouilles: expect.any(Object)
			});

			// Assert: Warnings structure
			const warningData = data.warnings['student-1'];
			expect(warningData).toHaveProperty('C');
			expect(warningData).toHaveProperty('M');
			expect(warningData).toHaveProperty('R');
			expect(warningData).toHaveProperty('T');
			expect(warningData).toHaveProperty('total');
			expect(warningData).toHaveProperty('score');
			expect(warningData).toHaveProperty('warnings');

			// Assert: Gidouilles structure
			const gidouillesData = data.gidouilles['student-1'];
			expect(gidouillesData).toEqual({
				gidouilles_count: expect.any(Number),
				vip_cards: expect.any(Number)
			});
		});
	});
});
