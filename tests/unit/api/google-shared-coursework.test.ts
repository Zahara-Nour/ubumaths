/**
 * Google Classroom Shared Coursework API Tests
 * =============================================
 *
 * Comprehensive unit tests for the coursework sharing endpoints.
 * Tests follow the same pattern as google-shared-materials.test.ts from Phase 1,
 * adapted for coursework-specific functionality.
 *
 * Coverage:
 * - GET /api/google/shared-coursework - List with filters and pagination
 * - POST /api/google/shared-coursework - Bulk share coursework
 * - DELETE /api/google/shared-coursework - Bulk unshare coursework
 *
 * Key differences from materials:
 * - Uses coursework_id instead of material_id
 * - Includes courseworkId filter (new in Phase 2.2)
 * - Tests coursework-specific fields (work_type, max_points, due_date)
 * - Uses coursework_materials table for attachment counts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { GET, POST, DELETE } from '../../../src/routes/api/google/shared-coursework/+server.js';
import * as authModule from '$lib/server/middleware/auth';

// Mock middleware
vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn()
}));

describe('Google Shared Coursework API', () => {
	const teacherId = '550e8400-e29b-41d4-a716-446655440000';
	const courseworkId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	const classId1 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
	const classId2 = '8d8f7788-8536-51ef-a168-f18ed2e01bf8';
	const courseId = '9f9e8877-9647-62fe-b279-f29fe3e02cf9';
	const categoryId = 'aaaa1111-aaaa-41aa-8aaa-111111111111';
	const shareId = 'bbbbbb99-bb68-44ab-849b-b4bbe5b34eb1';

	let mockLocals: App.Locals;

	/**
	 * Assert that calling `fn` rejects with a SvelteKit `error(...)` whose
	 * message matches `expected`.
	 *
	 * SvelteKit `HttpError` stores the human-readable message in `.body.message`
	 * and leaves `.message` undefined, so vitest's `rejects.toThrow(string)`
	 * (which inspects `.message`) cannot be used directly. This helper inspects
	 * `.body.message` (and falls back to `.message` for plain `Error`s).
	 */
	async function expectRejectsWithMessage(
		fn: () => Promise<unknown>,
		expected: string | RegExp
	): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const err: any = await fn().then(
			() => {
				throw new Error('Expected function to reject, but it resolved');
			},
			(e) => e
		);
		const message: string = err?.body?.message ?? err?.message ?? '';
		if (typeof expected === 'string') {
			expect(message).toContain(expected);
		} else {
			expect(message).toMatch(expected);
		}
	}

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock requireRole to return teacher user

		vi.mocked(authModule.requireRole).mockResolvedValue({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			user: { id: teacherId, role: 'teacher' } as any,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			profile: { id: teacherId, role: 'teacher' } as any
		});

		// Mock Supabase client

		mockLocals = {
			supabase: {
				from: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
				single: vi.fn(),
				upsert: vi.fn(),
				delete: vi.fn().mockReturnThis()
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any,
			user: { id: teacherId, role: 'teacher' },
			session: null,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			safeGetSession: vi.fn() as any,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			profile: null as any
		} as unknown as App.Locals;
	});

	// ============================================================================
	// GET /api/google/shared-coursework - List shared coursework
	// ============================================================================

	describe('GET /api/google/shared-coursework', () => {
		let mockUrl: URL;

		beforeEach(() => {
			mockUrl = new URL('http://localhost/api/google/shared-coursework');
		});

		describe('Authorization', () => {
			it('returns 401 when not authenticated', async () => {
				vi.mocked(authModule.requireRole).mockRejectedValueOnce(
					new Error('Unauthorized: authentication required')
				);

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(GET(event as unknown as RequestEvent)).rejects.toThrow(
					'Unauthorized: authentication required'
				);
			});

			it('returns 403 when not a teacher', async () => {
				vi.mocked(authModule.requireRole).mockRejectedValueOnce(
					new Error('Unauthorized: teacher role required')
				);

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(GET(event as unknown as RequestEvent)).rejects.toThrow(
					'Unauthorized: teacher role required'
				);
			});

			it('allows teacher to access endpoint', async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await GET(event as unknown as RequestEvent);
				expect(response.status).toBe(200);
			});
		});

		describe('Filtering', () => {
			it('filters by classId when provided', async () => {
				mockUrl.searchParams.set('classId', classId1);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await GET(event as unknown as RequestEvent);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith('class_id', classId1);
			});

			it('filters by courseId when provided', async () => {
				mockUrl.searchParams.set('courseId', courseId);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await GET(event as unknown as RequestEvent);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith(
					'google_classroom_coursework.google_course_id',
					courseId
				);
			});

			it('filters by courseworkId when provided (NEW in Phase 2)', async () => {
				mockUrl.searchParams.set('courseworkId', courseworkId);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await GET(event as unknown as RequestEvent);

				// Verify courseworkId filter was applied
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith('coursework_id', courseworkId);
			});

			it('filters by visible=true', async () => {
				mockUrl.searchParams.set('visible', 'true');

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await GET(event as unknown as RequestEvent);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith('visible', true);
			});

			it('filters by visible=false', async () => {
				mockUrl.searchParams.set('visible', 'false');

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await GET(event as unknown as RequestEvent);

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith('visible', false);
			});

			it('combines multiple filters', async () => {
				mockUrl.searchParams.set('courseworkId', courseworkId);
				mockUrl.searchParams.set('classId', classId1);
				mockUrl.searchParams.set('courseId', courseId);
				mockUrl.searchParams.set('visible', 'true');

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await GET(event as unknown as RequestEvent);

				// Verify all filters were applied
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith('coursework_id', courseworkId);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith('class_id', classId1);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith(
					'google_classroom_coursework.google_course_id',
					courseId
				);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith('visible', true);
			});

			it('returns all coursework when no filters provided', async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await GET(event as unknown as RequestEvent);

				// Verify no filters were applied except teacher ownership (handled by RLS)
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).not.toHaveBeenCalledWith(
					'coursework_id',
					expect.anything()
				);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).not.toHaveBeenCalledWith(
					'class_id',
					expect.anything()
				);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).not.toHaveBeenCalledWith(
					'visible',
					expect.anything()
				);
			});
		});

		describe('Pagination', () => {
			it('defaults to page 1 and limit 50', async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await GET(event as unknown as RequestEvent);
				const data = await response.json();

				expect(data.page).toBe(1);
				expect(data.limit).toBe(50);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).range).toHaveBeenCalledWith(0, 49);
			});

			it('handles custom page and limit', async () => {
				mockUrl.searchParams.set('page', '3');
				mockUrl.searchParams.set('limit', '20');

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 100
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await GET(event as unknown as RequestEvent);
				const data = await response.json();

				expect(data.page).toBe(3);
				expect(data.limit).toBe(20);
				expect(data.totalPages).toBe(5); // 100 / 20 = 5
				// Page 3 with limit 20: offset = (3-1) * 20 = 40
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).range).toHaveBeenCalledWith(40, 59);
			});

			it('transforms invalid page to default (1)', async () => {
				mockUrl.searchParams.set('page', '0');

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await GET(event as unknown as RequestEvent);
				const data = await response.json();

				expect(data.page).toBe(1);
			});

			it('transforms limit over 100 to default (50)', async () => {
				mockUrl.searchParams.set('limit', '101');

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await GET(event as unknown as RequestEvent);
				const data = await response.json();

				expect(data.limit).toBe(50);
			});

			it('works with filters and pagination together', async () => {
				mockUrl.searchParams.set('courseworkId', courseworkId);
				mockUrl.searchParams.set('page', '2');
				mockUrl.searchParams.set('limit', '10');

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 25
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await GET(event as unknown as RequestEvent);
				const data = await response.json();

				expect(data.page).toBe(2);
				expect(data.limit).toBe(10);
				expect(data.totalPages).toBe(3); // 25 / 10 = 2.5, rounded up to 3
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith('coursework_id', courseworkId);
				// Page 2 with limit 10: offset = (2-1) * 10 = 10
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).range).toHaveBeenCalledWith(10, 19);
			});
		});

		describe('Data Enrichment', () => {
			it('returns enriched data with course and class names', async () => {
				const mockCoursework = {
					id: shareId,
					coursework_id: courseworkId,
					class_id: classId1,
					visible: true,
					category_id: null,
					description_override: 'Custom description',
					display_order: 1,
					created_at: '2025-01-01T00:00:00Z',
					updated_at: '2025-01-01T00:00:00Z',
					google_classroom_coursework: {
						id: courseworkId,
						title: 'Math Homework',
						description: 'Complete exercises 1-10',
						google_course_id: courseId,
						max_points: 100,
						work_type: 'ASSIGNMENT',
						due_date: '2025-02-01',
						due_time: '23:59:00'
					},
					classes: { id: classId1, name: '6th Grade Math' },
					coursework_categories: null
				};

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [mockCoursework],
					error: null,
					count: 1
				});

				// Mock course lookup
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).in = vi.fn().mockReturnThis();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).eq = vi.fn().mockImplementation((field, value) => {
					if (field === 'teacher_id' && value === teacherId) {
						return {
							...mockLocals.supabase,
							then: (resolve: (value: unknown) => void) => {
								resolve({
									data: [{ id: 'course-1', name: 'Mathematics 2025', google_course_id: courseId }],
									error: null
								});
							}
						} as unknown;
					}
					return mockLocals.supabase;
				});

				// Mock materials count lookup
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).in = vi.fn().mockImplementation((field, values) => {
					if (field === 'coursework_id' && values.includes(courseworkId)) {
						return {
							...mockLocals.supabase,
							then: (resolve: (value: unknown) => void) => {
								resolve({
									data: [
										{ coursework_id: courseworkId },
										{ coursework_id: courseworkId },
										{ coursework_id: courseworkId }
									],
									error: null
								});
							}
						} as unknown;
					}
					return mockLocals.supabase;
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await GET(event as unknown as RequestEvent);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.sharedCoursework).toHaveLength(1);
				const item = data.sharedCoursework[0];
				expect(item.courseworkTitle).toBe('Math Homework');
				expect(item.className).toBe('6th Grade Math');
				expect(item.workType).toBe('ASSIGNMENT');
				expect(item.maxPoints).toBe(100);
				expect(item.descriptionOverride).toBe('Custom description');
			});

			it('handles empty results gracefully', async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await GET(event as unknown as RequestEvent);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.sharedCoursework).toEqual([]);
				expect(data.total).toBe(0);
				expect(data.totalPages).toBe(0);
			});

			it('handles database errors gracefully', async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { message: 'Database error', code: 'PGRST999' },
					count: null
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expectRejectsWithMessage(
					() => GET(event as unknown as RequestEvent),
					'Failed to fetch shared coursework'
				);
			});
		});

		describe('Input Validation', () => {
			it('rejects invalid classId UUID', async () => {
				mockUrl.searchParams.set('classId', 'not-a-uuid');

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(GET(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('rejects invalid courseId UUID', async () => {
				mockUrl.searchParams.set('courseId', 'invalid-course');

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(GET(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('rejects invalid courseworkId UUID', async () => {
				mockUrl.searchParams.set('courseworkId', 'bad-id');

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(GET(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('accepts valid boolean strings for visible', async () => {
				// The schema treats only the literal string 'true' as true; any other
				// value (including '1') is coerced to false.
				mockUrl.searchParams.set('visible', '1');

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).range = vi.fn().mockResolvedValueOnce({
					data: [],
					error: null,
					count: 0
				});

				const event = {
					url: mockUrl,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await GET(event as unknown as RequestEvent);
				expect(response.status).toBe(200);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith('visible', false);
			});
		});
	});

	// ============================================================================
	// POST /api/google/shared-coursework - Share coursework with multiple classes
	// ============================================================================

	describe('POST /api/google/shared-coursework', () => {
		const validRequest = {
			courseworkId,
			classIds: [classId1, classId2],
			visible: true,
			categoryId: null,
			descriptionOverride: null
		};

		describe('Authorization', () => {
			it('returns 401 when not authenticated', async () => {
				vi.mocked(authModule.requireRole).mockRejectedValueOnce(
					new Error('Unauthorized: authentication required')
				);

				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(POST(event as unknown as RequestEvent)).rejects.toThrow(
					'Unauthorized: authentication required'
				);
			});

			it('returns 403 when not a teacher', async () => {
				vi.mocked(authModule.requireRole).mockRejectedValueOnce(
					new Error('Unauthorized: teacher role required')
				);

				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(POST(event as unknown as RequestEvent)).rejects.toThrow(
					'Unauthorized: teacher role required'
				);
			});
		});

		describe('Input Validation', () => {
			it('rejects invalid courseworkId UUID', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						courseworkId: 'not-a-uuid'
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(POST(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('rejects empty classIds array', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						classIds: []
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(POST(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('rejects classIds array exceeding 50 items', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						classIds: Array(51).fill('550e8400-e29b-41d4-a716-446655440000')
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(POST(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('rejects invalid classId UUID in array', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						classIds: ['not-a-uuid', classId1]
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(POST(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('rejects descriptionOverride exceeding 2000 characters', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						descriptionOverride: 'a'.repeat(2001)
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(POST(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('accepts descriptionOverride up to 2000 characters', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						classIds: [classId1],
						descriptionOverride: 'a'.repeat(2000)
					})
				};

				// Setup chain for coursework fetch
				const courseworkChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: {
							id: courseworkId,
							google_classroom_courses: { teacher_id: teacherId }
						},
						error: null
					})
				};

				// Setup chain for class fetch
				const classChain = {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValueOnce({
						data: [{ id: classId1, teacher_id: teacherId }],
						error: null
					})
				};

				// Setup chain for upsert
				const upsertChain = {
					upsert: vi.fn().mockReturnThis(),
					select: vi.fn().mockResolvedValueOnce({
						data: [{ id: shareId }],
						error: null
					})
				};

				// Mock from() to return appropriate chains
				let callCount = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).from = vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount === 1) return courseworkChain; // coursework fetch
					if (callCount === 2) return classChain; // class fetch
					if (callCount === 3) return upsertChain; // upsert
					return mockLocals.supabase;
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await POST(event as unknown as RequestEvent);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
			});

			it('rejects missing required fields', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						classIds: [classId1]
						// Missing courseworkId
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(POST(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('rejects invalid categoryId UUID', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						categoryId: 'not-a-uuid'
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(POST(event as unknown as RequestEvent)).rejects.toThrow();
			});
		});

		describe('Business Logic', () => {
			it('returns 403 when coursework does not belong to teacher', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				// Mock coursework belongs to different teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: courseworkId,
						google_classroom_courses: { teacher_id: 'other-teacher-id' }
					},
					error: null
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expectRejectsWithMessage(
					() => POST(event as unknown as RequestEvent),
					'You do not own this coursework'
				);
			});

			it('returns 403 when class does not belong to teacher', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				// Mock coursework belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: courseworkId,
						google_classroom_courses: { teacher_id: teacherId }
					},
					error: null
				});

				// Mock classes - one belongs to different teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).eq = vi.fn().mockReturnThis();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).in = vi.fn().mockImplementation(() => ({
					...mockLocals.supabase,
					eq: vi.fn().mockResolvedValueOnce({
						data: [
							{ id: classId1, teacher_id: teacherId },
							{ id: classId2, teacher_id: 'other-teacher-id' }
						],
						error: null
					})
				}));

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expectRejectsWithMessage(
					() => POST(event as unknown as RequestEvent),
					'You do not own all selected classes'
				);
			});

			it('returns 400 when category does not belong to teacher class', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						categoryId
					})
				};

				// Coursework fetch: belongs to teacher
				const courseworkChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: {
							id: courseworkId,
							google_classroom_courses: { teacher_id: teacherId }
						},
						error: null
					})
				};

				// Class fetch: both belong to teacher (terminal .eq('is_active'))
				const classChain = {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValueOnce({
						data: [
							{ id: classId1, teacher_id: teacherId },
							{ id: classId2, teacher_id: teacherId }
						],
						error: null
					})
				};

				// Category fetch: exists but belongs to another class
				const categoryChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: { id: categoryId, class_id: classId1 },
						error: null
					})
				};

				// Category class ownership check: not found (different teacher)
				const categoryClassChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: null,
						error: { code: 'PGRST116' }
					})
				};

				let callCount = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).from = vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount === 1) return courseworkChain;
					if (callCount === 2) return classChain;
					if (callCount === 3) return categoryChain;
					if (callCount === 4) return categoryClassChain;
					return mockLocals.supabase;
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expectRejectsWithMessage(
					() => POST(event as unknown as RequestEvent),
					'Category does not belong to one of your classes'
				);
			});

			it('shares coursework with multiple classes successfully', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				// Coursework fetch: belongs to teacher
				const courseworkChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: {
							id: courseworkId,
							google_classroom_courses: { teacher_id: teacherId }
						},
						error: null
					})
				};

				// Class fetch: both belong to teacher (terminal .eq('is_active'))
				const classChain = {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValueOnce({
						data: [
							{ id: classId1, teacher_id: teacherId },
							{ id: classId2, teacher_id: teacherId }
						],
						error: null
					})
				};

				// Upsert chain
				const upsertChain = {
					upsert: vi.fn().mockReturnThis(),
					select: vi.fn().mockResolvedValueOnce({
						data: [{ id: 'share-1' }, { id: 'share-2' }],
						error: null
					})
				};

				let callCount = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).from = vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount === 1) return courseworkChain;
					if (callCount === 2) return classChain;
					if (callCount === 3) return upsertChain;
					return mockLocals.supabase;
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await POST(event as unknown as RequestEvent);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.shared).toBe(2);
			});

			it('handles duplicate shares gracefully (upsert)', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						classIds: [classId1]
					})
				};

				// Coursework fetch: belongs to teacher
				const courseworkChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: {
							id: courseworkId,
							google_classroom_courses: { teacher_id: teacherId }
						},
						error: null
					})
				};

				// Class fetch: belongs to teacher
				const classChain = {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValueOnce({
						data: [{ id: classId1, teacher_id: teacherId }],
						error: null
					})
				};

				// Upsert chain (verify upsert options)
				const upsertChain = {
					upsert: vi.fn().mockImplementation((_data, options) => {
						expect(options.onConflict).toBe('coursework_id,class_id');
						expect(options.ignoreDuplicates).toBe(false);
						return upsertChain;
					}),
					select: vi.fn().mockResolvedValueOnce({
						data: [{ id: shareId }],
						error: null
					})
				};

				let callCount = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).from = vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount === 1) return courseworkChain;
					if (callCount === 2) return classChain;
					if (callCount === 3) return upsertChain;
					return mockLocals.supabase;
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await POST(event as unknown as RequestEvent);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.shared).toBe(1);
			});

			it('returns 404 when coursework not found', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				// Mock coursework not found
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116', message: 'Not found' }
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expectRejectsWithMessage(
					() => POST(event as unknown as RequestEvent),
					'Coursework not found or access denied'
				);
			});

			it('handles database errors gracefully', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				// Mock database error
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST999', message: 'Database error' }
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expectRejectsWithMessage(
					() => POST(event as unknown as RequestEvent),
					'Failed to fetch coursework'
				);
			});
		});
	});

	// ============================================================================
	// DELETE /api/google/shared-coursework - Bulk unshare
	// ============================================================================

	describe('DELETE /api/google/shared-coursework', () => {
		const validRequest = {
			courseworkId,
			classIds: [classId1, classId2]
		};

		describe('Authorization', () => {
			it('returns 401 when not authenticated', async () => {
				vi.mocked(authModule.requireRole).mockRejectedValueOnce(
					new Error('Unauthorized: authentication required')
				);

				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(DELETE(event as unknown as RequestEvent)).rejects.toThrow(
					'Unauthorized: authentication required'
				);
			});

			it('returns 403 when not a teacher', async () => {
				vi.mocked(authModule.requireRole).mockRejectedValueOnce(
					new Error('Unauthorized: teacher role required')
				);

				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(DELETE(event as unknown as RequestEvent)).rejects.toThrow(
					'Unauthorized: teacher role required'
				);
			});
		});

		describe('Input Validation', () => {
			it('rejects invalid courseworkId UUID', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						courseworkId: 'not-a-uuid'
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(DELETE(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('rejects empty classIds array', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						classIds: []
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(DELETE(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('rejects classIds array exceeding 50 items', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						classIds: Array(51).fill('550e8400-e29b-41d4-a716-446655440000')
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(DELETE(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('rejects invalid classId UUID in array', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						...validRequest,
						classIds: ['bad-uuid', classId1]
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(DELETE(event as unknown as RequestEvent)).rejects.toThrow();
			});

			it('rejects missing required fields', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						courseworkId
						// Missing classIds
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expect(DELETE(event as unknown as RequestEvent)).rejects.toThrow();
			});
		});

		describe('Business Logic', () => {
			it('returns 403 when coursework does not belong to teacher', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				// Mock coursework not found (RLS blocks access)
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116', message: 'Not found' }
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expectRejectsWithMessage(
					() => DELETE(event as unknown as RequestEvent),
					'Coursework not found or access denied'
				);
			});

			it('returns 400 when classes not found or access denied', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				// Mock coursework exists
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: { id: courseworkId },
					error: null
				});

				// Mock only one class found (other doesn't exist or belong to teacher)
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).eq = vi.fn().mockReturnThis();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).in = vi.fn().mockImplementation(() => ({
					...mockLocals.supabase,
					eq: vi.fn().mockResolvedValueOnce({
						data: [{ id: classId1 }], // Only one class found
						error: null
					})
				}));

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expectRejectsWithMessage(
					() => DELETE(event as unknown as RequestEvent),
					'One or more classes not found or access denied'
				);
			});

			it('bulk unshares coursework from multiple classes', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				// Coursework fetch: exists
				const courseworkChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: { id: courseworkId },
						error: null
					})
				};

				// Class fetch: both exist and belong to teacher (terminal .eq('teacher_id'))
				const classChain = {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValueOnce({
						data: [{ id: classId1 }, { id: classId2 }],
						error: null
					})
				};

				// Delete chain: delete().eq().in().eq().select()
				const deleteChain = {
					delete: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					select: vi.fn().mockResolvedValueOnce({
						data: [{ id: 'share-1' }, { id: 'share-2' }],
						error: null
					})
				};

				let callCount = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).from = vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount === 1) return courseworkChain;
					if (callCount === 2) return classChain;
					if (callCount === 3) return deleteChain;
					return mockLocals.supabase;
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await DELETE(event as unknown as RequestEvent);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.deleted).toBe(2);
			});

			it('handles non-existent shares gracefully', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				// Coursework fetch: exists
				const courseworkChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: { id: courseworkId },
						error: null
					})
				};

				// Class fetch: both exist (terminal .eq('teacher_id'))
				const classChain = {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValueOnce({
						data: [{ id: classId1 }, { id: classId2 }],
						error: null
					})
				};

				// Delete chain: no records deleted (idempotent)
				const deleteChain = {
					delete: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					select: vi.fn().mockResolvedValueOnce({
						data: [],
						error: null
					})
				};

				let callCount = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).from = vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount === 1) return courseworkChain;
					if (callCount === 2) return classChain;
					if (callCount === 3) return deleteChain;
					return mockLocals.supabase;
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await DELETE(event as unknown as RequestEvent);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.deleted).toBe(0); // No records deleted (idempotent)
			});

			it('handles database errors gracefully', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue(validRequest)
				};

				// Mock coursework exists
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: { id: courseworkId },
					error: null
				});

				// Mock database error during class verification
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).eq = vi.fn().mockReturnThis();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).in = vi.fn().mockImplementation(() => ({
					...mockLocals.supabase,
					eq: vi.fn().mockResolvedValueOnce({
						data: null,
						error: { code: 'PGRST999', message: 'Database error' }
					})
				}));

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expectRejectsWithMessage(
					() => DELETE(event as unknown as RequestEvent),
					'Failed to verify class ownership'
				);
			});
		});
	});

	// ============================================================================
	// POST /api/google/shared-coursework - Topic Validation Tests
	// ============================================================================

	describe('POST /api/google/shared-coursework - Topic Validation', () => {
		const topicId = 'dddd4444-dddd-44dd-8ddd-444444444444';
		const otherTopicId = 'eeee5555-eeee-45ee-9eee-555555555555';

		describe('Topic Acceptance', () => {
			it('accepts valid topic from teacher course', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						courseworkId,
						classIds: [classId1],
						visible: true,
						categoryId: null,
						topicId,
						descriptionOverride: null
					})
				};

				// Coursework fetch: belongs to teacher
				const courseworkChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: {
							id: courseworkId,
							google_classroom_courses: { teacher_id: teacherId }
						},
						error: null
					})
				};

				// Class fetch: belongs to teacher
				const classChain = {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValueOnce({
						data: [{ id: classId1, teacher_id: teacherId }],
						error: null
					})
				};

				// Topic fetch: belongs to teacher's course
				const topicChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: { id: topicId, google_course_id: courseId },
						error: null
					})
				};

				// Topic course ownership: found
				const topicCourseChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: { id: courseId },
						error: null
					})
				};

				// Upsert chain
				const upsertSpy = vi.fn().mockReturnThis();
				const upsertChain = {
					upsert: upsertSpy,
					select: vi.fn().mockResolvedValueOnce({
						data: [{ id: shareId, topic_id: topicId }],
						error: null
					})
				};

				let callCount = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).from = vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount === 1) return courseworkChain;
					if (callCount === 2) return classChain;
					if (callCount === 3) return topicChain;
					if (callCount === 4) return topicCourseChain;
					if (callCount === 5) return upsertChain;
					return mockLocals.supabase;
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await POST(event as unknown as RequestEvent);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.shared).toBe(1);

				// Verify upsert was called with topicId
				expect(upsertSpy).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							topic_id: topicId
						})
					]),
					expect.any(Object)
				);
			});

			it('accepts null topic', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						courseworkId,
						classIds: [classId1],
						visible: true,
						categoryId: null,
						topicId: null,
						descriptionOverride: null
					})
				};

				// Coursework fetch: belongs to teacher
				const courseworkChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: {
							id: courseworkId,
							google_classroom_courses: { teacher_id: teacherId }
						},
						error: null
					})
				};

				// Class fetch: belongs to teacher
				const classChain = {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValueOnce({
						data: [{ id: classId1, teacher_id: teacherId }],
						error: null
					})
				};

				// Upsert chain (no topic lookup since topicId is null)
				const upsertSpy = vi.fn().mockReturnThis();
				const upsertChain = {
					upsert: upsertSpy,
					select: vi.fn().mockResolvedValueOnce({
						data: [{ id: shareId, topic_id: null }],
						error: null
					})
				};

				let callCount = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).from = vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount === 1) return courseworkChain;
					if (callCount === 2) return classChain;
					if (callCount === 3) return upsertChain;
					return mockLocals.supabase;
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await POST(event as unknown as RequestEvent);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);

				// Verify upsert was called with null topic_id
				expect(upsertSpy).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							topic_id: null
						})
					]),
					expect.any(Object)
				);
			});

			it('accepts undefined topic (not provided in request)', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						courseworkId,
						classIds: [classId1],
						visible: true,
						categoryId: null,
						descriptionOverride: null
						// topicId not provided
					})
				};

				// Coursework fetch: belongs to teacher
				const courseworkChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: {
							id: courseworkId,
							google_classroom_courses: { teacher_id: teacherId }
						},
						error: null
					})
				};

				// Class fetch: belongs to teacher
				const classChain = {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValueOnce({
						data: [{ id: classId1, teacher_id: teacherId }],
						error: null
					})
				};

				// Upsert chain (no topic lookup since topicId is undefined)
				const upsertSpy = vi.fn().mockReturnThis();
				const upsertChain = {
					upsert: upsertSpy,
					select: vi.fn().mockResolvedValueOnce({
						data: [{ id: shareId, topic_id: null }],
						error: null
					})
				};

				let callCount = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).from = vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount === 1) return courseworkChain;
					if (callCount === 2) return classChain;
					if (callCount === 3) return upsertChain;
					return mockLocals.supabase;
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				const response = await POST(event as unknown as RequestEvent);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);

				// Verify upsert was called with null topic_id
				expect(upsertSpy).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							topic_id: null
						})
					]),
					expect.any(Object)
				);
			});
		});

		describe('Topic Rejection', () => {
			it('rejects topic from different teacher course', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						courseworkId,
						classIds: [classId1],
						visible: true,
						categoryId: null,
						topicId: otherTopicId,
						descriptionOverride: null
					})
				};

				// Coursework fetch: belongs to teacher
				const courseworkChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: {
							id: courseworkId,
							google_classroom_courses: { teacher_id: teacherId }
						},
						error: null
					})
				};

				// Class fetch: belongs to teacher
				const classChain = {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValueOnce({
						data: [{ id: classId1, teacher_id: teacherId }],
						error: null
					})
				};

				// Topic fetch: exists
				const topicChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: { id: otherTopicId, google_course_id: 'other-course-id' },
						error: null
					})
				};

				// Topic course ownership: not found (different teacher)
				const topicCourseChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: null,
						error: { code: 'PGRST116' }
					})
				};

				let callCount = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).from = vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount === 1) return courseworkChain;
					if (callCount === 2) return classChain;
					if (callCount === 3) return topicChain;
					if (callCount === 4) return topicCourseChain;
					return mockLocals.supabase;
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expectRejectsWithMessage(
					() => POST(event as unknown as RequestEvent),
					'Topic does not belong to one of your courses'
				);
			});

			it('rejects non-existent topic UUID', async () => {
				const fakeTopicId = 'ffff6666-ffff-46ff-8fff-666666666666';
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						courseworkId,
						classIds: [classId1],
						visible: true,
						categoryId: null,
						topicId: fakeTopicId,
						descriptionOverride: null
					})
				};

				// Coursework fetch: belongs to teacher
				const courseworkChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: {
							id: courseworkId,
							google_classroom_courses: { teacher_id: teacherId }
						},
						error: null
					})
				};

				// Class fetch: belongs to teacher
				const classChain = {
					select: vi.fn().mockReturnThis(),
					in: vi.fn().mockReturnThis(),
					eq: vi.fn().mockResolvedValueOnce({
						data: [{ id: classId1, teacher_id: teacherId }],
						error: null
					})
				};

				// Topic fetch: not found
				const topicChain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValueOnce({
						data: null,
						error: { code: 'PGRST116', message: 'Not found' }
					})
				};

				let callCount = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).from = vi.fn().mockImplementation(() => {
					callCount++;
					if (callCount === 1) return courseworkChain;
					if (callCount === 2) return classChain;
					if (callCount === 3) return topicChain;
					return mockLocals.supabase;
				});

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				await expectRejectsWithMessage(
					() => POST(event as unknown as RequestEvent),
					'Topic not found'
				);
			});

			it('rejects invalid topic UUID format', async () => {
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						courseworkId,
						classIds: [classId1],
						visible: true,
						categoryId: null,
						topicId: 'not-a-valid-uuid',
						descriptionOverride: null
					})
				};

				const event = {
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// Should fail Zod validation

				await expect(POST(event as unknown as RequestEvent)).rejects.toThrow();
			});
		});
	});
});
