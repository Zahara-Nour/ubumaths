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
	printedStyleId,
	resolveTemplate,
	styleIdOf,
	type ResolvedTemplate,
	type TemplateForm
} from '../templates/styles';
import { documentLabels, labelPlaceholders, type DocumentLabels } from '../labels';
import { DATE_LOCALES, TYPST_LANGS, type ContentLocale } from '$lib/types/locale';
import { localizedText, worksheetLocale } from '$lib/types/worksheets';
import { withTextSize, type TextSize } from '../text-size';
import { documentFromTeacherCopy } from '$lib/worksheets/document/teacher-adapter';
import {
	renderDocumentPreamble,
	renderExercises,
	type ExerciseLayout
} from '$lib/worksheets/document/render-exercise';
import { MATH_LIMITS_SETUP } from '$lib/worksheets/document/math-limits';
import { TITLE_ONLY_HEADER, worksheetHeader } from '$lib/worksheets/worksheet-header';
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
 * - `correction` : le corrigé, toujours détaillé (ADR 0030), sans l'énoncé,
 *   chaque correction en Shantell Sans et Chiphre Math (`correction-fonts.ts`),
 *   titres et bandeau dans la police du document.
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
	/**
	 * « Fiche + corrigé » du prof : sur la fiche, la correction de chaque
	 * exercice juste sous son énoncé, « — Correction » après le titre (demande de
	 * David, 2026-10-14). Sans effet hors de la fiche.
	 */
	inlineCorrections?: boolean;
	/**
	 * Taille du texte (accessibilité, `text-size.ts`) : le gabarit grandit et
	 * passe sur une colonne au-delà de la taille normale. Normale par défaut.
	 */
	textSize?: TextSize;
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
	/** Voir `WorksheetGeneratorOptions.inlineCorrections` */
	inlineCorrections?: boolean;
	/** Voir `WorksheetGeneratorOptions.textSize` */
	textSize?: TextSize;
}

// ============================================================================
// WORKSHEET GENERATOR CLASS
// ============================================================================

/**
 * Worksheet-specific Typst generator
 *
 * Generates PDF-ready Typst documents for the four worksheet types: the type
 * decides the header (ADR 0030, `worksheetHeader`).
 */
/**
 * Un texte venu de la base, imprimé tel quel dans le balisage d'un gabarit : une
 * chaîne Typst littérale (`#"…";`, le `;` clôt l'expression). Seuls `\` et `"`
 * s'y échappent ; caractères de contrôle et retours à la ligne deviennent des
 * espaces. `[`, `]`, `//`, `<…>` n'y ont aucun sens : rien n'est évalué.
 */
export function typstTextLiteral(value: string): string {
	const clean = value
		// eslint-disable-next-line no-control-regex -- retirer les caractères de contrôle
		.replace(/[\u0000-\u001f\u007f]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return `#"${clean.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}";`;
}

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

	/** Date de rendu (`AAAA-MM-JJ`) telle qu'imprimée, dans la langue du document */
	private formattedDueDate(isoDate: string): string {
		return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(DATE_LOCALES[this.locale], {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
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
		// (`style_id`) ; le gabarit lu en base ne sert qu'à la fiche d'un style du
		// prof.
		const custom = template?.template_content;
		// « Fiche élève » en grande taille du texte : en paysage, sauf les Réponses
		const styleId = printedStyleId(
			styleIdOf(worksheet),
			this.form,
			this.options.textSize ?? 'normal',
			custom
		);
		const resolved = resolveTemplate(styleId, this.form, custom);
		// Corrigé : Shantell Sans et Chiphre Math sur chaque correction seulement,
		// posées par le rendu des exercices (`render-exercise.ts`)
		const typstContent = this.generateFromTemplate(input, resolved);

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
		// À la taille du texte voulue, avant d'y placer les exercices (qui n'ont
		// aucune taille fixe : ils suivent celle du texte)
		const templateContent = withTextSize(resolved.content, this.options.textSize ?? 'normal');
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
				: '') + this.generateExercises(input, mode, layout);
		// Fiche + corrections : les réponses ou le corrigé, après les énoncés
		const corrections = ending ? this.generateExercises(input, ending, layout) : '';
		// Le bandeau du corrigé (« CORRIGÉ », « RÉPONSES »)
		const titled = ending ?? mode;

		// Le type décide de l'en-tête (ADR 0030) ; les gabarits lisent la règle
		// par des conditions {{#if show_x}}, qui retirent l'étiquette avec la valeur.
		// Réponses et Corrigé : le titre seul (la fiche + corrections garde l'en-tête du sujet)
		const header =
			mode === 'worksheet'
				? worksheetHeader(worksheet.type, this.worksheetConfig)
				: TITLE_ONLY_HEADER;
		const flag = (value: boolean) => (value ? 'true' : '');
		const dueDate = this.worksheetConfig.due_date;
		const duration = worksheet.estimated_duration_minutes?.toString() ?? '';
		const totalPoints = this.totalPoints(input);
		const calculator =
			header.calculator === 'allowed'
				? this.labels.calculatorAllowed
				: header.calculator === 'forbidden'
					? this.labels.calculatorForbidden
					: '';
		const showDuration = header.duration && duration !== '';
		const showTotal = header.points && totalPoints !== '';

		// Prepare template data
		const templateData: Record<string, string> = {
			// Chrome vocabulary: one template body serves both languages, so a label
			// cannot drift between them.
			...labelPlaceholders(this.locale),
			// Drives hyphenation and smart quotes, not just wording.
			lang: TYPST_LANGS[this.locale],
			// Le titre s'imprime toujours ; le reste selon le type
			show_title: 'true',
			show_student_name: flag(header.studentName),
			show_class: flag(header.className),
			show_date: flag(header.dateLine),
			show_due_date: flag(header.dueDate),
			// Le bloc nom / classe / date : seulement s'il a du contenu
			show_identity: flag(
				header.studentName || header.className || header.dateLine || header.dueDate
			),
			show_points: flag(header.points),
			show_total: flag(showTotal),
			show_calculator: flag(calculator !== ''),
			show_duration: flag(showDuration),
			// La ligne d'informations (durée, calculatrice, total) : seulement si elle a du contenu
			show_header_notes: flag(showDuration || calculator !== '' || showTotal),
			title: escapeTypst(
				mode === 'worksheet' && this.options.inlineCorrections
					? `${this.title(worksheet)} — ${this.labels.correction}`
					: this.title(worksheet)
			),
			// Lignes à remplir par l'élève, sauf ce que le PDF connaît déjà
			date: fillLine('3cm'),
			// Nom et classe : du texte venu de la base (le nom, l'élève l'écrit lui-même),
			// inséré en chaîne Typst littérale — jamais évalué comme du code
			class: this.context.className ? typstTextLiteral(this.context.className) : fillLine('2.5cm'),
			student_name: this.context.studentName
				? typstTextLiteral(this.context.studentName)
				: fillLine('4cm'),
			total_points: totalPoints,
			duration,
			calculator: escapeTypst(calculator),
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
			// Les polices du corrigé sont posées sur chaque correction (`render-exercise.ts`) ;
			// la clé reste, vide, pour un gabarit enregistré qui la porterait encore
			correction_fonts: '',
			// Additional placeholders for specific templates
			due_date: dueDate ? this.formattedDueDate(dueDate) : fillLine('3cm'),
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
	 * Le total imprimé : celui de la fiche s'il est fixé, sinon la somme des
	 * points des exercices ; vide sans aucun point.
	 */
	private totalPoints(input: WorksheetGeneratorInput): string {
		if (input.worksheet.total_points) return input.worksheet.total_points.toString();
		const sum = this.document(input).exercises.reduce(
			(total, exercise) => total + (exercise.points ?? 0),
			0
		);
		return sum > 0 ? sum.toString() : '';
	}

	/**
	 * Les exercices du document, rendus par le module commun aux PDF du prof et
	 * de l'élève (ADR 0028) : numérotation, sections, titres, corrigés. Les
	 * points suivent le type de la fiche, quel que soit le style (ADR 0030).
	 */
	private generateExercises(
		input: WorksheetGeneratorInput,
		mode: WorksheetPdfMode,
		layout: ExerciseLayout
	): string {
		const copyDoc = this.document(input);
		// Copie d'un élève servant de corrigé de classe (D6) : le titre seul
		const doc = this.options.individualCopyNotice
			? { ...copyDoc, display: { ...copyDoc.display, titleOnly: true } }
			: copyDoc;
		return renderExercises(doc, mode, layout, {
			inlineCorrections: mode === 'worksheet' && this.options.inlineCorrections,
			correctionFonts: this.options.correctionFonts
		});
	}
}

/**
 * Ligne à remplir à la main (nom, classe, date) : un trait de la couleur du
 * texte, posé sur la ligne de base.
 */
function fillLine(width: string): string {
	return `#context box(width: ${width}, height: 0.9em, stroke: (bottom: 0.5pt + text.fill))`;
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
			withCorrections: params.withCorrections,
			inlineCorrections: params.inlineCorrections,
			textSize: params.textSize
		}
	);

	const result = generator.generate({
		worksheet,
		instance,
		template
	});

	return result.typstContent;
}
