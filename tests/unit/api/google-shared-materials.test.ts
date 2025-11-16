import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { GET, POST, DELETE } from '/src/routes/api/google/shared-materials/+server';
import {
	DELETE as DELETE_BY_ID,
	PATCH as PATCH_BY_ID
} from '/src/routes/api/google/shared-materials/[id]/+server';
import * as authModule from '$lib/server/middleware/auth';

/**
 * API Endpoint Tests: Google Classroom Shared Materials
 *
 * Tests focus on input validation with Zod schemas. These are the critical tests that prevent:
 * - Invalid UUID formats
 * - Missing required fields
 * - Empty arrays where data is required
 * - Oversized arrays (DoS protection)
 * - Oversized string inputs (DoS protection)
 *
 * Note: Authorization and database integration tests are covered in E2E tests.
 *
 * Coverage:
 * - POST /api/google/shared-materials - Input validation
 * - DELETE /api/google/shared-materials - Input validation
 * - DELETE /api/google/shared-materials/[id] - URL param validation
 * - PATCH /api/google/shared-materials/[id] - Input validation
 */

// Mock middleware
vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn()
}));

describe('Google Shared Materials API - Input Validation', () => {
	const teacherId = '550e8400-e29b-41d4-a716-446655440000';
	const materialId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	const classId1 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
	const classId2 = '8d8f7788-8536-51ef-a168-f18ed2e01bf8';
	const shareId = 'bbbbbb99-bb68-84ab-d49b-b4bbe5b34eb1';

	let mockLocals: App.Locals;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock requireRole to return teacher user
		vi.mocked(authModule.requireRole).mockResolvedValue({
			user: { id: teacherId, role: 'teacher' },
			profile: { id: teacherId, role: 'teacher' }
		});

		// Mock Supabase client (not used in validation tests)
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
				delete: vi.fn(),
				update: vi.fn().mockReturnThis()
			}
		};
	});

	// ============================================================================
	// POST /api/google/shared-materials - Share material with multiple classes
	// ============================================================================

	describe('POST /api/google/shared-materials - Input Validation', () => {
		const validRequest = {
			materialId,
			classIds: [classId1, classId2],
			visible: true,
			categoryId: null,
			topicId: null,
			descriptionOverride: null
		};

		it('should reject invalid materialId UUID', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					...validRequest,
					materialId: 'not-a-uuid'
				})
			};

			const event = {
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(POST(event)).rejects.toThrow();
		});

		it('should reject empty classIds array', async () => {
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

			await expect(POST(event)).rejects.toThrow();
		});

		it('should reject classIds array exceeding 50 items', async () => {
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

			await expect(POST(event)).rejects.toThrow();
		});

		it('should reject invalid classId UUID in array', async () => {
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

			await expect(POST(event)).rejects.toThrow();
		});

		it('should reject descriptionOverride exceeding 2000 characters', async () => {
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

			await expect(POST(event)).rejects.toThrow();
		});

		it('should accept descriptionOverride up to 2000 characters', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					...validRequest,
					classIds: [classId1], // Single class to simplify mocking
					descriptionOverride: 'a'.repeat(2000)
				})
			};

			// We expect it to pass validation and fail later (database access)
			// This confirms the 2000 char limit is correctly set
			const event = {
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// Should throw due to missing database setup, NOT validation error
			const error = await POST(event).catch((e: Error) => e);
			// Validation error messages mention "cannot exceed" or "must be"
			// Database/business logic errors don't have these keywords
			expect(error.message).not.toMatch(/cannot exceed|must be|should be/i);
		});

		it('should reject array with mixed valid and invalid UUIDs', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					...validRequest,
					classIds: [classId1, 'invalid', classId2]
				})
			};

			const event = {
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(POST(event)).rejects.toThrow();
		});

		it('should reject null materialId', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					...validRequest,
					materialId: null
				})
			};

			const event = {
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(POST(event)).rejects.toThrow();
		});

		it('should reject undefined materialId', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					...validRequest,
					materialId: undefined
				})
			};

			const event = {
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(POST(event)).rejects.toThrow();
		});

		it('should reject null classIds', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					...validRequest,
					classIds: null
				})
			};

			const event = {
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(POST(event)).rejects.toThrow();
		});
	});

	// ============================================================================
	// DELETE /api/google/shared-materials - Bulk unshare
	// ============================================================================

	describe('DELETE /api/google/shared-materials - Input Validation', () => {
		const validRequest = {
			materialId,
			classIds: [classId1, classId2]
		};

		it('should reject invalid materialId UUID', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					...validRequest,
					materialId: 'not-a-uuid'
				})
			};

			const event = {
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(DELETE(event)).rejects.toThrow();
		});

		it('should reject empty classIds array', async () => {
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

			await expect(DELETE(event)).rejects.toThrow();
		});

		it('should reject classIds array exceeding 50 items', async () => {
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

			await expect(DELETE(event)).rejects.toThrow();
		});

		it('should reject invalid classId UUID in array', async () => {
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

			await expect(DELETE(event)).rejects.toThrow();
		});

		it('should reject null materialId', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					...validRequest,
					materialId: null
				})
			};

			const event = {
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(DELETE(event)).rejects.toThrow();
		});

		it('should reject request missing classIds', async () => {
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					materialId
				})
			};

			const event = {
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(DELETE(event)).rejects.toThrow();
		});
	});

	// ============================================================================
	// DELETE /api/google/shared-materials/[id] - Delete by record ID
	// ============================================================================

	describe('DELETE /api/google/shared-materials/[id] - Input Validation', () => {
		it('should reject invalid UUID in params', async () => {
			const mockParams = { id: 'not-a-uuid' };

			const event = {
				params: mockParams,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(DELETE_BY_ID(event)).rejects.toThrow();
		});

		it('should reject null ID param', async () => {
			const mockParams = { id: null as unknown as string };

			const event = {
				params: mockParams,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(DELETE_BY_ID(event)).rejects.toThrow();
		});

		it('should reject undefined ID param', async () => {
			const mockParams = { id: undefined as unknown as string };

			const event = {
				params: mockParams,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(DELETE_BY_ID(event)).rejects.toThrow();
		});
	});

	// ============================================================================
	// PATCH /api/google/shared-materials/[id] - Update by record ID
	// ============================================================================

	describe('PATCH /api/google/shared-materials/[id] - Input Validation', () => {
		it('should reject invalid record ID in params', async () => {
			const mockParams = { id: 'not-a-uuid' };
			const mockRequest = {
				json: vi.fn().mockResolvedValue({ visible: false })
			};

			const event = {
				params: mockParams,
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(PATCH_BY_ID(event)).rejects.toThrow();
		});

		it('should reject request with no update fields', async () => {
			const mockParams = { id: shareId };
			const mockRequest = {
				json: vi.fn().mockResolvedValue({})
			};

			const event = {
				params: mockParams,
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(PATCH_BY_ID(event)).rejects.toThrow();
		});

		it('should reject descriptionOverride exceeding 2000 characters', async () => {
			const mockParams = { id: shareId };
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					descriptionOverride: 'a'.repeat(2001)
				})
			};

			const event = {
				params: mockParams,
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(PATCH_BY_ID(event)).rejects.toThrow();
		});

		it('should reject invalid topicId UUID', async () => {
			const mockParams = { id: shareId };
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					topicId: 'not-a-uuid'
				})
			};

			const event = {
				params: mockParams,
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(PATCH_BY_ID(event)).rejects.toThrow();
		});

		it('should reject invalid categoryId UUID', async () => {
			const mockParams = { id: shareId };
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					categoryId: 'bad-uuid'
				})
			};

			const event = {
				params: mockParams,
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(PATCH_BY_ID(event)).rejects.toThrow();
		});

		it('should reject non-boolean visible value', async () => {
			const mockParams = { id: shareId };
			const mockRequest = {
				json: vi.fn().mockResolvedValue({
					visible: 'true' // String instead of boolean
				})
			};

			const event = {
				params: mockParams,
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(PATCH_BY_ID(event)).rejects.toThrow();
		});
	});

	// ============================================================================
	// GET /api/google/shared-materials - List shared materials (Phase 1: materialId filter)
	// ============================================================================

	describe('GET /api/google/shared-materials - Input Validation', () => {
		let mockUrl: URL;

		beforeEach(() => {
			mockUrl = new URL('http://localhost/api/google/shared-materials');
		});

		it('should accept valid materialId UUID', async () => {
			mockUrl.searchParams.set('materialId', materialId);

			// Mock successful database queries
			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);

			// Verify filter was applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('material_id', materialId);
		});

		it('should accept missing materialId (optional parameter)', async () => {
			// No materialId in query params

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);

			// Verify materialId filter was NOT applied
			expect(mockLocals.supabase.eq).not.toHaveBeenCalledWith('material_id', expect.anything());
		});

		it('should reject invalid materialId UUID format', async () => {
			mockUrl.searchParams.set('materialId', 'not-a-uuid');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should reject non-string materialId', async () => {
			mockUrl.searchParams.set('materialId', '12345'); // Numbers are coerced to strings, so test actual invalid UUID

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should reject empty string materialId', async () => {
			mockUrl.searchParams.set('materialId', '');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should accept valid classId UUID', async () => {
			mockUrl.searchParams.set('classId', classId1);

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);

			// Verify filter was applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('class_id', classId1);
		});

		it('should reject invalid classId UUID', async () => {
			mockUrl.searchParams.set('classId', 'invalid-uuid');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should accept valid courseId UUID', async () => {
			mockUrl.searchParams.set('courseId', materialId); // Reuse valid UUID

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);

			// Verify filter was applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith(
				'google_classroom_materials.google_course_id',
				materialId
			);
		});

		it('should reject invalid courseId UUID', async () => {
			mockUrl.searchParams.set('courseId', 'bad-course-id');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should accept visible=true', async () => {
			mockUrl.searchParams.set('visible', 'true');

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);

			// Verify filter was applied (z.coerce.boolean() converts "true" -> true)
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('visible', true);
		});

		it('should accept visible=false', async () => {
			mockUrl.searchParams.set('visible', 'false');

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);

			// Verify filter was applied (z.coerce.boolean() converts "false" -> false)
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('visible', false);
		});

		it('should default to page 1 and limit 50', async () => {
			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.pagination.page).toBe(1);
			expect(data.pagination.limit).toBe(50);

			// Verify range was called with offset 0 and limit 49 (0-indexed)
			expect(mockLocals.supabase.range).toHaveBeenCalledWith(0, 49);
		});

		it('should accept custom page and limit', async () => {
			mockUrl.searchParams.set('page', '3');
			mockUrl.searchParams.set('limit', '10');

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 50
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.pagination.page).toBe(3);
			expect(data.pagination.limit).toBe(10);
			expect(data.pagination.totalPages).toBe(5); // 50 / 10 = 5

			// Page 3 with limit 10: offset = (3-1) * 10 = 20
			expect(mockLocals.supabase.range).toHaveBeenCalledWith(20, 29);
		});

		it('should transform page 0 to default (1)', async () => {
			mockUrl.searchParams.set('page', '0');

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.pagination.page).toBe(1); // Transformed to default
		});

		it('should transform negative page to default (1)', async () => {
			mockUrl.searchParams.set('page', '-1');

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.pagination.page).toBe(1); // Transformed to default
		});

		it('should transform limit 0 to default (50)', async () => {
			mockUrl.searchParams.set('limit', '0');

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.pagination.limit).toBe(50); // Transformed to default
		});

		it('should transform limit over 100 to default (50)', async () => {
			mockUrl.searchParams.set('limit', '101');

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.pagination.limit).toBe(50); // Transformed to default
		});
	});

	describe('GET /api/google/shared-materials - materialId Filter Functionality', () => {
		let mockUrl: URL;

		beforeEach(() => {
			mockUrl = new URL('http://localhost/api/google/shared-materials');
		});

		it('should filter results by materialId when provided', async () => {
			mockUrl.searchParams.set('materialId', materialId);

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify materialId filter was applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('material_id', materialId);
		});

		it('should return all materials when materialId is omitted', async () => {
			// No materialId in query params

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify materialId filter was NOT applied
			expect(mockLocals.supabase.eq).not.toHaveBeenCalledWith('material_id', expect.anything());
		});

		it('should combine materialId with classId filter', async () => {
			mockUrl.searchParams.set('materialId', materialId);
			mockUrl.searchParams.set('classId', classId1);

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify both filters were applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('material_id', materialId);
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('class_id', classId1);
		});

		it('should combine materialId with courseId filter', async () => {
			mockUrl.searchParams.set('materialId', materialId);
			mockUrl.searchParams.set('courseId', classId1); // Reuse valid UUID

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify both filters were applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('material_id', materialId);
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith(
				'google_classroom_materials.google_course_id',
				classId1
			);
		});

		it('should combine materialId with visible filter', async () => {
			mockUrl.searchParams.set('materialId', materialId);
			mockUrl.searchParams.set('visible', 'true');

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify both filters were applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('material_id', materialId);
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('visible', true);
		});

		it('should combine materialId with all other filters', async () => {
			mockUrl.searchParams.set('materialId', materialId);
			mockUrl.searchParams.set('classId', classId1);
			mockUrl.searchParams.set('courseId', classId2); // Reuse valid UUID
			mockUrl.searchParams.set('visible', 'false');

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify all filters were applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('material_id', materialId);
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('class_id', classId1);
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith(
				'google_classroom_materials.google_course_id',
				classId2
			);
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('visible', false);
		});

		it('should work with pagination when materialId is provided', async () => {
			mockUrl.searchParams.set('materialId', materialId);
			mockUrl.searchParams.set('page', '2');
			mockUrl.searchParams.set('limit', '15');

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 30
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.pagination.page).toBe(2);
			expect(data.pagination.limit).toBe(15);
			expect(data.pagination.totalPages).toBe(2); // 30 / 15 = 2

			// Verify materialId filter was applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('material_id', materialId);

			// Page 2 with limit 15: offset = (2-1) * 15 = 15
			expect(mockLocals.supabase.range).toHaveBeenCalledWith(15, 29);
		});

		it('should return empty array when materialId has no matches', async () => {
			mockUrl.searchParams.set('materialId', materialId);

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.sharedMaterials).toEqual([]);
			expect(data.pagination.total).toBe(0);
			expect(data.pagination.totalPages).toBe(0);
		});

		it('should return correct count when filtering by materialId', async () => {
			mockUrl.searchParams.set('materialId', materialId);

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 5 // Filtered count
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.pagination.total).toBe(5);
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('material_id', materialId);
		});
	});

	describe('GET /api/google/shared-materials - Authorization', () => {
		let mockUrl: URL;

		beforeEach(() => {
			mockUrl = new URL('http://localhost/api/google/shared-materials');
		});

		it('should require teacher role', async () => {
			// Mock requireRole to throw error for non-teacher
			vi.mocked(authModule.requireRole).mockRejectedValueOnce(
				new Error('Unauthorized: teacher role required')
			);

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow('Unauthorized: teacher role required');
		});

		it('should allow teacher to access endpoint', async () => {
			// Mock requireRole to succeed (teacher)
			vi.mocked(authModule.requireRole).mockResolvedValueOnce({
				user: { id: teacherId, role: 'teacher' },
				profile: { id: teacherId, role: 'teacher' }
			});

			mockLocals.supabase.range = vi.fn().mockResolvedValueOnce({
				data: [],
				error: null,
				count: 0
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);
		});
	});
});
