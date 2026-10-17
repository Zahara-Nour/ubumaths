/**
 * Taille du texte des fiches d'un élève (`student_print_settings`)
 * ===============================================================
 *
 * Lue avec le client de l'appelant : la RLS décide (l'élève, le sien ; le prof
 * et l'admin, celui de tout élève). Une lecture qui échoue ne bloque jamais un
 * PDF : elle donne la taille normale.
 *
 * ⚠️ La RLS échoue en silence : un enregistrement refusé rend zéro ligne, sans
 * erreur. `saveTextSize` relit donc la ligne écrite.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { textSizeOf, type TextSize } from '$lib/typst/text-size';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('lib/server/worksheets/print-settings');

/** Identifiants par requête (un uuid fait 36 caractères dans l'adresse) */
const IDS_PER_QUERY = 200;

/** La taille d'un élève ; normale sans réglage ou si la lecture échoue */
export async function loadTextSize(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<TextSize> {
	const sizes = await loadTextSizes(supabase, [studentId]);
	return sizes.get(studentId) ?? 'normal';
}

/** La taille de chaque élève demandé (absent de la carte = normale) */
export async function loadTextSizes(
	supabase: SupabaseClient<Database>,
	studentIds: string[]
): Promise<Map<string, TextSize>> {
	const sizes = new Map<string, TextSize>();
	// Par paquets : la liste part dans l'adresse de la requête (jusqu'à 2000 élèves)
	for (let start = 0; start < studentIds.length; start += IDS_PER_QUERY) {
		const ids = studentIds.slice(start, start + IDS_PER_QUERY);
		try {
			const { data, error } = await supabase
				.from('student_print_settings')
				.select('student_id, text_size')
				.in('student_id', ids);
			if (error) throw error;
			for (const row of data ?? []) sizes.set(row.student_id, textSizeOf(row.text_size));
		} catch (err) {
			logger.error('Lecture de la taille du texte impossible :', err);
		}
	}
	return sizes;
}

/**
 * Enregistre la taille d'un élève. Faux si rien n'a été écrit (refus de la
 * RLS : pas un élève, ou pas le droit) ; une erreur de la base est levée.
 */
export async function saveTextSize(
	supabase: SupabaseClient<Database>,
	studentId: string,
	textSize: TextSize
): Promise<boolean> {
	const { data, error } = await supabase
		.from('student_print_settings')
		.upsert({ student_id: studentId, text_size: textSize, updated_at: new Date().toISOString() })
		.select('student_id');
	if (error) {
		// Refus de la policy à l'insertion : « new row violates row-level security »
		if (error.code === '42501') return false;
		throw new Error(`Enregistrement de la taille du texte impossible : ${error.message}`);
	}
	return (data ?? []).length === 1;
}
