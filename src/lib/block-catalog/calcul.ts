/**
 * Catalogue — bloc ```calcul (programme de calcul en blocs, 5e, chantier `blockly`)
 *
 * Réglages : `src/lib/ubumark/parser/calcul-parser.ts` ; notation des programmes :
 * `src/lib/shared/blockly/calcul/notation.ts`.
 *
 * @module block-catalog/calcul
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const calculEntry: BlockCatalogEntry = {
	slug: 'calcul',
	title: 'Programme de calcul',
	fences: ['calcul'],
	nodeType: 'calcul',
	summary:
		'L’élève assemble un programme de calcul en blocs (nombre choisi, + − × ÷, résultat, afficher, répéter) et l’essaie sur les nombres qu’il veut ; il est jugé sur ce que son programme affiche, pas sur son écriture.',
	intro:
		'Écrivez le programme de référence en texte, dans attendu: . L’élève assemble ses blocs, tape un nombre dans « Essayer avec », appuie sur « Lancer » autant de fois qu’il veut pour voir ce que son programme affiche, puis valide. Les deux programmes sont rejoués sur chaque nombre d’essai : la réponse est juste s’ils affichent les mêmes nombres, dans le même ordre (« afficher nombre × 4 + 8 » est juste pour « afficher (nombre + 2) × 4 »). Instructions : afficher <calcul>, résultat = <calcul> (une seule variable, résultat, qui vaut 0 au départ), répéter n [ … ], séparées par « ; ». Calculs : des nombres, nombre (le nombre choisi), résultat, + − × ÷ et des parenthèses. La consigne (« Écris un programme qui ajoute 2 au nombre choisi, puis multiplie par 4. ») va dans l’énoncé, au-dessus. Sur la fiche PDF : « À faire sur Chiphre ».',
	settingGroups: [
		{
			settings: [
				{
					key: 'attendu',
					values: 'un programme (notation texte, variables admises)',
					defaultValue: null,
					description:
						'Le programme de référence. Il doit se lire, et afficher quelque chose pour chaque nombre d’essai : sinon la question est refusée à la publication. Il n’est jamais envoyé à l’élève pendant une évaluation notée.'
				},
				{
					key: 'essais',
					values: '1 à 20 nombres, séparés par « ; »',
					defaultValue: '−3 ; 0 ; 1 ; 2 ; 5 ; 10 ; 0,5',
					description:
						'Les nombres sur lesquels les deux programmes sont rejoués. Un seul ne suffit pas : en partant de 2, « × 2 » et « + 2 » donnent tous deux 4.'
				},
				{
					key: 'départ',
					values: 'un programme (notation texte)',
					defaultValue: 'aucun',
					description:
						'Un programme posé d’avance dans l’espace de travail de l’élève, à modifier. Tant qu’il n’y touche pas, il n’a pas répondu.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Ajouter puis multiplier',
			source: fence('calcul', 'attendu: afficher (nombre + 2) × 4'),
			explanation:
				'« afficher nombre × 4 + 8 » est juste aussi ; « afficher nombre + 2 × 4 » est faux (la multiplication passe d’abord).'
		},
		{
			title: 'En deux étapes, avec résultat',
			source: fence(
				'calcul',
				'attendu: mettre résultat à nombre − 5 ; mettre résultat à résultat × résultat ; afficher résultat'
			),
			explanation:
				'L’élève range chaque étape dans résultat avant de l’afficher. Un programme qui affiche directement (nombre − 5) × (nombre − 5) est juste aussi.'
		},
		{
			title: 'Un programme à corriger',
			source: fence(
				'calcul',
				'attendu: afficher nombre × 3 − 1',
				'départ: afficher nombre × 3 + 1',
				'essais: 0 ; 1 ; 4 ; 2,5'
			),
			explanation:
				'Le programme de départ est posé dans l’espace de travail : l’élève change l’opération au lieu de tout refaire.'
		}
	],
	mistakes: [
		{
			title: 'Programme de référence oublié',
			source: fence('calcul', 'essais: 1 ; 2'),
			message: 'il manque la ligne attendu:',
			explanation: 'Sans programme de référence, rien ne dit ce qu’il faut afficher.'
		},
		{
			title: 'Rien d’affiché',
			source: fence('calcul', 'attendu: mettre résultat à nombre × 2'),
			message: 'ce programme n’affiche rien',
			explanation:
				'Le programme calcule mais n’affiche rien : il faut un bloc afficher, sinon il n’y a rien à comparer.'
		},
		{
			title: 'Division par zéro sur un essai',
			source: fence('calcul', 'attendu: afficher nombre ÷ (nombre − 2)', 'essais: 0 ; 2'),
			message: 'Division par zéro',
			explanation: 'Avec 2, on diviserait par 0 : retirez ce nombre des essais.'
		}
	],
	tryIt: fence('calcul', 'attendu: afficher (nombre + 2) × 4')
};
