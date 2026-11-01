/**
 * Bloc ```scratch — dessin (navigateur seulement)
 * ===============================================
 *
 * Dessine le programme en blocs Scratch 3 (SVG) avec `scratchblocks`. Le
 * dessin mesure le texte avec un canvas : il ne tourne que dans le navigateur
 * (ni rendu serveur, ni jsdom). Chargé à la demande par `ScratchBlock.svelte`.
 *
 * @module ubumark/utils/scratch-render
 */

import init from 'scratchblocks/index.js';
import type { ScratchBlocksApi } from 'scratchblocks/index.js';
import fr from 'scratchblocks/locales/fr.json';
import { SCRATCH_LANGUAGES } from './scratch-check';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Échelle du dessin : celle du site des `scratchblocks` en style Scratch 3 */
export const SCRATCH_SCALE = 0.675;

// ============================================================================
// VARIABLES
// ============================================================================

let api: ScratchBlocksApi | null = null;

// ============================================================================
// FONCTIONS
// ============================================================================

/** La bibliothèque, initialisée une fois (dictionnaire français, styles dans la page) */
function scratchblocks(): ScratchBlocksApi {
	if (api === null) {
		api = init(window);
		api.loadLanguages({ fr });
		api.appendStyles();
	}
	return api;
}

/** Dessiner un programme (déjà vérifié par `checkScratchProgram`) */
export function renderScratch(source: string): SVGSVGElement {
	const library = scratchblocks();
	const doc = library.parse(source, { languages: SCRATCH_LANGUAGES });
	return library.render(doc, { style: 'scratch3', scale: SCRATCH_SCALE });
}
