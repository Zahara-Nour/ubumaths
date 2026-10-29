/**
 * Page d'un terme du glossaire, `/glossaire/<slug>` (chantier seo).
 *
 * - adresse inconnue ou entrée masquée → 404 ;
 * - renvoi nu (« résoudre ») → redirection permanente vers la page du terme cité, en
 *   un saut (`redirectTargetOf`) ; s'il n'y a pas de cible sûre, le renvoi a sa page ;
 * - sinon la page du terme, avec, pour un renvoi qui a sa propre définition, le
 *   lien vers le terme cité.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isDictionaryAdmin, loadGlossary } from '$lib/server/dictionary/load';
import { findPrincipal } from '$lib/lexicon/card';
import {
	glossaryDescription,
	glossaryPath,
	isBareRedirect,
	redirectTargetOf,
	termKey
} from '$lib/dictionary/glossary-page';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(public)/glossaire/[slug]/+page.server');

/** Format posé par la base (CHECK de `dictionary_entries.slug`) : rien d'autre n'est cherché. */
const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MAX = 200;

export const load: PageServerLoad = async ({ locals, params }) => {
	if (params.slug.length > SLUG_MAX || !SLUG_FORMAT.test(params.slug)) {
		throw error(404, 'Ce terme n’est pas dans le glossaire.');
	}

	let glossary;
	try {
		glossary = await loadGlossary(locals.supabase, { fresh: isDictionaryAdmin(locals) });
	} catch (cause) {
		logger.error('[glossaire] dictionnaire illisible', cause);
		throw error(503, 'Le glossaire est momentanément indisponible.');
	}
	const { entries, addresses } = glossary;

	const term = entries.find((t) => addresses.get(termKey(t))?.slug === params.slug);
	if (!term) throw error(404, 'Ce terme n’est pas dans le glossaire.');

	const target = redirectTargetOf(term, entries);
	const targetSlug = target ? addresses.get(termKey(target))?.slug : undefined;
	if (targetSlug) throw redirect(308, glossaryPath(targetSlug));

	// Renvoi qui a sa page (sa définition, ou un terme cité absent, lui-même un renvoi nu…)
	const cited = term.derivedFrom ? findPrincipal(entries, term.derivedFrom) : undefined;
	const citedSlug = cited && cited !== term ? addresses.get(termKey(cited))?.slug : undefined;
	// Renvoi nu sans terme cité : la page serait vide
	if (isBareRedirect(term) && !citedSlug) throw error(404, 'Ce terme n’est pas dans le glossaire.');

	return {
		term,
		description: glossaryDescription(term),
		cited: cited && citedSlug ? { term: cited, slug: citedSlug } : null
	};
};
