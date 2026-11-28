/**
 * Catalogue — bloc ```calcul (programme de calcul en blocs, 5e / 4e / 3e, chantier `blockly`)
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
		'L’élève assemble un programme de calcul en blocs (nombre choisi, + − × ÷, résultat, afficher, répéter ; en 4e et 3e, variables, « si », comparaisons, et / ou / non, « répéter jusqu’à ») et l’essaie sur les nombres qu’il veut ; il est jugé sur ce que son programme affiche, pas sur son écriture.',
	intro:
		'Écrivez le programme de référence en texte, dans attendu: . L’élève assemble ses blocs, tape un nombre dans « Essayer avec », appuie sur « Lancer » autant de fois qu’il veut pour voir ce que son programme affiche, puis valide. Les deux programmes sont rejoués sur chaque nombre d’essai : la réponse est juste s’ils affichent les mêmes nombres, dans le même ordre (« afficher nombre × 4 + 8 » est juste pour « afficher (nombre + 2) × 4 »). Instructions : afficher <calcul>, résultat = <calcul> (une seule variable, résultat, qui vaut 0 au départ), répéter n [ … ], séparées par « ; ». Calculs : des nombres, nombre (le nombre choisi), résultat, + − × ÷ et des parenthèses. Avec niveau: 4e, l’élève crée ses variables (mettre x à <calcul>, ajouter <calcul> à x), utilise si <condition> alors [ … ] sinon [ … ], les comparaisons = ≠ < > ≤ ≥, reste de a par b et répéter <calcul> [ … ] ; avec niveau: 3e, aussi et, ou, non (…) et répéter jusqu’à <condition> [ … ]. La consigne (« Écris un programme qui ajoute 2 au nombre choisi, puis multiplie par 4. ») va dans l’énoncé, au-dessus. Sur la fiche PDF : « À faire sur Chiphre ».',
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
					key: 'niveau',
					values: '5e, 4e ou 3e',
					defaultValue: '5e',
					description:
						'Les blocs proposés à l’élève, et les seuls admis : 4e ajoute les variables qu’il crée, « si … alors (sinon) », les comparaisons, le reste de la division et la répétition à nombre de tours calculé (sans la variable résultat) ; 3e ajoute et / ou / non et « répéter jusqu’à ». attendu: et départ: doivent tenir dans le niveau. Chaque « si » de attendu: doit être vrai et faux au moins une fois sur les essais.'
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
		},
		{
			title: 'Une condition (4e)',
			source: fence(
				'calcul',
				'attendu: mettre x à nombre × 2 ; si x > 10 alors [ afficher x − 10 ] sinon [ afficher x ]',
				'niveau: 4e'
			),
			explanation:
				'L’élève crée la variable x, puis choisit quoi afficher selon sa valeur (avec 7 : 4 ; avec 3 : 6). Les essais par défaut passent par les deux branches.'
		},
		{
			title: 'Répéter jusqu’à (3e)',
			source: fence(
				'calcul',
				'attendu: mettre x à nombre ; répéter jusqu’à x > 100 [ mettre x à x × 2 ] ; afficher x',
				'essais: 1 ; 7 ; 30 ; 150',
				'niveau: 3e'
			),
			explanation:
				'Le nombre est doublé jusqu’à dépasser 100. Les essais sont positifs : en partant de 0 ou d’un nombre négatif, le programme ne s’arrêterait pas.'
		}
	],
	mistakes: [
		{
			title: 'Bloc au-dessus du niveau',
			source: fence('calcul', 'attendu: mettre x à nombre × 2 ; afficher x + 1'),
			message: 'est un bloc de 4e (ajouter niveau: 4e)',
			explanation:
				'Sans niveau:, la question est de 5e : pas de variable créée par l’élève. Ajoutez niveau: 4e, ou utilisez résultat.'
		},
		{
			title: 'Une branche jamais parcourue',
			source: fence(
				'calcul',
				'attendu: si nombre > 100 alors [ afficher 1 ] sinon [ afficher 0 ]',
				'niveau: 4e'
			),
			message: 'n’est jamais vrai sur les essais',
			explanation:
				'Aucun essai ne dépasse 100 : un élève qui affiche toujours 0 serait jugé juste. Ajoutez à essais: un nombre plus grand que 100.'
		},
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
