/**
 * Bloc ```scratch — PDF (Typst)
 * =============================
 *
 * Palier 1 (2026-11-01) : le programme en texte monospace, le repli décidé ;
 * le dessin en image SVG viendra au palier 2 s'il passe dans Typst.
 *
 * @module ubumark/generators/scratch-typst
 */

import { SCRATCH_UNAVAILABLE, type ScratchNode } from '../types/scratch';

// ============================================================================
// CONSTANTES
// ============================================================================

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${SCRATCH_UNAVAILABLE}]`;

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Le programme en bloc de texte brut, clôturé par plus d'accents graves que la
 * plus longue suite du programme (`dire [```]` ne le ferme pas : revue #2122)
 */
export function generateScratchTypst(node: ScratchNode): string {
	if (node.errors.length > 0) return UNAVAILABLE_TYPST;
	const longest = Math.max(0, ...(node.source.match(/`+/g) ?? []).map((run) => run.length));
	const fence = '`'.repeat(Math.max(3, longest + 1));
	return `${fence}\n${node.source}\n${fence}`;
}
