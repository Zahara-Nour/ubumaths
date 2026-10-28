/**
 * Catalogue — bloc ```ranger (étiquettes à ranger)
 *
 * Réglages : `src/lib/ubumark/parser/ranger-parser.ts`.
 *
 * @module block-catalog/ranger
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const rangerEntry: BlockCatalogEntry = {
	slug: 'ranger',
	title: 'Étiquettes à ranger',
	fences: ['ranger'],
	nodeType: 'ranger',
	summary:
		'Des nombres (ou des mots) sur des étiquettes : l’élève les range dans l’ordre croissant ou décroissant.',
	intro:
		'Écrivez les étiquettes dans le BON ordre, une par ligne. L’élève les voit mélangées (jamais déjà rangées, ni à l’envers) et les pose sur les places, au doigt ou à la souris : en les glissant, ou en touchant l’étiquette puis la place. Une place prise : les deux étiquettes s’échangent. Il ne recopie rien : il est jugé sur l’étiquette posée, une place à la fois (note partielle). Sur la fiche PDF, les étiquettes puis les places vides : l’enfant écrit.',
	settingGroups: [
		{
			settings: [
				{
					key: '- …',
					values: '2 à 8 lignes, une étiquette par ligne (texte, formule $…$, variable)',
					defaultValue: null,
					description:
						'Dans le bon ordre. Deux étiquettes au même texte sont refusées (laquelle irait où ?).'
				},
				{
					key: 'signe',
					values: '< | >',
					defaultValue: '<',
					description: '< : du plus petit au plus grand ; > : du plus grand au plus petit.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Ordre croissant',
			source: fence('ranger', '- $\\frac{2}{7}$', '- $\\frac{3}{7}$', '- $\\frac{6}{7}$'),
			explanation:
				'La consigne (« Range ces nombres dans l’ordre croissant. ») va dans l’énoncé, au-dessus. Essayez : glissez les étiquettes sur les places.'
		},
		{
			title: 'Ordre décroissant',
			source: fence('ranger', 'signe: >', '- 1 200', '- 1 020', '- 1 002', '- 120'),
			explanation: 'Toujours écrites dans le bon ordre : ici du plus grand au plus petit.'
		},
		{
			title: 'Deux écritures d’un nombre',
			source: fence('ranger', '- $1$', '- $1+\\frac{1}{4}$', '- $\\frac{7}{4}$', '- $2$'),
			explanation:
				'L’élève pose l’étiquette, il ne la recopie pas : 1 + 1/4 reste un nombre mixte. Évitez deux valeurs égales (1/2 et 2/4) : l’outil ne calcule pas.'
		}
	],
	mistakes: [
		{
			title: 'Deux étiquettes identiques',
			source: fence('ranger', '- 3', '- 5', '- 3'),
			message: 'les étiquettes 1 et 3 sont identiques',
			explanation: 'On ne saurait pas laquelle va où : chaque étiquette doit être différente.'
		},
		{
			title: 'Une seule étiquette',
			source: fence('ranger', '- 12'),
			message: 'au moins 2 étiquettes',
			explanation: 'Il faut au moins deux étiquettes à ranger.'
		},
		{
			title: 'Signe inconnu',
			source: fence('ranger', 'signe: ≤', '- 1', '- 2'),
			message: 'signe: écrire < (croissant) ou > (décroissant)',
			explanation: 'Seuls < et > sont compris.'
		}
	],
	tryIt: fence('ranger', '- 0,25', '- 0,3', '- 0,45', '- 1,2')
};
