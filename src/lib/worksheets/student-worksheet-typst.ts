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
import { isContentLocale, TYPST_LANGS, type ContentLocale } from '$lib/types/locale';
import type { StudentWorksheetView, StudentExerciseView } from '$lib/types/worksheets';
import {
	generateTypst,
	escapeTypst,
	processTableCellContent
} from '$lib/ubumark/generators/typst-generator';
import { parseMarkdown } from '$lib/ubumark';
import { genericFunctionsConfig } from '$lib/components/markdown/utils/math-utils';
import type { CapitalPairs, GenericFunctionConfig } from '$lib/mathAST/parser/types';
import { exerciseBadge } from '$lib/typst/worksheet-palette';
// Rendu Typst des blocs ```figure (registre : voir figure-typst-registry.ts)
import '$lib/ubumark/generators/figure-typst-setup';
import { correctionForPrint } from '$lib/questions/correction-detail';
import { CORRECTION_FONT_RULES } from '$lib/typst/correction-fonts';

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
}

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
 * @param ending - Partie de fin : rien, les réponses ou le corrigé
 * @param options - Polices du corrigé (repli : police standard)
 * @returns Typst document content
 */
export function generateStudentWorksheetTypst(
	worksheet: StudentWorksheetView,
	ending: StudentPdfEnding,
	options: StudentPdfOptions = {}
): string {
	// The sheet the student prints is a document: its chrome follows the
	// worksheet language, like the teacher's PDF does.
	//
	// Validated rather than asserted: this value crosses an API response, and a
	// declared type guarantees nothing at runtime. An unexpected locale would
	// otherwise crash on STUDENT_TYPE_LABELS[locale] instead of degrading.
	const locale: ContentLocale = isContentLocale(worksheet.language) ? worksheet.language : 'fr';
	const labels = documentLabels(locale);
	let typst = generateSetup(locale);

	// Header with title
	typst += `#align(center)[
  #text(size: 1.5em, weight: "bold")[${escapeTypst(worksheet.title)}]
]\n\n`;

	// Type badge
	const typeLabel = STUDENT_TYPE_LABELS[locale][worksheet.type] || escapeTypst(worksheet.type);
	typst += `#align(center)[#text(size: 0.9em, fill: gray)[${typeLabel}]]\n\n`;

	// Description if present
	if (worksheet.description) {
		typst += `#text(fill: gray)[${escapeTypst(worksheet.description)}]\n\n`;
	}

	// Instructions if present
	if (worksheet.instructions) {
		typst += `#block(fill: rgb("#eff6ff"), radius: 4pt, inset: 12pt, width: 100%)[
  #text(weight: "bold", fill: rgb("#1d4ed8"))[${labels.instructions}]
  #v(0.5em)
  ${escapeTypst(worksheet.instructions)}
]\n\n`;
	}

	// Check if there are essential exercises for legend
	const hasEssentialExercises = (worksheet.exercises ?? []).some((e) => e.is_essential);
	if (hasEssentialExercises) {
		typst += `#text(size: 0.9em, fill: gray)[#text(fill: rgb("#f59e0b"))[★] = ${labels.essentialExercises}]\n\n`;
	}

	typst += `#line(length: 100%, stroke: 0.5pt + gray)\n\n`;

	// Sort exercises by section order, then by position within section
	const sortedExercises = getSectionOrderedExercises(worksheet);

	// Create a map of section_id to section data for quick lookup
	const sections = worksheet.sections ?? [];
	const sectionMap = new Map(sections.map((s) => [s.id, s]));
	let currentSectionId: string | null | undefined = undefined;
	let exerciseNumber = 0;

	// Partie de fin, remplie au fil des exercices (réponses ou corrigés)
	const endings: {
		number: number;
		title: string | null | undefined;
		/** Markdown imprimé ; `null` : réponses non rédigées */
		content: string | null;
		genericFunctions: GenericFunctionConfig | undefined;
		capitalPairs: CapitalPairs | undefined;
	}[] = [];

	for (const exercise of sortedExercises) {
		// Sens de `AB` (longueur ou produit), résolu par le serveur ; absent : produit (Q-J)
		const capitalPairs = exercise.capital_pairs;
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
				typst += `= ${labels.otherExercises}\n\n`;
			}
		}

		exerciseNumber++;
		// En-tête : numéro blanc sur carré ambre (charte partagée avec la fiche enseignant), titre en gras
		// Use processTableCellContent to handle math expressions in titles
		const titlePart = exercise.title
			? ` #h(0.5em) #text(weight: "bold")[${processTableCellContent(exercise.title, locale, undefined, capitalPairs)}]`
			: '';

		// Star prefix for essential exercises
		const essentialPrefix = exercise.is_essential ? `#text(fill: rgb("#f59e0b"))[★] ` : '';

		// Header, points and instructions go in a single `sticky` block: a column
		// or page break can then never leave the number alone at the bottom,
		// separated from the statement it introduces.
		let header = `${essentialPrefix}#${exerciseBadge(exerciseNumber)}${titlePart}`;

		// Points if available
		if (exercise.points) {
			header += `\n\n#text(size: 0.9em, fill: gray)[${exercise.points} point${exercise.points > 1 ? 's' : ''}]`;
		}

		// Custom instructions if present
		if (exercise.custom_instructions) {
			header += `\n\n#text(style: "italic", fill: gray)[${escapeTypst(exercise.custom_instructions)}]`;
		}

		// Build exercise content
		let exerciseContent = `#block(sticky: true, below: 0.6em)[\n${header}\n]\n\n`;

		// Statement (already resolved markdown)
		const statementAst = parseMarkdown(exercise.statement);
		// Fonctions déclarées par l'exercice : sans elles, `C'(x)` s'imprime en erreur.
		const genericFunctions = genericFunctionsConfig(exercise.generic_functions);
		exerciseContent +=
			generateTypst(statementAst, {
				includeSetup: false,
				genericFunctions,
				capitalPairs,
				language: locale
			}) + '\n\n';

		// Wrap essential exercises with orange left border
		if (exercise.is_essential) {
			typst += `#block(stroke: (left: 2pt + rgb("#f97316")), inset: (left: 8pt))[
${exerciseContent}]\n`;
		} else {
			typst += exerciseContent;
		}

		// Partie de fin : seulement les exercices dont la correction est visible
		if (exercise.correction_visible) {
			if (ending === 'correction' && exercise.correction) {
				endings.push({
					number: exerciseNumber,
					title: exercise.title,
					// Concise ou détaillée selon la fiche (D11), avant Typst
					content: correctionForPrint(exercise.correction, worksheet.correction_detail),
					genericFunctions,
					capitalPairs
				});
			} else if (ending === 'answers') {
				endings.push({
					number: exerciseNumber,
					title: exercise.title,
					content: exercise.answers?.trim() ? exercise.answers : null,
					genericFunctions,
					capitalPairs
				});
			}
		}

		typst += `#v(1em)\n`;
	}

	// Partie de fin : « Réponses » ou « Corrections »
	if (endings.length > 0) {
		typst += `#pagebreak()\n\n`;
		// Le corrigé seul passe en Shantell Sans et Chiphre Math : les énoncés gardent leur police
		if (ending === 'correction' && options.correctionFonts !== false) {
			typst += `${CORRECTION_FONT_RULES}\n`;
		}
		typst += `= ${ending === 'answers' ? labels.answers : labels.corrections}\n\n`;

		for (const { number, title, content, genericFunctions, capitalPairs } of endings) {
			const titlePart = title
				? ` #h(0.5em) #text(weight: "bold")[${processTableCellContent(title, locale, undefined, capitalPairs)}]`
				: '';

			// Sticky header inside the panel: same reason as the exercises above
			typst += `#block(fill: rgb("#f0fdf4"), radius: 4pt, inset: 12pt, width: 100%)[
  #block(sticky: true, below: 0.6em)[#${exerciseBadge(number)}${titlePart}]
`;
			typst +=
				content === null
					? `#emph[${escapeTypst(labels.answersNotWritten)}]`
					: generateTypst(parseMarkdown(content), {
							includeSetup: false,
							genericFunctions,
							capitalPairs,
							language: locale
						});
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
