-- Migration: Create RAG (Retrieval-Augmented Generation) tables
-- Description: Creates tables for document storage, chunking, and hybrid search
-- Phase: RAG Phase 2.2
-- Created: 2025-11-26

-- ============================================================================
-- Table: rag_documents
-- Purpose: Stores source documents for RAG system with metadata and filtering
-- ============================================================================

CREATE TABLE rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source tracking
  source_type TEXT NOT NULL CHECK (source_type IN (
    'question_template',
    'exercise',
    'markdown_doc',
    'google_drive',
    'manual_upload'
  )),
  source_id TEXT, -- Reference to original source (nullable for manual uploads)

  -- Document content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- SHA-256 hash for deduplication
  metadata JSONB DEFAULT '{}', -- Flexible storage for source-specific metadata

  -- Ownership and access control
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for system documents

  -- Content classification (for filtering during retrieval)
  grade_levels TEXT[] DEFAULT '{}', -- e.g., ['6', '5', '4', '3']
  topics TEXT[] DEFAULT '{}', -- e.g., ['algebra', 'fractions', 'geometry']

  -- RAG control
  enabled_for_rag BOOLEAN DEFAULT true, -- Allow disabling documents without deletion

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure unique source references
  CONSTRAINT rag_documents_source_unique UNIQUE (source_type, source_id)
);

-- Indexes for rag_documents
CREATE INDEX idx_rag_documents_teacher_id ON rag_documents(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX idx_rag_documents_enabled ON rag_documents(enabled_for_rag) WHERE enabled_for_rag = true;
CREATE INDEX idx_rag_documents_grade_levels ON rag_documents USING GIN (grade_levels);
CREATE INDEX idx_rag_documents_topics ON rag_documents USING GIN (topics);
CREATE INDEX idx_rag_documents_content_hash ON rag_documents(content_hash); -- For deduplication checks

-- Comments
COMMENT ON TABLE rag_documents IS 'Source documents for RAG system with metadata and filtering capabilities';
COMMENT ON COLUMN rag_documents.content_hash IS 'SHA-256 hash of content for deduplication';
COMMENT ON COLUMN rag_documents.teacher_id IS 'NULL for system-wide documents, otherwise teacher-specific';
COMMENT ON COLUMN rag_documents.grade_levels IS 'Array of grade levels (e.g., [''6'', ''5'', ''4''])';
COMMENT ON COLUMN rag_documents.topics IS 'Array of topics (e.g., [''algebra'', ''fractions''])';

-- ============================================================================
-- Table: rag_chunks
-- Purpose: Stores text chunks with embeddings for hybrid search
-- ============================================================================

CREATE TABLE rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent document reference
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,

  -- Chunk content
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- Ordering within document

  -- Search vectors
  embedding vector(1024), -- multilingual-e5-large embeddings (1024 dimensions)
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('french', content)) STORED, -- Full-text search

  -- Chunk-specific metadata
  metadata JSONB DEFAULT '{}', -- Can store chunk-specific info (e.g., page numbers, headers)

  -- Ensure unique chunks per document
  CONSTRAINT rag_chunks_document_chunk_unique UNIQUE (document_id, chunk_index)
);

-- Indexes for rag_chunks

-- HNSW index for fast vector similarity search (cosine distance)
-- m = 16: Number of connections per layer (higher = better recall, slower build)
-- ef_construction = 64: Size of dynamic candidate list (higher = better recall, slower build)
CREATE INDEX idx_rag_chunks_embedding ON rag_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN index for full-text search
CREATE INDEX idx_rag_chunks_search_vector ON rag_chunks USING GIN (search_vector);

-- Index for foreign key lookups
CREATE INDEX idx_rag_chunks_document_id ON rag_chunks(document_id);

-- Comments
COMMENT ON TABLE rag_chunks IS 'Text chunks with embeddings for hybrid vector + full-text search';
COMMENT ON COLUMN rag_chunks.embedding IS 'Vector embedding (1024D) from multilingual-e5-large model';
COMMENT ON COLUMN rag_chunks.search_vector IS 'Full-text search vector (French language)';
COMMENT ON COLUMN rag_chunks.chunk_index IS 'Sequential index for ordering chunks within document';

-- ============================================================================
-- Function: rag_hybrid_search
-- Purpose: Performs hybrid search using RRF (Reciprocal Rank Fusion)
-- ============================================================================

CREATE OR REPLACE FUNCTION rag_hybrid_search(
  query_embedding vector(1024),
  query_text TEXT,
  match_count INTEGER DEFAULT 5,
  vector_weight FLOAT DEFAULT 0.7,
  fts_weight FLOAT DEFAULT 0.3,
  filter_grade_levels TEXT[] DEFAULT NULL,
  filter_topics TEXT[] DEFAULT NULL
) RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_title TEXT,
  chunk_content TEXT,
  combined_score FLOAT,
  vector_score FLOAT,
  fts_score FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH
    -- Vector similarity search (cosine similarity: 1 - cosine_distance)
    vector_results AS (
      SELECT
        c.id,
        c.document_id,
        c.content,
        (1 - (c.embedding <=> query_embedding)) AS similarity
      FROM rag_chunks c
      INNER JOIN rag_documents d ON c.document_id = d.id
      WHERE
        d.enabled_for_rag = true
        AND c.embedding IS NOT NULL
        AND (filter_grade_levels IS NULL OR d.grade_levels && filter_grade_levels)
        AND (filter_topics IS NULL OR d.topics && filter_topics)
      ORDER BY c.embedding <=> query_embedding
      LIMIT match_count * 2 -- Get more candidates for RRF
    ),

    -- Full-text search
    fts_results AS (
      SELECT
        c.id,
        c.document_id,
        c.content,
        ts_rank(c.search_vector, websearch_to_tsquery('french', query_text)) AS rank
      FROM rag_chunks c
      INNER JOIN rag_documents d ON c.document_id = d.id
      WHERE
        d.enabled_for_rag = true
        AND c.search_vector @@ websearch_to_tsquery('french', query_text)
        AND (filter_grade_levels IS NULL OR d.grade_levels && filter_grade_levels)
        AND (filter_topics IS NULL OR d.topics && filter_topics)
      ORDER BY rank DESC
      LIMIT match_count * 2 -- Get more candidates for RRF
    ),

    -- Combine using Reciprocal Rank Fusion (RRF)
    combined_results AS (
      SELECT
        COALESCE(v.id, f.id) AS chunk_id,
        COALESCE(v.document_id, f.document_id) AS doc_id,
        COALESCE(v.content, f.content) AS content,
        COALESCE(v.similarity, 0) AS vec_score,
        COALESCE(f.rank, 0) AS fts_rank,
        -- RRF formula: weighted sum of normalized scores
        (vector_weight * COALESCE(v.similarity, 0) +
         fts_weight * COALESCE(f.rank, 0)) AS combined
      FROM vector_results v
      FULL OUTER JOIN fts_results f ON v.id = f.id
    )

  -- Final result with document metadata
  SELECT
    cr.chunk_id,
    cr.doc_id AS document_id,
    d.title AS document_title,
    cr.content AS chunk_content,
    cr.combined AS combined_score,
    cr.vec_score AS vector_score,
    cr.fts_rank AS fts_score
  FROM combined_results cr
  INNER JOIN rag_documents d ON cr.doc_id = d.id
  ORDER BY cr.combined DESC
  LIMIT match_count;
END;
$$;

-- Comments
COMMENT ON FUNCTION rag_hybrid_search IS 'Hybrid search using vector similarity + full-text search with RRF fusion';

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies: rag_documents
-- ============================================================================

-- Students: Read system documents OR documents from teachers in their classes
CREATE POLICY "Students can read system and class documents"
  ON rag_documents
  FOR SELECT
  TO authenticated
  USING (
    teacher_id IS NULL -- System documents
    OR
    teacher_id IN ( -- Documents from teachers in student's classes
      SELECT DISTINCT c.teacher_id
      FROM class_members cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = auth.uid()
    )
  );

-- Teachers: Read their own documents AND system documents
CREATE POLICY "Teachers can read own and system documents"
  ON rag_documents
  FOR SELECT
  TO authenticated
  USING (
    teacher_id IS NULL -- System documents
    OR
    teacher_id = auth.uid() -- Own documents
  );

-- Teachers: Create their own documents
CREATE POLICY "Teachers can create own documents"
  ON rag_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

-- Teachers: Update their own documents
CREATE POLICY "Teachers can update own documents"
  ON rag_documents
  FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers: Delete their own documents
CREATE POLICY "Teachers can delete own documents"
  ON rag_documents
  FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

-- Admins: Full access to all documents (via service role typically)

-- ============================================================================
-- RLS Policies: rag_chunks
-- ============================================================================

-- Students: Read chunks from accessible documents
CREATE POLICY "Students can read chunks from accessible documents"
  ON rag_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rag_documents d
      WHERE d.id = rag_chunks.document_id
      AND (
        d.teacher_id IS NULL -- System documents
        OR
        d.teacher_id IN ( -- Documents from teachers in student's classes
          SELECT DISTINCT c.teacher_id
          FROM class_members cm
          INNER JOIN classes c ON c.id = cm.class_id
          WHERE cm.student_id = auth.uid()
        )
      )
    )
  );

-- Teachers: Read chunks from their own and system documents
CREATE POLICY "Teachers can read chunks from own and system documents"
  ON rag_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rag_documents d
      WHERE d.id = rag_chunks.document_id
      AND (
        d.teacher_id IS NULL -- System documents
        OR
        d.teacher_id = auth.uid() -- Own documents
      )
    )
  );

-- Teachers: Create chunks for their own documents
CREATE POLICY "Teachers can create chunks for own documents"
  ON rag_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rag_documents d
      WHERE d.id = rag_chunks.document_id
      AND d.teacher_id = auth.uid()
    )
  );

-- Teachers: Update chunks in their own documents
CREATE POLICY "Teachers can update chunks in own documents"
  ON rag_chunks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rag_documents d
      WHERE d.id = rag_chunks.document_id
      AND d.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rag_documents d
      WHERE d.id = rag_chunks.document_id
      AND d.teacher_id = auth.uid()
    )
  );

-- Teachers: Delete chunks from their own documents
CREATE POLICY "Teachers can delete chunks from own documents"
  ON rag_chunks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rag_documents d
      WHERE d.id = rag_chunks.document_id
      AND d.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at timestamp on rag_documents
CREATE OR REPLACE FUNCTION update_rag_documents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_rag_documents_updated_at
  BEFORE UPDATE ON rag_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_rag_documents_updated_at();

COMMENT ON FUNCTION update_rag_documents_updated_at IS 'Automatically updates updated_at timestamp on rag_documents';
