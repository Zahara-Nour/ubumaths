/**
 * Text Chunking Service
 *
 * Splits documents into semantically meaningful chunks for embedding.
 * Uses sentence-aware chunking with overlap to preserve context.
 */

// Chunking configuration
const DEFAULT_CHUNK_SIZE = 500; // Characters (roughly 100-125 tokens)
const DEFAULT_CHUNK_OVERLAP = 50; // Characters overlap between chunks
const MIN_CHUNK_SIZE = 100; // Minimum chunk size
const MAX_CHUNK_SIZE = 2000; // Maximum chunk size

export interface Chunk {
	content: string;
	index: number;
	metadata: {
		startChar: number;
		endChar: number;
		wordCount: number;
	};
}

export interface ChunkOptions {
	chunkSize?: number;
	chunkOverlap?: number;
	preserveSentences?: boolean;
}

/**
 * Split text into chunks with overlap
 */
export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
	const {
		chunkSize = DEFAULT_CHUNK_SIZE,
		chunkOverlap = DEFAULT_CHUNK_OVERLAP,
		preserveSentences = true
	} = options;

	// Validate options
	const validChunkSize = Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, chunkSize));
	const validOverlap = Math.min(chunkOverlap, Math.floor(validChunkSize / 2));

	// Normalize whitespace
	const normalizedText = text.replace(/\s+/g, ' ').trim();

	if (normalizedText.length === 0) {
		return [];
	}

	// If text is smaller than chunk size, return as single chunk
	if (normalizedText.length <= validChunkSize) {
		return [
			{
				content: normalizedText,
				index: 0,
				metadata: {
					startChar: 0,
					endChar: normalizedText.length,
					wordCount: countWords(normalizedText)
				}
			}
		];
	}

	const chunks: Chunk[] = [];

	if (preserveSentences) {
		// Sentence-aware chunking
		const sentences = splitIntoSentences(normalizedText);
		let currentChunk = '';
		let currentStart = 0;
		let chunkIndex = 0;

		for (const sentence of sentences) {
			// If adding this sentence exceeds chunk size
			if (currentChunk.length + sentence.length > validChunkSize && currentChunk.length > 0) {
				// Save current chunk
				chunks.push({
					content: currentChunk.trim(),
					index: chunkIndex,
					metadata: {
						startChar: currentStart,
						endChar: currentStart + currentChunk.length,
						wordCount: countWords(currentChunk)
					}
				});
				chunkIndex++;

				// Start new chunk with overlap (last part of previous chunk)
				const overlapText = getOverlapText(currentChunk, validOverlap);
				currentStart = currentStart + currentChunk.length - overlapText.length;
				currentChunk = overlapText;
			}

			currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
		}

		// Don't forget the last chunk
		if (currentChunk.trim().length > 0) {
			chunks.push({
				content: currentChunk.trim(),
				index: chunkIndex,
				metadata: {
					startChar: currentStart,
					endChar: currentStart + currentChunk.length,
					wordCount: countWords(currentChunk)
				}
			});
		}
	} else {
		// Simple character-based chunking
		let start = 0;
		let chunkIndex = 0;

		while (start < normalizedText.length) {
			let end = Math.min(start + validChunkSize, normalizedText.length);

			// Try to break at word boundary
			if (end < normalizedText.length) {
				const lastSpace = normalizedText.lastIndexOf(' ', end);
				if (lastSpace > start + MIN_CHUNK_SIZE) {
					end = lastSpace;
				}
			}

			const chunkContent = normalizedText.slice(start, end).trim();

			if (chunkContent.length > 0) {
				chunks.push({
					content: chunkContent,
					index: chunkIndex,
					metadata: {
						startChar: start,
						endChar: end,
						wordCount: countWords(chunkContent)
					}
				});
				chunkIndex++;
			}

			// Move start with overlap
			start = end - validOverlap;
			if (start >= normalizedText.length - validOverlap) {
				break;
			}
		}
	}

	return chunks;
}

/**
 * Split text into sentences (French-aware)
 */
function splitIntoSentences(text: string): string[] {
	// French sentence endings (handle abbreviations)
	const sentenceEndings = /(?<=[.!?])\s+(?=[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ])/g;

	const sentences = text.split(sentenceEndings).filter((s) => s.trim().length > 0);

	return sentences;
}

/**
 * Get overlap text from the end of a string
 */
function getOverlapText(text: string, overlapSize: number): string {
	if (text.length <= overlapSize) {
		return text;
	}

	// Try to break at word boundary
	const lastPart = text.slice(-overlapSize);
	const firstSpace = lastPart.indexOf(' ');

	if (firstSpace > 0 && firstSpace < overlapSize / 2) {
		return lastPart.slice(firstSpace + 1);
	}

	return lastPart;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
	return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Chunk a markdown document with section awareness
 */
export function chunkMarkdown(markdown: string, options: ChunkOptions = {}): Chunk[] {
	const { chunkSize = DEFAULT_CHUNK_SIZE } = options;

	// Split by headers
	const sections = markdown.split(/(?=^#{1,3}\s)/m);

	const chunks: Chunk[] = [];
	let chunkIndex = 0;
	let currentPos = 0;

	for (const section of sections) {
		const trimmedSection = section.trim();
		if (trimmedSection.length === 0) continue;

		if (trimmedSection.length <= chunkSize) {
			// Section fits in one chunk
			chunks.push({
				content: trimmedSection,
				index: chunkIndex++,
				metadata: {
					startChar: currentPos,
					endChar: currentPos + trimmedSection.length,
					wordCount: countWords(trimmedSection)
				}
			});
		} else {
			// Section needs to be split
			const sectionChunks = chunkText(trimmedSection, options);
			for (const chunk of sectionChunks) {
				chunks.push({
					content: chunk.content,
					index: chunkIndex++,
					metadata: {
						startChar: currentPos + chunk.metadata.startChar,
						endChar: currentPos + chunk.metadata.endChar,
						wordCount: chunk.metadata.wordCount
					}
				});
			}
		}

		currentPos += section.length;
	}

	return chunks;
}

/**
 * Chunk a math exercise or question
 * Keeps the statement together when possible
 */
export function chunkExercise(
	statement: string,
	solution?: string,
	hints?: string[],
	options: ChunkOptions = {}
): Chunk[] {
	const chunks: Chunk[] = [];
	let chunkIndex = 0;

	// Statement chunk (always first)
	const statementChunks = chunkText(`Énoncé: ${statement}`, options);
	for (const chunk of statementChunks) {
		chunks.push({
			...chunk,
			index: chunkIndex++
		});
	}

	// Solution chunks (if provided)
	if (solution) {
		const solutionChunks = chunkText(`Solution: ${solution}`, options);
		for (const chunk of solutionChunks) {
			chunks.push({
				...chunk,
				index: chunkIndex++
			});
		}
	}

	// Hints chunks (if provided)
	if (hints && hints.length > 0) {
		const hintsText = hints.map((h, i) => `Indice ${i + 1}: ${h}`).join(' ');
		const hintsChunks = chunkText(hintsText, options);
		for (const chunk of hintsChunks) {
			chunks.push({
				...chunk,
				index: chunkIndex++
			});
		}
	}

	return chunks;
}
