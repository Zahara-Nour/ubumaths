/**
 * Atelier — les étapes en version résumée (interrupteur « Résumé / Détaillé »)
 *
 * Les quatre commandes qui rédigent leurs étapes (simplifier, factoriser,
 * dériver, résoudre) rendent le MÊME calcul deux fois : en `detailed` (la
 * ligne), en `summarized` (le résumé). Rien n'est relancé au clic : le
 * moteur a tourné une fois, seul `renderAll` diffère — et il ne coûte rien.
 *
 * ⚠️ Mesuré le 2026-10-13 : dans les cinq renderers branchés ici
 * (simplification, dérivation, premier degré, second degré, valeur absolue),
 * la verbosité ne gouverne que l'`explanation` de chaque étape. Le résumé,
 * c'est donc les mêmes titres et les mêmes calculs, sans le « pourquoi ».
 * On compare tout de même les rendus plutôt que d'en déduire l'égalité : un
 * renderer qui changerait demain ses titres resterait juste.
 *
 * `.variations` a sa propre rédaction, sans verbosité : hors périmètre.
 *
 * @module atelier/steps-summary
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';

// =============================================================================
// Types
// =============================================================================

/** Les deux rédactions qu'offre l'interrupteur. */
export type StepsVerbosity = 'summarized' | 'detailed';

// =============================================================================
// Constantes
// =============================================================================

/**
 * La clé du choix retenu dans ce navigateur.
 *
 * À part de `chiphre-atelier` : c'est une préférence d'affichage, pas un
 * objet de l'atelier — elle ne voyage ni dans un lien ni dans une fusion.
 */
export const STEPS_VERBOSITY_KEY = 'chiphre-atelier-etapes';

/** « Détaillé » à l'ouverture (décision de David, 2026-10-13). */
export const DEFAULT_STEPS_VERBOSITY: StepsVerbosity = 'detailed';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * La version résumée, ou `undefined` quand elle ne dit rien de moins.
 *
 * Un interrupteur qui ne change rien ferait chercher à l'élève une différence
 * qui n'existe pas : la ligne ne l'offre alors pas.
 */
export function summaryOf(
	detailed: readonly RenderedStep[],
	summarized: readonly RenderedStep[]
): readonly RenderedStep[] | undefined {
	// Données simples (textes, LaTeX, grilles) : la forme JSON suffit
	return JSON.stringify(detailed) === JSON.stringify(summarized) ? undefined : summarized;
}

/** Le dernier choix retenu dans ce navigateur, « Détaillé » sinon. */
export function readStepsVerbosity(storage: Storage | null): StepsVerbosity {
	try {
		const stored = storage?.getItem(STEPS_VERBOSITY_KEY) ?? null;
		return stored === 'summarized' || stored === 'detailed' ? stored : DEFAULT_STEPS_VERBOSITY;
	} catch {
		// Stockage refusé (mode privé strict) : la page marche sans
		return DEFAULT_STEPS_VERBOSITY;
	}
}

/** Retenir le choix ; un refus du navigateur n'est pas une erreur. */
export function writeStepsVerbosity(storage: Storage | null, verbosity: StepsVerbosity): void {
	try {
		storage?.setItem(STEPS_VERBOSITY_KEY, verbosity);
	} catch {
		// Quota, mode privé : le choix vaut pour la session de la page
	}
}
