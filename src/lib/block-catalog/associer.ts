/**
 * Catalogue — bloc ```associer (associer deux colonnes)
 *
 * Réglages : `src/lib/ubumark/parser/associer-parser.ts`.
 *
 * @module block-catalog/associer
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const associerEntry: BlockCatalogEntry = {
	slug: 'associer',
	title: 'Associer deux colonnes',
	fences: ['associer'],
	nodeType: 'associer',
	summary:
		'Des éléments à gauche, des étiquettes à droite : l’élève relie chaque élément à l’étiquette qui lui correspond (formule ↔ nom, situation ↔ type de suite).',
	intro:
		'Écrivez chaque élément avec sa bonne étiquette, séparés par « -> ». L’élève voit les éléments à gauche dans l’ordre écrit, et à droite les étiquettes mélangées, chacune une fois. Il trace un trait d’un point à l’autre, au doigt ou à la souris : en glissant, ou en touchant un point puis l’autre ; toucher un trait l’efface. Une étiquette peut recevoir plusieurs traits. Avec « geste: étiquettes », il pose plutôt les étiquettes sur une place à côté de chaque élément. Il est jugé élément par élément (note partielle). Sur la fiche PDF, deux colonnes à relier au crayon.',
	settingGroups: [
		{
			settings: [
				{
					key: 'geste',
					values: 'relier, étiquettes',
					defaultValue: 'relier',
					description:
						'relier : un trait de chaque élément vers son étiquette. étiquettes : l’élève pose une étiquette sur la place de chaque élément, mieux pour un classement en peu d’étiquettes ou des éléments longs (beaucoup de traits se croiseraient). Le jugement, le corrigé et la fiche PDF sont les mêmes.'
				},
				{
					key: '- élément -> étiquette',
					values: '2 à 8 éléments (texte, formule $…$, variable)',
					defaultValue: null,
					description:
						'Un élément par ligne, avec sa bonne étiquette. Deux éléments peuvent avoir la même étiquette (classement) : elle n’est montrée qu’une fois. Deux éléments au même texte sont refusés ; avec des variables, un tirage qui les rend identiques est refait.'
				},
				{
					key: '- puis un bloc ```courbe en retrait',
					values: '2 à 6 éléments à courbe',
					defaultValue: null,
					description:
						'Un élément peut être une courbe : après « - », le bloc ```courbe décalé de 2 espaces, puis « -> étiquette » sur la dernière ligne, décalée aussi. Le bloc associer s’ouvre alors par ````associer et se ferme par ```` (quatre accents graves). Les courbes vont à gauche seulement, sans placer: ni tracer:. Sur la fiche PDF, les éléments sont numérotés.'
				},
				{
					key: '- -> étiquette',
					values: 'intrus',
					defaultValue: null,
					description:
						'Une étiquette qui ne va avec aucun élément. Il faut au moins 3 étiquettes différentes en tout (sinon la réponse se devine), au plus 10.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Formule ↔ nom',
			source: fence(
				'associer',
				'- $u_{n+1}=u_n+r$ -> suite arithmétique',
				'- $u_{n+1}=q\\,u_n$ -> suite géométrique',
				'- $u_n=u_0+nr$ -> terme général arithmétique',
				'- $u_n=u_0\\,q^n$ -> terme général géométrique'
			),
			explanation:
				'Une correspondance un à un. La consigne (« Associe chaque formule à son nom. ») va dans l’énoncé, au-dessus. Essayez : reliez chaque formule à son nom.'
		},
		{
			title: 'Classer des situations',
			source: fence(
				'associer',
				'geste: étiquettes',
				'- Un capital augmente de 3 % par an -> géométrique',
				'- On ajoute 50 € chaque mois -> arithmétique',
				'- Une population diminue de moitié chaque année -> géométrique',
				'- On retire 2 L chaque jour -> arithmétique',
				'- -> ni l’une ni l’autre'
			),
			explanation:
				'La même étiquette sert à plusieurs éléments. Avec « geste: étiquettes », l’élève pose l’étiquette à côté de chaque situation : pas de traits qui se croisent. L’intrus « ni l’une ni l’autre » empêche de répondre au hasard entre deux étiquettes.'
		},
		{
			title: 'Courbe ↔ expression',
			source: [
				'````associer',
				'- ```courbe',
				'  x: -3 ; 3',
				'  y: -3 ; 3',
				'  f(x) = 2*x - 1',
				'  ```',
				'  -> $x \\mapsto 2x - 1$',
				'- ```courbe',
				'  x: -3 ; 3',
				'  y: -3 ; 3',
				'  f(x) = -x + 2',
				'  ```',
				'  -> $x \\mapsto -x + 2$',
				'- ```courbe',
				'  x: -3 ; 3',
				'  y: -3 ; 3',
				'  f(x) = x^2 - 2',
				'  ```',
				'  -> $x \\mapsto x^2 - 2$',
				'- -> $x \\mapsto x + 2$',
				'````'
			].join('\n'),
			explanation:
				'Chaque élément est une courbe, en retrait sous son « - », et son étiquette vient en dernière ligne, en retrait. Quatre accents graves autour du bloc associer. L’intrus « $x \\mapsto x + 2$ » oblige à lire la pente et l’ordonnée à l’origine.'
		}
	],
	mistakes: [
		{
			title: 'Courbe dans un bloc fermé par ```',
			source: [
				'```associer',
				'- ```courbe',
				'  x: -3 ; 3',
				'  y: -3 ; 3',
				'  f(x) = 2*x',
				'  ```',
				'  -> linéaire',
				'- $x^2$ -> carré',
				'- -> constante',
				'```'
			].join('\n'),
			message: 'ouvrir par ````associer et fermer par ````',
			explanation:
				'Un élément contient un bloc : le bloc associer prend quatre accents graves, pour qu’on voie où il finit.'
		},
		{
			title: 'Élément sans étiquette',
			source: fence('associer', '- a -> 1', '- b', '- -> 3'),
			message: 'écrire « - élément -> étiquette »',
			explanation: 'Chaque élément porte sa bonne étiquette après « -> ».'
		},
		{
			title: 'Deux étiquettes seulement',
			source: fence('associer', '- 4 -> pair', '- 7 -> impair'),
			message: 'au moins 3 étiquettes différentes',
			explanation: 'À deux étiquettes, l’élève devinerait : ajoutez un intrus, « - -> premier ».'
		},
		{
			title: 'Deux éléments identiques',
			source: fence('associer', '- 3 -> impair', '- 3 -> premier', '- -> pair'),
			message: 'les éléments 1 et 2 sont identiques',
			explanation: 'On ne saurait pas lequel va où : chaque élément doit être différent.'
		}
	],
	tryIt: fence(
		'associer',
		'- $2x+1$ -> affine',
		'- $x^2$ -> carré',
		'- $\\frac{1}{x}$ -> inverse',
		'- -> racine carrée'
	)
};
