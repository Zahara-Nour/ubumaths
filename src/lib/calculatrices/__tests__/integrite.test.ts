/**
 * Guides calculatrices : le contenu réel (liste des tâches et fichiers des modèles) est
 * cohérent (phase 0, point 13). Une erreur ici se verrait sinon dans un guide recopié
 * par des élèves.
 */
import { describe, expect, it } from 'vitest';
import { GUIDE_GRADES, ancestorsOf, type GuideGrade } from '../levels';
import { MODELS } from '../models';
import { TASKS } from '../tasks';
import { parseStep } from '../guide';
import type { CalculatorTask } from '../types';

const TASK_IDS = new Set<string>(TASKS.map((task) => task.id));

describe('la liste des tâches', () => {
	it('n’a pas deux tâches de même identifiant', () => {
		expect(TASK_IDS.size).toBe(TASKS.length);
	});

	it('ne range une tâche que dans un niveau qui a des guides', () => {
		for (const task of TASKS) expect(GUIDE_GRADES).toContain(task.grade);
	});

	it('justifie par le programme toute tâche qui n’est pas « pratique »', () => {
		// Type élargi : sur la liste `as const`, TypeScript sait déjà qu'aucune n'est vide ;
		// le test garde la règle pour les tâches à venir
		const unjustified = (TASKS as readonly CalculatorTask[]).filter(
			(task) => task.status !== 'pratique' && task.boRefs.length === 0
		);
		expect(unjustified.map((task) => task.id)).toEqual([]);
	});
});

describe.each(MODELS.map((model) => [model.slug, model] as const))('le modèle %s', (_, model) => {
	it('n’a de guide que pour des niveaux connus', () => {
		expect(model.grades.filter((grade) => !GUIDE_GRADES.includes(grade))).toEqual([]);
	});

	it('ne cite que des tâches qui existent, chacune une seule fois', () => {
		const cited = model.sequences.map((sequence) => sequence.taskId);
		expect(cited.filter((id) => !TASK_IDS.has(id))).toEqual([]);
		expect(new Set(cited).size).toBe(cited.length);
	});

	it('n’a ni séquence vide ni étape vide', () => {
		const empty = model.sequences
			.filter(
				(sequence) =>
					sequence.steps.length === 0 || sequence.steps.some((step) => step.trim() === '')
			)
			.map((sequence) => sequence.taskId);
		expect(empty).toEqual([]);
	});

	it('donne au moins une source https à chaque séquence et à chaque piège', () => {
		const items = [
			...model.sequences.map((sequence) => ({ id: sequence.taskId, sources: sequence.sources })),
			...model.pitfalls.map((pitfall) => ({ id: pitfall.id, sources: pitfall.sources }))
		];
		const unsourced = items
			.filter(
				(item) =>
					item.sources.length === 0 ||
					item.sources.some((source) => !source.url.startsWith('https://'))
			)
			.map((item) => item.id);
		expect(unsourced).toEqual([]);
	});

	it('n’écrit que des touches qu’il déclare', () => {
		const errors: string[] = [];
		for (const step of model.sequences.flatMap((sequence) => sequence.steps)) {
			try {
				parseStep(step, model.keys);
			} catch (cause) {
				errors.push(cause instanceof Error ? cause.message : String(cause));
			}
		}
		expect(errors).toEqual([]);
	});

	it('ne montre une tâche qu’à un niveau où le modèle a un guide', () => {
		const reachable = new Set<GuideGrade>(
			model.grades.flatMap((grade) => [grade, ...ancestorsOf(grade)])
		);
		const unreachable = model.sequences.filter((sequence) => {
			const grade = TASKS.find((task) => task.id === sequence.taskId)?.grade;
			return grade !== undefined && !reachable.has(grade);
		});
		expect(unreachable.map((sequence) => sequence.taskId)).toEqual([]);
	});

	it('couvre toutes les tâches obligatoires de ses niveaux, dès qu’il est rédigé', () => {
		const covered = new Set(model.sequences.map((sequence) => sequence.taskId));
		const missing =
			model.sequences.length === 0
				? [] // modèle « bientôt » : rien de rédigé
				: TASKS.filter(
						(task) =>
							!('optional' in task && task.optional) &&
							(model.grades as readonly string[]).includes(task.grade) &&
							!covered.has(task.id)
					).map((task) => task.id);
		expect(missing).toEqual([]);
	});
});
