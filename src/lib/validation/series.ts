/**
 * Composition d'une série : schémas partagés client / serveur.
 *
 * Une série (et le panier) est une liste de lignes `{ templateId, quantity,
 * delay, variations?, choiceVariations? }` : tel MODÈLE, tant de fois, tant de secondes
 * par question (ADR 0035), dans les variations choisies par le prof (toutes si absent),
 * certaines répondues en QCM (idée 4, aucune si absent).
 * Les mêmes bornes valent pour l'enregistrement d'une série (serveur, B11) et
 * pour un lien `/automaths/panier?modeles=…` relu par le navigateur (C19, Q45) :
 * un lien abîmé ou fabriqué ne doit jamais faire planter la page.
 *
 * L'ancienne forme (une catégorie par ligne, avant l'ADR 0035) n'est plus relue :
 * un ancien lien `?categories=…` donne `ANCIEN_LIEN_MESSAGE`.
 */

import { z } from 'zod';
import type { TestMode } from '#lib/types/test.ts';
import type { ReadonlyURLSearchParams } from '$app/state';

/** Nombre de lignes d'une série */
export const MAX_SERIES_ITEMS = 50;

/** Répétitions d'un modèle dans une série (même plafond que le panier) */
export const MAX_ITEM_QUANTITY = 99;

/**
 * Durée d'une question : la base refuse au-delà (CHECK de
 * `evaluation_attempt_questions.delay_seconds`, 1..600).
 */
export const MAX_QUESTION_DELAY_SECONDS = 600;

/**
 * Questions d'une série ENREGISTRÉE (donc d'une évaluation) : l'envoi d'une
 * tentative n'en accepte pas davantage (`MAX_ATTEMPT_ANSWERS`).
 */
export const MAX_SERIES_QUESTIONS = 500;

/** Paramètre d'un lien de série : la composition, en JSON */
export const SERIES_LINK_PARAM = 'modeles';

/** Paramètre du lien de série « Mêmes nombres pour tous » : la graine de la série */
export const SERIES_SEED_PARAM = 'graine';

/** Nombre de questions d'une ligne */
export const itemQuantitySchema = z
	.number()
	.int('Nombre de questions entier attendu')
	.positive('Au moins une question par modèle')
	.max(MAX_ITEM_QUANTITY, `Trop de questions pour un modèle (${MAX_ITEM_QUANTITY} au plus)`);

/** Durée par question d'une ligne (secondes ; 0 = durée par défaut) */
export const itemDelaySchema = z
	.number()
	.int('Durée entière attendue')
	.nonnegative('Durée invalide')
	.max(MAX_QUESTION_DELAY_SECONDS, `Durée trop longue (${MAX_QUESTION_DELAY_SECONDS} s au plus)`);

/** Variations d'un modèle (le plus grand en prod en a 126, mesuré le 2026-11-21) */
export const MAX_TEMPLATE_VARIATIONS = 200;

/**
 * Variations choisies par le prof sur une ligne (chantier `idees-format`, idée 2) :
 * leurs numéros, distincts, rangés dans l'ordre. Absent = toutes les variations.
 * Un numéro qui n'existe plus dans le modèle est ignoré au tirage (`allowedVariations`).
 */
export const itemVariationsSchema = z
	.array(
		z
			.number()
			.int('Numéro de variation entier attendu')
			.nonnegative('Numéro de variation invalide')
			.max(MAX_TEMPLATE_VARIATIONS - 1, 'Numéro de variation invalide')
	)
	.min(1, 'Choisis au moins une variation')
	.max(MAX_TEMPLATE_VARIATIONS, 'Trop de variations')
	.refine((indexes) => new Set(indexes).size === indexes.length, 'Variation choisie deux fois')
	.transform((indexes) => [...indexes].sort((a, b) => a - b));

/**
 * Variations « en QCM » d'une ligne (chantier `idees-format`, idée 4) : leur case
 * se répond en choisissant parmi la bonne réponse et les erreurs prévues. Mêmes
 * règles que `itemVariationsSchema` ; absent = aucune. Une variation qui ne peut
 * pas être en QCM (plusieurs cases, veto de l'auteur, aucune erreur prévue) reste
 * en saisie au tirage (`questions/choice-from-errors.ts`).
 */
export const itemChoiceVariationsSchema = itemVariationsSchema;

/** Une ligne de série : un modèle, son nombre de questions, sa durée par question, ses variations */
export const seriesItemSchema = z.object({
	templateId: z.string().uuid('Modèle invalide'),
	quantity: itemQuantitySchema,
	delay: itemDelaySchema,
	variations: itemVariationsSchema.optional(),
	choiceVariations: itemChoiceVariationsSchema.optional()
});

export type SeriesItem = z.infer<typeof seriesItemSchema>;

/** Les lignes d'une série : 1 à 50 */
export const seriesItemsSchema = z
	.array(seriesItemSchema)
	.min(1, 'Ajoute au moins un modèle de questions')
	.max(MAX_SERIES_ITEMS, `Trop de modèles (${MAX_SERIES_ITEMS} au plus)`);

/** Nombre total de questions d'une composition */
export function totalQuestions(items: ReadonlyArray<{ quantity: number }>): number {
	return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Lignes d'une série qu'on ENREGISTRE (série, évaluation) : en plus, au plus
 * 500 questions en tout. Un lien d'entraînement libre n'y est pas soumis.
 */
export const savedSeriesItemsSchema = seriesItemsSchema.superRefine((items, ctx) => {
	const total = totalQuestions(items);
	if (total > MAX_SERIES_QUESTIONS) {
		ctx.addIssue({
			code: 'custom',
			message: `Série trop longue : ${total} questions (${MAX_SERIES_QUESTIONS} au plus)`
		});
	}
});

/**
 * JSON d'un paramètre de lien de série, ou `null` s'il ne se relit pas.
 *
 * `URLSearchParams.get` a déjà décodé une fois ; le panier encode EN PLUS le JSON
 * (`encodeURIComponent` avant `URLSearchParams`), d'où un second décodage. Un
 * `%` isolé ferait lever `decodeURIComponent` : on retombe alors sur la chaîne
 * brute, que `JSON.parse` jugera.
 */
export function decodeSeriesParamJson(raw: string): { ok: true; value: unknown } | { ok: false } {
	let decoded = raw;
	try {
		decoded = decodeURIComponent(raw);
	} catch {
		decoded = raw;
	}
	try {
		return { ok: true, value: JSON.parse(decoded) };
	} catch {
		return { ok: false };
	}
}

/** Construit le paramètre `modeles` d'un lien de série */
export function encodeSeriesParam(items: readonly SeriesItem[]): string {
	return encodeURIComponent(JSON.stringify(items));
}

/**
 * Forme portée par un lien de série (Q44) ; `timeLimit` en secondes, Course
 * seulement ; `seed` : « Mêmes nombres pour tous », la graine de la série.
 */
export interface SeriesLinkForm {
	mode: TestMode;
	timeLimit?: number;
	seed?: number;
}

/**
 * Lien public vers une série : la composition est DANS l'URL.
 *
 * - sans forme : ouvre le PANIER du destinataire, qui y met la série (Q44, Q45) ;
 * - avec une forme : lance directement la série sous cette forme ; une Course
 *   aux nombres porte son temps limite ; avec une graine, tous ceux qui
 *   l'ouvrent ont les mêmes questions (« Mêmes nombres pour tous »).
 */
export function buildSeriesLink(
	origin: string,
	items: readonly SeriesItem[],
	form?: SeriesLinkForm
): string {
	const params = new URLSearchParams({ [SERIES_LINK_PARAM]: encodeSeriesParam(items) });
	if (!form) {
		return `${origin}/automaths/panier?${params.toString()}`;
	}

	params.set('mode', form.mode);
	if (form.mode === 'course' && form.timeLimit !== undefined) {
		params.set('time', String(form.timeLimit));
	}
	if (form.seed !== undefined) {
		params.set(SERIES_SEED_PARAM, String(form.seed));
	}
	return `${origin}/automaths/test?${params.toString()}`;
}

// ============================================================================
// LIEN DE SÉRIE (lecture de l'URL)
// ============================================================================

/** Paramètre des anciens liens de série (avant l'ADR 0035) : détecté, jamais relu */
export const ANCIEN_LIEN_PARAM = 'categories';

export const ANCIEN_LIEN_MESSAGE =
	"Ce lien vient d'une ancienne version de Chiphre et ne peut plus être ouvert.";

export type SeriesLinkResult =
	{ success: true; lines: SeriesItem[] } | { success: false; error: string };

/**
 * Relit la composition d'un lien de série `?modeles=…`. Un ancien lien
 * `?categories=…` (sans `modeles`) n'est plus relu : message dédié.
 */
export function parseSeriesLink(searchParams: ReadonlyURLSearchParams): SeriesLinkResult {
	const raw = searchParams.get(SERIES_LINK_PARAM);
	if (raw === null && searchParams.has(ANCIEN_LIEN_PARAM)) {
		return { success: false, error: ANCIEN_LIEN_MESSAGE };
	}
	if (raw === null || raw.trim() === '') {
		return { success: false, error: 'Ce lien ne contient aucune question.' };
	}

	const json = decodeSeriesParamJson(raw);
	if (!json.ok) {
		return {
			success: false,
			error: 'Ce lien de série est abîmé : les questions ne peuvent pas être relues.'
		};
	}

	const validation = seriesItemsSchema.safeParse(json.value);
	if (!validation.success) {
		return {
			success: false,
			error: `Ce lien de série n'est pas valide : ${validation.error.issues[0].message}.`
		};
	}
	return { success: true, lines: validation.data };
}

/** Le lien porte-t-il une composition (ou un ancien lien, à signaler) ? */
export function hasSeriesLink(searchParams: ReadonlyURLSearchParams): boolean {
	return searchParams.has(SERIES_LINK_PARAM) || searchParams.has(ANCIEN_LIEN_PARAM);
}

/** Retire la composition d'une URL (y compris un ancien paramètre) */
export function deleteSeriesLink(searchParams: URLSearchParams): void {
	searchParams.delete(SERIES_LINK_PARAM);
	searchParams.delete(ANCIEN_LIEN_PARAM);
}
