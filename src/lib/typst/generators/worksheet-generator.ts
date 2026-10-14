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
	WorksheetTemplateRow
} from '$lib/types/worksheets';
import type { GeneratorConfig, GeneratorContext, GenerateResult } from '../types';
import { BaseTypstGenerator } from './base-generator';
import { escapeTypst } from '$lib/ubumark';
import { renderTemplate } from '../templates';
import {
	resolveTemplate,
	styleIdOf,
	type ResolvedTemplate,
	type TemplateForm
} from '../templates/styles';
import { documentLabels, labelPlaceholders, type DocumentLabels } from '../labels';
import { DATE_LOCALES, TYPST_LANGS, type ContentLocale } from '$lib/types/locale';
import { localizedText, worksheetLocale } from '$lib/types/worksheets';
import { CORRECTION_FONT_RULES, withCorrectionFonts } from '../correction-fonts';
import { documentFromTeacherCopy } from '$lib/worksheets/document/teacher-adapter';
import {
	renderDocumentPreamble,
	renderExercises,
	type ExerciseLayout
} from '$lib/worksheets/document/render-exercise';
import { MATH_LIMITS_SETUP } from '$lib/worksheets/document/math-limits';
import type { DocumentForm, WorksheetDocument } from '$lib/worksheets/document/types';

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
	/**
	 * Le document déjà construit (vue de l'élève, corrections filtrées par le
	 * serveur, lot 4b) ; absent : construit depuis la copie du prof (`instance`).
	 */
	document?: WorksheetDocument;
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
	/**
	 * Corrigé de classe d'une affectation dont chaque élève a sa version
	 * (valeurs ou ordre) : avertissement imprimé en tête, dans la langue de la
	 * fiche (D6). Sans effet sur la fiche (énoncés).
	 */
	individualCopyNotice?: boolean;
	/**
	 * Fiche suivie de ses corrections (forme « fiche + corrections ») : les
	 * réponses ou le corrigé, sur une nouvelle page après les énoncés. Sans
	 * effet hors de la fiche.
	 */
	withCorrections?: 'answers' | 'correction';
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
	/** Voir `WorksheetGeneratorOptions.individualCopyNotice` */
	individualCopyNotice?: boolean;
	/** Voir `WorksheetGeneratorOptions.withCorrections` */
	withCorrections?: 'answers' | 'correction';
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

	/** La forme du document, donc son gabarit (ADR 0028 : une forme = un gabarit) */
	private get form(): TemplateForm {
		const mode = this.pdfMode;
		return mode === 'worksheet' && this.options.withCorrections
			? 'worksheet_with_corrections'
			: mode;
	}

	/**
	 * Avertissement du corrigé de classe d'une affectation individualisée
	 * (D6) : ce corrigé est la copie d'un élève. Vide sinon, et sur la fiche.
	 */
	private individualCopyNotice(mode: WorksheetPdfMode): string {
		if (mode === 'worksheet' || !this.options.individualCopyNotice) return '';
		return escapeTypst(this.labels.individualCopyNotice);
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

		// Le gabarit de la forme demandée, dans le style retenu pour la fiche
		// (`style_id`, sinon `template_id`) ; le gabarit lu en base ne sert qu'à la
		// fiche d'un style du prof.
		const resolved = resolveTemplate(styleIdOf(worksheet), this.form, template?.template_content);
		let typstContent = this.generateFromTemplate(input, resolved);

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
	 * Remplit le gabarit de la forme : exercices, en-tête, bandeau du corrigé
	 */
	private generateFromTemplate(input: WorksheetGeneratorInput, resolved: ResolvedTemplate): string {
		const { worksheet } = input;
		const templateContent = resolved.content;
		const mode = this.pdfMode;
		const ending = mode === 'worksheet' ? this.options.withCorrections : undefined;

		// Les exercices du gabarit. Un gabarit qui place {{exercises_badge}} reçoit
		// les numéros sur carré ambre ; sinon ({{exercises}}) l'en-tête « Exercice N ».
		// Les deux clés reçoivent le même contenu : seul compte le placeholder utilisé.
		const layout: ExerciseLayout = templateContent.includes('{{exercises_badge}}')
			? 'badge'
			: 'heading';
		// Ce que seul l'élève reçoit (consignes, ★, copie individuelle) : en tête
		// des énoncés, dans tous les styles ; vide pour la copie du prof
		const exercisesTypst =
			(mode === 'worksheet'
				? renderDocumentPreamble(this.document(input), {
						individualCopyNotice: this.options.individualCopyNotice,
						instructionsInTemplate: templateContent.includes('{{instructions}}')
					})
				: '') + this.generateExercises(input, mode, layout, resolved.showsPoints);
		// Fiche + corrections : les réponses ou le corrigé, après les énoncés
		const corrections = ending
			? this.generateExercises(input, ending, layout, resolved.showsPoints)
			: '';
		// Le bandeau du corrigé (« CORRIGÉ », « RÉPONSES »)
		const titled = ending ?? mode;

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
			// Les consignes de l'affectation (vue de l'élève) ; la copie du prof n'en a pas
			instructions: escapeTypst(this.document(input).assignment?.instructions ?? ''),
			school_name: '', // Could be added to config later
			teacher_name: '', // Could be added to config later
			exercises: exercisesTypst,
			exercises_badge: exercisesTypst,
			// Gabarits des corrigés et de la fiche + corrections
			form_title: titled === 'worksheet' ? '' : this.correctionTitle(titled).toUpperCase(),
			individual_copy_notice: this.individualCopyNotice(mode),
			corrections,
			// Polices du corrigé sur la partie corrigé seulement : les énoncés gardent la leur
			correction_fonts:
				ending === 'correction' && this.options.correctionFonts !== false
					? CORRECTION_FONT_RULES
					: '',
			// Additional placeholders for specific templates
			due_date: '',
			exam_session: '',
			subject: this.labels.subject,
			coefficient: '',
			competences: ''
		};

		// Opérateurs à limites (∑, lim) : règles de mathématiques, pas de mise en
		// page, donc valables quel que soit le gabarit, même celui du prof
		return `${MATH_LIMITS_SETUP}\n${renderTemplate(templateContent, templateData)}`;
	}

	/** Le document de la fiche : celui fourni (élève), sinon la copie du prof */
	private document(input: WorksheetGeneratorInput): WorksheetDocument {
		return (
			input.document ??
			documentFromTeacherCopy({
				worksheet: input.worksheet,
				instance: input.instance,
				config: this.worksheetConfig
			})
		);
	}

	/**
	 * Les exercices du document, rendus par le module commun aux PDF du prof et
	 * de l'élève (ADR 0028) : numérotation, sections, titres, corrigés.
	 */
	private generateExercises(
		input: WorksheetGeneratorInput,
		mode: WorksheetPdfMode,
		layout: ExerciseLayout,
		styleShowsPoints: boolean
	): string {
		const copyDoc = this.document(input);
		const doc = {
			...copyDoc,
			display: {
				...copyDoc.display,
				// Le style décide d'abord : « Fiche élève » n'imprime aucun point
				showPoints: styleShowsPoints && copyDoc.display.showPoints,
				// Copie d'un élève servant de corrigé de classe (D6) : le titre seul
				...(this.options.individualCopyNotice ? { titleOnly: true } : {})
			}
		};
		return renderExercises(doc, mode, layout);
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
		{
			correctionFonts: params.correctionFonts,
			individualCopyNotice: params.individualCopyNotice,
			withCorrections: params.withCorrections
		}
	);

	const result = generator.generate({
		worksheet,
		instance,
		template
	});

	return result.typstContent;
}
