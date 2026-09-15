/**
 * Atelier — insertion d'un collage
 *
 * Ce qui est collé est relu puis réécrit en LaTeX, pour que l'élève voie
 * immédiatement ce que l'atelier a compris (§6 bis N1). Et le geste reste
 * annulable : c'est le seul filet, puisqu'il n'y a **pas** de critère de refus
 * au collage — voir l'encadré du §6 bis.
 *
 * @module atelier/paste
 */

import { normalizePasted } from './parse';

/**
 * Le minimum qu'on attend d'un champ de maths.
 *
 * Typé en creux plutôt qu'en important `MathfieldElement` : la logique reste
 * testable sans navigateur, et ce module ne dépend pas de MathLive.
 */
export interface InsertableField {
	executeCommand(command: string | [string, ...unknown[]]): boolean;
}

/**
 * Insérer un texte collé, sous sa forme normalisée.
 *
 * ⚠️ Passe par `insert` et **jamais** par `setValue`. Mesuré dans Chromium :
 * `setValue` écrase la pile d'annulation — un `Ctrl+Z` après le collage ne
 * revient alors pas en arrière, sans que rien ne l'explique. `insert` nourrit
 * cette pile, donc l'annulation native fonctionne (§6 bis N4).
 */
export function insertPasted(field: InsertableField, text: string): void {
	if (text.trim() === '') return;
	field.executeCommand(['insert', normalizePasted(text)]);
}
