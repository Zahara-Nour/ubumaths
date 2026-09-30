/**
 * Séries (chantier 4) : enregistrer, lire, modifier, dupliquer, supprimer.
 *
 * Le VERROU (Q24) est tenu par la base : dès qu'une séance d'élève est rattachée
 * à une évaluation de la série, toute modification ou suppression lève
 * SQLSTATE `UBS01`. Ce module ne fait que traduire cette erreur en français ; le
 * drapeau `locked` qu'il calcule sert à l'affichage, jamais de garde.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '$lib/types/database';
import { toJson } from '$lib/types/database-helpers';
import type { DbSeries, SeriesWithUsage } from '$lib/types/evaluation';
import { seriesCategoriesSchema } from '$lib/validation/series';
import type { CreateSeriesInput, UpdateSeriesInput } from '$lib/server/validation/evaluations';

type TypedSupabaseClient = SupabaseClient<Database>;

/** SQLSTATE du verrou de série (migration 20260930130000) */
export const SERIES_LOCKED_SQLSTATE = 'UBS01';
/** Violation de clé étrangère : la série est encore utilisée */
const FOREIGN_KEY_VIOLATION = '23503';

export const SERIES_LOCKED_UPDATE_MESSAGE =
	'Cette série a déjà été commencée par un élève : duplique-la pour la modifier';
export const SERIES_LOCKED_DELETE_MESSAGE =
	'Cette série a déjà été commencée par un élève : elle ne peut plus être supprimée';
export const SERIES_IN_USE_MESSAGE =
	'Cette série est utilisée par une évaluation : elle ne peut pas être supprimée. Duplique-la pour en faire une autre.';
export const SERIES_NOT_FOUND_MESSAGE = 'Série introuvable';

const MAX_TITLE_LENGTH = 200;
const COPY_PREFIX = 'Copie de ';

/** Échec d'une opération sur une série, avec le code HTTP à rendre */
export class SeriesError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'SeriesError';
	}
}

/**
 * Traduit une erreur Postgres d'écriture sur une série. Tout code inconnu reste
 * une panne (500) : on ne le déguise pas en refus métier.
 */
export function mapSeriesWriteError(
	error: { code?: string; message?: string },
	operation: 'update' | 'delete'
): SeriesError {
	if (error.code === SERIES_LOCKED_SQLSTATE) {
		return new SeriesError(
			409,
			operation === 'update' ? SERIES_LOCKED_UPDATE_MESSAGE : SERIES_LOCKED_DELETE_MESSAGE
		);
	}
	if (error.code === FOREIGN_KEY_VIOLATION && operation === 'delete') {
		return new SeriesError(409, SERIES_IN_USE_MESSAGE);
	}
	return new SeriesError(500, 'Enregistrement impossible, réessaie dans un instant');
}

/**
 * Ligne `series` → `DbSeries`. Les catégories sont relues avec le schéma de la
 * composition : une ligne dont le JSON ne le respecte pas rend une liste vide
 * plutôt que de faire planter l'écran.
 */
export function toDbSeries(row: Tables<'series'>): DbSeries {
	const categories = seriesCategoriesSchema.safeParse(row.categories);
	if (!categories.success) {
		console.error('[series] Catégories illisibles pour la série', row.id);
	}
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		grade: row.grade,
		categories: categories.success ? categories.data : [],
		created_by: row.created_by,
		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

/** Titre d'une copie, tronqué à la longueur autorisée */
export function copyTitle(title: string): string {
	return `${COPY_PREFIX}${title}`.slice(0, MAX_TITLE_LENGTH);
}

// ===========================================================================
// LECTURE
// ===========================================================================

export async function getSeries(
	supabase: TypedSupabaseClient,
	seriesId: string
): Promise<DbSeries | null> {
	const { data, error } = await supabase
		.from('series')
		.select('*')
		.eq('id', seriesId)
		.maybeSingle();

	if (error) {
		console.error('[getSeries] Lecture impossible :', error);
		throw new SeriesError(500, 'Impossible de charger la série');
	}
	return data ? toDbSeries(data) : null;
}

/**
 * Séries d'un professeur, avec le nombre d'évaluations qui les utilisent et le
 * verrou (une séance d'élève existe sur l'une d'elles).
 */
export async function getTeacherSeries(
	supabase: TypedSupabaseClient,
	teacherId: string
): Promise<SeriesWithUsage[]> {
	const { data: rows, error } = await supabase
		.from('series')
		.select('*')
		.eq('created_by', teacherId)
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('[getTeacherSeries] Séries illisibles :', error);
		throw new SeriesError(500, 'Impossible de charger les séries');
	}
	const series = (rows ?? []).map(toDbSeries);
	if (series.length === 0) return [];

	const { data: evaluations, error: evaluationsError } = await supabase
		.from('evaluations')
		.select('id, series_id')
		.in(
			'series_id',
			series.map((s) => s.id)
		);

	if (evaluationsError) {
		console.error('[getTeacherSeries] Évaluations illisibles :', evaluationsError);
		throw new SeriesError(500, 'Impossible de charger les séries');
	}

	const seriesOfEvaluation = new Map((evaluations ?? []).map((e) => [e.id, e.series_id]));
	const evaluationsCount = new Map<string, number>();
	for (const evaluation of evaluations ?? []) {
		evaluationsCount.set(
			evaluation.series_id,
			(evaluationsCount.get(evaluation.series_id) ?? 0) + 1
		);
	}

	const lockedSeries = new Set<string>();
	if (seriesOfEvaluation.size > 0) {
		const { data: sessions, error: sessionsError } = await supabase
			.from('test_sessions')
			.select('evaluation_id')
			.in('evaluation_id', [...seriesOfEvaluation.keys()]);

		// Le verrou affiché n'est qu'une indication (la base refuse de toute façon) ;
		// une panne ici ne doit pas masquer les séries, mais elle se journalise.
		if (sessionsError) {
			console.error('[getTeacherSeries] Séances illisibles :', sessionsError);
		}
		for (const session of sessions ?? []) {
			const seriesId = session.evaluation_id
				? seriesOfEvaluation.get(session.evaluation_id)
				: undefined;
			if (seriesId) lockedSeries.add(seriesId);
		}
	}

	return series.map((s) => ({
		...s,
		locked: lockedSeries.has(s.id),
		evaluations_count: evaluationsCount.get(s.id) ?? 0
	}));
}

// ===========================================================================
// ÉCRITURE
// ===========================================================================

/** Enregistrer une série (B11) */
export async function createSeries(
	supabase: TypedSupabaseClient,
	input: CreateSeriesInput,
	userId: string
): Promise<DbSeries> {
	const { data, error } = await supabase
		.from('series')
		.insert({
			title: input.title,
			grade: input.grade,
			description: input.description ?? null,
			categories: toJson(input.categories),
			created_by: userId
		})
		.select()
		.single();

	if (error || !data) {
		console.error('[createSeries] Insertion impossible :', error);
		throw new SeriesError(500, "La série n'a pas pu être enregistrée");
	}
	return toDbSeries(data);
}

/** Modifier une série (refusée par la base si elle est verrouillée) */
export async function updateSeries(
	supabase: TypedSupabaseClient,
	seriesId: string,
	input: UpdateSeriesInput
): Promise<DbSeries> {
	const update: Database['public']['Tables']['series']['Update'] = {};
	if (input.title !== undefined) update.title = input.title;
	if (input.grade !== undefined) update.grade = input.grade;
	if (input.description !== undefined) update.description = input.description;
	if (input.categories !== undefined) update.categories = toJson(input.categories);

	// `.select()` : un refus RLS rend zéro ligne, sans erreur
	const { data, error } = await supabase.from('series').update(update).eq('id', seriesId).select();

	if (error) {
		if (error.code !== SERIES_LOCKED_SQLSTATE) {
			console.error('[updateSeries] Écriture impossible :', error);
		}
		throw mapSeriesWriteError(error, 'update');
	}
	if (!data || data.length === 0) {
		throw new SeriesError(404, SERIES_NOT_FOUND_MESSAGE);
	}
	return toDbSeries(data[0]);
}

/**
 * Dupliquer une série (B12) : « Copie de <titre> », jamais verrouillée
 * puisqu'aucune évaluation ne l'utilise encore.
 */
export async function duplicateSeries(
	supabase: TypedSupabaseClient,
	seriesId: string,
	userId: string
): Promise<DbSeries> {
	const original = await getSeries(supabase, seriesId);
	if (!original) {
		throw new SeriesError(404, SERIES_NOT_FOUND_MESSAGE);
	}
	if (original.categories.length === 0) {
		throw new SeriesError(400, 'Cette série ne contient aucune question lisible');
	}

	return createSeries(
		supabase,
		{
			title: copyTitle(original.title),
			grade: original.grade as CreateSeriesInput['grade'],
			description: original.description,
			categories: original.categories
		},
		userId
	);
}

/** Supprimer une série (refusée si verrouillée ou utilisée par une évaluation) */
export async function deleteSeries(supabase: TypedSupabaseClient, seriesId: string): Promise<void> {
	const { data, error } = await supabase.from('series').delete().eq('id', seriesId).select('id');

	if (error) {
		if (error.code !== SERIES_LOCKED_SQLSTATE && error.code !== FOREIGN_KEY_VIOLATION) {
			console.error('[deleteSeries] Suppression impossible :', error);
		}
		throw mapSeriesWriteError(error, 'delete');
	}
	if (!data || data.length === 0) {
		throw new SeriesError(404, SERIES_NOT_FOUND_MESSAGE);
	}
}
