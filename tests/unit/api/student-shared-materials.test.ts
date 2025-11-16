import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { GET } from '/src/routes/api/student/shared-materials/+server';
import * as authModule from '$lib/server/middleware/auth';

/**
 * API Endpoint Tests: GET /api/student/shared-materials
 *
 * Tests critical paths:
 * - Student role authorization
 * - Filtering (by class, category, topic)
 * - Pagination (page, limit, boundaries)
 * - RLS (students only see materials from their classes)
 * - Test account exclusion
 * - Empty results handling
 */

// Mock middleware
vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn()
}));

describe('GET /api/student/shared-materials', () => {
	const studentId = '550e8400-e29b-41d4-a716-446655440000';
	const classId1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	const classId2 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
	const categoryId = '8d8f7788-8536-51fg-a168-f18gd2g01bf8';
	const topicId = '9e9g8899-9647-62gh-b279-g29hf3h12cg9';

	let mockLocals: RequestEvent['locals'];
	let mockUrl: URL;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock requireRole to return student user
		vi.mocked(authModule.requireRole).mockResolvedValue({
			user: { id: studentId, role: 'student' },
			profile: { id: studentId, role: 'student' }
		});

		// Mock Supabase client with chainable methods
		mockLocals = {
			supabase: {
				from: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn()
			}
		};

		// Mock URL with default query params
		mockUrl = new URL('http://localhost/api/student/shared-materials');
	});

	describe('Happy Path', () => {
		it('should return paginated materials for student', async () => {
			// Mock student classes
			mockLocals.supabase.eq = vi.fn().mockResolvedValueOnce({
				data: [{ class_id: classId1 }, { class_id: classId2 }],
				error: null
			});

			// Mock materials query with count
			const mockMaterials = [
				{
					id: 'share-1',
					description_override: null,
					visible: true,
					course_name: 'Math 101',
					teacher_name: 'Prof. Smith',
					created_at: '2025-01-15T10:00:00Z',
					google_classroom_materials: {
						id: 'material-1',
						google_material_id: 'google-1',
						title: 'Study Guide',
						description: 'Chapter 1',
						state: 'PUBLISHED',
						created_time: '2025-01-10T10:00:00Z',
						alternate_link: 'https://classroom.google.com/...',
						topic_id: null,
						google_classroom_topics: null,
						google_classroom_material_attachments: []
					},
					classes: { id: classId1, name: 'Class A', is_archived: false },
					coursework_categories: null,
					google_classroom_topics: null
				}
			];

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: mockMaterials,
				error: null
			});

			// Mock count query
			mockLocals.supabase.in = vi.fn().mockResolvedValueOnce({
				count: 1,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.materials).toHaveLength(1);
			expect(data.total).toBe(1);
			expect(data.page).toBe(1);
			expect(data.limit).toBe(20);
			expect(data.totalPages).toBe(1);
			expect(data.materials[0].material.title).toBe('Study Guide');
		});

		it('should return empty array if student has no classes', async () => {
			// Mock no classes for student
			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [],
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.materials).toEqual([]);
			expect(data.total).toBe(0);
			expect(data.totalPages).toBe(0);
		});

		it('should filter by classId', async () => {
			mockUrl.searchParams.set('classId', classId1);

			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 0,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);
			// Verify eq was called with classId filter
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('class_id', classId1);
		});

		it('should filter by categoryId', async () => {
			mockUrl.searchParams.set('categoryId', categoryId);

			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 0,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);
			// Verify category filter was applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('category_id', categoryId);
		});

		it('should filter by topicId', async () => {
			mockUrl.searchParams.set('topicId', topicId);

			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 0,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);
			// Verify topic filter was applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('topic_id', topicId);
		});

		it('should apply multiple filters simultaneously', async () => {
			mockUrl.searchParams.set('classId', classId1);
			mockUrl.searchParams.set('categoryId', categoryId);
			mockUrl.searchParams.set('topicId', topicId);

			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 0,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);
			// Verify all filters were applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('class_id', classId1);
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('category_id', categoryId);
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('topic_id', topicId);
		});

		it('should handle materials with attachments', async () => {
			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			const mockMaterialsWithAttachments = [
				{
					id: 'share-1',
					description_override: null,
					visible: true,
					course_name: 'Math 101',
					teacher_name: 'Prof. Smith',
					created_at: '2025-01-15T10:00:00Z',
					google_classroom_materials: {
						id: 'material-1',
						google_material_id: 'google-1',
						title: 'Resources',
						description: 'Lesson materials',
						state: 'PUBLISHED',
						created_time: '2025-01-10T10:00:00Z',
						alternate_link: 'https://classroom.google.com/...',
						topic_id: topicId,
						google_classroom_topics: { id: topicId, name: 'Algebra' },
						google_classroom_material_attachments: [
							{
								id: 'attach-1',
								material_type: 'DRIVE_FILE',
								google_file_id: 'file-123',
								file_name: 'Worksheet.pdf',
								file_url: 'https://drive.google.com/...',
								thumbnail_url: 'https://drive.google.com/thumb',
								title: 'Worksheet.pdf'
							},
							{
								id: 'attach-2',
								material_type: 'YOUTUBE_VIDEO',
								google_file_id: null,
								file_name: 'Tutorial',
								file_url: 'https://youtube.com/...',
								thumbnail_url: 'https://i.ytimg.com/...',
								title: 'Tutorial'
							}
						]
					},
					classes: { id: classId1, name: 'Class A', is_archived: false },
					coursework_categories: { id: categoryId, name: 'Homework', icon: 'book' },
					google_classroom_topics: { id: topicId, name: 'Algebra' }
				}
			];

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: mockMaterialsWithAttachments,
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 1,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.materials[0].material.attachments).toHaveLength(2);
			expect(data.materials[0].material.topic).toEqual({ id: topicId, name: 'Algebra' });
			expect(data.materials[0].category).toEqual({
				id: categoryId,
				name: 'Homework',
				icon: 'book'
			});
		});
	});

	describe('Pagination', () => {
		beforeEach(() => {
			// Mock student classes for all pagination tests
			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});
		});

		it('should default to page 1 and limit 20', async () => {
			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 0,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(data.page).toBe(1);
			expect(data.limit).toBe(20);
			// Verify range called with offset 0 and limit 19 (0-indexed)
			expect(mockLocals.supabase.range).toHaveBeenCalledWith(0, 19);
		});

		it('should accept custom page and limit', async () => {
			mockUrl.searchParams.set('page', '3');
			mockUrl.searchParams.set('limit', '10');

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 50,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(data.page).toBe(3);
			expect(data.limit).toBe(10);
			expect(data.totalPages).toBe(5); // 50 / 10 = 5 pages
			// Page 3 with limit 10: offset = (3-1) * 10 = 20
			expect(mockLocals.supabase.range).toHaveBeenCalledWith(20, 29);
		});

		it('should calculate totalPages correctly', async () => {
			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 47, // 47 items with limit 20 = 3 pages
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(data.totalPages).toBe(3); // Math.ceil(47 / 20) = 3
		});

		it('should handle page beyond totalPages gracefully', async () => {
			mockUrl.searchParams.set('page', '100');

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 20,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.materials).toEqual([]);
			expect(data.page).toBe(100);
			expect(data.totalPages).toBe(1);
		});

		it('should accept limit up to 100', async () => {
			mockUrl.searchParams.set('limit', '100');

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 0,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(data.limit).toBe(100);
			expect(mockLocals.supabase.range).toHaveBeenCalledWith(0, 99);
		});
	});

	describe('Validation Errors (400)', () => {
		it('should reject page 0', async () => {
			mockUrl.searchParams.set('page', '0');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should reject negative page', async () => {
			mockUrl.searchParams.set('page', '-1');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should reject limit 0', async () => {
			mockUrl.searchParams.set('limit', '0');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should reject limit over 100', async () => {
			mockUrl.searchParams.set('limit', '101');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should reject invalid classId UUID', async () => {
			mockUrl.searchParams.set('classId', 'not-a-uuid');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should reject invalid categoryId UUID', async () => {
			mockUrl.searchParams.set('categoryId', 'invalid');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should reject invalid topicId UUID', async () => {
			mockUrl.searchParams.set('topicId', 'bad-uuid');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should reject fractional page', async () => {
			mockUrl.searchParams.set('page', '1.5');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should reject fractional limit', async () => {
			mockUrl.searchParams.set('limit', '20.5');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});
	});

	describe('Database Errors (500)', () => {
		it('should handle class fetch errors', async () => {
			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: null,
				error: { code: '42P01', message: 'Table not found' }
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow('Failed to fetch student classes');
		});

		it('should handle materials fetch errors', async () => {
			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: null,
				error: { code: '42883', message: 'Function does not exist' }
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow('Failed to fetch materials');
		});

		it('should handle count query errors', async () => {
			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: null,
				error: { code: '42P01', message: 'Relation not found' }
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow('Failed to fetch materials');
		});
	});

	describe('Security & RLS', () => {
		it('should NOT filter by is_test (student-side endpoints show all materials)', async () => {
			// IMPORTANT: Test mode filtering is TEACHER-SIDE only (teachers toggle to see test/real students)
			// STUDENT-SIDE: Students see all materials shared with their classes, regardless of is_test status
			// This matches /api/student/shared-coursework behavior
			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 0,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify is_test filter was NOT applied (correct behavior)
			expect(mockLocals.supabase.eq).not.toHaveBeenCalledWith('is_test', false);
			expect(mockLocals.supabase.eq).not.toHaveBeenCalledWith('is_test', true);
		});

		it('should only show visible materials', async () => {
			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 0,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify visible = true filter was applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('visible', true);
		});

		it('should only show active classes (is_active = true)', async () => {
			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 0,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify is_active = true filter was applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith('classes.is_active', true);
		});

		it('should only show PUBLISHED materials', async () => {
			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 0,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify state filter was applied
			expect(mockLocals.supabase.eq).toHaveBeenCalledWith(
				'google_classroom_materials.state',
				'PUBLISHED'
			);
		});
	});

	describe('Edge Cases', () => {
		it('should handle null classId filter', async () => {
			mockUrl.searchParams.set('classId', 'null');

			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 0,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			expect(response.status).toBe(200);
		});

		it('should handle materials with nested array data', async () => {
			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			// Mock material with nested array (JOIN result)
			const mockMaterialsNested = [
				{
					id: 'share-1',
					description_override: null,
					visible: true,
					course_name: 'Math 101',
					teacher_name: 'Prof. Smith',
					created_at: '2025-01-15T10:00:00Z',
					google_classroom_materials: [
						{
							id: 'material-1',
							google_material_id: 'google-1',
							title: 'Study Guide',
							description: 'Chapter 1',
							state: 'PUBLISHED',
							created_time: '2025-01-10T10:00:00Z',
							alternate_link: 'https://classroom.google.com/...',
							topic_id: null,
							google_classroom_topics: null,
							google_classroom_material_attachments: []
						}
					],
					classes: [{ id: classId1, name: 'Class A', is_archived: false }],
					coursework_categories: null,
					google_classroom_topics: null
				}
			];

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: mockMaterialsNested,
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 1,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.materials).toHaveLength(1);
			expect(data.materials[0].material.title).toBe('Study Guide');
			expect(data.materials[0].class.id).toBe(classId1);
		});

		it('should handle very large page number gracefully', async () => {
			mockUrl.searchParams.set('page', '999999');

			mockLocals.supabase.eq.mockResolvedValueOnce({
				data: [{ class_id: classId1 }],
				error: null
			});

			mockLocals.supabase.range.mockResolvedValueOnce({
				data: [],
				error: null
			});

			mockLocals.supabase.in.mockResolvedValueOnce({
				count: 10,
				error: null
			});

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.materials).toEqual([]);
			expect(data.page).toBe(999999);
		});
	});
});
