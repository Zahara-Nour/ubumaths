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

import type { StudentWorksheetView, StudentExerciseView } from '$lib/types/worksheets';
import {
	generateTypst,
	escapeTypst,
	processTableCellContent
} from '$lib/ubumark/generators/typst-generator';
import { parseMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get exercises ordered by section (visual order)
 *
 * Orders exercises by:
 * 1. Section position (sections first, in order)
 * 2. Position within each section
 * 3. Unsectioned exercises at the end
 *
 * @param worksheet - Student worksheet view
 * @returns Exercises in visual display order
 */
function getSectionOrderedExercises(worksheet: StudentWorksheetView): StudentExerciseView[] {
	const sections = worksheet.sections ?? [];
	const exercises = worksheet.exercises ?? [];

	// Create a map of section_id to section position
	const sectionPositionMap = new Map<string, number>();
	for (const section of sections) {
		sectionPositionMap.set(section.id, section.position);
	}

	// Sort exercises by section position first, then by exercise position
	return [...exercises].sort((a, b) => {
		const aSectionPos = a.section_id
			? (sectionPositionMap.get(a.section_id) ?? Infinity)
			: Infinity;
		const bSectionPos = b.section_id
			? (sectionPositionMap.get(b.section_id) ?? Infinity)
			: Infinity;

		// First compare by section position
		if (aSectionPos !== bSectionPos) {
			return aSectionPos - bSectionPos;
		}

		// Then by exercise position within section
		return a.position - b.position;
	});
}

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

	// Check if there are essential exercises for legend
	const hasEssentialExercises = (worksheet.exercises ?? []).some((e) => e.is_essential);
	if (hasEssentialExercises) {
		typst += `#text(size: 0.9em, fill: gray)[#text(fill: rgb("#f59e0b"))[★] = Exercices indispensables]\n\n`;
	}

	typst += `#line(length: 100%, stroke: 0.5pt + gray)\n\n`;

	// Sort exercises by section order, then by position within section
	const sortedExercises = getSectionOrderedExercises(worksheet);

	// Create a map of section_id to section data for quick lookup
	const sections = worksheet.sections ?? [];
	const sectionMap = new Map(sections.map((s) => [s.id, s]));
	let currentSectionId: string | null | undefined = undefined;
	let exerciseNumber = 0;

	// Collect corrections for later (if includeSolution)
	const corrections: { number: number; title: string | null | undefined; correction: string }[] =
		[];

	for (const exercise of sortedExercises) {
		// Check if we're entering a new section
		if (exercise.section_id !== currentSectionId) {
			currentSectionId = exercise.section_id;

			if (currentSectionId) {
				const section = sectionMap.get(currentSectionId);
				if (section) {
					// Section header
					typst += `= ${escapeTypst(section.title)}\n\n`;
					if (section.instructions) {
						typst += `#text(style: "italic", fill: gray)[${escapeTypst(section.instructions)}]\n\n`;
					}
				}
			} else if (sections.length > 0) {
				// Unsectioned exercises after sectioned ones
				typst += `= Autres exercices\n\n`;
			}
		}

		exerciseNumber++;
		// Exercise header: red box with white number, optional bold title
		// Use processTableCellContent to handle math expressions in titles
		const titlePart = exercise.title
			? ` #h(0.5em) #text(weight: "bold")[${processTableCellContent(exercise.title)}]`
			: '';

		// Star prefix for essential exercises
		const essentialPrefix = exercise.is_essential ? `#text(fill: rgb("#f59e0b"))[★] ` : '';

		// Build exercise content
		let exerciseContent = `${essentialPrefix}#box(fill: rgb("#dc2626"), radius: 3pt, inset: (x: 6pt, y: 3pt))[#text(fill: white, weight: "bold")[${exerciseNumber}]]${titlePart}\n\n`;

		// Points if available
		if (exercise.points) {
			exerciseContent += `#text(size: 0.9em, fill: gray)[${exercise.points} point${exercise.points > 1 ? 's' : ''}]\n\n`;
		}

		// Custom instructions if present
		if (exercise.custom_instructions) {
			exerciseContent += `#text(style: "italic", fill: gray)[${escapeTypst(exercise.custom_instructions)}]\n\n`;
		}

		// Statement (already resolved markdown)
		const statementAst = parseMarkdown(exercise.statement);
		exerciseContent += generateTypst(statementAst, { includeSetup: false }) + '\n\n';

		// Wrap essential exercises with orange left border
		if (exercise.is_essential) {
			typst += `#block(stroke: (left: 2pt + rgb("#f97316")), inset: (left: 8pt))[
${exerciseContent}]\n`;
		} else {
			typst += exerciseContent;
		}

		// Collect correction for the end section
		if (includeSolution && exercise.correction && exercise.correction_visible) {
			corrections.push({
				number: exerciseNumber,
				title: exercise.title,
				correction: exercise.correction
			});
		}

		typst += `#v(1em)\n`;
	}

	// Add corrections section at the end
	if (corrections.length > 0) {
		typst += `#pagebreak()\n\n`;
		typst += `= Corrections\n\n`;

		for (const { number, title, correction } of corrections) {
			const titlePart = title
				? ` #h(0.5em) #text(weight: "bold")[${processTableCellContent(title)}]`
				: '';

			typst += `#block(fill: rgb("#f0fdf4"), radius: 4pt, inset: 12pt, width: 100%)[
  #box(fill: rgb("#dc2626"), radius: 3pt, inset: (x: 6pt, y: 3pt))[#text(fill: white, weight: "bold")[${number}]]${titlePart}
  #v(0.5em)
`;
			const correctionAst = parseMarkdown(correction);
			typst += generateTypst(correctionAst, { includeSetup: false });
			typst += `\n]\n\n#v(1em)\n`;
		}
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
	return `#set page(
  paper: "a4",
  margin: (x: 1cm, y: 1.5cm),
  columns: 2,
  footer: context [
    #set align(center)
    #set text(size: 9pt, fill: gray)
    #counter(page).display("1 / 1", both: true)
  ]
)
#set text(font: "New Computer Modern", size: 10pt, lang: "fr")
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
