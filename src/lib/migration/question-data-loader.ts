/**
 * Question Data Loader
 * =====================
 *
 * Utilities to load and manipulate old question data from the JSON file.
 * Used by migration review API endpoints.
 *
 * @module migration/question-data-loader
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { QuestionBase } from './old-question-types';
import { transformQuestion } from './question-transformer';
import { loadImageUrlMapping } from './image-url-mapping';

// ============================================================================
// CONSTANTS
// ============================================================================

const OLD_QUESTIONS_PATH = join(process.cwd(), '.claude', 'old-questions.json');

// ============================================================================
// TYPES
// ============================================================================

export interface QuestionWithTransform {
	globalIndex: number;
	original: QuestionBase;
	transformed: ReturnType<typeof transformQuestion> | null;
	transformError: string | null;
}

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Load all questions from the JSON file
 */
export async function loadAllQuestions(): Promise<QuestionBase[]> {
	try {
		const fileContent = await readFile(OLD_QUESTIONS_PATH, 'utf-8');
		const questions = JSON.parse(fileContent) as QuestionBase[];
		return questions;
	} catch (err) {
		throw new Error(
			`Failed to load questions: ${err instanceof Error ? err.message : String(err)}`
		);
	}
}

/**
 * Load a single question by global index
 * Returns null if index is out of bounds
 */
export async function loadQuestionByIndex(globalIndex: number): Promise<QuestionBase | null> {
	const questions = await loadAllQuestions();

	if (globalIndex < 0 || globalIndex >= questions.length) {
		return null;
	}

	return questions[globalIndex];
}

/**
 * Load a question with its transformation result
 * Includes transformation errors if any
 *
 * The transformation includes image URL mapping to convert old image paths
 * to new Supabase Storage URLs.
 */
export async function loadQuestionWithTransform(
	globalIndex: number
): Promise<QuestionWithTransform | null> {
	const original = await loadQuestionByIndex(globalIndex);

	if (!original) {
		return null;
	}

	let transformed: ReturnType<typeof transformQuestion> | null = null;
	let transformError: string | null = null;

	try {
		// Load image URL mapping for conversion
		const imageUrlMapping = await loadImageUrlMapping();

		transformed = transformQuestion(original, globalIndex, {
			imageUrlMapping
		});
	} catch (err) {
		transformError = err instanceof Error ? err.message : String(err);
	}

	return {
		globalIndex,
		original,
		transformed,
		transformError
	};
}

/**
 * Get total question count
 */
export async function getQuestionCount(): Promise<number> {
	const questions = await loadAllQuestions();
	return questions.length;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a global index is valid
 */
export async function isValidGlobalIndex(globalIndex: number): Promise<boolean> {
	const count = await getQuestionCount();
	return globalIndex >= 0 && globalIndex < count;
}
