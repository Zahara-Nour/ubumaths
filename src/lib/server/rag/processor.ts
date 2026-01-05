/**
 * RAG Document Processor
 *
 * Handles indexing of documents into the RAG system:
 * - Text chunking
 * - Embedding generation
 * - Database storage
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { GradeCode } from '$lib/types/grades';
import { getEmbeddingService } from './embeddings';
import { chunkText, chunkMarkdown, chunkExercise, type Chunk } from './chunker';
import { createHash } from 'crypto';

export type SourceType =
	| 'question_template'
	| 'exercise'
	| 'markdown_doc'
	| 'google_drive'
	| 'manual_upload';

export interface DocumentInput {
	sourceType: SourceType;
	sourceId?: string;
	title: string;
	content: string;
	metadata?: Record<string, unknown>;
	teacherId?: string;
	/** Applicable grades (e.g., ['6', '5', 'CM2']) */
	grades?: GradeCode[];
	topics?: string[];
}

export interface IndexResult {
	success: boolean;
	documentId?: string;
	chunksCreated?: number;
	error?: string;
}

/**
 * Index a document into the RAG system
 */
export async function indexDocument(
	supabase: SupabaseClient,
	input: DocumentInput
): Promise<IndexResult> {
	try {
		// Calculate content hash for deduplication
		const contentHash = createHash('sha256').update(input.content).digest('hex');

		// Check if document already exists
		const { data: existingDoc } = await supabase
			.from('rag_documents')
			.select('id, content_hash')
			.eq('source_type', input.sourceType)
			.eq('source_id', input.sourceId || '')
			.single();

		if (existingDoc) {
			// If content hasn't changed, skip re-indexing
			if (existingDoc.content_hash === contentHash) {
				return {
					success: true,
					documentId: existingDoc.id,
					chunksCreated: 0
				};
			}

			// Content changed - delete old chunks
			await supabase.from('rag_chunks').delete().eq('document_id', existingDoc.id);
		}

		// Create or update document
		const docData = {
			source_type: input.sourceType,
			source_id: input.sourceId || null,
			title: input.title,
			content: input.content,
			content_hash: contentHash,
			metadata: input.metadata || {},
			teacher_id: input.teacherId || null,
			grades: input.grades || [],
			topics: input.topics || [],
			enabled_for_rag: true
		};

		let documentId: string;

		if (existingDoc) {
			// Update existing document
			const { error: updateError } = await supabase
				.from('rag_documents')
				.update(docData)
				.eq('id', existingDoc.id);

			if (updateError) {
				return { success: false, error: updateError.message };
			}
			documentId = existingDoc.id;
		} else {
			// Insert new document
			const { data: newDoc, error: insertError } = await supabase
				.from('rag_documents')
				.insert(docData)
				.select('id')
				.single();

			if (insertError || !newDoc) {
				return { success: false, error: insertError?.message || 'Failed to create document' };
			}
			documentId = newDoc.id;
		}

		// Chunk the content based on source type
		let chunks: Chunk[];
		switch (input.sourceType) {
			case 'markdown_doc':
				chunks = chunkMarkdown(input.content);
				break;
			case 'exercise':
			case 'question_template':
				chunks = chunkExercise(input.content);
				break;
			default:
				chunks = chunkText(input.content);
		}

		if (chunks.length === 0) {
			return { success: true, documentId, chunksCreated: 0 };
		}

		// Generate embeddings
		const embeddingService = getEmbeddingService();
		const embeddings = await embeddingService.embedPassages(chunks.map((c) => c.content));

		// Prepare chunk records
		const chunkRecords = chunks.map((chunk, index) => ({
			document_id: documentId,
			content: chunk.content,
			chunk_index: chunk.index,
			embedding: embeddings ? formatEmbedding(embeddings[index]) : null,
			metadata: chunk.metadata
		}));

		// Insert chunks in batches
		const BATCH_SIZE = 50;
		for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
			const batch = chunkRecords.slice(i, i + BATCH_SIZE);
			const { error: chunkError } = await supabase.from('rag_chunks').insert(batch);

			if (chunkError) {
				console.error('Error inserting chunks:', chunkError);
				// Continue with other batches
			}
		}

		return {
			success: true,
			documentId,
			chunksCreated: chunks.length
		};
	} catch (error) {
		console.error('Document indexing failed:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Format embedding array for PostgreSQL vector type
 */
function formatEmbedding(embedding: number[]): string {
	return `[${embedding.join(',')}]`;
}

/**
 * Delete a document and its chunks
 */
export async function deleteDocument(
	supabase: SupabaseClient,
	documentId: string
): Promise<boolean> {
	const { error } = await supabase.from('rag_documents').delete().eq('id', documentId);

	if (error) {
		console.error('Error deleting document:', error);
		return false;
	}

	return true;
}

/**
 * Disable a document from RAG without deleting it
 */
export async function disableDocument(
	supabase: SupabaseClient,
	documentId: string
): Promise<boolean> {
	const { error } = await supabase
		.from('rag_documents')
		.update({ enabled_for_rag: false })
		.eq('id', documentId);

	if (error) {
		console.error('Error disabling document:', error);
		return false;
	}

	return true;
}

/**
 * Re-enable a document for RAG
 */
export async function enableDocument(
	supabase: SupabaseClient,
	documentId: string
): Promise<boolean> {
	const { error } = await supabase
		.from('rag_documents')
		.update({ enabled_for_rag: true })
		.eq('id', documentId);

	if (error) {
		console.error('Error enabling document:', error);
		return false;
	}

	return true;
}

/**
 * Batch index multiple documents
 */
export async function batchIndexDocuments(
	supabase: SupabaseClient,
	documents: DocumentInput[]
): Promise<{ successful: number; failed: number; results: IndexResult[] }> {
	const results: IndexResult[] = [];
	let successful = 0;
	let failed = 0;

	for (const doc of documents) {
		const result = await indexDocument(supabase, doc);
		results.push(result);

		if (result.success) {
			successful++;
		} else {
			failed++;
		}

		// Small delay to avoid rate limiting
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	return { successful, failed, results };
}

/**
 * Re-index all documents (useful after embedding model change)
 */
export async function reindexAllDocuments(supabase: SupabaseClient): Promise<{
	processed: number;
	successful: number;
	failed: number;
}> {
	const { data: documents, error } = await supabase
		.from('rag_documents')
		.select('id, source_type, title, content, metadata, teacher_id, grades, topics')
		.eq('enabled_for_rag', true);

	if (error || !documents) {
		console.error('Error fetching documents for reindex:', error);
		return { processed: 0, successful: 0, failed: 0 };
	}

	let successful = 0;
	let failed = 0;

	for (const doc of documents) {
		// Delete existing chunks
		await supabase.from('rag_chunks').delete().eq('document_id', doc.id);

		// Re-chunk and embed
		let chunks: Chunk[];
		switch (doc.source_type) {
			case 'markdown_doc':
				chunks = chunkMarkdown(doc.content);
				break;
			case 'exercise':
			case 'question_template':
				chunks = chunkExercise(doc.content);
				break;
			default:
				chunks = chunkText(doc.content);
		}

		if (chunks.length === 0) {
			successful++;
			continue;
		}

		const embeddingService = getEmbeddingService();
		const embeddings = await embeddingService.embedPassages(chunks.map((c) => c.content));

		const chunkRecords = chunks.map((chunk, index) => ({
			document_id: doc.id,
			content: chunk.content,
			chunk_index: chunk.index,
			embedding: embeddings ? formatEmbedding(embeddings[index]) : null,
			metadata: chunk.metadata
		}));

		const { error: chunkError } = await supabase.from('rag_chunks').insert(chunkRecords);

		if (chunkError) {
			console.error('Error reindexing document:', doc.id, chunkError);
			failed++;
		} else {
			successful++;
		}

		// Delay to avoid rate limiting
		await new Promise((resolve) => setTimeout(resolve, 200));
	}

	return {
		processed: documents.length,
		successful,
		failed
	};
}
