/**
 * Catalogue — bloc ```labyrinthe (grille de nombres à parcourir, chantier `labyrinthe`)
 *
 * Réglages : `src/lib/ubumark/parser/labyrinthe-parser.ts` ; règles et tirage :
 * `src/lib/ubumark/utils/labyrinthe-moteur.ts`.
 *
 * @module block-catalog/labyrinthe
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const labyrintheEntry: BlockCatalogEntry = {
	slug: 'labyrinthe',
	title: 'Labyrinthe de nombres',
	fences: ['labyrinthe'],
	nodeType: 'labyrinthe',
	summary:
		'Une grille de nombres, une entrée à gauche, des sorties numérotées à droite. L’élève trace le chemin qui ne passe que par les nombres qui suivent la règle (nombres premiers, multiples de 3, chiffre des centièmes égal à 7…).',
	intro:
		'Vous donnez la taille de la grille et la règle ; le bloc tire lui-même le chemin et les nombres : sur le chemin, des nombres qui suivent la règle ; partout ailleurs, des nombres qui ne la suivent pas, choisis pour tromper (91 ou 51 pour « premier », le 7 à un autre rang pour « chiffre des centièmes = 7 »). Le chemin ne se touche jamais lui-même : il n’y a qu’un seul bon chemin. Avec parcourir: oui, c’est une question : l’élève touche les cases une à une, chacune voisine de la précédente (haut, bas, gauche, droite) ; toucher la dernière case du chemin l’efface. Il est juste s’il part de l’entrée, arrive à une sortie et ne passe que par des nombres qui suivent la règle. Chaque élève a son labyrinthe : il est tiré avec la question. Le corrigé montre le bon chemin et dit sa sortie. La consigne va dans l’énoncé, au-dessus. Sur la fiche PDF : la grille, l’élève trace au crayon ; le corrigé imprimé teinte le bon chemin.',
	settingGroups: [
		{
			settings: [
				{
					key: 'grille',
					values: 'colonnes x lignes, 3 à 7 colonnes, 2 à 7 lignes',
					defaultValue: null,
					description: 'La taille de la grille, en cases.'
				},
				{
					key: 'règle',
					values: 'premier | multiple de n | chiffre des <rang> = c',
					defaultValue: null,
					description:
						'premier : nombres premiers (jusqu’à 100, ou 200 pour une grande grille). multiple de n : n de 2 à 99. chiffre des <rang> = c : rang des dix-millièmes aux dizaines de mille, c de 0 à 9 (des décimaux pour un rang après la virgule, des entiers sinon).'
				},
				{
					key: 'parcourir',
					values: 'oui | non',
					defaultValue: 'non',
					description: 'oui : une question, l’élève trace le chemin.'
				},
				{
					key: 'solution',
					values: 'oui | non',
					defaultValue: 'non',
					description:
						'oui : le bon chemin teinté, sans question (cours, corrigé). Pas avec parcourir: oui.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Ne passer que par des nombres premiers',
			source: fence('labyrinthe', 'grille: 6 x 4', 'règle: premier', 'parcourir: oui'),
			explanation:
				'Les intrus sont impairs et ne finissent pas par 5 (51, 91, 87) : il faut chercher un diviseur, pas regarder le dernier chiffre.'
		},
		{
			title: 'Le chiffre des centièmes',
			source: fence(
				'labyrinthe',
				'grille: 5 x 4',
				'règle: chiffre des centièmes = 7',
				'parcourir: oui'
			),
			explanation:
				'Chaque intrus a un 7, mais à un autre rang (dixièmes, millièmes, unités) : il faut lire le rang.'
		},
		{
			title: 'Le chemin montré',
			source: fence('labyrinthe', 'grille: 5 x 3', 'règle: multiple de 4', 'solution: oui'),
			explanation: 'Sans question : le bon chemin est teinté, pour un exemple de cours.'
		}
	],
	mistakes: [
		{
			title: 'Règle inconnue',
			source: fence('labyrinthe', 'grille: 5 x 4', 'règle: pair', 'parcourir: oui'),
			message: 'règle « pair » inconnue',
			explanation: 'Trois règles pour l’instant : premier, multiple de n, chiffre des <rang> = c.'
		},
		{
			title: 'Grille trop grande',
			source: fence('labyrinthe', 'grille: 9 x 4', 'règle: premier', 'parcourir: oui'),
			message: 'de 3 à 7 colonnes',
			explanation: 'Au-delà de 7 colonnes, les cases deviennent trop petites pour un téléphone.'
		}
	],
	tryIt: fence('labyrinthe', 'grille: 6 x 5', 'règle: multiple de 3', 'parcourir: oui')
};
