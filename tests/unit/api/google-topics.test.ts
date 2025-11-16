import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { GET } from '/src/routes/api/google/topics/+server';
import * as authModule from '$lib/server/middleware/auth';
import type { GoogleTopic } from '$lib/types/google';

/**
 * API Endpoint Tests: GET /api/google/topics
 *
 * Tests critical paths:
 * - Teacher authorization
 * - Topic deduplication (same topic name across multiple courses)
 * - Alphabetical ordering
 * - Empty results handling
 * - Database errors
 */

// Mock middleware
vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn()
}));

describe('GET /api/google/topics', () => {
	const teacherId = '550e8400-e29b-41d4-a716-446655440000';
	const topicId1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	const topicId2 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
	const topicId3 = '8d8f7788-8536-51fg-a168-f18gd2g01bf8';

	let mockLocals: RequestEvent['locals'];

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock requireRole to return teacher user
		vi.mocked(authModule.requireRole).mockResolvedValue({
			user: { id: teacherId, role: 'teacher' },
			profile: { id: teacherId, role: 'teacher' }
		});

		// Mock Supabase client
		mockLocals = {
			supabase: {
				from: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn()
			}
		};
	});

	describe('Happy Path', () => {
		it('should return all unique topics for teacher', async () => {
			const mockTopics = [
				{ id: topicId1, name: 'Algebra', google_topic_id: 'google-topic-1' },
				{ id: topicId2, name: 'Geometry', google_topic_id: 'google-topic-2' },
				{ id: topicId3, name: 'Trigonometry', google_topic_id: 'google-topic-3' }
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(3);
			expect(data.topics[0].name).toBe('Algebra');
			expect(data.topics[1].name).toBe('Geometry');
			expect(data.topics[2].name).toBe('Trigonometry');
		});

		it('should return empty array if no topics exist', async () => {
			mockLocals.supabase.order.mockResolvedValueOnce({
				data: [],
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toEqual([]);
		});

		it('should return empty array if data is null', async () => {
			mockLocals.supabase.order.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toEqual([]);
		});

		it('should order topics alphabetically by name', async () => {
			const mockTopics = [
				{ id: topicId1, name: 'Algebra', google_topic_id: 'google-topic-1' },
				{ id: topicId2, name: 'Geometry', google_topic_id: 'google-topic-2' },
				{ id: topicId3, name: 'Calculus', google_topic_id: 'google-topic-3' }
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify order was called with ascending name
			expect(mockLocals.supabase.order).toHaveBeenCalledWith('name', { ascending: true });
		});

		it('should rely on RLS policies for teacher filtering', async () => {
			// Note: The endpoint does NOT explicitly filter by teacher_id
			// RLS policies automatically restrict topics to only those from teacher's courses
			mockLocals.supabase.order.mockResolvedValueOnce({
				data: [],
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify no explicit teacher_id filter (RLS handles it)
			expect(mockLocals.supabase.eq).not.toHaveBeenCalled();
			// Instead, verify the query was made
			expect(mockLocals.supabase.from).toHaveBeenCalledWith('google_classroom_topics');
			expect(mockLocals.supabase.select).toHaveBeenCalledWith('id, name, google_topic_id');
		});
	});

	describe('Topic Deduplication', () => {
		it('should keep topics with same name from different courses (dedup by ID)', async () => {
			// Same topic name "Algebra" appears in multiple courses - this is VALID
			// Topics are course-specific, so "Algebra" in Math 101 ≠ "Algebra" in Physics 201
			const mockTopics = [
				{ id: topicId1, name: 'Algebra', google_topic_id: 'google-topic-1' },
				{ id: topicId2, name: 'Algebra', google_topic_id: 'google-topic-2' }, // Different course, same name = KEEP
				{ id: topicId3, name: 'Geometry', google_topic_id: 'google-topic-3' }
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(3); // All 3 topics kept (different IDs)
			expect(data.topics.map((t: GoogleTopic) => t.name)).toEqual(['Algebra', 'Algebra', 'Geometry']);
		});

		it('should keep first occurrence when deduplicating by ID', async () => {
			// Same topic ID appears multiple times in query result (e.g., due to RLS JOIN)
			const mockTopics = [
				{ id: topicId1, name: 'Math', google_topic_id: 'google-topic-1' }, // First occurrence
				{ id: topicId1, name: 'Math', google_topic_id: 'google-topic-1' }, // Duplicate ID
				{ id: topicId1, name: 'Math', google_topic_id: 'google-topic-1' } // Duplicate ID
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(1);
			expect(data.topics[0].id).toBe(topicId1); // First occurrence kept
			expect(data.topics[0].google_topic_id).toBe('google-topic-1');
		});

		it('should keep all topics with same name but different IDs', async () => {
			// All topics have the same name but different IDs (from different courses)
			const mockTopics = [
				{ id: topicId1, name: 'Chapter 1', google_topic_id: 'google-topic-1' },
				{ id: topicId2, name: 'Chapter 1', google_topic_id: 'google-topic-2' },
				{ id: topicId3, name: 'Chapter 1', google_topic_id: 'google-topic-3' }
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(3); // All kept (different IDs)
			expect(data.topics.every((t: GoogleTopic) => t.name === 'Chapter 1')).toBe(true);
		});

		it('should be case-sensitive when deduplicating', async () => {
			// Different cases = different topics
			const mockTopics = [
				{ id: topicId1, name: 'algebra', google_topic_id: 'google-topic-1' },
				{ id: topicId2, name: 'Algebra', google_topic_id: 'google-topic-2' },
				{ id: topicId3, name: 'ALGEBRA', google_topic_id: 'google-topic-3' }
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(3); // All different due to case
			expect(data.topics.map((t: GoogleTopic) => t.name)).toEqual(['algebra', 'Algebra', 'ALGEBRA']);
		});

		it('should preserve all topic fields when deduplicating by ID', async () => {
			const mockTopics = [
				{
					id: topicId1,
					name: 'Algebra',
					google_topic_id: 'google-topic-1'
				},
				{
					id: topicId1, // Same ID (duplicate from JOIN)
					name: 'Algebra',
					google_topic_id: 'google-topic-1'
				}
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(1); // Deduplicated by ID
			expect(data.topics[0]).toEqual({
				id: topicId1,
				name: 'Algebra',
				google_topic_id: 'google-topic-1'
			});
		});
	});

	describe('Database Errors (500)', () => {
		it('should handle database fetch errors', async () => {
			mockLocals.supabase.order.mockResolvedValueOnce({
				data: null,
				error: { code: '42P01', message: 'Relation does not exist' }
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should handle database connection errors', async () => {
			mockLocals.supabase.order.mockResolvedValueOnce({
				data: null,
				error: { code: '08006', message: 'Connection failure' }
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should handle permission errors', async () => {
			mockLocals.supabase.order.mockResolvedValueOnce({
				data: null,
				error: { code: '42501', message: 'Permission denied' }
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});

		it('should handle unexpected errors gracefully', async () => {
			mockLocals.supabase.order.mockRejectedValueOnce(new Error('Unexpected database error'));

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow();
		});
	});

	describe('Edge Cases', () => {
		it('should handle topics with very long names', async () => {
			const longTopicName = 'A'.repeat(500);
			const mockTopics = [{ id: topicId1, name: longTopicName, google_topic_id: 'google-topic-1' }];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics[0].name).toBe(longTopicName);
		});

		it('should handle topics with special characters', async () => {
			const mockTopics = [
				{ id: topicId1, name: '<script>alert("xss")</script>', google_topic_id: 'google-topic-1' },
				{ id: topicId2, name: 'Topic & "quotes" \n\t', google_topic_id: 'google-topic-2' },
				{ id: topicId3, name: 'Émojis 🎉 and ü', google_topic_id: 'google-topic-3' }
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(3);
			// Verify special characters preserved
			expect(data.topics[0].name).toContain('<script>');
			expect(data.topics[1].name).toContain('&');
			expect(data.topics[2].name).toContain('🎉');
		});

		it('should handle topics with empty strings', async () => {
			const mockTopics = [
				{ id: topicId1, name: '', google_topic_id: 'google-topic-1' },
				{ id: topicId2, name: 'Valid Topic', google_topic_id: 'google-topic-2' }
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(2);
			expect(data.topics[0].name).toBe('');
		});

		it('should handle whitespace-only topic names', async () => {
			const mockTopics = [
				{ id: topicId1, name: '   ', google_topic_id: 'google-topic-1' },
				{ id: topicId2, name: '\t\n', google_topic_id: 'google-topic-2' }
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(2);
		});

		it('should handle very large number of topics', async () => {
			// Generate 1000 topics
			const manyTopics = Array.from({ length: 1000 }, (_, i) => ({
				id: `topic-${i}`,
				name: `Topic ${i}`,
				google_topic_id: `google-topic-${i}`
			}));

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: manyTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(1000);
		});

		it('should handle large number of topics with same names efficiently', async () => {
			// 100 topics, 10 unique names (10 topics per name) but all have different IDs
			const topicsWithDuplicates = [];
			for (let i = 0; i < 10; i++) {
				for (let j = 0; j < 10; j++) {
					topicsWithDuplicates.push({
						id: `topic-${i}-${j}`, // Unique ID
						name: `Topic ${i}`, // Same name within group
						google_topic_id: `google-topic-${i}-${j}`
					});
				}
			}

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: topicsWithDuplicates,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(100); // All 100 kept (unique IDs)
		});

		it('should handle Unicode topic names', async () => {
			const mockTopics = [
				{ id: topicId1, name: '数学', google_topic_id: 'google-topic-1' }, // Chinese
				{ id: topicId2, name: 'الرياضيات', google_topic_id: 'google-topic-2' }, // Arabic
				{ id: topicId3, name: 'Математика', google_topic_id: 'google-topic-3' } // Russian
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(3);
			expect(data.topics.map((t: GoogleTopic) => t.name)).toEqual(['数学', 'الرياضيات', 'Математика']);
		});

		it('should deduplicate topics with same ID but different google_topic_id', async () => {
			// Same internal ID but different Google IDs (could happen in JOIN results)
			const mockTopics = [
				{ id: topicId1, name: 'Topic A', google_topic_id: 'google-topic-1' },
				{ id: topicId1, name: 'Topic A', google_topic_id: 'google-topic-2' } // Same ID
			];

			mockLocals.supabase.order.mockResolvedValueOnce({
				data: mockTopics,
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.topics).toHaveLength(1); // Deduplicated by ID
			expect(data.topics[0].id).toBe(topicId1);
		});
	});

	describe('Authorization', () => {
		it('should require teacher role', async () => {
			mockLocals.supabase.order.mockResolvedValueOnce({
				data: [],
				error: null
			});

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			await GET(event);

			// Verify requireRole was called with 'teacher'
			expect(authModule.requireRole).toHaveBeenCalledWith(mockLocals, 'teacher');
		});

		it('should reject non-teacher users', async () => {
			vi.mocked(authModule.requireRole).mockRejectedValueOnce(new Error('Unauthorized'));

			const event = {
				locals: mockLocals
			} as unknown as RequestEvent;

			await expect(GET(event)).rejects.toThrow('Unauthorized');
		});
	});
});
