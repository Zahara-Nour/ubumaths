/**
 * Catalogue — blocs statistiques (```barres, ```circulaire, ```histogramme…) et
 * ```boite-a-moustaches (sa fiche à part, page de démo du chantier)
 *
 * Réglages : `src/lib/ubumark/parser/stat-chart-parser.ts`, types dans
 * `src/lib/ubumark/types/stat-chart.ts`.
 *
 * @module block-catalog/stat-chart
 */
import { STAT_CHART_KINDS } from '$lib/ubumark/types/stat-chart';
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const statChartEntry: BlockCatalogEntry = {
	slug: 'statistiques',
	title: 'Graphiques statistiques',
	// La boîte à moustaches a sa fiche à elle (`boxPlotEntry`, plus bas)
	fences: STAT_CHART_KINDS.filter((kind) => kind !== 'boite-a-moustaches'),
	nodeType: 'stat-chart',
	summary:
		'Diagrammes en barres, circulaires, histogrammes, tableaux, lois de probabilité, simulations et nuages de points ; dans une question, un diagramme en barres que l’élève construit.',
	intro:
		'Neuf blocs dessinent des données : on écrit les effectifs (ou la série brute), le graphique se construit tout seul. Une ligne de donnée s’écrit « catégorie = effectif », une classe s’écrit [a ; b[. Les réglages se mettent sous la forme « clé: valeur », dans n’importe quel ordre. Un bloc mal écrit reste dans le texte avec ses messages situés : « Ligne N » compte à partir de la première ligne sous ```.',
	settingGroups: [
		{
			title: 'Réglages communs',
			settings: [
				{
					key: 'titre',
					values: 'un texte',
					defaultValue: 'aucun',
					description: 'Écrit au-dessus du graphique.'
				},
				{
					key: 'description',
					values: 'un texte',
					defaultValue: 'aucune',
					description: 'Lue à la place de l’image par les lecteurs d’écran (graphiques dessinés).'
				},
				{
					key: 'taille',
					values: 'petite | moyenne | grande',
					defaultValue: 'moyenne',
					description: 'Taille de la figure (graphiques dessinés et nuage).'
				},
				{
					key: 'couleur',
					values: 'un nom de couleur (bleu, rouge, vert…)',
					defaultValue: 'bleu',
					description: 'Couleur des barres, de l’histogramme, du polygone ou du nuage.'
				},
				{
					key: 'données',
					values: 'une série brute : 12 ; 15 ; 12 ; 8',
					defaultValue: 'aucune',
					description:
						'Au lieu des effectifs : le bloc compte lui-même. Impossible avec des lignes « catégorie = effectif ».'
				}
			]
		},
		{
			title: '```barres — diagramme en barres',
			settings: [
				{
					key: 'catégorie = effectif',
					values: 'une ligne par barre, nombres (effectifs ou pourcentages, sans les mélanger)',
					defaultValue: null,
					description: 'Exemple : Football = 12. Au plus 20 barres.'
				},
				{
					key: 'axes',
					values: 'titre horizontal ; titre vertical',
					defaultValue: 'aucun',
					description: 'Deux textes séparés par ; (l’un des deux peut rester vide).'
				},
				{
					key: 'valeurs',
					values: 'oui | non',
					defaultValue: 'non',
					description: 'Écrit l’effectif au-dessus de chaque barre.'
				},
				{
					key: 'afficher',
					values: 'effectifs | fréquences',
					defaultValue: 'effectifs',
					description: 'Hauteur des barres en effectifs ou en fréquences.'
				},
				{
					key: 'indicateurs',
					values:
						'effectif ; moyenne ; médiane ; quartiles ; écart interquartile ; étendue ; écart type',
					defaultValue: 'aucun',
					description: 'Calculés sous le graphique (catégories numériques).'
				},
				{
					key: 'série',
					values: 'affichée | triée | seule',
					defaultValue: 'aucune',
					description: 'Avec « données: » : montrer la série écrite, triée, ou rien d’autre.'
				},
				{
					key: 'axe',
					values: '0 à 20, de 2 en 2 (ou 0 à 15 : de 1 en 1) ; à choisir',
					defaultValue: 'calculé sur les données',
					description:
						'Axe vertical fixé : il part de 0, son haut est un multiple du pas, au plus 40 graduations. Une barre plus haute que l’axe est refusée. « à choisir » (avec placer: toutes) : 10 graduations sans nombres, l’élève choisit ce que vaut une graduation (1, 2, 5 ou 10) ; juste = la plus petite échelle où tout rentre ; une case pour l’échelle avant celles des barres ; données jusqu’à 100. Sur le PDF, l’enfant écrit l’échelle.'
				}
			]
		},
		{
			title: '```barres dans une question : construire les barres',
			settings: [
				{
					key: 'placer',
					values: 'les barres à construire : Natation ; Danse, ou toutes',
					defaultValue: 'aucune',
					description:
						'L’élève monte ces barres (toucher la colonne, glisser, boutons ▲ ▼), d’unité en unité, même sur un axe gradué de 2 en 2 ; les autres sont dessinées. Une case par barre (note partielle) ; jamais d’effectif attendu écrit à l’écran. Exige axe: (calculé, il trahirait la plus grande barre) ou axe: à choisir, jusqu’à 100 au plus ; refusé avec valeurs: oui, indicateurs: (la barre se déduirait), des pourcentages ou deux séries. Avec données:, l’élève compte puis construit (série: affichée montre la série). Sur le PDF, les barres à construire sont absentes : l’enfant les dessine.'
				}
			]
		},
		{
			title: '```circulaire — diagramme circulaire',
			settings: [
				{
					key: 'catégorie = effectif',
					values: 'une ligne par secteur',
					defaultValue: null,
					description: 'Exemple : Bus = 14. Au plus 12 secteurs.'
				},
				{
					key: 'étiquettes',
					values: 'pourcentages | effectifs | angles | aucune',
					defaultValue: 'pourcentages',
					description: 'Ce qui est écrit dans la légende.'
				}
			]
		},
		{
			title: '```histogramme — histogramme',
			settings: [
				{
					key: '[a ; b[ = effectif',
					values: 'une ligne par classe, bornes croissantes',
					defaultValue: null,
					description: 'Exemple : [0 ; 10[ = 12.'
				},
				{
					key: 'classes',
					values: 'bornes séparées par ;',
					defaultValue: 'aucune',
					description: 'Avec « données: » : les classes dans lesquelles ranger la série.'
				},
				{
					key: 'légende',
					values: '1 carreau = 2 élèves',
					defaultValue: 'aucune',
					description: 'Pour des classes d’amplitudes différentes (aire proportionnelle).'
				},
				{
					key: 'axes, valeurs, afficher, indicateurs',
					values: 'comme pour ```barres',
					defaultValue: 'comme ```barres',
					description: 'Indicateurs en classes : effectif, moyenne, classe médiane, médiane.'
				}
			]
		},
		{
			title: '```frequences-cumulees — polygone des fréquences cumulées',
			settings: [
				{
					key: '[a ; b[ = effectif',
					values: 'une ligne par classe',
					defaultValue: null,
					description: 'Comme l’histogramme.'
				},
				{
					key: 'sens',
					values: 'croissantes | décroissantes',
					defaultValue: 'croissantes',
					description: 'Sens du cumul.'
				},
				{
					key: 'lecture',
					values: 'aucune | médiane | quartiles',
					defaultValue: 'aucune',
					description: 'Trace les lectures graphiques sur le polygone.'
				},
				{
					key: 'axes, classes, indicateurs',
					values: 'comme pour ```histogramme',
					defaultValue: 'comme ```histogramme',
					description: 'Mêmes réglages.'
				}
			]
		},
		{
			title: '```tableau-croise — tableau croisé',
			settings: [
				{
					key: 'lignes',
					values: 'noms séparés par ;',
					defaultValue: null,
					description: 'Les lignes du tableau.'
				},
				{
					key: 'colonnes',
					values: 'noms séparés par ;',
					defaultValue: null,
					description: 'Les colonnes du tableau.'
				},
				{
					key: 'nom de ligne = valeurs',
					values: 'autant de nombres que de colonnes, séparés par ; ( ? = case inconnue)',
					defaultValue: null,
					description: 'Exemple : Filles = 12 ; 9.'
				},
				{
					key: 'totaux',
					values: 'oui | non',
					defaultValue: 'oui',
					description: 'Ajoute la ligne et la colonne Total.'
				},
				{
					key: 'afficher',
					values: 'effectifs | fréquences | fréquences par ligne | fréquences par colonne',
					defaultValue: 'effectifs',
					description: 'Ce que contiennent les cases.'
				},
				{
					key: 'masquer',
					values: 'cases Ligne/Colonne séparées par ; (Total accepté)',
					defaultValue: 'aucune',
					description: 'Cases laissées vides, à compléter par l’élève.'
				},
				{
					key: 'coin',
					values: 'un texte (Sexe \\ Régime)',
					defaultValue: 'vide',
					description: 'Texte de la case en haut à gauche.'
				}
			]
		},
		{
			title: '```loi — loi d’une variable aléatoire',
			settings: [
				{
					key: 'X = valeurs',
					values: 'valeurs séparées par ;',
					defaultValue: null,
					description: 'Une lettre majuscule autre que P pour la variable.'
				},
				{
					key: 'P = probabilités',
					values: 'fractions, décimaux ou pourcentages ; ? = inconnue',
					defaultValue: null,
					description: 'Leur somme doit faire exactement 1.'
				},
				{
					key: 'X ~ B(n ; p)',
					values: 'loi binomiale à la place de X = / P =',
					defaultValue: 'aucune',
					description: 'Les probabilités sont calculées. Aussi X ~ G(p) et X ~ U(a ; b).'
				},
				{
					key: 'indicateurs',
					values: 'espérance ; variance ; écart type ; aucun',
					defaultValue: 'aucun',
					description: 'Lignes ajoutées sous le tableau.'
				},
				{
					key: 'masquer',
					values: 'positions des cases à cacher (0, 1, 2…)',
					defaultValue: 'aucune',
					description: 'Probabilités laissées à compléter.'
				},
				{
					key: 'probabilités',
					values: 'P(X = 3) ; P(X ⩽ 4) ; P(2 ⩽ X ⩽ 5)',
					defaultValue: 'aucune',
					description: 'Loi binomiale : probabilités calculées sous le tableau.'
				},
				{
					key: 'diagramme, arrondi',
					values: 'oui | non ; 1 à 6 décimales',
					defaultValue: 'non ; 3',
					description: 'Loi binomiale : bâtons de la loi, nombre de décimales affichées.'
				}
			]
		},
		{
			title: '```simulation — simulation de tirages',
			settings: [
				{
					key: 'X = valeurs, P = probabilités',
					values: 'comme ```loi ; ou une loi nommée X ~ G(0,2), U(1 ; 6), E(0,5), N(10 ; 4)',
					defaultValue: null,
					description: 'La loi simulée.'
				},
				{
					key: 'mode',
					values: 'tirages | moyenne | échantillons',
					defaultValue: 'tirages',
					description: 'Ce qu’on simule.'
				},
				{
					key: 'tirages',
					values: '1 à 10 000',
					defaultValue: '100',
					description: 'Nombre de tirages (pas en mode échantillons).'
				},
				{
					key: 'échantillons et taille',
					values: 'entiers de 1 à 1 000',
					defaultValue: '100 ; 100',
					description: 'Mode échantillons seulement : leur produit ne dépasse pas 100 000.'
				},
				{
					key: 'graine',
					values: '0 à 999 999 999',
					defaultValue: '1',
					description: 'Même graine, mêmes résultats à l’écran et sur le PDF.'
				},
				{
					key: 'classes',
					values: 'un nombre de classes',
					defaultValue: 'automatique',
					description: 'Pour une loi à densité (uniforme continue, exponentielle, normale).'
				}
			]
		},
		{
			title: '```effectifs — tableau d’effectifs',
			settings: [
				{
					key: 'données ou catégorie = effectif',
					values: 'une série brute, des effectifs, ou des classes [a ; b[',
					defaultValue: null,
					description: 'Les valeurs du tableau.'
				},
				{
					key: 'lignes',
					values: 'effectifs ; fréquences ; effectifs cumulés (et fréquences cumulées)',
					defaultValue: 'effectifs',
					description: 'Les lignes du tableau.'
				},
				{
					key: 'fréquences',
					values: 'décimales | pourcentages',
					defaultValue: 'pourcentages',
					description: 'Écriture de la ligne des fréquences.'
				},
				{
					key: 'totaux, masquer, sens, classes, indicateurs',
					values: 'comme ailleurs',
					defaultValue: 'totaux : oui',
					description: 'Colonne Total, cases à compléter, sens du cumul, classes, indicateurs.'
				}
			]
		},
		{
			title: '```nuage — nuage de points',
			settings: [
				{
					key: 'x et y',
					values: 'x: 1 ; 2 ; 3 puis y: 12 ; 15 ; 19',
					defaultValue: null,
					description:
						'Deux lignes de même longueur (au moins 3 points, abscisses non toutes égales).'
				},
				{
					key: 'nom x, nom y',
					values: 'un texte',
					defaultValue: 'x et y',
					description: 'Titres des axes.'
				},
				{
					key: 'ajustement',
					values: 'affine, ou un changement de variable (z = ln(y)…)',
					defaultValue: 'aucun',
					description: 'Trace la droite d’ajustement.'
				},
				{
					key: 'indicateurs',
					values: 'point moyen ; équation ; r',
					defaultValue: 'aucun',
					description: 'Équation : demande « ajustement: affine ».'
				},
				{
					key: 'prévoir',
					values: 'x = 4,5 ; y = 25',
					defaultValue: 'aucune',
					description: 'Prévisions lues sur la droite (avec « ajustement: affine »).'
				},
				{
					key: 'arrondi, origine',
					values: '0 à 6 décimales ; oui | non',
					defaultValue: '3 ; non',
					description: 'Décimales affichées, axes prolongés jusqu’à l’origine.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Diagramme en barres',
			source: fence(
				'barres',
				'titre: Sport préféré',
				'Football = 12',
				'Danse = 7',
				'Basket = 9',
				'Judo = 4',
				'valeurs: oui'
			),
			explanation: 'Une ligne par barre ; « valeurs: oui » écrit les effectifs.'
		},
		{
			title: 'Barres à partir d’une série brute',
			source: fence(
				'barres',
				'titre: Notes de la classe',
				'données: 12 ; 15 ; 12 ; 8 ; 15 ; 12 ; 10',
				'indicateurs: moyenne ; médiane'
			),
			explanation: 'Le bloc compte les valeurs lui-même et calcule les indicateurs.'
		},
		{
			title: 'Construire des barres (question)',
			source: fence(
				'barres',
				'axes: Sport ; Effectif',
				'axe: 0 à 20, de 2 en 2',
				'Football = 12',
				'Natation = 8',
				'Danse = 7',
				'placer: Natation ; Danse'
			),
			explanation:
				'Dans une question, l’élève monte les barres Natation et Danse : une case chacune. La consigne (« Construis le diagramme du sport préféré : Natation 8, Danse 7. ») va dans l’énoncé, au-dessus.'
		},
		{
			title: 'Choisir l’échelle puis construire (question)',
			source: fence(
				'barres',
				'axes: Ville ; Élèves',
				'axe: à choisir',
				'Alphaville = 42',
				'Bêtaville = 35',
				'Gammaville = 18',
				'placer: toutes'
			),
			explanation:
				'L’axe a 10 graduations sans nombres : l’élève choisit ce que vaut une graduation (1, 2, 5 ou 10), puis monte toutes les barres. Juste : la plus petite échelle où tout rentre (ici 5). Une case pour l’échelle, puis une par barre.'
		},
		{
			title: 'Diagramme circulaire',
			source: fence(
				'circulaire',
				'titre: Moyen de transport',
				'Bus = 14',
				'Vélo = 6',
				'À pied = 8',
				'étiquettes: angles'
			),
			explanation: 'Les secteurs sont calculés ; la légende donne les angles.'
		},
		{
			title: 'Histogramme',
			source: fence(
				'histogramme',
				'titre: Temps de trajet (min)',
				'[0 ; 10[ = 12',
				'[10 ; 20[ = 18',
				'[20 ; 30[ = 9',
				'[30 ; 40[ = 3',
				'axes: Durée (min) ; Effectif'
			),
			explanation: 'Les classes s’écrivent [a ; b[ avec un point-virgule entre les bornes.'
		},
		{
			title: 'Fréquences cumulées et médiane',
			source: fence(
				'frequences-cumulees',
				'titre: Tailles des élèves',
				'[140 ; 150[ = 5',
				'[150 ; 160[ = 12',
				'[160 ; 170[ = 9',
				'[170 ; 180[ = 4',
				'lecture: médiane'
			),
			explanation: 'Le polygone est tracé et la médiane lue dessus.'
		},
		{
			title: 'Tableau croisé à compléter',
			source: fence(
				'tableau-croise',
				'lignes: Filles ; Garçons',
				'colonnes: Cantine ; Maison',
				'Filles = 18 ; 7',
				'Garçons = 14 ; 11',
				'coin: Sexe \\ Repas',
				'masquer: Filles/Maison ; Total/Total'
			),
			explanation: 'Les cases masquées sont vides : l’élève les complète.'
		},
		{
			title: 'Loi de probabilité',
			source: fence(
				'loi',
				'X = 1 ; 2 ; 3 ; 4 ; 5 ; 6',
				'P = 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6',
				'indicateurs: espérance ; écart type'
			),
			explanation: 'Un dé équilibré. Les probabilités doivent sommer exactement à 1.'
		},
		{
			title: 'Loi binomiale',
			source: fence(
				'loi',
				'X ~ B(10 ; 0,3)',
				'probabilités: P(X = 3) ; P(X ⩽ 2)',
				'diagramme: oui'
			),
			explanation: 'Les probabilités de la loi sont calculées, pas écrites.'
		},
		{
			title: 'Simulation du lancer d’un dé',
			source: fence(
				'simulation',
				'X = 1 ; 2 ; 3 ; 4 ; 5 ; 6',
				'P = 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6',
				'tirages: 600',
				'graine: 42'
			),
			explanation: 'Avec la même graine, les mêmes résultats sortent à l’écran et sur le PDF.'
		},
		{
			title: 'Tableau d’effectifs',
			source: fence(
				'effectifs',
				'données: 12 ; 15 ; 12 ; 8 ; 15 ; 12',
				'lignes: effectifs ; fréquences ; effectifs cumulés'
			),
			explanation: 'Le tableau est construit à partir de la série brute.'
		},
		{
			title: 'Nuage de points avec ajustement affine',
			source: fence(
				'nuage',
				'nom x: Année',
				'nom y: Ventes',
				'x: 1 ; 2 ; 3 ; 4 ; 5 ; 6',
				'y: 12 ; 15 ; 19 ; 22 ; 27 ; 30',
				'ajustement: affine',
				'indicateurs: point moyen ; équation ; r',
				'prévoir: x = 7'
			),
			explanation: 'La droite d’ajustement, son équation, r et une prévision pour x = 7.'
		}
	],
	mistakes: [
		{
			title: 'Classe d’histogramme mal écrite',
			source: fence('histogramme', '[0 ; 10 = 12', '[10 ; 20[ = 18'),
			message: 'Ligne 1 : « [0 ; 10 » : écrire une classe sous la forme [a ; b[',
			explanation:
				'Une classe s’écrit [a ; b[ : crochet ouvrant à gauche, crochet ouvrant à droite.'
		},
		{
			title: 'Probabilités dont la somme n’est pas 1',
			source: fence('loi', 'X = 1 ; 2 ; 3', 'P = 1/2 ; 1/3 ; 1/3'),
			message: 'Ligne 2 : La somme des probabilités fait 7/6, pas 1.',
			explanation: 'La somme des probabilités doit être exactement 1 (ici 7/6).'
		},
		{
			title: 'Barres à construire sans axe',
			source: fence('barres', 'Football = 12', 'Danse = 7', 'placer: Danse'),
			message:
				'Ligne 3 : placer : écrire aussi l’axe vertical (axe: 0 à 20, de 2 en 2, ou axe: à choisir) : calculé, il trahirait la plus grande barre',
			explanation:
				'Un axe calculé sur les données s’arrêterait juste au-dessus de la plus grande barre : il donnerait la réponse.'
		}
	],
	tryIt: fence(
		'barres',
		'titre: Sport préféré',
		'Football = 12',
		'Danse = 7',
		'Basket = 9',
		'valeurs: oui'
	)
};

/** Fiche de la boîte à moustaches : `/aide-ecriture/blocs/boite-a-moustaches` */
export const boxPlotEntry: BlockCatalogEntry = {
	slug: 'boite-a-moustaches',
	title: 'Boîte à moustaches',
	fences: ['boite-a-moustaches'],
	nodeType: 'stat-chart',
	summary:
		'Une à quatre boîtes à moustaches horizontales sur un même axe gradué, pour lire ou comparer des séries ; dans une question, une boîte que l’élève construit.',
	intro:
		'Une ligne par boîte : son nom, puis ses cinq valeurs dans l’ordre minimum ; Q1 ; médiane ; Q3 ; maximum. Les boîtes s’empilent dans l’ordre écrit, sur un seul axe en bas. Avec « données: », le bloc calcule lui-même la boîte d’une série brute (quartiles du programme). Les réglages s’écrivent « clé: valeur ». Un bloc mal écrit reste dans le texte avec ses messages situés.',
	settingGroups: [
		{
			settings: [
				{
					key: 'Nom = min ; Q1 ; médiane ; Q3 ; max',
					values: 'cinq nombres dans l’ordre croissant, séparés par ; (virgule décimale)',
					defaultValue: null,
					description:
						'Une ligne par boîte, 4 au plus. Le nom peut contenir des espaces ; « = 28 ; 30 ; … » seul donne une boîte sans nom.'
				},
				{
					key: 'données',
					values: 'une série brute : 3 ; 5 ; 7 ; 8 ; 12',
					defaultValue: 'aucune',
					description:
						'Une seule boîte, sans nom, calculée sur la série (500 valeurs au plus). Impossible avec des lignes « Nom = … ».'
				},
				{
					key: 'axe',
					values: 'a à b, de p en p',
					defaultValue: 'calculé',
					description:
						'L’axe gradué, qui peut partir d’un autre nombre que 0 (40 graduations au plus). Toutes les valeurs doivent y tenir.'
				},
				{
					key: 'titre',
					values: 'un texte',
					defaultValue: 'aucun',
					description: 'Titre de l’axe, écrit dessous (« temps (en s) »).'
				},
				{
					key: 'valeurs',
					values: 'oui | non',
					defaultValue: 'non',
					description: 'Écrit les cinq valeurs sous chaque boîte. Sans elles, l’élève les lit.'
				},
				{
					key: 'description, taille',
					values: 'un texte ; petite | moyenne | grande',
					defaultValue: 'automatique ; moyenne',
					description:
						'Texte lu par les lecteurs d’écran (sinon les cinq valeurs de chaque boîte), taille de la figure.'
				}
			]
		},
		{
			title: 'Dans une question : construire la boîte',
			settings: [
				{
					key: 'placer',
					values: 'les boîtes à construire : Notes ; Neptune, ou toutes',
					defaultValue: 'aucune',
					description:
						'L’élève voit l’axe et le nom de la boîte ; il choisit un trait (Min, Q1, Médiane, Q3, Max) puis touche l’axe pour le poser, aimanté aux graduations. Les valeurs écrites sont l’attendu, jamais affichées avant la correction. Cinq cases par boîte (note partielle) ; des traits dans le désordre sont faux. Exige axe: (calculé, il trahirait le minimum et le maximum), et chaque valeur sur une graduation ; refusé avec valeurs: oui. Avec données:, l’élève calcule les quartiles de la série (écrite dans la consigne) puis construit ; une série tirée au hasard de taille paire peut avoir une médiane au demi (12,5) : graduer de 0,5 en 0,5, ou garder une taille impaire, sinon la question est refusée pour ce tirage. Sur le PDF, l’axe et le nom seuls : l’enfant dessine.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Comparer deux classes',
			source: fence(
				'boite-a-moustaches',
				'axe: 25 à 60, de 5 en 5',
				'titre: temps (en s)',
				'Nautic = 28 ; 30 ; 37 ; 45 ; 58',
				'Neptune = 36 ; 37 ; 39 ; 42 ; 46'
			),
			explanation:
				'Deux boîtes sur le même axe : médianes, quartiles et étendues se comparent d’un coup d’œil.'
		},
		{
			title: 'Boîte d’une série brute',
			source: fence('boite-a-moustaches', 'données: 3 ; 5 ; 7 ; 8 ; 12 ; 13 ; 14 ; 18 ; 21'),
			explanation:
				'Le bloc calcule minimum, quartiles, médiane et maximum (ici Q1 = 7 et Q3 = 14, les quartiles du programme) ; l’axe est choisi tout seul.'
		},
		{
			title: 'Valeurs écrites',
			source: fence(
				'boite-a-moustaches',
				'axe: 0 à 20, de 2 en 2',
				'titre: note sur 20',
				'valeurs: oui',
				'Notes = 4 ; 8 ; 11 ; 14 ; 19'
			),
			explanation: 'Les cinq valeurs sont écrites sous la boîte.'
		},
		{
			title: 'Construire la boîte (question)',
			source: fence(
				'boite-a-moustaches',
				'axe: 0 à 20, de 1 en 1',
				'titre: note sur 20',
				'placer: Notes',
				'Notes = 4 ; 8 ; 11 ; 14 ; 19'
			),
			explanation:
				'Dans une question, l’élève pose les cinq traits de la boîte Notes : une case chacun. La consigne (la série, ou ses cinq valeurs) va dans l’énoncé, au-dessus.'
		},
		{
			title: 'Calculer puis construire (question)',
			source: fence(
				'boite-a-moustaches',
				'axe: 0 à 25, de 1 en 1',
				'placer: toutes',
				'données: 3 ; 5 ; 7 ; 8 ; 12 ; 13 ; 14 ; 18 ; 21'
			),
			explanation:
				'L’attendu est calculé sur la série (quartiles du programme) : l’élève la lit dans la consigne, calcule, construit.'
		}
	],
	mistakes: [
		{
			title: 'Valeurs dans le désordre',
			source: fence('boite-a-moustaches', 'Nautic = 28 ; 37 ; 30 ; 45 ; 58'),
			message: 'Ligne 1 : valeurs dans le désordre',
			explanation:
				'Les cinq valeurs vont dans l’ordre minimum ; Q1 ; médiane ; Q3 ; maximum, chacune au moins égale à la précédente.'
		},
		{
			title: 'Quatre valeurs au lieu de cinq',
			source: fence('boite-a-moustaches', 'Nautic = 28 ; 30 ; 45 ; 58'),
			message: 'Ligne 1 : 4 valeurs : en écrire 5',
			explanation: 'Il faut les cinq valeurs, médiane comprise.'
		},
		{
			title: 'Valeur hors de l’axe',
			source: fence(
				'boite-a-moustaches',
				'axe: 25 à 50, de 5 en 5',
				'Nautic = 28 ; 30 ; 37 ; 45 ; 58'
			),
			message: 'Ligne 2 : 58 est hors de l’axe',
			explanation:
				'Agrandir l’axe (ici jusqu’à 60) ou l’enlever : calculé, il contient toutes les valeurs.'
		},
		{
			title: 'Construire sans axe écrit',
			source: fence('boite-a-moustaches', 'placer: Notes', 'Notes = 4 ; 8 ; 11 ; 14 ; 19'),
			message:
				'Ligne 1 : placer : écrire aussi l’axe (axe: 0 à 20, de 1 en 1) : calculé, il trahirait le minimum et le maximum',
			explanation: 'Pour construire, l’axe est donné par le prof.'
		},
		{
			title: 'Valeur entre deux graduations',
			source: fence(
				'boite-a-moustaches',
				'axe: 0 à 20, de 2 en 2',
				'placer: Notes',
				'Notes = 4 ; 8 ; 11 ; 14 ; 18'
			),
			message: 'Ligne 3 : 11 n’est pas sur une graduation de l’axe',
			explanation:
				'Le trait s’aimante aux graduations : l’élève ne pourrait pas poser 11. Graduer de 1 en 1, ou choisir des valeurs paires.'
		}
	],
	tryIt: fence(
		'boite-a-moustaches',
		'titre: temps (en s)',
		'Nautic = 28 ; 30 ; 37 ; 45 ; 58',
		'Neptune = 36 ; 37 ; 39 ; 42 ; 46'
	)
};
