/**
 * Rendu dans une correction — contexte des composants markdown
 * ============================================================
 *
 * Posé par `CorrectionView` : un bloc écrit dans la correction d'un modèle le
 * sait, sans prop descendue de composant en composant. Sert au bloc
 * ```engrenages, qui ne tourne qu'au corrigé (phase 0 de l'outil n° 52 :
 * dans l'énoncé, l'élève compterait les tours au lieu de chercher le plus
 * petit multiple commun).
 *
 * @module components/markdown/correction-context
 */

import { getContext, hasContext, setContext } from 'svelte';

const IN_CORRECTION_KEY = Symbol('markdown-in-correction');

/** Marquer les descendants comme rendus dans une correction. À appeler à l'initialisation. */
export function provideInCorrection(): void {
	setContext<boolean>(IN_CORRECTION_KEY, true);
}

/** Le composant est-il rendu dans une correction ? Non, sans fournisseur au-dessus. */
export function readInCorrection(): boolean {
	return hasContext(IN_CORRECTION_KEY) ? getContext<boolean>(IN_CORRECTION_KEY) : false;
}
