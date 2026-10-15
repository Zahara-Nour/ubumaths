/**
 * Rendu Typst des exercices d'un document de fiche — écrit une seule fois (ADR 0028)
 * =================================================================================
 *
 * Utilisé par le générateur des fiches (`worksheet-generator.ts`, pour le
 * prof comme pour l'élève depuis le lot 4b) et par l'aperçu markdown à l'écran du prof
 * (`renderMarkdownPreview`). Tout ce qui fait un exercice imprimé vit ici :
 * groupement par section (et « Autres exercices »), numéro, titre avec ses
 * formules, points dans la langue du document, consigne, énoncé, cadres de
 * réponse (`answer-frames.ts`), réponses ou corrigé (toujours détaillé,
 * ADR 0030), « correction non écrite ».
 *
 * Les habillages (`ExerciseLayout`) ne changent que l'allure ; le gabarit
 * choisit le sien par son placeholder (`{{exercises}}`, `{{exercises_badge}}`).
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
import { CORRECTION_FONT_RULES } from '$lib/typst/correction-fonts';
import { SECTION_COLOR, exerciseBadge } from '$lib/typst/worksheet-palette';
// Rendu Typst des blocs ```figure (registre : voir figure-typst-registry.ts)
import '$lib/ubumark/generators/figure-typst-setup';
import type { DocumentExercise, DocumentForm, DocumentSection, WorksheetDocument } from './types';
import { ANSWER_FRAME_HEIGHT_CM, answerFrameTypst, estimateAnswerFrames } from './answer-frames';
import type { TypstTranspilerOptions } from '$lib/exercises/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Habillage d'un exercice :
 * - `heading` : gabarit qui place `{{exercises}}` (« Exercice N : titre ») ;
 * - `badge` : gabarit qui place `{{exercises_badge}}` (numéro sur carré ambre) ;
 * `display.titleOnly` (copie d'un élève servant de document de classe, D6) :
 * dans tous les habillages, le titre seul, sans numéro ni carré.
 * L'ancien habillage `student` (PDF de l'élève à part) est retiré au lot 5 :
 * l'élève reçoit le gabarit du style de la fiche, comme le prof.
 */
export const EXERCISE_LAYOUTS = ['heading', 'badge'] as const;
export type ExerciseLayout = (typeof EXERCISE_LAYOUTS)[number];

/**
 * Réglages du rendu :
 * - `inlineCorrections` : « Fiche + corrigé » du prof (demande de David,
 *   2026-10-14) — sur la fiche, la correction de chaque exercice juste sous son
 *   énoncé, sans cadre de réponse ;
 * - `correctionFonts` : ces corrections en police du corrigé (vrai par défaut).
 */
export interface RenderOptions {
	inlineCorrections?: boolean;
	/** Aperçu markdown : ce qui suit le titre, comme sur le PDF (« — Correction ») */
	titleSuffix?: string;
	correctionFonts?: boolean;
}

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
	layout: ExerciseLayout,
	options: RenderOptions = {}
): string {
	// Réponses et corrigé : seulement les exercices dont la correction est
	// visible (vue de l'élève) ; la copie du prof les a toutes
	const printed =
		form === 'worksheet'
			? doc
			: { ...doc, exercises: doc.exercises.filter((exercise) => exercise.correction !== null) };

	let content = '';
	for (const { header, exercise } of withSectionHeaders(printed, form)) {
		if (header) content += renderSectionHeader(header, layout);
		content += renderExercise(exercise, doc, form, layout, options);
	}
	return content;
}

/**
 * Aperçu à l'écran du prof, en markdown : mêmes ordre, numéros, titres,
 * sections et corrections que le PDF de la même forme (lot 2).
 */
export function renderMarkdownPreview(
	doc: WorksheetDocument,
	form: DocumentForm,
	options: RenderOptions = {}
): string {
	const labels = documentLabels(doc.locale);
	const level = doc.sections.length > 0 ? '###' : '##';
	const parts: string[] = [`# ${doc.title}${options.titleSuffix ?? ''}\n`];
	if (doc.description) parts.push(`${doc.description}\n`);

	for (const { header, exercise } of withSectionHeaders(doc, form)) {
		if (header) {
			parts.push(`## ${header.title}\n`);
			if (header.instructions) parts.push(`_${header.instructions}_\n`);
		}
		const heading = doc.display.titleOnly
			? (exercise.title ?? labels.untitledExercise)
			: `${labels.exercise} ${exercise.number}${exercise.title ? ` : ${exercise.title}` : ''}`;
		parts.push(`${level} ${heading}\n`);
		if (form === 'worksheet') {
			if (exercise.instructions) parts.push(`_${exercise.instructions}_\n`);
			parts.push(`${exercise.statement}\n`);
			// Fiche + corrigé : la correction sous l'énoncé, comme le PDF
			if (!options.inlineCorrections) continue;
			const inline = printedCorrection(exercise, doc, 'correction');
			if (inline)
				parts.push('markdown' in inline ? `${inline.markdown}\n` : `_${inline.message}_\n`);
			continue;
		}
		const printed = printedCorrection(exercise, doc, form);
		if (printed)
			parts.push('markdown' in printed ? `${printed.markdown}\n` : `_${printed.message}_\n`);
	}
	return parts.join('\n');
}

/**
 * Les exercices dans l'ordre du document, chacun avec le titre de section à
 * poser avant lui (ou `null`). Exercice hors section après des sections : sous
 * « Autres exercices » (D4). La consigne de section fait partie de l'énoncé :
 * les corrigés n'en gardent que le titre.
 */
function withSectionHeaders(
	doc: WorksheetDocument,
	form: DocumentForm
): Array<{ header: DocumentSection | null; exercise: DocumentExercise }> {
	const sections = new Map(doc.sections.map((section) => [section.id, section]));
	const items: Array<{ header: DocumentSection | null; exercise: DocumentExercise }> = [];
	let currentSection: string | null | undefined = undefined;
	let afterSection = false;

	for (const exercise of doc.exercises) {
		let header: DocumentSection | null = null;
		if (exercise.sectionId !== currentSection) {
			currentSection = exercise.sectionId;
			const section = currentSection ? sections.get(currentSection) : undefined;
			if (section) {
				header = form === 'worksheet' ? section : { ...section, instructions: null };
				afterSection = true;
			} else if (afterSection) {
				header = { id: '', title: documentLabels(doc.locale).otherExercises, instructions: null };
			}
		}
		items.push({ header, exercise });
	}
	return items;
}

// ============================================================================
// SECTION
// ============================================================================

function renderSectionHeader(section: DocumentSection, layout: ExerciseLayout): string {
	const title = escapeTypst(section.title);
	const instructions = section.instructions ? escapeTypst(section.instructions) : null;

	switch (layout) {
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
	layout: ExerciseLayout,
	options: RenderOptions
): string {
	return renderTemplateExercise(exercise, doc, form, layout, options) + '\n\n';
}

/** Gabarit : en-tête « Exercice N » ou numéro sur carré ambre, dans un bloc `sticky` */
function renderTemplateExercise(
	exercise: DocumentExercise,
	doc: WorksheetDocument,
	form: DocumentForm,
	layout: 'heading' | 'badge',
	options: RenderOptions = {}
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
		const title =
			essentialStar(exercise) +
			(titleOnly
				? `#text(weight: "bold")[${titleOnlyHeading(exercise, doc)}]`
				: exercise.title
					? `#text(weight: "bold")[${exerciseTitle(exercise, doc)}]`
					: '');
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
  ${essentialStar(exercise)}#text(size: 1.1em, weight: "bold")[${heading}]`;
		if (pointsBox) content += ` #h(1fr) ${pointsBox}`;
	}

	// Consigne du prof : elle fait partie de l'énoncé, sur la fiche seulement
	if (form === 'worksheet' && exercise.instructions) {
		content += `\n\n  #text(style: "italic", fill: gray)[${escapeTypst(exercise.instructions)}]`;
	}
	content += `\n]\n`;

	if (form !== 'worksheet') return content + renderTeacherCorrection(exercise, doc, form);

	// Bloc sécable de l'énoncé, collé à son titre au lieu d'hériter de
	// l'espacement entre blocs du gabarit (souvent 1,8em). Exercice
	// indispensable (élève) : filet orange à gauche, comme son ancien PDF
	content += exercise.essential
		? `#block(width: 100%, inset: (left: 8pt), above: 0.5em, stroke: (left: 2pt + rgb("#f97316")))[\n`
		: `#block(width: 100%, inset: 0pt, above: 0.5em)[\n`;
	// Fiche + corrigé : la correction remplace les cadres de réponse
	if (options.inlineCorrections) {
		content += indent(markdownTypst(exercise.statement, exercise, doc)) + '\n';
		return content + '\n]\n' + inlineCorrection(exercise, doc, options);
	}
	const frames = answerFrames(exercise, doc);
	// Cadre unique à la fin : la fin de l'énoncé reste collée à lui (jamais seul
	// en haut d'une colonne) ; les cadres par question, l'option `afterQuestion`
	content +=
		indent(
			markdownTypst(exercise.statement, exercise, doc, {
				afterQuestion: frames.afterQuestion,
				keepEndWithNext: frames.atEnd !== null
			})
		) + '\n';
	if (frames.atEnd !== null) content += indent(answerFrameTypst(frames.atEnd)) + '\n';
	content += '\n]\n';
	return content;
}

/**
 * Les cadres de réponse d'un exercice sur la fiche (ADR 0030, lot 3) : un
 * après chaque question, ou un seul à la fin de l'énoncé (mode « exercice »,
 * ou énoncé sans question numérotée). Aucun sans « réponses sur le sujet ».
 */
function answerFrames(
	exercise: DocumentExercise,
	doc: WorksheetDocument
): { afterQuestion?: (index: number) => string; atEnd: number | null } {
	if (!doc.display.answersOnSheet) return { atEnd: null };
	// Estimation transmise (prof, serveur pour l'élève) ; sinon depuis la
	// correction présente, ou taille moyenne
	const estimate =
		exercise.answerFrameEstimate ??
		estimateAnswerFrames(exercise.statement, exercise.correction?.solution ?? null);
	// Une taille par question de l'énoncé : aucune, pas de question numérotée
	if (doc.display.answerFrames === 'exercise' || estimate.questions.length === 0) {
		return { atEnd: estimate.exercise_cm };
	}
	return {
		afterQuestion: (index) =>
			answerFrameTypst(ANSWER_FRAME_HEIGHT_CM[estimate.questions[index] ?? 'medium']),
		atEnd: null
	};
}

/**
 * La correction d'un exercice sous son énoncé (« Fiche + corrigé »), en
 * police du corrigé dans son seul bloc : les énoncés gardent la leur.
 */
function inlineCorrection(
	exercise: DocumentExercise,
	doc: WorksheetDocument,
	options: RenderOptions
): string {
	const correction = renderTeacherCorrection(exercise, doc, 'correction');
	if (!correction) return '';
	// Le bloc `#[ … ]` borne les règles de police à cette correction
	const fonts = options.correctionFonts === false ? '' : `${CORRECTION_FONT_RULES}\n`;
	return `#[\n${fonts}${correction}]\n`;
}

/** ★ d'un exercice indispensable (vue de l'élève ; la copie du prof n'en a pas) */
function essentialStar(exercise: DocumentExercise): string {
	return exercise.essential ? `#text(fill: rgb("#f59e0b"))[★] ` : '';
}

/**
 * Ce que seul l'élève reçoit, en tête des exercices de la fiche, quel que soit
 * le style : l'avertissement de la copie individuelle (vue prof, D6), les
 * consignes de l'affectation (sauf si le gabarit a sa case `{{instructions}}`),
 * la légende ★. Vide pour la copie du prof.
 */
export function renderDocumentPreamble(
	doc: WorksheetDocument,
	options: { individualCopyNotice?: boolean; instructionsInTemplate?: boolean } = {}
): string {
	const labels = documentLabels(doc.locale);
	let typst = '';
	if (options.individualCopyNotice) {
		typst += `#block(width: 100%, fill: rgb("#fff4d6"), stroke: rgb("#d9a400"), inset: 8pt, radius: 4pt)[
  #text(weight: "bold")[${escapeTypst(labels.individualCopyNotice)}]
]\n\n`;
	}
	// Le gabarit qui a sa case `{{instructions}}` y reçoit les consignes
	const instructions = options.instructionsInTemplate ? null : doc.assignment?.instructions;
	if (instructions) {
		typst += `#block(fill: rgb("#eff6ff"), radius: 4pt, inset: 12pt, width: 100%)[
  #text(weight: "bold", fill: rgb("#1d4ed8"))[${labels.instructions}]
  #v(0.5em)
  ${escapeTypst(instructions)}
]\n\n`;
	}
	if (doc.exercises.some((exercise) => exercise.essential)) {
		typst += `#text(size: 0.9em, fill: gray)[#text(fill: rgb("#f59e0b"))[★] = ${labels.essentialExercises}]\n\n`;
	}
	return typst;
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
 * - Corrigé : la correction détaillée (ADR 0030 : plus de choix de la fiche) ;
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
	if (solution) return { markdown: correctionForPrint(solution, 'detailed') };
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

/** « 2 pts », dans la langue du document ; vide si les points ne s'affichent pas */
function shownPoints(exercise: DocumentExercise, doc: WorksheetDocument): string {
	if (!doc.display.showPoints || !exercise.points) return '';
	const labels = documentLabels(doc.locale);
	return `${exercise.points} ${exercise.points > 1 ? labels.pointAbbrevPlural : labels.pointAbbrev}`;
}

/** Markdown d'un exercice en Typst, avec ses fonctions déclarées et son sens de `AB` */
function markdownTypst(
	markdown: string,
	exercise: DocumentExercise,
	doc: WorksheetDocument,
	frames: Pick<TypstTranspilerOptions, 'afterQuestion' | 'keepEndWithNext'> = {}
): string {
	return generateTypst(parseMarkdown(markdown), {
		includeSetup: false,
		language: doc.locale,
		genericFunctions: genericFunctionsConfig(exercise.genericFunctions),
		capitalPairs: exercise.capitalPairs,
		...frames
	});
}

/** Indenté de deux espaces (contenu d'un bloc) */
function indent(typst: string): string {
	return typst
		.split('\n')
		.map((line) => '  ' + line)
		.join('\n');
}
