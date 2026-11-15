/**
 * Catalogue — bloc ```robot (robot sur un quadrillage, chantier `suite-fleches`)
 *
 * Réglages : `src/lib/ubumark/parser/robot-parser.ts` ; déplacement et notation des codes :
 * `src/lib/ubumark/utils/robot-moteur.ts`.
 *
 * @module block-catalog/robot
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const robotEntry: BlockCatalogEntry = {
	slug: 'robot',
	title: 'Robot sur un quadrillage',
	fences: ['robot'],
	nodeType: 'robot',
	summary:
		'Un robot sur un tapis de cases, une case verte à atteindre, des cases grises à éviter. Affiché seul, ou l’élève compose le code (flèches, ou « avance de », « pivote ») qui mène le robot à la case verte.',
	intro:
		'Sans produire:, le bloc dessine seulement la scène (pour une question « où arrive le robot ? »). Avec produire: oui, c’est une question : l’élève compose son code avec des cartes (toucher pour ajouter, glisser pour insérer ou déplacer, toucher une carte posée pour la retirer), 15 cartes au plus, puis valide. On rejoue son code : il est juste si le robot finit sur la case verte sans sortir du quadrillage ni passer par une case grise, quel que soit le chemin (un détour est juste). Le corrigé dessine son trajet, et celui d’un code juste le plus court en pointillés : ce code est calculé, vous ne l’écrivez pas. Les cases se repèrent par colonne, ligne : (1, 1) est la case en bas à gauche. Avec des variables (arrivée: {{xa}}, {{ya}}), un tirage où l’arrivée tombe sur le départ ou sur une case grise, ou demande plus de 15 instructions ou 4 virages, est refait. La consigne va dans l’énoncé, au-dessus. Sur la fiche PDF : le quadrillage, puis « Écris le code : » et 15 cases vides.',
	settingGroups: [
		{
			settings: [
				{
					key: 'quadrillage',
					values: 'colonnes x lignes, 2 à 12',
					defaultValue: null,
					description: 'La taille du tapis, en cases.'
				},
				{
					key: 'codage',
					values: 'flèches | avance-pivote',
					defaultValue: 'flèches',
					description:
						'flèches : ← ↑ → ↓, chaque flèche fait avancer d’une case dans son sens (codage absolu). avance-pivote : « avance de 1 à 9 », « pivote à gauche », « pivote à droite », vu du robot (codage relatif) ; il faut alors son sens de départ.'
				},
				{
					key: 'départ',
					values: 'colonne, ligne ; en avance-pivote : colonne, ligne, sens',
					defaultValue: null,
					description:
						'La case du robot. En avance-pivote, son sens en plus : haut, droite, bas ou gauche (départ: 2, 1, droite).'
				},
				{
					key: 'arrivée',
					values: 'colonne, ligne',
					defaultValue: 'aucune',
					description: 'La case verte. Obligatoire avec produire: oui.'
				},
				{
					key: 'interdites',
					values: 'colonne, ligne ; colonne, ligne …',
					defaultValue: 'aucune',
					description:
						'Les cases grises, où le robot ne peut pas aller. Ce sont elles qui obligent à tourner plusieurs fois.'
				},
				{
					key: 'produire',
					values: 'oui | non',
					defaultValue: 'non',
					description:
						'oui : une question, l’élève compose le code. Il faut qu’un code de 15 instructions et 4 virages au plus mène à l’arrivée (BO du CE1).'
				}
			]
		}
	],
	examples: [
		{
			title: 'Coder avec des flèches',
			source: fence(
				'robot',
				'quadrillage: 8 x 5',
				'départ: 2, 1',
				'arrivée: 6, 4',
				'interdites: 4, 1 ; 4, 2',
				'produire: oui'
			),
			explanation:
				'Le mur gris oblige à monter avant de passer : → → → → ↑ ↑ ↑ bute sur la case grise, ↑ ↑ ↑ → → → → est juste, ↑ ↑ → → → → ↑ aussi.'
		},
		{
			title: 'Avancer et pivoter',
			source: fence(
				'robot',
				'quadrillage: 6 x 6',
				'codage: avance-pivote',
				'départ: 1, 1, haut',
				'arrivée: 5, 4',
				'interdites: 2, 2 ; 3, 3',
				'produire: oui'
			),
			explanation:
				'Le robot regarde vers le haut : « avance de 3, pivote à droite, avance de 4 » le mène à la case verte. Le nez du robot dessiné montre son sens.'
		},
		{
			title: 'La scène seule',
			source: fence('robot', 'quadrillage: 5 x 4', 'départ: 1, 1', 'arrivée: 4, 3'),
			explanation:
				'Sans produire:, rien n’est demandé : la scène illustre une question « où arrive le robot ? » ou « quel code ? » posée avec un bloc choix.'
		}
	],
	mistakes: [
		{
			title: 'Sens oublié en avance-pivote',
			source: fence(
				'robot',
				'quadrillage: 6 x 4',
				'codage: avance-pivote',
				'départ: 1, 1',
				'arrivée: 4, 3',
				'produire: oui'
			),
			message: 'départ',
			explanation:
				'« avance de » dépend du sens du robot : écrivez-le après sa case (départ: 1, 1, droite).'
		},
		{
			title: 'Question sans case verte',
			source: fence('robot', 'quadrillage: 6 x 4', 'départ: 1, 1', 'produire: oui'),
			message: 'produire: oui demande une arrivée:',
			explanation: 'Sans case verte, rien ne dit où le code doit mener le robot.'
		},
		{
			title: 'Arrivée sur une case grise',
			source: fence(
				'robot',
				'quadrillage: 6 x 4',
				'départ: 1, 1',
				'arrivée: 4, 2',
				'interdites: 4, 2'
			),
			message: 'l’arrivée est sur une case grise',
			explanation: 'Le robot ne peut pas entrer dans une case grise : il n’y arriverait jamais.'
		}
	],
	tryIt: fence(
		'robot',
		'quadrillage: 7 x 5',
		'départ: 1, 3',
		'arrivée: 7, 3',
		'interdites: 4, 2 ; 4, 3 ; 4, 4',
		'produire: oui'
	)
};
