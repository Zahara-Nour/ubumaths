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
	WorksheetType,
	WorksheetTemplateRow
} from '$lib/types/worksheets';
import type { GeneratorConfig, GeneratorContext, GenerateResult } from '../types';
import { BaseTypstGenerator } from './base-generator';
import { escapeTypst } from '$lib/ubumark';
import { getDefaultTemplate, renderTemplate } from '../templates';
import { documentLabels, labelPlaceholders, type DocumentLabels } from '../labels';
import { DATE_LOCALES, TYPST_LANGS, type ContentLocale } from '$lib/types/locale';
import { localizedText, worksheetLocale } from '$lib/types/worksheets';
import { endOfTypstCall, withCorrectionFonts } from '../correction-fonts';
import { documentFromTeacherCopy } from '$lib/worksheets/document/teacher-adapter';
import { renderExercises, type ExerciseLayout } from '$lib/worksheets/document/render-exercise';
import { MATH_LIMITS_SETUP } from '$lib/worksheets/document/math-limits';
import type { DocumentForm } from '$lib/worksheets/document/types';

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
 * Les trois PDF d'une fiche :
 * - `worksheet` : la fiche, énoncés seuls ;
 * - `answers` : les résultats seuls (`answers`), sans l'énoncé ;
 * - `correction` : le corrigé (concis ou détaillé selon la fiche), sans
 *   l'énoncé, en Shantell Sans et Chiphre Math (`correction-fonts.ts`).
 */
export type WorksheetPdfMode = DocumentForm;

/** Réglages du générateur propres aux fiches */
export interface WorksheetGeneratorOptions {
	/**
	 * Polices du Corrigé (Shantell Sans, Chiphre Math). Vrai par défaut ;
	 * faux : le même corrigé dans la police standard (repli quand la
	 * compilation avec ces polices échoue). Sans effet hors Corrigé.
	 */
	correctionFonts?: boolean;
}

/**
 * Parameters for the legacy generateWorksheetTypst function
 */
export interface GenerateTypstParams {
	worksheet: WorksheetRow;
	instance: InstanceData;
	config: WorksheetConfig;
	mode: WorksheetPdfMode;
	studentName?: string;
	className?: string;
	template?: WorksheetTemplateRow | null;
	/** Voir `WorksheetGeneratorOptions.correctionFonts` */
	correctionFonts?: boolean;
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

	/** Réglages propres aux fiches (polices du Corrigé) */
	private options: WorksheetGeneratorOptions;

	/** Le PDF demandé ; l'aperçu (`preview`) est une fiche */
	private get pdfMode(): WorksheetPdfMode {
		const mode = this.context.mode;
		return mode === 'answers' || mode === 'correction' ? mode : 'worksheet';
	}

	/** Bandeau et pied de page d'un corrigé : « Correction » ou « Réponses » */
	private correctionTitle(mode: WorksheetPdfMode): string {
		return mode === 'answers' ? this.labels.answers : this.labels.correction;
	}

	/**
	 * Language of the whole document: exercise content and chrome alike.
	 *
	 * Read from the worksheet config, so a worksheet cannot end up with English
	 * exercises under French labels. An unknown value falls back to French: a
	 * corrupted config must still generate.
	 */
	private get locale(): ContentLocale {
		return worksheetLocale(this.worksheetConfig);
	}

	/** Words written around the teacher's content, in the document language. */
	private get labels(): DocumentLabels {
		return documentLabels(this.locale);
	}

	/**
	 * Worksheet title in the document language.
	 *
	 * The title lives in a column rather than in the variations JSONB, so its
	 * translation travels in `worksheet.translations` — same contract: French in
	 * the column, translation optional, fallback to French.
	 */
	private title(worksheet: WorksheetRow): string {
		return localizedText(worksheet.title, worksheet.translations, 'title', this.locale) ?? '';
	}

	/** Document type name ("Feuille d'exercices", "Worksheet", ...). */
	private typeLabel(type: string): string {
		const labels = this.labels;
		const byType: Record<string, string> = {
			worksheet: labels.typeWorksheet,
			assessment: labels.typeAssessment,
			exam: labels.typeExam,
			quiz: labels.typeQuiz,
			homework: labels.typeHomework
		};
		return byType[type] ?? labels.typeWorksheet;
	}

	/** Date as printed on the document, in the document language. */
	private formattedDate(): string {
		return new Date().toLocaleDateString(DATE_LOCALES[this.locale], {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	/**
	 * Create a new worksheet generator
	 *
	 * @param worksheetConfig - Worksheet-specific configuration
	 * @param generatorConfig - Optional page layout configuration
	 * @param context - Optional generation context (mode, student info)
	 * @param options - Réglages propres aux fiches (polices du Corrigé)
	 */
	constructor(
		worksheetConfig: WorksheetConfig,
		generatorConfig?: Partial<GeneratorConfig>,
		context?: Partial<GeneratorContext>,
		options: WorksheetGeneratorOptions = {}
	) {
		super(generatorConfig, context);
		this.worksheetConfig = worksheetConfig;
		this.options = options;
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

		// Corrigé : Shantell Sans et Chiphre Math, posées après la police du document
		if (this.pdfMode === 'correction' && this.options.correctionFonts !== false) {
			typstContent = withCorrectionFonts(typstContent);
		}

		return {
			typstContent,
			metadata: {
				generator: 'chiphre-worksheet-generator',
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
		const { worksheet } = input;
		const mode = this.pdfMode;

		// Generate exercises content for the template. A template opts into the
		// red-badge numbering by using {{exercises_badge}} instead of {{exercises}};
		// both keys receive the same content so only the placeholder used matters.
		const layout: ExerciseLayout = templateContent.includes('{{exercises_badge}}')
			? 'badge'
			: 'heading';
		const exercisesTypst = this.generateExercises(input, mode, layout);

		// Display options are opt-out: an absent flag means "show". They are
		// exposed as {{#if show_x}} conditionals so templates can drop the label
		// along with the value.
		const config = this.worksheetConfig;
		const flag = (value: boolean | undefined) => (value === false ? '' : 'true');

		// Prepare template data
		const templateData: Record<string, string> = {
			// Chrome vocabulary: one template body serves both languages, so a label
			// cannot drift between them.
			...labelPlaceholders(this.locale),
			// Drives hyphenation and smart quotes, not just wording.
			lang: TYPST_LANGS[this.locale],
			show_title: flag(config.show_title),
			show_date: flag(config.show_date),
			show_class: flag(config.show_class),
			show_student_name: flag(config.show_student_name),
			show_points: flag(config.show_points),
			title: escapeTypst(this.title(worksheet)),
			date: this.formattedDate(),
			class: this.context.className ? escapeTypst(this.context.className) : '',
			student_name: this.context.studentName ? escapeTypst(this.context.studentName) : '',
			total_points: worksheet.total_points?.toString() || '',
			duration: worksheet.estimated_duration_minutes?.toString() || '',
			instructions: '', // Could be added to config later
			school_name: '', // Could be added to config later
			teacher_name: '', // Could be added to config later
			exercises: exercisesTypst,
			exercises_badge: exercisesTypst,
			// Additional placeholders for specific templates
			due_date: '',
			exam_session: '',
			subject: this.labels.subject,
			coefficient: '',
			competences: ''
		};

		const rendered = renderTemplate(templateContent, templateData);
		if (mode === 'worksheet') return rendered;

		// Bandeau flottant pleine largeur (`scope: "parent"` : au-dessus des deux
		// colonnes d'une fiche qui en a deux), en tête de la première page.
		const banner = `
#place(top + center, scope: "parent", float: true, clearance: 0.8em)[
  #block(width: 100%, fill: rgb("#228b22"), inset: 10pt)[
    #align(center)[
      #text(size: 1.4em, weight: "bold", fill: white)[${this.correctionTitle(mode).toUpperCase()}]
    ]
  ]
]
`;
		// Le bandeau doit suivre le `#set page(…)` du modèle : un `set page` qui
		// vient APRÈS du contenu ouvre une nouvelle page, et le bandeau restait
		// seul sur une page 1 vide. Il suit aussi son `#set text(…)` : le Corrigé
		// y pose ses polices, que le bandeau doit prendre.
		const insertAt = maxOrNull(endOfLastPageSetup(rendered), endOfLastTextSetup(rendered));
		return insertAt === null
			? banner + '\n' + rendered
			: rendered.slice(0, insertAt) + '\n' + banner + rendered.slice(insertAt);
	}

	/**
	 * Generate default document without template
	 */
	private generateDefault(input: WorksheetGeneratorInput): string {
		const { worksheet } = input;
		const mode = this.pdfMode;

		const setup = this.generateWorksheetSetup(worksheet.type);
		const header = this.generateHeader(worksheet, mode);
		const exercises = this.generateExercises(input, mode, 'classic');
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
  lang: "${TYPST_LANGS[this.locale]}",${this.locale === 'fr' ? '\n  region: "FR"' : ''}
)

#set par(justify: true, leading: 0.65em)
#set heading(numbering: none)

${MATH_LIMITS_SETUP}
// Custom styles for different elements
#let exercise-box(content) = {
  block(
    width: 100%,
    inset: 0pt,
    content
  )
}

// Sticky: a column or page break can never leave the header alone at the bottom
#let exercise-header(content) = {
  block(
    width: 100%,
    inset: 0pt,
    sticky: true,
    below: 0.3em,
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
	private generateHeader(worksheet: WorksheetRow, mode: WorksheetPdfMode): string {
		const config = this.worksheetConfig;
		const labels = this.labels;
		let header = '';

		// Bandeau des corrigés (Réponses, Corrigé)
		if (mode !== 'worksheet') {
			header += '#block(width: 100%, fill: rgb(34, 139, 34), inset: 10pt)[\n';
			header += '  #align(center)[\n';
			header += `    #text(size: 1.4em, weight: "bold", fill: white)[${this.correctionTitle(mode).toUpperCase()}]\n`;
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
				header += `    align(left)[*${labels.name} :* ${escapeTypst(name)}],\n`;
			} else {
				header += '    [],\n';
			}

			// Right side: Class and date
			const rightItems: string[] = [];
			if (config.show_class) {
				const cls = this.context.className || '.'.repeat(20);
				rightItems.push(`*${labels.class} :* ${escapeTypst(cls)}`);
			}
			if (config.show_date) {
				rightItems.push(`*${labels.date} :* ${this.formattedDate()}`);
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
			const typeLabel = this.typeLabel(worksheet.type);
			const titleSuffix = mode === 'worksheet' ? '' : ` - ${this.correctionTitle(mode)}`;
			header += `#align(center)[\n`;
			header += `  #text(size: 1.5em, weight: "bold")[${escapeTypst(typeLabel)}${titleSuffix}]\n`;
			header += `  #linebreak()\n`;
			header += `  #text(size: 1.3em)[${escapeTypst(this.title(worksheet))}]\n`;
			header += `]\n\n`;
			header += '#v(0.5em)\n\n';
		}

		// Duration and points
		const metadata: string[] = [];
		if (worksheet.estimated_duration_minutes) {
			metadata.push(
				`*${labels.duration} :* ${worksheet.estimated_duration_minutes} ${labels.minutes}`
			);
		}
		if (config.show_points && worksheet.total_points) {
			metadata.push(`*${labels.marks} :* ${worksheet.total_points} ${labels.points.toLowerCase()}`);
		}

		if (metadata.length > 0) {
			header += `#align(center)[${metadata.join(' #h(2em) ')}]\n\n`;
			header += '#v(0.5em)\n\n';
		}

		// Consignes d'épreuve : sur la fiche seulement (les corrigés n'ont pas d'énoncé)
		if (mode === 'worksheet' && (worksheet.type === 'exam' || worksheet.type === 'assessment')) {
			header += '#block(width: 100%, fill: rgb(250, 250, 250), inset: 10pt, radius: 4pt)[\n';
			header += '  #text(size: 0.9em, style: "italic")[\n';
			header += `    *${labels.instructions} :*\n`;
			header += '    #list(\n';
			header += `      [${labels.readCarefully}],\n`;
			header += `      [${labels.writeLegibly}],\n`;
			header += `      [${
				worksheet.type === 'exam' ? labels.calculatorForbidden : labels.calculatorAllowed
			}],\n`;
			header += `      [${labels.manageTime}]\n`;
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
	 * Les exercices du document, rendus par le module commun aux PDF du prof et
	 * de l'élève (ADR 0028) : numérotation, sections, titres, corrigés.
	 */
	private generateExercises(
		input: WorksheetGeneratorInput,
		mode: WorksheetPdfMode,
		layout: ExerciseLayout
	): string {
		const doc = documentFromTeacherCopy({
			worksheet: input.worksheet,
			instance: input.instance,
			config: this.worksheetConfig
		});
		return renderExercises(doc, mode, layout);
	}

	/**
	 * Generate document footer
	 */
	private generateFooter(worksheet: WorksheetRow, mode: WorksheetPdfMode): string {
		let footer = '';

		// Add page numbering
		footer += '#set page(footer: [\n';
		footer += '  #set align(center)\n';
		footer += '  #set text(size: 0.9em, fill: rgb(100, 100, 100))\n';

		if (mode !== 'worksheet') {
			footer += `  ${this.correctionTitle(mode)} - `;
		}

		footer += `  ${escapeTypst(this.title(worksheet))} - Page #context counter(page).display()\n`;
		footer += '])\n';

		// Add generation info for corrections
		if (mode !== 'worksheet') {
			footer += '\n#v(2em)\n';
			footer += '#line(length: 100%, stroke: 0.5pt)\n';
			footer += '#v(0.5em)\n';
			footer += '#align(center)[\n';
			footer += '  #text(size: 0.8em, style: "italic", fill: rgb(100, 100, 100))[\n';
			const dateLocale = DATE_LOCALES[this.locale];
			const generatedOn = `${new Date().toLocaleDateString(dateLocale)} ${this.labels.at} ${new Date().toLocaleTimeString(dateLocale)}`;
			footer += `    ${this.labels.generatedOn} ${generatedOn}\n`;
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

	const generator = new WorksheetGenerator(
		config,
		undefined,
		{
			mode,
			studentName,
			className
		},
		{ correctionFonts: params.correctionFonts }
	);

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
	mode: WorksheetPdfMode,
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
	const contentMarkers = [
		'#block(width: 100%)',
		'#align(center)',
		'#exercise-header',
		'#exercise-box'
	];
	let contentStart = typst.length;

	for (const marker of contentMarkers) {
		const pos = typst.indexOf(marker);
		if (pos !== -1 && pos < contentStart) {
			contentStart = pos;
		}
	}

	return typst.substring(contentStart);
}

/**
 * Position juste après le dernier appel `#set page(…)` d'un document Typst
 * (parenthèses équilibrées, chaînes ignorées), ou null s'il n'y en a pas.
 */
function endOfLastPageSetup(typst: string): number | null {
	const start = typst.lastIndexOf('#set page(');
	if (start === -1) return null;
	return endOfTypstCall(typst, start);
}

/** Position juste après le dernier `#set text(…)` de premier niveau, ou null */
function endOfLastTextSetup(typst: string): number | null {
	let end: number | null = null;
	for (const match of typst.matchAll(/^#set text\(/gm)) {
		end = endOfTypstCall(typst, match.index) ?? end;
	}
	return end;
}

/** Le plus grand des deux, en ignorant un null */
function maxOrNull(a: number | null, b: number | null): number | null {
	if (a === null) return b;
	if (b === null) return a;
	return Math.max(a, b);
}
