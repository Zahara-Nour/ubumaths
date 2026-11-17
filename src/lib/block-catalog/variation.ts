/**
 * Catalogue — bloc ```variation (tableau de variations ou de signes)
 *
 * Réglages : `src/lib/ubumark/parser/variation-table-parser.ts`.
 *
 * @module block-catalog/variation
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const variationEntry: BlockCatalogEntry = {
	slug: 'variations',
	title: 'Tableau de variations ou de signes',
	fences: ['variation'],
	nodeType: 'variation-table',
	summary: 'Tableau de signes, tableau de variations, ou les deux dans le même tableau.',
	intro:
		'Le bloc décrit la variable, les valeurs importantes du domaine, puis une ou plusieurs lignes. Une ligne « sign » donne des signes, une ligne « variation » donne des flèches. Un tableau de signes est simplement un bloc sans ligne « variation ». Les virgules séparent les valeurs : écrire 11/2 et non 5,5. Dans une question, un ? devant une case la laisse vide pour l’élève : le tableau s’écrit juste, la réponse attendue est tirée du bloc.',
	settingGroups: [
		{
			title: 'En-tête du tableau',
			settings: [
				{
					key: 'variable',
					values: 'un nom : x, t…',
					defaultValue: null,
					description: 'Le nom de la variable, écrit dans la première case de la première ligne.'
				},
				{
					key: 'domain',
					values: 'valeurs séparées par des virgules : -inf, -3, 1, +inf',
					defaultValue: null,
					description:
						'Les bornes et les valeurs remarquables, de gauche à droite. -inf et +inf donnent −∞ et +∞.'
				},
				{
					key: 'sign: nom',
					values: 'un libellé : f(x), x-2…',
					defaultValue: 'aucune',
					description:
						'Ouvre une ligne de signes. Les cases viennent juste dessous, décalées de 2 espaces.'
				},
				{
					key: 'variation: nom',
					values: 'un libellé : f(x)',
					defaultValue: 'aucune',
					description:
						'Ouvre une ligne de variations (flèches). Il faut au moins une ligne « sign » ou « variation ».'
				}
			]
		},
		{
			title: 'Cases d’une ligne « sign » (2 espaces au début de la ligne)',
			settings: [
				{
					key: 'a,b: signe',
					values: '+ | -',
					defaultValue: null,
					description: 'Le signe sur l’intervalle entre deux valeurs du domaine : -inf,2: -'
				},
				{
					key: 'a: marqueur',
					values: 'z (ou 0) | |h| | || | d',
					defaultValue: null,
					description:
						'Sur une valeur : z = un zéro, |h| = valeur interdite (double barre), || = asymptote, d = discontinuité.'
				}
			]
		},
		{
			title: 'Cases d’une ligne « variation » (2 espaces au début de la ligne)',
			settings: [
				{
					key: 'a: valeur, position',
					values: 'position : top | bottom | center',
					defaultValue: null,
					description:
						'La valeur de f en a, placée en haut, en bas ou au milieu. Les flèches se déduisent des positions.'
				},
				{
					key: 'a: ||, valeur, position, valeur, position',
					values: 'positions : top | bottom | center',
					defaultValue: null,
					description:
						'Valeur interdite avec deux limites : la première à gauche, la seconde à droite.'
				},
				{
					key: 'a: ||, left | right, valeur, position',
					values: 'left | right',
					defaultValue: null,
					description: 'Valeur interdite avec une seule limite, du côté indiqué.'
				}
			]
		},
		{
			title: 'Dans une question : cases à compléter (un ? devant la case)',
			settings: [
				{
					key: 'domain: …, ?valeur, …',
					values: 'une valeur de x : ?-3, ?{{r}}, ]?3[',
					defaultValue: 'aucune',
					description:
						'L’élève écrit la valeur de x. Les clés des lignes gardent la vraie valeur (-inf,-3). -inf et +inf ne se cachent pas.'
				},
				{
					key: 'a,b: ?signe',
					values: '?+ | ?-',
					defaultValue: 'aucune',
					description: 'Dans une ligne « sign » : l’élève écrit le signe sur l’intervalle.'
				},
				{
					key: 'a: ?marqueur',
					values: '?z (ou ?0) | ?|| | ?rien',
					defaultValue: 'aucune',
					description:
						'Dans une ligne « sign » : l’élève écrit ce qui se passe en a. ?rien = ni zéro ni double barre (la bonne réponse est de ne rien mettre).'
				},
				{
					key: 'a: ?valeur, position',
					values: 'position : top | bottom | center',
					defaultValue: 'aucune',
					description:
						'Dans une ligne « variation » : l’élève écrit la valeur de f en a (-2: ?4, top). Ni un infini ni une limite autour de || ne se cachent.'
				},
				{
					key: 'a,b: ?flèche',
					values: '?flèche (ou ?fleche)',
					defaultValue: 'aucune',
					description:
						'Dans une ligne « variation », entre deux valeurs voisines du domaine : l’élève choisit ↗ ou ↘. La réponse se lit sur les positions écrites : l’une en haut, l’autre en bas.'
				},
				{
					key: '??1, ??2…',
					values: 'ne pas écrire',
					defaultValue: 'aucune',
					description:
						'Posé par Chiphre dans l’énoncé d’une évaluation notée, à la place des valeurs de x cachées, pour que l’énoncé ne dise pas la réponse. Écrit à la main, la case n’a pas de réponse attendue : écrire ?-3.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Signe d’une fonction affine',
			source: fence(
				'variation',
				'variable: x',
				'domain: -inf, 2, +inf',
				'',
				'sign: 2x-4',
				'  -inf,2: -',
				'  2: z',
				'  2,+inf: +'
			),
			explanation:
				'Deux intervalles et un zéro. Les clés (-inf,2 et 2) reprennent les valeurs du domaine.'
		},
		{
			title: 'Signe d’un produit',
			source: fence(
				'variation',
				'variable: x',
				'domain: -inf, -3, 1, +inf',
				'',
				'sign: x+3',
				'  -inf,-3: -',
				'  -3: z',
				'  -3,1: +',
				'  1,+inf: +',
				'',
				'sign: x-1',
				'  -inf,-3: -',
				'  -3,1: -',
				'  1: z',
				'  1,+inf: +',
				'',
				'sign: (x+3)(x-1)',
				'  -inf,-3: +',
				'  -3: z',
				'  -3,1: -',
				'  1: z',
				'  1,+inf: +'
			),
			explanation:
				'Une ligne par facteur, puis la ligne du produit. Une ligne vide sépare les lignes.'
		},
		{
			title: 'Variations d’un polynôme du second degré',
			source: fence(
				'variation',
				'variable: x',
				'domain: -inf, 2, +inf',
				'',
				'variation: f(x)',
				'  2: -1, bottom'
			),
			explanation:
				'f(x) = x² − 4x + 3 a pour minimum −1 en 2. Les extrémités sont complétées toutes seules : en haut autour d’un minimum, en bas autour d’un maximum.'
		},
		{
			title: 'Signe de la dérivée et variations',
			source: fence(
				'variation',
				'variable: x',
				'domain: -inf, -1, 3, +inf',
				'',
				"sign: f'(x)",
				'  -inf,-1: +',
				'  -1: z',
				'  -1,3: -',
				'  3: z',
				'  3,+inf: +',
				'',
				'variation: f(x)',
				'  -inf: -inf, bottom',
				'  -1: 4, top',
				'  3: -12, bottom',
				'  +inf: +inf, top'
			),
			explanation: 'Les deux types de lignes se mélangent dans un même tableau.'
		},
		{
			title: 'Valeur interdite dans un tableau de signes',
			source: fence(
				'variation',
				'variable: x',
				'domain: -inf, 1, +inf',
				'',
				'sign: 1/(x-1)',
				'  -inf,1: -',
				'  1: |h|',
				'  1,+inf: +'
			),
			explanation: '|h| dessine la double barre de la valeur interdite.'
		},
		{
			title: 'Fonction inverse avec limites en 0',
			source: fence(
				'variation',
				'variable: x',
				'domain: -inf, 0, +inf',
				'',
				'variation: f(x)',
				'  -inf: 0, top',
				'  0: ||, -inf, bottom, +inf, top',
				'  +inf: 0, bottom'
			),
			explanation:
				'Après « || », la limite à gauche de 0 puis la limite à droite, chacune avec sa position.'
		},
		{
			title: 'Tableau de signes à compléter (question)',
			source: fence(
				'variation',
				'variable: x',
				'domain: -inf, ?2, +inf',
				'',
				'sign: 2x-4',
				'  -inf,2: ?-',
				'  2: ?z',
				'  2,+inf: ?+'
			),
			explanation:
				'Le tableau est écrit juste ; chaque ? fait une case vide. Les clés gardent la vraie valeur 2. Les cases sont numérotées dans l’ordre de lecture : domaine, puis chaque ligne de gauche à droite.'
		},
		{
			title: 'Tableau de variations à compléter (question)',
			source: fence(
				'variation',
				'variable: x',
				'domain: -inf, -1, 3, +inf',
				'',
				'variation: f(x)',
				'  -inf: -inf, bottom',
				'  -1: ?4, top',
				'  -1,3: ?flèche',
				'  3: -12, bottom',
				'  +inf: +inf, top'
			),
			explanation:
				'L’élève écrit le maximum 4 et choisit la flèche entre −1 et 3 (↘, lue sur les positions top puis bottom). Sur la fiche PDF, aucune flèche du tableau n’est dessinée dès qu’une flèche est cachée.'
		}
	],
	mistakes: [
		{
			title: 'Virgule décimale dans une valeur',
			source: fence(
				'variation',
				'variable: x',
				'domain: -inf, 2, +inf',
				'',
				'variation: f(x)',
				'  2: 5,5, bottom'
			),
			explanation:
				'La virgule sépare les valeurs : la case est refusée sans message et la colonne de 2 reste vide dans le tableau. Écrire 11/2 (ou \\frac{11}{2}) à la place de 5,5. Même effet pour un signe inconnu (plus au lieu de +) ou une position inconnue (milieu au lieu de center).'
		},
		{
			title: 'Domaine oublié',
			source: fence('variation', 'variable: x', '', 'sign: f(x)', '  0,1: +'),
			explanation:
				'Sans « domain: », le bloc n’est pas un tableau : le prof voit le texte du bloc dans un cadre de code, sans message. Ajouter la ligne « domain: » (ou « variable: » si c’est elle qui manque).'
		},
		{
			title: 'Infini caché',
			source: fence(
				'variation',
				'variable: x',
				'domain: -inf, 2, ?+inf',
				'',
				'sign: 2x-4',
				'  -inf,2: -',
				'  2: z',
				'  2,+inf: +'
			),
			explanation:
				'Un infini n’est pas une valeur à calculer : le bloc est refusé et le prof voit son texte dans un cadre de code. Retirer le ? devant +inf. Même effet pour un ? sur une marque || d’une ligne « variation », ou une flèche cachée entre deux valeurs à la même hauteur.'
		}
	],
	tryIt: fence(
		'variation',
		'variable: x',
		'domain: -inf, 1, +inf',
		'',
		'sign: f(x)',
		'  -inf,1: -',
		'  1: z',
		'  1,+inf: +',
		'',
		'variation: f(x)',
		'  1: -2, bottom'
	)
};
