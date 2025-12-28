/**
 * Student Worksheet Typst Generator
 * ==================================
 *
 * Generates Typst documents for student worksheet views.
 * Uses already-resolved exercise content (statement and correction).
 *
 * @module worksheets/student-worksheet-typst
 *
 * @example
 * ```typescript
 * import { generateStudentWorksheetTypst } from '$lib/worksheets/student-worksheet-typst';
 *
 * const typstContent = generateStudentWorksheetTypst(worksheet, true);
 * // Compile with TypstService
 * const service = getTypstService();
 * const result = await service.compile(typstContent, { format: 'pdf' });
 * ```
 */

import type { StudentWorksheetView } from '$lib/types/worksheets';
import { generateTypst, escapeTypst } from '$lib/ubumark/generators/typst-generator';
import { parseMarkdown } from '$lib/ubumark';

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate Typst document for a student worksheet
 *
 * @param worksheet - Student worksheet view with resolved exercises
 * @param includeSolution - Whether to include corrections
 * @returns Typst document content
 */
export function generateStudentWorksheetTypst(
	worksheet: StudentWorksheetView,
	includeSolution: boolean
): string {
	let typst = generateSetup();

	// Header with title
	typst += `#align(center)[
  #text(size: 1.5em, weight: "bold")[${escapeTypst(worksheet.title)}]
]\n\n`;

	// Type badge
	const typeLabels: Record<string, string> = {
		worksheet: 'Fiche de travail',
		assessment: 'Evaluation',
		exam: 'Examen',
		quiz: 'Quiz',
		homework: 'Devoir'
	};
	const typeLabel = typeLabels[worksheet.type] || worksheet.type;
	typst += `#align(center)[#text(size: 0.9em, fill: gray)[${typeLabel}]]\n\n`;

	// Description if present
	if (worksheet.description) {
		typst += `#text(fill: gray)[${escapeTypst(worksheet.description)}]\n\n`;
	}

	// Instructions if present
	if (worksheet.instructions) {
		typst += `#block(fill: rgb("#eff6ff"), radius: 4pt, inset: 12pt, width: 100%)[
  #text(weight: "bold", fill: rgb("#1d4ed8"))[Instructions]
  #v(0.5em)
  ${escapeTypst(worksheet.instructions)}
]\n\n`;
	}

	typst += `#line(length: 100%, stroke: 0.5pt + gray)\n\n`;

	// Exercises
	const sortedExercises = [...worksheet.exercises].sort((a, b) => a.position - b.position);

	for (const exercise of sortedExercises) {
		// Exercise header with title if present
		const exerciseHeader = exercise.title
			? `Exercice ${exercise.position} - ${escapeTypst(exercise.title)}`
			: `Exercice ${exercise.position}`;

		typst += `== ${exerciseHeader}\n\n`;

		// Points if available
		if (exercise.points) {
			typst += `#text(size: 0.9em, fill: gray)[${exercise.points} point${exercise.points > 1 ? 's' : ''}]\n\n`;
		}

		// Custom instructions if present
		if (exercise.custom_instructions) {
			typst += `#text(style: "italic", fill: gray)[${escapeTypst(exercise.custom_instructions)}]\n\n`;
		}

		// Statement (already resolved markdown)
		const statementAst = parseMarkdown(exercise.statement);
		typst += generateTypst(statementAst, { includeSetup: false }) + '\n\n';

		// Correction if available and requested
		if (includeSolution && exercise.correction && exercise.correction_visible) {
			typst += `#v(0.5em)\n`;
			typst += `#block(fill: rgb("#f0fdf4"), radius: 4pt, inset: 12pt, width: 100%)[
  #text(weight: "bold", fill: rgb("#166534"))[Correction]
  #v(0.5em)
`;
			const correctionAst = parseMarkdown(exercise.correction);
			typst += generateTypst(correctionAst, { includeSetup: false });
			typst += `\n]\n\n`;
		}

		typst += `#v(1em)\n`;
	}

	return typst;
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
