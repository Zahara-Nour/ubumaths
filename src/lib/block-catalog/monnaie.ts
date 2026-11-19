/**
 * Catalogue — bloc ```monnaie (pièces et billets à compter ou à construire)
 *
 * Réglages : `src/lib/ubumark/parser/monnaie-parser.ts`.
 *
 * @module block-catalog/monnaie
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const monnaieEntry: BlockCatalogEntry = {
	slug: 'monnaie',
	title: 'Pièces et billets',
	fences: ['monnaie'],
	nodeType: 'monnaie',
	summary:
		'Un à trois porte-monnaie de pièces et de billets en euros, à compter ou à comparer ; dans une question, une somme que l’élève construit.',
	intro:
		'Le bloc dessine des pièces et des billets stylisés, billets en haut, pièces dessous. Une valeur par ensemble, séparées par ; (un ensemble peut être vide). La valeur de chaque coupure est écrite dessus, le total jamais : c’est la réponse. Le prix va dans l’énoncé, pas dans le bloc.',
	settingGroups: [
		{
			title: 'Ce qu’on dessine (billets: et pièces:, ou montant:)',
			settings: [
				{
					key: 'billets',
					values: '5, 10, 20, 50, 100, 200, 500 : en liste (20 10 10) ou comptés (2×10)',
					defaultValue: 'aucun',
					description: 'Les billets de chaque ensemble. x et * valent ×.'
				},
				{
					key: 'pièces',
					values: '1, 2 (euros) ; 1c, 2c, 5c, 10c, 20c, 50c (ou 50 c, ou 0,50)',
					defaultValue: 'aucune',
					description: 'Les pièces de chaque ensemble, écrites comme les billets : 3×2 1 50c.'
				},
				{
					key: 'montant',
					values: '0 à 1 000 € : 35, 3,45, 3 € 45 c ou 345c',
					defaultValue: 'aucun',
					description:
						'Le bloc choisit les coupures, avec le moins d’objets possible. Jamais avec billets: ou pièces:.'
				}
			]
		},
		{
			title: 'Présentation',
			settings: [
				{
					key: 'disposition',
					values: 'rangé | mélangé',
					defaultValue: 'rangé',
					description:
						'mélangé : billets dans le désordre, pièces en vrac, pour un comptage plus difficile.'
				},
				{
					key: 'légendes',
					values: 'un texte par ensemble, séparés par ; (40 caractères au plus)',
					defaultValue: 'A, B, C s’il y a plusieurs ensembles',
					description: 'Écrites sous chaque ensemble.'
				},
				{
					key: 'taille',
					values: '2 à 12 cm',
					defaultValue: '8 cm (10 cm dans un choix de QCM)',
					description:
						'Largeur d’un ensemble plein. Les ensembles gardent la même échelle d’un bout à l’autre du bloc.'
				}
			]
		},
		{
			title: 'Dans une question : construire la somme',
			settings: [
				{
					key: 'construire',
					values: 'une somme de 1 c à 1 000 € : 35 ou 3,45',
					defaultValue: 'aucune',
					description:
						'Un plan vide et une réserve : l’élève ajoute des pièces et des billets et en enlève en les touchant. Juste si la somme posée est la bonne, quelles que soient les coupures. La somme n’est jamais affichée. taille: reste ; billets:, pièces:, montant:, disposition: et légendes: sont refusées. Sur le PDF, la réserve en petit et un cadre vide où l’enfant dessine.'
				},
				{
					key: 'réserve',
					values: 'les coupures permises : 1 2 5 10 20, ou 2 1 50c 20c',
					defaultValue: '1, 2, 5, 10, 20, 50 € (et les six pièces de centimes si la somme en a)',
					description:
						'Seulement avec construire:. La somme doit pouvoir se faire avec la réserve en 30 objets au plus.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Un porte-monnaie à compter',
			source: fence('monnaie', 'billets: 20 10 5', 'pièces: 2 2 1'),
			explanation: 'Billets et pièces d’un même ensemble : 40 €.'
		},
		{
			title: 'Comparer deux sommes',
			source: fence('monnaie', 'billets: ; 1×10', 'pièces: 10×1 ;', 'légendes: Léa ; Tom'),
			explanation:
				'Léa a dix pièces de 1 €, Tom un billet de 10 € : un ensemble vide s’écrit en ne mettant rien avant ou après le ;.'
		},
		{
			title: 'Euros et centimes, choisis par le bloc',
			source: fence('monnaie', 'montant: 3,45', 'disposition: mélangé'),
			explanation:
				'montant: laisse le bloc choisir les coupures (2 €, 1 €, 20 c, 20 c, 5 c), ici dans le désordre.'
		},
		{
			title: 'Construire une somme (question)',
			source: fence('monnaie', 'construire: 35'),
			explanation:
				'L’élève pose les coupures de son choix parmi la réserve par défaut. La consigne (« Paie 35 €. ») va dans l’énoncé.'
		},
		{
			title: 'Construire avec une réserve imposée (question)',
			source: fence('monnaie', 'construire: 3,45', 'réserve: 2 1 20c 10c 5c'),
			explanation: 'Seules les coupures de la réserve sont proposées, une fois chacune écrite.'
		}
	],
	mistakes: [
		{
			title: 'Centimes écrits sans c',
			source: fence('monnaie', 'pièces: 5'),
			message: 'pour 5 centimes, écris 5c',
			explanation: 'Il n’y a pas de pièce de 5 € : écrire 5c pour 5 centimes, ou billets: 5.'
		},
		{
			title: 'montant: avec billets:',
			source: fence('monnaie', 'montant: 30', 'billets: 20 10'),
			message: 'montant: ou billets: et pièces:, pas les deux',
			explanation:
				'Soit on donne les coupures (billets:, pièces:), soit le bloc les choisit (montant:).'
		},
		{
			title: 'réserve: sans construire:',
			source: fence('monnaie', 'billets: 10', 'réserve: 1 2 5'),
			message: 'réserve: sans objet sans construire:',
			explanation: 'La réserve est ce que l’élève peut poser : elle ne sert qu’avec construire:.'
		}
	],
	tryIt: fence('monnaie', 'billets: 10 ; 5', 'pièces: 2 ; 2×2 1', 'légendes: Léa ; Tom')
};
