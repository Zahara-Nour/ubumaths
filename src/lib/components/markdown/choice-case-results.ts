/**
 * Cases « choix » corrigées — contexte des composants markdown
 * ============================================================
 *
 * Après correction, les choix d'une case choix restent À LEUR PLACE dans l'énoncé
 * rempli (bloc ```choix, `ChoiceBlock.svelte`) : le résultat attendu
 * (`ExpectedChoiceCase`, statuts du QCM) est posé ici par la ligne d'énoncé
 * rempli (`ChoiceCasesScope.svelte`) et lu par le bloc de SA case (`case: N`).
 * Sans fournisseur, ou pour une autre case : liste A, B, C non cliquable.
 *
 * @module components/markdown/choice-case-results
 */

import { getContext, hasContext, setContext } from 'svelte';
import type { ExpectedChoiceCase } from '$lib/questions/expected-result';

const CHOICE_CASE_RESULTS_KEY = Symbol('markdown-choice-case-results');

type ChoiceCaseResultsGetter = () => readonly ExpectedChoiceCase[];

/** Poser les cases choix corrigées pour les blocs descendants (getter : le résultat peut changer) */
export function provideChoiceCaseResults(get: ChoiceCaseResultsGetter): void {
	setContext<ChoiceCaseResultsGetter>(CHOICE_CASE_RESULTS_KEY, get);
}

/**
 * Lecteur des cases choix corrigées posées par un parent (à appeler pendant
 * l'initialisation du composant) ; sans fournisseur : aucune
 */
export function readChoiceCaseResults(): ChoiceCaseResultsGetter {
	if (!hasContext(CHOICE_CASE_RESULTS_KEY)) return () => [];
	return getContext<ChoiceCaseResultsGetter>(CHOICE_CASE_RESULTS_KEY);
}
