/**
 * Catalogue — bloc ```operation (opération posée)
 *
 * Réglages : `src/lib/ubumark/parser/operation-parser.ts`.
 *
 * @module block-catalog/operation
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const operationEntry: BlockCatalogEntry = {
	slug: 'operation',
	title: 'Opération posée',
	fences: ['operation'],
	nodeType: 'operation',
	summary: 'Addition, soustraction, multiplication ou division posée en colonnes ou en potence.',
	intro:
		'Le bloc pose l’opération comme au cahier. Par défaut, c’est une grille à remplir : l’élève écrit le résultat et les retenues. Avec « cases: aucune », l’opération est déjà résolue, pour un exemple ou une correction. On n’écrit jamais le résultat : seul le calcul est donné.',
	settingGroups: [
		{
			title: 'Réglages communs',
			settings: [
				{
					key: 'calcul',
					values:
						'2 ou 3 nombres pour une addition, 2 nombres sinon, avec +, − (ou -), × (ou x, *) ou ÷ (ou :, /)',
					defaultValue: null,
					description:
						'Le calcul à poser. Virgule ou point, espaces de milliers acceptés, un seul signe par calcul. 10 chiffres avant la virgule et 3 après au plus.'
				},
				{
					key: 'cases',
					values: 'résultat | aucune',
					defaultValue: 'résultat',
					description: 'Résultat : grille à remplir. Aucune : opération résolue, tout est écrit.'
				},
				{
					key: 'retenues',
					values: 'oui | non',
					defaultValue: 'oui',
					description:
						'À remplir : cases de retenue. Résolue : retenues écrites. Refusé pour une division.'
				}
			]
		},
		{
			title: 'Soustraction',
			settings: [
				{
					key: 'méthode',
					values: 'compensation | cassage',
					defaultValue: 'compensation',
					description:
						'Compensation : on ajoute 1 en haut et en bas. Cassage : on casse une dizaine du chiffre voisin. Refusé hors soustraction.'
				}
			]
		},
		{
			title: 'Division',
			settings: [
				{
					key: 'étapes',
					values: 'soustractions | restes',
					defaultValue: 'soustractions',
					description:
						'Soustractions : on écrit chaque produit à soustraire. Restes : on n’écrit que les restes. Refusé hors division.'
				},
				{
					key: 'quotient',
					values: 'entier | décimal',
					defaultValue: 'entier (décimal si le dividende est décimal)',
					description:
						'Entier : division euclidienne, avec quotient et reste. Décimal : quotient décimal exact, au millième au plus. Diviseur entier de 1 ou 2 chiffres, dividende de 6 chiffres au plus.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Addition décimale à remplir',
			source: fence('operation', 'calcul: 45,6 + 7,85'),
			explanation: 'La forme par défaut : l’élève remplit les cases du résultat et des retenues.'
		},
		{
			title: 'Addition résolue avec retenues',
			source: fence('operation', 'calcul: 245 + 437 + 18', 'cases: aucune'),
			explanation: 'Trois termes au plus ; tout est écrit, retenues comprises.'
		},
		{
			title: 'Soustraction par compensation',
			source: fence('operation', 'calcul: 503 − 278', 'méthode: compensation', 'cases: aucune'),
			explanation: 'On ajoute 10 en haut et en bas pour ne plus avoir à emprunter.'
		},
		{
			title: 'Soustraction par cassage',
			source: fence('operation', 'calcul: 503 - 278', 'méthode: cassage', 'cases: aucune'),
			explanation: 'On casse une centaine en dizaines, puis une dizaine en unités.'
		},
		{
			title: 'Multiplication',
			source: fence('operation', 'calcul: 346 × 27'),
			explanation: 'Le facteur qui a le plus de chiffres est posé en haut.'
		},
		{
			title: 'Division euclidienne',
			source: fence('operation', 'calcul: 875 ÷ 6', 'cases: aucune'),
			explanation: 'Division en potence, avec quotient et reste.'
		},
		{
			title: 'Division décimale',
			source: fence('operation', 'calcul: 785 ÷ 4', 'quotient: décimal', 'cases: aucune'),
			explanation: 'Le quotient 196,25 s’arrête de lui-même : on ajoute des zéros au dividende.'
		},
		{
			title: 'Division avec seulement les restes',
			source: fence('operation', 'calcul: 875 ÷ 6', 'étapes: restes', 'cases: aucune'),
			explanation: 'Les produits à soustraire ne sont pas écrits, seulement les restes.'
		}
	],
	mistakes: [
		{
			title: 'Quotient décimal qui ne s’arrête pas',
			source: fence('operation', 'calcul: 10 ÷ 3', 'quotient: décimal'),
			message: 'le quotient ne s’arrête pas au millième',
			explanation:
				'10 ÷ 3 n’a pas de quotient décimal exact. Choisir une division qui tombe juste (785 ÷ 4) ou garder le quotient entier.'
		},
		{
			title: 'Méthode sur une division',
			source: fence('operation', 'calcul: 875 ÷ 6', 'méthode: cassage'),
			message: 'méthode: seulement pour une soustraction',
			explanation: 'Cette ligne n’existe que pour la soustraction : retire-la.'
		}
	],
	tryIt: fence('operation', 'calcul: 52,4 + 8,75', 'cases: résultat', 'retenues: oui')
};
