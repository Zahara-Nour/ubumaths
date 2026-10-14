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

import { documentLabels, STUDENT_TYPE_LABELS } from '$lib/typst/labels';
import { TYPST_LANGS, type ContentLocale } from '$lib/types/locale';
import type { StudentWorksheetView } from '$lib/types/worksheets';
import { escapeTypst } from '$lib/ubumark/generators/typst-generator';
import { CORRECTION_FONT_RULES } from '$lib/typst/correction-fonts';
import { documentFromStudentView } from './document/student-adapter';
import { renderExercises } from './document/render-exercise';
import { MATH_LIMITS_SETUP } from './document/math-limits';

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
 * Generate Typst document for a student worksheet
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
	// Le document de la fiche (ADR 0028) : ordre, numéros et corrections
	// visibles décidés une fois, comme pour le PDF du prof. Sa langue est
	// validée plutôt que supposée : elle traverse une réponse d'API.
	const viewDoc = documentFromStudentView(worksheet);
	// Copie d'un élève servant de vue prof (D6) : le titre seul, sans numéro
	const doc = options.individualCopyNotice
		? { ...viewDoc, display: { ...viewDoc.display, titleOnly: true } }
		: viewDoc;
	const locale = doc.locale;
	const labels = documentLabels(locale);
	let typst = generateSetup(locale);

	// Header with title
	typst += `#align(center)[
  #text(size: 1.5em, weight: "bold")[${escapeTypst(doc.title)}]
]\n\n`;

	// Type badge
	const typeLabel = STUDENT_TYPE_LABELS[locale][doc.type] || escapeTypst(doc.type);
	typst += `#align(center)[#text(size: 0.9em, fill: gray)[${typeLabel}]]\n\n`;

	// Copie d'un élève servant de vue prof (D6) : chaque élève a sa version
	if (options.individualCopyNotice) {
		typst += `#block(width: 100%, fill: rgb("#fff4d6"), stroke: rgb("#d9a400"), inset: 8pt, radius: 4pt)[
  #text(weight: "bold")[${escapeTypst(labels.individualCopyNotice)}]
]\n\n`;
	}

	// Description if present
	if (doc.description) {
		typst += `#text(fill: gray)[${escapeTypst(doc.description)}]\n\n`;
	}

	// Consignes de l'affectation
	const instructions = doc.assignment?.instructions;
	if (instructions) {
		typst += `#block(fill: rgb("#eff6ff"), radius: 4pt, inset: 12pt, width: 100%)[
  #text(weight: "bold", fill: rgb("#1d4ed8"))[${labels.instructions}]
  #v(0.5em)
  ${escapeTypst(instructions)}
]\n\n`;
	}

	// Légende des exercices indispensables
	if (doc.exercises.some((e) => e.essential)) {
		typst += `#text(size: 0.9em, fill: gray)[#text(fill: rgb("#f59e0b"))[★] = ${labels.essentialExercises}]\n\n`;
	}

	typst += `#line(length: 100%, stroke: 0.5pt + gray)\n\n`;

	// Les exercices : rendu commun aux PDF du prof et de l'élève
	typst += renderExercises(doc, 'worksheet', 'student');

	// Partie de fin : « Réponses » ou « Corrections », exercices à correction visible
	if (ending !== 'none') {
		const panels = renderExercises(doc, ending, 'student');
		if (panels) {
			typst += `#pagebreak()\n\n`;
			// Le corrigé seul passe en Shantell Sans et Chiphre Math : les énoncés gardent leur police
			if (ending === 'correction' && options.correctionFonts !== false) {
				typst += `${CORRECTION_FONT_RULES}\n`;
			}
			typst += `= ${ending === 'answers' ? labels.answers : labels.corrections}\n\n`;
			typst += panels;
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
function generateSetup(locale: ContentLocale): string {
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
#set text(font: "New Computer Modern", size: 10pt, lang: "${TYPST_LANGS[locale]}")
#set par(justify: true)
#set heading(numbering: none)

// List item spacing
#set enum(spacing: 1.5em, tight: false)
#set list(spacing: 1.5em, tight: false)

${MATH_LIMITS_SETUP}
`;
}
