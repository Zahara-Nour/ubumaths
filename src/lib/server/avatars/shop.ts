/**
 * Boutique d'avatars — lecture, achat, port (serveur)
 * ===================================================
 *
 * Décisions de David du 2026-11-06 (docs/wip/boutique-avatars-progress.md,
 * comportements 1 à 17). La base tient les règles (migration 20261106164739) :
 *   - `buy_avatar` : en vente, pas déjà possédé, solde vérifié, débit, avatar
 *     dans la collection, ligne au journal, sous verrou (double clic = un débit) ;
 *   - `set_worn_avatar` : porte un avatar POSSÉDÉ (son image passe dans
 *     `profiles.avatar_url`) ou le retire (la photo Google revient).
 *
 * LECTURE au client de l'appelant (RLS : catalogue lisible par tout connecté,
 * collection par l'élève seul). ACHAT et PORT au client SERVICE seulement
 * (droits d'exécution retirés à tous les autres), pour l'élève de la SESSION :
 * les deux fonctions font confiance à `p_student_id`, jamais un identifiant venu
 * du client.
 *
 * Une forme inattendue lève (`AvatarResponseError`) plutôt que de passer pour un
 * refus ou un succès.
 */

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { AVATAR_FAMILY_IDS, type AvatarShop, type ShopAvatar } from '$lib/avatars/shop';

// Types
type SB = SupabaseClient<Database>;

export type AvatarRefusal =
	'unknown_avatar' | 'already_owned' | 'not_on_sale' | 'insufficient_funds' | 'not_owned';

export type BuyAvatarOutcome =
	{ ok: true; balance: number } | { ok: false; reason: AvatarRefusal; missing?: number };

export type WearAvatarOutcome =
	{ ok: true; avatarUrl: string | null } | { ok: false; reason: AvatarRefusal };

// Constantes
/**
 * Achats et ports par minute et par élève (clé partagée `avatar_shop:<id>`) :
 * large pour un humain, borne une boucle. Chaque appel verrouille la ligne
 * `profiles` de l'élève.
 */
export const AVATAR_RATE_MAX = 30;

const REFUSALS = [
	'unknown_avatar',
	'already_owned',
	'not_on_sale',
	'insufficient_funds',
	'not_owned'
] as const;

const buyOutcomeSchema = z.discriminatedUnion('ok', [
	z.object({ ok: z.literal(true), balance: z.number() }),
	z.object({
		ok: z.literal(false),
		reason: z.enum(REFUSALS),
		missing: z.number().int().optional()
	})
]);

const wearOutcomeSchema = z.discriminatedUnion('ok', [
	z.object({ ok: z.literal(true), avatar_url: z.string().nullable() }),
	z.object({ ok: z.literal(false), reason: z.enum(REFUSALS) })
]);

const catalogRowSchema = z.object({
	key: z.string(),
	family: z.enum(AVATAR_FAMILY_IDS),
	name: z.string(),
	price: z.number().int(),
	image_path: z.string(),
	available_from: z.string().nullable(),
	available_until: z.string().nullable(),
	active: z.boolean(),
	sort_order: z.number().int()
});

// Functions
export class AvatarResponseError extends Error {
	constructor(fn: string) {
		super(`Boutique d’avatars : réponse inattendue de ${fn}`);
		this.name = 'AvatarResponseError';
	}
}

function isOnSale(row: z.infer<typeof catalogRowSchema>, now: Date): boolean {
	if (!row.active) return false;
	if (row.available_from && now < new Date(row.available_from)) return false;
	if (row.available_until && now >= new Date(row.available_until)) return false;
	return true;
}

/**
 * Catalogue vu par l'élève : les avatars en vente, plus ceux qu'il possède
 * (même retirés de la vente ou hors de leur fenêtre : ils restent portables).
 * Au client de l'appelant (RLS).
 *
 * @param worn clé de l'avatar porté (`profiles.worn_avatar` de la session).
 * @throws si une lecture échoue ou rend une forme inattendue.
 */
export async function readAvatarShop(
	supabase: SB,
	studentId: string,
	worn: string | null,
	now: Date = new Date()
): Promise<AvatarShop> {
	const [catalog, owned] = await Promise.all([
		supabase
			.from('avatar_catalog')
			.select(
				'key, family, name, price, image_path, available_from, available_until, active, sort_order'
			)
			.order('sort_order', { ascending: true })
			.order('key', { ascending: true }),
		supabase.from('student_avatars').select('avatar_key').eq('student_id', studentId)
	]);
	if (catalog.error) throw new Error(`Catalogue d’avatars illisible : ${catalog.error.message}`);
	if (owned.error) throw new Error(`Collection d’avatars illisible : ${owned.error.message}`);

	const rows = z.array(catalogRowSchema).safeParse(catalog.data);
	if (!rows.success) throw new AvatarResponseError('avatar_catalog');
	const ownedKeys = new Set((owned.data ?? []).map((row) => row.avatar_key));

	const avatars: ShopAvatar[] = [];
	for (const row of rows.data) {
		const onSale = isOnSale(row, now);
		const isOwned = ownedKeys.has(row.key);
		if (!onSale && !isOwned) continue;
		avatars.push({
			key: row.key,
			family: row.family,
			name: row.name,
			price: row.price,
			imagePath: row.image_path,
			availableUntil: row.available_until,
			onSale,
			owned: isOwned
		});
	}
	return { avatars, worn: worn && ownedKeys.has(worn) ? worn : null };
}

/**
 * Achète `avatar` pour l'élève (sans l'équiper).
 *
 * @param service client SERVICE.
 * @param studentId l'élève de la SESSION.
 * @throws si l'appel échoue ou rend une forme inattendue.
 */
export async function buyAvatar(
	service: SB,
	studentId: string,
	avatar: string
): Promise<BuyAvatarOutcome> {
	const { data, error } = await service.rpc('buy_avatar', {
		p_student_id: studentId,
		p_avatar: avatar
	});
	if (error) throw new Error(`Achat d’avatar refusé : ${error.message}`);
	const parsed = buyOutcomeSchema.safeParse(data);
	if (!parsed.success) throw new AvatarResponseError('buy_avatar');
	return parsed.data;
}

/**
 * Porte `avatar` (possédé) ou le retire (`null` : la photo Google revient, ou
 * l'emblème par défaut). Gratuit.
 *
 * @param service client SERVICE.
 * @param studentId l'élève de la SESSION.
 * @throws si l'appel échoue ou rend une forme inattendue.
 */
export async function wearAvatar(
	service: SB,
	studentId: string,
	avatar: string | null
): Promise<WearAvatarOutcome> {
	const { data, error } = await service.rpc('set_worn_avatar', {
		p_student_id: studentId,
		// La fonction SQL prend NULL pour « retirer »
		p_avatar: avatar as string
	});
	if (error) throw new Error(`Port d’avatar refusé : ${error.message}`);
	const parsed = wearOutcomeSchema.safeParse(data);
	if (!parsed.success) throw new AvatarResponseError('set_worn_avatar');
	return parsed.data.ok
		? { ok: true, avatarUrl: parsed.data.avatar_url }
		: { ok: false, reason: parsed.data.reason };
}

/** Refus de la base → statut HTTP. */
export function avatarRefusalStatus(reason: AvatarRefusal): 400 | 409 {
	return reason === 'unknown_avatar' ? 400 : 409;
}

/** Refus de la base → phrase pour l'élève. */
export function avatarRefusalMessage(reason: AvatarRefusal, missing?: number): string {
	switch (reason) {
		case 'insufficient_funds': {
			const n = missing ?? 0;
			return `Il te manque ${n} gidouille${n > 1 ? 's' : ''}.`;
		}
		case 'already_owned':
			return 'Tu as déjà cet avatar.';
		case 'not_on_sale':
			return 'Cet avatar n’est plus en vente.';
		case 'not_owned':
			return 'Tu n’as pas encore cet avatar.';
		case 'unknown_avatar':
			return 'Avatar inconnu.';
	}
}
