/**
 * Markdown Frontmatter Parser/Serializer
 *
 * Handles parsing and serializing exercises in markdown format with YAML frontmatter.
 * Format:
 * ---
 * version: '1.0'
 * title: Exercise Title
 * difficulty: 2
 * tags: [algebra, equations]
 * ...
 * ---
 *
 * # Énoncé
 *
 * Exercise statement...
 *
 * # Solution
 *
 * Solution content...
 *
 * @module exercises/markdown-frontmatter
 */

import * as YAML from 'yaml';
import type { ExerciseExport, ExerciseFrontmatter } from './types';
import { validateFrontmatter } from './validation';
import { sanitizeForSlug } from '$lib/utils/filename';

// ============================================================================
// CONSTANTS
// ============================================================================

const FRONTMATTER_DELIMITER = '---';
const STATEMENT_HEADING = '# Énoncé';
const SOLUTION_HEADING = '# Solution';

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse markdown content with YAML frontmatter
 *
 * @param content - Markdown content with frontmatter
 * @returns Parsed exercise data or error
 */
export function parseMarkdownWithFrontmatter(content: string): {
	success: boolean;
	data?: ExerciseExport;
	error?: string;
} {
	try {
		// Split content by frontmatter delimiters
		const lines = content.split('\n');

		// Find frontmatter boundaries
		const firstDelimiterIndex = lines.findIndex((line) => line.trim() === FRONTMATTER_DELIMITER);
		const secondDelimiterIndex = lines.findIndex(
			(line, idx) => idx > firstDelimiterIndex && line.trim() === FRONTMATTER_DELIMITER
		);

		if (firstDelimiterIndex === -1 || secondDelimiterIndex === -1) {
			return { success: false, error: 'Invalid frontmatter: missing delimiters (---)' };
		}

		// Extract frontmatter YAML
		const frontmatterLines = lines.slice(firstDelimiterIndex + 1, secondDelimiterIndex);
		const frontmatterYaml = frontmatterLines.join('\n');

		// Parse YAML
		let frontmatter: unknown;
		try {
			frontmatter = YAML.parse(frontmatterYaml);
		} catch (yamlError) {
			return { success: false, error: `Invalid YAML in frontmatter: ${yamlError}` };
		}

		// Validate frontmatter
		const frontmatterValidation = validateFrontmatter(frontmatter);
		if (!frontmatterValidation.success) {
			return { success: false, error: `Invalid frontmatter: ${frontmatterValidation.error}` };
		}

		// Extract markdown body
		const bodyLines = lines.slice(secondDelimiterIndex + 1);
		const body = bodyLines.join('\n').trim();

		// Parse body into statement and solution
		const { statement, solution, error } = parseMarkdownBody(body);
		if (error) {
			return { success: false, error };
		}

		// Combine frontmatter and content
		const exerciseData: ExerciseExport = {
			version: frontmatterValidation.data!.version,
			title: frontmatterValidation.data!.title,
			source: frontmatterValidation.data!.source,
			difficulty: frontmatterValidation.data!.difficulty,
			tags: frontmatterValidation.data!.tags,
			statement_md: statement!,
			solution_md: solution!,
			grade_levels: frontmatterValidation.data!.grade_levels,
			topic: frontmatterValidation.data!.topic
		};

		return { success: true, data: exerciseData };
	} catch (error) {
		return { success: false, error: `Failed to parse markdown: ${error}` };
	}
}

/**
 * Parse markdown body into statement and solution sections
 *
 * @param body - Markdown body content (without frontmatter)
 * @returns Statement and solution content or error
 */
function parseMarkdownBody(body: string): {
	statement?: string;
	solution?: string;
	error?: string;
} {
	// Find statement and solution headings
	const statementIndex = body.indexOf(STATEMENT_HEADING);
	const solutionIndex = body.indexOf(SOLUTION_HEADING);

	if (statementIndex === -1) {
		return { error: `Missing "${STATEMENT_HEADING}" heading in markdown body` };
	}

	if (solutionIndex === -1) {
		return { error: `Missing "${SOLUTION_HEADING}" heading in markdown body` };
	}

	if (solutionIndex <= statementIndex) {
		return { error: 'Solution heading must come after statement heading' };
	}

	// Extract statement (from "# Énoncé" to "# Solution")
	const statementStart = statementIndex + STATEMENT_HEADING.length;
	const statement = body.substring(statementStart, solutionIndex).trim();

	// Extract solution (from "# Solution" to end)
	const solutionStart = solutionIndex + SOLUTION_HEADING.length;
	const solution = body.substring(solutionStart).trim();

	if (!statement) {
		return { error: 'Statement section cannot be empty' };
	}

	if (!solution) {
		return { error: 'Solution section cannot be empty' };
	}

	return { statement, solution };
}

// ============================================================================
// SERIALIZATION FUNCTIONS
// ============================================================================

/**
 * Convert exercise to markdown format with YAML frontmatter
 *
 * @param exercise - Exercise data to convert
 * @returns Markdown content with frontmatter
 */
export function serializeToMarkdown(exercise: ExerciseExport): string {
	// Create frontmatter object
	const frontmatter: ExerciseFrontmatter = {
		version: exercise.version,
		title: exercise.title,
		source: exercise.source,
		difficulty: exercise.difficulty,
		tags: exercise.tags,
		grade_levels: exercise.grade_levels,
		topic: exercise.topic
	};

	// Remove undefined and null fields
	const cleanedFrontmatter = Object.fromEntries(
		Object.entries(frontmatter).filter(([, value]) => value !== undefined && value !== null)
	);

	// Serialize frontmatter to YAML
	const yamlContent = YAML.stringify(cleanedFrontmatter);

	// Build markdown content
	const markdown = [
		FRONTMATTER_DELIMITER,
		yamlContent.trim(),
		FRONTMATTER_DELIMITER,
		'',
		STATEMENT_HEADING,
		'',
		exercise.statement_md.trim(),
		'',
		SOLUTION_HEADING,
		'',
		exercise.solution_md.trim(),
		''
	].join('\n');

	return markdown;
}

/**
 * Convert multiple exercises to markdown format (one file per exercise)
 *
 * @param exercises - Array of exercises to convert
 * @returns Map of filename to markdown content
 */
export function serializeToMarkdownFiles(exercises: ExerciseExport[]): Map<string, string> {
	const files = new Map<string, string>();

	exercises.forEach((exercise, index) => {
		// Generate filename from title or index
		const filename = exercise.title
			? `${sanitizeForSlug(exercise.title)}.md`
			: `exercise-${index + 1}.md`;

		const markdown = serializeToMarkdown(exercise);
		files.set(filename, markdown);
	});

	return files;
}

/**
 * Check if content has valid frontmatter structure
 *
 * @param content - Markdown content to check
 * @returns True if content has frontmatter delimiters
 */
export function hasFrontmatter(content: string): boolean {
	const lines = content.trim().split('\n');
	if (lines[0] !== FRONTMATTER_DELIMITER) {
		return false;
	}

	const secondDelimiter = lines.findIndex(
		(line, idx) => idx > 0 && line.trim() === FRONTMATTER_DELIMITER
	);
	return secondDelimiter > 0;
}
