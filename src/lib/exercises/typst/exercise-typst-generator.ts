/**
 * Exercise Typst Generator
 * ========================
 *
 * Generates Typst documents for single exercises with full metadata,
 * variation support, and optional solution display.
 *
 * Features:
 * - Exercise instance generation with seed/variation
 * - Full metadata display (title, source, difficulty, tags, variation)
 * - Statement and optional solution
 * - Proper LaTeX-to-Typst math conversion
 * - French locale support
 *
 * @module exercises/typst/exercise-typst-generator
 *
 * @example Basic usage
 * ```typescript
 * const typst = await generateExerciseTypst({
 *   exercise: myExercise,
 *   variationIndex: 0,
 *   seed: 12345,
 *   includeSolution: true,
 *   includeMetadata: true
 * });
 * ```
 */

import type { Exercise, ExerciseInstance } from '$lib/exercises/types';
import { generateExerciseInstance } from '$lib/exercises/generator/instance-generator';
import { generateTypst, escapeTypst } from '$lib/ubumark/generators/typst-generator';
import { parseMarkdown } from '$lib/ubumark';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for generating exercise Typst document
 */
export interface GenerateExerciseTypstOptions {
	/** Exercise template (may contain variables and variations) */
	exercise: Exercise;

	/** Index of variation to use (default: 0) */
	variationIndex?: number;

	/** Seed for reproducible variable resolution */
	seed?: number;

	/** Include solution in the output (default: false) */
	includeSolution?: boolean;

	/** Include metadata header (title, difficulty, tags, etc.) (default: true) */
	includeMetadata?: boolean;
}

/**
 * Result of exercise Typst generation
 */
export interface GenerateExerciseTypstResult {
	/** Whether generation succeeded */
	success: boolean;

	/** Generated Typst content (if success) */
	typstContent?: string;

	/** Error message (if failed) */
	error?: string;

	/** Generated exercise instance (if success) */
	instance?: ExerciseInstance;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate Typst document for a single exercise
 *
 * This is the main entry point for PDF generation from the public exercise page.
 * It handles:
 * 1. Exercise instance generation (resolving variables and variations)
 * 2. Typst document setup (page, fonts, math operators)
 * 3. Metadata header (title, source, difficulty, tags, variation)
 * 4. Statement content (parsed from markdown)
 * 5. Optional solution content
 *
 * @param options - Generation options
 * @returns Generation result with Typst content or error
 *
 * @example With solution
 * ```typescript
 * const result = await generateExerciseTypst({
 *   exercise: myExercise,
 *   seed: 42,
 *   variationIndex: 1,
 *   includeSolution: true
 * });
 *
 * if (result.success) {
 *   // Compile with TypstService
 *   const service = getTypstService();
 *   await service.initialize();
 *   const pdf = await service.compile(result.typstContent, { format: 'pdf' });
 * }
 * ```
 */
export async function generateExerciseTypst(
	options: GenerateExerciseTypstOptions
): Promise<GenerateExerciseTypstResult> {
	const {
		exercise,
		variationIndex = 0,
		seed,
		includeSolution = false,
		includeMetadata = true
	} = options;

	try {
		// 1. Generate exercise instance
		const instanceResult = generateExerciseInstance(exercise, {
			seed,
			variationIndex
		});

		if (!instanceResult.success || !instanceResult.instance) {
			return {
				success: false,
				error: instanceResult.errors?.join(', ') || 'Failed to generate exercise instance'
			};
		}

		const instance = instanceResult.instance;

		// 2. Build Typst document
		let typst = generateSetup();
		typst += generateHeader(exercise, instance, includeMetadata);
		typst += generateStatement(instance.statement_md);

		if (includeSolution && instance.solution_md) {
			typst += generateSolution(instance.solution_md);
		}

		return {
			success: true,
			typstContent: typst,
			instance
		};
	} catch (error) {
		return {
			success: false,
			error: `Typst generation failed: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}

// ============================================================================
// SETUP GENERATION
// ============================================================================

/**
 * Generate Typst document setup
 *
 * Includes:
 * - Page size and margins
 * - Font configuration
 * - Math operator setup (limits for sum, prod, lim, etc.)
 * - Paragraph justification
 */
function generateSetup(): string {
	return `#set page(paper: "a4", margin: (x: 2cm, y: 2cm))
#set text(font: "New Computer Modern", size: 11pt, lang: "fr")
#set par(justify: true)
#set heading(numbering: none)

// List item spacing
#set enum(spacing: 1.5em, tight: false)
#set list(spacing: 1.5em, tight: false)

// Display limits above/below for common operators
#show math.sum: math.limits
#show math.product: math.limits
#show math.integral: math.limits.with(inline: false)

// Redefine operators with limits: true
#let lim = math.op("lim", limits: true)
#let limsup = math.op("lim sup", limits: true)
#let liminf = math.op("lim inf", limits: true)
#let max = math.op("max", limits: true)
#let min = math.op("min", limits: true)
#let sup = math.op("sup", limits: true)
#let inf = math.op("inf", limits: true)

`;
}

// ============================================================================
// HEADER GENERATION
// ============================================================================

/**
 * Generate document header with metadata
 *
 * @param exercise - Original exercise template
 * @param instance - Generated exercise instance
 * @param includeMetadata - Whether to include metadata
 */
function generateHeader(
	exercise: Exercise,
	instance: ExerciseInstance,
	includeMetadata: boolean
): string {
	let header = '';

	// Title
	const title = exercise.title || 'Exercice';
	header += `#align(center)[
  #text(size: 1.5em, weight: "bold")[${escapeTypst(title)}]
]\n\n`;

	if (includeMetadata) {
		// Metadata row
		const meta: string[] = [];

		// Difficulty
		if (exercise.difficulty) {
			const diffLabels = ['Facile', 'Moyen', 'Difficile'];
			meta.push(`Difficulté : ${diffLabels[exercise.difficulty - 1]}`);
		}

		// Grade levels
		if (exercise.grade_levels?.length) {
			meta.push(`Niveaux : ${exercise.grade_levels.join(', ')}`);
		}

		// Source
		if (exercise.source) {
			meta.push(`Source : ${escapeTypst(exercise.source)}`);
		}

		// Variation label
		if (instance.selectedVariationLabel) {
			const varLabels: Record<string, string> = {
				autonomous: 'Autonome',
				intermediate: 'Intermédiaire',
				guided: 'Guidée'
			};
			const label = varLabels[instance.selectedVariationLabel] || instance.selectedVariationLabel;
			meta.push(`Version : ${label}`);
		}

		if (meta.length > 0) {
			header += `#text(size: 0.9em, fill: gray)[${meta.join(' • ')}]\n\n`;
		}

		// Tags
		if (exercise.tags?.length) {
			header += `#box[\n`;
			for (const tag of exercise.tags) {
				header += `  #box(fill: rgb("#e5e7eb"), radius: 3pt, inset: (x: 6pt, y: 3pt))[${escapeTypst(tag)}]\n`;
			}
			header += `]\n\n`;
		}

		// Topic
		if (exercise.topic) {
			header += `#text(size: 0.9em, fill: gray)[Thème : ${escapeTypst(exercise.topic)}]\n\n`;
		}
	}

	// Separator line
	header += `#line(length: 100%, stroke: 0.5pt + gray)\n\n`;

	return header;
}

// ============================================================================
// CONTENT GENERATION
// ============================================================================

/**
 * Generate statement section from markdown
 *
 * @param markdown - Statement markdown content
 */
function generateStatement(markdown: string): string {
	const ast = parseMarkdown(markdown);
	const typstContent = generateTypst(ast, { includeSetup: false });
	return typstContent + '\n\n';
}

/**
 * Generate solution section from markdown
 *
 * @param markdown - Solution markdown content
 */
function generateSolution(markdown: string): string {
	let content = `#v(1em)\n`;
	content += `#line(length: 100%, stroke: 0.5pt + gray)\n\n`;
	content += `#text(weight: "bold", fill: rgb("#166534"))[Correction]\n\n`;

	const ast = parseMarkdown(markdown);
	content += generateTypst(ast, { includeSetup: false });

	return content;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate Typst for a static exercise (no instance generation needed)
 *
 * Use this for exercises that don't need variable resolution,
 * when you already have the resolved markdown content.
 *
 * @param statementMd - Statement markdown
 * @param solutionMd - Solution markdown (optional)
 * @param metadata - Optional metadata
 */
export async function generateStaticExerciseTypst(
	statementMd: string,
	solutionMd?: string,
	metadata?: {
		title?: string;
		difficulty?: 1 | 2 | 3;
		tags?: string[];
		source?: string;
	}
): Promise<string> {
	let typst = generateSetup();

	// Title
	if (metadata?.title) {
		typst += `#align(center)[
  #text(size: 1.5em, weight: "bold")[${escapeTypst(metadata.title)}]
]\n\n`;
	}

	// Metadata
	const meta: string[] = [];
	if (metadata?.difficulty) {
		const diffLabels = ['Facile', 'Moyen', 'Difficile'];
		meta.push(`Difficulté : ${diffLabels[metadata.difficulty - 1]}`);
	}
	if (metadata?.source) {
		meta.push(`Source : ${escapeTypst(metadata.source)}`);
	}
	if (meta.length > 0) {
		typst += `#text(size: 0.9em, fill: gray)[${meta.join(' • ')}]\n\n`;
	}

	// Tags
	if (metadata?.tags?.length) {
		typst += `#box[\n`;
		for (const tag of metadata.tags) {
			typst += `  #box(fill: rgb("#e5e7eb"), radius: 3pt, inset: (x: 6pt, y: 3pt))[${escapeTypst(tag)}]\n`;
		}
		typst += `]\n\n`;
	}

	typst += `#line(length: 100%, stroke: 0.5pt + gray)\n\n`;

	// Statement
	const statementAst = parseMarkdown(statementMd);
	typst += generateTypst(statementAst, { includeSetup: false }) + '\n\n';

	// Solution
	if (solutionMd) {
		typst += `#v(1em)\n`;
		typst += `#line(length: 100%, stroke: 0.5pt + gray)\n\n`;
		typst += `#text(weight: "bold", fill: rgb("#166534"))[Correction]\n\n`;

		const solutionAst = parseMarkdown(solutionMd);
		typst += generateTypst(solutionAst, { includeSetup: false });
	}

	return typst;
}
