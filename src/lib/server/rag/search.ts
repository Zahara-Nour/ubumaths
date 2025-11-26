/**
 * Hybrid RAG Search Service
 *
 * Combines vector similarity search (embeddings) with full-text search (tsvector)
 * using Reciprocal Rank Fusion for optimal results.
 *
 * Includes fallback to FTS-only when embeddings are unavailable.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmbeddingService } from './embeddings';

export interface SearchOptions {
	limit?: number;
	gradeLevel?: string;
	topics?: string[];
	vectorWeight?: number;
	ftsWeight?: number;
}

export interface SearchResult {
	chunkId: string;
	documentId: string;
	documentTitle: string;
	content: string;
	combinedScore: number;
	vectorScore: number | null;
	ftsScore: number | null;
	metadata?: Record<string, unknown>;
}

/**
 * Perform hybrid search combining vector similarity and full-text search
 * Falls back to FTS-only if embeddings are unavailable
 */
export async function hybridSearch(
	supabase: SupabaseClient,
	query: string,
	options: SearchOptions = {}
): Promise<SearchResult[]> {
	const { limit = 5, gradeLevel, topics, vectorWeight = 0.7, ftsWeight = 0.3 } = options;

	// Try to get query embedding
	const embeddingService = getEmbeddingService();
	const queryEmbedding = await embeddingService.embedQuery(query);

	if (queryEmbedding) {
		// Full hybrid search with embeddings
		return executeHybridSearch(supabase, queryEmbedding, query, {
			limit,
			gradeLevel,
			topics,
			vectorWeight,
			ftsWeight
		});
	} else {
		// Fallback to FTS-only
		console.warn('Embeddings unavailable, falling back to FTS-only search');
		return executeFtsSearch(supabase, query, { limit, gradeLevel, topics });
	}
}

/**
 * Execute hybrid search using the database function
 */
async function executeHybridSearch(
	supabase: SupabaseClient,
	queryEmbedding: number[],
	queryText: string,
	options: {
		limit: number;
		gradeLevel?: string;
		topics?: string[];
		vectorWeight: number;
		ftsWeight: number;
	}
): Promise<SearchResult[]> {
	try {
		// Format embedding for PostgreSQL vector type
		const embeddingString = `[${queryEmbedding.join(',')}]`;

		const { data, error } = await supabase.rpc('rag_hybrid_search', {
			query_embedding: embeddingString,
			query_text: queryText,
			match_count: options.limit,
			vector_weight: options.vectorWeight,
			fts_weight: options.ftsWeight,
			filter_grade_levels: options.gradeLevel ? [options.gradeLevel] : null,
			filter_topics: options.topics && options.topics.length > 0 ? options.topics : null
		});

		if (error) {
			console.error('Hybrid search error:', error);
			// Fallback to FTS
			return executeFtsSearch(supabase, queryText, {
				limit: options.limit,
				gradeLevel: options.gradeLevel,
				topics: options.topics
			});
		}

		return (data || []).map(
			(row: {
				chunk_id: string;
				document_id: string;
				document_title: string;
				chunk_content: string;
				combined_score: number;
				vector_score: number;
				fts_score: number;
			}) => ({
				chunkId: row.chunk_id,
				documentId: row.document_id,
				documentTitle: row.document_title,
				content: row.chunk_content,
				combinedScore: row.combined_score,
				vectorScore: row.vector_score,
				ftsScore: row.fts_score
			})
		);
	} catch (error) {
		console.error('Hybrid search failed:', error);
		return executeFtsSearch(supabase, queryText, {
			limit: options.limit,
			gradeLevel: options.gradeLevel,
			topics: options.topics
		});
	}
}

/**
 * Fallback: Full-text search only
 */
async function executeFtsSearch(
	supabase: SupabaseClient,
	queryText: string,
	options: {
		limit: number;
		gradeLevel?: string;
		topics?: string[];
	}
): Promise<SearchResult[]> {
	try {
		// Build the FTS query
		const ftsQuery = queryText
			.split(/\s+/)
			.filter((word) => word.length > 2)
			.join(' & ');

		if (!ftsQuery) {
			return [];
		}

		// Build base query
		let query = supabase
			.from('rag_chunks')
			.select(
				`
				id,
				content,
				document_id,
				rag_documents!inner (
					id,
					title,
					grade_levels,
					topics,
					enabled_for_rag
				)
			`
			)
			.eq('rag_documents.enabled_for_rag', true)
			.textSearch('search_vector', ftsQuery, {
				config: 'french'
			})
			.limit(options.limit);

		// Apply filters
		if (options.gradeLevel) {
			query = query.contains('rag_documents.grade_levels', [options.gradeLevel]);
		}

		if (options.topics && options.topics.length > 0) {
			query = query.overlaps('rag_documents.topics', options.topics);
		}

		const { data, error } = await query;

		if (error) {
			console.error('FTS search error:', error);
			return [];
		}

		return (data || []).map(
			(row: {
				id: string;
				content: string;
				document_id: string;
				rag_documents: { id: string; title: string };
			}) => ({
				chunkId: row.id,
				documentId: row.document_id,
				documentTitle: row.rag_documents?.title || 'Unknown',
				content: row.content,
				combinedScore: 1.0, // FTS doesn't provide comparable scores
				vectorScore: null,
				ftsScore: 1.0
			})
		);
	} catch (error) {
		console.error('FTS search failed:', error);
		return [];
	}
}

/**
 * Format search results for inclusion in a prompt
 */
export function formatResultsForPrompt(
	results: SearchResult[],
	options: { maxLength?: number; includeSource?: boolean } = {}
): string {
	const { maxLength = 2000, includeSource = true } = options;

	if (results.length === 0) {
		return '';
	}

	let formatted = '=== DOCUMENTS DE RÉFÉRENCE ===\n\n';
	let currentLength = formatted.length;

	for (const result of results) {
		const header = includeSource ? `[${result.documentTitle}]\n` : '';
		const content = result.content + '\n\n';
		const entry = header + content;

		if (currentLength + entry.length > maxLength) {
			// Truncate if necessary
			const remaining = maxLength - currentLength - 50; // Leave room for closing
			if (remaining > 100) {
				formatted += header + result.content.slice(0, remaining) + '...\n\n';
			}
			break;
		}

		formatted += entry;
		currentLength += entry.length;
	}

	formatted += '=== FIN DOCUMENTS ===';

	return formatted;
}

/**
 * Search for similar exercises by topic and grade
 */
export async function searchSimilarExercises(
	supabase: SupabaseClient,
	exerciseStatement: string,
	options: {
		gradeLevel?: string;
		topic?: string;
		limit?: number;
	} = {}
): Promise<SearchResult[]> {
	return hybridSearch(supabase, exerciseStatement, {
		limit: options.limit || 3,
		gradeLevel: options.gradeLevel,
		topics: options.topic ? [options.topic] : undefined,
		// Favor semantic similarity for exercises
		vectorWeight: 0.8,
		ftsWeight: 0.2
	});
}
