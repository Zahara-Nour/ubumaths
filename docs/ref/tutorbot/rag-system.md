# RAG System - Retrieval-Augmented Generation

> Technical reference for the hybrid RAG system that enriches tutor responses with pedagogical documents.

---

## Overview

The RAG (Retrieval-Augmented Generation) system enhances the AI tutor's responses by retrieving relevant pedagogical content from a document database.

### Key Features

| Feature           | Implementation                                 |
| ----------------- | ---------------------------------------------- |
| **Hybrid Search** | Vector similarity + Full-text search           |
| **Embeddings**    | HuggingFace `multilingual-e5-large` (1024 dim) |
| **Full-Text**     | PostgreSQL tsvector with French config         |
| **Fusion**        | Reciprocal Rank Fusion (RRF)                   |
| **Fallback**      | FTS-only when embeddings unavailable           |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          RAG Search Flow                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        User Question                                     │
│                              │                                           │
│                              ▼                                           │
│                    ┌─────────────────────┐                               │
│                    │   Query Processing  │                               │
│                    └──────────┬──────────┘                               │
│                               │                                          │
│              ┌────────────────┼────────────────┐                         │
│              │                │                │                         │
│              ▼                ▼                ▼                         │
│    ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐          │
│    │ Embed Query     │  │ Tokenize for │  │ Apply Filters    │          │
│    │ (HuggingFace)   │  │ tsvector FTS │  │ (grade, topics)  │          │
│    └────────┬────────┘  └──────┬───────┘  └────────┬─────────┘          │
│             │                  │                   │                     │
│             ▼                  ▼                   │                     │
│    ┌─────────────────┐  ┌──────────────┐          │                     │
│    │ Vector Search   │  │ FTS Search   │          │                     │
│    │ (pgvector)      │  │ (tsvector)   │◄─────────┘                     │
│    │                 │  │              │                                 │
│    │ cosine sim      │  │ ts_rank      │                                 │
│    └────────┬────────┘  └──────┬───────┘                                │
│             │                  │                                         │
│             └────────┬─────────┘                                         │
│                      │                                                   │
│                      ▼                                                   │
│            ┌─────────────────────┐                                       │
│            │  Reciprocal Rank    │                                       │
│            │  Fusion (RRF)       │                                       │
│            │                     │                                       │
│            │  Combined Score =   │                                       │
│            │  0.7×vector +       │                                       │
│            │  0.3×fts            │                                       │
│            └──────────┬──────────┘                                       │
│                       │                                                  │
│                       ▼                                                  │
│              ┌────────────────────┐                                      │
│              │ Top K Results      │                                      │
│              │ (default: 3)       │                                      │
│              └──────────┬─────────┘                                      │
│                         │                                                │
│                         ▼                                                │
│              ┌────────────────────┐                                      │
│              │ Format for Prompt  │                                      │
│              │ (max 1500 chars)   │                                      │
│              └────────────────────┘                                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Module Structure

**Location**: `src/lib/server/rag/`

```
src/lib/server/rag/
├── index.ts          # Re-exports all modules
├── embeddings.ts     # HuggingFace embedding service
├── search.ts         # Hybrid search implementation
├── chunker.ts        # Document chunking utilities
└── processor.ts      # Document indexing
```

---

## Embedding Service

### Configuration

```typescript
// src/lib/server/rag/embeddings.ts

const HF_MODEL = 'intfloat/multilingual-e5-large';
const EMBEDDING_DIMENSION = 1024;
const MAX_BATCH_SIZE = 32;
const MAX_RETRIES = 3;
```

### E5 Model Prefixes

The multilingual-e5-large model requires specific prefixes:

| Type    | Prefix      | Usage           |
| ------- | ----------- | --------------- |
| Query   | `query: `   | User questions  |
| Passage | `passage: ` | Document chunks |

```typescript
// Query embedding
async embedQuery(query: string): Promise<number[] | null> {
  const prefixedText = `query: ${query}`;
  return this.embed([prefixedText])[0];
}

// Passage embedding
async embedPassages(texts: string[]): Promise<number[][] | null> {
  const prefixedTexts = texts.map(t => `passage: ${t}`);
  return this.embed(prefixedTexts);
}
```

### Usage

```typescript
import { getEmbeddingService } from '$lib/server/rag';

const service = getEmbeddingService();

// Check availability
if (service.isAvailable()) {
	const embedding = await service.embedQuery('fractions équivalentes');
	// embedding: number[1024] or null
}
```

### Error Handling

```typescript
// Rate limiting (429)
if (response.status === 429) {
	const retryAfter = response.headers.get('Retry-After');
	await this.delay(retryAfter * 1000);
	return this.embedBatch(texts, retryCount + 1);
}

// Model loading (503)
if (response.status === 503) {
	await this.delay(RETRY_DELAY_MS * (retryCount + 1));
	return this.embedBatch(texts, retryCount + 1);
}
```

---

## Hybrid Search

### Interface

```typescript
interface SearchOptions {
	limit?: number; // Default: 5
	gradeLevel?: string; // e.g., '6', 'CM2'
	topics?: string[]; // e.g., ['fractions', 'geometry']
	vectorWeight?: number; // Default: 0.7
	ftsWeight?: number; // Default: 0.3
}

interface SearchResult {
	chunkId: string;
	documentId: string;
	documentTitle: string;
	content: string;
	combinedScore: number;
	vectorScore: number | null;
	ftsScore: number | null;
	metadata?: Record<string, unknown>;
}
```

### Usage

```typescript
import { hybridSearch, formatResultsForPrompt } from '$lib/server/rag';

// Search for relevant content
const results = await hybridSearch(supabase, 'Comment calculer les fractions équivalentes?', {
	gradeLevel: '6',
	topics: ['fractions'],
	limit: 3
});

// Format for LLM prompt
const context = formatResultsForPrompt(results, {
	maxLength: 1500,
	includeSource: true
});
```

### Database Function

The search uses a PostgreSQL function for efficiency:

```sql
-- rag_hybrid_search function
CREATE FUNCTION rag_hybrid_search(
  query_embedding vector(1024),
  query_text text,
  match_count int DEFAULT 5,
  vector_weight float DEFAULT 0.7,
  fts_weight float DEFAULT 0.3,
  filter_grade_levels text[] DEFAULT NULL,
  filter_topics text[] DEFAULT NULL
) RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  chunk_content text,
  combined_score float,
  vector_score float,
  fts_score float
)
```

### Fallback Strategy

If embeddings are unavailable:

```typescript
async function hybridSearch(...) {
  const queryEmbedding = await embeddingService.embedQuery(query);

  if (queryEmbedding) {
    // Full hybrid search
    return executeHybridSearch(...);
  } else {
    // Fallback to FTS-only
    console.warn('Embeddings unavailable, falling back to FTS-only');
    return executeFtsSearch(...);
  }
}
```

---

## Prompt Integration

### In Tutor API

```typescript
// src/routes/api/chat/+server.ts

// 7.5. RAG Search for relevant context (if enabled)
let ragContext = '';
if (env.ENABLE_RAG && userMessageContent.length > 10) {
	try {
		const ragResults = await hybridSearch(locals.supabase, userMessageContent, {
			limit: 3,
			gradeLevel: gradeCode,
			topics: topicValue ? [topicValue] : undefined
		});

		if (ragResults.length > 0) {
			ragContext = formatResultsForPrompt(ragResults, {
				maxLength: 1500,
				includeSource: true
			});
		}
	} catch (ragError) {
		// RAG failure is non-critical - continue without context
		console.warn('RAG search failed:', ragError);
	}
}

// Combine system prompt with RAG context
const fullSystemPrompt = ragContext ? `${tutorSystemPrompt}\n\n${ragContext}` : tutorSystemPrompt;
```

### Formatted Output

```
=== DOCUMENTS DE RÉFÉRENCE ===

[Fractions - Guide Pédagogique]
Les fractions équivalentes sont des fractions qui représentent la même quantité.
Pour trouver une fraction équivalente, on multiplie (ou divise) le numérateur
et le dénominateur par le même nombre.

[Exercices Corrigés 6ème]
Exemple: 2/4 = 1/2 car on peut diviser 2 et 4 par 2.
Pour vérifier: 2÷2 = 1 et 4÷2 = 2, donc 2/4 = 1/2.

=== FIN DOCUMENTS ===
```

---

## Document Processing

### Indexing a Document

```typescript
import { indexDocument } from '$lib/server/rag';

const result = await indexDocument(supabase, {
	title: 'Fractions - Guide Pédagogique',
	content: '... document content ...',
	sourceType: 'internal',
	gradeLevels: ['6', '5'],
	topics: ['fractions', 'arithmetic']
});

if (result.success) {
	console.log(`Indexed ${result.chunksCreated} chunks`);
}
```

### Chunking

Documents are split into manageable chunks:

```typescript
import { chunkText, chunkMarkdown } from '$lib/server/rag';

// Plain text chunking
const chunks = chunkText(content, {
	chunkSize: 500, // Target size in characters
	chunkOverlap: 50 // Overlap between chunks
});

// Markdown-aware chunking
const mdChunks = chunkMarkdown(markdownContent, {
	chunkSize: 500,
	respectHeaders: true // Try to keep headers with content
});
```

### Batch Operations

```typescript
import { batchIndexDocuments, reindexAllDocuments } from '$lib/server/rag';

// Index multiple documents
const results = await batchIndexDocuments(supabase, documents);

// Reindex all enabled documents
await reindexAllDocuments(supabase);
```

---

## Database Schema

### rag_documents Table

```sql
CREATE TABLE rag_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  source_url text,
  source_type text NOT NULL,  -- 'internal', 'external', 'exercise'
  grade_levels text[],
  topics text[],
  enabled_for_rag boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### rag_chunks Table

```sql
CREATE TABLE rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES rag_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  chunk_index integer NOT NULL,
  embedding vector(1024),         -- pgvector for similarity search
  search_vector tsvector,         -- PostgreSQL FTS
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient search
CREATE INDEX idx_chunks_embedding ON rag_chunks
  USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX idx_chunks_search_vector ON rag_chunks
  USING gin (search_vector);
```

---

## Configuration

### Environment Variables

| Variable     | Required | Default | Description         |
| ------------ | -------- | ------- | ------------------- |
| `ENABLE_RAG` | No       | `false` | Enable RAG search   |
| `HF_API_KEY` | No       | -       | HuggingFace API key |

### Search Weights

| Search Type | Default Weight | Best For              |
| ----------- | -------------- | --------------------- |
| Vector      | 0.7            | Semantic similarity   |
| FTS         | 0.3            | Exact keyword matches |

For exercise search, semantic similarity is favored:

```typescript
// In searchSimilarExercises
vectorWeight: 0.8,
ftsWeight: 0.2
```

---

## Performance Considerations

### Embedding Costs

- **Free tier**: ~1000 requests/day on HF Inference API
- **Batch processing**: Max 32 texts per request
- **Cold start**: Model loading can take 20-30s on first request

### Search Performance

```sql
-- Efficient query using indexes
EXPLAIN ANALYZE
SELECT * FROM rag_hybrid_search(
  '[0.1, 0.2, ...]'::vector(1024),
  'fractions',
  5, 0.7, 0.3, NULL, NULL
);
```

### Caching Recommendations

- Cache embeddings for frequently asked questions
- Pre-compute embeddings for new documents asynchronously
- Consider a Redis layer for hot queries

---

## Error Handling

### Graceful Degradation

```typescript
// RAG failure is non-critical
try {
  const ragResults = await hybridSearch(...);
  ragContext = formatResultsForPrompt(ragResults);
} catch (ragError) {
  console.warn('RAG search failed:', ragError);
  // Continue without context - tutor still works
  ragContext = '';
}
```

### Embedding Unavailability

```typescript
// Automatic fallback to FTS-only
if (!queryEmbedding) {
  console.warn('Embeddings unavailable, falling back to FTS-only');
  return executeFtsSearch(...);
}
```

---

## API Reference

### Exports

```typescript
// From src/lib/server/rag/index.ts

// Embeddings
export { getEmbeddingService, EmbeddingService, EMBEDDING_DIM };

// Search
export { hybridSearch, formatResultsForPrompt, searchSimilarExercises };

// Chunking
export { chunkText, chunkMarkdown, chunkExercise };

// Processing
export {
	indexDocument,
	deleteDocument,
	disableDocument,
	enableDocument,
	batchIndexDocuments,
	reindexAllDocuments
};
```

---

## See Also

- [Architecture](./architecture.md) - System architecture
- [Database Schema](./database-schema.md) - Full schema details
- [Tutor RAG Feature Doc](../../features/tutor-rag-system.md) - Feature overview
