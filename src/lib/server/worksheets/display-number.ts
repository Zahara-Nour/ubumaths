/**
 * Le numéro d'un exercice de fiche, tel que l'élève le lit — côté serveur.
 *
 * `worksheet_exercises.position` n'est PAS ce numéro : elle redémarre à 1 dans
 * chaque section. Ce module charge la fiche entière et applique la règle
 * partagée de `$lib/worksheets/exercise-numbering`, celle qu'utilisent déjà la
 * page élève et le générateur PDF.
 *
 * Il existe parce qu'un message envoyé à un élève doit nommer l'exercice comme
 * lui le nomme. Annoncer « ton signalement sur l'exercice 4 » quand sa fiche
 * dit 7 est pire que ne rien dire.
 *
 * @module server/worksheets/display-number
 */

import { orderExercisesForDisplay } from '$lib/worksheets/exercise-numbering';

type Sb = App.Locals['supabase'];

/**
 * Tous les numéros affichés d'une fiche, indexés par identifiant de jonction.
 *
 * Une seule paire de requêtes pour toute la fiche : c'est la forme à préférer
 * dès qu'on traite plusieurs exercices (une liste de signalements, par exemple).
 *
 * @returns une map vide si la fiche est illisible — jamais des numéros faux.
 */
export async function fetchDisplayNumbers(
	supabase: Sb,
	worksheetId: string
): Promise<Map<string, number>> {
	const [{ data: exercises, error: exercisesError }, { data: sections, error: sectionsError }] =
		await Promise.all([
			supabase
				.from('worksheet_exercises')
				.select('id, section_id, position')
				.eq('worksheet_id', worksheetId),
			supabase.from('worksheet_sections').select('id, position').eq('worksheet_id', worksheetId)
		]);

	if (exercisesError || sectionsError) {
		console.error('[display-number] fiche illisible:', exercisesError ?? sectionsError);
		return new Map();
	}

	return new Map(
		orderExercisesForDisplay(exercises ?? [], sections ?? []).map(({ exercise, number }) => [
			exercise.id,
			number
		])
	);
}

/**
 * Numéro affiché d'un exercice dans sa fiche.
 *
 * @returns le numéro 1-based tel qu'affiché, ou `null` si la fiche est illisible
 *          — l'appelant décide alors s'il vaut mieux se taire qu'annoncer un
 *          numéro faux.
 */
export async function fetchDisplayNumber(
	supabase: Sb,
	worksheetId: string,
	worksheetExerciseId: string
): Promise<number | null> {
	const numbers = await fetchDisplayNumbers(supabase, worksheetId);
	return numbers.get(worksheetExerciseId) ?? null;
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
		console.error('[display-number] fiche illisible:', exercisesError ?? sectionsError);
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
