/**
 * Langue du contenu affiché — contexte des composants markdown
 *
 * Un document en anglais écrit ses décimaux avec un point (« 0.3 »), le
 * français avec une virgule (décision du 2026-09-25). La langue est posée une
 * fois par `MarkdownRenderer` / `InlineMarkdown` (prop `locale`) et lue par les
 * nœuds qui mettent en forme des nombres (formules, arbre pondéré), sans la
 * faire descendre de composant en composant.
 *
 * @module components/markdown/content-locale
 */

import { getContext, hasContext, setContext } from 'svelte';
import { DEFAULT_CONTENT_LOCALE, type ContentLocale } from '$lib/types/locale';

const CONTENT_LOCALE_KEY = Symbol('markdown-content-locale');

type LocaleGetter = () => ContentLocale;

/**
 * Poser la langue pour les composants descendants.
 *
 * Getter : la langue peut changer (onglet FR/EN de l'éditeur). Sans langue
 * (`undefined`), un rendu imbriqué garde celle de son parent, et à défaut le
 * français. À appeler pendant l'initialisation du composant.
 */
export function provideContentLocale(get: () => ContentLocale | undefined): void {
	const parent = readContentLocale();
	setContext<LocaleGetter>(CONTENT_LOCALE_KEY, () => get() ?? parent());
}

/**
 * La langue que doit suivre un composant.
 *
 * Repli sur le français quand aucun fournisseur n'est monté au-dessus : les
 * nœuds sont aussi montés seuls (tests, aperçus), et le français est la langue
 * de référence du contenu.
 */
export function readContentLocale(): LocaleGetter {
	return hasContext(CONTENT_LOCALE_KEY)
		? getContext<LocaleGetter>(CONTENT_LOCALE_KEY)
		: () => DEFAULT_CONTENT_LOCALE;
}
