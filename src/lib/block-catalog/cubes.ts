/**
 * Catalogue — bloc ```cubes (assemblage de cubes en perspective cavalière)
 *
 * Réglages : `src/lib/ubumark/parser/espace-parser.ts`.
 *
 * @module block-catalog/cubes
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const cubesEntry: BlockCatalogEntry = {
	slug: 'cubes',
	title: 'Assemblage de cubes',
	fences: ['cubes'],
	nodeType: 'espace',
	summary:
		'Un assemblage de cubes dessiné en perspective cavalière, ou l’une de ses vues (dessus, face, droite, gauche) : pour compter des cubes, lire un volume, comparer un dessin et ses vues.',
	intro:
		'Le bloc dessine l’assemblage à partir de la hauteur de chaque pile de cubes, comme un plan. La première rangée écrite est celle du fond, la dernière celle de devant ; les colonnes se lisent de gauche à droite. En perspective cavalière, la face de devant est en vraie grandeur et les fuyantes partent à 45° vers le haut à droite, réduites de moitié : on voit le devant, le dessus et la droite des cubes. Une pile cachée derrière une plus haute compte, mais ne se voit pas. Avec vue:, le bloc dessine une vue en carrés, sans relief : dessus (la rangée du fond en haut), face, droite (le devant à gauche) ou gauche (le devant à droite). Les rangées et colonnes entièrement vides au bord sont retirées : une hauteur à 0 ne décale pas le dessin. Le bloc ne fait que montrer : la réponse (« combien de cubes ? ») est une case ordinaire de l’énoncé. L’arête d’un cube mesure 1 cm, à l’écran comme sur la fiche PDF, où les faces sont en gris.',
	settingGroups: [
		{
			settings: [
				{
					key: 'hauteurs',
					values: 'des rangées de nombres séparées par / : 2 1 1 / 1 0 1',
					defaultValue: null,
					description:
						'Une hauteur par pile, un nombre entier de 0 à 6, séparées par des espaces ; les rangées sont séparées par /. La première rangée est au fond, la dernière devant. De 1 à 6 rangées et de 1 à 6 colonnes, toutes de même longueur. On peut aussi écrire une rangée par ligne, en retrait sous hauteurs:.'
				},
				{
					key: 'vue',
					values: 'perspective | dessus | face | droite | gauche',
					defaultValue: 'perspective',
					description:
						'perspective : l’assemblage en perspective cavalière. dessus : une case par pile, la rangée du fond en haut. face : la plus haute pile de chaque colonne. droite : la plus haute pile de chaque rangée, le devant à gauche. gauche : la plus haute pile de chaque rangée, le devant à droite.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Six cubes en perspective',
			source: fence('cubes', 'hauteurs: 2 1 1 / 1 0 1'),
			explanation:
				'Deux rangées de trois piles : au fond 2, 1 et 1 cubes, devant 1, 0 et 1. Le trou devant, au milieu, se voit.'
		},
		{
			title: 'Les rangées en retrait',
			source: fence('cubes', 'hauteurs:', '  2 1 1', '  1 0 1'),
			explanation: 'Une rangée par ligne, sous hauteurs:, à la place du /.'
		},
		{
			title: 'La vue de face',
			source: fence('cubes', 'hauteurs: 2 1 1 / 1 0 1', 'vue: face'),
			explanation: 'Trois colonnes de 2, 1 et 1 carrés : la plus haute pile de chaque colonne.'
		},
		{
			title: 'La vue de dessus',
			source: fence('cubes', 'hauteurs: 2 1 1 / 1 0 1', 'vue: dessus'),
			explanation: 'Cinq carrés : le trou est en bas, au milieu.'
		},
		{
			title: 'Les vues de droite et de gauche',
			source: fence('cubes', 'hauteurs: 2 1 1 / 1 0 1', 'vue: droite'),
			explanation: 'Vue de droite : le devant est à gauche. Avec vue: gauche, il passe à droite.'
		}
	],
	mistakes: [
		{
			title: 'Rangées de longueurs différentes',
			source: fence('cubes', 'hauteurs: 2 1 1 / 1 0'),
			message: 'chaque rangée doit avoir le même nombre de cases',
			explanation: 'Toutes les rangées ont autant de colonnes : écris 0 pour une pile absente.'
		},
		{
			title: 'Une hauteur qui n’en est pas une',
			source: fence('cubes', 'hauteurs: 2 1.5 1'),
			message: 'une hauteur est un nombre entier de 0 à 6',
			explanation: 'Des cubes entiers, de 0 à 6 par pile.'
		},
		{
			title: 'Trop de rangées',
			source: fence('cubes', 'hauteurs: 1 / 1 / 1 / 1 / 1 / 1 / 1'),
			message: 'au plus 6 rangées',
			explanation: 'Un assemblage tient dans 6 rangées sur 6 colonnes.'
		},
		{
			title: 'Aucun cube',
			source: fence('cubes', 'hauteurs: 0 0 / 0 0'),
			message: 'assemblage vide',
			explanation: 'Il faut au moins un cube.'
		},
		{
			title: 'Une vue qui n’existe pas',
			source: fence('cubes', 'hauteurs: 1 2', 'vue: dessous'),
			message: 'vues possibles',
			explanation: 'perspective, dessus, face, droite ou gauche.'
		},
		{
			title: 'Hauteurs absentes',
			source: fence('cubes', 'vue: face'),
			message: 'il manque les hauteurs',
			explanation: 'La ligne hauteurs: dit combien de cubes dans chaque pile.'
		}
	],
	tryIt: fence('cubes', 'hauteurs: 2 1 1 / 1 0 1')
};
