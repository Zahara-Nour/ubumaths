/**
 * Worksheet Typst Generator
 * =========================
 *
 * Generates Typst documents from worksheet instances with resolved exercises.
 * Supports different worksheet types, custom configurations, and both worksheet
 * and correction modes.
 *
 * @module worksheets/typst-generator
 */

import type {
	WorksheetRow,
	WorksheetConfig,
	InstanceData,
	ResolvedExercise,
	WorksheetType
} from '$lib/types/worksheets';
import { transpileToTypst } from '$lib/exercises/transpilers/typst-transpiler';
import { parseMarkdown } from '$lib/exercises/parser/markdown-parser';
import { escapeTypst } from '$lib/exercises/transpilers/typst-transpiler';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateTypstParams {
	worksheet: WorksheetRow;
	instance: InstanceData;
	config: WorksheetConfig;
	mode: 'worksheet' | 'correction';
	studentName?: string;
	className?: string;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate a complete Typst document for a worksheet instance
 *
 * @param params - Generation parameters
 * @returns Complete Typst document as string
 */
export function generateWorksheetTypst(params: GenerateTypstParams): string {
	const { worksheet, instance, config, mode, studentName, className } = params;

	// Generate document parts
	const setup = generateSetup(config, worksheet.type);
	const header = generateHeader(worksheet, config, studentName, className, mode);
	const exercises = generateExercises(instance, config, mode, worksheet.type);
	const footer = generateFooter(worksheet, config, mode);

	// Combine all parts
	return [setup, header, exercises, footer].filter(Boolean).join('\n\n');
}

// ============================================================================
// SETUP GENERATION
// ============================================================================

/**
 * Generate Typst document setup with page configuration and styles
 */
function generateSetup(config: WorksheetConfig, type: WorksheetType): string {
	const pageLayout = config.page_layout || 'A4';
	const fontSize = config.font_size || 12;
	const margins = config.margins || { top: 20, bottom: 20, left: 15, right: 15 };

	let setup = `// Document Setup
#set page(
  paper: "${pageLayout.toLowerCase()}",
  margin: (
    top: ${margins.top}mm,
    bottom: ${margins.bottom}mm,
    left: ${margins.left}mm,
    right: ${margins.right}mm,
  ),
  header-ascent: 20%,
  footer-descent: 20%,
)

#set text(
  font: "New Computer Modern",
  size: ${fontSize}pt,
  lang: "fr",
  region: "FR"
)

#set par(justify: true, leading: 0.65em)
#set heading(numbering: none)

// Custom styles for different elements
#let exercise-box(content) = {
  block(
    width: 100%,
    inset: 0pt,
    content
  )
}

#let solution-box(content) = {
  block(
    width: 100%,
    fill: rgb(240, 240, 240),
    inset: 10pt,
    radius: 4pt,
    content
  )
}

#let points-badge(pts) = {
  text(size: 0.9em, weight: "bold")[#box(
    fill: rgb(220, 220, 220),
    inset: (x: 6pt, y: 3pt),
    radius: 3pt,
    [#pts pts]
  )]
}
`;

	// Add exam-specific styles
	if (type === 'exam' || type === 'assessment') {
		setup += `
// Exam-specific styles
#let answer-space(height: 3cm) = {
  rect(
    width: 100%,
    height: height,
    stroke: (paint: rgb(200, 200, 200), thickness: 0.5pt, dash: "dashed"),
    fill: none
  )
}
`;
	}

	return setup;
}

// ============================================================================
// HEADER GENERATION
// ============================================================================

/**
 * Generate worksheet header with title, metadata, and student info
 */
function generateHeader(
	worksheet: WorksheetRow,
	config: WorksheetConfig,
	studentName?: string,
	className?: string,
	mode: 'worksheet' | 'correction' = 'worksheet'
): string {
	let header = '';

	// Correction banner (only in correction mode)
	if (mode === 'correction') {
		header += '#block(width: 100%, fill: rgb(34, 139, 34), inset: 10pt)[\n';
		header += '  #align(center)[\n';
		header += '    #text(size: 1.4em, weight: "bold", fill: white)[CORRECTION]\n';
		header += '  ]\n';
		header += ']\n\n';
		header += '#v(0.5em)\n\n';
	}

	// Student information box
	if (config.show_student_name || config.show_class) {
		header += '#block(width: 100%)[\n';
		header += '  #grid(\n';
		header += '    columns: (1fr, 1fr),\n';
		header += '    column-gutter: 2cm,\n';

		// Left side: Name
		if (config.show_student_name) {
			const name = studentName || '.'.repeat(40);
			header += `    align(left)[*Nom :* ${escapeTypst(name)}],\n`;
		} else {
			header += '    [],\n';
		}

		// Right side: Class and date
		const rightItems: string[] = [];
		if (config.show_class) {
			const cls = className || '.'.repeat(20);
			rightItems.push(`*Classe :* ${escapeTypst(cls)}`);
		}
		if (config.show_date) {
			const date = new Date().toLocaleDateString('fr-FR', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			});
			rightItems.push(`*Date :* ${date}`);
		}

		if (rightItems.length > 0) {
			header += `    align(right)[${rightItems.join(' #h(1em) ')}]\n`;
		} else {
			header += '    []\n';
		}

		header += '  )\n';
		header += ']\n\n';
		header += '#v(0.5em)\n\n';
	}

	// Title
	if (config.show_title) {
		const typeLabel = getTypeLabel(worksheet.type);
		const titleSuffix = mode === 'correction' ? ' - Correction' : '';
		header += `#align(center)[\n`;
		header += `  #text(size: 1.5em, weight: "bold")[${escapeTypst(typeLabel)}${titleSuffix}]\n`;
		header += `  #linebreak()\n`;
		header += `  #text(size: 1.3em)[${escapeTypst(worksheet.title)}]\n`;
		header += `]\n\n`;
		header += '#v(0.5em)\n\n';
	}

	// Duration and points
	const metadata: string[] = [];
	if (worksheet.estimated_duration_minutes) {
		metadata.push(`*Durée :* ${worksheet.estimated_duration_minutes} minutes`);
	}
	if (config.show_points && worksheet.total_points) {
		metadata.push(`*Barème :* ${worksheet.total_points} points`);
	}

	if (metadata.length > 0) {
		header += `#align(center)[${metadata.join(' #h(2em) ')}]\n\n`;
		header += '#v(0.5em)\n\n';
	}

	// Instructions for exams
	if (worksheet.type === 'exam' || worksheet.type === 'assessment') {
		header += '#block(width: 100%, fill: rgb(250, 250, 250), inset: 10pt, radius: 4pt)[\n';
		header += '  #text(size: 0.9em, style: "italic")[\n';
		header += '    *Instructions :*\n';
		header += '    #list(\n';
		header += '      [Lisez attentivement chaque énoncé avant de répondre.],\n';
		header += '      [Écrivez lisiblement et justifiez vos réponses.],\n';
		header +=
			'      [La calculatrice est ' +
			(worksheet.type === 'exam' ? 'interdite' : 'autorisée') +
			'.],\n';
		header += '      [Gérez bien votre temps.]\n';
		header += '    )\n';
		header += '  ]\n';
		header += ']\n\n';
		header += '#v(0.5em)\n\n';
	}

	// Separator
	header += '#line(length: 100%, stroke: 0.5pt)\n\n';
	header += '#v(0.5em)\n\n';

	return header;
}

// ============================================================================
// EXERCISES GENERATION
// ============================================================================

/**
 * Generate all exercises with proper numbering and formatting
 */
function generateExercises(
	instance: InstanceData,
	config: WorksheetConfig,
	mode: 'worksheet' | 'correction',
	worksheetType: WorksheetType
): string {
	const exercises = instance.exercises;
	const numberingStyle = config.numbering_style || 'numeric';

	// Apply exercise order if shuffled
	const orderedExercises = instance.exercise_order
		? instance.exercise_order.map((idx) => exercises[idx])
		: exercises;

	let content = '';

	orderedExercises.forEach((exercise, index) => {
		const number = formatExerciseNumber(index + 1, numberingStyle);
		content += generateSingleExercise(exercise, number, mode, worksheetType, config);
		content += '\n\n';
	});

	return content;
}

/**
 * Generate a single exercise with statement and optionally solution
 */
function generateSingleExercise(
	exercise: ResolvedExercise,
	number: string,
	mode: 'worksheet' | 'correction',
	worksheetType: WorksheetType,
	config: WorksheetConfig
): string {
	let content = '';

	// Exercise header with number and optional points
	content += '#exercise-box[\n';
	content += '  #grid(\n';
	content += '    columns: (auto, 1fr, auto),\n';
	content += `    [#text(size: 1.1em, weight: "bold")[Exercice ${number}]],\n`;
	content += '    [],\n';

	if (config.show_points && exercise.position) {
		// Using position as points for now (should be exercise.points when available)
		content += `    points-badge(${exercise.position})\n`;
	} else {
		content += '    []\n';
	}

	content += '  )\n';
	content += '  #v(0.3em)\n';
	content += '  \n';

	// Exercise statement
	const statementAst = parseMarkdown(exercise.statement);
	const statementTypst = transpileToTypst(statementAst, {
		includeSetup: false,
		language: 'fr'
	});

	// Indent the statement content
	const indentedStatement = statementTypst
		.split('\n')
		.map((line) => '  ' + line)
		.join('\n');

	content += indentedStatement + '\n';

	// Add answer space for exams (in worksheet mode only)
	if (mode === 'worksheet' && (worksheetType === 'exam' || worksheetType === 'assessment')) {
		content += '  #v(0.5em)\n';
		content += '  #answer-space(height: 5cm)\n';
	}

	content += ']\n';

	// Solution (in correction mode)
	if (mode === 'correction' && exercise.solution) {
		content += '\n#solution-box[\n';
		content += '  #text(weight: "bold", fill: rgb(0, 100, 0))[Solution :]\n';
		content += '  #v(0.3em)\n';

		const solutionAst = parseMarkdown(exercise.solution);
		const solutionTypst = transpileToTypst(solutionAst, {
			includeSetup: false,
			language: 'fr'
		});

		// Indent the solution content
		const indentedSolution = solutionTypst
			.split('\n')
			.map((line) => '  ' + line)
			.join('\n');

		content += indentedSolution + '\n';
		content += ']\n';
	}

	return content;
}

/**
 * Format exercise number according to style
 */
function formatExerciseNumber(num: number, style: 'numeric' | 'alphabetic' | 'roman'): string {
	switch (style) {
		case 'alphabetic':
			// Convert to A, B, C, etc.
			return String.fromCharCode(64 + num);

		case 'roman':
			// Convert to Roman numerals
			return toRoman(num);

		case 'numeric':
		default:
			return num.toString();
	}
}

/**
 * Convert number to Roman numerals
 */
function toRoman(num: number): string {
	const romanNumerals: [number, string][] = [
		[1000, 'M'],
		[900, 'CM'],
		[500, 'D'],
		[400, 'CD'],
		[100, 'C'],
		[90, 'XC'],
		[50, 'L'],
		[40, 'XL'],
		[10, 'X'],
		[9, 'IX'],
		[5, 'V'],
		[4, 'IV'],
		[1, 'I']
	];

	let result = '';
	for (const [value, symbol] of romanNumerals) {
		while (num >= value) {
			result += symbol;
			num -= value;
		}
	}
	return result;
}

// ============================================================================
// FOOTER GENERATION
// ============================================================================

/**
 * Generate document footer
 */
function generateFooter(
	worksheet: WorksheetRow,
	config: WorksheetConfig,
	mode: 'worksheet' | 'correction'
): string {
	let footer = '';

	// Add page numbering
	footer += '#set page(footer: [\n';
	footer += '  #set align(center)\n';
	footer += '  #set text(size: 0.9em, fill: rgb(100, 100, 100))\n';

	if (mode === 'correction') {
		footer += '  Correction - ';
	}

	footer += `  ${escapeTypst(worksheet.title)} - Page #context counter(page).display()\n`;
	footer += '])\n';

	// Add generation info for corrections
	if (mode === 'correction') {
		footer += '\n#v(2em)\n';
		footer += '#line(length: 100%, stroke: 0.5pt)\n';
		footer += '#v(0.5em)\n';
		footer += '#align(center)[\n';
		footer += '  #text(size: 0.8em, style: "italic", fill: rgb(100, 100, 100))[\n';
		footer += `    Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}\n`;
		footer += '  ]\n';
		footer += ']\n';
	}

	return footer;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get localized type label
 */
function getTypeLabel(type: WorksheetType): string {
	const labels: Record<WorksheetType, string> = {
		worksheet: "Feuille d'exercices",
		assessment: 'Évaluation',
		exam: 'Examen',
		quiz: 'Quiz',
		homework: 'Devoirs'
	};

	return labels[type] || "Feuille d'exercices";
}

/**
 * Generate Typst document for a batch of instances
 * Each instance generates a new page
 */
export function generateBatchTypst(
	worksheet: WorksheetRow,
	instances: Array<{ instance: InstanceData; studentName: string; studentId: string }>,
	config: WorksheetConfig,
	mode: 'worksheet' | 'correction',
	className?: string
): string {
	const documents: string[] = [];

	instances.forEach((item, index) => {
		// Add page break between documents (except for the first one)
		if (index > 0) {
			documents.push('#pagebreak()');
		}

		// Generate individual document
		const doc = generateWorksheetTypst({
			worksheet,
			instance: item.instance,
			config,
			mode,
			studentName: item.studentName,
			className
		});

		// Remove setup from subsequent documents to avoid duplication
		const docContent = index === 0 ? doc : removeSetupSection(doc);
		documents.push(docContent);
	});

	return documents.join('\n\n');
}

/**
 * Remove the setup section from a Typst document (for batch generation)
 */
function removeSetupSection(typst: string): string {
	// Find the end of the setup section (look for the first non-setup content)
	const setupEndMarker = '// Document Setup';
	const setupStart = typst.indexOf(setupEndMarker);

	if (setupStart === -1) {
		return typst;
	}

	// Find where actual content starts (after all the #set and #let declarations)
	const contentMarkers = ['#block(width: 100%)', '#align(center)', '#exercise-box'];
	let contentStart = typst.length;

	for (const marker of contentMarkers) {
		const pos = typst.indexOf(marker);
		if (pos !== -1 && pos < contentStart) {
			contentStart = pos;
		}
	}

	return typst.substring(contentStart);
}
