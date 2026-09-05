/**
 * Résultats des RPC de cartes VIP
 * ===============================
 *
 * Ces trois fonctions sont déclarées `RETURNS jsonb` : le type généré est
 * `Json`, une union qui ne porte aucune clé. Chaque route les affirmait par un
 * cast — `data as PurchaseResult` — c'est-à-dire une promesse non vérifiée.
 *
 * Le cast est particulièrement risqué ici : ces fonctions **débitent et
 * créditent** le solde de gidouilles de l'élève. Un résultat mal formé lu comme
 * un succès afficherait un nouveau solde `undefined`, ou pire, laisserait
 * croire à un achat qui n'a pas eu lieu.
 *
 * Chaque schéma est une union discriminée sur `success` : le chemin d'échec ne
 * porte pas les mêmes champs que le chemin nominal, et les confondre est
 * précisément l'erreur que le cast permettait.
 */
import { z } from 'zod';

/** `purchase_vip_card(p_student_id uuid, p_template_id text)` */
export const purchaseResultSchema = z.discriminatedUnion('success', [
	z.object({
		success: z.literal(true),
		instance: z.object({
			instanceId: z.string(),
			cardId: z.string(),
			purchasedAt: z.string(),
			acquiredFrom: z.literal('purchase')
		}),
		newBalance: z.number()
	}),
	z.object({
		success: z.literal(false),
		error: z.string()
	})
]);

export type PurchaseResult = z.infer<typeof purchaseResultSchema>;

/** `sell_vip_card(...)` — `secondsRemaining` accompagne le refus anti-rejeu. */
export const sellResultSchema = z.discriminatedUnion('success', [
	z.object({
		success: z.literal(true),
		sellPrice: z.number(),
		cardId: z.string(),
		cardName: z.string(),
		newBalance: z.number()
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
		secondsRemaining: z.number().optional()
	})
]);

export type SellResult = z.infer<typeof sellResultSchema>;

/** `use_vip_card(...)` — une carte consommable garde des usages restants. */
export const useCardResultSchema = z.discriminatedUnion('success', [
	z.object({
		success: z.literal(true),
		cardName: z.string(),
		instanceId: z.string(),
		cardId: z.string(),
		usesRemaining: z.number().nullable().optional(),
		isFullyConsumed: z.boolean().optional(),
		usedAt: z.string().nullable().optional()
	}),
	z.object({
		success: z.literal(false),
		error: z.string()
	})
]);

export type UseCardResult = z.infer<typeof useCardResultSchema>;
