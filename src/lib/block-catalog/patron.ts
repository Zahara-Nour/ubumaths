/**
 * Catalogue — bloc ```patron (patron d'un solide)
 *
 * Réglages : `src/lib/ubumark/parser/patron-parser.ts`. Les 11 patrons et les
 * 8 faux patrons du cube sont dessinés un par un, dans l'ordre de leur numéro :
 * c'est par ce numéro que le prof les choisit.
 *
 * @module block-catalog/patron
 */
import { CUBE_NETS, FALSE_CUBE_NETS } from '$lib/ubumark/utils/espace-patrons';
import { fence } from './fence';
import type { BlockCatalogEntry, BlockExample } from './types';

/** Familles des patrons du cube, par numéro */
const NET_FAMILIES = [
	'croix',
	'1-4-1',
	'1-4-1',
	'1-4-1',
	'1-4-1',
	'1-4-1',
	'2-3-1',
	'2-3-1',
	'2-3-1',
	'2-2-2',
	'3-3'
];

const FALSE_NET_REASONS = [
	'5 faces en ligne : les deux du bout se recouvrent.',
	'Un bloc de 2 × 3 : quatre faces autour d’un même coin.',
	'Deux rabats côte à côte, du même côté.',
	'Deux rabats aux deux bouts, du même côté : ils deviennent tous deux le dessus.',
	'Deux rabats espacés, du même côté.',
	'Un L : la face du bout revient sur une autre.',
	'Trois et trois décalés d’une seule case.',
	'Un U : les deux rabats du haut deviennent le même dessus.'
];

const cubeNetExamples: BlockExample[] = CUBE_NETS.map((_, i) => ({
	title: `Patron du cube n° ${i + 1} (${NET_FAMILIES[i]})`,
	source: fence('patron', 'solide: cube', `forme: ${i + 1}`),
	explanation: i === 0 ? 'La croix, la forme par défaut.' : `forme: ${i + 1}`
}));

const falseNetExamples: BlockExample[] = FALSE_CUBE_NETS.map((_, i) => ({
	title: `Faux patron n° ${i + 1}`,
	source: fence('patron', 'solide: cube', `forme: faux ${i + 1}`),
	explanation: FALSE_NET_REASONS[i]
}));

export const patronEntry: BlockCatalogEntry = {
	slug: 'patron',
	title: 'Patron d’un solide',
	fences: ['patron'],
	nodeType: 'espace',
	summary:
		'Le patron d’un cube, d’un pavé, d’un prisme droit, d’une pyramide ou d’un cylindre, ou un faux patron du cube : pour reconnaître un patron, relier un patron et sa perspective, trouver où vient un sommet ou quelle face est opposée à une autre.',
	intro:
		'Le bloc déplie le solide de ```solide : chaque coin du patron porte le nom du sommet du solide sur lequel il vient une fois plié, si bien qu’un même nom revient plusieurs fois. Le contour est en trait plein, les plis en trait fin. Les patrons du cube et du pavé se choisissent par leur numéro (les 11 patrons et 8 faux patrons sont dessinés plus bas), ou, pour le cube, en dessinant la grille de ses faces : le bloc la plie et refuse une grille qui ne fait pas ce que tu annonces. Le dessin mesure 6 cm sur son plus grand côté, à l’écran comme sur la fiche PDF. Le lecteur d’écran ne dit jamais « patron » ni le nom du solide : ce peut être la réponse.',
	settingGroups: [
		{
			settings: [
				{
					key: 'solide',
					values:
						'cube | cube a | pave l p h | prisme triangle b h L | prisme triangle-rectangle a b L | pyramide carree a h | pyramide rectangle l p h | pyramide triangle a h | cylindre r h',
					defaultValue: null,
					description:
						'Le solide, avec les mots et les dimensions de ```solide (proportions). Le cube peut se passer de son côté, sauf pour cotes:. Pas de cône ni de boule.'
				},
				{
					key: 'forme',
					values:
						'1 à 11 | faux 1 à faux 8 | une grille (cube) | 1 ou 2 (prisme) | 1 (pyramide, cylindre)',
					defaultValue: '1',
					description:
						'La disposition des faces. Cube, pavé : un des 11 patrons ou des 8 faux patrons dessinés plus bas. Cube : aussi une grille en retrait sous forme:, X pour une face, . pour une case vide (au plus 6 × 6, 10 cases). Prisme : 1, les deux triangles sur le même rectangle ; 2, sur deux rectangles différents. Pyramide : en étoile autour de la base. Cylindre : un rectangle et un disque au milieu de chaque grand côté.'
				},
				{
					key: 'faux',
					values: 'oui | non',
					defaultValue: 'non',
					description:
						'Pour une grille seulement : oui annonce un faux patron. Sans faux: oui, une grille qui ne se plie pas en cube est refusée ; avec, une grille qui se plie en cube est refusée.'
				},
				{
					key: 'tourner',
					values: '0 | 90 | 180 | 270',
					defaultValue: '0',
					description:
						'Tourne le dessin d’un quart de tour (ou plus) dans le sens des aiguilles d’une montre : le même patron, autrement posé. Noms et numéros suivent.'
				},
				{
					key: 'retourner',
					values: 'oui | non',
					defaultValue: 'non',
					description: 'Le dessin en miroir (gauche et droite échangées). Noms et numéros suivent.'
				},
				{
					key: 'dessous',
					values: 'un numéro de face',
					defaultValue: '1',
					description:
						'Cube, pavé : la face (numérotée dans l’ordre de lecture du patron, avant tourner:) qui devient la face du dessous ABCD, A en bas à gauche. Pavé : ses côtés horizontaux mesurent la longueur, ses côtés verticaux la largeur.'
				},
				{
					key: 'sommets',
					values: 'les noms des sommets du solide : A B C D E F G H',
					defaultValue: null,
					description:
						'Les noms des sommets du SOLIDE, dans l’ordre de ```solide (cube, pavé : ABCD en bas, E sur A ; prisme ABC devant, DEF derrière ; pyramide S puis la base ; cylindre O en bas, O’ en haut). Chaque coin du patron prend le nom du sommet où il vient. - : sans nom ; ? : écrit « ? » partout où vient ce sommet (« quelle lettre à la place de ? »). Pas de noms sur un faux patron : il ne se plie pas.'
				},
				{
					key: 'faces',
					values: 'numeros | non',
					defaultValue: 'non',
					description:
						'numeros : chaque face porte son numéro (ordre de lecture du patron, avant tourner:).'
				},
				{
					key: 'marquer',
					values: 'face 3 | face dessus | sommet A (séparés par des virgules)',
					defaultValue: null,
					description:
						'face : teintée en gris, désignée par son numéro, ou par la place qu’elle prend une fois pliée (devant, derriere, dessus, dessous, gauche, droite ; dessous pour une pyramide ; sur un faux patron, par son numéro seulement). sommet : un point sur chaque coin qui vient sur ce sommet.'
				},
				{
					key: 'cotes',
					values: 'cm | mm | m | oui | non',
					defaultValue: 'non',
					description:
						'Écrit chaque longueur différente une fois, sur le bord du patron. Pyramide : le côté de la base. Prisme isocèle : la hauteur du triangle en tirets. Cylindre : le rayon (en tirets) et la hauteur ; la longueur du rectangle n’est jamais écrite.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Un patron du cube nommé',
			source: fence('patron', 'solide: cube', 'sommets: A B C D E F G H'),
			explanation:
				'La face 1 (en haut) devient ABCD ; chaque lettre revient là où le sommet se replie.'
		},
		{
			title: 'Quelle lettre à la place de ?',
			source: fence('patron', 'solide: pave 4 2 3', 'forme: 7', 'sommets: A B C D E ? G H'),
			explanation: 'Le point d’interrogation est partout où vient F.'
		},
		{
			title: 'Faces numérotées, une face grise',
			source: fence('patron', 'solide: cube', 'forme: 4', 'faces: numeros', 'marquer: face 2'),
			explanation: 'Pour « quelle face est opposée à la face grise ? ».'
		},
		{
			title: 'Une grille dessinée',
			source: fence('patron', 'solide: cube', 'forme:', '  . X . .', '  X X X X', '  . . X .'),
			explanation: 'Le bloc plie la grille : elle doit faire un cube.'
		},
		{
			title: 'Un faux patron dessiné',
			source: fence('patron', 'solide: cube', 'forme:', '  X X X', '  X X X', 'faux: oui'),
			explanation: 'faux: oui : le bloc vérifie que la grille ne se plie PAS en cube.'
		},
		{
			title: 'Le même patron, tourné',
			source: fence('patron', 'solide: cube', 'forme: 9', 'tourner: 90'),
			explanation: 'Pour qu’un patron ne se reconnaisse pas qu’à son image.'
		},
		{
			title: 'Un pavé coté',
			source: fence('patron', 'solide: pave 4 2 3', 'forme: 1', 'cotes: cm'),
			explanation: 'Les trois dimensions, chacune une fois.'
		},
		{
			title: 'Un prisme droit',
			source: fence('patron', 'solide: prisme triangle 3 2 5', 'forme: 2', 'sommets: A B C D E F'),
			explanation: 'Trois rectangles et deux triangles, sur deux rectangles différents.'
		},
		{
			title: 'Une pyramide à base carrée',
			source: fence('patron', 'solide: pyramide carree 4 3', 'sommets: S A B C D', 'cotes: cm'),
			explanation: 'Les quatre triangles autour de la base : S revient quatre fois.'
		},
		{
			title: 'Un cylindre',
			source: fence('patron', 'solide: cylindre 1 3', "sommets: O O'", 'cotes: cm'),
			explanation:
				'La longueur du rectangle (le périmètre du disque) n’est pas écrite : c’est souvent la question.'
		},
		...cubeNetExamples,
		...falseNetExamples
	],
	mistakes: [
		{
			title: 'Une grille qui ne se plie pas',
			source: fence('patron', 'solide: cube', 'forme:', '  X X X', '  X X X'),
			message: 'ne se plie pas en cube',
			explanation: 'Ajoute faux: oui si c’est voulu.'
		},
		{
			title: 'Un vrai patron annoncé faux',
			source: fence(
				'patron',
				'solide: cube',
				'forme:',
				'  . X . .',
				'  X X X X',
				'  . X . .',
				'faux: oui'
			),
			message: 'est un vrai patron du cube',
			explanation: 'Retire faux: oui.'
		},
		{
			title: 'Un cône',
			source: fence('patron', 'solide: cone 2 3'),
			message: 'n’a pas de patron dans ce bloc',
			explanation: 'Le patron du cône n’est pas dessiné par ce bloc.'
		},
		{
			title: 'Trop peu de noms',
			source: fence('patron', 'solide: cube', 'sommets: A B C D'),
			message: '8 noms attendus',
			explanation: 'Les noms des 8 sommets du cube, - pour un sommet sans nom.'
		},
		{
			title: 'Coter un cube sans son côté',
			source: fence('patron', 'solide: cube', 'cotes: cm'),
			message: 'écris le côté du cube',
			explanation: 'solide: cube 3, puis cotes: cm.'
		}
	],
	tryIt: fence('patron', 'solide: cube', 'forme: 1', 'sommets: A B C D E F G H')
};
