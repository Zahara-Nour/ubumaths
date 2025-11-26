/**
 * HuggingFace Embeddings Service
 *
 * Uses the multilingual-e5-large model for generating embeddings.
 * This model produces 1024-dimensional vectors and supports multiple languages
 * including French, making it ideal for educational content.
 *
 * Free tier: ~1000 requests/day on HF Inference API
 */

import { getEnv } from '$lib/server/env';

// Model configuration
const HF_MODEL = 'intfloat/multilingual-e5-large';
const HF_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;
const EMBEDDING_DIMENSION = 1024;
const MAX_BATCH_SIZE = 32; // HF API limit
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface EmbeddingResult {
	embedding: number[];
	tokenCount?: number;
}

export interface EmbeddingError {
	code: 'RATE_LIMIT' | 'API_ERROR' | 'INVALID_INPUT' | 'NO_API_KEY';
	message: string;
	retryAfter?: number;
}

/**
 * Service for generating text embeddings using HuggingFace Inference API
 */
export class EmbeddingService {
	private apiKey: string | undefined;

	constructor() {
		try {
			const env = getEnv();
			this.apiKey = env.HF_API_KEY;
		} catch {
			// API key not configured - will use fallback
			this.apiKey = undefined;
		}
	}

	/**
	 * Check if the service is available
	 */
	isAvailable(): boolean {
		return !!this.apiKey;
	}

	/**
	 * Generate embedding for a single query
	 * Uses "query: " prefix as per E5 model requirements
	 */
	async embedQuery(query: string): Promise<number[] | null> {
		if (!this.apiKey) {
			console.warn('HF_API_KEY not configured, embeddings unavailable');
			return null;
		}

		const prefixedText = `query: ${query}`;
		const result = await this.embed([prefixedText]);
		return result?.[0] ?? null;
	}

	/**
	 * Generate embeddings for passages/documents
	 * Uses "passage: " prefix as per E5 model requirements
	 */
	async embedPassages(texts: string[]): Promise<number[][] | null> {
		if (!this.apiKey) {
			console.warn('HF_API_KEY not configured, embeddings unavailable');
			return null;
		}

		const prefixedTexts = texts.map((t) => `passage: ${t}`);
		return this.embed(prefixedTexts);
	}

	/**
	 * Generate embeddings for multiple texts
	 * Handles batching automatically
	 */
	private async embed(texts: string[]): Promise<number[][] | null> {
		if (texts.length === 0) return [];

		// Process in batches
		const batches: string[][] = [];
		for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
			batches.push(texts.slice(i, i + MAX_BATCH_SIZE));
		}

		const allEmbeddings: number[][] = [];

		for (const batch of batches) {
			const batchResult = await this.embedBatch(batch);
			if (!batchResult) return null;
			allEmbeddings.push(...batchResult);
		}

		return allEmbeddings;
	}

	/**
	 * Process a single batch of texts
	 */
	private async embedBatch(texts: string[], retryCount = 0): Promise<number[][] | null> {
		try {
			const response = await fetch(HF_API_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					inputs: texts,
					options: {
						wait_for_model: true // Wait if model is loading (cold start)
					}
				})
			});

			if (!response.ok) {
				const errorText = await response.text();

				// Handle rate limiting
				if (response.status === 429) {
					const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
					console.warn(`HF API rate limited, retry after ${retryAfter}s`);

					if (retryCount < MAX_RETRIES) {
						await this.delay(Math.min(retryAfter * 1000, 30000));
						return this.embedBatch(texts, retryCount + 1);
					}
					return null;
				}

				// Handle model loading (503)
				if (response.status === 503 && retryCount < MAX_RETRIES) {
					console.warn('HF model loading, retrying...');
					await this.delay(RETRY_DELAY_MS * (retryCount + 1));
					return this.embedBatch(texts, retryCount + 1);
				}

				console.error('HF API error:', response.status, errorText);
				return null;
			}

			const data = await response.json();

			// Validate response shape
			if (!Array.isArray(data) || data.length !== texts.length) {
				console.error('Invalid HF API response shape');
				return null;
			}

			// E5 models return nested arrays, extract embeddings
			const embeddings = data.map((item: number[] | number[][]) => {
				// Handle both direct embeddings and nested format
				if (Array.isArray(item[0])) {
					// Mean pooling for nested format
					return this.meanPool(item as number[][]);
				}
				return item as number[];
			});

			// Validate dimensions
			for (const emb of embeddings) {
				if (emb.length !== EMBEDDING_DIMENSION) {
					console.error(
						`Unexpected embedding dimension: ${emb.length}, expected ${EMBEDDING_DIMENSION}`
					);
					return null;
				}
			}

			return embeddings;
		} catch (error) {
			console.error('Embedding request failed:', error);

			if (retryCount < MAX_RETRIES) {
				await this.delay(RETRY_DELAY_MS * (retryCount + 1));
				return this.embedBatch(texts, retryCount + 1);
			}

			return null;
		}
	}

	/**
	 * Mean pooling for token embeddings
	 */
	private meanPool(tokenEmbeddings: number[][]): number[] {
		if (tokenEmbeddings.length === 0) return [];

		const dim = tokenEmbeddings[0].length;
		const result = new Array(dim).fill(0);

		for (const embedding of tokenEmbeddings) {
			for (let i = 0; i < dim; i++) {
				result[i] += embedding[i];
			}
		}

		for (let i = 0; i < dim; i++) {
			result[i] /= tokenEmbeddings.length;
		}

		return result;
	}

	/**
	 * Delay helper
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Singleton instance
let embeddingServiceInstance: EmbeddingService | null = null;

/**
 * Get the singleton embedding service instance
 */
export function getEmbeddingService(): EmbeddingService {
	if (!embeddingServiceInstance) {
		embeddingServiceInstance = new EmbeddingService();
	}
	return embeddingServiceInstance;
}

/**
 * Embedding dimension for this model
 */
export const EMBEDDING_DIM = EMBEDDING_DIMENSION;
