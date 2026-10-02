/**
 * Séries de chapitre — opérations serveur
 * =======================================
 *
 * Un chapitre de « Mon cours » est relié à une SÉRIE (questions de cours,
 * étape 2). La série reste celle du professeur : le lien la SUIT (Q125), son
 * titre et sa composition sont relus à chaque chargement. L'élève la lance dans
 * la forme choisie au rattachement (Q124 a), sans note : le lien est celui de
 * l'entraînement libre (`/automaths/test?categories=…&mode=…`).
 *
 * ⚠️ Toutes ces fonctions passent par le client de la requête, donc SOUS RLS.
 * La RLS échoue en silence (docs/ref/rls-echecs-silencieux.md) : chaque
 * écriture relit ses lignes par `.select()` et vérifie qu'il y en a une.
 *
 * @module server/chapter-series
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { ChapterSeriesForm, ChapterSeriesRow } from '$lib/types/database-helpers';
import type { ChapterSeries } from '$lib/types/chapters';
import { buildSeriesLink, seriesCategoriesSchema, totalQuestions } from '$lib/validation/series';
import { isDeadlinePassed } from '$lib/utils/dates';

// Types
/**
 * Pourquoi une opération n'a pas abouti — c'est ce qui choisit le code HTTP :
 * `not_found` (introuvable, ou refusé par la RLS : zéro ligne) → 404 ;
 * `duplicate` (23505) → 409 ; `series_gone` (23503 : série supprimée
 * entre-temps) → 409 ; `db` → 500.
 */
export type ChapterSeriesErrorKind = 'not_found' | 'duplicate' | 'series_gone' | 'db';

export class ChapterSeriesError extends Error {
	readonly kind: ChapterSeriesErrorKind;

	constructor(kind: ChapterSeriesErrorKind, message: string) {
		super(message);
		this.name = 'ChapterSeriesError';
		this.kind = kind;
	}
}

type Result<T> = { data: T | null; error: ChapterSeriesError | null };

/** Une série du professeur, telle que le sélecteur de rattachement la montre. */
export type AvailableSeries = { id: string; title: string; questionCount: number };

// Constantes
/** Plafond de séries proposées au rattachement (même plafond que les fiches). */
const AVAILABLE_SERIES_LIMIT = 100;

// Functions

function toForm(value: string): ChapterSeriesForm {
	return value === 'interactive' ? 'interactive' : 'flash';
}

/** Ligne de base + série relue → vue applicative, avec son lien de lancement. */
export function toChapterSeries(
	row: ChapterSeriesRow,
	series: { title: string; categories: unknown } | undefined
): ChapterSeries {
	const form = toForm(row.form);
	const categories = series ? seriesCategoriesSchema.safeParse(series.categories) : null;
	if (categories && !categories.success) {
		console.error('[chapter-series] Composition illisible pour la série', row.series_id);
	}
	const lisible = categories?.success ? categories.data : null;

	return {
		id: row.id,
		chapterId: row.chapter_id,
		seriesId: row.series_id,
		form,
		displayOrder: row.display_order,
		sectionId: row.section_id,
		sectionOrder: row.section_order,
		createdAt: row.created_at,
		publishedAt: row.published_at,
		title: series?.title ?? null,
		questionCount: lisible ? totalQuestions(lisible) : 0,
		// Lien RELATIF : la même page sert l'élève connecté, sans origine à deviner.
		launchHref: lisible ? buildSeriesLink('', lisible, { mode: form }) : null
	};
}

/**
 * Les séries d'un chapitre, aux droits de l'appelant.
 *
 * Professeur : toutes (préparées, programmées, publiées). Élève : la RLS ne
 * rend que les rattachements publiés d'un chapitre visible de sa classe, et
 * `student_can_read_series` lui ouvre la série correspondante.
 *
 * Une série que l'appelant ne peut pas relire n'efface PAS le rattachement :
 * elle s'affiche sans titre (`title: null`) plutôt que de disparaître en
 * silence.
 */
export async function listChapterSeries(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<Result<ChapterSeries[]>> {
	const { data: links, error } = await supabase
		.from('chapter_series')
		.select('*')
		.eq('chapter_id', chapterId)
		.order('display_order');

	if (error) {
		console.error('[listChapterSeries] Rattachements illisibles :', error);
		return { data: null, error: new ChapterSeriesError('db', error.message) };
	}
	if (!links || links.length === 0) return { data: [], error: null };

	const seriesIds = [...new Set(links.map((l) => l.series_id))];
	const { data: series, error: seriesError } = await supabase
		.from('series')
		.select('id, title, categories')
		.in('id', seriesIds);

	if (seriesError) {
		console.error('[listChapterSeries] Séries illisibles :', seriesError);
		return { data: null, error: new ChapterSeriesError('db', seriesError.message) };
	}

	const parId = new Map((series ?? []).map((s) => [s.id, s]));
	const manquantes = seriesIds.filter((id) => !parId.has(id));
	if (manquantes.length > 0) {
		// Rattachement lisible, série non : ne devrait pas arriver (mêmes
		// conditions des deux côtés). Le tracer plutôt que de le taire.
		console.error('[listChapterSeries] Séries rattachées mais illisibles :', manquantes);
	}

	return { data: links.map((l) => toChapterSeries(l, parId.get(l.series_id))), error: null };
}

/** Les séries enregistrées du professeur, pour le sélecteur de rattachement. */
export async function listAvailableSeries(
	teacherId: string,
	supabase: SupabaseClient<Database>
): Promise<Result<AvailableSeries[]>> {
	const { data, error } = await supabase
		.from('series')
		.select('id, title, categories')
		.eq('created_by', teacherId)
		.order('updated_at', { ascending: false })
		.limit(AVAILABLE_SERIES_LIMIT);

	if (error) {
		console.error('[listAvailableSeries] Séries illisibles :', error);
		return { data: null, error: new ChapterSeriesError('db', error.message) };
	}

	return {
		data: (data ?? []).map((s) => {
			const categories = seriesCategoriesSchema.safeParse(s.categories);
			return {
				id: s.id,
				title: s.title,
				questionCount: categories.success ? totalQuestions(categories.data) : 0
			};
		}),
		error: null
	};
}

/**
 * Rattache une série au chapitre. Le rattachement naît PRÉPARÉ
 * (`published_at` NULL) : l'élève ne voit rien avant la publication.
 */
export async function linkSeries(
	chapterId: string,
	seriesId: string,
	form: ChapterSeriesForm,
	ownerId: string,
	supabase: SupabaseClient<Database>
): Promise<Result<{ id: string }>> {
	const db = supabase;

	// On ne rattache que SA série. La policy l'exige déjà (WITH CHECK) ; le
	// vérifier ici rend un 404 lisible au lieu d'un refus RLS anonyme.
	const { data: serie, error: serieError } = await supabase
		.from('series')
		.select('id, created_by')
		.eq('id', seriesId)
		.maybeSingle();

	if (serieError) {
		console.error('[linkSeries] Série illisible :', serieError);
		return { data: null, error: new ChapterSeriesError('db', serieError.message) };
	}
	if (!serie || serie.created_by !== ownerId) {
		return { data: null, error: new ChapterSeriesError('not_found', 'Série introuvable') };
	}

	const { data: dernier, error: ordreError } = await db
		.from('chapter_series')
		.select('display_order')
		.eq('chapter_id', chapterId)
		.order('display_order', { ascending: false })
		.limit(1)
		.maybeSingle();

	// Aucune ligne = première série, cas légitime ; toute autre panne se dit.
	if (ordreError) {
		console.error('[linkSeries] Rang suivant illisible :', ordreError);
		return { data: null, error: new ChapterSeriesError('db', ordreError.message) };
	}

	const { data, error } = await db
		.from('chapter_series')
		.insert({
			chapter_id: chapterId,
			series_id: seriesId,
			form,
			display_order: (dernier?.display_order ?? -1) + 1
		})
		.select('id');

	if (error) {
		console.error('[linkSeries] Rattachement impossible :', error);
		const kind: ChapterSeriesErrorKind =
			error.code === '23505' ? 'duplicate' : error.code === '23503' ? 'series_gone' : 'db';
		return { data: null, error: new ChapterSeriesError(kind, error.message) };
	}
	if (!data || data.length !== 1) {
		return { data: null, error: new ChapterSeriesError('not_found', 'Rattachement refusé') };
	}

	return { data: { id: data[0].id }, error: null };
}

/** Change la forme de lancement (flash-cards ou entraînement). */
export async function setSeriesForm(
	chapterId: string,
	chapterSeriesId: string,
	form: ChapterSeriesForm,
	supabase: SupabaseClient<Database>
): Promise<{ error: ChapterSeriesError | null }> {
	const { data, error } = await supabase
		.from('chapter_series')
		.update({ form })
		.eq('id', chapterSeriesId)
		.eq('chapter_id', chapterId)
		.select('id');

	if (error) {
		console.error('[setSeriesForm] Écriture impossible :', error);
		return { error: new ChapterSeriesError('db', error.message) };
	}
	// Zéro ligne : introuvable, ou refusé par la RLS — dans les deux cas, rien
	// n'a changé, et il faut le dire.
	if (!data || data.length !== 1) {
		return { error: new ChapterSeriesError('not_found', 'Série introuvable dans ce chapitre') };
	}
	return { error: null };
}

/**
 * Retire la série du chapitre (S4). La série elle-même reste : seul le
 * rattachement disparaît.
 */
export async function unlinkSeries(
	chapterId: string,
	chapterSeriesId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: ChapterSeriesError | null }> {
	const { data, error } = await supabase
		.from('chapter_series')
		.delete()
		.eq('id', chapterSeriesId)
		.eq('chapter_id', chapterId)
		.select('id');

	if (error) {
		console.error('[unlinkSeries] Suppression impossible :', error);
		return { error: new ChapterSeriesError('db', error.message) };
	}
	if (!data || data.length !== 1) {
		return { error: new ChapterSeriesError('not_found', 'Série introuvable dans ce chapitre') };
	}
	return { error: null };
}

/**
 * Q129 (b) : une évaluation NON TERMINÉE n'est ni archivée (clôturée), ni
 * passée sa date limite. Brouillon = à venir ; publiée = en cours.
 */
export function isEvaluationUnfinished(evaluation: {
	status: string;
	deadline: string | null;
}): boolean {
	return evaluation.status !== 'archived' && !isDeadlinePassed(evaluation.deadline);
}

/**
 * La série est-elle aussi celle d'une évaluation non terminée ? Le rattacher
 * reste permis (Q129 b), mais le professeur doit savoir que ses élèves
 * pourront s'entraîner dessus avant l'évaluation.
 */
export async function findOngoingEvaluation(
	seriesId: string,
	supabase: SupabaseClient<Database>
): Promise<Result<boolean>> {
	const { data, error } = await supabase
		.from('evaluations')
		.select('status, deadline')
		.eq('series_id', seriesId);

	if (error) {
		console.error('[findOngoingEvaluation] Évaluations illisibles :', error);
		return { data: null, error: new ChapterSeriesError('db', error.message) };
	}

	return { data: (data ?? []).some(isEvaluationUnfinished), error: null };
}
