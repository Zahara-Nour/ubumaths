/**
 * Retours qui dépendent de la page d'origine
 *
 * Règle du bouton retour (docs/pratiques/composants-ui.md § BackLink) : le retour
 * mène à la page parente, lue dans l'adresse. Une page qui a deux parents possibles
 * le dit dans son adresse, par `?depuis=`. La valeur vient de l'URL : seule une
 * origine connue est retenue, sinon la page parente par défaut.
 */
import { lore } from '$lib/config/lore';

export const FROM_PARAM = 'depuis';

export type ReturnLink = { href: string; label: string };

// ============================================================================
// JOURNAL D'UN ÉLÈVE (prof) — ouvert depuis les classes ou depuis l'accueil
// ============================================================================

export function studentJournalHref(studentId: string, from?: 'accueil'): string {
	const href = `/dashboard/teacher/students/${studentId}/journal`;
	return from ? `${href}?${FROM_PARAM}=${from}` : href;
}

export function studentJournalReturn(searchParams: URLSearchParams): ReturnLink {
	if (searchParams.get(FROM_PARAM) === 'accueil') {
		return { href: '/dashboard', label: "Retour à l'accueil" };
	}
	return { href: '/dashboard/teacher/classes', label: `Retour aux ${lore.entities.class}s` };
}

// ============================================================================
// SESSION DE RÉVISION — lancée depuis la page du deck ou depuis le Programme
// ============================================================================

export function studySessionHref(
	deckId: string,
	options: { states?: string; from?: 'programme' } = {}
): string {
	const query = new URLSearchParams();
	if (options.states) query.set('states', options.states);
	if (options.from) query.set(FROM_PARAM, options.from);
	const search = query.toString();
	return `/dashboard/revisions/decks/${deckId}/study${search ? `?${search}` : ''}`;
}

export function studySessionReturnHref(deckId: string, searchParams: URLSearchParams): string {
	return searchParams.get(FROM_PARAM) === 'programme'
		? '/dashboard/revisions/decks/programme'
		: `/dashboard/revisions/decks/${deckId}`;
}

// ============================================================================
// « QUITTER » UN TEST D'AUTOMATISMES
// ============================================================================

/**
 * Un contrôle ramène à « Mes contrôles », un entraînement au panier.
 *
 * En contrôle, partir garde la tentative ouverte : à la reprise, mêmes questions
 * mais réponses à retaper, et le chrono d'une course a continué de tourner.
 * D'où une confirmation, qui ne parle du temps que s'il y en a un.
 */
export function automathsQuitLink(options: { inEvaluation: boolean; timed: boolean }): {
	href: string;
	confirmLeave: string | undefined;
} {
	if (!options.inEvaluation) return { href: '/automaths/panier', confirmLeave: undefined };
	const consequence = options.timed
		? 'Tes réponses tapées seront perdues et le temps continue de courir.'
		: 'Tes réponses tapées seront perdues.';
	return {
		href: '/dashboard/student/assessments',
		confirmLeave: `${consequence} Quitter quand même ?`
	};
}
