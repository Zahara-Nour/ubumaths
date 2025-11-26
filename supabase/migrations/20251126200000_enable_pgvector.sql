-- Migration: Enable pgvector extension
-- Description: Enables the pgvector extension for vector similarity search (RAG system)
-- Phase: RAG Phase 2.1
-- Created: 2025-11-26

-- Enable pgvector extension for vector operations
-- This extension provides the vector data type and similarity search operators
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is available
COMMENT ON EXTENSION vector IS 'Vector similarity search for RAG embeddings (multilingual-e5-large, 1024 dimensions)';
