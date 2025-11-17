/**
 * Centralized Hash Utilities for Migration
 * =========================================
 *
 * Provides stable and consistent hash generation for question migration tracking.
 * This ensures that hash calculations are identical across different parts of the
 * migration system (initialization, processing, reconciliation).
 *
 * @module src/lib/server/migration/hash-utils
 */

import crypto from 'crypto';

/**
 * Interface representing the old question format from TinyMath
 */
interface QuestionBase {
	description?: string;
	subdescription?: string;
	enounces?: string[];
	expressions?: string[];
	variabless?: Array<Record<string, unknown>>;
	solutionss?: Array<unknown>;
	[key: string]: unknown;
}

/**
 * Generate a stable SHA-256 hash for a question
 *
 * CRITICAL: This function MUST be used consistently across all migration code:
 * - scripts/migrate-questions-phase1.ts (initialization)
 * - src/lib/server/migration/state-manager.ts (processing)
 * - Any reconciliation or verification scripts
 *
 * Key Design Decisions:
 * 1. Uses a minimal set of stable properties (description, enounces, etc.)
 * 2. Sorts object keys to ensure consistent JSON serialization
 * 3. Normalizes undefined values to empty strings/arrays
 * 4. Does NOT include transient properties (type, grade, theme)
 *
 * Why this subset of properties?
 * - These properties uniquely identify the question content
 * - They are present in both old and new question formats
 * - They don't change during transformation
 * - They represent the core "what" of the question
 *
 * @param question - The question object to hash
 * @returns SHA-256 hash (hex string)
 *
 * @example
 * ```typescript
 * const question = {
 *   description: "Addition de deux nombres",
 *   enounces: ["Calculer 2 + 3"],
 *   variabless: [{ a: 2, b: 3 }],
 *   solutionss: [5]
 * };
 * const hash = generateStableQuestionHash(question);
 * // Returns: "a3f2c1b..."
 * ```
 */
export function generateStableQuestionHash(question: QuestionBase): string {
	// Normalize the question to only include stable properties
	const normalized = {
		description: question.description || '',
		subdescription: question.subdescription || '',
		enounces: question.enounces || [],
		expressions: question.expressions || [],
		variabless: question.variabless || [],
		solutionss: question.solutionss || []
	};

	// Sort keys to ensure consistent ordering
	// This is CRITICAL for hash stability across different JS engines/environments
	const sortedKeys = Object.keys(normalized).sort();

	// Create a stable JSON representation
	const content = JSON.stringify(normalized, sortedKeys);

	// Generate SHA-256 hash
	return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate a human-readable description for a question
 *
 * Used for logging, error messages, and tracking records.
 * Falls back gracefully if properties are missing.
 *
 * @param question - The question object
 * @returns Human-readable description string
 *
 * @example
 * ```typescript
 * const question = {
 *   description: "Addition",
 *   grade: "CP",
 *   enounces: ["Calculer 2 + 3"]
 * };
 * const desc = generateQuestionDescription(question);
 * // Returns: "Addition"
 * ```
 */
export function generateQuestionDescription(question: QuestionBase): string {
	const parts: string[] = [];

	// Add description if available
	if (question.description) {
		parts.push(question.description);
	}

	// Add subdescription if available
	if (question.subdescription) {
		parts.push(question.subdescription);
	}

	// If no description, use first enounce
	if (parts.length === 0 && question.enounces && question.enounces.length > 0) {
		parts.push(question.enounces[0].substring(0, 50));
	}

	// If still nothing, return placeholder
	return parts.join(' - ') || 'No description';
}

/**
 * Verify that two questions have the same hash
 *
 * Useful for testing and validation.
 *
 * @param question1 - First question
 * @param question2 - Second question
 * @returns true if hashes match, false otherwise
 */
export function verifyQuestionHashMatch(question1: QuestionBase, question2: QuestionBase): boolean {
	const hash1 = generateStableQuestionHash(question1);
	const hash2 = generateStableQuestionHash(question2);
	return hash1 === hash2;
}
