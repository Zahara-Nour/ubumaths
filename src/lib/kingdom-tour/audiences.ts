/**
 * Les trois publics de Chiphre et leur vue de présentation : la roue de l'accueil y mène,
 * et reste sur chacune pour passer de l'une à l'autre (décision de David, 2026-10-11).
 *
 * ⚠️ Maquette : routes et libellés provisoires, en attente de validation.
 *
 * @module kingdom-tour/audiences
 */

// Types

export type AudienceId = 'student' | 'parent' | 'teacher';

export interface Audience {
	id: AudienceId;
	label: string;
	href: '/eleves' | '/parents' | '/professeurs';
}

// Constantes

/** De bas en haut dans la roue ouverte : l'élève, le plus nombreux, au plus près du pouce */
export const AUDIENCES: Audience[] = [
	{ id: 'student', label: 'Élève', href: '/eleves' },
	{ id: 'parent', label: 'Parent', href: '/parents' },
	{ id: 'teacher', label: 'Professeur', href: '/professeurs' }
];
