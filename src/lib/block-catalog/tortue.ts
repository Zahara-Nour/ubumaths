/**
 * Catalogue — bloc ```tortue (programme tortue, chantier `blockly`)
 *
 * Réglages : `src/lib/ubumark/parser/tortue-parser.ts` ; notation des programmes :
 * `src/lib/shared/blockly/tortue/notation.ts`.
 *
 * @module block-catalog/tortue
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const tortueEntry: BlockCatalogEntry = {
	slug: 'tortue',
	title: 'Programme tortue',
	fences: ['tortue'],
	nodeType: 'tortue',
	summary:
		'L’élève assemble des blocs (avancer, tourner, répéter) pour que la tortue trace une figure sur un quadrillage ; il est jugé sur le tracé, pas sur le programme.',
	intro:
		'Écrivez le programme de référence en texte, dans attendu: : la figure qu’il trace est la réponse attendue. L’élève assemble ses blocs, appuie sur « Lancer » autant de fois qu’il veut pour voir la tortue tracer, puis valide. Deux programmes qui tracent la même figure sont justes tous les deux, quel que soit le chemin suivi (un carré tracé dans un sens ou dans l’autre, avec ou sans répétition). La tortue part du centre du quadrillage (20 × 20 carreaux, un carreau = 1), tournée vers la droite, stylo baissé. Instructions : avancer n, reculer n, tourner à droite n, tourner à gauche n (en degrés), lever le stylo, baisser le stylo, répéter n [ … ], séparées par « ; ». La consigne (« Fais tracer un carré de côté 3 à la tortue. ») va dans l’énoncé, au-dessus. Sur la fiche PDF : la figure si elle est montrée, et « À faire sur Chiphre ».',
	settingGroups: [
		{
			settings: [
				{
					key: 'attendu',
					values: 'un programme (notation texte, variables admises)',
					defaultValue: null,
					description:
						'Le programme de référence. Il doit se lire et tracer quelque chose : sinon la question est refusée à la publication. Il n’est jamais envoyé à l’élève pendant une évaluation notée.'
				},
				{
					key: 'montrer',
					values: 'oui | non',
					defaultValue: 'non',
					description:
						'oui : la figure à reproduire est dessinée en gris sur le quadrillage (et sur la fiche PDF). non : l’élève la construit d’après la consigne seule.'
				},
				{
					key: 'comparer',
					values: 'position | forme',
					defaultValue: 'position',
					description:
						'position : la même figure au même endroit. forme : la même figure n’importe où, même tournée d’un quart de tour ou retournée (un carré tracé vers le bas est juste).'
				}
			]
		}
	],
	examples: [
		{
			title: 'Un carré à reproduire',
			source: fence(
				'tortue',
				'attendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]',
				'montrer: oui'
			),
			explanation:
				'La figure est montrée en gris : l’élève la recouvre. « avancer 3 ; tourner à gauche 90 » répété 4 fois trace un autre carré (au-dessus) : il est faux en position, juste avec comparer: forme.'
		},
		{
			title: 'Un escalier, n’importe où',
			source: fence(
				'tortue',
				'attendu: répéter 3 [ avancer 2 ; tourner à gauche 90 ; avancer 2 ; tourner à droite 90 ]',
				'comparer: forme'
			),
			explanation:
				'Sans figure montrée : la consigne décrit l’escalier (« 3 marches de 2 carreaux »). Avec comparer: forme, un escalier qui descend, ou tracé plus loin, est juste.'
		},
		{
			title: 'Deux traits séparés',
			source: fence(
				'tortue',
				'attendu: avancer 4 ; lever le stylo ; avancer 2 ; baisser le stylo ; avancer 4',
				'montrer: oui'
			),
			explanation: 'Stylo levé : la tortue avance sans tracer, le trou fait partie de la figure.'
		}
	],
	mistakes: [
		{
			title: 'Programme de référence oublié',
			source: fence('tortue', 'montrer: oui'),
			message: 'il manque la ligne attendu:',
			explanation: 'Sans programme de référence, rien ne dit quelle figure est juste.'
		},
		{
			title: 'Instruction inconnue',
			source: fence('tortue', 'attendu: avancer 3 ; sauter 2'),
			message: 'Instruction inconnue : « sauter',
			explanation:
				'Les instructions sont celles des blocs : avancer, reculer, tourner à droite, tourner à gauche, lever le stylo, baisser le stylo, répéter.'
		},
		{
			title: 'Rien de tracé',
			source: fence('tortue', 'attendu: lever le stylo ; avancer 3'),
			message: 'ce programme ne trace rien',
			explanation: 'Stylo levé du début à la fin : il n’y a aucune figure à reproduire.'
		}
	],
	tryIt: fence('tortue', 'attendu: répéter 3 [ avancer 4 ; tourner à gauche 120 ]', 'montrer: oui')
};
