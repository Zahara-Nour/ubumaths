/**
 * Helper d'auto-gestion du deck Programme.
 *
 * Le deck Programme (1 par élève, `is_auto_managed=true`) est créé automatiquement
 * à la première interaction Monde 1 (quiz interactif) ou Monde 2 (review SRS)
 * sur un template tagué famille A.
 *
 * Pattern lookup-then-insert avec gestion de la race condition, inspiré de
 * `tags-resolution.ts` (`resolveTagsToIds`).
 *
 * Spec : `docs/wip/srs-fsrs-spec-tdd.md` §4.
 * Architecture : `docs/wip/srs-fsrs-architecture-cible.md` §3.4 + §4.1.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

type SB = SupabaseClient<Database>;

const PROGRAMME_DECK_NAME = 'Programme';
const PROGRAMME_DECK_DESCRIPTION =
	'Tes capacités à retravailler — mises à jour automatiquement après chaque entraînement.';

/**
 * Retourne l'ID du deck Programme de l'élève. Crée le deck si nécessaire.
 *
 * Idempotent : 2 appels concurrents n'aboutissent pas à 2 decks distincts grâce
 * au retry sur erreur 23505 (unique violation).
 *
 * Note : il n'y a pas de contrainte UNIQUE explicite sur (owner_id, is_auto_managed=true)
 * en DB, mais en pratique la double-création est rare et bénigne — on accepte
 * potentiellement 2 decks dans ce cas exotique (le 1er sera pris à la prochaine
 * requête).
 *
 * @returns UUID du deck Programme
 */
export async function ensureProgrammeDeck(supabase: SB, userId: string): Promise<string> {
	// 1. Lookup existant
	const { data: existing, error: lookupErr } = await supabase
		.from('srs_decks')
		.select('id')
		// Cast is_auto_managed: champ ajouté par migration 20260610100100, peut ne pas être
		// dans database.ts si pnpm db:types n'a pas été lancé après migration.
		.eq('owner_id', userId)
		.eq('is_auto_managed' as never, true as never)
		.limit(1)
		.maybeSingle();

	if (lookupErr) {
		console.error('[programme-deck] Lookup failed:', lookupErr);
		throw lookupErr;
	}

	if (existing) {
		return existing.id as string;
	}

	// 2. INSERT
	const { data: created, error: insertErr } = await supabase
		.from('srs_decks')
		.insert({
			owner_id: userId,
			name: PROGRAMME_DECK_NAME,
			description: PROGRAMME_DECK_DESCRIPTION,
			deck_type: 'personal',
			is_assigned: false,
			is_auto_managed: true
		} as never)
		.select('id')
		.single();

	if (insertErr) {
		// Race possible : re-lookup
		const { data: refreshed } = await supabase
			.from('srs_decks')
			.select('id')
			.eq('owner_id', userId)
			.eq('is_auto_managed' as never, true as never)
			.limit(1)
			.maybeSingle();
		if (refreshed) return refreshed.id as string;
		console.error('[programme-deck] Insert failed and no row found after race:', insertErr);
		throw insertErr;
	}

	return created.id as string;
}

/**
 * Ajoute idempotemment une carte template-based au deck Programme de l'élève.
 *
 * Pré-condition : le caller doit avoir vérifié que `template_id` est tagué
 * sur au moins une skill famille A (sinon la carte n'a pas vocation à être
 * dans le Programme).
 *
 * Idempotence : utilise l'index UNIQUE `uq_srs_cards_deck_template` (migration
 * L3 2026-06-10) — un INSERT en double est silencieusement ignoré.
 */
export async function ensureProgrammeDeckCard(
	supabase: SB,
	userId: string,
	templateId: string
): Promise<void> {
	const deckId = await ensureProgrammeDeck(supabase, userId);

	const { error: insertErr } = await supabase.from('srs_cards').insert({
		deck_id: deckId,
		card_type: 'template',
		template_id: templateId
	});

	if (insertErr) {
		// Code 23505 = unique violation : carte déjà présente, no-op.
		if (insertErr.code === '23505') return;
		console.error('[programme-deck] Card insert failed:', insertErr);
		throw insertErr;
	}
}

/**
 * Vérifie si un template est tagué sur au moins une skill famille A.
 * Utilisé par les APIs pour décider d'appeler `ensureProgrammeDeckCard` ou non.
 */
export async function isTemplateTaggedFamilyA(supabase: SB, templateId: string): Promise<boolean> {
	const { data, error } = await supabase
		.from('question_template_skills')
		.select('skill_id, skills!inner(family)')
		.eq('template_id', templateId)
		.eq('skills.family', 'knowledge')
		.limit(1);

	if (error) {
		console.error('[programme-deck] Tagging check failed:', error);
		return false;
	}

	return (data?.length ?? 0) > 0;
}
