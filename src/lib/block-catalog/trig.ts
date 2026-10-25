/**
 * Catalogue — bloc ```trig (cercle trigonométrique)
 *
 * Réglages : `src/lib/ubumark/parser/trig-circle-parser.ts`.
 * Les exemples reprennent ceux de la page historique `/aide-ecriture/cercle-trigo`.
 *
 * @module block-catalog/trig
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const trigEntry: BlockCatalogEntry = {
	slug: 'cercle-trigo',
	href: '/aide-ecriture/cercle-trigo',
	title: 'Cercle trigonométrique',
	fences: ['trig'],
	nodeType: 'trig-circle',
	summary: 'Cercle trigonométrique : angles remarquables, points nommés, équations et inéquations.',
	intro:
		'Le bloc dessine le cercle trigonométrique. On choisit des angles remarquables (préréglage), ses propres angles ou des points nommés, et on peut résoudre une équation ou une inéquation en cos, sin ou tan. Un tableau des valeurs peut accompagner le cercle. Les angles s’écrivent pi/3, 2*pi/3, -pi/4 ou 90°.',
	settingGroups: [
		{
			settings: [
				{
					key: 'preset',
					values: 'quarters | sixths | thirds | all | custom',
					defaultValue: 'quarters',
					description:
						'Angles remarquables : 4 quarts, 12 sixièmes, 6 tiers, 16 valeurs au total, ou aucun (custom, avec ses propres angles).'
				},
				{
					key: 'angles',
					values: 'angles séparés par des virgules (pi/5, 7*pi/6, 90°)',
					defaultValue: 'aucun',
					description:
						'Angles ajoutés au préréglage. Un angle illisible est ignoré, avec un avertissement.'
				},
				{
					key: 'points',
					values: 'nom = angle, séparés par des virgules (M = 2*pi/3, N = -pi/4)',
					defaultValue: 'aucun',
					description:
						'Points nommés : une lettre, des chiffres ou des primes (M, A1, M′). 8 au plus ; la clé peut être répétée.'
				},
				{
					key: 'equation',
					values: 'cos, sin ou tan de x, avec =, <, >, <= ou >=, et une valeur (cos(x) > 1/2)',
					defaultValue: 'aucune',
					description:
						'Équation ou inéquation à résoudre. Valeurs : 0, 1, -1, 1/2, √2/2, √3/2, √3, 1/√3, une fraction, un décimal ou cos(pi/5).'
				},
				{
					key: 'mode',
					values: 'points | arc | interactive',
					defaultValue: 'points',
					description: 'Points fixes, arcs solution d’une inéquation, ou point à glisser.'
				},
				{
					key: 'display',
					values: 'circle | table | circle+table',
					defaultValue: 'circle',
					description: 'Cercle seul, tableau des valeurs seul, ou les deux.'
				},
				{
					key: 'mesures',
					values: '0-2pi | principales',
					defaultValue: '0-2pi',
					description: 'Mesures dans [0 ; 2π[ ou mesures principales dans ]−π ; π].'
				},
				{
					key: 'projections',
					values: 'true | false',
					defaultValue: 'false',
					description: 'Trace les projections des points sur les axes.'
				},
				{
					key: 'grid',
					values: 'true | false',
					defaultValue: 'false',
					description: 'Grille de fond.'
				},
				{
					key: 'axes',
					values: 'true | false',
					defaultValue: 'true',
					description: 'Les axes.'
				},
				{
					key: 'labels',
					values: 'true | false',
					defaultValue: 'true',
					description: 'Les noms des angles.'
				},
				{
					key: 'values',
					values: 'true | false',
					defaultValue: 'true',
					description: 'Les valeurs écrites sur les axes.'
				},
				{
					key: 'color',
					values: 'un nom de couleur (blue, green, orange, purple, red, cyan, pink)',
					defaultValue: 'blue',
					description: 'Couleur du tracé.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Préréglage : quarts',
			source: fence('trig', 'preset: quarters', 'labels: true'),
			explanation: 'Les 4 angles principaux : 0, π/2, π et 3π/2.'
		},
		{
			title: 'Préréglage : sixièmes',
			source: fence('trig', 'preset: sixths', 'projections: true', 'color: blue'),
			explanation: 'Les 12 multiples de π/6, avec leurs projections sur les axes.'
		},
		{
			title: 'Préréglage : tiers',
			source: fence('trig', 'preset: thirds', 'color: green'),
			explanation: 'Les 6 multiples de π/3.'
		},
		{
			title: 'Préréglage : tout',
			source: fence('trig', 'preset: all', 'color: purple'),
			explanation: 'Toutes les valeurs remarquables, 16 angles.'
		},
		{
			title: 'Cercle et tableau des valeurs',
			source: fence('trig', 'preset: quarters', 'display: circle+table', 'color: orange'),
			explanation: 'Le cercle accompagné du tableau des cos et sin.'
		},
		{
			title: 'Tableau seul',
			source: fence('trig', 'preset: sixths', 'display: table'),
			explanation: 'Seulement le tableau des valeurs.'
		},
		{
			title: 'Avec projections',
			source: fence('trig', 'preset: thirds', 'projections: true', 'color: cyan'),
			explanation: 'Des traits relient chaque point aux axes pour lire cos et sin.'
		},
		{
			title: 'Angles personnalisés',
			source: fence('trig', 'preset: custom', 'angles: pi/5, 7*pi/6', 'color: pink'),
			explanation: 'Deux angles au choix : π/5 et 7π/6.'
		},
		{
			title: 'Équation cos(x) = 1/2',
			source: fence(
				'trig',
				'preset: custom',
				'equation: cos(x) = 1/2',
				'projections: true',
				'color: blue'
			),
			explanation: 'Les solutions sont π/3 et 5π/3.'
		},
		{
			title: 'Équation sin(x) = √2/2',
			source: fence(
				'trig',
				'preset: custom',
				'equation: sin(x) = √2/2',
				'projections: true',
				'color: red'
			),
			explanation: 'Les solutions sont π/4 et 3π/4.'
		},
		{
			title: 'Inéquation cos(x) > 1/2',
			source: fence(
				'trig',
				'preset: custom',
				'equation: cos(x) > 1/2',
				'mode: arc',
				'color: green'
			),
			explanation: 'Le mode arc colore l’arc solution.'
		},
		{
			title: 'Inéquation sin(x) < −1/2',
			source: fence(
				'trig',
				'preset: custom',
				'equation: sin(x) < -1/2',
				'mode: arc',
				'color: orange'
			),
			explanation: 'L’arc solution est dessiné sur le cercle.'
		},
		{
			title: 'Mode interactif',
			source: fence(
				'trig',
				'preset: custom',
				'angles: pi/4',
				'mode: interactive',
				'display: circle+table',
				'color: purple'
			),
			explanation: 'On glisse le point sur le cercle pour explorer.'
		},
		{
			title: 'Tous les éléments',
			source: fence(
				'trig',
				'preset: quarters',
				'projections: true',
				'grid: true',
				'axes: true',
				'labels: true',
				'values: true',
				'color: blue'
			),
			explanation: 'Projections, grille, axes, noms et valeurs réunis.'
		},
		{
			title: 'Équation avec tableau',
			source: fence(
				'trig',
				'preset: custom',
				'equation: cos(x) = -√3/2',
				'display: circle+table',
				'projections: true',
				'color: red'
			),
			explanation: 'Les solutions de cos(x) = −√3/2, avec le tableau.'
		}
	],
	mistakes: [
		{
			title: 'Préréglage inconnu',
			source: fence('trig', 'preset: demi'),
			message: 'preset inconnu « demi »',
			explanation: 'Les préréglages sont quarters, sixths, thirds, all et custom.'
		},
		{
			title: 'Clé inconnue',
			source: fence('trig', 'preset: quarters', 'noms: M'),
			message: 'clé inconnue « noms »',
			explanation: 'Pour nommer des points, utilise « points: M = pi/3 ».'
		}
	],
	tryIt: fence('trig', 'preset: custom', 'points: M = 2*pi/3, N = -pi/4', 'projections: true')
};
