/**
 * Catalogue — bloc ```figure-a-completer (case « figure »)
 *
 * Réglages : `src/lib/ubumark/parser/construction-parser.ts` (lignes propres au
 * bloc) ; le reste est l'en-tête et le langage de ```figure.
 *
 * @module block-catalog/figure-a-completer
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const figureACompleterEntry: BlockCatalogEntry = {
	slug: 'figure-a-completer',
	title: 'Figure à compléter',
	fences: ['figure-a-completer'],
	nodeType: 'figure',
	summary: 'Une figure de départ sur laquelle l’élève trace ; sa figure est corrigée seule.',
	intro:
		'Dans une question, le bloc est à la fois la figure de départ et la case réponse : l’élève touche un point puis un autre, la droite (ou le segment) se trace, et « Valider » la juge. On écrit la figure comme un bloc figure (fenêtre, puis les points après ---), et on dit ce qu’il faut vérifier. Hors d’une question, ou dans une fiche imprimée, seule la figure de départ s’affiche.',
	settingGroups: [
		{
			settings: [
				{
					key: 'verifier',
					values: 'droite_par A ; B · carre A ; B · rectangle A ; B ; C',
					defaultValue: null,
					description:
						'Ce que la figure de l’élève doit contenir. droite_par : une droite qui passe par les deux points nommés (une ligne par droite ; toute droite en plus est fausse). carre : le côté [AB] est tracé, l’élève trace les trois autres, d’un côté ou de l’autre. rectangle : les côtés [AB] et [BC] sont tracés, l’élève trace les deux autres. Un seul carré ou rectangle par figure.'
				},
				{
					key: 'outils',
					values: 'droite ou segment',
					defaultValue: 'celui de la vérification',
					description:
						'L’outil proposé à l’élève, un seul par figure : droite pour droite_par, segment pour carre et rectangle. Avec un quadrillage (grille:) et le segment, chaque toucher va au nœud le plus proche.'
				},
				{
					key: 'fenetre, taille…',
					values: 'comme pour le bloc figure',
					defaultValue: 'comme pour le bloc figure',
					description:
						'L’en-tête de la figure de départ. Sans repère ni quadrillage, l’élève trace sur une feuille blanche.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Tracer la droite (AB), avec un point piège',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'outils: droite',
				'verifier: droite_par A ; B',
				'---',
				'A = point(1, 2)',
				'B = point(7, 2)',
				'C = point(4, 5)'
			),
			explanation:
				'Le point C ne doit pas être pris : sans lui, l’élève ne pourrait pas se tromper (le doigt est aimanté sur les points).'
		},
		{
			title: 'Deux droites à tracer',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'verifier: droite_par A ; B',
				'verifier: droite_par A ; C',
				'---',
				'A = point(2, 1)',
				'B = point(8, 2)',
				'C = point(4, 5)'
			),
			explanation: 'Une ligne par droite attendue ; il faut toutes les tracer, et rien de plus.'
		},
		{
			title: 'Terminer un carré sur quadrillage, sans lettres',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'grille: 1',
				'outils: segment',
				'verifier: carre A ; B',
				'---',
				'A = point(2, 4, visible=faux)',
				'B = point(5, 4, visible=faux)',
				'ab = segment(A, B)'
			),
			explanation:
				'Le côté [AB] est tracé, ses sommets sont cachés. Un côté tracé en plusieurs morceaux est accepté ; un trait qui dépasse ou qui ne suit pas les lignes est faux.'
		}
	],
	mistakes: [
		{
			title: 'Vérification oubliée',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'---',
				'A = point(1, 2)',
				'B = point(7, 2)'
			),
			message: 'Vérification manquante',
			explanation:
				'Sans « verifier: », rien ne dit ce qu’il faut tracer : ajouter « verifier: droite_par A ; B ».'
		},
		{
			title: 'Un seul point dans la vérification',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'verifier: droite_par A',
				'---',
				'A = point(1, 2)',
				'B = point(7, 2)'
			),
			message: 'droite_par attend deux points',
			explanation: 'Une droite passe par deux points : les nommer tous les deux, séparés par « ; ».'
		}
	],
	tryIt: fence(
		'figure-a-completer',
		'fenetre: 0 ; 10 ; 0 ; 6',
		'verifier: droite_par A ; B',
		'---',
		'A = point(2, 4)',
		'B = point(8, 1)',
		'C = point(6, 5)'
	),
	seeAlso: { href: '/aide-ecriture/geometrie', label: 'Le langage des figures' }
};
