/**
 * Guides calculatrices : ce que montre le guide d'un modèle à un niveau.
 *
 * Phase 0 validée par David le 2026-10-12 (docs/wip/guides-calculatrices-progress.md) :
 * les tâches du niveau d'abord, celles des niveaux hérités en « Rappels » ; une
 * séquence non relue sur la vraie machine n'est montrée qu'en local.
 */

import { ancestorsOf, type GuideGrade } from './levels';
import { TASKS } from './tasks';
import type { CalculatorModel, CalculatorTask, Pitfall, TaskSequence } from './types';

// ===== Types =====

export interface GuideOptions {
	/** Montrer aussi les séquences non relues sur machine (en local seulement) */
	includeUnverified: boolean;
}

export interface GuideEntry {
	task: CalculatorTask;
	sequence: TaskSequence;
}

export interface GuideRecall {
	grade: GuideGrade;
	entries: GuideEntry[];
}

export interface Guide {
	grade: GuideGrade;
	own: GuideEntry[];
	/** Niveaux hérités, du plus proche au plus lointain ; un niveau vide est omis */
	recalls: GuideRecall[];
	pitfalls: Pitfall[];
}

export type StepSegment =
	{ kind: 'text'; text: string } | { kind: 'key'; id: string; label: string };

// ===== Constantes =====

const KEY_PATTERN = /\[\[([^\]]+)\]\]/g;

// ===== Fonctions =====

function isVisible(item: { verifiedOnDevice: boolean }, options: GuideOptions): boolean {
	return item.verifiedOnDevice || options.includeUnverified;
}

/** Les entrées d'un niveau, dans l'ordre de la liste commune des tâches */
function entriesOf(model: CalculatorModel, grade: GuideGrade, options: GuideOptions): GuideEntry[] {
	const entries: GuideEntry[] = [];
	for (const task of TASKS as readonly CalculatorTask[]) {
		if (task.grade !== grade) continue;
		const sequence = model.sequences.find((candidate) => candidate.taskId === task.id);
		if (sequence && isVisible(sequence, options)) entries.push({ task, sequence });
	}
	return entries;
}

export function buildGuide(
	model: CalculatorModel,
	grade: GuideGrade,
	options: GuideOptions
): Guide {
	if (!model.grades.includes(grade)) {
		throw new Error(`${model.name} : pas de guide pour le niveau ${grade}`);
	}
	const ancestors = ancestorsOf(grade);
	const shownGrades = new Set<GuideGrade>([grade, ...ancestors]);
	return {
		grade,
		own: entriesOf(model, grade, options),
		recalls: ancestors
			.map((ancestor) => ({ grade: ancestor, entries: entriesOf(model, ancestor, options) }))
			.filter((recall) => recall.entries.length > 0),
		pitfalls: model.pitfalls.filter(
			(pitfall) => shownGrades.has(pitfall.grade) && isVisible(pitfall, options)
		)
	};
}

/** Un modèle sans aucune séquence visible est annoncé « bientôt » */
export function isModelAvailable(model: CalculatorModel, options: GuideOptions): boolean {
	return model.sequences.some((sequence) => isVisible(sequence, options));
}

/** Découpe une étape en texte et touches dessinées (`[[id]]`) */
export function parseStep(step: string, keys: Readonly<Record<string, string>>): StepSegment[] {
	const segments: StepSegment[] = [];
	let cursor = 0;
	for (const match of step.matchAll(KEY_PATTERN)) {
		const id = match[1];
		const label = keys[id];
		if (label === undefined) throw new Error(`touche inconnue « ${id} » dans « ${step} »`);
		if (match.index > cursor)
			segments.push({ kind: 'text', text: step.slice(cursor, match.index) });
		segments.push({ kind: 'key', id, label });
		cursor = match.index + match[0].length;
	}
	if (cursor < step.length) segments.push({ kind: 'text', text: step.slice(cursor) });
	return segments;
}
