/**
 * Catalogue — bloc ```partage (figure partagée en parts égales)
 *
 * Réglages : `src/lib/ubumark/parser/partage-parser.ts`.
 *
 * @module block-catalog/partage
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const partageEntry: BlockCatalogEntry = {
	slug: 'partage',
	title: 'Figure partagée en parts égales',
	fences: ['partage'],
	nodeType: 'partage',
	summary:
		'Une bande, une grille, un disque ou un carré partagé en parts égales : dont certaines sont coloriées (pour lire une fraction), ou que l’élève colorie (pour représenter une fraction).',
	intro:
		'Le bloc dessine la figure, ses parts égales et, si vous le demandez, les parts coloriées. Avec gris:, il ne fait que montrer : la réponse (« quelle fraction est coloriée ? ») est une case ordinaire de l’énoncé. Avec colorier:, c’est l’élève qui colorie (en touchant ou en glissant) : la case est posée toute seule dans une question, et la réponse est juste dès que la part coloriée vaut la fraction, quelles que soient les parts. Les parts sont numérotées de 1 à N : la bande de gauche à droite, la grille ligne par ligne depuis le coin en haut à gauche, le disque depuis midi dans le sens des aiguilles d’une montre, le carré de haut en bas puis à droite et à gauche (haut, droite, bas, gauche). Sur la fiche PDF, les parts coloriées sont grisées et la figure à colorier reste vide, pour le crayon.',
	settingGroups: [
		{
			settings: [
				{
					key: 'forme',
					values: 'bande N | grille L×C | disque N | carre-diagonales',
					defaultValue: null,
					description:
						'bande N : N parts en ligne, de 2 à 12. grille L×C : L lignes et C colonnes, de 1 à 10 chacune et au moins 2 parts (on peut écrire x pour ×) ; 10×10 donne les centièmes. disque N : N secteurs égaux, de 2 à 12. carre-diagonales : un carré coupé par ses deux diagonales, 4 triangles.'
				},
				{
					key: 'gris',
					values: 'un nombre N | une liste de rangs : 1, 4, 6 | une seule part : 4,',
					defaultValue: 'aucune part coloriée',
					description:
						'Un nombre colorie les N premières parts (de 0 au total de parts). Une liste colorie ces parts-là, numérotées à partir de 1, sans doublon. Pour une seule part, la faire suivre d’une virgule : gris: 4, colorie la part 4 seule.'
				},
				{
					key: 'colorier',
					values: 'une fraction : 3/8',
					defaultValue: null,
					description:
						'La fraction que l’élève doit colorier, au plus 1 (plusieurs figures : pas encore disponible). Elle doit tomber juste sur la figure : 1/2 sur une bande de 4 (2 parts) est permis, 1/3 sur une bande de 8 non. Ne se combine pas avec gris:. Dans une question, ne pas écrire de case : elle est posée toute seule.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Les trois premiers huitièmes',
			source: fence('partage', 'forme: bande 8', 'gris: 3'),
			explanation: 'Un nombre colorie les parts depuis la première.'
		},
		{
			title: 'Des parts choisies',
			source: fence('partage', 'forme: disque 6', 'gris: 1, 4, 6'),
			explanation: 'Une liste colorie les parts de votre choix, même séparées.'
		},
		{
			title: 'Les centièmes',
			source: fence('partage', 'forme: grille 10×10', 'gris: 37'),
			explanation:
				'Une grille de 10 lignes et 10 colonnes : 37 centièmes coloriés, ligne par ligne.'
		},
		{
			title: 'Un carré en quatre triangles',
			source: fence('partage', 'forme: carre-diagonales', 'gris: 2'),
			explanation: 'Les diagonales coupent le carré en 4 triangles égaux.'
		},
		{
			title: 'À colorier par l’élève',
			source: fence('partage', 'forme: bande 8', 'colorier: 3/8'),
			explanation:
				'La figure est vide ; l’élève colorie 3 parts sur 8, les parts qu’il veut. Dans une question, la réponse est jugée sur la valeur : 2 parts sur 4 sont justes pour 1/2.'
		},
		{
			title: 'Sans part coloriée',
			source: fence('partage', 'forme: grille 2×5'),
			explanation: 'Sans gris:, la figure est montrée telle quelle, pour compter ses parts.'
		}
	],
	mistakes: [
		{
			title: 'Trop de parts',
			source: fence('partage', 'forme: bande 20'),
			message: 'de 2 à 12 parts',
			explanation:
				'Une bande ou un disque a de 2 à 12 parts ; pour plus, une grille (jusqu’à 10×10).'
		},
		{
			title: 'Une part qui n’existe pas',
			source: fence('partage', 'forme: bande 8', 'gris: 1, 9'),
			message: 'la part 9 n’existe pas',
			explanation: 'Les parts sont numérotées de 1 au nombre de parts de la figure.'
		},
		{
			title: 'gris: avec colorier:',
			source: fence('partage', 'forme: bande 8', 'gris: 2', 'colorier: 3/8'),
			message: 'gris: et colorier: ne vont pas ensemble',
			explanation:
				'gris: montre des parts coloriées, colorier: demande à l’élève de colorier : l’un ou l’autre.'
		},
		{
			title: 'Une fraction qui ne tombe pas juste',
			source: fence('partage', 'forme: bande 8', 'colorier: 1/3'),
			message: 'ne tombe pas juste',
			explanation:
				'Le nombre de parts doit être un multiple du dénominateur : 8 n’est pas un multiple de 3.'
		},
		{
			title: 'Forme absente',
			source: fence('partage', 'gris: 3'),
			message: 'il manque la ligne forme:',
			explanation: 'La première ligne dit quelle figure dessiner.'
		}
	],
	tryIt: fence('partage', 'forme: bande 8', 'gris: 3')
};
