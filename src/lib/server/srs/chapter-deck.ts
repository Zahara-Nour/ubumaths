/**
 * Paquet de révision CALCULÉ d'un chapitre (questions de cours, étape 3)
 * =====================================================================
 *
 * Pas de copie par élève (Q112) : le paquet est recalculé à chaque usage.
 *
 *   chapitres VISIBLES de l'élève → séries PUBLIÉES dans ces chapitres
 *   → catégories des séries → modèles PUBLIÉS de ces catégories (Q163 a, Q164)
 *
 * La résolution catégorie → modèles est CELLE des séries (`templatesOfCategory`,
 * `questions/series-items.ts`) : pas de seconde logique.
 *
 * La mémoire est unique : `srs_card_stats` (élève, `template`, id du modèle),
 * partagée avec le Programme (Q165). Une séance = toutes les questions dues +
 * au plus 10 nouvelles, jamais vues (Q166).
 *
 * ⚠️ Toutes les lectures passent par le client de la requête, donc SOUS RLS :
 * l'élève ne lit que les chapitres visibles de sa classe, leurs rattachements
 * publiés, les séries rattachées et les modèles publiés — aucune lecture
 * nouvelle. Les filtres (visible, publié) sont AUSSI posés dans les requêtes :
 * le code ne s'en remet pas en silence à la RLS.
 *
 * @module server/srs/chapter-deck
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { CartItem } from '$lib/stores/questionCart.svelte';
import { templatesOfCategory } from '$lib/questions/series-items';
import { seriesCategoriesSchema } from '$lib/validation/series';

// Types
type SB = SupabaseClient<Database>;

/** Ce que le calcul lit d'un modèle (`question_templates`). */
export interface DeckTemplateRow {
	id: string;
	theme: string;
	domain: string;
	subdomain: string | null;
	level: number;
	status: string | null;
}

/** Ce que la séance lit d'une fiche FSRS (`srs_card_stats`). */
export interface DeckCardStatsRow {
	card_reference_id: string;
	next_review: string;
}

/** Le paquet d'un chapitre, au moment du calcul. */
export interface ChapterDeck {
	chapterId: string;
	title: string;
	/** Séries publiées du chapitre prises en compte */
	seriesCount: number;
	/** Modèles du paquet, sans doublon, dans l'ordre des séries */
	templateIds: string[];
}

/** La séance du jour : identifiants de modèles. */
export interface ChapterSession {
	due: string[];
	fresh: string[];
}

/** Une entrée de « Mes révisions » / le bouton de la page du chapitre. */
export interface ChapterDeckSummary {
	chapterId: string;
	title: string;
	deckSize: number;
	/** Taille de la séance du jour (dues + nouvelles plafonnées) */
	toReview: number;
}

export class ChapterDeckError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ChapterDeckError';
	}
}

// Constantes
/** Nouvelles questions au plus par séance (Q166). */
export const CHAPTER_SESSION_NEW_LIMIT = 10;

// Functions

/**
 * Modèles du paquet : tous les modèles PUBLIÉS des catégories des séries
 * (Q163 a), pas la quantité de la série ; union sans doublon (N6). Une
 * catégorie sans modèle publié est ignorée (L4).
 */
export function resolveDeckTemplateIds(
	seriesCategories: ReadonlyArray<ReadonlyArray<CartItem>>,
	templates: readonly DeckTemplateRow[]
): string[] {
	const published = templates.filter((t) => t.status === 'published');
	const ids = new Set<string>();
	for (const categories of seriesCategories) {
		for (const item of categories) {
			for (const template of templatesOfCategory(published, item.category)) {
				ids.add(template.id);
			}
		}
	}
	return [...ids];
}

/**
 * Séance du jour : toutes les dues (échéance passée, les plus en retard
 * d'abord) puis au plus `newLimit` nouvelles (aucune fiche), dans l'ordre du
 * paquet. Une fiche d'un modèle hors du paquet est ignorée.
 */
export function selectChapterSession(
	deckTemplateIds: readonly string[],
	stats: readonly DeckCardStatsRow[],
	now: Date,
	newLimit: number = CHAPTER_SESSION_NEW_LIMIT
): ChapterSession {
	const inDeck = new Set(deckTemplateIds);
	const nextReviewById = new Map<string, number>();
	for (const row of stats) {
		if (inDeck.has(row.card_reference_id)) {
			nextReviewById.set(row.card_reference_id, new Date(row.next_review).getTime());
		}
	}

	const due = [...nextReviewById.entries()]
		.filter(([, nextReview]) => nextReview <= now.getTime())
		.sort((a, b) => a[1] - b[1])
		.map(([id]) => id);
	const fresh = deckTemplateIds.filter((id) => !nextReviewById.has(id)).slice(0, newLimit);

	return { due, fresh };
}

/** Composition lisible d'une série, ou `null` (tracé) */
function readCategories(seriesId: string, raw: unknown): CartItem[] | null {
	const parsed = seriesCategoriesSchema.safeParse(raw);
	if (!parsed.success) {
		console.error('[chapter-deck] Composition illisible pour la série', seriesId);
		return null;
	}
	return parsed.data;
}

/**
 * Paquets des chapitres visibles de l'appelant (ou d'un seul, `chapterId`).
 * Un chapitre introuvable ou masqué n'est simplement pas rendu.
 *
 * Lève `ChapterDeckError` si une lecture échoue : une panne ne doit pas se
 * lire « paquet vide ».
 */
export async function loadChapterDecks(
	supabase: SB,
	options: { now: Date; chapterId?: string }
): Promise<ChapterDeck[]> {
	let chaptersQuery = supabase.from('class_chapters').select('id, title').eq('is_visible', true);
	if (options.chapterId) chaptersQuery = chaptersQuery.eq('id', options.chapterId);
	const { data: chapters, error: chaptersError } = await chaptersQuery.order('display_order');
	if (chaptersError) throw new ChapterDeckError(chaptersError.message);
	if (!chapters || chapters.length === 0) return [];

	const chapterIds = chapters.map((c) => c.id);
	const { data: links, error: linksError } = await supabase
		.from('chapter_series')
		.select('chapter_id, series_id')
		.in('chapter_id', chapterIds)
		.not('published_at', 'is', null)
		.lte('published_at', options.now.toISOString())
		.order('display_order');
	if (linksError) throw new ChapterDeckError(linksError.message);

	const seriesIds = [...new Set((links ?? []).map((l) => l.series_id))];
	const categoriesBySeries = new Map<string, CartItem[]>();
	if (seriesIds.length > 0) {
		const { data: series, error: seriesError } = await supabase
			.from('series')
			.select('id, categories')
			.in('id', seriesIds);
		if (seriesError) throw new ChapterDeckError(seriesError.message);
		for (const row of series ?? []) {
			const categories = readCategories(row.id, row.categories);
			if (categories) categoriesBySeries.set(row.id, categories);
		}
	}

	// Les modèles des thèmes concernés seulement : la résolution fine (domaine,
	// sous-domaine, niveau) reste celle des séries.
	const allCategories = [...categoriesBySeries.values()].flat();
	let templates: DeckTemplateRow[] = [];
	if (allCategories.length > 0) {
		const themes = [...new Set(allCategories.map((c) => c.category.theme))];
		const domains = [...new Set(allCategories.map((c) => c.category.domain))];
		const { data, error: templatesError } = await supabase
			.from('question_templates')
			.select('id, theme, domain, subdomain, level, status')
			.eq('status', 'published')
			.in('theme', themes)
			.in('domain', domains)
			.order('created_at');
		if (templatesError) throw new ChapterDeckError(templatesError.message);
		templates = data ?? [];
	}

	return chapters.map((chapter) => {
		const chapterSeries = (links ?? [])
			.filter((l) => l.chapter_id === chapter.id)
			.map((l) => categoriesBySeries.get(l.series_id))
			.filter((c): c is CartItem[] => c !== undefined);
		return {
			chapterId: chapter.id,
			title: chapter.title,
			seriesCount: chapterSeries.length,
			templateIds: resolveDeckTemplateIds(chapterSeries, templates)
		};
	});
}

/** Le paquet d'UN chapitre visible de l'appelant, ou `null` (introuvable, masqué, autre classe). */
export async function loadChapterDeck(
	supabase: SB,
	chapterId: string,
	now: Date
): Promise<ChapterDeck | null> {
	const decks = await loadChapterDecks(supabase, { now, chapterId });
	return decks[0] ?? null;
}

/** Fiches FSRS de l'élève pour ces modèles (mémoire partagée avec le Programme). */
export async function loadDeckStats(
	supabase: SB,
	userId: string,
	templateIds: readonly string[]
): Promise<DeckCardStatsRow[]> {
	if (templateIds.length === 0) return [];
	const { data, error } = await supabase
		.from('srs_card_stats')
		.select('card_reference_id, next_review')
		.eq('user_id', userId)
		.eq('card_reference_type', 'template')
		.in('card_reference_id', [...templateIds]);
	if (error) throw new ChapterDeckError(error.message);
	return data ?? [];
}

/**
 * Résumés des paquets : un par chapitre visible ayant au moins une série
 * publiée (N5), avec la taille de la séance du jour. `chapterId` : un seul.
 */
export async function summarizeChapterDecks(
	supabase: SB,
	userId: string,
	options: { chapterId?: string; now?: Date } = {}
): Promise<ChapterDeckSummary[]> {
	const now = options.now ?? new Date();
	const decks = (await loadChapterDecks(supabase, { now, chapterId: options.chapterId })).filter(
		(deck) => deck.seriesCount > 0
	);
	const stats = await loadDeckStats(supabase, userId, [
		...new Set(decks.flatMap((d) => d.templateIds))
	]);

	return decks.map((deck) => {
		const session = selectChapterSession(deck.templateIds, stats, now);
		return {
			chapterId: deck.chapterId,
			title: deck.title,
			deckSize: deck.templateIds.length,
			toReview: session.due.length + session.fresh.length
		};
	});
}
