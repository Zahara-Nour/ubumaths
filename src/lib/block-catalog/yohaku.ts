/**
 * Catalogue — bloc ```yohaku (grille 2 × 2 jugée par ses contraintes, outil n° 56)
 *
 * Réglages : `src/lib/ubumark/parser/yohaku-parser.ts` ; calcul des totaux :
 * `src/lib/ubumark/utils/yohaku-moteur.ts` ; juge : `src/lib/ubumark/utils/yohaku-answer.ts`.
 *
 * @module block-catalog/yohaku
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const yohakuEntry: BlockCatalogEntry = {
	slug: 'yohaku',
	title: 'Grille yohaku',
	fences: ['yohaku'],
	nodeType: 'yohaku',
	summary:
		'Une grille de 2 × 2 cases ; au bout de chaque ligne et sous chaque colonne, le produit (ou la somme) de ses deux cases. L’élève remplit les cases manquantes pour que tous les totaux soient justes.',
	intro:
		'Vous écrivez UNE solution (en syntaxe maison, variables {{a}} comprises) et vous mettez entre crochets les cases que l’élève doit remplir. Le bloc calcule lui-même les quatre totaux, développés et réduits, et les affiche autour de la grille. L’élève écrit dans des champs de formule ; sa grille est juste si chaque ligne et chaque colonne donne son total : plusieurs remplissages peuvent être justes, pas seulement le vôtre. S’il se trompe, les lignes et colonnes fausses sont marquées en rouge. Au moins une case entre crochets fait de ce bloc une question (une case de réponse). Le corrigé montre votre solution et rappelle que d’autres remplissages sont justes. Sur la fiche PDF : la grille avec ses totaux, les cases à remplir vides ; le corrigé imprimé les remplit.',
	settingGroups: [
		{
			settings: [
				{
					key: 'opération',
					values: 'somme | produit',
					defaultValue: null,
					description: 'Ce que valent les totaux : la somme ou le produit des deux cases.'
				},
				{
					key: 'ligne',
					values: 'case | case',
					defaultValue: null,
					description:
						'Une ligne de la grille, deux fois (ligne du haut puis ligne du bas). Une case est une formule ; entre crochets, c’est à l’élève de la remplir : [x+2].'
				},
				{
					key: 'solution',
					values: 'oui | non',
					defaultValue: 'non',
					description:
						'oui : votre solution écrite dans les cases à remplir (cours, corrigé imprimé).'
				}
			]
		}
	],
	examples: [
		{
			title: 'Produits de binômes',
			source: fence('yohaku', 'opération: produit', 'ligne: [x+2] | [x+3]', 'ligne: [2x+1] | x+1'),
			explanation:
				'Trois cases à remplir. Les totaux (x² + 5x + 6, 2x² + 3x + 1, …) se calculent tout seuls ; l’élève peut trouver d’autres cases justes que les vôtres.'
		},
		{
			title: 'Des sommes',
			source: fence('yohaku', 'opération: somme', 'ligne: [3x] | 2', 'ligne: 5 | [x-1]'),
			explanation: 'Avec somme, chaque total est la somme de ses deux cases.'
		},
		{
			title: 'La solution montrée',
			source: fence(
				'yohaku',
				'opération: produit',
				'ligne: [x+2] | [x+3]',
				'ligne: [2x+1] | x+1',
				'solution: oui'
			),
			explanation: 'Sans question : votre solution est écrite dans les cases, pour un cours.'
		}
	],
	mistakes: [
		{
			title: 'Aucune case à remplir',
			source: fence('yohaku', 'opération: produit', 'ligne: x+2 | x+3', 'ligne: 2x+1 | x+1'),
			message: 'aucune case à remplir',
			explanation: 'Mettez au moins une case entre crochets : [x+2].'
		},
		{
			title: 'Opération inconnue',
			source: fence('yohaku', 'opération: quotient', 'ligne: [x+2] | x+3', 'ligne: 2x+1 | x+1'),
			message: 'somme ou produit',
			explanation: 'Deux opérations : somme et produit.'
		},
		{
			title: 'Une ligne de trop ou de moins',
			source: fence('yohaku', 'opération: produit', 'ligne: [x+2] | x+3'),
			message: 'il faut 2 lignes',
			explanation: 'La grille est de 2 × 2 : deux lignes, deux cases chacune.'
		}
	],
	tryIt: fence('yohaku', 'opération: produit', 'ligne: [x+1] | [x+2]', 'ligne: [3] | x')
};
