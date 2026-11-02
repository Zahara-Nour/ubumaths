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
					values:
						"droite_par A ; B · carre A ; B · rectangle A ; B ; C · symetrique par d · symetrique A ; B ; C par d · point A' = symetrie(A, axe=d)",
					defaultValue: null,
					description:
						"Ce que la figure de l’élève doit contenir. droite_par : une droite qui passe par les deux points nommés (une ligne par droite ; toute droite en plus est fausse). carre : le côté [AB] est tracé, l’élève trace les trois autres, d’un côté ou de l’autre. rectangle : les côtés [AB] et [BC] sont tracés, l’élève trace les deux autres. symetrique par d : l’élève trace le symétrique de tout ce qui est tracé (segments, polygones) sauf l’axe d ; par O (un point) : symétrie centrale ; symetrique A ; B ; C par d : seulement les traits entre ces points. Sur quadrillage (grille:), le symétrique dans la fenêtre et sur les nœuds. Un seul carré, rectangle ou symétrique par figure. point A' = <expression> : l’élève place un point là où l’expression du langage des figures le met (symetrie, milieu, intersection…) ; une ligne par point, l’élève ne les nomme pas ; A' n’est pas un nom de la figure, il sert à la correction et aux messages. Sur quadrillage seulement (grille:), le point dans la fenêtre et sur un nœud."
				},
				{
					key: 'outils',
					values: 'droite, segment ou point',
					defaultValue: 'celui de la vérification',
					description:
						'L’outil proposé à l’élève, un seul par figure : droite pour droite_par, segment pour carre, rectangle et symetrique, point pour point. Avec un quadrillage (grille:) et le segment ou le point, chaque toucher va au nœud le plus proche.'
				},
				{
					key: 'fenetre, taille…',
					values: 'comme pour le bloc figure',
					defaultValue: 'comme pour le bloc figure',
					description:
						'L’en-tête de la figure de départ, sans deplacable: ni rendu: (elle ne se déplace jamais). Sans repère ni quadrillage, l’élève trace sur une feuille blanche.'
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
		},
		{
			title: 'Tracer le symétrique d’un triangle (axe vertical)',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'grille: 1',
				'verifier: symetrique par d',
				'---',
				'P = point(6, 0, visible=faux)',
				'Q = point(6, 8, visible=faux)',
				'd = droite(P, Q)',
				'A = point(2, 2)',
				'B = point(4, 2)',
				'C = point(4, 6)',
				'polygone(A, B, C)'
			),
			explanation:
				'L’élève trace le triangle retourné de l’autre côté de d. Une figure seulement glissée reçoit « Ta figure a glissé » ; un trait repassé sur le triangle ou sur l’axe ne compte pas. Pour « compléter une figure pour la rendre symétrique », donner la moitié qui touche l’axe (segments) : l’élève trace l’autre moitié.'
		},
		{
			title: 'Symétrie centrale',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'grille: 1',
				'verifier: symetrique par O',
				'---',
				'O = point(6, 4)',
				'A = point(2, 2)',
				'B = point(4, 2)',
				'C = point(4, 3)',
				'segment(A, B)',
				'segment(B, C)'
			),
			explanation: 'Après « par », un point : le symétrique fait un demi-tour autour de O.'
		},
		{
			title: 'Placer le symétrique d’un point (axe oblique)',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'grille: 1',
				"verifier: point A' = symetrie(A, axe=d)",
				'---',
				'P = point(1, 1, visible=faux)',
				'Q = point(7, 7, visible=faux)',
				'd = droite(P, Q)',
				'A = point(2, 5)'
			),
			explanation:
				'L’élève place A’ en (5 ; 2). À la même distance de l’axe mais à l’horizontale de A, il lit « Le segment [AA’] doit être perpendiculaire à l’axe » ; sur la perpendiculaire mais trop près ou trop loin, « A’ doit être à la même distance de l’axe que A ». Plusieurs points : une ligne « verifier: point … » par point.'
		},
		{
			title: 'Vérifier un alignement, puis répondre oui ou non',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'outils: droite',
				'verifier: droite_par A ; B',
				'---',
				'A = point(2, 3)',
				'B = point(8, 5)',
				'C = point(5, 4.25)'
			),
			explanation:
				'C est à un quart de carreau de la droite (AB) : invisible à l’œil, net une fois la droite tracée. Dans la question, une case [_] suit le bloc pour « oui » ou « non » (majuscules acceptées) ; Valider reste grisé tant que la droite manque. Une coordonnée décimale s’écrit avec un point (4.25) : une variable calculée par eval: donnerait une fraction, que la figure ne lit pas (la vérification du modèle refuse alors les tirages).'
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
		},
		{
			title: 'Symétrique sans « par »',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'grille: 1',
				'verifier: symetrique d',
				'---',
				'P = point(6, 0)',
				'Q = point(6, 8)',
				'd = droite(P, Q)'
			),
			message: 'symetrique attend un axe ou un centre',
			explanation: 'Écrire « symetrique par d » (l’axe) ou « symetrique par O » (le centre).'
		},
		{
			title: 'Point sans expression',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'grille: 1',
				"verifier: point A'",
				'---',
				'A = point(2, 5)'
			),
			message: 'point attend un nom et une expression',
			explanation: "Écrire où va le point : « point A' = symetrie(A, axe=d) »."
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
