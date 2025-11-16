import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { POST, DELETE } from '../../../src/routes/api/google/materials/[id]/share/+server.js';
import * as authModule from '$lib/server/middleware/auth';

/**
 * API Endpoint Tests: POST/DELETE /api/google/materials/[id]/share
 *
 * Tests critical paths:
 * - Input validation (Zod schemas)
 * - Authorization (teacher ownership of materials and classes)
 * - Database operations (share/unshare)
 * - Error handling (404, 403, 400, 500)
 */

// Mock middleware
vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn()
}));

describe('POST /api/google/materials/[id]/share', () => {
	const validMaterialId = '550e8400-e29b-41d4-a716-446655440000';
	const teacherId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	const classId1 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
	const classId2 = '8d8f7788-8536-51fg-a168-f18gd2g01bf8';
	const categoryId = '9e9g8899-9647-62gh-b279-g29hf3h12cg9';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mockLocals: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mockRequest: any;

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
				insert: vi.fn().mockReturnThis(),
				upsert: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				single: vi.fn()
			}
		};

		// Mock request
		mockRequest = {
			json: vi.fn()
		};
	});

	describe('Happy Path', () => {
		it('should share material with one class successfully', async () => {
			// Mock request body
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				visible: true
			});

			// Mock material lookup (teacher owns material)
			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: {
						teacher_id: teacherId
					}
				},
				error: null
			});

			// Mock class lookup (teacher owns class)
			mockLocals.supabase.in.mockResolvedValueOnce({
				data: [{ id: classId1, teacher_id: teacherId }],
				error: null
			});

			// Mock upsert success
			mockLocals.supabase.upsert.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await POST(event as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.classesShared).toBe(1);
		});

		it('should share material with multiple classes', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1, classId2],
				categoryId: categoryId,
				visible: true
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				data: [
					{ id: classId1, teacher_id: teacherId },
					{ id: classId2, teacher_id: teacherId }
				],
				error: null
			});

			mockLocals.supabase.upsert.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await POST(event as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.classesShared).toBe(2);
		});

		it('should accept null categoryId and topicId', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				categoryId: null,
				topicId: null,
				visible: false
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				data: [{ id: classId1, teacher_id: teacherId }],
				error: null
			});

			mockLocals.supabase.upsert.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await POST(event as any);
			expect(response.status).toBe(200);

			// Verify upsert was called with null values
			expect(mockLocals.supabase.upsert).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						category_id: null,
						topic_id: null,
						visible: false
					})
				]),
				expect.any(Object)
			);
		});

		it('should accept custom description override', async () => {
			const customDescription = 'Custom description for this class';
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				descriptionOverride: customDescription,
				visible: true
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				data: [{ id: classId1, teacher_id: teacherId }],
				error: null
			});

			mockLocals.supabase.upsert.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await POST(event as any);
			expect(response.status).toBe(200);

			// Verify description was passed through
			expect(mockLocals.supabase.upsert).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						description_override: customDescription
					})
				]),
				expect.any(Object)
			);
		});
	});

	describe('Validation Errors (400)', () => {
		it('should reject invalid material ID parameter', async () => {
			const event = {
				params: { id: 'not-a-uuid' },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow();
		});

		it('should reject empty classIds array', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [],
				visible: true
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow();
		});

		it('should reject invalid UUID in classIds', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: ['not-a-uuid'],
				visible: true
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow();
		});

		it('should reject classIds with more than 50 items', async () => {
			const tooManyClasses = Array.from({ length: 51 }, () => classId1);
			mockRequest.json.mockResolvedValueOnce({
				classIds: tooManyClasses,
				visible: true
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow();
		});

		it('should reject description over 5000 characters', async () => {
			const tooLongDescription = 'a'.repeat(5001);
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				descriptionOverride: tooLongDescription,
				visible: true
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow();
		});

		it('should reject invalid categoryId UUID', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				categoryId: 'invalid-uuid',
				visible: true
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow();
		});
	});

	describe('Authorization Errors (403)', () => {
		it('should reject if material does not belong to teacher', async () => {
			const otherTeacherId = '9a9a9a9a-9a9a-9a9a-9a9a-9a9a9a9a9a9a';
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				visible: true
			});

			// Mock material owned by different teacher
			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: {
						teacher_id: otherTeacherId // Different teacher
					}
				},
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow('You do not own this material');
		});

		it('should reject if teacher does not own all classes', async () => {
			const otherTeacherId = '9a9a9a9a-9a9a-9a9a-9a9a-9a9a9a9a9a9a';
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1, classId2],
				visible: true
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			// Mock one class owned by different teacher
			mockLocals.supabase.in.mockResolvedValueOnce({
				data: [
					{ id: classId1, teacher_id: teacherId },
					{ id: classId2, teacher_id: otherTeacherId } // Different teacher
				],
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow('Access denied');
		});

		it('should reject if trying to share with archived classes', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				visible: true
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			// Mock class query returns empty (archived filtered out by eq(is_archived, false))
			mockLocals.supabase.in.mockResolvedValueOnce({
				data: [], // No classes found (archived)
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow('Invalid request');
		});
	});

	describe('Not Found Errors (404)', () => {
		it('should return 404 if material does not exist', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				visible: true
			});

			// Mock material not found
			mockLocals.supabase.single.mockResolvedValueOnce({
				data: null,
				error: { code: 'PGRST116', message: 'Not found' }
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow('Material not found');
		});
	});

	describe('Database Errors (500)', () => {
		it('should handle material fetch errors', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				visible: true
			});

			// Mock database error
			mockLocals.supabase.single.mockResolvedValueOnce({
				data: null,
				error: { code: '42P01', message: 'Relation does not exist' }
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow('Failed to fetch material');
		});

		it('should handle class fetch errors', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				visible: true
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			// Mock class fetch error
			mockLocals.supabase.in.mockResolvedValueOnce({
				data: null,
				error: { code: '42P01', message: 'Table not found' }
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow('Failed to verify class ownership');
		});

		it('should handle upsert errors', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				visible: true
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				data: [{ id: classId1, teacher_id: teacherId }],
				error: null
			});

			// Mock upsert error
			mockLocals.supabase.upsert.mockResolvedValueOnce({
				data: null,
				error: { code: '23505', message: 'Duplicate key violation' }
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(POST(event as any)).rejects.toThrow('Failed to share material');
		});
	});

	describe('Edge Cases', () => {
		it('should handle nested course data as array', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				visible: true
			});

			// Mock material with course data as array (JOIN result)
			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: [{ teacher_id: teacherId }]
				},
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				data: [{ id: classId1, teacher_id: teacherId }],
				error: null
			});

			mockLocals.supabase.upsert.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await POST(event as any);
			expect(response.status).toBe(200);
		});

		it('should handle exactly 50 classes (boundary)', async () => {
			const fiftyClasses = Array.from({ length: 50 }, (_, i) => {
				return `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`;
			});

			mockRequest.json.mockResolvedValueOnce({
				classIds: fiftyClasses,
				visible: true
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			// Mock all 50 classes owned by teacher
			const fiftyClassObjects = fiftyClasses.map((id) => ({ id, teacher_id: teacherId }));
			mockLocals.supabase.in.mockResolvedValueOnce({
				data: fiftyClassObjects,
				error: null
			});

			mockLocals.supabase.upsert.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await POST(event as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.classesShared).toBe(50);
		});

		it('should handle exactly 5000 character description (boundary)', async () => {
			const maxDescription = 'a'.repeat(5000);
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1],
				descriptionOverride: maxDescription,
				visible: true
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				data: [{ id: classId1, teacher_id: teacherId }],
				error: null
			});

			mockLocals.supabase.upsert.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await POST(event as any);
			expect(response.status).toBe(200);
		});
	});
});

describe('DELETE /api/google/materials/[id]/share', () => {
	const validMaterialId = '550e8400-e29b-41d4-a716-446655440000';
	const teacherId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	const classId1 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
	const classId2 = '8d8f7788-8536-51fg-a168-f18gd2g01bf8';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mockLocals: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mockRequest: any;

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(authModule.requireRole).mockResolvedValue({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			user: { id: teacherId, role: 'teacher' } as any,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			profile: { id: teacherId, role: 'teacher' } as any
		});

		mockLocals = {
			supabase: {
				from: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				single: vi.fn()
			}
		};

		mockRequest = {
			json: vi.fn()
		};
	});

	describe('Happy Path', () => {
		it('should unshare material from one class', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1]
			});

			// Mock material ownership check
			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			// Mock delete success
			mockLocals.supabase.in.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await DELETE(event as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.classesUnshared).toBe(1);
		});

		it('should unshare material from multiple classes', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1, classId2]
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await DELETE(event as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.classesUnshared).toBe(2);

			// Verify delete was called with correct parameters
			expect(mockLocals.supabase.delete).toHaveBeenCalled();
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('material_id', validMaterialId);
			expect(mockLocals.supabase.in).toHaveBeenCalledWith('class_id', [classId1, classId2]);
		});
	});

	describe('Validation Errors (400)', () => {
		it('should reject invalid material ID', async () => {
			const event = {
				params: { id: 'invalid-uuid' },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(DELETE(event as any)).rejects.toThrow();
		});

		it('should reject empty classIds array', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: []
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(DELETE(event as any)).rejects.toThrow();
		});

		it('should reject invalid UUIDs in classIds', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: ['not-a-uuid', classId1]
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(DELETE(event as any)).rejects.toThrow();
		});
	});

	describe('Authorization Errors (403)', () => {
		it('should reject if material does not belong to teacher', async () => {
			const otherTeacherId = '9a9a9a9a-9a9a-9a9a-9a9a-9a9a9a9a9a9a';
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1]
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: otherTeacherId }
				},
				error: null
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(DELETE(event as any)).rejects.toThrow('Unauthorized');
		});
	});

	describe('Not Found Errors (404)', () => {
		it('should return 404 if material does not exist', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1]
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: null,
				error: { code: 'PGRST116', message: 'Not found' }
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(DELETE(event as any)).rejects.toThrow('Material not found');
		});
	});

	describe('Database Errors (500)', () => {
		it('should handle delete errors', async () => {
			mockRequest.json.mockResolvedValueOnce({
				classIds: [classId1]
			});

			mockLocals.supabase.single.mockResolvedValueOnce({
				data: {
					id: validMaterialId,
					google_classroom_courses: { teacher_id: teacherId }
				},
				error: null
			});

			// Mock delete error
			mockLocals.supabase.in.mockResolvedValueOnce({
				data: null,
				error: { code: '23503', message: 'Foreign key violation' }
			});

			const event = {
				params: { id: validMaterialId },
				request: mockRequest,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(DELETE(event as any)).rejects.toThrow('Failed to unshare material');
		});
	});
});
