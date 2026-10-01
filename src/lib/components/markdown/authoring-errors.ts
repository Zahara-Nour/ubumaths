/**
 * Erreurs d'auteur visibles ou non — contexte des composants markdown
 *
 * Un bloc mal écrit (```courbe pour l'instant) ne doit pas disparaître en
 * silence (décision Q48 du 2026-10-01) : le PROF voit le message détaillé dans
 * l'éditeur et l'aperçu, l'ÉLÈVE un cadre neutre « Figure indisponible ».
 *
 * Le contexte prof est une prop EXPLICITE de `MarkdownRenderer`
 * (`showAuthoringErrors`), posée par les éditeurs et aperçus ; par défaut,
 * contexte élève. Les rendus imbriqués (listes, rendus enfants) en héritent.
 *
 * @module components/markdown/authoring-errors
 */

import { getContext, hasContext, setContext } from 'svelte';

const AUTHORING_ERRORS_KEY = Symbol('markdown-authoring-errors');

type FlagGetter = () => boolean;

/**
 * Poser le contexte pour les descendants. Sans valeur (`undefined`), un rendu
 * imbriqué garde celle de son parent, et à défaut le contexte élève.
 */
export function provideAuthoringErrors(get: () => boolean | undefined): void {
	const parent = readAuthoringErrors();
	setContext<FlagGetter>(AUTHORING_ERRORS_KEY, () => get() ?? parent());
}

/** Faut-il montrer les erreurs d'auteur ? Repli : non (contexte élève). */
export function readAuthoringErrors(): FlagGetter {
	return hasContext(AUTHORING_ERRORS_KEY)
		? getContext<FlagGetter>(AUTHORING_ERRORS_KEY)
		: () => false;
}
