/**
 * Catalogue — bloc ```python-a-ecrire (programme Python exécuté, outil 49, chantier `outil-python`)
 *
 * Réglages : `src/lib/ubumark/parser/python-a-ecrire-parser.ts` ; juge (dans le navigateur) :
 * `src/lib/questions/python/judge-python-case.ts`.
 *
 * @module block-catalog/python-a-ecrire
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

const SEUIL = [
	'fonction: seuil',
	'depart: |',
	'  def seuil(A):',
	'      u = 2',
	'      n = 0',
	'      while ...:',
	'          ...',
	'      return n',
	'solution: |',
	'  def seuil(A):',
	'      u = 2',
	'      n = 0',
	'      while u <= A:',
	'          u = 1.5 * u',
	'          n = n + 1',
	'      return n',
	'essais: seuil(2) ; seuil(100) ; seuil(10000)',
	'exiger: boucle'
];

export const pythonAEcrireEntry: BlockCatalogEntry = {
	slug: 'python-a-ecrire',
	title: 'Programme Python à écrire',
	fences: ['python-a-ecrire'],
	nodeType: 'python-a-ecrire',
	summary:
		'L’élève écrit une fonction Python dans un éditeur de code ; à « Valider », son programme tourne dans son navigateur et sa fonction est comparée à la vôtre sur chaque essai. Entraînement seulement : jamais dans un contrôle noté.',
	intro:
		'Écrivez votre solution dans solution: (en retrait, sous « solution: | ») et les appels à essayer dans essais:, séparés par « ; ». Vous n’écrivez pas les résultats attendus : votre solution les calcule, avec les nombres tirés ({{u0}} est remplacé comme partout). L’élève part de depart: (librement modifiable). Au premier essai raté, il voit « seuil(2) : ta fonction rend 0, on attendait 1. » ; une erreur de syntaxe donne sa ligne ; une boucle sans fin est arrêtée au bout de 5 secondes. La question se fait à l’écran : elle n’entre pas dans un contrôle noté (corrigé par le serveur, qui ne fait pas tourner Python), et la fiche PDF n’imprime que le départ.',
	settingGroups: [
		{
			settings: [
				{
					key: 'fonction',
					values: 'un nom de fonction Python',
					defaultValue: null,
					description: 'Le nom de la fonction que l’élève doit écrire.'
				},
				{
					key: 'solution',
					values: 'un programme Python, en retrait sous « solution: | »',
					defaultValue: null,
					description:
						'Votre programme : il doit définir la fonction. Il calcule les résultats attendus de chaque essai. Il part au navigateur de l’élève (entraînement seulement).'
				},
				{
					key: 'essais',
					values: '1 à 20 appels de la fonction, séparés par « ; »',
					defaultValue: null,
					description:
						'Les appels sur lesquels les deux fonctions sont comparées, dans l’ordre ; l’élève voit le premier raté. Prévoyez un cas du bord (seuil(2) quand u₀ = 2) : un seul essai ne suffit pas.'
				},
				{
					key: 'depart',
					values: 'un programme Python, en retrait sous « depart: | »',
					defaultValue: 'éditeur vide',
					description:
						'Le programme posé dans l’éditeur de l’élève, qu’il complète ou modifie librement.'
				},
				{
					key: 'exiger',
					values: 'boucle, sans print (séparées par « , »)',
					defaultValue: 'aucune',
					description:
						'Exigences sur le code : « boucle » refuse une fonction sans while ni for, « sans print » refuse print (le résultat se rend avec return).'
				}
			]
		}
	],
	examples: [
		{
			title: 'Fonction seuil d’une suite géométrique',
			source: fence('python-a-ecrire', ...SEUIL),
			explanation:
				'Avec A = 2, il faut un tour de boucle : l’élève qui rend 0 voit « seuil(2) : ta fonction rend 0, on attendait 1. ».'
		},
		{
			title: 'Sans départ, sans exigence',
			source: fence(
				'python-a-ecrire',
				'fonction: aire',
				'solution: |',
				'  def aire(r):',
				'      return 3.14 * r * r',
				'essais: aire(1) ; aire(2.5)'
			),
			explanation: 'L’éditeur de l’élève est vide : il écrit toute la fonction.'
		}
	],
	mistakes: [
		{
			title: 'Essais oubliés',
			source: fence(
				'python-a-ecrire',
				'fonction: f',
				'solution: |',
				'  def f(x):',
				'      return x'
			),
			message: 'il manque la ligne essais:',
			explanation: 'Sans essais, rien ne compare la fonction de l’élève à la vôtre.'
		},
		{
			title: 'Un essai qui n’appelle pas la fonction',
			source: fence(
				'python-a-ecrire',
				'fonction: f',
				'solution: |',
				'  def f(x):',
				'      return x',
				'essais: f(1) ; g(2)'
			),
			message: 'n’appelle pas la fonction f',
			explanation: 'Chaque essai est un appel de la fonction à écrire : f(2), pas g(2).'
		},
		{
			title: 'Solution qui ne définit pas la fonction',
			source: fence(
				'python-a-ecrire',
				'fonction: seuil',
				'solution: |',
				'  def rang(A):',
				'      return 1',
				'essais: seuil(2)'
			),
			message: 'la solution ne définit pas la fonction seuil',
			explanation: 'Le nom de fonction: et celui du def de la solution doivent être les mêmes.'
		}
	],
	tryIt: fence('python-a-ecrire', ...SEUIL)
};
