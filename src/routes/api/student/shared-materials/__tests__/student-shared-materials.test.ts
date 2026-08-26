import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { GET } from '../+server';
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

// Google Classroom is disabled in production via a hardcoded flag (the endpoint
// short-circuits with 403 when off). Force it on here so the real pagination /
// validation / RLS logic is exercised — the plumbing must keep working for when
// the feature is re-enabled.
vi.mock('$lib/config/google-classroom', () => ({
	GOOGLE_CLASSROOM_ENABLED: true
}));

/**
 * Mock harness notes
 * ------------------
 * The handler issues THREE distinct Supabase calls against a single client:
 *
 *  1. class_members:  from('class_members').select('class_id')
 *                       .eq('student_id', user.id).eq('status', 'active')   -> awaited
 *  2. materials:      from('shared_materials').select(<columns>)
 *                       .eq(...).eq(...).eq(...).in('class_id', ids)
 *                       [.eq(...) per filter].order(...).range(off, off+limit-1) -> awaited
 *  3. count:          from('shared_materials')
 *                       .select(<cols>, { count: 'exact', head: true })
 *                       .eq(...).eq(...).eq(...).in('class_id', ids)
 *                       [.eq(...) per filter]                              -> awaited
 *
 * Because chains have a VARIABLE terminal method (filters append extra .eq()
 * after .in() / .range()), we model each query as a self-resolving *thenable*
 * builder: every chain method returns the same builder, and the builder is
 * awaitable, resolving to a per-query configured result. The from() mock routes
 * by table name; for 'shared_materials' the select() mock routes by whether the
 * { count } option was passed (count query vs data query).
 *
 * Spy methods (eq/in/order/range) on the active builder are also forwarded onto
 * `mockSupabase` so existing assertions like
 * `expect(mockSupabase.eq).toHaveBeenCalledWith(...)` keep working across all
 * three queries.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResult = any;

interface QueryConfig {
	classMembers: AnyResult;
	materials: AnyResult;
	count: AnyResult;
}

// Mock type exposing the shared spy methods used in assertions
type MockSupabaseClient = SupabaseClient<Database> & {
	from: ReturnType<typeof vi.fn>;
	select: ReturnType<typeof vi.fn>;
	eq: ReturnType<typeof vi.fn>;
	in: ReturnType<typeof vi.fn>;
	order: ReturnType<typeof vi.fn>;
	range: ReturnType<typeof vi.fn>;
};

describe('GET /api/student/shared-materials', () => {
	const studentId = '550e8400-e29b-41d4-a716-446655440000';
	const classId1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	const classId2 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
	// NOTE: these must be valid UUIDs - the schema rejects malformed UUIDs with a 400.
	const categoryId = '8d8f7788-8536-41fa-a168-f18cd2c01bf8';
	const topicId = '9e9c8899-9647-42cb-b279-c29bf3b12cc9';

	let mockSupabase: MockSupabaseClient;
	let mockLocals: RequestEvent['locals'];
	let mockUrl: URL;
	let queryConfig: QueryConfig;

	/**
	 * Build a self-resolving thenable query builder.
	 * All chain methods are spies that return the builder; awaiting the builder
	 * resolves to `getResult()` (read lazily so tests can set results before the
	 * handler awaits them). Chain spies are mirrored onto `mockSupabase`.
	 */
	function makeBuilder(getResult: () => AnyResult) {
		const builder: Record<string, unknown> = {};
		const chainMethods = ['select', 'eq', 'in', 'order', 'range'] as const;
		for (const name of chainMethods) {
			builder[name] = vi.fn((...args: unknown[]) => {
				// Mirror the call onto the shared client spy for assertions
				(mockSupabase[name] as ReturnType<typeof vi.fn>)(...args);
				return builder;
			});
		}
		// Make the builder awaitable
		builder.then = (resolve: (v: AnyResult) => unknown, reject?: (e: unknown) => unknown) =>
			Promise.resolve(getResult()).then(resolve, reject);
		return builder;
	}

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(authModule.requireRole).mockResolvedValue({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			user: { id: studentId, role: 'student' } as any,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			profile: { id: studentId, role: 'student' } as any
		});

		// Per-query results, overridden per test. Sensible defaults: one class,
		// empty materials, zero count.
		queryConfig = {
			classMembers: { data: [{ class_id: classId1 }], error: null },
			materials: { data: [], error: null },
			count: { count: 0, error: null }
		};

		// Shared spies (assertions target these). They DON'T drive control flow;
		// the thenable builders do. They simply record calls.
		const sharedSpies = {
			select: vi.fn(),
			eq: vi.fn(),
			in: vi.fn(),
			order: vi.fn(),
			range: vi.fn()
		};

		const fromMock = vi.fn((table: string) => {
			if (table === 'class_members') {
				return makeBuilder(() => queryConfig.classMembers);
			}
			if (table === 'shared_materials') {
				// Route by whether select() received the { count } option.
				const builder: Record<string, unknown> = {};
				const chainMethods = ['eq', 'in', 'order', 'range'] as const;
				let isCountQuery = false;
				builder.select = vi.fn((_cols: unknown, opts?: { count?: string }) => {
					sharedSpies.select(_cols, opts);
					if (opts && opts.count) isCountQuery = true;
					return builder;
				});
				for (const name of chainMethods) {
					builder[name] = vi.fn((...args: unknown[]) => {
						sharedSpies[name](...args);
						return builder;
					});
				}
				builder.then = (resolve: (v: AnyResult) => unknown, reject?: (e: unknown) => unknown) =>
					Promise.resolve(isCountQuery ? queryConfig.count : queryConfig.materials).then(
						resolve,
						reject
					);
				return builder;
			}
			throw new Error(`Unexpected table in mock: ${table}`);
		});

		mockSupabase = {
			from: fromMock,
			...sharedSpies
		} as unknown as MockSupabaseClient;

		mockLocals = {
			supabase: mockSupabase
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any;

		mockUrl = new URL('http://localhost/api/student/shared-materials');
	});

	describe('Happy Path', () => {
		it('should return paginated materials for student', async () => {
			// Mock student classes
			queryConfig.classMembers = {
				data: [{ class_id: classId1 }, { class_id: classId2 }],
				error: null
			};

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

			queryConfig.materials = {
				data: mockMaterials,
				error: null
			};

			// Mock count query
			queryConfig.count = {
				count: 1,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
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
			queryConfig.classMembers = {
				data: [],
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.materials).toEqual([]);
			expect(data.total).toBe(0);
			expect(data.totalPages).toBe(0);
		});

		it('should filter by classId', async () => {
			mockUrl.searchParams.set('classId', classId1);

			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 0,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			expect(response.status).toBe(200);
			// Verify eq was called with classId filter
			expect(mockSupabase.eq).toHaveBeenCalledWith('class_id', classId1);
		});

		it('should filter by categoryId', async () => {
			mockUrl.searchParams.set('categoryId', categoryId);

			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 0,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			expect(response.status).toBe(200);
			// Verify category filter was applied
			expect(mockSupabase.eq).toHaveBeenCalledWith('category_id', categoryId);
		});

		it('should filter by topicId', async () => {
			mockUrl.searchParams.set('topicId', topicId);

			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 0,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			expect(response.status).toBe(200);
			// Verify topic filter was applied
			expect(mockSupabase.eq).toHaveBeenCalledWith('topic_id', topicId);
		});

		it('should apply multiple filters simultaneously', async () => {
			mockUrl.searchParams.set('classId', classId1);
			mockUrl.searchParams.set('categoryId', categoryId);
			mockUrl.searchParams.set('topicId', topicId);

			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 0,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			expect(response.status).toBe(200);
			// Verify all filters were applied
			expect(mockSupabase.eq).toHaveBeenCalledWith('class_id', classId1);
			expect(mockSupabase.eq).toHaveBeenCalledWith('category_id', categoryId);
			expect(mockSupabase.eq).toHaveBeenCalledWith('topic_id', topicId);
		});

		it('should handle materials with attachments', async () => {
			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

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

			queryConfig.materials = {
				data: mockMaterialsWithAttachments,
				error: null
			};

			queryConfig.count = {
				count: 1,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
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
			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};
		});

		it('should default to page 1 and limit 20', async () => {
			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 0,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();

			expect(data.page).toBe(1);
			expect(data.limit).toBe(20);
			// Verify range called with offset 0 and limit 19 (0-indexed)
			expect(mockSupabase.range).toHaveBeenCalledWith(0, 19);
		});

		it('should accept custom page and limit', async () => {
			mockUrl.searchParams.set('page', '3');
			mockUrl.searchParams.set('limit', '10');

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 50,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();

			expect(data.page).toBe(3);
			expect(data.limit).toBe(10);
			expect(data.totalPages).toBe(5); // 50 / 10 = 5 pages
			// Page 3 with limit 10: offset = (3-1) * 10 = 20
			expect(mockSupabase.range).toHaveBeenCalledWith(20, 29);
		});

		it('should calculate totalPages correctly', async () => {
			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 47, // 47 items with limit 20 = 3 pages
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();

			expect(data.totalPages).toBe(3); // Math.ceil(47 / 20) = 3
		});

		it('should handle page beyond totalPages gracefully', async () => {
			mockUrl.searchParams.set('page', '100');

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 20,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.materials).toEqual([]);
			expect(data.page).toBe(100);
			expect(data.totalPages).toBe(1);
		});

		it('should accept limit up to 100', async () => {
			mockUrl.searchParams.set('limit', '100');

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 0,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();

			expect(data.limit).toBe(100);
			expect(mockSupabase.range).toHaveBeenCalledWith(0, 99);
		});
	});

	describe('Pagination Coercion (out-of-range -> defaults)', () => {
		// IMPORTANT: paginationSchema (src/lib/server/validation/common.ts) was
		// changed to COERCE out-of-range page/limit values to defaults instead of
		// rejecting them with a 400. Per design:
		//   - page  < 1 or > 1000  -> 1
		//   - limit < 1 or > 100   -> 50  (the handler then re-defaults missing
		//                                  limit to 20 at the query-param layer,
		//                                  but a coerced 50 is a real value)
		//   - fractional values    -> parseInt() (e.g. '1.5' -> 1, '20.5' -> 20)
		// So these requests SUCCEED (200) with coerced pagination, they do NOT 400.

		it('should coerce page 0 to 1', async () => {
			mockUrl.searchParams.set('page', '0');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();
			expect(response.status).toBe(200);
			expect(data.page).toBe(1);
		});

		it('should coerce negative page to 1', async () => {
			mockUrl.searchParams.set('page', '-1');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();
			expect(response.status).toBe(200);
			expect(data.page).toBe(1);
		});

		it('should coerce limit 0 to 50', async () => {
			mockUrl.searchParams.set('limit', '0');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();
			expect(response.status).toBe(200);
			expect(data.limit).toBe(50);
		});

		it('should coerce limit over 100 to 50', async () => {
			mockUrl.searchParams.set('limit', '101');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();
			expect(response.status).toBe(200);
			expect(data.limit).toBe(50);
		});

		it('should parseInt fractional page (1.5 -> 1)', async () => {
			mockUrl.searchParams.set('page', '1.5');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();
			expect(response.status).toBe(200);
			expect(data.page).toBe(1);
		});

		it('should parseInt fractional limit (20.5 -> 20)', async () => {
			mockUrl.searchParams.set('limit', '20.5');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();
			expect(response.status).toBe(200);
			expect(data.limit).toBe(20);
		});
	});

	describe('Validation Errors (400)', () => {
		it('should reject invalid classId UUID', async () => {
			mockUrl.searchParams.set('classId', 'not-a-uuid');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(GET(event as any)).rejects.toMatchObject({ status: 400 });
		});

		it('should reject invalid categoryId UUID', async () => {
			mockUrl.searchParams.set('categoryId', 'invalid');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(GET(event as any)).rejects.toMatchObject({ status: 400 });
		});

		it('should reject invalid topicId UUID', async () => {
			mockUrl.searchParams.set('topicId', 'bad-uuid');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(GET(event as any)).rejects.toMatchObject({ status: 400 });
		});
	});

	describe('Database Errors (500)', () => {
		it('should handle class fetch errors', async () => {
			queryConfig.classMembers = {
				data: null,
				error: { code: '42P01', message: 'Table not found' }
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// SvelteKit error() throws an HttpError ({ status, body: { message } }),
			// not a standard Error, so assert on its shape rather than .message.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(GET(event as any)).rejects.toMatchObject({
				status: 500,
				body: { message: 'Failed to fetch student classes' }
			});
		});

		it('should handle materials fetch errors', async () => {
			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

			queryConfig.materials = {
				data: null,
				error: { code: '42883', message: 'Function does not exist' }
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(GET(event as any)).rejects.toMatchObject({
				status: 500,
				body: { message: 'Failed to fetch materials' }
			});
		});

		it('should handle count query errors', async () => {
			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: null,
				error: { code: '42P01', message: 'Relation not found' }
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(GET(event as any)).rejects.toMatchObject({
				status: 500,
				body: { message: 'Failed to fetch materials' }
			});
		});
	});

	describe('Security & RLS', () => {
		it('should NOT filter by is_test (student-side endpoints show all materials)', async () => {
			// IMPORTANT: Test mode filtering is TEACHER-SIDE only (teachers toggle to see test/real students)
			// STUDENT-SIDE: Students see all materials shared with their classes, regardless of is_test status
			// This matches /api/student/shared-coursework behavior
			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 0,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await GET(event as any);

			// Verify is_test filter was NOT applied (correct behavior)
			expect(mockSupabase.eq).not.toHaveBeenCalledWith('is_test', false);
			expect(mockSupabase.eq).not.toHaveBeenCalledWith('is_test', true);
		});

		it('should only show visible materials', async () => {
			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 0,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await GET(event as any);

			// Verify visible = true filter was applied
			expect(mockSupabase.eq).toHaveBeenCalledWith('visible', true);
		});

		it('should only show active classes (is_active = true)', async () => {
			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 0,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await GET(event as any);

			// Verify is_active = true filter was applied
			expect(mockSupabase.eq).toHaveBeenCalledWith('classes.is_active', true);
		});

		it('should only show PUBLISHED materials', async () => {
			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

			queryConfig.materials = {
				data: [],
				error: null
			};

			queryConfig.count = {
				count: 0,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await GET(event as any);

			// Verify state filter was applied
			expect(mockSupabase.eq).toHaveBeenCalledWith('google_classroom_materials.state', 'PUBLISHED');
		});
	});

	describe('Edge Cases', () => {
		it('should reject the literal string "null" as classId (not a valid UUID)', async () => {
			// The handler reads `classId = url.searchParams.get('classId') || undefined`.
			// The literal string 'null' is truthy, so it reaches uuidSchema.nullish()
			// and is rejected as an invalid UUID (400) - same as any other malformed
			// value. (To express "no class filter", the param must simply be absent.)
			mockUrl.searchParams.set('classId', 'null');

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await expect(GET(event as any)).rejects.toMatchObject({ status: 400 });
		});

		it('should succeed with no classId filter (absent param)', async () => {
			// The genuine "no filter" path: classId omitted entirely.
			queryConfig.materials = { data: [], error: null };
			queryConfig.count = { count: 0, error: null };

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			expect(response.status).toBe(200);
			// No class_id equality filter beyond the .in(class_id, ids) membership check
			expect(mockSupabase.eq).not.toHaveBeenCalledWith('class_id', expect.anything());
		});

		it('should handle materials with nested array data', async () => {
			queryConfig.classMembers = {
				data: [{ class_id: classId1 }],
				error: null
			};

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

			queryConfig.materials = {
				data: mockMaterialsNested,
				error: null
			};

			queryConfig.count = {
				count: 1,
				error: null
			};

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.materials).toHaveLength(1);
			expect(data.materials[0].material.title).toBe('Study Guide');
			expect(data.materials[0].class.id).toBe(classId1);
		});

		it('should coerce a very large page number (>1000) to 1', async () => {
			// paginationSchema coerces page > 1000 to 1 (out-of-range -> default).
			mockUrl.searchParams.set('page', '999999');

			queryConfig.materials = { data: [], error: null };
			queryConfig.count = { count: 10, error: null };

			const event = {
				url: mockUrl,
				locals: mockLocals
			} as unknown as RequestEvent;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = await GET(event as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.page).toBe(1);
			// offset = (1-1) * 20 = 0
			expect(mockSupabase.range).toHaveBeenCalledWith(0, 19);
		});
	});
});
