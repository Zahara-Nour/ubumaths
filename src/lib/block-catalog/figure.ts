/**
 * Catalogue — bloc ```figure (figure de géométrie)
 *
 * Seul l'en-tête est décrit ici (`src/lib/ubumark/parser/figure-parser.ts`) ;
 * le langage du script a sa propre aide (`/aide-ecriture/geometrie`).
 *
 * @module block-catalog/figure
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const figureEntry: BlockCatalogEntry = {
	slug: 'figure',
	title: 'Figure de géométrie',
	fences: ['figure'],
	nodeType: 'figure',
	summary: 'Une figure construite par un petit script, dans une fenêtre que tu choisis.',
	intro:
		'Le bloc a deux parties. L’en-tête règle la fenêtre, la taille et le repère. Une ligne --- le sépare du script, qui construit la figure (points, segments, cercles…). La fenêtre est obligatoire.',
	settingGroups: [
		{
			settings: [
				{
					key: 'fenetre',
					values: 'xmin ; xmax ; ymin ; ymax (quatre nombres)',
					defaultValue: null,
					description:
						'La partie du plan qui est dessinée. Rapport hauteur/largeur entre 1/4 et 4, bornes de 10^6 au plus.'
				},
				{
					key: 'taille',
					values: 'petite | moyenne | grande',
					defaultValue: 'moyenne',
					description: 'Largeur de la figure, à l’écran comme sur la fiche PDF.'
				},
				{
					key: 'description',
					values: 'une phrase',
					defaultValue: 'aucune',
					description: 'Texte pour les élèves qui ne voient pas la figure.'
				},
				{
					key: 'axes',
					values: 'oui | non',
					defaultValue: 'non',
					description: 'Dessine les deux axes du repère.'
				},
				{
					key: 'grille',
					values: 'oui | non | un pas | deux pas (x ; y)',
					defaultValue: 'non',
					description: 'Quadrillage. oui = un pas de 1. Au plus 200 lignes par axe.'
				},
				{
					key: 'graduations',
					values: 'oui | non | un pas | deux pas (x ; y)',
					defaultValue: 'le pas de la grille, sinon 1',
					description: 'Graduations sur les axes. Il faut aussi axes: oui.'
				},
				{
					key: 'deplacable, rendu',
					values: 'oui | non ; normal | croquis | mixte',
					defaultValue: 'réservés',
					description:
						'Réglages des figures interactives enregistrées. Un bloc d’exercice les refuse.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Un triangle dans sa fenêtre',
			source: fence(
				'figure',
				'fenetre: -1 ; 8 ; -1 ; 6',
				'taille: petite',
				'---',
				'A = point(0, 0)',
				'B = point(5, 0)',
				'C = point(0, 4)',
				'p = polygone(A, B, C)'
			),
			explanation: 'La fenêtre et le script suffisent ; la taille est facultative.'
		},
		{
			title: 'Un repère avec axes et grille',
			source: fence(
				'figure',
				'fenetre: -5 ; 5 ; -4 ; 4',
				'axes: oui',
				'grille: 1',
				'graduations: 1',
				'---',
				'A = point(2, 3)',
				'B = point(-3, 1)',
				's = segment(A, B)'
			),
			explanation: 'Le repère est tracé, avec un quadrillage de pas 1.'
		},
		{
			title: 'Une figure décrite pour tous',
			source: fence(
				'figure',
				'fenetre: -3 ; 3 ; -3 ; 3',
				'description: Un cercle de centre O et de rayon 2.',
				'---',
				'O = point(0, 0)',
				'c = cercle(O, 2)'
			),
			explanation: 'La description est lue à la place de la figure par un lecteur d’écran.'
		},
		{
			title: 'Deux pas différents',
			source: fence(
				'figure',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'taille: grande',
				'axes: oui',
				'grille: 2 ; 1',
				'---',
				'M = point(4, 3)'
			),
			explanation: 'Un pas de 2 sur x et de 1 sur y ; les graduations suivent la grille.'
		}
	],
	mistakes: [
		{
			title: 'Fenêtre oubliée',
			source: fence('figure', 'taille: petite', '---', 'A = point(0, 0)'),
			message: 'Fenêtre manquante',
			explanation: 'Ajoute fenetre: xmin ; xmax ; ymin ; ymax dans l’en-tête.'
		},
		{
			title: 'Réglage réservé aux figures interactives',
			source: fence(
				'figure',
				'fenetre: -1 ; 5 ; -1 ; 5',
				'deplacable: oui',
				'---',
				'A = point(1, 1)'
			),
			message: 'réservé aux figures interactives',
			explanation: 'deplacable: et rendu: ne servent que pour les figures enregistrées. Retire-les.'
		}
	],
	tryIt: fence(
		'figure',
		'fenetre: -1 ; 7 ; -1 ; 5',
		'taille: petite',
		'description: Triangle ABC.',
		'---',
		'A = point(0, 0)',
		'B = point(5, 0)',
		'C = point(2, 4)',
		'p = polygone(A, B, C)'
	),
	seeAlso: {
		href: '/aide-ecriture/geometrie',
		label: 'Le langage des figures, thème par thème'
	}
};
