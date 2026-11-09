/**
 * Catalogue — bloc ```collection (collection d'objets à compter ou à construire)
 *
 * Réglages : `src/lib/ubumark/parser/collection-parser.ts`.
 *
 * @module block-catalog/collection
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const collectionEntry: BlockCatalogEntry = {
	slug: 'collection',
	title: 'Collection d’objets',
	fences: ['collection'],
	nodeType: 'collection',
	summary:
		'Une à trois collections à dénombrer (cubes, barres de dix, plaques de cent, gros cubes de mille, ou jetons) ; dans une question, une collection que l’élève construit.',
	intro:
		'Le bloc dessine les objets d’une ou plusieurs collections : groupes en haut, objets isolés en vrac dessous. Une valeur par collection, séparées par ; (dizaines: 2 ; 3). Le nombre n’est jamais écrit à côté : c’est la réponse. À l’écran, l’élève peut toucher un objet pour le barrer en comptant.',
	settingGroups: [
		{
			title: 'Quantités (au moins une ligne)',
			settings: [
				{
					key: 'unités',
					values: '0 à 100 par collection',
					defaultValue: '0',
					description:
						'Les objets isolés (cubes ou jetons). Plus de 9 est admis : 3 dizaines et 15 unités.'
				},
				{
					key: 'dizaines',
					values: '0 à 10 par collection (30 avec centaines ou milliers)',
					defaultValue: '0',
					description: 'Les groupes de dix : barres de dix cubes, ou 10 jetons entourés.'
				},
				{
					key: 'centaines',
					values: '0 à 40 par collection',
					defaultValue: '0',
					description:
						'Les plaques de cent (carré quadrillé 10 × 10). Le bloc devient grand : objets plus petits, 12 cm de large.'
				},
				{
					key: 'milliers',
					values: '0 à 9 par collection',
					defaultValue: '0',
					description: 'Les gros cubes de mille. Valeur de 9 999 au plus par collection.'
				}
			]
		},
		{
			title: 'Présentation',
			settings: [
				{
					key: 'dessin',
					values: 'barres | paquets',
					defaultValue: 'barres',
					description:
						'barres : barres de dix et cubes ; paquets : jetons entourés par dix et jetons (sans centaines ni milliers).'
				},
				{
					key: 'unités en',
					values: 'vrac | rangées',
					defaultValue: 'vrac',
					description: 'rangées : les objets isolés en rangées de 5 + 5, plus faciles à compter.'
				},
				{
					key: 'légendes',
					values: 'un texte par collection, séparés par ; (40 caractères au plus)',
					defaultValue: 'A, B, C s’il y a plusieurs collections',
					description: 'Écrites sous chaque collection.'
				},
				{
					key: 'taille',
					values: '2 à 12 cm',
					defaultValue: '8 cm (12 cm avec centaines ou milliers, 3 cm dans un choix de QCM)',
					description:
						'Largeur d’une collection pleine. Une collection plus petite garde la même échelle : les objets ont la même taille d’une collection à l’autre.'
				}
			]
		},
		{
			title: 'Dans une question : construire la collection',
			settings: [
				{
					key: 'construire',
					values: 'un nombre de 1 à 9 999 (à la place des quantités)',
					defaultValue: 'aucun',
					description:
						'Un plan vide et une réserve : l’élève ajoute des barres et des cubes (plaques dès 100, gros cubes dès 1 000) et en enlève en les touchant. Juste si la collection posée vaut le nombre, quelle que soit sa composition. Le total n’est jamais affiché. dessin: et taille: restent ; unités en: et légendes: sont refusées. Sur le PDF, la réserve en petit et un cadre vide où l’enfant dessine.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Une collection à dénombrer',
			source: fence('collection', 'dizaines: 3', 'unités: 7'),
			explanation: 'Trois barres de dix et sept cubes en vrac : 37.'
		},
		{
			title: 'Comparer deux collections',
			source: fence(
				'collection',
				'dizaines: 2 ; 3',
				'unités: 8 ; 1',
				'dessin: paquets',
				'légendes: Léa ; Tom'
			),
			explanation: 'Une valeur par collection, dans le même ordre que les légendes.'
		},
		{
			title: 'Unités rangées, groupement partiel',
			source: fence('collection', 'dizaines: 1', 'unités: 14', 'unités en: rangées'),
			explanation:
				'Quatorze cubes isolés, rangés par 5 + 5 : l’élève fait un nouveau groupe de dix pour trouver 24.'
		},
		{
			title: 'Plaques de cent et gros cubes de mille',
			source: fence('collection', 'milliers: 1', 'centaines: 2', 'dizaines: 3', 'unités: 4'),
			explanation:
				'De haut en bas : le gros cube, les plaques, les barres, les cubes. Les lignes s’écrivent dans n’importe quel ordre.'
		},
		{
			title: 'Construire une collection (question)',
			source: fence('collection', 'construire: 34'),
			explanation:
				'L’élève pose 3 barres et 4 cubes (ou 2 barres et 14 cubes : seule la valeur compte). La consigne (« Construis 34. ») va dans l’énoncé.'
		},
		{
			title: 'Construire un nombre à quatre chiffres (question)',
			source: fence('collection', 'construire: 1205'),
			explanation:
				'À partir de 100, la réserve offre les plaques de cent ; à partir de 1 000, les gros cubes de mille.'
		}
	],
	mistakes: [
		{
			title: 'Jetons avec des centaines',
			source: fence('collection', 'centaines: 2', 'dizaines: 3', 'dessin: paquets'),
			message: 'centaines et milliers : seulement avec dessin: barres',
			explanation:
				'Plaques et gros cubes n’existent qu’en matériel multibase : retirer dessin: paquets.'
		},
		{
			title: 'Une légende de trop',
			source: fence('collection', 'dizaines: 2', 'unités: 5', 'légendes: Léa ; Tom'),
			message: '2 légende(s) pour 1 collection(s)',
			explanation: 'Autant de légendes que de collections, ou aucune.'
		},
		{
			title: 'construire: avec des quantités',
			source: fence('collection', 'construire: 34', 'dizaines: 3', 'unités: 4'),
			message: 'dizaines : sans objet avec construire:',
			explanation:
				'L’élève part d’un plan vide : construire: remplace dizaines:, unités:, centaines: et milliers:.'
		}
	],
	tryIt: fence('collection', 'dizaines: 2 ; 4', 'unités: 6 ; 0', 'légendes: Boîte A ; Boîte B')
};
