/**
 * Worksheet Typst Generator
 * =========================
 *
 * Generates Typst documents from worksheet instances with resolved exercises.
 * Supports different worksheet types, custom configurations, and both worksheet
 * and correction modes.
 *
 * This module provides:
 * - WorksheetGenerator class (recommended)
 * - Legacy generateWorksheetTypst function (backward compatible)
 * - Batch generation for multiple students
 *
 * @module typst/generators/worksheet-generator
 *
 * @example Using the class
 * ```typescript
 * const generator = new WorksheetGenerator(config);
 * const result = generator.generate({ worksheet, instance });
 * console.log(result.typstContent);
 * ```
 *
 * @example Using the legacy function
 * ```typescript
 * const typst = generateWorksheetTypst({
 *   worksheet,
 *   instance,
 *   config,
 *   mode: 'worksheet'
 * });
 * ```
 */

import type {
	WorksheetRow,
	WorksheetConfig,
	InstanceData,
	ResolvedExercise,
	WorksheetType,
	WorksheetTemplateRow
} from '$lib/types/worksheets';
import type { GeneratorConfig, GeneratorContext, GenerateResult } from '../types';
import { BaseTypstGenerator } from './base-generator';
import { generateTypst, escapeTypst, parseMarkdown } from '$lib/ubumark';
import { getDefaultTemplate, renderTemplate } from '../templates';
import { getTypeLabel, formatNumber } from '../utils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input for WorksheetGenerator.generate()
 */
export interface WorksheetGeneratorInput {
	/** Worksheet row from database */
	worksheet: WorksheetRow;
	/** Instance data with resolved exercises */
	instance: InstanceData;
	/** Optional template to use for rendering */
	template?: WorksheetTemplateRow | null;
}

/**
 * Parameters for the legacy generateWorksheetTypst function
 */
export interface GenerateTypstParams {
	worksheet: WorksheetRow;
	instance: InstanceData;
	config: WorksheetConfig;
	mode: 'worksheet' | 'correction';
	studentName?: string;
	className?: string;
	template?: WorksheetTemplateRow | null;
}

// ============================================================================
// WORKSHEET GENERATOR CLASS
// ============================================================================

/**
 * Worksheet-specific Typst generator
 *
 * Generates PDF-ready Typst documents for worksheets, assessments,
 * exams, quizzes, and homework assignments.
 */
export class WorksheetGenerator extends BaseTypstGenerator<WorksheetGeneratorInput> {
	/** Worksheet-specific configuration */
	private worksheetConfig: WorksheetConfig;

	/**
	 * Create a new worksheet generator
	 *
	 * @param worksheetConfig - Worksheet-specific configuration
	 * @param generatorConfig - Optional page layout configuration
	 * @param context - Optional generation context (mode, student info)
	 */
	constructor(
		worksheetConfig: WorksheetConfig,
		generatorConfig?: Partial<GeneratorConfig>,
		context?: Partial<GeneratorContext>
	) {
		super(generatorConfig, context);
		this.worksheetConfig = worksheetConfig;
	}

	/**
	 * Generate Typst document from worksheet input
	 *
	 * @param input - Worksheet, instance, and optional template
	 * @returns Generation result with Typst content and metadata
	 */
	generate(input: WorksheetGeneratorInput): GenerateResult {
		const { worksheet, template } = input;

		// Try template first
		const templateContent = this.getTemplateContent(worksheet.template_id, template);

		let typstContent: string;
		if (templateContent) {
			typstContent = this.generateFromTemplate(input, templateContent);
		} else {
			typstContent = this.generateDefault(input);
		}

		return {
			typstContent,
			metadata: {
				generator: 'ubumaths-worksheet-generator',
				generatedAt: new Date()
			}
		};
	}

	/**
	 * Get template content from either the passed template or default templates
	 */
	private getTemplateContent(
		templateId: string | null | undefined,
		template?: WorksheetTemplateRow | null
	): string | null {
		// If a template object is passed, use its content
		if (template?.template_content) {
			return template.template_content;
		}

		// If we have a template_id, try to get from default templates
		if (templateId) {
			const defaultTemplate = getDefaultTemplate(templateId);
			if (defaultTemplate) {
				return defaultTemplate.template_content;
			}
		}

		return null;
	}

	/**
	 * Generate Typst document from template
	 */
	private generateFromTemplate(input: WorksheetGeneratorInput, templateContent: string): string {
		const { worksheet, instance } = input;
		const mode = this.context.mode as 'worksheet' | 'correction';

		// Generate exercises content for the template
		const exercisesTypst = this.generateExercisesOnly(instance, mode, worksheet.type);

		// Prepare template data
		const templateData: Record<string, string> = {
			title: escapeTypst(worksheet.title),
			date: new Date().toLocaleDateString('fr-FR', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			}),
			class: this.context.className ? escapeTypst(this.context.className) : '',
			student_name: this.context.studentName ? escapeTypst(this.context.studentName) : '',
			total_points: worksheet.total_points?.toString() || '',
			duration: worksheet.estimated_duration_minutes?.toString() || '',
			instructions: '', // Could be added to config later
			school_name: '', // Could be added to config later
			teacher_name: '', // Could be added to config later
			exercises: exercisesTypst,
			// Additional placeholders for specific templates
			due_date: '',
			exam_session: '',
			subject: 'Mathematiques',
			coefficient: '',
			competences: ''
		};

		// Add correction banner if in correction mode
		let result = '';
		if (mode === 'correction') {
			result += `#block(width: 100%, fill: rgb("#228b22"), inset: 10pt)[
  #align(center)[
    #text(size: 1.4em, weight: "bold", fill: white)[CORRECTION]
  ]
]

#v(0.5em)

`;
		}

		// Render template with data
		result += renderTemplate(templateContent, templateData);

		return result;
	}

	/**
	 * Generate default document without template
	 */
	private generateDefault(input: WorksheetGeneratorInput): string {
		const { worksheet, instance } = input;
		const mode = this.context.mode as 'worksheet' | 'correction';

		const setup = this.generateWorksheetSetup(worksheet.type);
		const header = this.generateHeader(worksheet, mode);
		const exercises = this.generateExercises(instance, mode, worksheet.type);
		const footer = this.generateFooter(worksheet, mode);

		return [setup, header, exercises, footer].filter(Boolean).join('\n\n');
	}

	/**
	 * Generate Typst document setup with page configuration and styles
	 */
	private generateWorksheetSetup(type: WorksheetType): string {
		const pageLayout = this.worksheetConfig.page_layout || 'A4';
		const fontSize = this.worksheetConfig.font_size || 12;
		const margins = this.worksheetConfig.margins || { top: 20, bottom: 20, left: 15, right: 15 };

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

	/**
	 * Generate worksheet header with title, metadata, and student info
	 */
	private generateHeader(worksheet: WorksheetRow, mode: 'worksheet' | 'correction'): string {
		const config = this.worksheetConfig;
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
				const name = this.context.studentName || '.'.repeat(40);
				header += `    align(left)[*Nom :* ${escapeTypst(name)}],\n`;
			} else {
				header += '    [],\n';
			}

			// Right side: Class and date
			const rightItems: string[] = [];
			if (config.show_class) {
				const cls = this.context.className || '.'.repeat(20);
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
			metadata.push(`*Duree :* ${worksheet.estimated_duration_minutes} minutes`);
		}
		if (config.show_points && worksheet.total_points) {
			metadata.push(`*Bareme :* ${worksheet.total_points} points`);
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
			header += '      [Lisez attentivement chaque enonce avant de repondre.],\n';
			header += '      [Ecrivez lisiblement et justifiez vos reponses.],\n';
			header +=
				'      [La calculatrice est ' +
				(worksheet.type === 'exam' ? 'interdite' : 'autorisee') +
				'.],\n';
			header += '      [Gerez bien votre temps.]\n';
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

	/**
	 * Generate all exercises with proper numbering and formatting
	 */
	private generateExercises(
		instance: InstanceData,
		mode: 'worksheet' | 'correction',
		worksheetType: WorksheetType
	): string {
		const exercises = instance.exercises;
		const numberingStyle = this.worksheetConfig.numbering_style || 'numeric';

		// Apply exercise order if shuffled
		const orderedExercises = instance.exercise_order
			? instance.exercise_order.map((idx) => exercises[idx])
			: exercises;

		let content = '';

		orderedExercises.forEach((exercise, index) => {
			const number = formatNumber(index + 1, numberingStyle);
			content += this.generateSingleExercise(exercise, number, mode, worksheetType);
			content += '\n\n';
		});

		return content;
	}

	/**
	 * Generate a single exercise with statement and optionally solution
	 */
	private generateSingleExercise(
		exercise: ResolvedExercise,
		number: string,
		mode: 'worksheet' | 'correction',
		worksheetType: WorksheetType
	): string {
		const config = this.worksheetConfig;
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
		const statementTypst = generateTypst(statementAst, {
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
			const solutionTypst = generateTypst(solutionAst, {
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
	 * Generate only the exercises content (for use in templates)
	 */
	private generateExercisesOnly(
		instance: InstanceData,
		mode: 'worksheet' | 'correction',
		worksheetType: WorksheetType
	): string {
		const exercises = instance.exercises;
		const numberingStyle = this.worksheetConfig.numbering_style || 'numeric';

		// Apply exercise order if shuffled
		const orderedExercises = instance.exercise_order
			? instance.exercise_order.map((idx) => exercises[idx])
			: exercises;

		let content = '';

		orderedExercises.forEach((exercise, index) => {
			const number = formatNumber(index + 1, numberingStyle);
			content += this.generateSingleExerciseSimple(exercise, number, mode, worksheetType);
			content += '\n\n';
		});

		return content;
	}

	/**
	 * Generate a single exercise (simplified version for templates)
	 */
	private generateSingleExerciseSimple(
		exercise: ResolvedExercise,
		number: string,
		mode: 'worksheet' | 'correction',
		worksheetType: WorksheetType
	): string {
		const config = this.worksheetConfig;
		let content = '';

		// Exercise header
		content += `#block(width: 100%, inset: 0pt)[
  #text(size: 1.1em, weight: "bold")[Exercice ${number}]`;

		if (config.show_points && exercise.position) {
			content += ` #h(1fr) #box(fill: rgb("#dcdcdc"), inset: (x: 6pt, y: 3pt), radius: 3pt)[${exercise.position} pts]`;
		}

		content += '\n  #v(0.3em)\n  \n';

		// Exercise statement
		const statementAst = parseMarkdown(exercise.statement);
		const statementTypst = generateTypst(statementAst, {
			includeSetup: false,
			language: 'fr'
		});

		// Indent the statement content
		const indentedStatement = statementTypst
			.split('\n')
			.map((line) => '  ' + line)
			.join('\n');

		content += indentedStatement + '\n';

		// Add answer space for exams
		if (mode === 'worksheet' && (worksheetType === 'exam' || worksheetType === 'assessment')) {
			content += `  #v(0.5em)
  #rect(width: 100%, height: 5cm, stroke: (paint: rgb("#c8c8c8"), thickness: 0.5pt, dash: "dashed"), fill: none)`;
		}

		content += '\n]\n';

		// Solution (in correction mode)
		if (mode === 'correction' && exercise.solution) {
			content += `
#block(width: 100%, fill: rgb("#f0f0f0"), inset: 10pt, radius: 4pt)[
  #text(weight: "bold", fill: rgb("#006400"))[Solution :]
  #v(0.3em)
`;

			const solutionAst = parseMarkdown(exercise.solution);
			const solutionTypst = generateTypst(solutionAst, {
				includeSetup: false,
				language: 'fr'
			});

			const indentedSolution = solutionTypst
				.split('\n')
				.map((line) => '  ' + line)
				.join('\n');

			content += indentedSolution + '\n]\n';
		}

		return content;
	}

	/**
	 * Generate document footer
	 */
	private generateFooter(worksheet: WorksheetRow, mode: 'worksheet' | 'correction'): string {
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
			footer += `    Document genere le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}\n`;
			footer += '  ]\n';
			footer += ']\n';
		}

		return footer;
	}
}

// ============================================================================
// LEGACY FUNCTIONS (for backward compatibility)
// ============================================================================

/**
 * Generate a complete Typst document for a worksheet instance
 *
 * @deprecated Use WorksheetGenerator class instead
 *
 * @param params - Generation parameters
 * @returns Complete Typst document as string
 */
export function generateWorksheetTypst(params: GenerateTypstParams): string {
	const { worksheet, instance, config, mode, studentName, className, template } = params;

	const generator = new WorksheetGenerator(config, undefined, {
		mode,
		studentName,
		className
	});

	const result = generator.generate({
		worksheet,
		instance,
		template
	});

	return result.typstContent;
}

/**
 * Generate Typst document for a batch of instances
 * Each instance generates a new page
 *
 * @deprecated Use WorksheetGenerator class with batch processing instead
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
