/**
 * Catalogue — bloc ```courbe (courbe de fonction)
 *
 * Réglages : `src/lib/ubumark/parser/courbe-parser.ts`.
 *
 * @module block-catalog/courbe
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const courbeEntry: BlockCatalogEntry = {
	slug: 'courbe',
	title: 'Courbe de fonction',
	fences: ['courbe'],
	nodeType: 'courbe',
	summary: 'Courbes de fonctions, suites, points, asymptotes, tangentes et aires dans un repère.',
	intro:
		'Le bloc trace une ou plusieurs courbes dans un repère. Il faut donner la fenêtre (x et y) puis au moins une fonction. Les expressions s’écrivent comme dans les autres blocs : 2*x+1, x^2-3, 1/(x-2), sqrt(x), \\pi. Le séparateur entre deux valeurs est le point-virgule, le séparateur décimal est le point. En cas d’erreur, le bloc reste affiché avec des messages « Ligne N : … » et sans figure.',
	settingGroups: [
		{
			title: 'Le repère',
			settings: [
				{
					key: 'x',
					values: 'min ; max (-4 ; 6)',
					defaultValue: null,
					description: 'Fenêtre horizontale. min doit être plus petit que max.'
				},
				{
					key: 'y',
					values: 'min ; max (-8 ; 12)',
					defaultValue: null,
					description: 'Fenêtre verticale.'
				},
				{
					key: 'grille',
					values: 'un pas, ou deux pas x ; y (1 ou 1 ; 2)',
					defaultValue: 'aucune grille',
					description: 'Pas du quadrillage. Un seul pas vaut pour les deux axes.'
				},
				{
					key: 'taille',
					values: 'petite | moyenne | grande',
					defaultValue: 'moyenne',
					description: 'Taille de la figure.'
				},
				{
					key: 'description',
					values: 'une phrase',
					defaultValue: 'aucune',
					description: 'Texte alternatif de la figure, lu par les lecteurs d’écran.'
				}
			]
		},
		{
			title: 'Les fonctions',
			settings: [
				{
					key: 'f(x) = …',
					values: 'une expression en x ; 10 fonctions au plus',
					defaultValue: null,
					description: 'Une ligne par fonction. Le nom est libre (f, g, h, k1…), la variable est x.'
				},
				{
					key: 'sur [a ; b]',
					values: '[a ; b], ]a ; b], [a ; b[ ou ]a ; b[',
					defaultValue: 'tout le repère',
					description: 'En fin d’expression : domaine de tracé. Un crochet ouvert exclut la borne.'
				},
				{
					key: 'couleur',
					values: 'bleu, rouge, vert, orange, violet, jaune, cyan, marron, rose, gris, noir, blanc',
					defaultValue: 'bleu',
					description: 'Mot en fin de ligne. Les noms anglais (red, blue…) passent aussi.'
				},
				{
					key: 'pointillé',
					values: 'le mot pointillé',
					defaultValue: 'trait plein',
					description: 'Mot en fin de ligne : courbe en pointillés.'
				},
				{
					key: 'nom=',
					values: 'C_f, C_{g}, \\mathcal{C}_f ou une lettre',
					defaultValue: 'aucun nom',
					description: 'Mot en fin de ligne : nom écrit près de la courbe.'
				}
			]
		},
		{
			title: 'Les suites',
			settings: [
				{
					key: 'u(n) = … pour n de a à b',
					values: 'suite explicite en n ; nuage de points',
					defaultValue: null,
					description:
						'Une lettre pour nom. Le nom ne peut être ni x, ni y, ni n. 10 suites au plus, 200 termes chacune.'
				},
				{
					key: 'v(0) = … ; v(n+1) = … pour n de a à b',
					values: 'suite récurrente d’ordre 1',
					defaultValue: null,
					description:
						'Premier terme, un point-virgule, puis la relation avec v(n). Le calcul s’arrête si un terme dépasse 10^12 en valeur absolue.'
				},
				{
					key: 'escalier',
					values: 'le mot escalier',
					defaultValue: 'nuage de points',
					description:
						'Mot en fin de ligne d’une suite récurrente : construction en escalier, repère (uₙ ; uₙ₊₁). La relation ne doit pas contenir n.'
				},
				{
					key: 'termes',
					values: 'le mot termes',
					defaultValue: 'sans les rappels',
					description: 'Avec escalier : rappels et étiquettes u_0, u_1… sur l’axe des abscisses.'
				}
			]
		},
		{
			title: 'Points et repères',
			settings: [
				{
					key: 'points',
					values: 'Nom(x ; y), séparés par des virgules ; 50 au plus',
					defaultValue: 'aucun',
					description:
						'Points nommés. Une ordonnée peut appeler une fonction : M(2 ; f(2)) place M sur la courbe de f.'
				},
				{
					key: 'asymptotes',
					values: 'x=2 ; y=1 (plusieurs, séparées par ;)',
					defaultValue: 'aucune',
					description: 'Droites verticales (x=…) ou horizontales (y=…). 20 au plus.'
				},
				{
					key: 'tangente',
					values: 'f ; abscisse (f ; 1)',
					defaultValue: 'aucune',
					description:
						'Tangente (en pointillés) à la courbe de f au point d’abscisse donnée. La ligne peut se répéter, 10 au plus.'
				},
				{
					key: 'aire',
					values: 'f ; a ; b (f ; 0 ; 2)',
					defaultValue: 'aucune',
					description:
						'Colore l’aire sous la courbe de f entre a et b. La ligne peut se répéter, 10 au plus.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Une parabole',
			source: fence('courbe', 'x: -4 ; 6', 'y: -8 ; 12', 'f(x) = -(x+2)*(x-4)'),
			explanation: 'La fenêtre, puis une fonction : bleue, en trait plein par défaut.'
		},
		{
			title: 'Deux fonctions et une grille',
			source: fence(
				'courbe',
				'x: -3 ; 5',
				'y: -3 ; 9',
				'grille: 1',
				'f(x) = x^2-2*x   bleu   nom=C_f',
				'g(x) = x+2   rouge pointillé   nom=C_g'
			),
			explanation: 'Position relative de deux courbes. La droite g est en pointillés.'
		},
		{
			title: 'Points remarquables et tangente',
			source: fence(
				'courbe',
				'x: -2 ; 6',
				'y: -2 ; 8',
				'grille: 1',
				'f(x) = -(x-2)^2+6',
				'points: A(0 ; 2), S(2 ; f(2))',
				'tangente: f ; 1'
			),
			explanation: 'S est placé grâce à f(2). La tangente est tracée en x = 1.'
		},
		{
			title: 'Fonction inverse et asymptotes',
			source: fence(
				'courbe',
				'x: -6 ; 6',
				'y: -5 ; 5',
				'f(x) = 1/(x-2)+1   vert',
				'asymptotes: x=2 ; y=1'
			),
			explanation: 'x=2 et y=1 sont les deux asymptotes.'
		},
		{
			title: 'Aire sous une courbe, sur un intervalle',
			source: fence(
				'courbe',
				'x: -1 ; 5',
				'y: -1 ; 5',
				'grille: 1',
				'f(x) = sqrt(x) sur [0 ; 4]   orange',
				'aire: f ; 1 ; 4',
				'taille: grande'
			),
			explanation: 'La courbe n’existe que sur [0 ; 4]. L’aire est colorée entre 1 et 4.'
		},
		{
			title: 'Suite récurrente en escalier',
			source: fence(
				'courbe',
				'x: 0 ; 5',
				'y: 0 ; 5',
				'v(0) = 1 ; v(n+1) = 0.5*v(n)+2 pour n de 0 à 6   rouge escalier termes'
			),
			explanation: 'Le repère est (uₙ ; uₙ₊₁), donc la fenêtre sert aux deux axes.'
		}
	],
	mistakes: [
		{
			title: 'Fenêtre oubliée',
			source: fence('courbe', 'x: -3 ; 3', 'f(x) = x^2'),
			message: 'Fenêtre manquante : ajouter une ligne « y: min ; max »',
			explanation: 'Les deux lignes x et y sont obligatoires. Ajoute par exemple y: -1 ; 9.'
		},
		{
			title: 'Fonction écrite en t',
			source: fence('courbe', 'x: -3 ; 3', 'y: -1 ; 9', 'f(t) = t^2'),
			message: 'Ligne 3 : la fonction f doit être écrite en x, pas en t',
			explanation: 'La variable est toujours x : écris f(x) = x^2.'
		},
		{
			title: 'Virgule à la place du point-virgule',
			source: fence('courbe', 'x: -3, 3', 'y: -1 ; 9', 'f(x) = x^2'),
			message: 'Ligne 1 : x attend deux valeurs séparées par « ; »',
			explanation: 'Les bornes se séparent par un point-virgule : x: -3 ; 3.'
		}
	],
	tryIt: fence(
		'courbe',
		'x: -4 ; 6',
		'y: -8 ; 12',
		'grille: 1 ; 2',
		'f(x) = -(x+2)*(x-4)   bleu   nom=C_f',
		'g(x) = 2*x+1   rouge pointillé   nom=C_g',
		'points: A(-2 ; 0), B(4 ; 0)'
	)
};
