/**
 * Versions d'un exercice (ADR 0044) : le SEUL endroit qui lit ou écrit le contenu d'une version
 * ==============================================================================================
 *
 * Le contenu d'un exercice (niveaux de guidage dans `variations`, valeurs communes dans `shared`,
 * fonctions de l'exercice dans `generic_functions`) vit dans `exercise_versions`, pas sur la ligne
 * d'`exercises`, qui ne garde que la fiche d'identité (titre, notion, étiquettes, « public »…).
 *
 * - Hors fiche (page publique, exercice affecté sans fiche, liste du prof) : la DERNIÈRE version
 *   (plus grand numéro) → `withLatestVersions` / `withLatestVersion`.
 * - Dans une fiche : la version de la ligne (`worksheet_exercises.exercise_version_id`), lue par la
 *   jointure `WORKSHEET_LINE_VERSION` → `withVersionContent`.
 *
 * ⚠️ Jusqu'à la PR 4, `exercises` garde ses anciennes colonnes de contenu (figées à la reprise) :
 * un `select('*')` sur `exercises` les rend encore. Elles ne disent plus rien : toute lecture du
 * contenu passe par ce module.
 *
 * @module server/exercise-versions
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '#lib/types/database.ts';

// ============================================================================
// TYPES
// ============================================================================

type VersionRow = Tables<'exercise_versions'>;

/** Le contenu d'une version : ce qui change d'une version à l'autre. */
export type ExerciseVersionContent = Pick<
	VersionRow,
	'variations' | 'shared' | 'generic_functions'
>;

/** Une version telle que les lectures la rendent. */
export type ExerciseVersionRead = Pick<VersionRow, 'id' | 'number' | 'exercise_id'> &
	ExerciseVersionContent;

// ============================================================================
// CONSTANTES
// ============================================================================

const VERSION_COLUMNS = 'id, number, exercise_id, variations, shared, generic_functions';

/**
 * Jointure PostgREST d'une ligne de fiche vers SA version, à placer dans le `select` d'une requête
 * sur `worksheet_exercises`. Une jointure est une CHAÎNE, invisible au typecheck : elle est prouvée
 * par les tests d'intégration (tests/integration/versions-exercices-lectures.test.ts).
 */
export const WORKSHEET_LINE_VERSION =
	'version:exercise_versions!worksheet_exercises_exercise_version_fkey(id, number, variations, shared, generic_functions)';

/** Au-delà, l'adresse de la requête `in.(…)` devient trop longue pour PostgREST. */
const IDS_PER_QUERY = 100;

// ============================================================================
// FONCTIONS — LECTURE
// ============================================================================

/** Remplace le contenu d'un exercice par celui d'une version (le reste ne bouge pas). */
export function withVersionContent<T extends object>(
	exercise: T,
	version: ExerciseVersionContent
): T & ExerciseVersionContent {
	return {
		...exercise,
		variations: version.variations,
		shared: version.shared,
		generic_functions: version.generic_functions
	};
}

/**
 * Une ligne de fiche lue avec `exercise:exercises(…)` ET `WORKSHEET_LINE_VERSION` : l'exercice
 * reçoit le contenu de la version de la ligne, la clé `version` disparaît. Un exercice lisible
 * dont la version ne l'est pas est une incohérence (même RLS) : erreur, pas un exercice vide.
 */
export function withLineVersion<
	L extends { exercise: object | null; version: ExerciseVersionContent | null }
>(
	line: L
): Omit<L, 'version' | 'exercise'> & {
	exercise: (NonNullable<L['exercise']> & ExerciseVersionContent) | null;
} {
	const { version, exercise, ...rest } = line;
	if (!exercise) return { ...rest, exercise: null };
	if (!version) throw new Error('Ligne de fiche : exercice lisible, version illisible');
	return {
		...rest,
		exercise: withVersionContent(exercise as NonNullable<L['exercise']>, version)
	};
}

/**
 * La dernière version de chaque exercice demandé. Un exercice sans aucune version lisible est
 * ABSENT de la carte : à l'appelant de le traiter (toute création écrit la v1, la reprise aussi).
 */
export async function fetchLatestVersions(
	supabase: SupabaseClient<Database>,
	exerciseIds: readonly string[]
): Promise<Map<string, ExerciseVersionRead>> {
	const latest = new Map<string, ExerciseVersionRead>();
	const ids = [...new Set(exerciseIds)];
	for (let start = 0; start < ids.length; start += IDS_PER_QUERY) {
		const { data, error } = await supabase
			.from('exercise_versions')
			.select(VERSION_COLUMNS)
			.in('exercise_id', ids.slice(start, start + IDS_PER_QUERY))
			.order('number', { ascending: false });
		if (error) throw new Error(`Versions illisibles : ${error.message}`);
		for (const version of data ?? []) {
			// Tri décroissant : la première vue est la dernière version
			if (!latest.has(version.exercise_id)) latest.set(version.exercise_id, version);
		}
	}
	return latest;
}

/**
 * Les exercices, chacun avec le contenu de sa DERNIÈRE version (lecture hors fiche).
 * Un exercice sans version est une incohérence de la base : erreur, pas un exercice vide.
 */
export async function withLatestVersions<T extends { id: string }>(
	supabase: SupabaseClient<Database>,
	exercises: readonly T[]
): Promise<(T & ExerciseVersionContent)[]> {
	const latest = await fetchLatestVersions(
		supabase,
		exercises.map((e) => e.id)
	);
	return exercises.map((exercise) => {
		const version = latest.get(exercise.id);
		if (!version) throw new Error(`Exercice ${exercise.id} sans version lisible`);
		return withVersionContent(exercise, version);
	});
}

/** Un exercice avec le contenu de sa DERNIÈRE version (lecture hors fiche). */
export async function withLatestVersion<T extends { id: string }>(
	supabase: SupabaseClient<Database>,
	exercise: T
): Promise<T & ExerciseVersionContent> {
	const [withContent] = await withLatestVersions(supabase, [exercise]);
	return withContent;
}

/** L'identifiant de la dernière version d'un exercice (une ligne de fiche neuve la prend). */
export async function latestVersionId(
	supabase: SupabaseClient<Database>,
	exerciseId: string
): Promise<string | null> {
	const version = (await fetchLatestVersions(supabase, [exerciseId])).get(exerciseId);
	return version?.id ?? null;
}

// ============================================================================
// FONCTIONS — ÉCRITURE
// ============================================================================

/**
 * Crée la version 1 d'un exercice qui vient d'être créé.
 * `.select()` : un refus RLS ne rend pas d'erreur mais zéro ligne.
 */
export async function createFirstVersion(
	supabase: SupabaseClient<Database>,
	exerciseId: string,
	content: Partial<ExerciseVersionContent>,
	createdBy: string
): Promise<ExerciseVersionRead> {
	const { data, error } = await supabase
		.from('exercise_versions')
		.insert({
			exercise_id: exerciseId,
			number: 1,
			created_by: createdBy,
			variations: content.variations ?? null,
			shared: content.shared ?? null,
			generic_functions: content.generic_functions ?? null
		})
		.select(VERSION_COLUMNS);
	if (error) throw new Error(`Version 1 non créée : ${error.message}`);
	if (!data || data.length !== 1) throw new Error('Version 1 non créée (0 ligne)');
	return data[0];
}

/**
 * Modifie sur place le contenu d'une version (ADR 0044 point 3 : une version reste modifiable).
 * Sans `versionId`, la DERNIÈRE version. Seuls les champs donnés changent.
 */
export async function writeVersionContent(
	supabase: SupabaseClient<Database>,
	exerciseId: string,
	content: Partial<ExerciseVersionContent>,
	versionId?: string
): Promise<ExerciseVersionRead> {
	const targetId = versionId ?? (await latestVersionId(supabase, exerciseId));
	if (!targetId) throw new Error(`Exercice ${exerciseId} sans version lisible`);

	const changes: Partial<ExerciseVersionContent> = {};
	if (content.variations !== undefined) changes.variations = content.variations;
	if (content.shared !== undefined) changes.shared = content.shared;
	if (content.generic_functions !== undefined)
		changes.generic_functions = content.generic_functions;

	const { data, error } = await supabase
		.from('exercise_versions')
		.update(changes)
		.eq('id', targetId)
		// La version doit être celle de CET exercice (un identifiant venu d'ailleurs ne passe pas)
		.eq('exercise_id', exerciseId)
		.select(VERSION_COLUMNS);
	if (error) throw new Error(`Version non modifiée : ${error.message}`);
	if (!data || data.length !== 1) throw new Error('Version non modifiée (0 ligne)');
	return data[0];
}

/** Retire de `row` les champs de contenu, qui ne s'écrivent plus sur `exercises`. */
export function splitVersionContent<T extends object>(
	row: T
): { identity: Omit<T, keyof ExerciseVersionContent>; content: Partial<ExerciseVersionContent> } {
	const { variations, shared, generic_functions, ...identity } = row as T &
		Partial<ExerciseVersionContent>;
	const content: Partial<ExerciseVersionContent> = {};
	if (variations !== undefined) content.variations = variations;
	if (shared !== undefined) content.shared = shared;
	if (generic_functions !== undefined) content.generic_functions = generic_functions;
	return { identity: identity as Omit<T, keyof ExerciseVersionContent>, content };
}
