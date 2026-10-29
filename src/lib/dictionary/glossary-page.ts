/**
 * Pages du glossaire : une adresse par terme, `/glossaire/<slug>` (chantier seo)
 * =============================================================================
 *
 * L'adresse (`slug`) est posée en base à la création de l'entrée et ne change plus
 * (migration 20261030001000_dictionnaire_slug). Elle ne fait pas partie de
 * `MathTerm` : elle voyage à côté, dans une table « clé du terme → adresse ».
 *
 * Une forme dérivée **nue** (renvoi sans définition, exemple ni histoire : « résoudre »
 * → « résolution ») n'a pas de page à elle : son adresse redirige vers celle de son
 * terme principal. Une forme dérivée qui a sa propre définition (« Thalès ») garde
 * sa page, avec le lien vers le terme cité.
 *
 * @module dictionary/glossary-page
 */

import { findPrincipal } from '$lib/lexicon/card';
import { toPlainText } from '$lib/seo/site';
import type { MathTerm } from './model';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Adresse d'une entrée et date de sa dernière modification (AAAA-MM-JJ). */
export interface GlossaryAddress {
	slug: string;
	lastmod: string;
}

/** Clé d'un terme → son adresse. Sérialisable : la page la reçoit du serveur. */
export type GlossarySlugs = Record<string, string>;

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Longueur au-delà de laquelle Google coupe la description d'un résultat. */
const DESCRIPTION_MAX = 155;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/** Clé unique d'une entrée : nom et sens (index unique de la table). */
export function termKey(term: Pick<MathTerm, 'term' | 'sense'>): string {
	return `${term.term}|${term.sense ?? ''}`;
}

/** Chemin de la page d'une adresse. */
export function glossaryPath(slug: string): string {
	return `/glossaire/${slug}`;
}

/** Renvoi sans contenu propre : définition, exemple et histoire absents. */
export function isBareRedirect(term: MathTerm): boolean {
	return Boolean(term.derivedFrom) && !term.definitions && !term.exemples && !term.history;
}

/**
 * Terme vers lequel l'adresse d'un renvoi nu redirige. Un seul saut, jamais vers un autre
 * renvoi nu ni vers lui-même : pas de chaîne ni de boucle de redirections, même si l'admin
 * en écrivait une. `undefined` : pas de redirection, le terme a sa page.
 */
export function redirectTargetOf(term: MathTerm, entries: MathTerm[]): MathTerm | undefined {
	if (!isBareRedirect(term) || !term.derivedFrom) return undefined;
	const target = findPrincipal(entries, term.derivedFrom);
	if (!target || target === term || isBareRedirect(target)) return undefined;
	return target;
}

/**
 * Adresse à suivre depuis la liste : celle du terme cité pour un renvoi nu (pas de
 * redirection en chemin), la sienne sinon. `undefined` si elle est inconnue.
 */
export function pageSlugFor(
	term: MathTerm,
	entries: MathTerm[],
	slugs: GlossarySlugs
): string | undefined {
	return slugs[termKey(redirectTargetOf(term, entries) ?? term)];
}

/** Nom affiché d'un terme : « base (puissance) ». */
export function termLabel(term: Pick<MathTerm, 'term' | 'sense'>): string {
	return term.sense ? `${term.term} (${term.sense})` : term.term;
}

/** Description de la page pour les moteurs : la première définition, en texte brut, coupée. */
export function glossaryDescription(term: MathTerm): string {
	const first = term.definitions?.items[0]?.content;
	const text = first ? toPlainText(first).replace(/\s+/g, ' ').trim() : '';
	if (!text) return `Définition de « ${termLabel(term)} » : glossaire mathématique de Chiphre.`;
	if (text.length <= DESCRIPTION_MAX) return text;
	const cut = text.slice(0, DESCRIPTION_MAX - 1);
	const lastSpace = cut.lastIndexOf(' ');
	return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
