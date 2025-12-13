/**
 * Admin School Configuration API Tests
 * Phase 6: Test suite for PUT /api/admin/schools/[schoolId]/config
 *
 * Tests authentication, authorization, validation, and database operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent as _RequestEvent } from '@sveltejs/kit';
import { GET, PUT } from './+server';
import { DEFAULT_WEEK_CONFIG } from '$lib/utils/week-config';
import { DEFAULT_TIMEZONE } from '$lib/utils/timezones';
import { createMockSupabase } from '$tests/helpers';

// Helper to create request context - simplified to match actual RequestEvent structure
type RouteParams = { schoolId: string };
type _RoutePath = '/api/admin/schools/[schoolId]/config';

interface RequestContext {
	request: Request;
	params: RouteParams;
	locals: {
		user: { id: string } | null;
		profile: { id: string; role: string } | null;
		supabase: ReturnType<typeof createMockSupabase>;
	};
}

// Helper to expect SvelteKit error with specific status
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function expectError(promise: Promise<any> | any, expectedStatus: number) {
	try {
		await promise;
		expect.fail('Should have thrown an error');
	} catch (err) {
		expect(err).toHaveProperty('status', expectedStatus);
	}
}

describe('GET /api/admin/schools/[schoolId]/config', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;
	let mockRequest: Request;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabase = createMockSupabase();
		mockRequest = new Request('http://localhost/api/admin/schools/test-id/config', {
			method: 'GET'
		});
	});

	// ============================================================
	// Authentication Tests
	// ============================================================
	describe('Authentication', () => {
		it('should return 401 when user is not authenticated', async () => {
			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: 'school-123' },
				locals: {
					user: null,
					profile: null,
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(GET(context as any), 401);
		});
	});

	// ============================================================
	// Authorization Tests
	// ============================================================
	describe('Authorization', () => {
		it('should return 403 when user is not admin', async () => {
			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: 'school-123' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'teacher' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(GET(context as any), 403);
		});

		it('should return 403 when profile is missing', async () => {
			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: 'school-123' },
				locals: {
					user: { id: 'user-1' },
					profile: null,
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(GET(context as any), 403);
		});
	});

	// ============================================================
	// Input Validation Tests
	// ============================================================
	describe('Input Validation', () => {
		it('should return 400 for invalid schoolId format', async () => {
			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: 'not-a-uuid' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(GET(context as any), 400);
		});

		it('should return 400 for empty schoolId', async () => {
			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: '' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(GET(context as any), 400);
		});
	});

	// ============================================================
	// Happy Path Tests
	// ============================================================
	describe('Happy Path', () => {
		it('should return school configuration successfully', async () => {
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';
			const mockSchool = {
				id: schoolId,
				name: 'Test School',
				timezone: 'America/New_York',
				timetable: {
					periods: [],
					week_config: DEFAULT_WEEK_CONFIG
				}
			};

			// Re-create mock to get fresh instance
			mockSupabase = createMockSupabase();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			((mockSupabase as any).single as any).mockResolvedValue({
				data: mockSchool,
				error: null
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(context as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toEqual({
				success: true,
				school: {
					id: schoolId,
					name: 'Test School',
					timezone: 'America/New_York',
					timetable: {
						periods: [],
						week_config: DEFAULT_WEEK_CONFIG
					}
				}
			});
		});

		it('should use default timezone when timezone is null', async () => {
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';
			const mockSchool = {
				id: schoolId,
				name: 'Test School',
				timezone: null,
				timetable: null
			};

			mockSupabase = createMockSupabase();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			((mockSupabase as any).single as any).mockResolvedValue({
				data: mockSchool,
				error: null
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(context as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.school.timezone).toBe(DEFAULT_TIMEZONE);
			expect(body.school.timetable).toEqual({
				periods: [],
				week_config: DEFAULT_WEEK_CONFIG
			});
		});
	});

	// ============================================================
	// Error Handling Tests
	// ============================================================
	describe('Error Handling', () => {
		it('should return 404 when school not found', async () => {
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';

			mockSupabase = createMockSupabase();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			((mockSupabase as any).single as any).mockResolvedValue({
				data: null,
				error: { message: 'Not found', details: '', hint: '', code: '' }
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(GET(context as any), 404);
		});
	});
});

describe('PUT /api/admin/schools/[schoolId]/config', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;
	let mockRequest: Request;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabase = createMockSupabase();
	});

	// Helper to create valid PUT request
	function createPutRequest(body: unknown): Request {
		return new Request('http://localhost/api/admin/schools/test-id/config', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
	}

	// ============================================================
	// Authentication Tests
	// ============================================================
	describe('Authentication', () => {
		it('should return 401 when user is not authenticated', async () => {
			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: DEFAULT_WEEK_CONFIG
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: 'school-123' },
				locals: {
					user: null,
					profile: null,
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 401);
		});
	});

	// ============================================================
	// Authorization Tests
	// ============================================================
	describe('Authorization', () => {
		it('should return 403 when user is not admin', async () => {
			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: DEFAULT_WEEK_CONFIG
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: 'school-123' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'teacher' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 403);
		});

		it('should return 403 when profile is missing', async () => {
			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: DEFAULT_WEEK_CONFIG
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: 'school-123' },
				locals: {
					user: { id: 'user-1' },
					profile: null,
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 403);
		});
	});

	// ============================================================
	// Input Validation Tests
	// ============================================================
	describe('Input Validation', () => {
		it('should return 400 for invalid schoolId format', async () => {
			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: DEFAULT_WEEK_CONFIG
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: 'not-a-uuid' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 400);
		});

		it('should return 400 for invalid JSON body', async () => {
			mockRequest = new Request('http://localhost/api/admin/schools/test-id/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: 'invalid json{'
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: '550e8400-e29b-41d4-a716-446655440000' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 400);
		});

		it('should return 400 for invalid timezone', async () => {
			mockRequest = createPutRequest({
				timezone: 'Invalid/Timezone',
				week_config: DEFAULT_WEEK_CONFIG
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: '550e8400-e29b-41d4-a716-446655440000' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 400);
		});

		it('should return 400 for missing timezone', async () => {
			mockRequest = createPutRequest({
				week_config: DEFAULT_WEEK_CONFIG
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: '550e8400-e29b-41d4-a716-446655440000' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 400);
		});

		it('should return 400 for missing week_config', async () => {
			mockRequest = createPutRequest({
				timezone: 'Europe/Paris'
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: '550e8400-e29b-41d4-a716-446655440000' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 400);
		});

		it('should return 400 for invalid week_config - missing school_days', async () => {
			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: {
					first_day: 1,
					last_day: 5,
					school_days: [],
					weekend_days: [0, 6]
				}
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: '550e8400-e29b-41d4-a716-446655440000' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 400);
		});

		it('should return 400 for invalid week_config - overlapping days', async () => {
			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: {
					first_day: 1,
					last_day: 5,
					school_days: [1, 2, 3, 4, 5, 6],
					weekend_days: [0, 6]
				}
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: '550e8400-e29b-41d4-a716-446655440000' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 400);
		});

		it('should return 400 for invalid week_config - missing days', async () => {
			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: {
					first_day: 1,
					last_day: 5,
					school_days: [1, 2, 3, 4, 5],
					weekend_days: [6]
				}
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: '550e8400-e29b-41d4-a716-446655440000' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 400);
		});

		it('should return 400 for invalid week_config - days out of range', async () => {
			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: {
					first_day: 1,
					last_day: 5,
					school_days: [1, 2, 3, 4, 5, 7],
					weekend_days: [0, 6]
				}
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: '550e8400-e29b-41d4-a716-446655440000' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 400);
		});

		it('should return 400 for invalid week_config - first_day out of range', async () => {
			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: {
					first_day: -1,
					last_day: 5,
					school_days: [1, 2, 3, 4, 5],
					weekend_days: [0, 6]
				}
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId: '550e8400-e29b-41d4-a716-446655440000' },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 400);
		});
	});

	// ============================================================
	// Happy Path Tests
	// ============================================================
	describe('Happy Path', () => {
		it('should update school configuration successfully', async () => {
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';
			const requestBody = {
				timezone: 'America/New_York',
				week_config: {
					first_day: 1,
					last_day: 5,
					school_days: [1, 2, 3, 4, 5],
					weekend_days: [0, 6]
				}
			};

			mockRequest = createPutRequest(requestBody);

			const existingSchool = {
				id: schoolId,
				name: 'Test School',
				timezone: 'Europe/Paris',
				timetable: {
					periods: [{ start: '08:00', end: '09:00' }],
					week_config: DEFAULT_WEEK_CONFIG
				}
			};

			const updatedSchool = {
				id: schoolId,
				name: 'Test School',
				timezone: 'America/New_York',
				timetable: {
					periods: [{ start: '08:00', end: '09:00' }],
					week_config: requestBody.week_config
				}
			};

			mockSupabase = createMockSupabase();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			((mockSupabase as any).single as any)
				.mockResolvedValueOnce({ data: existingSchool, error: null })
				.mockResolvedValueOnce({ data: updatedSchool, error: null });

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await PUT(context as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.success).toBe(true);
			expect(body.school.timezone).toBe('America/New_York');
		});

		it('should handle school with no existing timetable', async () => {
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';
			const requestBody = {
				timezone: 'Asia/Tokyo',
				week_config: DEFAULT_WEEK_CONFIG
			};

			mockRequest = createPutRequest(requestBody);

			const existingSchool = {
				id: schoolId,
				name: 'Test School',
				timezone: 'Europe/Paris',
				timetable: null
			};

			const updatedSchool = {
				id: schoolId,
				name: 'Test School',
				timezone: 'Asia/Tokyo',
				timetable: {
					periods: [],
					week_config: DEFAULT_WEEK_CONFIG
				}
			};

			mockSupabase = createMockSupabase();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			((mockSupabase as any).single as any)
				.mockResolvedValueOnce({ data: existingSchool, error: null })
				.mockResolvedValueOnce({ data: updatedSchool, error: null });

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await PUT(context as any);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.school.timezone).toBe('Asia/Tokyo');
		});

		it('should accept Israeli week configuration', async () => {
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';
			const israeliWeekConfig = {
				first_day: 0,
				last_day: 6,
				school_days: [0, 1, 2, 3, 4],
				weekend_days: [5, 6]
			};

			mockRequest = createPutRequest({
				timezone: 'Asia/Jerusalem',
				week_config: israeliWeekConfig
			});

			const existingSchool = {
				id: schoolId,
				name: 'Israeli School',
				timezone: 'Europe/Paris',
				timetable: { periods: [] }
			};

			const updatedSchool = {
				id: schoolId,
				name: 'Israeli School',
				timezone: 'Asia/Jerusalem',
				timetable: {
					periods: [],
					week_config: israeliWeekConfig
				}
			};

			mockSupabase = createMockSupabase();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			((mockSupabase as any).single as any)
				.mockResolvedValueOnce({ data: existingSchool, error: null })
				.mockResolvedValueOnce({ data: updatedSchool, error: null });

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await PUT(context as any);
			expect(response.status).toBe(200);
		});

		it('should accept Middle East week configuration', async () => {
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';
			const middleEastConfig = {
				first_day: 0,
				last_day: 4,
				school_days: [0, 1, 2, 3, 4],
				weekend_days: [5, 6]
			};

			mockRequest = createPutRequest({
				timezone: 'Asia/Dubai',
				week_config: middleEastConfig
			});

			const existingSchool = {
				id: schoolId,
				name: 'Dubai School',
				timezone: 'Europe/Paris',
				timetable: { periods: [] }
			};

			const updatedSchool = {
				id: schoolId,
				name: 'Dubai School',
				timezone: 'Asia/Dubai',
				timetable: {
					periods: [],
					week_config: middleEastConfig
				}
			};

			mockSupabase = createMockSupabase();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			((mockSupabase as any).single as any)
				.mockResolvedValueOnce({ data: existingSchool, error: null })
				.mockResolvedValueOnce({ data: updatedSchool, error: null });

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await PUT(context as any);
			expect(response.status).toBe(200);
		});
	});

	// ============================================================
	// Error Handling Tests
	// ============================================================
	describe('Error Handling', () => {
		it('should return 404 when school not found', async () => {
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';

			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: DEFAULT_WEEK_CONFIG
			});

			mockSupabase = createMockSupabase();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			((mockSupabase as any).single as any).mockResolvedValue({
				data: null,
				error: { message: 'Not found', details: '', hint: '', code: '' }
			});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 404);
		});

		it('should return 500 when update fails', async () => {
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';

			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: DEFAULT_WEEK_CONFIG
			});

			const existingSchool = {
				id: schoolId,
				name: 'Test School',
				timezone: 'Europe/Paris',
				timetable: { periods: [] }
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			vi.mocked(mockSupabase as any)
				.single.mockResolvedValueOnce({ data: existingSchool, error: null })
				.mockResolvedValueOnce({
					data: null,
					error: { message: 'Update failed', details: '', hint: '', code: '' }
				});

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expectError(PUT(context as any), 500);
		});
	});

	// ============================================================
	// Edge Cases
	// ============================================================
	describe('Edge Cases', () => {
		it('should handle single school day configuration', async () => {
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';
			const singleDayConfig = {
				first_day: 1,
				last_day: 1,
				school_days: [1],
				weekend_days: [0, 2, 3, 4, 5, 6]
			};

			mockRequest = createPutRequest({
				timezone: 'Europe/Paris',
				week_config: singleDayConfig
			});

			const existingSchool = {
				id: schoolId,
				name: 'Test School',
				timezone: 'Europe/Paris',
				timetable: { periods: [] }
			};

			const updatedSchool = {
				id: schoolId,
				name: 'Test School',
				timezone: 'Europe/Paris',
				timetable: {
					periods: [],
					week_config: singleDayConfig
				}
			};

			mockSupabase = createMockSupabase();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			((mockSupabase as any).single as any)
				.mockResolvedValueOnce({ data: existingSchool, error: null })
				.mockResolvedValueOnce({ data: updatedSchool, error: null });

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await PUT(context as any);
			expect(response.status).toBe(200);
		});

		it('should preserve existing periods when updating configuration', async () => {
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';
			const periods = [
				{ start: '08:00', end: '09:00' },
				{ start: '09:00', end: '10:00' }
			];

			mockRequest = createPutRequest({
				timezone: 'America/New_York',
				week_config: DEFAULT_WEEK_CONFIG
			});

			const existingSchool = {
				id: schoolId,
				name: 'Test School',
				timezone: 'Europe/Paris',
				timetable: { periods, week_config: DEFAULT_WEEK_CONFIG }
			};

			const updatedSchool = {
				id: schoolId,
				name: 'Test School',
				timezone: 'America/New_York',
				timetable: { periods, week_config: DEFAULT_WEEK_CONFIG }
			};

			mockSupabase = createMockSupabase();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			((mockSupabase as any).single as any)
				.mockResolvedValueOnce({ data: existingSchool, error: null })
				.mockResolvedValueOnce({ data: updatedSchool, error: null });

			const context: RequestContext = {
				request: mockRequest,
				params: { schoolId },
				locals: {
					user: { id: 'user-1' },
					profile: { id: 'profile-1', role: 'admin' },
					supabase: mockSupabase
				}
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await PUT(context as any);
			const body = await response.json();

			expect(body.school.timetable.periods).toEqual(periods);
		});
	});
});
