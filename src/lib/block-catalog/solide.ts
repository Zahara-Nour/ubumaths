/**
 * Catalogue — bloc ```solide (solide en perspective cavalière)
 *
 * Réglages : `src/lib/ubumark/parser/solide-parser.ts`.
 *
 * @module block-catalog/solide
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const solideEntry: BlockCatalogEntry = {
	slug: 'solide',
	title: 'Solide en perspective',
	fences: ['solide'],
	nodeType: 'espace',
	summary:
		'Un cube, un pavé, un prisme, une pyramide, un cylindre, un cône ou une boule dessiné en perspective cavalière, arêtes cachées en tirets : pour reconnaître et nommer un solide, repérer ses faces, ses arêtes et ses sommets, lire ses dimensions.',
	intro:
		'Le bloc dessine le solide en perspective cavalière, comme les assemblages de cubes : la face de devant est en vraie grandeur, les fuyantes partent à 45° vers le haut à droite, réduites de moitié. Les arêtes cachées sont en tirets ; le cylindre, le cône et la boule ont des ellipses à plat, dont la moitié arrière est en tirets. Les dimensions de forme: sont des proportions : le dessin est toujours ramené à 4 cm sur son plus grand côté, à l’écran comme sur la fiche PDF ; avec cotes:, les dimensions sont écrites sur le dessin. Les sommets se nomment dans un ordre fixe, puis se marquent avec marquer:. Le nom du solide n’est jamais lu par le lecteur d’écran : il peut être la réponse.',
	settingGroups: [
		{
			settings: [
				{
					key: 'forme',
					values:
						'cube a | pave l p h | prisme triangle b h L | prisme triangle-rectangle a b L | pyramide carree a h | pyramide rectangle l p h | pyramide triangle a h | cylindre r h | cone r h | boule r',
					defaultValue: null,
					description:
						'Le solide et ses dimensions (nombres positifs, 4 ou 2,5). Pavé : longueur (devant), largeur (en fuyante), hauteur. Prisme : la base est la face de devant, un triangle isocèle de base b et de hauteur h, ou un triangle rectangle en bas à gauche de côtés a et b ; L est la longueur en fuyante. Pyramide : base horizontale, sommet au-dessus de son centre. Cylindre et cône debout. Au plus 1000, 3 chiffres après la virgule, et au plus 10 fois plus grandes les unes que les autres ; la hauteur d’un cône dépasse la moitié de son rayon.'
				},
				{
					key: 'sommets',
					values: 'des noms séparés par des espaces : A B C D E F G H',
					defaultValue: null,
					description:
						'Un nom par sommet (une majuscule, puis éventuellement ’ ou un nombre), - pour un sommet sans nom. Cube, pavé : ABCD la face du bas (A devant à gauche, B devant à droite, C au fond à droite, D au fond à gauche), EFGH au-dessus (E sur A). Prisme : ABC la face de devant (A en bas à gauche), DEF derrière (D derrière A). Pyramide : le sommet, puis la base comme celle du pavé (S A B C D). Cône : S puis O, le centre de la base ; cylindre : O (bas) puis O’ (haut) ; boule : O. Un centre nommé est marqué d’un point.'
				},
				{
					key: 'marquer',
					values: 'face ABCD | face dessus | arete AE | sommet G (séparés par des virgules)',
					defaultValue: null,
					description:
						'face : teintée en gris (les arêtes cachées restent visibles) ; une face se désigne par ses sommets, ou sans noms par sa place : devant, derriere, dessus, dessous, gauche, droite (cube, pavé, prisme ; dessous pour une pyramide). arete : tracée épaisse. sommet : marqué d’un point. Cylindre, cône, boule : seuls les sommets nommés se marquent.'
				},
				{
					key: 'cotes',
					values: 'cm | mm | m | oui | non',
					defaultValue: 'non',
					description:
						'Écrit les dimensions de forme: sur le dessin, avec l’unité (oui : sans unité). Pavé : longueur sous l’arête du bas, largeur le long de la fuyante, hauteur à droite. Pyramide, cône : la hauteur est tracée en tirets. Cylindre : un rayon sur le dessus ; cône, boule : un rayon en tirets.'
				},
				{
					key: 'cachees',
					values: 'oui | non',
					defaultValue: 'oui',
					description:
						'non : les arêtes cachées en trait plein, comme si le solide était en fil de fer (pour « laquelle de ces perspectives est juste ? »).'
				}
			]
		}
	],
	examples: [
		{
			title: 'Un pavé nommé',
			source: fence('solide', 'forme: pave 4 2 3', 'sommets: A B C D E F G H'),
			explanation:
				'ABCD est la face du bas, EFGH celle du dessus. Les trois arêtes qui partent de D sont cachées.'
		},
		{
			title: 'Une face, une arête, un sommet marqués',
			source: fence(
				'solide',
				'forme: cube 3',
				'sommets: A B C D E F G H',
				'marquer: face BCGF, arete AE, sommet H'
			),
			explanation: 'La face de droite est teintée, l’arête [AE] épaisse, le sommet H pointé.'
		},
		{
			title: 'Un pavé coté',
			source: fence('solide', 'forme: pave 5 2 3', 'cotes: cm'),
			explanation: 'Pour calculer un volume : les trois dimensions sont écrites sur le dessin.'
		},
		{
			title: 'Un prisme droit à base triangulaire',
			source: fence('solide', 'forme: prisme triangle-rectangle 3 4 6', 'cotes: cm'),
			explanation:
				'La base est la face de devant, un triangle rectangle ; la longueur est en fuyante.'
		},
		{
			title: 'Une pyramide à base carrée',
			source: fence('solide', 'forme: pyramide carree 4 3', 'sommets: S A B C D'),
			explanation: 'Le sommet S est au-dessus du centre de la base ABCD.'
		},
		{
			title: 'Un cylindre',
			source: fence('solide', 'forme: cylindre 2 5', 'cotes: cm'),
			explanation: 'Le rayon est tracé sur le disque du dessus ; la hauteur est à droite.'
		},
		{
			title: 'Un cône',
			source: fence('solide', 'forme: cone 2 4', 'sommets: S O', 'cotes: cm'),
			explanation: 'La hauteur [SO] et le rayon sont à l’intérieur : ils sont en tirets.'
		},
		{
			title: 'Une boule',
			source: fence('solide', 'forme: boule 3', 'sommets: O'),
			explanation: 'Un cercle et son équateur, dont la moitié arrière est en tirets ; le centre O.'
		},
		{
			title: 'Sans arêtes cachées',
			source: fence('solide', 'forme: pave 4 2 3', 'cachees: non'),
			explanation: 'Toutes les arêtes en trait plein : une perspective à corriger.'
		}
	],
	mistakes: [
		{
			title: 'Une forme inconnue',
			source: fence('solide', 'forme: sphere 3'),
			message: 'formes possibles',
			explanation: 'Une sphère pleine se dit boule.'
		},
		{
			title: 'Une dimension manquante',
			source: fence('solide', 'forme: pave 4 2'),
			message: '3 dimensions',
			explanation: 'Un pavé a une longueur, une largeur et une hauteur.'
		},
		{
			title: 'Trop peu de noms',
			source: fence('solide', 'forme: pave 4 2 3', 'sommets: A B C D'),
			message: '8 noms attendus',
			explanation: 'Un nom par sommet, - pour un sommet sans nom.'
		},
		{
			title: 'Une face qui n’en est pas une',
			source: fence('solide', 'forme: pave 4 2 3', 'sommets: A B C D E F G H', 'marquer: face ABD'),
			message: 'n’est pas une face',
			explanation: 'Les quatre sommets d’une face, dans n’importe quel ordre.'
		},
		{
			title: 'Marquer sans nommer',
			source: fence('solide', 'forme: cube 2', 'marquer: arete AE'),
			message: 'nomme les sommets',
			explanation: 'Sans sommets:, une face se désigne par sa place : marquer: face dessus.'
		}
	],
	tryIt: fence('solide', 'forme: pave 4 2 3', 'sommets: A B C D E F G H')
};
