/**
 * Réglages d'impression des fiches d'un élève (`student_print_settings`)
 * =====================================================================
 *
 * Deux réglages d'accessibilité : la taille du texte (élèves malvoyants) et la
 * lecture facilitée (élèves dys : PDF en Luciole et Luciole Math).
 *
 * Lus avec le client de l'appelant : la RLS décide (l'élève, les siens ; le
 * prof et l'admin, ceux de tout élève). Une lecture qui échoue ne bloque jamais
 * un PDF : elle donne les réglages par défaut (taille normale, lecture
 * facilitée éteinte).
 *
 * ⚠️ La RLS échoue en silence : un enregistrement refusé rend zéro ligne, sans
 * erreur. `savePrintSettings` relit donc la ligne écrite.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import { textSizeOf, type TextSize } from '#lib/typst/text-size.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

// ============================================================================
// TYPES
// ============================================================================

/** Les réglages d'impression d'un élève */
export interface PrintSettings {
	textSize: TextSize;
	easyReading: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Sans ligne en base : taille normale, lecture facilitée éteinte */
export const DEFAULT_PRINT_SETTINGS: PrintSettings = { textSize: 'normal', easyReading: false };

const logger = createServerLogger('lib/server/worksheets/print-settings');

/** Identifiants par requête (un uuid fait 36 caractères dans l'adresse) */
const IDS_PER_QUERY = 200;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Les réglages d'un élève ; par défaut sans réglage ou si la lecture échoue */
export async function loadPrintSettings(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<PrintSettings> {
	const settings = await loadPrintSettingsMany(supabase, [studentId]);
	return settings.get(studentId) ?? DEFAULT_PRINT_SETTINGS;
}

/** Les réglages de chaque élève demandé (absent de la carte = par défaut) */
export async function loadPrintSettingsMany(
	supabase: SupabaseClient<Database>,
	studentIds: string[]
): Promise<Map<string, PrintSettings>> {
	const settings = new Map<string, PrintSettings>();
	// Par paquets : la liste part dans l'adresse de la requête (jusqu'à 2000 élèves)
	for (let start = 0; start < studentIds.length; start += IDS_PER_QUERY) {
		const ids = studentIds.slice(start, start + IDS_PER_QUERY);
		try {
			const { data, error } = await supabase
				.from('student_print_settings')
				.select('student_id, text_size, easy_reading')
				.in('student_id', ids);
			if (error) throw error;
			for (const row of data ?? []) {
				settings.set(row.student_id, {
					textSize: textSizeOf(row.text_size),
					// Seul un vrai booléen allume le réglage
					easyReading: row.easy_reading === true
				});
			}
		} catch (err) {
			logger.error("Lecture des réglages d'impression impossible :", err);
		}
	}
	return settings;
}

/** La taille d'un élève ; normale sans réglage ou si la lecture échoue */
export async function loadTextSize(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<TextSize> {
	return (await loadPrintSettings(supabase, studentId)).textSize;
}

/** La taille de chaque élève demandé (absent de la carte = normale) */
export async function loadTextSizes(
	supabase: SupabaseClient<Database>,
	studentIds: string[]
): Promise<Map<string, TextSize>> {
	const settings = await loadPrintSettingsMany(supabase, studentIds);
	return new Map([...settings].map(([id, { textSize }]) => [id, textSize]));
}

/**
 * Enregistre les réglages donnés d'un élève ; un réglage absent n'est pas
 * réécrit. Faux si rien n'a été écrit (refus de la RLS : pas un élève, ou pas
 * le droit) ; une erreur de la base est levée.
 */
export async function savePrintSettings(
	supabase: SupabaseClient<Database>,
	studentId: string,
	changes: Partial<PrintSettings>
): Promise<boolean> {
	const { data, error } = await supabase
		.from('student_print_settings')
		.upsert({
			student_id: studentId,
			...(changes.textSize !== undefined && { text_size: changes.textSize }),
			...(changes.easyReading !== undefined && { easy_reading: changes.easyReading }),
			updated_at: new Date().toISOString()
		})
		.select('student_id');
	if (error) {
		// Refus de la policy à l'insertion : « new row violates row-level security »
		if (error.code === '42501') return false;
		throw new Error(`Enregistrement des réglages d'impression impossible : ${error.message}`);
	}
	return (data ?? []).length === 1;
}

/** Enregistre la taille d'un élève (voir `savePrintSettings`) */
export async function saveTextSize(
	supabase: SupabaseClient<Database>,
	studentId: string,
	textSize: TextSize
): Promise<boolean> {
	return savePrintSettings(supabase, studentId, { textSize });
}
