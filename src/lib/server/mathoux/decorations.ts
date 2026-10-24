/**
 * Décorations de panse des Mathoux — lecture, achat, pose (lot B des accessoires)
 * ===============================================================================
 *
 * Décisions de David du 2026-10-24 (docs/wip/mathoux-accessoires-progress.md,
 * « Lot B : comportements validés »). La base tient les règles (migration
 * 20261024235000) :
 *   - `buy_mathou_decoration` : solde vérifié, débit, décoration donnée et posée
 *     sur le Mathou choisi, ligne au journal, sous verrou (double clic = un débit) ;
 *   - `set_mathou_decoration` : pose (en la retirant du Mathou qui la portait),
 *     remplacement ou retrait, gratuits.
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
import { isMathouDecoration, type MathouDecorationId } from '$lib/mathoux/decorations';

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
 * Décorations achetées par l'élève, dans l'ordre du catalogue. Au client de
 * l'appelant (RLS : un refus rendrait zéro ligne, donc « rien d'acheté », sans
 * erreur — c'est sans risque : la base refusera un second achat).
 *
 * @throws si la lecture échoue.
 */
export async function readOwnedDecorations(
	supabase: SB,
	studentId: string
): Promise<MathouDecorationId[]> {
	const { data, error } = await supabase
		.from('student_mathou_decorations')
		.select('decoration')
		.eq('student_id', studentId);
	if (error) throw new Error(`Décorations illisibles : ${error.message}`);
	return (data ?? []).map((row) => row.decoration).filter(isMathouDecoration);
}

/**
 * Achète `decoration` et la pose sur le Mathou de `notionId`.
 *
 * @param service client SERVICE.
 * @param studentId l'élève de la SESSION.
 * @throws si l'appel échoue ou rend une forme inattendue.
 */
export async function buyMathouDecoration(
	service: SB,
	studentId: string,
	decoration: MathouDecorationId,
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
