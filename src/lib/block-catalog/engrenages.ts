/**
 * Catalogue — bloc ```engrenages (roues dentées, outil n° 52)
 *
 * Réglages : `src/lib/ubumark/parser/engrenages-parser.ts` ; dessin et
 * mouvement : `src/lib/ubumark/utils/engrenages-moteur.ts`.
 *
 * @module block-catalog/engrenages
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const engrenagesEntry: BlockCatalogEntry = {
	slug: 'engrenages',
	title: 'Engrenages',
	fences: ['engrenages'],
	nodeType: 'engrenages',
	summary:
		'Deux ou trois roues dentées en ligne, qui s’engrènent, chacune avec un repère. Écrit dans la correction, le bloc fait tourner les roues jusqu’à ce que tous les repères soient revenus à leur place.',
	intro:
		'Vous donnez le nombre de dents de chaque roue, de gauche à droite (une variable du modèle convient : roues: {{a}} ; {{b}}). Toutes les dents sont dessinées (l’élève peut les compter) et la taille des roues suit leur nombre de dents, comme sur de vrais engrenages. Dans l’énoncé, la figure est à l’arrêt. Écrit dans la correction d’un modèle, le même bloc a un bouton « Voir tourner » : les roues tournent jusqu’au premier retour de tous les repères (le plus petit multiple commun des nombres de dents), avec le nombre de tours de chaque roue. Sur la fiche PDF, la figure est à l’arrêt. Le bloc ne pose pas de question : les réponses se donnent dans les cases du modèle.',
	settingGroups: [
		{
			settings: [
				{
					key: 'roues',
					values: '2 ou 3 nombres entiers de 6 à 60, séparés par ;',
					defaultValue: null,
					description: 'Le nombre de dents de chaque roue, de gauche à droite.'
				},
				{
					key: 'légendes',
					values: 'un texte par roue (20 caractères au plus), séparés par ;',
					defaultValue: 'A ; B ; C',
					description: 'Écrites sous les roues.'
				},
				{
					key: 'taille',
					values: '4 à 16 cm, unité cm obligatoire',
					defaultValue: '8 cm',
					description: 'Largeur de la figure. La virgule décimale est acceptée.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Deux roues',
			source: fence('engrenages', 'roues: 12 ; 18'),
			explanation:
				'Les repères se retrouvent après 36 dents : A a fait 3 tours, B 2 tours (en sens contraire).'
		},
		{
			title: 'Trois roues, avec légendes',
			source: fence('engrenages', 'roues: 12 ; 18 ; 8', 'légendes: Moteur ; Relais ; Roue'),
			explanation:
				'La roue du milieu tourne dans l’autre sens que les deux autres ; les trois repères se retrouvent après 72 dents.'
		},
		{
			title: 'Plus petit',
			source: fence('engrenages', 'roues: 7 ; 10', 'taille: 5cm'),
			explanation:
				'Nombres de dents premiers entre eux : les repères se retrouvent après 7 × 10 = 70 dents.'
		}
	],
	mistakes: [
		{
			title: 'Une seule roue',
			source: fence('engrenages', 'roues: 12'),
			message: 'écris 2 ou 3 roues',
			explanation: 'Il faut au moins deux roues qui s’engrènent.'
		},
		{
			title: 'Trop de dents',
			source: fence('engrenages', 'roues: 12 ; 80'),
			message: 'choisis entre 6 et 60 dents',
			explanation: 'Au-delà de 60, les dents ne se voient plus sur la figure.'
		},
		{
			title: 'Légendes en trop',
			source: fence('engrenages', 'roues: 12 ; 18', 'légendes: A ; B ; C'),
			message: '3 légendes pour 2 roues',
			explanation: 'Une légende par roue, dans le même ordre.'
		}
	],
	tryIt: fence('engrenages', 'roues: 12 ; 18', 'légendes: A ; B', 'taille: 8cm')
};
