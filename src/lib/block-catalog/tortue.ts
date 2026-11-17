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
					values: 'un programme (notation texte)',
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
				},
				{
					key: 'départ',
					values: 'un programme (notation texte)',
					defaultValue: 'aucun',
					description:
						'Un programme posé d’avance dans l’espace de travail de l’élève, à modifier (« change un nombre pour que le carré ait un côté de 4 »). Tant qu’il n’y touche pas, il n’a pas répondu. En 4e / 3e, il peut lire une variable qu’il ne met pas : c’est à l’élève de la mettre (« complète le programme »).'
				},
				{
					key: 'niveau',
					values: '4e ou 3e',
					defaultValue: 'aucun (blocs de base)',
					description:
						'Les blocs proposés à l’élève, et les seuls admis. 4e ajoute les variables qu’il crée (mettre n à 6, ajouter 1 à n), les calculs + − × ÷ dans les entrées (tourner à gauche 360 ÷ n) et la répétition à nombre de tours calculé (répéter n [ … ], arrondi) ; 3e ajoute « si … alors (sinon) », les comparaisons, et / ou / non et « répéter jusqu’à ». Les programmes s’écrivent comme ceux des programmes de calcul, et attendu: et départ: doivent tenir dans le niveau. Une variable jamais mise vaut 0.'
				},
				{
					key: 'blocs',
					values: 'un nombre entier, de 1 à 500',
					defaultValue: 'aucune limite',
					description:
						'Au plus ce nombre de blocs : au-delà, le programme est faux, même si le tracé est juste (« Ton programme utilise 8 blocs ; il en faut au plus 3. »). Chaque instruction et chaque répéter compte un bloc ; les nombres écrits dedans ne comptent pas. L’élève voit la consigne « Au plus 3 blocs » et un compteur. Sert à rendre la répétition nécessaire : un carré sans répéter demande 8 blocs. Le programme attendu doit tenir dans la limite ; le programme de départ peut la dépasser.'
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
		},
		{
			title: 'Un carré, avec répéter obligatoire',
			source: fence(
				'tortue',
				'attendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]',
				'montrer: oui',
				'blocs: 3'
			),
			explanation:
				'Trois blocs au plus : répéter, avancer, tourner. Le même carré écrit sans répéter (8 blocs) est faux.'
		},
		{
			title: 'Un polygone à n côtés (4e)',
			source: fence(
				'tortue',
				'attendu: mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]',
				'montrer: oui',
				'niveau: 4e'
			),
			explanation:
				'Une variable n, un angle calculé : en changeant seulement n, le même programme trace n’importe quel polygone régulier.'
		},
		{
			title: 'Une spirale, à compléter (4e)',
			source: fence(
				'tortue',
				'attendu: mettre côté à 1 ; répéter 8 [ avancer côté ; tourner à gauche 90 ; ajouter 1 à côté ]',
				'départ: répéter 8 [ avancer côté ; tourner à gauche 90 ]',
				'montrer: oui',
				'niveau: 4e'
			),
			explanation:
				'Le départ lit la variable côté sans la mettre : l’élève ajoute « mettre côté à 1 » au début et « ajouter 1 à côté » dans la répétition.'
		}
	],
	mistakes: [
		{
			title: 'Variable sans niveau',
			source: fence(
				'tortue',
				'attendu: mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 60 ]'
			),
			message: 'niveau: 4e',
			explanation:
				'Sans niveau:, la tortue n’a ni variables ni calculs. Le message dit quel niveau ajouter.'
		},
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
		},
		{
			title: 'Limite plus petite que le programme attendu',
			source: fence('tortue', 'attendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]', 'blocs: 2'),
			message: 'plus que blocs: 2',
			explanation: 'Le programme attendu compte 3 blocs : aucun élève ne pourrait être juste.'
		}
	],
	tryIt: fence('tortue', 'attendu: répéter 3 [ avancer 4 ; tourner à gauche 120 ]', 'montrer: oui')
};
