/**
 * Références `[[…]]` — contexte de lecture des composants markdown
 *
 * Où mène une référence dépend de QUI lit : un élève connecté (sa route), un
 * professeur dans une classe (`classId`, pour situer un chapitre), un lecteur
 * sans compte du lien public `/cahier/[token]` (la fiche citée s'ouvre par le
 * jeton). Ce contexte est posé une fois par `MarkdownRenderer` (prop
 * `internalLinks`) et lu par `InternalLink`, sans descendre de nœud en nœud.
 *
 * Sans fournisseur : lecteur élève, sans classe ni jeton — le comportement
 * d'avant ce contexte.
 *
 * @module components/markdown/internal-link-context
 */

import { getContext, hasContext, setContext } from 'svelte';
import type { ViewerRole } from '$lib/resources';

/** Qui lit les références, et de quel endroit. */
export interface InternalLinkReader {
	role: ViewerRole;
	/** Classe de lecture, pour situer un chapitre côté professeur. */
	classId?: string;
	/** Jeton du cahier partagé, quand la lecture se fait par ce lien. */
	shareToken?: string;
}

const INTERNAL_LINK_KEY = Symbol('markdown-internal-links');

type ReaderGetter = () => InternalLinkReader;

const DEFAULT_READER: InternalLinkReader = { role: 'student' };

/**
 * Poser le lecteur des références pour les rendus descendants.
 *
 * Getter : le lecteur peut changer. `undefined` garde celui du parent. À
 * appeler pendant l'initialisation du composant.
 */
export function provideInternalLinks(get: () => InternalLinkReader | undefined): void {
	const parent = readInternalLinks();
	setContext<ReaderGetter>(INTERNAL_LINK_KEY, () => get() ?? parent());
}

/** Le lecteur des références ; élève par défaut. */
export function readInternalLinks(): ReaderGetter {
	return hasContext(INTERNAL_LINK_KEY)
		? getContext<ReaderGetter>(INTERNAL_LINK_KEY)
		: () => DEFAULT_READER;
}
