/**
 * Catalogue — bloc ```figure-de-travail (figure où l'élève trace pour vérifier)
 *
 * Réglages : `src/lib/ubumark/parser/construction-parser.ts` (mêmes lignes que
 * ```figure-a-completer, sans `verifier:`) ; le reste est l'en-tête et le langage
 * de ```figure.
 *
 * @module block-catalog/figure-de-travail
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const figureDeTravailEntry: BlockCatalogEntry = {
	slug: 'figure-de-travail',
	title: 'Figure de travail',
	fences: ['figure-de-travail'],
	nodeType: 'figure',
	summary: 'Une figure où l’élève peut tracer pour vérifier ; rien n’y est noté.',
	intro:
		'Dans une question, l’élève peut tracer sur la figure (« Tu peux tracer la droite (AB) pour vérifier »), mais la réponse est ailleurs : une case choix, une case [_]… La figure ne compte jamais dans la note ; vide, elle ne bloque pas « Valider ». Après la correction, ses traits restent visibles en gris ; en évaluation, ils sont enregistrés et montrés dans la copie. Hors d’une question, ou dans une fiche imprimée, seule la figure de départ s’affiche.',
	settingGroups: [
		{
			settings: [
				{
					key: 'outils',
					values: 'droite ou segment',
					defaultValue: 'droite',
					description:
						'L’outil proposé à l’élève, un seul par figure. Avec un quadrillage (grille:) et le segment, chaque toucher va au nœud le plus proche.'
				},
				{
					key: 'fenetre, taille…',
					values: 'comme pour le bloc figure',
					defaultValue: 'comme pour le bloc figure',
					description:
						'L’en-tête de la figure de départ. Pas de verifier: (rien n’est noté) ni de deplacable:.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Vérifier un alignement, puis répondre oui ou non',
			source: fence(
				'figure-de-travail',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'outils: droite',
				'---',
				'A = point(2, 3)',
				'B = point(8, 5)',
				'C = point(5, 4.25)'
			),
			explanation:
				'C est à un quart de carreau de la droite (AB) : invisible à l’œil, net une fois la droite tracée. Dans la question, une case choix (Oui / Non) suit le bloc : elle seule est notée.'
		}
	],
	mistakes: [
		{
			title: 'Une vérification écrite',
			source: fence(
				'figure-de-travail',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'verifier: droite_par A ; B',
				'---',
				'A = point(1, 2)',
				'B = point(7, 2)'
			),
			message: 'pas de verifier:',
			explanation:
				'Une figure de travail n’est jamais notée. Pour noter la figure de l’élève, écrire un bloc figure-a-completer.'
		}
	],
	tryIt: fence(
		'figure-de-travail',
		'fenetre: 0 ; 10 ; 0 ; 6',
		'outils: droite',
		'---',
		'A = point(2, 4)',
		'B = point(8, 1)',
		'C = point(6, 5)'
	),
	seeAlso: {
		href: '/aide-ecriture/blocs/figure-a-completer',
		label: 'La figure à compléter (notée)'
	}
};
