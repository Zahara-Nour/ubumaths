/**
 * Jugement d'une réponse « programme tortue » (bloc ```tortue d'un modèle de question) : le
 * programme de l'élève et le programme attendu, écrits en notation texte, sont rejoués par
 * l'interpréteur (ADR 0039) ; on compare les segments tracés, sans tenir compte du chemin.
 *
 * Sans dépendance à Blockly : s'exécute aussi sous Node (correction).
 */

import { executerTortue, messageErreurTortue } from './interpreteur';
import { texteVersEtat } from './notation';
import { memesFormes, memesTraces, type Segment } from './segments';

// =============================================================================
// Types
// =============================================================================

/**
 * `position` : la même figure au même endroit (la tortue part toujours du centre, vers la
 * droite) ; `forme` : la même figure à une translation, un quart de tour ou un retournement près.
 */
export type ComparaisonTortue = 'position' | 'forme';

export type ProgrammeLu = { ok: true; segments: Segment[] } | { ok: false; message: string };

export interface VerdictTortue {
	juste: boolean;
	/** Pourquoi le programme n'a pas pu être jugé (illisible, ne s'arrête pas…). */
	message?: string;
}

// =============================================================================
// Constantes
// =============================================================================

export const COMPARAISONS_TORTUE: readonly ComparaisonTortue[] = ['position', 'forme'];

// =============================================================================
// Fonctions
// =============================================================================

/** Lit et exécute un programme écrit ; rend ses segments, ou le message de l'erreur. */
export function lireProgrammeTortue(texte: string): ProgrammeLu {
	const lu = texteVersEtat(texte);
	if (!lu.ok) return lu;
	const resultat = executerTortue(lu.etat);
	if (!resultat.ok) return { ok: false, message: messageErreurTortue(resultat.erreur) };
	return { ok: true, segments: resultat.segments };
}

/** Juge le programme de l'élève contre le programme attendu. Ne lève jamais. */
export function jugerProgrammeTortue(
	reponse: string,
	attendu: string,
	comparaison: ComparaisonTortue
): VerdictTortue {
	if (reponse.trim() === '') return { juste: false };
	const eleve = lireProgrammeTortue(reponse);
	if (!eleve.ok) return { juste: false, message: eleve.message };
	const reference = lireProgrammeTortue(attendu);
	// Un attendu illisible est refusé à la publication ; ici, jamais juste
	if (!reference.ok || reference.segments.length === 0) return { juste: false };
	const memes = comparaison === 'forme' ? memesFormes : memesTraces;
	return { juste: memes(eleve.segments, reference.segments) };
}
