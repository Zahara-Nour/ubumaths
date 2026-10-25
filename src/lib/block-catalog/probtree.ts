/**
 * Catalogue — bloc ```probtree (arbre de probabilités)
 *
 * Réglages : `src/lib/ubumark/parser/probability-tree-parser.ts`.
 *
 * @module block-catalog/probtree
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const probtreeEntry: BlockCatalogEntry = {
	slug: 'arbre',
	title: 'Arbre de probabilités',
	fences: ['probtree'],
	nodeType: 'probability-tree',
	summary: 'Arbre pondéré à autant d’étapes que voulu, avec résultats au bout des branches.',
	intro:
		'Chaque ligne est une branche : « événement:probabilité ». Un niveau de plus se marque par 2 espaces de plus. Les probabilités s’écrivent en fraction (1/2), en décimal avec un point (0.5), en symbole (P(A)) ou en pointillés (...) pour un exercice à compléter.',
	settingGroups: [
		{
			settings: [
				{
					key: 'root',
					values: 'un texte : Urne, Pièce…',
					defaultValue: 'aucun',
					description: 'Texte écrit sur le point de départ de l’arbre.'
				},
				{
					key: 'outcomes',
					values: 'true | false',
					defaultValue: 'false',
					description:
						'true : affiche à droite le résultat écrit après la virgule d’une feuille (P(RR)=6/20).'
				},
				{
					key: 'intersection',
					values: 'true | false',
					defaultValue: 'false',
					description:
						'true : écrit au bout de chaque chemin la probabilité de l’intersection (le produit des probabilités du chemin).'
				},
				{
					key: 'événement:probabilité',
					values: 'fraction 1/2, \\frac{1}{3}, décimal 0.5, symbole P(A|B), ou ... ou ?',
					defaultValue: null,
					description:
						'Une branche. Le libellé accepte du LaTeX entre dollars ($A \\cap B$). 2 espaces de plus que la ligne du dessus : c’est une branche de l’événement précédent.'
				},
				{
					key: 'événement:probabilité, résultat',
					values: 'un texte après la virgule',
					defaultValue: 'aucun',
					description: 'Résultat d’une feuille, visible seulement avec « outcomes: true ».'
				}
			]
		}
	],
	examples: [
		{
			title: 'Pile ou face',
			source: fence('probtree', 'Pile:1/2', 'Face:1/2'),
			explanation: 'Un arbre à une étape. Le minimum est une liste de branches.'
		},
		{
			title: 'Deux lancers de pièce',
			source: fence(
				'probtree',
				'root: Pièce',
				'Pile:1/2',
				'  Pile:1/2',
				'  Face:1/2',
				'Face:1/2',
				'  Pile:1/2',
				'  Face:1/2'
			),
			explanation:
				'Les deux lignes décalées de 2 espaces sont les branches de « Pile » au premier lancer.'
		},
		{
			title: 'Tirage sans remise avec résultats',
			source: fence(
				'probtree',
				'root: Urne',
				'outcomes: true',
				'Rouge:3/5',
				'  Rouge:2/4, P(RR)=6/20',
				'  Bleue:2/4, P(RB)=6/20',
				'Bleue:2/5',
				'  Rouge:3/4, P(BR)=6/20',
				'  Bleue:1/4, P(BB)=2/20'
			),
			explanation: 'Le texte après la virgule est écrit au bout de chaque branche finale.'
		},
		{
			title: 'Probabilités conditionnelles',
			source: fence(
				'probtree',
				'$A$:0.3',
				'  $B$:0.8',
				'  $\\overline{B}$:0.2',
				'$\\overline{A}$:0.7',
				'  $B$:0.1',
				'  $\\overline{B}$:0.9'
			),
			explanation:
				'Les événements sont du LaTeX entre dollars, les probabilités sont des décimaux écrits avec un point.'
		},
		{
			title: 'Arbre à compléter',
			source: fence(
				'probtree',
				'root: Urne',
				'Rouge:2/5',
				'  Rouge:...',
				'  Bleue:...',
				'Bleue:...',
				'  Rouge:3/4',
				'  Bleue:1/4'
			),
			explanation: 'Trois points (ou ?) laissent la probabilité vide pour l’élève.'
		}
	],
	mistakes: [
		{
			title: 'Virgule décimale dans une probabilité',
			source: fence('probtree', 'Rouge:0,5', 'Bleue:0,5'),
			explanation:
				'La virgule sépare la probabilité du résultat : 0,5 est lu comme la probabilité 0 avec le résultat « 5 ». L’arbre s’affiche, mais faux, sans message. Écrire 0.5 (point) ou 1/2.'
		},
		{
			title: 'Décalage de 3 espaces',
			source: fence('probtree', 'Rouge:1/2', '   Pile:1/2', '   Face:1/2', 'Bleue:1/2'),
			explanation:
				'Le décalage doit être un multiple de 2 espaces. Sinon le bloc n’est pas un arbre : le prof voit son texte dans un cadre de code, sans message. Même effet si une ligne n’a pas de « : » ou saute un niveau.'
		}
	],
	tryIt: fence(
		'probtree',
		'root: Urne',
		'outcomes: true',
		'Rouge:3/5',
		'  Rouge:2/4, P(RR)=6/20',
		'  Bleue:2/4, P(RB)=6/20',
		'Bleue:2/5',
		'  Rouge:3/4, P(BR)=6/20',
		'  Bleue:1/4, P(BB)=2/20'
	)
};
