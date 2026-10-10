/**
 * Helper d'auto-gestion du deck Programme.
 *
 * Le deck Programme (1 par élève, `is_auto_managed=true`) est créé automatiquement
 * à la première interaction Monde 1 (quiz interactif) ou Monde 2 (review SRS)
 * sur un template tagué famille A.
 *
 * Pattern lookup-then-insert avec gestion de la race condition, inspiré de
 * `resource-tags.ts` (`syncResourceTags`).
 *
 * Spec : `docs/archive/wip/srs-fsrs-spec-tdd.md` §4.
 * Architecture : `docs/systeme/srs/architecture.md` §3.4 + §4.1.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/srs/programme-deck');

type SB = SupabaseClient<Database>;

const PROGRAMME_DECK_NAME = 'Programme';
const PROGRAMME_DECK_DESCRIPTION =
	'Tes capacités à retravailler — mises à jour automatiquement après chaque entraînement.';

/**
 * Retourne l'ID du deck Programme de l'élève. Crée le deck si nécessaire.
 *
 * ⚠️ `userId` doit venir de la SESSION authentifiée de l'appelant, jamais d'une
 * entrée client : la CRÉATION du paquet passe par le client service (décision
 * de David, 2026-10-04 : un paquet auto-géré ou assigné est toujours créé par
 * le serveur, jamais par l'élève). La LECTURE reste au client de l'élève.
 *
 * Idempotent grâce à l'index UNIQUE `uq_srs_decks_one_programme_per_owner`
 * (migration 20260610150000) + retry explicite sur code 23505.
 *
 * @returns UUID du deck Programme
 */
export async function ensureProgrammeDeck(supabase: SB, userId: string): Promise<string> {
	// 1. Lookup existant — un paquet « assigné » n'est jamais le Programme : sans ce filtre,
	// un paquet auto-managé créé à la main avec is_assigned = true serait rempli par le serveur.
	const { data: existing, error: lookupErr } = await supabase
		.from('srs_decks')
		.select('id')
		.eq('owner_id', userId)
		.eq('is_auto_managed', true)
		.eq('is_assigned', false)
		.limit(1)
		.maybeSingle();

	if (lookupErr) {
		console.error('[programme-deck] Lookup failed:', lookupErr);
		throw lookupErr;
	}

	if (existing) {
		return existing.id as string;
	}

	// 2. INSERT par le client SERVICE (l'index UNIQUE garantit l'unicité).
	// La base refusera bientôt à un compte connecté de créer un paquet
	// `is_auto_managed` : seul le serveur le fait, pour l'utilisateur de la session.
	const service = createServiceRoleClient();
	const { data: created, error: insertErr } = await service
		.from('srs_decks')
		.insert({
			owner_id: userId,
			name: PROGRAMME_DECK_NAME,
			description: PROGRAMME_DECK_DESCRIPTION,
			deck_type: 'personal',
			is_assigned: false,
			is_auto_managed: true
		})
		.select('id')
		.single();

	if (insertErr) {
		// 23505 = unique violation : un autre thread a créé le deck entre notre
		// lookup et notre insert. Re-lookup et renvoie le deck créé par l'autre.
		if (insertErr.code === '23505') {
			const { data: refreshed, error: refreshErr } = await supabase
				.from('srs_decks')
				.select('id')
				.eq('owner_id', userId)
				.eq('is_auto_managed', true)
				.eq('is_assigned', false)
				.limit(1)
				.maybeSingle();
			if (refreshErr) {
				logger.error('Relecture du paquet Programme impossible après course', {
					userId,
					error: refreshErr
				});
				throw refreshErr;
			}
			if (refreshed) return refreshed.id as string;
			logger.error('23505 levée mais aucun paquet Programme relu — index incohérent ?', {
				userId
			});
		}
		logger.error('Création du paquet Programme impossible', { userId, error: insertErr });
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
 * ⚠️ `userId` doit venir de la SESSION authentifiée de l'appelant, jamais d'une
 * entrée client : la carte est écrite avec les droits du serveur.
 *
 * Le paquet est lu (ou créé) avec le client de l'ÉLÈVE : la RLS de `srs_decks`
 * et le filtre `owner_id = userId` garantissent qu'il lui appartient. La carte,
 * elle, est écrite avec le client service : depuis la migration
 * 20261003100000, aucun compte connecté ne peut insérer dans un paquet
 * `is_auto_managed` (le paquet Programme est rempli par le serveur seul).
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

	const service = createServiceRoleClient();
	const { data: inserted, error: insertErr } = await service
		.from('srs_cards')
		.insert({
			deck_id: deckId,
			card_type: 'template',
			template_id: templateId
		})
		.select('id');

	if (insertErr) {
		// Code 23505 = unique violation : carte déjà présente, no-op.
		if (insertErr.code === '23505') return;
		console.error('[programme-deck] Card insert failed:', insertErr);
		throw insertErr;
	}

	// Un refus silencieux rendrait zéro ligne sans erreur
	// (cf. docs/pratiques/rls-echecs-silencieux.md) : on le rend visible.
	if (!inserted || inserted.length !== 1) {
		const message = `[programme-deck] Carte non écrite : ${inserted?.length ?? 0} ligne(s) rendue(s)`;
		console.error(message, { deckId, templateId });
		throw new Error(message);
	}
}
