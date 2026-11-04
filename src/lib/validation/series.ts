/**
 * Composition d'une série : schémas partagés client / serveur.
 *
 * Une série (et le panier) est une liste de lignes `{ templateId, quantity,
 * delay }` : tel MODÈLE, tant de fois, tant de secondes par question (ADR 0035).
 * Les mêmes bornes valent pour l'enregistrement d'une série (serveur, B11) et
 * pour un lien `/automaths/panier?modeles=…` relu par le navigateur (C19, Q45) :
 * un lien abîmé ou fabriqué ne doit jamais faire planter la page.
 *
 * L'ANCIENNE forme (catégorie thème · domaine · sous-domaine · niveau) n'est
 * relue que par `$lib/questions/series-legacy`, retiré au lot 4.
 */

import { z } from 'zod';
import type { TestMode } from '$lib/types/test';

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

/** Une ligne de série : un modèle, son nombre de questions et sa durée par question */
export const seriesItemSchema = z.object({
	templateId: z.string().uuid('Modèle invalide'),
	quantity: itemQuantitySchema,
	delay: itemDelaySchema
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

/** Forme portée par un lien de série (Q44) ; `timeLimit` en secondes, Course seulement */
export interface SeriesLinkForm {
	mode: TestMode;
	timeLimit?: number;
}

/**
 * Lien public vers une série : la composition est DANS l'URL.
 *
 * - sans forme : ouvre le PANIER du destinataire, qui y met la série (Q44, Q45) ;
 * - avec une forme : lance directement la série sous cette forme ; une Course
 *   aux nombres porte son temps limite.
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
	return `${origin}/automaths/test?${params.toString()}`;
}
