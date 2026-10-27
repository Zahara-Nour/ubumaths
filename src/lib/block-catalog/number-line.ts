/**
 * Catalogue — bloc ```line (droite graduée)
 *
 * Réglages : `src/lib/ubumark/parser/number-line-parser.ts`.
 *
 * @module block-catalog/number-line
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const numberLineEntry: BlockCatalogEntry = {
	slug: 'droite-graduee',
	title: 'Droite graduée',
	fences: ['line'],
	nodeType: 'number-line',
	summary:
		'Une droite graduée avec des points nommés, des intervalles et des repères cachés ; dans une question, l’élève y place un point.',
	intro:
		'Le bloc dessine une droite entre deux bornes, avec une graduation régulière. On y place des points nommés, des intervalles colorés et des repères à retrouver. Les nombres s’écrivent comme dans les autres blocs : 1/3, sqrt(2), \\pi, 2.5. Le séparateur décimal est le point, et la virgule sépare les éléments d’une liste.',
	settingGroups: [
		{
			title: 'La droite',
			settings: [
				{
					key: 'start',
					values: 'un nombre, une fraction ou une expression (-3, 1/2, \\pi)',
					defaultValue: null,
					description: 'Borne de gauche. Elle doit être plus petite que end.'
				},
				{
					key: 'end',
					values: 'un nombre, une fraction ou une expression',
					defaultValue: null,
					description: 'Borne de droite.'
				},
				{
					key: 'step',
					values: 'un nombre positif (1, 0.5, 1/4)',
					defaultValue: null,
					description: 'Écart entre deux graduations. 500 graduations au plus.'
				},
				{
					key: 'major',
					values: 'un entier positif',
					defaultValue: '1',
					description: 'Une grande graduation, avec son nombre écrit, toutes les major graduations.'
				},
				{
					key: 'scale',
					values: 'linear | log',
					defaultValue: 'linear',
					description: 'Échelle logarithmique : start et end doivent alors être positifs.'
				},
				{
					key: 'arrows',
					values: 'true | false',
					defaultValue: 'false',
					description: 'Des flèches aux deux bouts. Toute autre valeur que true vaut false.'
				}
			]
		},
		{
			title: 'Les nombres écrits',
			settings: [
				{
					key: 'labels',
					values: 'des nombres séparés par des virgules (0, 1/3, 2)',
					defaultValue: 'les grandes graduations',
					description: 'Seuls ces nombres sont écrits sous la droite.'
				},
				{
					key: 'hidden',
					values: 'des nombres séparés par des virgules',
					defaultValue: 'aucun',
					description:
						'Ces nombres sont remplacés par « ? » : l’élève doit les retrouver. Ils doivent figurer parmi les nombres écrits.'
				}
			]
		},
		{
			title: 'Points et intervalles',
			settings: [
				{
					key: 'points',
					values: 'Nom=nombre [couleur], séparés par des virgules (A=1/2 rouge, B=-1)',
					defaultValue: 'aucun',
					description:
						'Un point nommé, couleur facultative en dernier (bleu, rouge, vert, orange, violet, jaune, cyan, marron, rose, gris, noir, blanc, ou #rrggbb). Le point doit être entre start et end.'
				},
				{
					key: 'segments',
					values: '[a, b] ou ]a, b[ [couleur], séparés par des virgules',
					defaultValue: 'aucun',
					description:
						'Un intervalle, couleur facultative en dernier comme pour un point. Crochet tourné vers l’intervalle : fermé ; vers l’extérieur : ouvert, comme en cours. a doit être plus petit que b.'
				}
			]
		},
		{
			title: 'Dans une question : placer un point',
			settings: [
				{
					key: 'placer',
					values: 'un nombre de la droite, sur une graduation (7, 3/4, 0.3)',
					defaultValue: 'aucun',
					description:
						'L’élève touche la droite pour y poser son point (ou les boutons ◀ ▶) : la droite compte pour une case, juste si le point est sur ce nombre. Jamais écrit à l’écran. Sans points: (un seul point, celui de l’élève). Sur le PDF, la droite sans point : l’enfant fait sa croix.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Une droite simple',
			source: fence('line', 'start: 0', 'end: 10', 'step: 1'),
			explanation: 'Les trois lignes obligatoires : chaque graduation est écrite.'
		},
		{
			title: 'Placer des quarts',
			source: fence(
				'line',
				'start: 0',
				'end: 2',
				'step: 1/4',
				'major: 4',
				'points: A=3/4 rouge, B=5/4 bleu'
			),
			explanation: 'Un quart par graduation ; seuls 0, 1 et 2 sont écrits (major: 4).'
		},
		{
			title: 'Des décimaux à retrouver',
			source: fence(
				'line',
				'start: 0',
				'end: 1',
				'step: 0.1',
				'major: 5',
				'labels: 0, 0.5, 1',
				'hidden: 0.5',
				'points: M=0.7'
			),
			explanation: 'Le 0.5 devient « ? » : l’élève le retrouve, puis lit M.'
		},
		{
			title: 'Température avec des négatifs',
			source: fence(
				'line',
				'start: -6',
				'end: 6',
				'step: 1',
				'major: 2',
				'arrows: true',
				'points: A=-4 bleu, B=3 rouge'
			),
			explanation: 'Une flèche à chaque bout pour montrer que la droite continue.'
		},
		{
			title: 'Intervalles ouvert et fermé',
			source: fence(
				'line',
				'start: -3',
				'end: 5',
				'step: 1',
				'segments: [-2, 1] vert, ]2, 4[ orange'
			),
			explanation: '[-2, 1] est fermé aux deux bouts ; ]2, 4[ est ouvert aux deux bouts.'
		},
		{
			title: 'Placer un nombre (question)',
			source: fence('line', 'start: 0', 'end: 20', 'step: 1', 'labels: 0, 10, 20', 'placer: 7'),
			explanation:
				'Dans une question, l’élève pose son point ; la réponse est juste s’il est sur 7. La consigne (« Place le nombre 7. ») va dans l’énoncé, au-dessus.'
		},
		{
			title: 'Placer plusieurs nombres (question)',
			source: fence(
				'line',
				'start: 0',
				'end: 20',
				'step: 1',
				'labels: 0, 10, 20',
				'placer: A=3 ; B=7 ; C=12'
			),
			explanation:
				'Un point par lettre majuscule, séparés par « ; » (6 au plus) ; chaque point compte pour une case. L’élève choisit l’étiquette A, B ou C sous la droite, puis touche la droite.'
		},
		{
			title: 'Un nombre irrationnel',
			source: fence(
				'line',
				'start: 0',
				'end: 4',
				'step: 0.5',
				'major: 2',
				'points: R=sqrt(2) rouge, P=\\pi violet'
			),
			explanation: 'sqrt(2) et \\pi se placent à leur valeur approchée.'
		}
	],
	mistakes: [
		{
			title: 'Virgule décimale dans un point',
			source: fence('line', 'start: 0', 'end: 2', 'step: 0.5', 'points: A=0,5'),
			explanation:
				'Le prof voit le texte du bloc en clair, sans droite et sans message. La virgule sépare les éléments d’une liste : « 0,5 » devient deux éléments. Écrire 0.5 avec un point.'
		},
		{
			title: 'Point hors de la droite',
			source: fence('line', 'start: 0', 'end: 5', 'step: 1', 'points: A=7'),
			explanation:
				'Le prof voit le texte du bloc en clair, sans droite et sans message. A=7 sort de [0, 5] : élargir end ou changer le point.'
		}
	],
	tryIt: fence(
		'line',
		'start: 0',
		'end: 3',
		'step: 1/2',
		'major: 2',
		'labels: 0, 1, 2, 3',
		'hidden: 2',
		'points: A=3/2 rouge, B=5/2 bleu'
	)
};
