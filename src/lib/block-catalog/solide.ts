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
				},
				{
					key: 'section',
					values:
						'parallele ABCD 2 | parallele dessus 2 IJKL (cube, pavé) | perpendiculaire 2 | parallele 1 (cylindre) | 1 (boule)',
					defaultValue: null,
					description:
						'Coupe le solide par un plan ; la section est teintée, le plan n’est pas dessiné. Cube, pavé : plan parallèle à une face (par ses sommets ou sa place), à la distance donnée de cette face ; quatre noms à la fin nomment les sommets de la section (le premier sur l’arête qui part du premier sommet de la face). Cylindre : perpendiculaire à l’axe, à la hauteur donnée au-dessus de la base du bas ; ou parallèle à l’axe, plan de face à la distance donnée de l’axe (0 : par l’axe). Boule : plan horizontal à la distance donnée du centre (0 : un grand cercle). Sans distance, le plan passe au milieu. Avec cotes:, la distance est écrite ; les dimensions de la section jamais, ni sa nature au lecteur d’écran : ce sont les réponses.'
				},
				{
					key: 'points',
					values: 'I milieu AE | O centre ABCD | O centre ABCDEFGH (séparés par des virgules)',
					defaultValue: null,
					description:
						'Cube, pavé, prisme, pyramide : des points de plus, marqués d’un point et nommés (une majuscule, puis éventuellement ’ ou un nombre). milieu : le milieu de deux points, sommets ou points déjà déclarés (J milieu IG). centre : le centre d’une face, ou pour un cube ou un pavé ses huit sommets, le centre du solide. Les sommets doivent être nommés ; au plus 8 points.'
				},
				{
					key: 'vecteurs',
					values: 'AB | u = AE (séparés par des virgules)',
					defaultValue: null,
					description:
						'Cube, pavé, prisme, pyramide : des flèches entre deux points nommés (sommets ou points de points:). u = AE écrit la lettre u près de la flèche, sous une petite flèche (une minuscule, puis éventuellement un chiffre). Les flèches sont en trait plein, même à travers le solide. Au plus 8 vecteurs.'
				},
				{
					key: 'tracer',
					values: 'vecteur AB + AD + AE | vecteur AB + AD depuis A',
					defaultValue: null,
					description:
						'Geste de l’élève, dans une question : il touche un point pour l’origine, puis un point pour l’extrémité, et une flèche se dessine. La combinaison : au plus 6 vecteurs entre points nommés, signes + et -, coefficients entiers ou demis (2 AB, 1/2 AE). depuis A impose l’origine (posée d’office, l’élève ne touche que l’extrémité) ; sans lui, tout représentant du vecteur est juste. Les points à toucher : les sommets nommés, puis les points de points: (pas de milieux automatiques) ; l’extrémité doit tomber sur l’un d’eux. Polyèdres seulement, sommets nommés. Faux : une phrase, et la flèche juste en vert. Réponse de la case : les noms des deux points (A/G).'
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
			title: 'Un pavé coupé parallèlement à une face',
			source: fence(
				'solide',
				'forme: pave 6 4 3',
				'sommets: A B C D E F G H',
				'section: parallele ABCD 2 IJKL',
				'cotes: cm'
			),
			explanation:
				'Le plan est parallèle à la face du bas, à 2 cm ; la section IJKL est teintée, I sur [AE], J sur [BF].'
		},
		{
			title: 'Un cylindre coupé perpendiculairement à son axe',
			source: fence('solide', 'forme: cylindre 2 5', 'section: perpendiculaire 3'),
			explanation: 'La section est un disque, dessiné en ellipse à plat à la hauteur 3.'
		},
		{
			title: 'Un cylindre coupé parallèlement à son axe',
			source: fence('solide', 'forme: cylindre 2 5', 'section: parallele 1', 'cotes: cm'),
			explanation:
				'Plan de face à 1 cm de l’axe : la section est un rectangle, vu en vraie grandeur.'
		},
		{
			title: 'Une boule coupée par un plan',
			source: fence('solide', 'forme: boule 3', 'sommets: O', 'section: 2', 'cotes: cm'),
			explanation: 'Le plan est à 2 cm du centre ; section: 0 donne un grand cercle.'
		},
		{
			title: 'Des vecteurs sur un cube',
			source: fence(
				'solide',
				'forme: cube 3',
				'sommets: A B C D E F G H',
				'points: I milieu EF',
				'vecteurs: u = AB, v = AD, w = AI'
			),
			explanation:
				'Trois vecteurs donnés, nommés u, v et w ; I est le milieu de [EF]. Pour représenter u + v ou AB + ½ AE.'
		},
		{
			title: 'Le centre d’une face d’un tétraèdre',
			source: fence(
				'solide',
				'forme: pyramide triangle 4 3',
				'sommets: S A B C',
				'points: G centre ABC',
				'vecteurs: SG'
			),
			explanation: 'G est le centre de gravité de la base ABC ; la flèche va du sommet S à G.'
		},
		{
			title: 'Un vecteur à tracer, origine imposée',
			source: fence(
				'solide',
				'forme: cube 3',
				'sommets: A B C D E F G H',
				'points: I milieu CG',
				'tracer: vecteur AB + AD + 1/2 AE depuis A'
			),
			explanation:
				'L’élève touche l’extrémité, ici I, le milieu de [CG] : l’origine A est posée d’office. Les huit sommets et I se touchent.'
		},
		{
			title: 'Un vecteur à tracer, origine libre',
			source: fence(
				'solide',
				'forme: cube 3',
				'sommets: A B C D E F G H',
				'tracer: vecteur AB + AD'
			),
			explanation:
				'L’élève touche l’origine puis l’extrémité : A puis C est juste, comme E puis G : toute flèche égale à AB + AD est juste.'
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
		},
		{
			title: 'Un vecteur vers un point inconnu',
			source: fence('solide', 'forme: cube 2', 'sommets: A B C D E F G H', 'vecteurs: AI'),
			message: 'aucun point ne s’appelle I',
			explanation: 'Déclarer d’abord le point : points: I milieu EF.'
		},
		{
			title: 'Un vecteur à tracer qui n’arrive nulle part',
			source: fence(
				'solide',
				'forme: cube 2',
				'sommets: A B C D E F G H',
				'tracer: vecteur AB + 1/2 AE depuis A'
			),
			message: 'l’extrémité ne tombe sur aucun point',
			explanation: 'Déclarer le milieu : points: I milieu BF, puis il devient un point à toucher.'
		},
		{
			title: 'Un plan qui ne coupe pas le solide',
			source: fence('solide', 'forme: pave 6 4 3', 'section: parallele dessous 3'),
			message: 'le plan ne coupe pas',
			explanation:
				'La distance à la face est plus petite que la hauteur du pavé (ici, entre 0 et 3).'
		}
	],
	tryIt: fence('solide', 'forme: pave 4 2 3', 'sommets: A B C D E F G H')
};
