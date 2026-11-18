/**
 * Jugement d'une réponse « programme tortue » (bloc ```tortue d'un modèle de question) : le
 * programme de l'élève et le programme attendu, écrits en notation texte, sont rejoués par
 * l'interpréteur (ADR 0039) ; on compare les segments tracés, sans tenir compte du chemin.
 *
 * Sans dépendance à Blockly : s'exécute aussi sous Node (correction).
 */

import { executerTortue, messageErreurTortue, type NiveauTortue } from './interpreteur';
import { nombreDeBlocsTortue, texteVersEtatTortue } from './niveaux';
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

/**
 * Lit et exécute un programme écrit, avec les blocs du niveau (sans niveau par défaut) ; rend ses
 * segments, ou le message de l'erreur.
 */
export function lireProgrammeTortue(texte: string, niveau: NiveauTortue = 'base'): ProgrammeLu {
	const lu = texteVersEtatTortue(texte, niveau);
	if (!lu.ok) return lu;
	const resultat = executerTortue(lu.etat, niveau);
	if (!resultat.ok) return { ok: false, message: messageErreurTortue(resultat.erreur) };
	return { ok: true, segments: resultat.segments };
}

/** Message d'un programme qui dépasse le nombre maximal de blocs (`blocs:`). */
export function messageTropDeBlocs(nombre: number, maximum: number): string {
	return `Ton programme utilise ${nombre} blocs ; il en faut au plus ${maximum}.`;
}

/**
 * Le programme dépasse-t-il le nombre maximal de blocs ? Rend le message, ou null (dans la
 * limite, sans limite, ou illisible : sa lecture dit pourquoi).
 */
export function depassementDeBlocs(
	reponse: string,
	maximum: number | null,
	niveau: NiveauTortue = 'base'
): string | null {
	if (maximum === null) return null;
	const nombre = nombreDeBlocsTortue(reponse, niveau);
	if (nombre === null || nombre <= maximum) return null;
	return messageTropDeBlocs(nombre, maximum);
}

/**
 * Juge le programme de l'élève contre le programme attendu, avec les blocs du niveau de la
 * question (sans niveau par défaut : un bloc au-dessus est refusé). `blocsMax` (`blocs:`) :
 * au-delà, faux avec le message, même si le tracé est juste. Ne lève jamais.
 */
export function jugerProgrammeTortue(
	reponse: string,
	attendu: string,
	comparaison: ComparaisonTortue,
	blocsMax: number | null = null,
	niveau: NiveauTortue = 'base'
): VerdictTortue {
	if (reponse.trim() === '') return { juste: false };
	const eleve = lireProgrammeTortue(reponse, niveau);
	if (!eleve.ok) return { juste: false, message: eleve.message };
	const tropDeBlocs = depassementDeBlocs(reponse, blocsMax, niveau);
	if (tropDeBlocs !== null) return { juste: false, message: tropDeBlocs };
	const reference = lireProgrammeTortue(attendu, niveau);
	// Un attendu illisible est refusé à la publication ; ici, jamais juste
	if (!reference.ok || reference.segments.length === 0) return { juste: false };
	const memes = comparaison === 'forme' ? memesFormes : memesTraces;
	return { juste: memes(eleve.segments, reference.segments) };
}
