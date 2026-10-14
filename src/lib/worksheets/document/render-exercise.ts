/**
 * Rendu Typst des exercices d'un document de fiche — écrit une seule fois (ADR 0028)
 * =================================================================================
 *
 * Utilisé par les deux générateurs (prof : `worksheet-generator.ts`, élève :
 * `student-worksheet-typst.ts`). Tout ce qui fait un exercice imprimé vit ici :
 * groupement par section (et « Autres exercices »), numéro, titre avec ses
 * formules, points dans la langue du document, consigne, énoncé, réponses ou
 * corrigé (concis ou détaillé), « correction non écrite ».
 *
 * Les mises en page (`ExerciseLayout`) ne changent que l'habillage. Elles
 * reproduisent celles d'avant le lot 1 ; au lot 2, elles deviennent le code
 * commun des styles et ce paramètre disparaît.
 *
 * @module worksheets/document/render-exercise
 */

import { parseMarkdown } from '$lib/ubumark';
import {
	escapeTypst,
	generateTypst,
	processTableCellContent
} from '$lib/ubumark/generators/typst-generator';
import { genericFunctionsConfig } from '$lib/components/markdown/utils/math-utils';
import { correctionForPrint } from '$lib/questions/correction-detail';
import { documentLabels } from '$lib/typst/labels';
import { SECTION_COLOR, exerciseBadge } from '$lib/typst/worksheet-palette';
// Rendu Typst des blocs ```figure (registre : voir figure-typst-registry.ts)
import '$lib/ubumark/generators/figure-typst-setup';
import type { DocumentExercise, DocumentForm, DocumentSection, WorksheetDocument } from './types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Habillage d'un exercice :
 * - `classic` : fiche du prof sans gabarit (`#exercise-header`, `points-badge`) ;
 *   ses Réponses et son Corrigé prennent `badge`, en deux colonnes (D6) ;
 * - `heading` : gabarit qui place `{{exercises}}` (« Exercice N : titre ») ;
 * - `badge` : gabarit qui place `{{exercises_badge}}` (numéro sur carré ambre),
 *   et corrigés du prof sans gabarit ;
 * `display.titleOnly` (copie d'un élève servant de document de classe, D6) :
 * dans tous les habillages, le titre seul, sans numéro ni carré.
 * - `student` : PDF de l'élève (carré ambre, ★, corrigés en fin de document).
 */
export const EXERCISE_LAYOUTS = ['classic', 'heading', 'badge', 'student'] as const;
export type ExerciseLayout = (typeof EXERCISE_LAYOUTS)[number];

/** Ce qu'un exercice imprime après son en-tête, hors fiche */
type PrintedCorrection = { markdown: string } | { message: string };

// ============================================================================
// ENSEMBLE DES EXERCICES
// ============================================================================

/**
 * Les exercices du document, avec les titres de section.
 *
 * Exercice hors section après des sections : sous « Autres exercices » (D4).
 * Pour l'élève, hors fiche, ce sont les cadres de la partie de fin (sans titre
 * de section) : seulement les exercices dont la correction est visible.
 */
export function renderExercises(
	doc: WorksheetDocument,
	form: DocumentForm,
	layout: ExerciseLayout
): string {
	if (layout === 'student' && form !== 'worksheet') {
		return doc.exercises.map((exercise) => renderStudentPanel(exercise, doc, form)).join('');
	}

	const sections = new Map(doc.sections.map((section) => [section.id, section]));
	let content = '';
	let currentSection: string | null | undefined = undefined;
	let afterSection = false;

	for (const exercise of doc.exercises) {
		if (exercise.sectionId !== currentSection) {
			currentSection = exercise.sectionId;
			const section = currentSection ? sections.get(currentSection) : undefined;
			if (section) {
				// La consigne de section fait partie de l'énoncé : les corrigés n'en gardent que le titre
				content += renderSectionHeader(
					form === 'worksheet' ? section : { ...section, instructions: null },
					layout
				);
				afterSection = true;
			} else if (afterSection) {
				const others = documentLabels(doc.locale).otherExercises;
				content += renderSectionHeader({ id: '', title: others, instructions: null }, layout);
			}
		}
		content += renderExercise(exercise, doc, form, layout);
	}

	return content;
}

// ============================================================================
// SECTION
// ============================================================================

function renderSectionHeader(section: DocumentSection, layout: ExerciseLayout): string {
	const title = escapeTypst(section.title);
	const instructions = section.instructions ? escapeTypst(section.instructions) : null;

	switch (layout) {
		case 'student':
			return (
				`= ${title}\n\n` +
				(instructions ? `#text(style: "italic", fill: gray)[${instructions}]\n\n` : '')
			);
		case 'badge':
			// Titre ambre en petites capitales sur un filet ambre, à la mesure des
			// numéros en carré. `sticky` : jamais seul en bas de colonne ; `above` :
			// bien plus que l'écart entre exercices, une section se lit comme une rupture.
			return (
				`#block(width: 100%, sticky: true, above: 3.5em, below: 1em)[
  #text(fill: ${SECTION_COLOR}, weight: "bold", size: 1.15em)[#smallcaps[${title}]]
  #v(-0.6em)
  #line(length: 100%, stroke: 1.2pt + ${SECTION_COLOR})` +
				(instructions
					? `
  #v(-0.4em)
  #text(style: "italic", fill: luma(35%))[${instructions}]`
					: '') +
				'\n]\n\n'
			);
		case 'classic':
		case 'heading':
			return (
				`#block(width: 100%, inset: (top: 0.5em, bottom: 0.3em))[
  #text(size: 1.2em, weight: "bold")[${title}]` +
				(instructions
					? `
  #v(0.2em)
  #text(size: 0.95em, style: "italic")[${instructions}]`
					: '') +
				'\n]\n#v(0.3em)\n\n'
			);
	}
}

// ============================================================================
// EXERCICE
// ============================================================================

/** Un exercice, séparateur compris */
function renderExercise(
	exercise: DocumentExercise,
	doc: WorksheetDocument,
	form: DocumentForm,
	layout: ExerciseLayout
): string {
	switch (layout) {
		case 'student':
			return renderStudentExercise(exercise, doc);
		case 'classic':
			return renderClassicExercise(exercise, doc, form) + '\n\n';
		case 'heading':
		case 'badge':
			return renderTemplateExercise(exercise, doc, form, layout) + '\n\n';
	}
}

/** PDF du prof sans gabarit : en-tête en grille, `points-badge` du setup */
function renderClassicExercise(
	exercise: DocumentExercise,
	doc: WorksheetDocument,
	form: DocumentForm
): string {
	const labels = documentLabels(doc.locale);
	const title = exercise.title ? ` : ${exerciseTitle(exercise, doc)}` : '';
	const heading = doc.display.titleOnly
		? titleOnlyHeading(exercise, doc)
		: `${labels.exercise} ${exercise.number}${title}`;
	let content = '#exercise-header[\n';
	content += '  #grid(\n';
	content += '    columns: (auto, 1fr, auto),\n';
	content += `    [#text(size: 1.1em, weight: "bold")[${heading}]],\n`;
	content += '    [],\n';
	const points = shownPoints(exercise, doc);
	content += points ? `    points-badge([${points}])\n` : '    []\n';
	content += '  )\n';

	// Consigne du prof : elle fait partie de l'énoncé, sur la fiche seulement
	if (form === 'worksheet' && exercise.instructions) {
		content += '  #v(0.2em)\n';
		content += `  #text(style: "italic", fill: rgb(90, 90, 90))[${escapeTypst(exercise.instructions)}]\n`;
	}
	content += ']\n';

	// Corrigés : jamais l'énoncé, seulement les réponses ou la correction
	if (form !== 'worksheet') return content + renderTeacherCorrection(exercise, doc, form);

	content += '#exercise-box[\n';
	content += indent(markdownTypst(exercise.statement, exercise, doc)) + '\n';
	if (hasAnswerSpace(doc)) {
		content += '  #v(0.5em)\n';
		content += '  #answer-space(height: 5cm)\n';
	}
	content += ']\n';
	return content;
}

/** Gabarit : en-tête « Exercice N » ou numéro sur carré ambre, dans un bloc `sticky` */
function renderTemplateExercise(
	exercise: DocumentExercise,
	doc: WorksheetDocument,
	form: DocumentForm,
	layout: 'heading' | 'badge'
): string {
	const labels = documentLabels(doc.locale);
	const points = shownPoints(exercise, doc);
	const pointsBox = points
		? `#box(fill: rgb("#dcdcdc"), inset: (x: 6pt, y: 3pt), radius: 3pt)[${points}]`
		: '';
	let content = '';

	if (layout === 'badge') {
		// Numéro, titre et points dans une grille alignée `horizon` : posé en
		// ligne, le titre suivait la ligne de base du numéro et paraissait décalé.
		// Titre seul (D6) : ni carré ni numéro, le titre (ou « Exercice sans titre »)
		const titleOnly = doc.display.titleOnly === true;
		const title = titleOnly
			? `#text(weight: "bold")[${titleOnlyHeading(exercise, doc)}]`
			: exercise.title
				? `#text(weight: "bold")[${exerciseTitle(exercise, doc)}]`
				: '';
		content += `#block(width: 100%, inset: 0pt, sticky: true, below: 0.3em)[
  #grid(
    columns: (auto, 1fr, auto),
    column-gutter: ${titleOnly ? '0em' : '0.5em'},
    align: horizon,
    ${titleOnly ? '[]' : exerciseBadge(exercise.number)},
    [${title}],
    [${pointsBox}]
  )`;
	} else {
		const title = exercise.title ? ` : ${exerciseTitle(exercise, doc)}` : '';
		const heading = doc.display.titleOnly
			? titleOnlyHeading(exercise, doc)
			: `${labels.exercise} ${exercise.number}${title}`;
		content += `#block(width: 100%, inset: 0pt, sticky: true, below: 0.3em)[
  #text(size: 1.1em, weight: "bold")[${heading}]`;
		if (pointsBox) content += ` #h(1fr) ${pointsBox}`;
	}

	// Consigne du prof : elle fait partie de l'énoncé, sur la fiche seulement
	if (form === 'worksheet' && exercise.instructions) {
		content += `\n\n  #text(style: "italic", fill: gray)[${escapeTypst(exercise.instructions)}]`;
	}
	content += `\n]\n`;

	if (form !== 'worksheet') return content + renderTeacherCorrection(exercise, doc, form);

	// Bloc sécable de l'énoncé, collé à son titre au lieu d'hériter de
	// l'espacement entre blocs du gabarit (souvent 1,8em)
	content += `#block(width: 100%, inset: 0pt, above: 0.5em)[\n`;
	content += indent(markdownTypst(exercise.statement, exercise, doc)) + '\n';
	if (hasAnswerSpace(doc)) {
		content += `  #v(0.5em)
  #rect(width: 100%, height: 5cm, stroke: (paint: rgb("#c8c8c8"), thickness: 0.5pt, dash: "dashed"), fill: none)`;
	}
	content += '\n]\n';
	return content;
}

/** PDF de l'élève : ★, carré ambre, points et consigne dans un bloc `sticky` */
function renderStudentExercise(exercise: DocumentExercise, doc: WorksheetDocument): string {
	const star = exercise.essential ? `#text(fill: rgb("#f59e0b"))[★] ` : '';
	let header = `${star}${studentHeading(exercise, doc)}`;

	const points = shownPoints(exercise, doc);
	if (points) header += `\n\n#text(size: 0.9em, fill: gray)[${points}]`;
	if (exercise.instructions) {
		header += `\n\n#text(style: "italic", fill: gray)[${escapeTypst(exercise.instructions)}]`;
	}

	// En-tête, points et consigne dans un seul bloc `sticky` : un saut de
	// colonne ou de page ne laisse jamais le numéro seul, loin de son énoncé.
	const content =
		`#block(sticky: true, below: 0.6em)[\n${header}\n]\n\n` +
		markdownTypst(exercise.statement, exercise, doc) +
		'\n\n';

	// Exercice indispensable : filet orange à gauche
	const framed = exercise.essential
		? `#block(stroke: (left: 2pt + rgb("#f97316")), inset: (left: 8pt))[\n${content}]\n`
		: content;
	return framed + `#v(1em)\n`;
}

/** Cadre de la partie de fin de l'élève ; rien si la correction n'est pas visible */
function renderStudentPanel(
	exercise: DocumentExercise,
	doc: WorksheetDocument,
	form: Exclude<DocumentForm, 'worksheet'>
): string {
	const printed = renderPrintedCorrection(exercise, doc, form);
	if (printed === null) return '';
	// En-tête `sticky` dans le cadre : même raison que pour les exercices
	return `#block(fill: rgb("#f0fdf4"), radius: 4pt, inset: 12pt, width: 100%)[
  #block(sticky: true, below: 0.6em)[${studentHeading(exercise, doc)}]
${printed}
]

#v(1em)
`;
}

// ============================================================================
// RÉPONSES ET CORRIGÉ
// ============================================================================

/**
 * Ce qu'imprime un exercice dans les PDF « Réponses » et « Corrigé », en Typst ;
 * `null` : correction non visible, rien du tout.
 *
 * - Réponses : les résultats ; absents, un renvoi au corrigé ; sans corrigé
 *   non plus, « correction non écrite » (D4).
 * - Corrigé : la correction, concise ou détaillée selon la fiche (D11) ;
 *   absente, « correction non écrite » (D4).
 */
export function renderPrintedCorrection(
	exercise: DocumentExercise,
	doc: WorksheetDocument,
	form: Exclude<DocumentForm, 'worksheet'>
): string | null {
	const printed = printedCorrection(exercise, doc, form);
	if (printed === null) return null;
	return 'markdown' in printed
		? markdownTypst(printed.markdown, exercise, doc)
		: `#emph[${escapeTypst(printed.message)}]`;
}

function printedCorrection(
	exercise: DocumentExercise,
	doc: WorksheetDocument,
	form: Exclude<DocumentForm, 'worksheet'>
): PrintedCorrection | null {
	if (exercise.correction === null) return null;
	const labels = documentLabels(doc.locale);
	const { solution, answers } = exercise.correction;

	if (form === 'answers') {
		if (answers) return { markdown: answers };
		return { message: solution ? labels.answersNotWritten : labels.correctionNotWritten };
	}
	if (solution) return { markdown: correctionForPrint(solution, doc.display.correctionDetail) };
	return { message: labels.correctionNotWritten };
}

/** Sous l'en-tête d'un exercice du prof, sans l'énoncé (même espacement serré) */
function renderTeacherCorrection(
	exercise: DocumentExercise,
	doc: WorksheetDocument,
	form: Exclude<DocumentForm, 'worksheet'>
): string {
	const printed = printedCorrection(exercise, doc, form);
	if (printed === null) return '';
	const body = indent(renderPrintedCorrection(exercise, doc, form) ?? '');
	// Le corrigé rédigé sur fond gris ; réponses et messages en clair
	if (form === 'correction' && 'markdown' in printed) {
		return `#block(width: 100%, fill: rgb("#f0f0f0"), inset: 10pt, radius: 4pt, above: 0.5em)[
${body}
]
`;
	}
	return `#block(width: 100%, inset: 0pt, above: 0.5em)[\n${body}\n]\n`;
}

// ============================================================================
// PIÈCES COMMUNES
// ============================================================================

/**
 * Titre d'exercice en Typst : ses formules `$…$` et `~…~` rendues avec les
 * fonctions déclarées et le sens de `AB` de l'exercice, comme son énoncé
 * (sans eux, `~C'(x)~` s'imprimait en erreur).
 */
function exerciseTitle(exercise: DocumentExercise, doc: WorksheetDocument): string {
	return processTableCellContent(
		exercise.title ?? '',
		doc.locale,
		genericFunctionsConfig(exercise.genericFunctions),
		exercise.capitalPairs
	);
}

/** Titre seul (D6) : le titre de l'exercice, sinon « Exercice sans titre » */
function titleOnlyHeading(exercise: DocumentExercise, doc: WorksheetDocument): string {
	return exercise.title
		? exerciseTitle(exercise, doc)
		: escapeTypst(documentLabels(doc.locale).untitledExercise);
}

/** En-tête élève : carré ambre et titre, ou le titre seul (D6) */
function studentHeading(exercise: DocumentExercise, doc: WorksheetDocument): string {
	if (doc.display.titleOnly) {
		return `#text(weight: "bold")[${titleOnlyHeading(exercise, doc)}]`;
	}
	return `#${exerciseBadge(exercise.number)}${studentTitle(exercise, doc)}`;
}

/** Titre après le carré ambre de l'élève */
function studentTitle(exercise: DocumentExercise, doc: WorksheetDocument): string {
	return exercise.title ? ` #h(0.5em) #text(weight: "bold")[${exerciseTitle(exercise, doc)}]` : '';
}

/** « 2 pts », dans la langue du document ; vide si les points ne s'affichent pas */
function shownPoints(exercise: DocumentExercise, doc: WorksheetDocument): string {
	if (!doc.display.showPoints || !exercise.points) return '';
	const labels = documentLabels(doc.locale);
	return `${exercise.points} ${exercise.points > 1 ? labels.pointAbbrevPlural : labels.pointAbbrev}`;
}

/** Évaluation : cadre de réponse sous l'énoncé */
function hasAnswerSpace(doc: WorksheetDocument): boolean {
	return doc.type === 'exam' || doc.type === 'assessment';
}

/** Markdown d'un exercice en Typst, avec ses fonctions déclarées et son sens de `AB` */
function markdownTypst(
	markdown: string,
	exercise: DocumentExercise,
	doc: WorksheetDocument
): string {
	return generateTypst(parseMarkdown(markdown), {
		includeSetup: false,
		language: doc.locale,
		genericFunctions: genericFunctionsConfig(exercise.genericFunctions),
		capitalPairs: exercise.capitalPairs
	});
}

/** Indenté de deux espaces (contenu d'un bloc) */
function indent(typst: string): string {
	return typst
		.split('\n')
		.map((line) => '  ' + line)
		.join('\n');
}
