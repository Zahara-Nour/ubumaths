/**
 * Catalogue — bloc ```scratch (programme en blocs Scratch)
 *
 * Lecture : `src/lib/ubumark/parser/scratch-parser.ts` ; instructions
 * reconnues : `src/lib/ubumark/utils/scratch-check.ts` (syntaxe des
 * `scratchblocks`, en français).
 *
 * @module block-catalog/scratch
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const scratchEntry: BlockCatalogEntry = {
	slug: 'scratch',
	title: 'Programme Scratch',
	fences: ['scratch'],
	nodeType: 'scratch',
	summary: 'Un programme dessiné en blocs Scratch, écrit en texte, une instruction par ligne.',
	intro:
		'Écris les instructions comme sur les blocs de Scratch, en français, une par ligne. Les nombres et les textes vont entre parenthèses (5) ou crochets [Bonjour], une variable entre parenthèses (a), le nom d’une variable à modifier entre crochets avec v : [a v]. Une condition va entre chevrons <(a) > [3]>. Une boucle ou un « si » se ferme par la ligne fin. Une ligne vide sépare deux scripts.',
	settingsKind: 'instructions',
	settingGroups: [
		{
			settings: [
				{
					key: 'quand le drapeau vert pressé',
					values: 'en tête de script',
					defaultValue: 'facultatif',
					description: 'Le chapeau du programme principal.'
				},
				{
					key: 'mettre [a v] à (5) · ajouter (1) à [a v]',
					values: 'nom de variable libre',
					defaultValue: null,
					description: 'Donner une valeur à une variable, ou l’augmenter.'
				},
				{
					key: 'demander [Ton âge ?] et attendre · (réponse)',
					values: 'texte entre crochets',
					defaultValue: null,
					description: 'Faire saisir un nombre ; (réponse) est le nombre saisi.'
				},
				{
					key: 'dire (a) · dire [Bonjour]',
					values: 'variable ou texte',
					defaultValue: null,
					description: 'Ce que le lutin affiche.'
				},
				{
					key: 'si <…> alors · sinon · fin',
					values: 'une condition entre chevrons',
					defaultValue: null,
					description: 'Instruction conditionnelle ; « sinon » est facultatif.'
				},
				{
					key: '<<…> et <…>> · <<…> ou <…>>',
					values: 'deux conditions',
					defaultValue: null,
					description: 'Condition composée.'
				},
				{
					key: 'répéter (4) fois · répéter jusqu’à ce que <…> · fin',
					values: 'nombre de tours, ou condition d’arrêt',
					defaultValue: null,
					description: 'Boucles ; chacune se ferme par fin.'
				},
				{
					key: 'définir dessine carré (côté)',
					values: 'nom et paramètres libres',
					defaultValue: null,
					description:
						'Bloc personnalisé, défini dans le même bloc que le script qui l’appelle : dessine carré (10).'
				}
			]
		}
	],
	examples: [
		{
			title: 'Plusieurs variables',
			source: fence(
				'scratch',
				'quand le drapeau vert pressé',
				'mettre [a v] à (5)',
				'mettre [b v] à (3)',
				'mettre [a v] à ((a) + (b))',
				'mettre [b v] à ((a) - (b))',
				'dire (b)'
			),
			explanation: 'Les calculs s’imbriquent comme dans Scratch : ((a) + (b)).'
		},
		{
			title: 'Condition composée',
			source: fence(
				'scratch',
				'demander [Quel âge as-tu ?] et attendre',
				'si <<(réponse) > [11]> et <(réponse) < [16]>> alors',
				'dire [Tu es au collège]',
				'sinon',
				'dire [Tu n’es pas au collège]',
				'fin'
			),
			explanation: 'Les deux conditions et le « et » qui les relie sont chacun entre chevrons.'
		},
		{
			title: 'Boucle « répéter jusqu’à ce que »',
			source: fence(
				'scratch',
				'quand le drapeau vert pressé',
				'demander [Quel est le nombre à diviser ?] et attendre',
				'mettre [reste v] à (réponse)',
				'demander [Quel est le diviseur ?] et attendre',
				"répéter jusqu'à ce que <(reste) < (réponse)>",
				'mettre [reste v] à ((reste) - (réponse))',
				'fin',
				'dire (reste)'
			),
			explanation:
				'Le reste d’une division par soustractions successives (exemples 2026 du cycle 4).'
		},
		{
			title: 'Bloc personnalisé',
			source: fence(
				'scratch',
				'définir dessine carré (côté)',
				'répéter (4) fois',
				'avancer de (côté) pas',
				'tourner ↻ de (90) degrés',
				'fin',
				'',
				'quand le drapeau vert pressé',
				'mettre [i v] à (0)',
				"répéter jusqu'à ce que <(i) > [50]>",
				'ajouter (5) à [i v]',
				'dessine carré (i)',
				'fin'
			),
			explanation: 'La définition et le script qui l’appelle, séparés par une ligne vide.'
		}
	],
	mistakes: [
		{
			title: 'Instruction mal écrite',
			source: fence('scratch', 'mettre a à 5', 'dire (a)'),
			message: 'instruction « mettre a à 5 » non reconnue',
			explanation:
				'Le nom de la variable va entre crochets avec v, la valeur entre parenthèses : mettre [a v] à (5).'
		},
		{
			title: 'Programme en anglais',
			source: fence('scratch', 'say [Hello]'),
			message: 'instruction « say [Hello] » non reconnue',
			explanation:
				'Les instructions s’écrivent en français, comme sur les blocs de Scratch en français.'
		},
		{
			title: 'Un fin de trop',
			source: fence('scratch', 'répéter (3) fois', 'dire [Bonjour]', 'fin', 'fin'),
			message: '« fin » en trop',
			explanation: 'Chaque boucle et chaque « si » se ferment par un seul fin.'
		}
	],
	tryIt: fence(
		'scratch',
		'quand le drapeau vert pressé',
		'mettre [a v] à (5)',
		"répéter jusqu'à ce que <(a) > [20]>",
		'mettre [a v] à ((a) * (2))',
		'fin',
		'dire (a)'
	)
};
