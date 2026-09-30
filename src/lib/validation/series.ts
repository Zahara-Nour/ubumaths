/**
 * Composition d'une série : schémas partagés client / serveur.
 *
 * Une série est une liste de `CartItem` (catégorie, quantité, durée). Les mêmes
 * bornes valent pour l'enregistrement d'une série (serveur, B11) et pour un lien
 * `/automaths/test?categories=…` relu par le navigateur (C19) : un lien abîmé ou
 * fabriqué ne doit jamais faire planter la page.
 */

import { z } from 'zod';

/** Nombre de catégories d'une série */
export const MAX_SERIES_CATEGORIES = 50;

/** Catégorie de questions (même forme que `QuestionCategory` du panier) */
export const questionCategorySchema = z.object({
	theme: z.string().min(1, 'Thème requis').max(100, 'Thème trop long'),
	domain: z.string().min(1, 'Domaine requis').max(100, 'Domaine trop long'),
	subdomain: z.string().max(100, 'Sous-domaine trop long').nullable(),
	level: z.number().int('Niveau entier attendu').nonnegative('Niveau invalide').max(100)
});

/** Une catégorie retenue, avec son nombre de questions et sa durée par question */
export const cartItemSchema = z.object({
	category: questionCategorySchema,
	quantity: z
		.number()
		.int('Nombre de questions entier attendu')
		.positive('Au moins une question par catégorie')
		.max(50, 'Trop de questions pour une catégorie (50 au plus)'),
	delay: z
		.number()
		.int('Durée entière attendue')
		.nonnegative('Durée invalide')
		.max(3600, 'Durée trop longue (3600 s au plus)')
});

/** Les catégories d'une série : 1 à 50 */
export const seriesCategoriesSchema = z
	.array(cartItemSchema)
	.min(1, 'Ajoute au moins une catégorie de questions')
	.max(MAX_SERIES_CATEGORIES, `Trop de catégories (${MAX_SERIES_CATEGORIES} au plus)`);

export type SeriesCategories = z.infer<typeof seriesCategoriesSchema>;

export type CategoriesParamResult =
	| { success: true; data: SeriesCategories }
	| { success: false; error: string };

/**
 * Relit le paramètre `categories` d'un lien de série.
 *
 * `URLSearchParams.get` a déjà décodé une fois ; le panier encode EN PLUS le JSON
 * (`encodeURIComponent` avant `URLSearchParams`), d'où un second décodage. Un
 * `%` isolé ferait lever `decodeURIComponent` : on retombe alors sur la chaîne
 * brute, que `JSON.parse` jugera.
 */
export function parseCategoriesParam(raw: string | null): CategoriesParamResult {
	if (raw === null || raw.trim() === '') {
		return { success: false, error: 'Ce lien ne contient aucune question.' };
	}

	let decoded = raw;
	try {
		decoded = decodeURIComponent(raw);
	} catch {
		decoded = raw;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(decoded);
	} catch {
		return {
			success: false,
			error: 'Ce lien de série est abîmé : les questions ne peuvent pas être relues.'
		};
	}

	const validation = seriesCategoriesSchema.safeParse(parsed);
	if (!validation.success) {
		return {
			success: false,
			error: `Ce lien de série n'est pas valide : ${validation.error.issues[0].message}.`
		};
	}
	return { success: true, data: validation.data };
}

/**
 * Construit le paramètre `categories` d'un lien de série (inverse de
 * `parseCategoriesParam`).
 */
export function encodeCategoriesParam(categories: SeriesCategories): string {
	return encodeURIComponent(JSON.stringify(categories));
}

/**
 * Lien public vers une série : la composition est DANS l'URL (Q22 bis). Sans
 * `mode`, la page ouvre le choix de la forme.
 */
export function buildSeriesLink(origin: string, categories: SeriesCategories): string {
	const params = new URLSearchParams({ categories: encodeCategoriesParam(categories) });
	return `${origin}/automaths/test?${params.toString()}`;
}
