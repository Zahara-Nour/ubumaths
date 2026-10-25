/**
 * Décorations des Mathoux — lecture, achat, pose (lots B, C et D des accessoires)
 * ===============================================================================
 *
 * Panse : décisions de David du 2026-10-24 (docs/wip/mathoux-accessoires-progress.md,
 * « Lot B : comportements validés ») ; cou (colliers) : mêmes règles, décidées le
 * 2026-10-25 (docs/wip/mathoux-colliers-progress.md) ; yeux (lunettes) et tête
 * (chapeaux) : mêmes règles encore (docs/archive/wip/mathoux-chapeaux-lunettes-progress.md).
 * La base tient les règles (migrations 20261024235000, 20261025160000 et
 * 20261026000100) :
 *   - `buy_mathou_decoration` : solde vérifié, débit, décoration donnée et posée
 *     à son emplacement sur le Mathou choisi, ligne au journal, sous verrou
 *     (double clic = un débit) ;
 *   - `set_mathou_decoration` (panse), `set_mathou_collar` (cou),
 *     `set_mathou_glasses` (yeux) et `set_mathou_hat` (tête) : pose (en la
 *     retirant du Mathou qui la portait), remplacement ou retrait, gratuits.
 *
 * LECTURE au client de l'appelant (RLS : l'élève lit ses décorations, le prof
 * celles de ses élèves). ACHAT et POSE au client SERVICE seulement (droits
 * d'exécution retirés à tous les autres), pour l'élève de la SESSION : jamais un
 * identifiant venu du client.
 *
 * Les fonctions rendent `{ ok, reason?, missing?, balance? }` ; une forme
 * inattendue lève (`DecorationResponseError`) plutôt que de passer pour un refus.
 */

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	isMathouCatalogId,
	type MathouCatalogId,
	type MathouCollarId,
	type MathouDecorationId,
	type MathouGlassesId,
	type MathouHatId
} from '$lib/mathoux/decorations';

// Types
type SB = SupabaseClient<Database>;

export type DecorationRefusal =
	'unknown_decoration' | 'mathou_not_found' | 'already_owned' | 'insufficient_funds' | 'not_owned';

export type DecorationOutcome =
	{ ok: true; balance?: number } | { ok: false; reason: DecorationRefusal; missing?: number };

// Constantes
const outcomeSchema = z.discriminatedUnion('ok', [
	z.object({ ok: z.literal(true), balance: z.number().optional() }),
	z.object({
		ok: z.literal(false),
		reason: z.enum([
			'unknown_decoration',
			'mathou_not_found',
			'already_owned',
			'insufficient_funds',
			'not_owned'
		]),
		missing: z.number().int().optional()
	})
]);

// Functions
export class DecorationResponseError extends Error {
	constructor(fn: string) {
		super(`Décorations des Mathoux : réponse inattendue de ${fn}`);
		this.name = 'DecorationResponseError';
	}
}

function parseOutcome(fn: string, data: unknown): DecorationOutcome {
	const parsed = outcomeSchema.safeParse(data);
	if (!parsed.success) throw new DecorationResponseError(fn);
	return parsed.data;
}

/**
 * Décorations achetées par l'élève (tous emplacements). Au client de
 * l'appelant (RLS : un refus rendrait zéro ligne, donc « rien d'acheté », sans
 * erreur — c'est sans risque : la base refusera un second achat).
 *
 * @throws si la lecture échoue.
 */
export async function readOwnedDecorations(
	supabase: SB,
	studentId: string
): Promise<MathouCatalogId[]> {
	const { data, error } = await supabase
		.from('student_mathou_decorations')
		.select('decoration')
		.eq('student_id', studentId);
	if (error) throw new Error(`Décorations illisibles : ${error.message}`);
	return (data ?? []).map((row) => row.decoration).filter(isMathouCatalogId);
}

/**
 * Achète `decoration` (panse, collier, lunettes ou chapeau) et la pose à son emplacement sur le
 * Mathou de `notionId`.
 *
 * @param service client SERVICE.
 * @param studentId l'élève de la SESSION.
 * @throws si l'appel échoue ou rend une forme inattendue.
 */
export async function buyMathouDecoration(
	service: SB,
	studentId: string,
	decoration: MathouCatalogId,
	notionId: string
): Promise<DecorationOutcome> {
	const { data, error } = await service.rpc('buy_mathou_decoration', {
		p_student_id: studentId,
		p_decoration: decoration,
		p_notion_id: notionId
	});
	if (error) throw new Error(`Achat de décoration refusé : ${error.message}`);
	return parseOutcome('buy_mathou_decoration', data);
}

/**
 * Pose `decoration` sur le Mathou de `notionId` (en la retirant de celui qui la
 * portait), ou la retire (`null`). Gratuit.
 *
 * @param service client SERVICE.
 * @param studentId l'élève de la SESSION.
 * @throws si l'appel échoue ou rend une forme inattendue.
 */
export async function wearMathouDecoration(
	service: SB,
	studentId: string,
	notionId: string,
	decoration: MathouDecorationId | null
): Promise<DecorationOutcome> {
	const { data, error } = await service.rpc('set_mathou_decoration', {
		p_student_id: studentId,
		p_notion_id: notionId,
		// La fonction SQL prend NULL pour « retirer »
		p_decoration: decoration as string
	});
	if (error) throw new Error(`Pose de décoration refusée : ${error.message}`);
	return parseOutcome('set_mathou_decoration', data);
}

/**
 * Pose le collier `collar` sur le Mathou de `notionId` (en le retirant de celui
 * qui le portait), ou le retire (`null`). Gratuit.
 *
 * @param service client SERVICE.
 * @param studentId l'élève de la SESSION.
 * @throws si l'appel échoue ou rend une forme inattendue.
 */
export async function wearMathouCollar(
	service: SB,
	studentId: string,
	notionId: string,
	collar: MathouCollarId | null
): Promise<DecorationOutcome> {
	const { data, error } = await service.rpc('set_mathou_collar', {
		p_student_id: studentId,
		p_notion_id: notionId,
		// La fonction SQL prend NULL pour « retirer »
		p_collar: collar as string
	});
	if (error) throw new Error(`Pose de collier refusée : ${error.message}`);
	return parseOutcome('set_mathou_collar', data);
}

/**
 * Pose les lunettes `glasses` sur le Mathou de `notionId` (en les retirant de
 * celui qui les portait), ou les retire (`null`). Gratuit.
 *
 * @param service client SERVICE.
 * @param studentId l'élève de la SESSION.
 * @throws si l'appel échoue ou rend une forme inattendue.
 */
export async function wearMathouGlasses(
	service: SB,
	studentId: string,
	notionId: string,
	glasses: MathouGlassesId | null
): Promise<DecorationOutcome> {
	const { data, error } = await service.rpc('set_mathou_glasses', {
		p_student_id: studentId,
		p_notion_id: notionId,
		// La fonction SQL prend NULL pour « retirer »
		p_glasses: glasses as string
	});
	if (error) throw new Error(`Pose de lunettes refusée : ${error.message}`);
	return parseOutcome('set_mathou_glasses', data);
}

/**
 * Pose le chapeau `hat` sur le Mathou de `notionId` (en le retirant de celui
 * qui le portait), ou le retire (`null`). Gratuit.
 *
 * @param service client SERVICE.
 * @param studentId l'élève de la SESSION.
 * @throws si l'appel échoue ou rend une forme inattendue.
 */
export async function wearMathouHat(
	service: SB,
	studentId: string,
	notionId: string,
	hat: MathouHatId | null
): Promise<DecorationOutcome> {
	const { data, error } = await service.rpc('set_mathou_hat', {
		p_student_id: studentId,
		p_notion_id: notionId,
		// La fonction SQL prend NULL pour « retirer »
		p_hat: hat as string
	});
	if (error) throw new Error(`Pose de chapeau refusée : ${error.message}`);
	return parseOutcome('set_mathou_hat', data);
}
