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
import type { Database, Json } from '#lib/types/database.ts';
import type {
	ExerciseVersionContent,
	ExerciseVersionRead,
	ExerciseVersionSummary
} from '#lib/types/database-helpers.ts';

export type { ExerciseVersionContent, ExerciseVersionRead, ExerciseVersionSummary };
import { createServerLogger } from '#lib/utils/logger.ts';

// ============================================================================
// TYPES
// ============================================================================

// ExerciseVersionContent, ExerciseVersionRead, ExerciseVersionSummary : database-helpers.ts (règle 6)

/** Une fiche qui utilise une version, et ses affectations en cours */
export interface VersionWorksheetUsage {
	id: string;
	title: string;
	active_assignments: number;
}

export type ExerciseVersionWithUsage = ExerciseVersionSummary & {
	worksheets: VersionWorksheetUsage[];
};

export type DeleteVersionResult =
	| { deleted: true }
	| { deleted: false; reason: 'not_found' | 'only_version' }
	| { deleted: false; reason: 'in_use'; worksheets: string[] };

// ============================================================================
// CONSTANTES
// ============================================================================

const VERSION_COLUMNS = 'id, number, exercise_id, variations, shared, generic_functions';

/** Ce que l'éditeur montre d'une version, sans son contenu */
const SUMMARY_COLUMNS = 'id, number, note, created_at, updated_at';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

/**
 * Jointure PostgREST d'une ligne de fiche vers SA version, à placer dans le `select` d'une requête
 * sur `worksheet_exercises`. Une jointure est une CHAÎNE, invisible au typecheck : elle est prouvée
 * par les tests d'intégration (tests/integration/versions-exercices-lectures.test.ts).
 */
export const WORKSHEET_LINE_VERSION =
	'version:exercise_versions!worksheet_exercises_exercise_version_fkey(id, number, variations, shared, generic_functions)';

/** Exercices par appel : au plus autant de lignes rendues, loin de la limite de PostgREST. */
const IDS_PER_QUERY = 500;

const logger = createServerLogger('server/exercise-versions');

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
 * La dernière version de chaque exercice demandé, calculée par la base
 * (`latest_exercise_versions` : une ligne par exercice, jamais tronquée par la limite de lignes de
 * PostgREST). Un exercice sans aucune version lisible est ABSENT de la carte : à l'appelant de le
 * traiter (toute création écrit la v1, la reprise aussi).
 */
export async function fetchLatestVersions(
	supabase: SupabaseClient<Database>,
	exerciseIds: readonly string[]
): Promise<Map<string, ExerciseVersionRead>> {
	const latest = new Map<string, ExerciseVersionRead>();
	const ids = [...new Set(exerciseIds)];
	for (let start = 0; start < ids.length; start += IDS_PER_QUERY) {
		const { data, error } = await supabase
			.rpc('latest_exercise_versions', { p_exercise_ids: ids.slice(start, start + IDS_PER_QUERY) })
			.select(VERSION_COLUMNS);
		if (error) throw new Error(`Versions illisibles : ${error.message}`);
		for (const version of data ?? []) latest.set(version.exercise_id, version);
	}
	return latest;
}

/**
 * Les exercices, chacun avec le contenu de sa DERNIÈRE version (lecture hors fiche).
 * Un exercice sans version est une incohérence de la base : il est écarté de la liste et
 * journalisé, pour qu'un seul exercice cassé ne fasse pas tomber toute une liste.
 */
export async function withLatestVersions<T extends { id: string }>(
	supabase: SupabaseClient<Database>,
	exercises: readonly T[]
): Promise<(T & ExerciseVersionContent)[]> {
	const latest = await fetchLatestVersions(
		supabase,
		exercises.map((e) => e.id)
	);
	const withContent: (T & ExerciseVersionContent)[] = [];
	for (const exercise of exercises) {
		const version = latest.get(exercise.id);
		if (!version) {
			logger.error(`Exercice ${exercise.id} sans version lisible : écarté de la liste`);
			continue;
		}
		withContent.push(withVersionContent(exercise, version));
	}
	return withContent;
}

/** Un exercice avec le contenu de sa DERNIÈRE version (lecture hors fiche). */
export async function withLatestVersion<T extends { id: string }>(
	supabase: SupabaseClient<Database>,
	exercise: T
): Promise<T & ExerciseVersionContent> {
	const [withContent] = await withLatestVersions(supabase, [exercise]);
	if (!withContent) throw new Error(`Exercice ${exercise.id} sans version lisible`);
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

/**
 * Écrit ENSEMBLE la fiche d'identité d'un exercice et le contenu d'une de ses versions (la
 * dernière sans `versionId`) : tout ou rien (`save_exercise_with_version`, droits de l'appelant).
 * Une clé d'identité qui n'est pas une colonne d'`exercises` est refusée par la base (22023).
 */
export async function saveExerciseWithVersion(
	supabase: SupabaseClient<Database>,
	exerciseId: string,
	identity: Record<string, unknown>,
	content: Partial<ExerciseVersionContent>,
	versionId?: string
): Promise<ExerciseVersionRead> {
	// `updated_at` est toujours écrit par la fonction : la clé ne lui est pas passée
	const { updated_at: _updatedAt, ...writableIdentity } = identity;
	const { data, error } = await supabase
		.rpc('save_exercise_with_version', {
			p_exercise_id: exerciseId,
			p_identity: writableIdentity as Json,
			p_content: content as Json,
			...(versionId ? { p_version_id: versionId } : {})
		})
		.select(VERSION_COLUMNS)
		.single();
	if (error) throw error;
	return data;
}

/**
 * « Nouvelle version » : recopie de la DERNIÈRE version, numéro suivant, note facultative
 * (ADR 0044 point 2). Deux créations simultanées : la seconde bute sur l'unicité du numéro
 * (23505) et réessaie une fois avec le numéro suivant.
 */
export async function createNextVersion(
	supabase: SupabaseClient<Database>,
	exerciseId: string,
	note: string | null
): Promise<ExerciseVersionSummary> {
	for (let attempt = 0; ; attempt++) {
		const { data, error } = await supabase
			.rpc('create_exercise_version', {
				p_exercise_id: exerciseId,
				...(note ? { p_note: note } : {})
			})
			.select(SUMMARY_COLUMNS)
			.single();
		if (!error) return data;
		if (error.code === UNIQUE_VIOLATION && attempt === 0) continue;
		throw error;
	}
}

/**
 * Les versions d'un exercice, par numéro croissant, chacune avec les fiches qui l'utilisent et
 * leurs affectations en cours (bandeau de l'éditeur, refus de suppression).
 */
export async function listVersionsWithUsage(
	supabase: SupabaseClient<Database>,
	exerciseId: string
): Promise<ExerciseVersionWithUsage[]> {
	const [versionsResult, linesResult] = await Promise.all([
		supabase
			.from('exercise_versions')
			.select(SUMMARY_COLUMNS)
			.eq('exercise_id', exerciseId)
			.order('number'),
		supabase
			.from('worksheet_exercises')
			.select(
				'exercise_version_id, worksheet:worksheets!inner(id, title, assignments:worksheet_assignments(status))'
			)
			.eq('exercise_id', exerciseId)
	]);
	if (versionsResult.error)
		throw new Error(`Versions illisibles : ${versionsResult.error.message}`);
	if (linesResult.error) throw new Error(`Fiches illisibles : ${linesResult.error.message}`);

	const usage = new Map<string, Map<string, VersionWorksheetUsage>>();
	for (const line of linesResult.data ?? []) {
		const worksheet = line.worksheet;
		const byWorksheet = usage.get(line.exercise_version_id) ?? new Map();
		byWorksheet.set(worksheet.id, {
			id: worksheet.id,
			title: worksheet.title,
			active_assignments: (worksheet.assignments ?? []).filter((a) => a.status === 'active').length
		});
		usage.set(line.exercise_version_id, byWorksheet);
	}
	return (versionsResult.data ?? []).map((version) => ({
		...version,
		worksheets: [...(usage.get(version.id)?.values() ?? [])].sort((a, b) =>
			a.title.localeCompare(b.title, 'fr')
		)
	}));
}

/** Change la note d'une version (vide = pas de note). `.select()` : un refus RLS rend 0 ligne. */
export async function setVersionNote(
	supabase: SupabaseClient<Database>,
	exerciseId: string,
	versionId: string,
	note: string | null
): Promise<ExerciseVersionSummary | null> {
	const { data, error } = await supabase
		.from('exercise_versions')
		.update({ note: note?.trim() ? note.trim() : null })
		.eq('id', versionId)
		.eq('exercise_id', exerciseId)
		.select(SUMMARY_COLUMNS);
	if (error) throw new Error(`Note non modifiée : ${error.message}`);
	return data?.[0] ?? null;
}

/**
 * Supprime une version (ADR 0044 point 8) : refusée si une fiche l'utilise (le refus nomme les
 * fiches) ou si c'est la seule version de l'exercice. La base refuse aussi une version pointée
 * par une fiche que l'appelant ne lit pas (clé étrangère, 23503).
 */
export async function deleteVersion(
	supabase: SupabaseClient<Database>,
	exerciseId: string,
	versionId: string
): Promise<DeleteVersionResult> {
	const versions = await listVersionsWithUsage(supabase, exerciseId);
	const target = versions.find((v) => v.id === versionId);
	if (!target) return { deleted: false, reason: 'not_found' };
	if (target.worksheets.length > 0) {
		return { deleted: false, reason: 'in_use', worksheets: target.worksheets.map((w) => w.title) };
	}
	if (versions.length === 1) return { deleted: false, reason: 'only_version' };

	const { data, error } = await supabase
		.from('exercise_versions')
		.delete()
		.eq('id', versionId)
		.eq('exercise_id', exerciseId)
		.select('id');
	if (error?.code === FOREIGN_KEY_VIOLATION) {
		return { deleted: false, reason: 'in_use', worksheets: [] };
	}
	if (error) throw new Error(`Version non supprimée : ${error.message}`);
	if (!data || data.length !== 1) return { deleted: false, reason: 'not_found' };
	return { deleted: true };
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
