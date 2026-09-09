/**
 * Cahier de texte partageable — jetons de lecture.
 *
 * Tous les élèves n'ont pas de compte ; sans lien, ceux-là n'ont aucun moyen de
 * savoir ce qu'il y a à faire. Ce module gère le lien qui rend un cahier lisible
 * sans authentifier.
 *
 * ⚠️ À NE JAMAIS CONFONDRE AVEC `classes.join_code`. Les deux sont des secrets
 * qui circulent, mais le code d'inscription INSCRIT un élève dans la classe,
 * tandis que ce jeton ne fait que LIRE. Les mélanger transformerait un lien
 * envoyé à des familles en porte d'entrée dans la classe.
 *
 * @module server/journal-share-tokens
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { generateShareTokenString } from '$lib/server/exercise-share-tokens';

type SB = SupabaseClient<Database>;

/** Une entrée telle que la voit un visiteur sans compte. */
export interface PublicJournalEntry {
	id: string;
	entry_date: string;
	lesson_content: string | null;
	homework_content: string | null;
	homework_due_date: string | null;
}

export interface PublicJournal {
	class_name: string;
	class_grade: string | null;
	entries: PublicJournalEntry[];
}

/**
 * Une fiche d'exercices lisible par un porteur de jeton.
 *
 * Forme volontairement proche de `WorksheetWithRelations` : c'est ce que le
 * composant de composition PDF attend. Les champs absents (créateur, école,
 * dates) ne servent pas au rendu et n'ont aucune raison d'être exposés.
 */
export interface PublicWorksheet {
	id: string;
	title: string;
	description: string | null;
	type: string;
	config: unknown;
	status: string;
	grades: string[] | null;
	translations: unknown;
	total_points: number | null;
	estimated_duration_minutes: number | null;
	sections: unknown[];
	exercises: unknown[];
}

export interface JournalShareToken {
	id: string;
	class_id: string;
	token: string;
	is_active: boolean;
	expires_at: string | null;
	access_count: number;
	last_accessed_at: string | null;
	created_at: string;
}

/**
 * Fin de l'année scolaire suivante : le 31 août à venir.
 *
 * Un lien d'année scolaire doit mourir de lui-même à la rentrée plutôt que de
 * survivre indéfiniment chez d'anciennes familles.
 */
export function endOfSchoolYear(now: Date = new Date()): Date {
	// Septembre (mois 8) et après → 31 août de l'année suivante ; sinon celui de
	// l'année en cours.
	const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
	return new Date(Date.UTC(year, 7, 31, 23, 59, 59));
}

/**
 * Le jeton actif ET NON EXPIRÉ d'une classe, s'il en existe un.
 *
 * Filtrer l'expiration ici n'est pas cosmétique : sans ça, la page prof
 * afficherait après le 31 août un lien que la RPC refuse déjà, et les familles
 * recevraient un 404 sans explication. Un lien qui « ne marche plus sans raison
 * visible » pousse au contournement — rediffuser le code d'inscription, envoyer
 * le contenu par un autre canal.
 */
export async function getActiveShareToken(
	supabase: SB,
	classId: string
): Promise<{ token: JournalShareToken | null; error: string | null }> {
	const { data, error } = await supabase
		.from('class_journal_share_tokens')
		.select(
			'id, class_id, token, is_active, expires_at, access_count, last_accessed_at, created_at'
		)
		.eq('class_id', classId)
		.eq('is_active', true)
		.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
		.maybeSingle();

	if (error) {
		console.error('[journal-share] lecture du jeton actif impossible:', error.message);
		return { token: null, error: 'Impossible de lire le lien de partage' };
	}

	return { token: data, error: null };
}

/**
 * Crée un lien pour une classe, en révoquant le précédent.
 *
 * La révocation d'abord n'est pas un détail : un index unique partiel n'autorise
 * qu'un seul jeton actif par classe, et surtout deux liens vivants seraient deux
 * secrets à révoquer le jour où l'un fuite.
 */
export async function rotateShareToken(
	supabase: SB,
	classId: string,
	userId: string
): Promise<{ token: JournalShareToken | null; error: string | null }> {
	const { error: revokeError } = await revokeShareToken(supabase, classId);
	if (revokeError) return { token: null, error: revokeError };

	const { data, error } = await supabase
		.from('class_journal_share_tokens')
		.insert({
			class_id: classId,
			// CSPRNG : `Math.random()` est prédictible, et quelques jetons émis
			// suffisent à retrouver l'état du générateur (finding H8, audit d'août).
			token: generateShareTokenString(),
			created_by: userId,
			expires_at: endOfSchoolYear().toISOString()
		})
		.select(
			'id, class_id, token, is_active, expires_at, access_count, last_accessed_at, created_at'
		)
		.single();

	if (error) {
		console.error('[journal-share] création du jeton impossible:', error.message);
		return { token: null, error: 'Impossible de créer le lien de partage' };
	}

	return { token: data, error: null };
}

/**
 * Désactive le lien actif d'une classe. Les lignes ne sont jamais supprimées :
 * on garde trace de ce qui a circulé.
 */
export async function revokeShareToken(
	supabase: SB,
	classId: string
): Promise<{ error: string | null }> {
	// Désactive TOUS les jetons encore marqués actifs, expirés compris — et non
	// pas seulement celui que `getActiveShareToken` renverrait. Cette fonction
	// filtre l'expiration ; s'appuyer sur elle laisserait un jeton expiré mais
	// toujours `is_active`, que l'index unique partiel opposerait ensuite à toute
	// création de nouveau lien.
	const { error } = await supabase
		.from('class_journal_share_tokens')
		.update({ is_active: false })
		.eq('class_id', classId)
		.eq('is_active', true);

	if (error) {
		console.error('[journal-share] révocation impossible:', error.message);
		return { error: 'Impossible de révoquer le lien' };
	}

	return { error: null };
}

/**
 * Résout un jeton en cahier lisible.
 *
 * Renvoie `null` sans distinguer révoqué, expiré et inexistant : le dire
 * confirmerait à un visiteur qu'un jeton a existé.
 */
export async function resolveShareToken(
	supabase: SB,
	token: string
): Promise<PublicJournal | null> {
	const { data, error } = await supabase.rpc('get_class_journal_by_share_token', {
		p_token: token
	});

	if (error) {
		console.error('[journal-share] résolution impossible:', error.message);
		return null;
	}

	return (data as PublicJournal | null) ?? null;
}

/**
 * La fiche désignée, SI elle est citée dans une séance visible de ce cahier.
 *
 * Toute la décision d'accès est prise en base, par une fonction
 * `security definer` — le lecteur est `anon` et n'a aucun droit sur
 * `worksheets`. On ne distingue pas « fiche inexistante » de « fiche non
 * citée » : les deux renvoient `null`, pour ne rien apprendre à qui essaierait
 * des identifiants au hasard.
 */
export async function resolveWorksheetByShareToken(
	supabase: SB,
	token: string,
	worksheetId: string
): Promise<PublicWorksheet | null> {
	const { data, error } = await supabase.rpc('get_worksheet_by_share_token', {
		p_token: token,
		p_worksheet_id: worksheetId
	});

	if (error) {
		console.error('[journal-share] fiche illisible:', error.message);
		return null;
	}

	return (data as PublicWorksheet | null) ?? null;
}
