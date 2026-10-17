/**
 * Le numéro d'un exercice de fiche, tel que l'élève le lit — côté serveur.
 *
 * `worksheet_exercises.position` n'est PAS ce numéro : elle redémarre à 1 dans
 * chaque section, et une fiche qui mélange ses exercices donne à chaque copie
 * son ordre. Ce module charge la fiche entière et applique la règle partagée
 * (`$lib/worksheets/exercise-numbering`, et pour une copie d'affectation
 * `copyDisplayNumbers`), celle de la page élève et du générateur PDF.
 *
 * Il existe parce qu'un message envoyé à un élève doit nommer l'exercice comme
 * lui le nomme. Annoncer « ton signalement sur l'exercice 4 » quand sa fiche
 * dit 7 est pire que ne rien dire.
 *
 * @module server/worksheets/display-number
 */

import { orderExercisesForDisplay } from '$lib/worksheets/exercise-numbering';
import { assignmentCopyScope, copyDisplayNumbers } from '$lib/worksheets/worksheet-copy';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/worksheets/display-number');

type Sb = App.Locals['supabase'];

/** Le numéro d'un exercice dans la copie d'un élève, pour une affectation */
export interface CopyNumbering {
	/**
	 * Numéro 1-based de l'exercice de fiche dans la copie de CET élève pour
	 * CETTE affectation, ou `null` : fiche ou affectation illisible,
	 * affectation d'une autre fiche, exercice absent. L'appelant se tait
	 * plutôt que d'annoncer un numéro faux.
	 */
	numberOf(assignmentId: string, studentId: string, worksheetExerciseId: string): number | null;
}

/**
 * Les numéros des copies d'une fiche, tels que chaque élève les lit (D6).
 *
 * Ordre de la copie compris : une fiche qui mélange ses exercices donne à
 * chaque élève (affectation individualisée) ou à la classe son propre ordre.
 * Même calcul que la copie (`copyDisplayNumbers`). Quatre lectures pour toute
 * la fiche, quel que soit le nombre de signalements. Appelée par le prof (fiche
 * possédée, routes qui le vérifient) et par l'élève (avec son propre
 * `user.id` : l'appelant garantit l'identité, un élève ne demande jamais le
 * numéro d'un autre) ; lectures soumises à la RLS de l'appelant.
 */
export async function fetchCopyNumbering(
	supabase: Sb,
	worksheetId: string,
	assignmentIds: readonly string[]
): Promise<CopyNumbering> {
	const none: CopyNumbering = { numberOf: () => null };
	const ids = [...new Set(assignmentIds)];
	if (ids.length === 0) return none;

	const [worksheetResult, exercisesResult, sectionsResult, assignmentsResult] = await Promise.all([
		supabase.from('worksheets').select('config').eq('id', worksheetId).single(),
		supabase
			.from('worksheet_exercises')
			.select('id, section_id, position')
			.eq('worksheet_id', worksheetId),
		supabase.from('worksheet_sections').select('id, position').eq('worksheet_id', worksheetId),
		supabase
			.from('worksheet_assignments')
			.select('id, worksheet_id, guidance_level, individualized')
			.eq('worksheet_id', worksheetId)
			.in('id', ids)
	]);

	const failure =
		worksheetResult.error ??
		exercisesResult.error ??
		sectionsResult.error ??
		assignmentsResult.error;
	if (failure || !worksheetResult.data) {
		logger.error('[display-number] fiche illisible:', failure);
		return none;
	}

	const config = worksheetResult.data.config;
	const exercises = exercisesResult.data ?? [];
	const sections = sectionsResult.data ?? [];
	const assignments = new Map((assignmentsResult.data ?? []).map((a) => [a.id, a]));
	const cache = new Map<string, Map<string, number>>();

	return {
		numberOf(assignmentId, studentId, worksheetExerciseId) {
			const assignment = assignments.get(assignmentId);
			if (!assignment) return null;
			const key = `${assignmentId}:${studentId}`;
			let numbers = cache.get(key);
			if (!numbers) {
				numbers = copyDisplayNumbers(
					exercises,
					sections,
					assignmentCopyScope(assignment, { studentId }),
					config
				);
				cache.set(key, numbers);
			}
			return numbers.get(worksheetExerciseId) ?? null;
		}
	};
}

/** Ce qu'une sélection a permis de désigner, et ce qu'elle a raté. */
export interface ResolvedSelection {
	/** Identifiants d'exercices (`exercises.id`) désignés par les numéros. */
	exerciseIds: string[];
	/** Numéros demandés qui n'existent pas dans la fiche. */
	introuvables: number[];
}

/**
 * Les exercices désignés par des NUMÉROS AFFICHÉS dans une fiche.
 *
 * C'est la résolution dont dépend `[[worksheet:<uuid>#3,5-7]]` : la référence
 * porte des numéros, la couverture du programme a besoin d'exercices.
 *
 * Les numéros absents sont RENDUS plutôt qu'ignorés en silence : citer un
 * exercice qui n'existe pas est une faute de frappe qu'il vaut mieux signaler
 * au professeur au moment où il enregistre.
 */
export async function resolveExercisesAtDisplayNumbers(
	supabase: Sb,
	worksheetId: string,
	numeros: readonly number[]
): Promise<ResolvedSelection> {
	if (numeros.length === 0) return { exerciseIds: [], introuvables: [] };

	const [{ data: exercises, error: exercisesError }, { data: sections, error: sectionsError }] =
		await Promise.all([
			supabase
				.from('worksheet_exercises')
				.select('id, section_id, position, exercise_id')
				.eq('worksheet_id', worksheetId),
			supabase.from('worksheet_sections').select('id, position').eq('worksheet_id', worksheetId)
		]);

	if (exercisesError || sectionsError) {
		logger.error('[display-number] fiche illisible:', exercisesError ?? sectionsError);
		return { exerciseIds: [], introuvables: [...numeros] };
	}

	const byNumber = new Map(
		orderExercisesForDisplay(exercises ?? [], sections ?? []).map(({ exercise, number }) => [
			number,
			exercise.exercise_id
		])
	);

	const exerciseIds: string[] = [];
	const introuvables: number[] = [];
	for (const numero of numeros) {
		const trouve = byNumber.get(numero);
		if (trouve) exerciseIds.push(trouve);
		else introuvables.push(numero);
	}

	return { exerciseIds, introuvables };
}
