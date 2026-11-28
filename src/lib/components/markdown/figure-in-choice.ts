/**
 * Figure dans un choix à cocher — contexte des composants markdown
 *
 * Un choix est lui-même un bouton (ou une ligne de la liste corrigée, étroite) :
 * une figure qui s'y dessine n'y pose pas de bouton à elle (« Agrandir » du bloc
 * solide, chantier `solide-agrandir`). Le contexte est connu dès le rendu
 * serveur, où un bouton dans un bouton casserait la page.
 *
 * Posé par `ChoiceList.svelte` et `MultipleChoiceInput.svelte` ; les rendus
 * imbriqués en héritent.
 *
 * @module components/markdown/figure-in-choice
 */

import { getContext, hasContext, setContext } from 'svelte';

export const FIGURE_IN_CHOICE_KEY = Symbol('markdown-figure-in-choice');

/** Les figures des descendants sont dans un choix à cocher */
export function provideFigureInChoice(): void {
	setContext<boolean>(FIGURE_IN_CHOICE_KEY, true);
}

/** La figure est-elle dans un choix à cocher ? Repli : non. */
export function readFigureInChoice(): boolean {
	return hasContext(FIGURE_IN_CHOICE_KEY) && getContext<boolean>(FIGURE_IN_CHOICE_KEY) === true;
}
