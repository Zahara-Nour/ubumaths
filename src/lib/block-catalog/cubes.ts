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
		'Le bloc dessine l’assemblage à partir de la hauteur de chaque pile de cubes, comme un plan. La première rangée écrite est celle du fond, la dernière celle de devant ; les colonnes se lisent de gauche à droite. En perspective cavalière, la face de devant est en vraie grandeur et les fuyantes partent à 45° vers le haut à droite, réduites de moitié : on voit le devant, le dessus et la droite des cubes. Une pile cachée derrière une plus haute compte, mais ne se voit pas. Avec vue:, le bloc dessine une vue en carrés, sans relief : dessus (la rangée du fond en haut), face, droite (le devant à gauche) ou gauche (le devant à droite). Les rangées et colonnes entièrement vides au bord sont retirées : une hauteur à 0 ne décale pas le dessin. Pour compter (« combien de cubes ? »), la réponse est une case ordinaire de l’énoncé. Deux gestes font du bloc la case de la question : avec dessiner:, l’élève colorie une vue dans un quadrillage vide placé à côté de la perspective (jugée juste où qu’elle soit dans le quadrillage) ; avec retrouver:, la perspective est cachée, l’élève voit les vues données et écrit la hauteur de chaque pile sur la vue de dessus (juste dès que son assemblage a les mêmes vues : plusieurs réponses peuvent l’être). La réponse attendue se calcule à partir du bloc : rien à écrire dans les cases du modèle. L’arête d’un cube mesure 1 cm, à l’écran comme sur la fiche PDF, où les faces sont en gris.',
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
				},
				{
					key: 'dessiner',
					values: 'dessus | face | droite | gauche',
					defaultValue: null,
					description:
						'Geste de l’élève : la perspective, et à côté un quadrillage vide plus grand que la vue d’un carreau de chaque côté ; l’élève colorie la vue demandée. Juste si les carreaux coloriés ont exactement la forme de la vue, où qu’ils soient. Ne va pas avec vue: ni retrouver:.'
				},
				{
					key: 'retrouver',
					values: 'face, droite, gauche (une ou plusieurs, séparées par des virgules)',
					defaultValue: null,
					description:
						'Geste de l’élève : la perspective est cachée ; les vues listées sont dessinées, la vue de dessus (toujours donnée) sert de grille où l’élève écrit la hauteur de chaque pile. Juste si son assemblage a la même vue de dessus et les mêmes vues listées. Ne va pas avec vue: ni dessiner:.'
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
		},
		{
			title: 'Colorier la vue de face (geste)',
			source: fence('cubes', 'hauteurs: 2 1 1 / 1 0 1', 'dessiner: face'),
			explanation:
				'L’élève colorie la vue de face dans le quadrillage de 5 × 4 carreaux ; dans une question, ce bloc est la case.'
		},
		{
			title: 'Retrouver l’assemblage d’après ses vues (geste)',
			source: fence('cubes', 'hauteurs: 2 1 / 1 2', 'retrouver: face, droite'),
			explanation:
				'L’élève écrit une hauteur sur chaque carreau de la vue de dessus. 2 1 / 1 2 est juste, 1 2 / 2 1 ou 2 2 / 2 2 aussi : elles ont les mêmes vues.'
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
		},
		{
			title: 'Deux gestes à la fois',
			source: fence('cubes', 'hauteurs: 2 1', 'dessiner: face', 'retrouver: face'),
			message: 'dessiner: et retrouver: ne vont pas ensemble',
			explanation: 'Un seul geste par assemblage.'
		},
		{
			title: 'La vue de dessus à retrouver',
			source: fence('cubes', 'hauteurs: 2 1', 'retrouver: dessus'),
			message: 'la vue de dessus est toujours donnée',
			explanation: 'Elle sert de grille de saisie : liste seulement face, droite ou gauche.'
		}
	],
	tryIt: fence('cubes', 'hauteurs: 2 1 1 / 1 0 1')
};
