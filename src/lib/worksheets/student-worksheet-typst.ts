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
 * const typstContent = generateStudentWorksheetTypst(worksheet, 'correction');
 * // Compile with TypstService
 * const service = getTypstService();
 * const result = await service.compile(typstContent, { format: 'pdf' });
 * ```
 */

import type {
	StudentWorksheetView,
	WorksheetConfig,
	WorksheetRow,
	WorksheetTemplateRow
} from '$lib/types/worksheets';
import { WorksheetGenerator } from '$lib/typst/generators/worksheet-generator';
import { documentFromStudentView } from './document/student-adapter';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Ce que le PDF imprime après les exercices :
 * - `none` : rien ;
 * - `answers` : partie « Réponses », les résultats seuls ;
 * - `correction` : partie « Corrections », le corrigé en Shantell Sans et
 *   Chiphre Math (`correction-fonts.ts`).
 * Dans les deux cas, seulement les exercices dont la correction est visible.
 */
export type StudentPdfEnding = 'none' | 'answers' | 'correction';

export interface StudentPdfOptions {
	/** Polices du corrigé ; faux : police standard (repli). Vrai par défaut. */
	correctionFonts?: boolean;
	/**
	 * Aperçu « vue prof » d'une affectation dont chaque élève a sa version
	 * (D6) : ce PDF est la copie d'un élève ; avertissement imprimé en tête.
	 */
	individualCopyNotice?: boolean;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Le PDF de l'élève, par le générateur unique (ADR 0028, lot 4b) : le gabarit
 * du style de la fiche (`style_id`, sinon `template_id`, sinon « Fiche
 * élève » ; la mise en page d'un style du prof arrive dans `template`), rempli
 * avec le document de la vue — corrections déjà filtrées par le serveur, et
 * celles qui ne sont pas visibles jamais imprimées.
 *
 * @param worksheet - Student worksheet view with resolved exercises
 * @param ending - Partie de fin : rien, les réponses ou le corrigé
 * @param options - Polices du corrigé (repli : police standard)
 * @returns Typst document content
 */
export function generateStudentWorksheetTypst(
	worksheet: StudentWorksheetView,
	ending: StudentPdfEnding,
	options: StudentPdfOptions = {}
): string {
	// Le document de la fiche : ordre, numéros et corrections visibles décidés
	// une fois, comme pour le PDF du prof
	const viewDoc = documentFromStudentView(worksheet);
	// Copie d'un élève servant de vue prof (D6) : le titre seul, sans numéro
	const document = options.individualCopyNotice
		? { ...viewDoc, display: { ...viewDoc.display, titleOnly: true } }
		: viewDoc;

	// Les réglages que le gabarit lit : la langue et les options du type, que
	// l'en-tête interprète par la même règle que pour le prof (`worksheetHeader`)
	const config: WorksheetConfig = {
		language: document.locale,
		show_student_name: worksheet.show_student_name,
		show_points: worksheet.show_points,
		calculator: worksheet.calculator,
		answers_on_sheet: worksheet.answers_on_sheet,
		due_date: worksheet.due_date
	};
	// La fiche telle que le gabarit la nomme : titre déjà traduit par le serveur
	const row = {
		id: worksheet.worksheet_id,
		title: worksheet.title,
		description: worksheet.description,
		translations: null,
		type: worksheet.type,
		config,
		template_id: worksheet.template_id ?? null,
		style_id: worksheet.style_id ?? null,
		total_points: worksheet.total_points ?? null,
		estimated_duration_minutes: worksheet.estimated_duration_minutes ?? null
	} as unknown as WorksheetRow;

	const generator = new WorksheetGenerator(
		config,
		undefined,
		{ mode: 'worksheet', className: worksheet.class_name ?? undefined },
		{
			withCorrections: ending === 'none' ? undefined : ending,
			correctionFonts: options.correctionFonts,
			individualCopyNotice: options.individualCopyNotice
		}
	);
	return generator.generate({
		worksheet: row,
		instance: { exercises: [] },
		// Le générateur ne lit que le Typst de la mise en page
		template: (worksheet.template ?? null) as WorksheetTemplateRow | null,
		document
	}).typstContent;
}
