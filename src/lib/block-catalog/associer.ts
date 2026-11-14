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
		'Des éléments à gauche, des étiquettes à droite : l’élève pose sur chaque élément l’étiquette qui lui correspond (formule ↔ nom, situation ↔ type de suite).',
	intro:
		'Écrivez chaque élément avec sa bonne étiquette, séparés par « -> ». L’élève voit les éléments dans l’ordre écrit, et au-dessus les étiquettes mélangées, chacune une fois. Il les pose au doigt ou à la souris : en les glissant, ou en touchant l’étiquette puis la place. Une étiquette reste disponible : elle peut servir à plusieurs éléments. Il est jugé élément par élément (note partielle), sur l’étiquette posée. Sur la fiche PDF, deux colonnes à relier au crayon.',
	settingGroups: [
		{
			settings: [
				{
					key: '- élément -> étiquette',
					values: '2 à 8 éléments (texte, formule $…$, variable)',
					defaultValue: null,
					description:
						'Un élément par ligne, avec sa bonne étiquette. Deux éléments peuvent avoir la même étiquette (classement) : elle n’est montrée qu’une fois. Deux éléments au même texte sont refusés ; avec des variables, un tirage qui les rend identiques est refait.'
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
				'Une correspondance un à un. La consigne (« Associe chaque formule à son nom. ») va dans l’énoncé, au-dessus. Essayez : glissez les étiquettes sur les places.'
		},
		{
			title: 'Classer des situations',
			source: fence(
				'associer',
				'- Un capital augmente de 3 % par an -> géométrique',
				'- On ajoute 50 € chaque mois -> arithmétique',
				'- Une population diminue de moitié chaque année -> géométrique',
				'- On retire 2 L chaque jour -> arithmétique',
				'- -> ni l’une ni l’autre'
			),
			explanation:
				'La même étiquette sert à plusieurs éléments. L’intrus « ni l’une ni l’autre » empêche de répondre au hasard entre deux étiquettes.'
		}
	],
	mistakes: [
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
