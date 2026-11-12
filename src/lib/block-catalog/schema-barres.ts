/**
 * Catalogue — bloc ```schema-barres (schéma en barres)
 *
 * Réglages : `src/lib/ubumark/parser/schema-barres-parser.ts`.
 *
 * @module block-catalog/schema-barres
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const schemaBarresEntry: BlockCatalogEntry = {
	slug: 'schema-barres',
	title: 'Schéma en barres',
	fences: ['schema-barres'],
	nodeType: 'schema-barres',
	summary:
		'Des barres l’une sous l’autre, découpées en segments, avec accolades : pour représenter un problème (somme, différence, partage) en 6e.',
	intro:
		'Une ligne, une barre : son nom, deux-points, puis ses segments séparés par des points-virgules. Chaque segment porte une étiquette (un nombre, un point d’interrogation, une lettre) et, entre parenthèses, sa longueur en unités : c’est vous qui la choisissez, elle ne se calcule jamais sur les nombres (? (4) est quatre fois plus long que ? ou ? (1)). Sans longueur, un segment vaut 1. Toutes les barres ont la même échelle : la plus longue occupe toute la largeur. Une étiquette qui commence par un tiret (-80) est une partie manquante : rectangle en pointillés, sans fond. = texte à la fin d’une ligne met une accolade sous la barre ; une ligne total : texte met une accolade à droite de toutes les barres. Le schéma est seulement affiché : l’élève répond dans une case ordinaire de l’énoncé. Sur la fiche PDF, il est tracé en noir sur blanc.',
	settingsKind: 'instructions',
	settingGroups: [
		{
			settings: [
				{
					key: 'Nom : étiquette (longueur) ; étiquette (longueur)',
					values: 'nom libre, peut être vide : « : ? ; ? »',
					defaultValue: 'une barre par ligne',
					description:
						'Une barre : au plus 6 barres, au plus 12 segments par barre. La longueur est un nombre de 0,1 à 50, avec une virgule ou un point (1,5 = 1.5), et vaut 1 si elle est absente.'
				},
				{
					key: '-étiquette (longueur)',
					values: 'un tiret devant l’étiquette',
					defaultValue: 'segment plein',
					description:
						'Partie manquante : rectangle en pointillés, sans fond ; le tiret n’est pas écrit. Une barre a au moins un segment plein.'
				},
				{
					key: '… = texte',
					values: 'en fin de ligne',
					defaultValue: 'pas d’accolade',
					description:
						'Accolade sous la barre, du début à la fin de son dernier segment plein, avec le texte dessous.'
				},
				{
					key: 'total : texte',
					values: 'une seule ligne, mot total sans tenir compte des majuscules',
					defaultValue: 'pas d’accolade',
					description:
						'Accolade à droite de toutes les barres, de la première à la dernière, avec le texte à sa droite. Une barre ne peut donc pas s’appeler « total ».'
				}
			]
		}
	],
	examples: [
		{
			title: 'Les primes',
			source: fence(
				'schema-barres',
				'Or : ? (4) ; 70 (2)',
				'Argent : ? (4)',
				'Bronze : ? (4) ; -80 (1,5)',
				'total : 320 €'
			),
			explanation:
				'Trois barres, une accolade de total à droite. Chez l’Or, 70 € de plus ; chez le Bronze, 80 € manquent (pointillés).'
		},
		{
			title: 'Parts égales et un reste',
			source: fence('schema-barres', ': ? ; ? ; ? ; 7 (0,6)', 'total : 100'),
			explanation:
				'Une seule barre sans nom : trois parts égales (longueur 1) et un petit segment de 7 (longueur 0,6).'
		},
		{
			title: 'Une quantité, puis quatre fois plus',
			source: fence('schema-barres', 'Bleues : ?', 'Rouges : ? ; ? ; ? ; ?', 'total : 179'),
			explanation:
				'Les rouges sont quatre fois plus nombreuses que les bleues : quatre segments de même longueur contre un.'
		},
		{
			title: 'Pastèques et ananas',
			source: fence('schema-barres', ': P (3) ; P (3) ; A (2) = 9 €', ': P (3) ; A (2) = 6 €'),
			explanation:
				'Chaque barre porte une accolade avec son prix : deux pastèques et un ananas coûtent 9 €, une pastèque et un ananas 6 €.'
		}
	],
	mistakes: [
		{
			title: 'Un deux-points oublié',
			source: fence('schema-barres', 'Or ? (4) ; 70 (2)'),
			message: 'écris le nom de la barre, puis « : », puis ses segments',
			explanation:
				'Chaque ligne commence par le nom de la barre (qui peut être vide) suivi de deux-points.'
		},
		{
			title: 'Un segment vide',
			source: fence('schema-barres', 'Or : ? ; ; 7'),
			message: 'segment vide',
			explanation: 'Deux points-virgules de suite : retirez-en un, ou écrivez l’étiquette.'
		},
		{
			title: 'Une longueur nulle',
			source: fence('schema-barres', 'Or : ? (0)'),
			message: 'longueur nulle',
			explanation: 'Une longueur va de 0,1 à 50.'
		},
		{
			title: 'Une parenthèse non fermée',
			source: fence('schema-barres', 'Or : ? (4'),
			message: 'parenthèse non fermée',
			explanation: 'La longueur s’écrit entre deux parenthèses : ? (4).'
		},
		{
			title: 'Une accolade sans texte',
			source: fence('schema-barres', 'Or : ? (4) ='),
			message: '« = » sans texte',
			explanation: 'Après le signe =, écrivez ce que dit l’accolade : = 9 €.'
		},
		{
			title: 'Rien que des parties manquantes',
			source: fence('schema-barres', 'Or : -? (4)'),
			message: 'parties manquantes',
			explanation: 'Une barre a au moins un segment plein : sans cela, il n’y a rien à dessiner.'
		},
		{
			title: 'Deux totaux',
			source: fence('schema-barres', 'Or : ? (4)', 'total : 100', 'total : 200'),
			message: 'déjà écrit ligne 2',
			explanation: 'Une seule accolade de total par schéma.'
		},
		{
			title: 'Aucune barre',
			source: fence('schema-barres', 'total : 100'),
			message: 'écris au moins une barre',
			explanation: 'Le total accompagne des barres : écrivez-en au moins une.'
		}
	],
	tryIt: fence('schema-barres', 'Or : ? (4) ; 70 (2)', 'Argent : ? (4)', 'total : 320 €')
};
