/**
 * RAG (Retrieval Augmented Generation) System
 *
 * Provides hybrid search capabilities combining:
 * - Vector embeddings (HuggingFace multilingual-e5-large)
 * - Full-text search (PostgreSQL tsvector)
 *
 * @example
 * ```typescript
 * import { hybridSearch, formatResultsForPrompt } from '$lib/server/rag';
 *
 * // Search for relevant content
 * const results = await hybridSearch(supabase, 'fractions équivalentes', {
 *   gradeLevel: '6',
 *   topics: ['fractions'],
 *   limit: 3
 * });
 *
 * // Format for LLM prompt
 * const context = formatResultsForPrompt(results);
 * ```
 */

// Embeddings
export { getEmbeddingService, EmbeddingService, EMBEDDING_DIM } from './embeddings';
export type { EmbeddingResult, EmbeddingError } from './embeddings';

// Chunking
export { chunkText, chunkMarkdown, chunkExercise } from './chunker';
export type { Chunk, ChunkOptions } from './chunker';

// Search
export { hybridSearch, formatResultsForPrompt, searchSimilarExercises } from './search';
export type { SearchOptions, SearchResult } from './search';

// Processing
export {
	indexDocument,
	deleteDocument,
	disableDocument,
	enableDocument,
	batchIndexDocuments,
	reindexAllDocuments
} from './processor';
export type { DocumentInput, IndexResult, SourceType } from './processor';
