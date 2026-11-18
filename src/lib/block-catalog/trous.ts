/**
 * Catalogue — bloc ```trous (texte à trous à étiquettes)
 *
 * Réglages : `src/lib/ubumark/parser/trous-parser.ts`.
 *
 * @module block-catalog/trous
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const trousEntry: BlockCatalogEntry = {
	slug: 'trous',
	title: 'Texte à trous à étiquettes',
	fences: ['trous'],
	nodeType: 'trous',
	summary:
		'Un texte avec des trous et, au-dessus, une réserve d’étiquettes : l’élève pose la bonne étiquette dans chaque trou (vocabulaire, propriété de cours, formule).',
	intro:
		'Écrivez votre texte en mettant chaque trou à sa place, avec sa bonne étiquette entre crochets : [arithmétique], ou [$r$] pour une formule. L’élève voit le texte avec des places vides, toutes de la largeur de la plus longue étiquette, et au-dessus la réserve : les étiquettes mélangées, chacune une fois, intrus compris. Il glisse une étiquette dans un trou, au doigt ou à la souris, ou la touche puis touche le trou ; toucher une étiquette posée la retire. Une étiquette reste dans la réserve une fois posée : elle peut servir à plusieurs trous. Il est jugé trou par trou (note partielle). Sur la fiche PDF, la réserve encadrée et des trous en pointillés, numérotés.',
	settingGroups: [
		{
			settings: [
				{
					key: '[étiquette]',
					values: '1 à 10 trous (texte, formule $…$, variable)',
					defaultValue: null,
					description:
						'Un trou, à sa place dans le texte, avec sa bonne étiquette. Deux trous peuvent avoir la même étiquette : elle n’est montrée qu’une fois. Un crochet dans une formule ($[0 ; 1]$) n’est pas un trou ; un intervalle s’écrit donc toujours en formule.'
				},
				{
					key: 'intrus',
					values: 'étiquettes séparées par « ; »',
					defaultValue: null,
					description:
						'En dernière ligne : des étiquettes qui ne vont dans aucun trou. Il faut au moins 3 étiquettes différentes en tout (sinon la réponse se devine), au plus 12.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Suites arithmétiques et géométriques',
			source: fence(
				'trous',
				'Une suite définie par $u_{n+1} = u_n + r$ est [arithmétique], de raison [$r$].',
				'Une suite définie par $u_{n+1} = q \\times u_n$ est [géométrique], de raison [$q$].',
				'intrus: croissante ; $u_0$'
			),
			explanation:
				'Deux phrases, quatre trous. La consigne (« Complète avec les étiquettes. ») va dans l’énoncé, au-dessus. Les intrus « croissante » et « $u_0$ » empêchent de remplir le dernier trou par élimination.'
		},
		{
			title: 'Une étiquette pour plusieurs trous',
			source: fence(
				'trous',
				'$12$ est [pair], $15$ est [impair] et $30$ est [pair].',
				'intrus: premier ; multiple de $7$'
			),
			explanation: 'L’élève pose deux fois l’étiquette « pair » : elle reste dans la réserve.'
		}
	],
	mistakes: [
		{
			title: 'Intervalle écrit en texte',
			source: fence(
				'trous',
				'Sur ]0 ; 1[, la fonction est [croissante].',
				'intrus: décroissante ; constante'
			),
			message: 'crochet « [ » sans « ] »',
			explanation:
				'Les crochets du texte font des trous : écrivez l’intervalle en formule, $]0 ; 1[$.'
		},
		{
			title: 'Trou vide',
			source: fence(
				'trous',
				'La suite est [arithmétique], de raison [].',
				'intrus: géométrique ; $q$'
			),
			message: 'le trou 2 est vide',
			explanation: 'Chaque trou porte sa bonne étiquette entre les crochets.'
		},
		{
			title: 'Deux étiquettes seulement',
			source: fence('trous', '$4$ est [pair], $7$ est [impair].'),
			message: 'au moins 3 étiquettes différentes',
			explanation: 'À deux étiquettes, l’élève devinerait : ajoutez un intrus, « intrus: premier ».'
		}
	],
	tryIt: fence(
		'trous',
		'La dérivée de $x^2$ est [$2x$], celle de $\\sqrt{x}$ est [$\\frac{1}{2\\sqrt{x}}$].',
		'intrus: $x$ ; $\\frac{1}{x}$'
	)
};
