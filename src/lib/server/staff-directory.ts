/**
 * L'annuaire du personnel — nom et avatar, côté serveur
 *
 * ⚠️ Pourquoi passer par un RPC plutôt que de lire `profiles` : depuis que la
 * lecture des profils est bornée, un élève ne voit QUE lui-même, ses camarades
 * actifs, ses amis et ses co-participants de tournoi. Son professeur n'entre
 * dans aucune de ces cases — `class_members` ne contient que des élèves, et un
 * prof n'est ni un ami ni un joueur.
 *
 * Un `.from('profiles').eq('role', 'teacher')` rend donc `null` à un élève, en
 * silence : pas d'erreur, juste une absence. Six écrans affichaient ainsi
 * « Utilisateur inconnu » à la place du nom du professeur.
 *
 * `get_staff_directory()` est `SECURITY DEFINER` et ne rend que six colonnes —
 * jamais l'e-mail. C'est pour cette raison qu'une fonction remplace une policy :
 * la RLS est par LIGNE, pas par colonne.
 *
 * @module server/staff-directory
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/** Une ligne de l'annuaire, telle que le RPC la rend. */
export type StaffMember = Database['public']['Functions']['get_staff_directory']['Returns'][number];

/**
 * L'annuaire complet.
 *
 * Rend un tableau VIDE en cas de panne, jamais une exception : le nom du
 * professeur est un élément de contexte, pas le contenu de la page. Une classe
 * sans nom de prof reste lisible ; une page en erreur 500, non.
 */
export async function fetchStaffDirectory(
	supabase: SupabaseClient<Database>
): Promise<StaffMember[]> {
	const { data, error } = await supabase.rpc('get_staff_directory');

	if (error) {
		console.error('[staff-directory] Annuaire du personnel illisible :', error);
		return [];
	}

	return data ?? [];
}

/**
 * Le professeur unique, ou `null`.
 *
 * ⚠️ `find` et non `[0]` : l'annuaire contient aussi les admins, et rien ne
 * garantit l'ordre. Prendre la première ligne attribuerait les cours à
 * l'administrateur un jour sur deux.
 */
export function soleTeacher(annuaire: StaffMember[]): StaffMember | null {
	return annuaire.find((m) => m.role === 'teacher') ?? null;
}

/** L'annuaire indexé par identifiant, pour retrouver l'auteur d'une ligne. */
export function indexStaffById(annuaire: StaffMember[]): Map<string, StaffMember> {
	return new Map(annuaire.map((m) => [m.id, m]));
}
