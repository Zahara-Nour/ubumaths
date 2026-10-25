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
		'Dans une question, le bloc est à la fois la figure de départ et la case réponse : l’élève touche un point puis un autre, la droite se trace, et « Valider » la juge. On écrit la figure comme un bloc figure (fenêtre, puis les points après ---), et on dit ce qu’il faut vérifier. Hors d’une question, ou dans une fiche imprimée, seule la figure de départ s’affiche.',
	settingGroups: [
		{
			settings: [
				{
					key: 'verifier',
					values: 'droite_par A ; B (une ligne par vérification)',
					defaultValue: null,
					description:
						'Ce que la figure de l’élève doit contenir : une droite qui passe par les deux points nommés. Toute droite en plus est comptée fausse.'
				},
				{
					key: 'outils',
					values: 'droite',
					defaultValue: 'droite',
					description: 'Les outils proposés à l’élève. Pour l’instant, la droite seule.'
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
