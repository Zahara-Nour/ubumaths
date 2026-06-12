import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { syncTopics, syncCourseWorkMaterials } from '$lib/server/google/sync';
import { GoogleClassroomClient } from '$lib/server/google/classroom-api';

// Shared holder for the mocked Google Classroom client instance.
// The constructor mock returns this object so every `new GoogleClassroomClient()`
// in the sync code resolves to the same instance the tests configure.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const classroomClientInstance: any = {
	listTopics: vi.fn(),
	listCourseWorkMaterials: vi.fn()
};

// Mock the Google Classroom client
vi.mock('$lib/server/google/classroom-api', () => ({
	GoogleClassroomClient: vi.fn(() => classroomClientInstance)
}));

// Mock encryption/decryption
vi.mock('$lib/server/google/encryption', () => ({
	decryptToken: vi.fn((token: string) => token),
	encryptToken: vi.fn((token: string) => token)
}));

// Mock type that includes query builder methods
type MockSupabaseClient = SupabaseClient<Database> & {
	from: ReturnType<typeof vi.fn>;
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
	upsert: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	eq: ReturnType<typeof vi.fn>;
	filter: ReturnType<typeof vi.fn>;
	single: ReturnType<typeof vi.fn>;
};

describe('Google Classroom Sync - Topics and Materials', () => {
	let mockSupabase: MockSupabaseClient;

	// Type as any to avoid TypeScript errors while letting the mock work properly
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mockClassroomClient: any;

	const validUuid = '550e8400-e29b-41d4-a716-446655440000';
	const teacherId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	const googleCourseId = 'google-course-123';

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Create mock Supabase client
		mockSupabase = {
			from: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			insert: vi.fn().mockReturnThis(),
			upsert: vi.fn().mockReturnThis(),
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			filter: vi.fn().mockReturnThis(),
			single: vi.fn()
		} as unknown as MockSupabaseClient;

		// Recreate the Google Classroom client method mocks on the shared instance.
		// vi.clearAllMocks() above clears their state but not their existence; we
		// reassign fresh vi.fn()s so per-test mockResolvedValueOnce starts clean.
		classroomClientInstance.listTopics = vi.fn();
		classroomClientInstance.listCourseWorkMaterials = vi.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mockClassroomClient = new (GoogleClassroomClient as any)();
	});

	/**
	 * Configure the topic-fetch result for syncCourseWorkMaterials.
	 *
	 * The topic fetch (`from().select('id, google_topic_id').eq('google_course_id', …)`)
	 * is awaited directly on the query builder (no `.single()`), unlike the
	 * `getTeacherAccessToken` chain which terminates in `.single()`. Both share the
	 * `eq` mock, so we keep `eq` chainable (returns `this`) and make the builder
	 * itself thenable to resolve the topic fetch exactly once.
	 *
	 * eslint-disable-next-line @typescript-eslint/no-explicit-any
	 */
	function mockTopicFetch(result: { data: unknown; error: unknown }) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(mockSupabase as any).then = vi.fn((resolve: (value: unknown) => unknown) => {
			// Consume on first await so later awaited builder chains (if any) don't reuse it.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(mockSupabase as any).then = undefined;
			return Promise.resolve(result).then(resolve);
		});
	}

	// ========================================
	// syncTopics Tests
	// ========================================

	describe('syncTopics', () => {
		describe('Happy Path', () => {
			it('should sync topics successfully', async () => {
				// Mock Google integration (access token)
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: {
						access_token: 'encrypted-token',
						refresh_token: 'encrypted-refresh',
						token_expiry: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
					},
					error: null
				});

				// Mock Google API response (topics)
				mockClassroomClient.listTopics.mockResolvedValueOnce({
					topic: [
						{
							courseId: googleCourseId,
							topicId: 'topic-1',
							name: 'Algebra',
							updateTime: '2025-01-15T10:00:00Z'
						},
						{
							courseId: googleCourseId,
							topicId: 'topic-2',
							name: 'Geometry',
							updateTime: '2025-01-15T11:00:00Z'
						}
					]
				});

				// Mock database upsert success
				mockSupabase.upsert = vi.fn().mockResolvedValue({
					data: null,
					error: null
				});

				// Mock delete (cleanup) success
				mockSupabase.delete = vi.fn().mockReturnThis();
				mockSupabase.filter = vi.fn().mockResolvedValue({
					data: null,
					error: null,
					count: 0
				});

				const result = await syncTopics(validUuid, googleCourseId, teacherId, mockSupabase);

				expect(result.synced).toBe(2);
				expect(result.errors).toHaveLength(0);
				expect(mockClassroomClient.listTopics).toHaveBeenCalledWith(googleCourseId);
			});

			it('should cleanup deleted topics', async () => {
				// Mock Google integration
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: {
						access_token: 'token',
						refresh_token: 'refresh',
						token_expiry: new Date(Date.now() + 3600000).toISOString()
					},
					error: null
				});

				// Mock Google API response (1 topic)
				mockClassroomClient.listTopics.mockResolvedValueOnce({
					topic: [
						{
							courseId: googleCourseId,
							topicId: 'topic-1',
							name: 'Algebra',
							updateTime: '2025-01-15T10:00:00Z'
						}
					]
				});

				// Mock upsert success
				mockSupabase.upsert = vi.fn().mockResolvedValue({ data: null, error: null });

				// Mock delete with count (2 topics deleted)
				mockSupabase.delete = vi.fn().mockReturnThis();
				mockSupabase.filter = vi.fn().mockResolvedValue({
					data: null,
					error: null,
					count: 2
				});

				const result = await syncTopics(validUuid, googleCourseId, teacherId, mockSupabase);

				expect(result.synced).toBe(1);
				expect(result.errors).toHaveLength(0);
				// Verify cleanup was attempted
				expect(mockSupabase.delete).toHaveBeenCalled();
			});

			it('should handle empty topic list', async () => {
				// Mock Google integration
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: {
						access_token: 'token',
						refresh_token: 'refresh',
						token_expiry: new Date(Date.now() + 3600000).toISOString()
					},
					error: null
				});

				// Mock Google API response (no topics)
				mockClassroomClient.listTopics.mockResolvedValueOnce({
					topic: []
				});

				const result = await syncTopics(validUuid, googleCourseId, teacherId, mockSupabase);

				expect(result.synced).toBe(0);
				expect(result.errors).toHaveLength(0);
			});

			it('should handle null topics from API', async () => {
				// Mock Google integration
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: {
						access_token: 'token',
						refresh_token: 'refresh',
						token_expiry: new Date(Date.now() + 3600000).toISOString()
					},
					error: null
				});

				// Mock Google API response (null topics)
				mockClassroomClient.listTopics.mockResolvedValueOnce({
					topic: null
				});

				const result = await syncTopics(validUuid, googleCourseId, teacherId, mockSupabase);

				expect(result.synced).toBe(0);
				expect(result.errors).toHaveLength(0);
			});
		});

		describe('Error Cases', () => {
			it('should handle missing Google integration', async () => {
				// Mock no Google integration
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: null,
					error: { message: 'Not found', code: 'PGRST116' }
				});

				const result = await syncTopics(validUuid, googleCourseId, teacherId, mockSupabase);

				expect(result.synced).toBe(0);
				expect(result.errors.length).toBeGreaterThan(0);
				expect(result.errors[0]).toContain('No Google integration found');
			});

			it('should handle topic upsert errors', async () => {
				// Mock Google integration
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: {
						access_token: 'token',
						refresh_token: 'refresh',
						token_expiry: new Date(Date.now() + 3600000).toISOString()
					},
					error: null
				});

				// Mock Google API response
				mockClassroomClient.listTopics.mockResolvedValueOnce({
					topic: [
						{
							courseId: googleCourseId,
							topicId: 'topic-1',
							name: 'Algebra',
							updateTime: '2025-01-15T10:00:00Z'
						}
					]
				});

				// Mock upsert failure
				mockSupabase.upsert = vi.fn().mockResolvedValue({
					data: null,
					error: { message: 'Database error', code: '23505' }
				});

				const result = await syncTopics(validUuid, googleCourseId, teacherId, mockSupabase);

				expect(result.synced).toBe(0);
				expect(result.errors.length).toBeGreaterThan(0);
				expect(result.errors[0]).toContain('Failed to sync topic');
			});

			it('should handle API errors gracefully', async () => {
				// Mock Google integration
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: {
						access_token: 'token',
						refresh_token: 'refresh',
						token_expiry: new Date(Date.now() + 3600000).toISOString()
					},
					error: null
				});

				// Mock Google API error
				mockClassroomClient.listTopics.mockRejectedValueOnce(
					new Error('Google API rate limit exceeded')
				);

				const result = await syncTopics(validUuid, googleCourseId, teacherId, mockSupabase);

				expect(result.synced).toBe(0);
				expect(result.errors.length).toBeGreaterThan(0);
				expect(result.errors[0]).toContain('Failed to sync topics');
			});

			it('should handle cleanup errors gracefully', async () => {
				// Mock Google integration
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: {
						access_token: 'token',
						refresh_token: 'refresh',
						token_expiry: new Date(Date.now() + 3600000).toISOString()
					},
					error: null
				});

				// Mock Google API response
				mockClassroomClient.listTopics.mockResolvedValueOnce({
					topic: [
						{
							courseId: googleCourseId,
							topicId: 'topic-1',
							name: 'Algebra',
							updateTime: '2025-01-15T10:00:00Z'
						}
					]
				});

				// Mock upsert success
				mockSupabase.upsert = vi.fn().mockResolvedValue({ data: null, error: null });

				// Mock cleanup failure
				mockSupabase.delete = vi.fn().mockReturnThis();
				mockSupabase.filter = vi.fn().mockResolvedValue({
					data: null,
					error: { message: 'Cleanup failed', code: '23503' },
					count: null
				});

				const result = await syncTopics(validUuid, googleCourseId, teacherId, mockSupabase);

				expect(result.synced).toBe(1);
				expect(result.errors.length).toBeGreaterThan(0);
				expect(result.errors[0]).toContain('Failed to cleanup old topics');
			});
		});

		describe('Edge Cases', () => {
			it('should handle very long topic names', async () => {
				// Mock Google integration
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: {
						access_token: 'token',
						refresh_token: 'refresh',
						token_expiry: new Date(Date.now() + 3600000).toISOString()
					},
					error: null
				});

				// Mock Google API response with very long name
				const longName = 'A'.repeat(500);
				mockClassroomClient.listTopics.mockResolvedValueOnce({
					topic: [
						{
							courseId: googleCourseId,
							topicId: 'topic-1',
							name: longName,
							updateTime: '2025-01-15T10:00:00Z'
						}
					]
				});

				// Mock upsert success
				mockSupabase.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
				mockSupabase.delete = vi.fn().mockReturnThis();
				mockSupabase.filter = vi.fn().mockResolvedValue({ data: null, error: null, count: 0 });

				const result = await syncTopics(validUuid, googleCourseId, teacherId, mockSupabase);

				expect(result.synced).toBe(1);
				expect(mockSupabase.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						name: longName
					}),
					expect.any(Object)
				);
			});

			it('should handle special characters in topic names', async () => {
				// Mock Google integration
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: {
						access_token: 'token',
						refresh_token: 'refresh',
						token_expiry: new Date(Date.now() + 3600000).toISOString()
					},
					error: null
				});

				// Mock Google API response with special characters
				mockClassroomClient.listTopics.mockResolvedValueOnce({
					topic: [
						{
							courseId: googleCourseId,
							topicId: 'topic-1',
							name: '<script>alert("xss")</script> & "quotes" \n\t',
							updateTime: '2025-01-15T10:00:00Z'
						}
					]
				});

				// Mock upsert success
				mockSupabase.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
				mockSupabase.delete = vi.fn().mockReturnThis();
				mockSupabase.filter = vi.fn().mockResolvedValue({ data: null, error: null, count: 0 });

				const result = await syncTopics(validUuid, googleCourseId, teacherId, mockSupabase);

				expect(result.synced).toBe(1);
			});
		});
	});

	// ========================================
	// syncCourseWorkMaterials Tests
	// ========================================

	describe('syncCourseWorkMaterials', () => {
		describe('Happy Path', () => {
			it('should sync course work materials successfully', async () => {
				// Mock Google integration
				mockSupabase.single = vi
					.fn()
					.mockResolvedValueOnce({
						data: {
							access_token: 'token',
							refresh_token: 'refresh',
							token_expiry: new Date(Date.now() + 3600000).toISOString()
						},
						error: null
					})
					.mockResolvedValueOnce({
						// Material upsert response
						data: { id: validUuid },
						error: null
					});

				// Mock topic fetch
				mockTopicFetch({
					data: [
						{ id: 'internal-topic-1', google_topic_id: 'google-topic-1' },
						{ id: 'internal-topic-2', google_topic_id: 'google-topic-2' }
					],
					error: null
				});

				// Mock Google API response (materials)
				mockClassroomClient.listCourseWorkMaterials.mockResolvedValueOnce({
					courseWorkMaterial: [
						{
							id: 'material-1',
							courseId: googleCourseId,
							title: 'Study Guide',
							description: 'Chapter 1 study guide',
							state: 'PUBLISHED',
							creationTime: '2025-01-15T10:00:00Z',
							updateTime: '2025-01-15T11:00:00Z',
							alternateLink: 'https://classroom.google.com/...',
							topicId: 'google-topic-1',
							materials: []
						}
					],
					nextPageToken: undefined
				});

				// Mock upsert success (chainable → 2nd single() above returns { id })
				mockSupabase.upsert = vi.fn().mockReturnThis();

				const result = await syncCourseWorkMaterials(
					validUuid,
					googleCourseId,
					teacherId,
					mockSupabase
				);

				expect(result.synced).toBe(1);
				expect(result.errors).toHaveLength(0);
			});

			it('should sync materials with attachments', async () => {
				// Mock Google integration
				mockSupabase.single = vi
					.fn()
					.mockResolvedValueOnce({
						data: {
							access_token: 'token',
							refresh_token: 'refresh',
							token_expiry: new Date(Date.now() + 3600000).toISOString()
						},
						error: null
					})
					.mockResolvedValueOnce({
						data: { id: validUuid },
						error: null
					});

				// Mock topic fetch
				mockTopicFetch({
					data: [],
					error: null
				});

				// Mock Google API response with attachments
				mockClassroomClient.listCourseWorkMaterials.mockResolvedValueOnce({
					courseWorkMaterial: [
						{
							id: 'material-1',
							courseId: googleCourseId,
							title: 'Lesson Resources',
							state: 'PUBLISHED',
							creationTime: '2025-01-15T10:00:00Z',
							updateTime: '2025-01-15T11:00:00Z',
							alternateLink: 'https://classroom.google.com/...',
							materials: [
								{
									driveFile: {
										id: 'file-123',
										title: 'Worksheet.pdf',
										alternateLink: 'https://drive.google.com/...',
										thumbnailUrl: 'https://drive.google.com/thumb'
									}
								},
								{
									link: {
										url: 'https://example.com/video',
										title: 'Tutorial Video'
									}
								}
							]
						}
					]
				});

				// Mock upsert for material (chainable → 2nd single() above returns { id })
				mockSupabase.upsert = vi.fn().mockReturnThis();

				// Mock delete for old attachments (delete().eq() chain; result is ignored by code,
				// so eq stays chainable to avoid breaking getTeacherAccessToken's eq().single())
				mockSupabase.delete = vi.fn().mockReturnThis();

				// Mock insert for new attachments
				mockSupabase.insert = vi.fn().mockResolvedValue({ data: null, error: null });

				const result = await syncCourseWorkMaterials(
					validUuid,
					googleCourseId,
					teacherId,
					mockSupabase
				);

				expect(result.synced).toBe(1);
				expect(result.errors).toHaveLength(0);
				// Verify attachments were inserted (2 attachments)
				expect(mockSupabase.insert).toHaveBeenCalledTimes(2);
			});

			it('should handle empty materials list', async () => {
				// Mock Google integration
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: {
						access_token: 'token',
						refresh_token: 'refresh',
						token_expiry: new Date(Date.now() + 3600000).toISOString()
					},
					error: null
				});

				// Mock Google API response (no materials)
				mockClassroomClient.listCourseWorkMaterials.mockResolvedValueOnce({
					courseWorkMaterial: []
				});

				const result = await syncCourseWorkMaterials(
					validUuid,
					googleCourseId,
					teacherId,
					mockSupabase
				);

				expect(result.synced).toBe(0);
				expect(result.errors).toHaveLength(0);
			});

			it('should link materials to topics correctly', async () => {
				// Mock Google integration
				mockSupabase.single = vi
					.fn()
					.mockResolvedValueOnce({
						data: {
							access_token: 'token',
							refresh_token: 'refresh',
							token_expiry: new Date(Date.now() + 3600000).toISOString()
						},
						error: null
					})
					.mockResolvedValueOnce({
						data: { id: validUuid },
						error: null
					});

				// Mock topic fetch with mapping
				mockTopicFetch({
					data: [{ id: 'internal-topic-id', google_topic_id: 'google-topic-id' }],
					error: null
				});

				// Mock Google API response with topic
				mockClassroomClient.listCourseWorkMaterials.mockResolvedValueOnce({
					courseWorkMaterial: [
						{
							id: 'material-1',
							courseId: googleCourseId,
							title: 'Material',
							state: 'PUBLISHED',
							topicId: 'google-topic-id',
							creationTime: '2025-01-15T10:00:00Z',
							updateTime: '2025-01-15T11:00:00Z',
							alternateLink: 'https://classroom.google.com/...',
							materials: []
						}
					]
				});

				// Mock upsert (chainable → 2nd single() above returns { id })
				mockSupabase.upsert = vi.fn().mockReturnThis();

				const result = await syncCourseWorkMaterials(
					validUuid,
					googleCourseId,
					teacherId,
					mockSupabase
				);

				expect(result.synced).toBe(1);
				// Verify topic_id was set correctly
				expect(mockSupabase.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						topic_id: 'internal-topic-id'
					}),
					expect.any(Object)
				);
			});
		});

		describe('Error Cases', () => {
			it('should handle material upsert errors', async () => {
				// Mock Google integration
				mockSupabase.single = vi.fn().mockResolvedValueOnce({
					data: {
						access_token: 'token',
						refresh_token: 'refresh',
						token_expiry: new Date(Date.now() + 3600000).toISOString()
					},
					error: null
				});

				// Mock topic fetch
				mockTopicFetch({
					data: [],
					error: null
				});

				// Mock Google API response
				mockClassroomClient.listCourseWorkMaterials.mockResolvedValueOnce({
					courseWorkMaterial: [
						{
							id: 'material-1',
							courseId: googleCourseId,
							title: 'Material',
							state: 'PUBLISHED',
							creationTime: '2025-01-15T10:00:00Z',
							updateTime: '2025-01-15T11:00:00Z',
							alternateLink: 'https://classroom.google.com/...',
							materials: []
						}
					]
				});

				// Mock upsert failure. The material upsert chain is
				// `upsert(...).select('id').single()`, so the error surfaces on the
				// terminal single() call, not on upsert() itself.
				mockSupabase.upsert = vi.fn().mockReturnThis();
				mockSupabase.single.mockResolvedValueOnce({
					data: null,
					error: { message: 'Database constraint violation', code: '23505' }
				});

				const result = await syncCourseWorkMaterials(
					validUuid,
					googleCourseId,
					teacherId,
					mockSupabase
				);

				expect(result.synced).toBe(0);
				expect(result.errors.length).toBeGreaterThan(0);
				expect(result.errors[0]).toContain('Failed to sync material');
			});

			it('should handle topic fetch errors gracefully', async () => {
				// Mock Google integration
				mockSupabase.single = vi
					.fn()
					.mockResolvedValueOnce({
						data: {
							access_token: 'token',
							refresh_token: 'refresh',
							token_expiry: new Date(Date.now() + 3600000).toISOString()
						},
						error: null
					})
					.mockResolvedValueOnce({
						data: { id: validUuid },
						error: null
					});

				// Mock topic fetch error
				mockTopicFetch({
					data: null,
					error: { message: 'Failed to fetch topics', code: '42P01' }
				});

				// Mock Google API response
				mockClassroomClient.listCourseWorkMaterials.mockResolvedValueOnce({
					courseWorkMaterial: [
						{
							id: 'material-1',
							courseId: googleCourseId,
							title: 'Material',
							state: 'PUBLISHED',
							creationTime: '2025-01-15T10:00:00Z',
							updateTime: '2025-01-15T11:00:00Z',
							alternateLink: 'https://classroom.google.com/...',
							materials: []
						}
					]
				});

				// Mock upsert success (chainable: upsert().select('id').single() → 2nd single() above)
				mockSupabase.upsert = vi.fn().mockReturnThis();

				const result = await syncCourseWorkMaterials(
					validUuid,
					googleCourseId,
					teacherId,
					mockSupabase
				);

				// Should still sync materials, but with error about topics
				expect(result.synced).toBe(1);
				expect(result.errors.length).toBeGreaterThan(0);
				expect(result.errors[0]).toContain('Failed to fetch topics');
			});

			it('should handle attachment sync errors', async () => {
				// Mock Google integration
				mockSupabase.single = vi
					.fn()
					.mockResolvedValueOnce({
						data: {
							access_token: 'token',
							refresh_token: 'refresh',
							token_expiry: new Date(Date.now() + 3600000).toISOString()
						},
						error: null
					})
					.mockResolvedValueOnce({
						data: { id: validUuid },
						error: null
					});

				// Mock topic fetch
				mockTopicFetch({
					data: [],
					error: null
				});

				// Mock Google API response with attachments
				mockClassroomClient.listCourseWorkMaterials.mockResolvedValueOnce({
					courseWorkMaterial: [
						{
							id: 'material-1',
							courseId: googleCourseId,
							title: 'Material',
							state: 'PUBLISHED',
							creationTime: '2025-01-15T10:00:00Z',
							updateTime: '2025-01-15T11:00:00Z',
							alternateLink: 'https://classroom.google.com/...',
							materials: [
								{
									driveFile: {
										id: 'file-123',
										title: 'File',
										alternateLink: 'https://drive.google.com/...'
									}
								}
							]
						}
					]
				});

				// Mock material upsert success (chainable → 2nd single() above returns { id })
				mockSupabase.upsert = vi.fn().mockReturnThis();

				// Mock delete success (delete().eq() chain; result ignored by code)
				mockSupabase.delete = vi.fn().mockReturnThis();

				// Mock attachment insert failure.
				// NOTE: the source `await supabase.from(...).insert({...})` (sync.ts:718)
				// does NOT inspect the resolved `{ error }` — unlike the topic-fetch and
				// material-upsert paths in the same function, it only catches *thrown*
				// errors. A resolved Supabase error is therefore silently swallowed, so
				// this assertion exposes that latent bug rather than mock drift.
				mockSupabase.insert = vi.fn().mockResolvedValue({
					data: null,
					error: { message: 'Insert failed', code: '23503' }
				});

				const result = await syncCourseWorkMaterials(
					validUuid,
					googleCourseId,
					teacherId,
					mockSupabase
				);

				// Material synced but attachment failed
				expect(result.synced).toBe(1);
				expect(result.errors.length).toBeGreaterThan(0);
				expect(result.errors[0]).toContain('Failed to sync attachment');
			});
		});

		describe('Edge Cases', () => {
			it('should handle materials without topics', async () => {
				// Mock Google integration
				mockSupabase.single = vi
					.fn()
					.mockResolvedValueOnce({
						data: {
							access_token: 'token',
							refresh_token: 'refresh',
							token_expiry: new Date(Date.now() + 3600000).toISOString()
						},
						error: null
					})
					.mockResolvedValueOnce({
						data: { id: validUuid },
						error: null
					});

				// Mock topic fetch
				mockTopicFetch({
					data: [],
					error: null
				});

				// Mock Google API response without topicId
				mockClassroomClient.listCourseWorkMaterials.mockResolvedValueOnce({
					courseWorkMaterial: [
						{
							id: 'material-1',
							courseId: googleCourseId,
							title: 'Material',
							state: 'PUBLISHED',
							creationTime: '2025-01-15T10:00:00Z',
							updateTime: '2025-01-15T11:00:00Z',
							alternateLink: 'https://classroom.google.com/...',
							// No topicId
							materials: []
						}
					]
				});

				// Mock upsert success (chainable → 2nd single() above returns { id })
				mockSupabase.upsert = vi.fn().mockReturnThis();

				const result = await syncCourseWorkMaterials(
					validUuid,
					googleCourseId,
					teacherId,
					mockSupabase
				);

				expect(result.synced).toBe(1);
				// Verify topic_id is null
				expect(mockSupabase.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						topic_id: null
					}),
					expect.any(Object)
				);
			});

			it('should handle very long descriptions', async () => {
				// Mock Google integration
				mockSupabase.single = vi
					.fn()
					.mockResolvedValueOnce({
						data: {
							access_token: 'token',
							refresh_token: 'refresh',
							token_expiry: new Date(Date.now() + 3600000).toISOString()
						},
						error: null
					})
					.mockResolvedValueOnce({
						data: { id: validUuid },
						error: null
					});

				// Mock topic fetch
				mockTopicFetch({
					data: [],
					error: null
				});

				// Mock Google API response with very long description
				const longDescription = 'A'.repeat(10000);
				mockClassroomClient.listCourseWorkMaterials.mockResolvedValueOnce({
					courseWorkMaterial: [
						{
							id: 'material-1',
							courseId: googleCourseId,
							title: 'Material',
							description: longDescription,
							state: 'PUBLISHED',
							creationTime: '2025-01-15T10:00:00Z',
							updateTime: '2025-01-15T11:00:00Z',
							alternateLink: 'https://classroom.google.com/...',
							materials: []
						}
					]
				});

				// Mock upsert success (chainable → 2nd single() above returns { id })
				mockSupabase.upsert = vi.fn().mockReturnThis();

				const result = await syncCourseWorkMaterials(
					validUuid,
					googleCourseId,
					teacherId,
					mockSupabase
				);

				expect(result.synced).toBe(1);
			});
		});
	});
});
