/**
 * Google Classroom Shared Coursework by ID API Tests
 * ===================================================
 *
 * Unit tests for the resource-based coursework sharing endpoints.
 * Tests PATCH and DELETE operations on specific shared coursework records.
 *
 * Coverage:
 * - PATCH /api/google/shared-coursework/[id] - Update specific record
 * - DELETE /api/google/shared-coursework/[id] - Delete specific record
 *
 * Security tested:
 * - Teacher role required
 * - Record ownership verification via class ownership
 * - Category ownership validation
 * - Input validation with Zod schemas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { PATCH, DELETE } from '../../../src/routes/api/google/shared-coursework/[id]/+server.js';
import * as authModule from '$lib/server/middleware/auth';

// Mock middleware
vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn()
}));

describe('Google Shared Coursework by ID API', () => {
	const teacherId = '550e8400-e29b-41d4-a716-446655440000';
	const otherTeacherId = '660e9500-f39c-52e5-b827-557766551111';
	const sharedCourseworkId = 'bbbbbb99-bb68-84ab-d49b-b4bbe5b34eb1';
	const classId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
	const _categoryId = 'aaaa1111-aaaa-11aa-aaaa-111111111111';
	const newCategoryId = 'bbbb2222-bbbb-22bb-bbbb-222222222222';
	const courseworkId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

	let mockLocals: App.Locals;

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
				update: vi.fn().mockReturnThis(),
				delete: vi.fn().mockReturnThis(),
				single: vi.fn()
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
	// PATCH /api/google/shared-coursework/[id] - Update by record ID
	// ============================================================================

	describe('PATCH /api/google/shared-coursework/[id]', () => {
		describe('Authorization', () => {
			it('returns 401 when not authenticated', async () => {
				vi.mocked(authModule.requireRole).mockRejectedValueOnce(
					new Error('Unauthorized: authentication required')
				);

				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ visible: false })
				};

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow('Unauthorized: authentication required');
			});

			it('returns 403 when not a teacher', async () => {
				vi.mocked(authModule.requireRole).mockRejectedValueOnce(
					new Error('Unauthorized: teacher role required')
				);

				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ visible: false })
				};

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow('Unauthorized: teacher role required');
			});

			it('returns 403 when record does not belong to teacher', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ visible: false })
				};

				// Mock record exists but belongs to different teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: otherTeacherId }
					},
					error: null
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow(
					'You do not have permission to update this record'
				);
			});
		});

		describe('Input Validation', () => {
			it('returns 400 for invalid record ID format', async () => {
				const mockParams = { id: 'not-a-uuid' };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ visible: false })
				};

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow('Invalid shared coursework ID');
			});

			it('returns 400 when no update fields provided', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({})
				};

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow();
			});

			it('returns 400 for invalid categoryId UUID', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						categoryId: 'not-a-uuid'
					})
				};

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow();
			});

			it('returns 400 when descriptionOverride exceeds 2000 characters', async () => {
				const mockParams = { id: sharedCourseworkId };
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

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow();
			});

			it('accepts descriptionOverride up to 2000 characters', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						descriptionOverride: 'a'.repeat(2000)
					})
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock successful update
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						coursework_id: courseworkId,
						class_id: classId,
						visible: true,
						category_id: null,
						description_override: 'a'.repeat(2000),
						display_order: 1,
						created_at: '2025-01-01T00:00:00Z',
						updated_at: '2025-01-01T00:00:00Z',
						google_classroom_coursework: {
							title: 'Math Homework',
							description: 'Original description',
							work_type: 'ASSIGNMENT',
							max_points: 100,
							due_date: '2025-02-01',
							due_time: '23:59:00'
						},
						classes: { name: '6th Grade Math' },
						coursework_categories: null
					},
					error: null
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await PATCH(event as any);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.sharedCoursework.descriptionOverride).toBe('a'.repeat(2000));
			});

			it('rejects non-boolean visible value', async () => {
				const mockParams = { id: sharedCourseworkId };
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

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow();
			});
		});

		describe('Business Logic', () => {
			it('returns 404 when record not found', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ visible: false })
				};

				// Mock record not found
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116', message: 'Not found' }
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow(
					'Shared coursework not found or access denied'
				);
			});

			it('returns 400 when category not found', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						categoryId: newCategoryId
					})
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock category not found
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116' }
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow('Category not found');
			});

			it('returns 400 when category does not belong to teacher class', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						categoryId: newCategoryId
					})
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock category exists
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: { id: newCategoryId, class_id: 'other-class-id' },
					error: null
				});

				// Mock category class check - doesn't belong to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116' }
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow(
					'Category does not belong to one of your classes'
				);
			});

			it('updates visibility successfully', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ visible: false })
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock successful update
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						coursework_id: courseworkId,
						class_id: classId,
						visible: false,
						category_id: null,
						description_override: null,
						display_order: 1,
						created_at: '2025-01-01T00:00:00Z',
						updated_at: new Date().toISOString(),
						google_classroom_coursework: {
							title: 'Math Homework',
							description: 'Complete exercises',
							work_type: 'ASSIGNMENT',
							max_points: 100,
							due_date: '2025-02-01',
							due_time: '23:59:00'
						},
						classes: { name: '6th Grade Math' },
						coursework_categories: null
					},
					error: null
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await PATCH(event as any);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.sharedCoursework.visible).toBe(false);
			});

			it('updates categoryId successfully', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ categoryId: newCategoryId })
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock category exists and belongs to teacher's class
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: { id: newCategoryId, class_id: classId },
					error: null
				});

				// Mock category class verification successful
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: { id: classId },
					error: null
				});

				// Mock successful update
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						coursework_id: courseworkId,
						class_id: classId,
						visible: true,
						category_id: newCategoryId,
						description_override: null,
						display_order: 1,
						created_at: '2025-01-01T00:00:00Z',
						updated_at: new Date().toISOString(),
						google_classroom_coursework: {
							title: 'Math Homework',
							description: 'Complete exercises',
							work_type: 'ASSIGNMENT',
							max_points: 100,
							due_date: '2025-02-01',
							due_time: '23:59:00'
						},
						classes: { name: '6th Grade Math' },
						coursework_categories: { name: 'Homework' }
					},
					error: null
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await PATCH(event as any);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.sharedCoursework.categoryId).toBe(newCategoryId);
				expect(data.sharedCoursework.categoryName).toBe('Homework');
			});

			it('updates descriptionOverride successfully', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						descriptionOverride: 'Custom instructions for this class'
					})
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock successful update
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						coursework_id: courseworkId,
						class_id: classId,
						visible: true,
						category_id: null,
						description_override: 'Custom instructions for this class',
						display_order: 1,
						created_at: '2025-01-01T00:00:00Z',
						updated_at: new Date().toISOString(),
						google_classroom_coursework: {
							title: 'Math Homework',
							description: 'Original description',
							work_type: 'ASSIGNMENT',
							max_points: 100,
							due_date: '2025-02-01',
							due_time: '23:59:00'
						},
						classes: { name: '6th Grade Math' },
						coursework_categories: null
					},
					error: null
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await PATCH(event as any);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.sharedCoursework.descriptionOverride).toBe(
					'Custom instructions for this class'
				);
			});

			it('updates multiple fields at once', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						visible: false,
						categoryId: newCategoryId,
						descriptionOverride: 'Updated description'
					})
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock category exists and belongs to teacher's class
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: { id: newCategoryId, class_id: classId },
					error: null
				});

				// Mock category class verification successful
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: { id: classId },
					error: null
				});

				// Mock successful update
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						coursework_id: courseworkId,
						class_id: classId,
						visible: false,
						category_id: newCategoryId,
						description_override: 'Updated description',
						display_order: 1,
						created_at: '2025-01-01T00:00:00Z',
						updated_at: new Date().toISOString(),
						google_classroom_coursework: {
							title: 'Math Homework',
							description: 'Original description',
							work_type: 'ASSIGNMENT',
							max_points: 100,
							due_date: '2025-02-01',
							due_time: '23:59:00'
						},
						classes: { name: '6th Grade Math' },
						coursework_categories: { name: 'Homework' }
					},
					error: null
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await PATCH(event as any);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.sharedCoursework.visible).toBe(false);
				expect(data.sharedCoursework.categoryId).toBe(newCategoryId);
				expect(data.sharedCoursework.descriptionOverride).toBe('Updated description');
			});

			it('allows setting categoryId to null', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ categoryId: null })
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock successful update (no category validation needed for null)
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						coursework_id: courseworkId,
						class_id: classId,
						visible: true,
						category_id: null,
						description_override: null,
						display_order: 1,
						created_at: '2025-01-01T00:00:00Z',
						updated_at: new Date().toISOString(),
						google_classroom_coursework: {
							title: 'Math Homework',
							description: 'Complete exercises',
							work_type: 'ASSIGNMENT',
							max_points: 100,
							due_date: '2025-02-01',
							due_time: '23:59:00'
						},
						classes: { name: '6th Grade Math' },
						coursework_categories: null
					},
					error: null
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await PATCH(event as any);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.sharedCoursework.categoryId).toBeNull();
				expect(data.sharedCoursework.categoryName).toBeNull();
			});

			it('handles database errors gracefully', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ visible: false })
				};

				// Mock database error during fetch
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST999', message: 'Database error' }
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow('Shared coursework not found');
			});
		});

		describe('Topic Updates', () => {
			const topicId = 'dddd4444-dddd-44dd-dddd-444444444444';
			const newTopicId = 'eeee5555-eeee-55ee-eeee-555555555555';
			const courseId = '9f9e8877-9647-62fe-b279-f29fe3e02cf9';

			it('updates topic to valid topic from teacher course', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ topicId: newTopicId })
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock topic exists and belongs to teacher's course
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi
					.fn()
					.mockResolvedValueOnce({
						data: { id: newTopicId, google_course_id: courseId },
						error: null
					})
					.mockResolvedValueOnce({
						data: { id: courseId },
						error: null
					});

				// Mock successful update
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						coursework_id: courseworkId,
						class_id: classId,
						visible: true,
						category_id: null,
						topic_id: newTopicId,
						description_override: null,
						display_order: 1,
						created_at: '2025-01-01T00:00:00Z',
						updated_at: new Date().toISOString(),
						google_classroom_coursework: {
							title: 'Math Homework',
							description: 'Complete exercises',
							work_type: 'ASSIGNMENT',
							max_points: 100,
							due_date: '2025-02-01',
							due_time: '23:59:00'
						},
						classes: { name: '6th Grade Math' },
						coursework_categories: null
					},
					error: null
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await PATCH(event as any);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.sharedCoursework.topicId).toBe(newTopicId);
			});

			it('updates topic to null', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ topicId: null })
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock successful update (no topic validation needed for null)
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						coursework_id: courseworkId,
						class_id: classId,
						visible: true,
						category_id: null,
						topic_id: null,
						description_override: null,
						display_order: 1,
						created_at: '2025-01-01T00:00:00Z',
						updated_at: new Date().toISOString(),
						google_classroom_coursework: {
							title: 'Math Homework',
							description: 'Complete exercises',
							work_type: 'ASSIGNMENT',
							max_points: 100,
							due_date: '2025-02-01',
							due_time: '23:59:00'
						},
						classes: { name: '6th Grade Math' },
						coursework_categories: null
					},
					error: null
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await PATCH(event as any);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.sharedCoursework.topicId).toBeNull();
			});

			it('rejects topic update to different teacher topic', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ topicId: newTopicId })
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock topic exists but belongs to different teacher's course
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi
					.fn()
					.mockResolvedValueOnce({
						data: { id: newTopicId, google_course_id: 'other-course-id' },
						error: null
					})
					.mockResolvedValueOnce({
						data: null,
						error: { code: 'PGRST116' }
					});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow(
					'Topic does not belong to one of your courses'
				);
			});

			it('rejects non-existent topic UUID', async () => {
				const fakeTopicId = 'ffff6666-ffff-66ff-ffff-666666666666';
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ topicId: fakeTopicId })
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock topic not found
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116', message: 'Not found' }
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow('Topic not found');
			});

			it('rejects invalid topic UUID format', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({ topicId: 'not-a-valid-uuid' })
				};

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// Should fail Zod validation
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(PATCH(event as any)).rejects.toThrow();
			});

			it('does not modify topic when not provided in request', async () => {
				const mockParams = { id: sharedCourseworkId };
				const mockRequest = {
					json: vi.fn().mockResolvedValue({
						visible: false
						// topicId not provided
					})
				};

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						class_id: classId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock successful update - topic_id should remain unchanged
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						coursework_id: courseworkId,
						class_id: classId,
						visible: false,
						category_id: null,
						topic_id: topicId, // Original topic_id unchanged
						description_override: null,
						display_order: 1,
						created_at: '2025-01-01T00:00:00Z',
						updated_at: new Date().toISOString(),
						google_classroom_coursework: {
							title: 'Math Homework',
							description: 'Complete exercises',
							work_type: 'ASSIGNMENT',
							max_points: 100,
							due_date: '2025-02-01',
							due_time: '23:59:00'
						},
						classes: { name: '6th Grade Math' },
						coursework_categories: null
					},
					error: null
				});

				const event = {
					params: mockParams,
					request: mockRequest,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await PATCH(event as any);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				expect(data.sharedCoursework.visible).toBe(false);
				expect(data.sharedCoursework.topicId).toBe(topicId); // Topic unchanged
			});
		});
	});

	// ============================================================================
	// DELETE /api/google/shared-coursework/[id] - Delete by record ID
	// ============================================================================

	describe('DELETE /api/google/shared-coursework/[id]', () => {
		describe('Authorization', () => {
			it('returns 401 when not authenticated', async () => {
				vi.mocked(authModule.requireRole).mockRejectedValueOnce(
					new Error('Unauthorized: authentication required')
				);

				const mockParams = { id: sharedCourseworkId };

				const event = {
					params: mockParams,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(DELETE(event as any)).rejects.toThrow('Unauthorized: authentication required');
			});

			it('returns 403 when not a teacher', async () => {
				vi.mocked(authModule.requireRole).mockRejectedValueOnce(
					new Error('Unauthorized: teacher role required')
				);

				const mockParams = { id: sharedCourseworkId };

				const event = {
					params: mockParams,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(DELETE(event as any)).rejects.toThrow('Unauthorized: teacher role required');
			});

			it('returns 403 when record does not belong to teacher', async () => {
				const mockParams = { id: sharedCourseworkId };

				// Mock record exists but belongs to different teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						classes: { id: classId, teacher_id: otherTeacherId }
					},
					error: null
				});

				const event = {
					params: mockParams,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(DELETE(event as any)).rejects.toThrow(
					'You do not have permission to delete this record'
				);
			});
		});

		describe('Input Validation', () => {
			it('returns 400 for invalid record ID format', async () => {
				const mockParams = { id: 'not-a-uuid' };

				const event = {
					params: mockParams,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(DELETE(event as any)).rejects.toThrow('Invalid shared coursework ID');
			});

			it('returns 400 for null ID param', async () => {
				const mockParams = { id: null as unknown as string };

				const event = {
					params: mockParams,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(DELETE(event as any)).rejects.toThrow();
			});

			it('returns 400 for undefined ID param', async () => {
				const mockParams = { id: undefined as unknown as string };

				const event = {
					params: mockParams,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(DELETE(event as any)).rejects.toThrow();
			});
		});

		describe('Business Logic', () => {
			it('returns 404 when record not found', async () => {
				const mockParams = { id: sharedCourseworkId };

				// Mock record not found
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116', message: 'Not found' }
				});

				const event = {
					params: mockParams,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(DELETE(event as any)).rejects.toThrow(
					'Shared coursework not found or access denied'
				);
			});

			it('deletes record successfully', async () => {
				const mockParams = { id: sharedCourseworkId };

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock successful delete
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).delete = vi.fn().mockReturnThis();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).eq = vi.fn().mockResolvedValueOnce({
					data: null,
					error: null
				});

				const event = {
					params: mockParams,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const response = await DELETE(event as any);
				const data = await response.json();

				expect(response.status).toBe(200);
				expect(data.success).toBe(true);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).delete).toHaveBeenCalled();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				expect((mockLocals.supabase as any).eq).toHaveBeenCalledWith('id', sharedCourseworkId);
			});

			it('handles database errors during verification', async () => {
				const mockParams = { id: sharedCourseworkId };

				// Mock database error during fetch
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST999', message: 'Database error' }
				});

				const event = {
					params: mockParams,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(DELETE(event as any)).rejects.toThrow('Shared coursework not found');
			});

			it('handles database errors during deletion', async () => {
				const mockParams = { id: sharedCourseworkId };

				// Mock record exists and belongs to teacher
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).single = vi.fn().mockResolvedValueOnce({
					data: {
						id: sharedCourseworkId,
						classes: { id: classId, teacher_id: teacherId }
					},
					error: null
				});

				// Mock delete failure
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).delete = vi.fn().mockReturnThis();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mockLocals.supabase as any).eq = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST999', message: 'Delete failed' }
				});

				const event = {
					params: mockParams,
					locals: mockLocals
				} as unknown as RequestEvent;

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await expect(DELETE(event as any)).rejects.toThrow('Failed to delete shared coursework');
			});
		});
	});
});
