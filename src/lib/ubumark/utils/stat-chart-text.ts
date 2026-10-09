/**
 * Textes des blocs statistiques, selon la langue du document
 * ==========================================================
 *
 * Q121-Q124 (2026-10-03) : une fiche en anglais reçoit des blocs en anglais —
 * tout texte que le bloc PRODUIT (titres, axes, indicateurs, descriptions lues
 * par le lecteur d'écran) ; jamais les textes de l'auteur, ni les messages
 * d'erreur (l'interface de l'auteur est en français).
 *
 * ⚠️ Vocabulaire scolaire anglais (Q122) : *frequency* = EFFECTIF, *relative
 * frequency* = FRÉQUENCE. Une traduction mot à mot inverserait le sens.
 *
 * @module ubumark/utils/stat-chart-text
 */

import type { ContentLocale } from '$lib/types/locale';
import type { FrequencyTableRow, StatChartDirection } from '../types/stat-chart';

/** Lignes possibles d'un tableau d'indicateurs (`.comparer`, deux séries) */
export type IndicatorRowId =
	| 'count'
	| 'mean'
	| 'deviation'
	| 'median'
	| 'q1'
	| 'q3'
	| 'iqr'
	| 'min'
	| 'max'
	| 'range'
	| 'medianClass';

interface StatText {
	kind: {
		barres: string;
		circulaire: string;
		histogramme: string;
		'frequences-cumulees': string;
		'tableau-croise': string;
	};
	/** Titres d'axe par défaut */
	axis: { count: string; relative: string; cumulative: string };
	/** Noms des indicateurs (lignes « Moyenne = 12 », en-têtes des tableaux) */
	rows: Record<IndicatorRowId, string>;
	/** « Effectif total : 8 » */
	total: (n: string) => string;
	/** « Classe médiane : [5 ; 10[ » */
	medianClass: (label: string) => string;
	/** Légende d'aire : « 1 carreau = 2 élèves » */
	square: string;
	/** Description d'un rectangle à carreaux */
	squareSize: (across: number, tall: string) => string;
	lessThan: (value: string) => string;
	/** Description d'un sommet du polygone : « 25 % en 10 » */
	vertex: (percent: string, x: string) => string;
	/** Nom d'une lecture graphique, tel qu'écrit à côté du pointillé */
	reading: { Q1: string; Me: string; Q3: string };
	/** Ce que lit le lecteur d'écran pour « Me » (prononcé « mé ») */
	medianSpoken: string;
	comparison: (names: readonly string[]) => string;
	unavailable: string;
	/** Titre d'un polygone selon son sens (« Increasing … » : l'adjectif d'abord en anglais) */
	polygonTitle: (direction: StatChartDirection) => string;
	/** Typographie : deux-points (` : ` en français, `: ` en anglais) */
	colon: string;
	/** Typographie : signe pour cent (` %` en français, `%` en anglais) */
	percent: string;
	/** Tableau d'effectifs (Q125-Q133) */
	frequencyTable: {
		title: string;
		value: string;
		classes: string;
		total: string;
		/** Lu à la place d'une case Total vide (cumuls) */
		notApplicable: string;
		row: (row: FrequencyTableRow, direction: StatChartDirection) => string;
	};
	/** Lois nommées (manches 11 et 13) : titre du tableau, nom de la loi */
	law: {
		/** « Loi de X : G(0,2) » */
		title: (variable: string, name: string) => string;
		binomial: (n: number, p: string) => string;
		/** Complément du titre de B(1 ; p) */
		bernoulli: string;
		geometric: (p: string) => string;
		/** `set` : « {1, …, 6} » */
		uniform: (set: string) => string;
		/** Sous les bâtons d'une loi géométrique, coupés au dernier k du tableau */
		notShown: string;
		/** Lois à densité (PR b) : `[a ; b]` déjà écrit selon la langue */
		uniformDensity: (interval: string) => string;
		exponential: (lambda: string) => string;
		/** N(μ ; σ²) (2026-10-09) */
		normal: (mu: string, variance: string) => string;
		/** Après « P(X = 3) = 0 » */
		pointZero: (variable: string) => string;
		/** Axe vertical et description de la courbe */
		density: string;
		densityCurve: string;
		shadedArea: (event: string) => string;
		/** Fonction de répartition */
		cdfUniform: (formula: string, interval: string) => string;
		cdfExponential: (exponent: string) => string;
		/** Lecture d'un exposant : « e puissance −1 » */
		power: string;
	};
	/** Simulation des lois de maths complémentaires (manche 14) */
	simulation: {
		/** Dernière ligne d'une loi géométrique : « 11 ou plus » */
		orMore: (k: string) => string;
		/** Histogramme des tirages d'une loi à densité */
		histogram: string;
		/** Lu par le lecteur d'écran : les classes et leurs hauteurs */
		histogramDescription: (draws: string, classes: string) => string;
		/** « 1 000 tirages ; moyenne observée ≈ 2,013 (E(X) = 2) » */
		summary: (draws: string, plural: boolean, mean: string, variable: string, e: string) => string;
		/** Loi exponentielle : la dernière classe compte ce qui dépasse l'axe */
		overflow: (bound: string, count: string) => string;
	};
	/** Nuage de points (```nuage, manche 15) ; nombres déjà écrits selon la langue */
	scatter: {
		title: string;
		/** Début de la description lue : « Nuage de 6 points » */
		points: (count: number) => string;
		/** `G(3,5 ; 20,833)` : point-virgule en français, virgule en anglais */
		meanPoint: (x: string, y: string) => string;
		meanLine: (point: string) => string;
		meanSpoken: (point: string) => string;
		/** `equation` : « y = 3,686x + 7,933 » */
		fitLine: (equation: string) => string;
		fitSpoken: (equation: string) => string;
		/** `relation` : « ≈ 0,998 » ou « = 1 » */
		correlation: (relation: string) => string;
		/** « Pour x = 4,5 : y ≈ 24,519 (interpolation) » */
		prediction: (given: string, result: string, interpolation: boolean) => string;
		/** Pente nulle, y ≠ b : aucun x ; y = b : tous */
		noSolution: (given: string) => string;
		everyX: (given: string) => string;
		/** Changement de variable (PR b) : « Relation entre x et y : y = … » */
		relationLine: (relation: string) => string;
		relationSpoken: (relation: string) => string;
		/** « changement de variable z = ln(y) » */
		changeSpoken: (change: string) => string;
		/** Prévision hors de l'image de la relation */
		noSolutionPlain: (given: string) => string;
		/** Prévision hors du domaine de la relation (ln x pour x ⩽ 0) */
		notDefined: (given: string) => string;
		/** Prévision définie mais trop grande (e^4001) */
		tooLarge: (given: string) => string;
		/** Vue d'origine : G est celui du nuage transformé, `pair` = « x ; z » */
		meanLineOf: (pair: string, point: string) => string;
	};
}

export const STAT_TEXT: Record<ContentLocale, StatText> = {
	fr: {
		kind: {
			barres: 'Diagramme en barres',
			circulaire: 'Diagramme circulaire',
			histogramme: 'Histogramme',
			'frequences-cumulees': 'Polygone des fréquences cumulées',
			'tableau-croise': 'Tableau croisé'
		},
		axis: {
			count: 'Effectif',
			relative: 'Fréquence (%)',
			cumulative: 'Fréquence cumulée (%)'
		},
		rows: {
			count: 'Effectif',
			mean: 'Moyenne',
			deviation: 'Écart type',
			median: 'Médiane',
			q1: 'Q1',
			q3: 'Q3',
			iqr: 'Écart interquartile',
			min: 'Minimum',
			max: 'Maximum',
			range: 'Étendue',
			medianClass: 'Classe médiane'
		},
		total: (n) => `Effectif total : ${n}`,
		medianClass: (label) => `Classe médiane : ${label}`,
		square: '1 carreau = ',
		squareSize: (across, tall) =>
			`${across} carreau${across > 1 ? 'x' : ''} de large, ${tall} de haut`,
		lessThan: (value) => `moins de ${value}`,
		vertex: (percent, x) => `${percent} % en ${x}`,
		reading: { Q1: 'Q1', Me: 'Me', Q3: 'Q3' },
		medianSpoken: 'Médiane',
		comparison: (names) => `Comparaison de ${names.join(' et ')}`,
		unavailable: 'Figure indisponible',
		polygonTitle: (direction) => `Polygone des fréquences cumulées ${direction}`,
		// Espaces ordinaires : le français reste tel qu'il était
		colon: ' : ',
		percent: ' %',
		frequencyTable: {
			title: 'Tableau des effectifs',
			value: 'Valeur',
			classes: 'Classe',
			total: 'Total',
			notApplicable: 'sans objet',
			row: (row, direction) => {
				const up = direction === 'croissantes';
				switch (row) {
					case 'effectifs':
						return 'Effectif';
					case 'fréquences':
						return 'Fréquence';
					case 'effectifs cumulés':
						return `Effectif cumulé ${up ? 'croissant' : 'décroissant'}`;
					case 'fréquences cumulées':
						return `Fréquence cumulée ${up ? 'croissante' : 'décroissante'}`;
				}
			}
		},
		law: {
			title: (variable, name) => `Loi de ${variable} : ${name}`,
			binomial: (n, p) => `B(${n} ; ${p})`,
			bernoulli: 'loi de Bernoulli',
			geometric: (p) => `G(${p})`,
			uniform: (set) => `loi uniforme sur ${set}`,
			notShown: 'valeurs suivantes non représentées',
			uniformDensity: (interval) => `loi uniforme sur ${interval}`,
			exponential: (lambda) => `E(${lambda})`,
			normal: (mu, variance) => `N(${mu} ; ${variance})`,
			pointZero: (variable) => `loi à densité : P(${variable} = x) = 0`,
			density: 'Densité',
			densityCurve: 'Courbe de densité',
			shadedArea: (event) => `aire hachurée : ${event}`,
			cdfUniform: (formula, interval) =>
				`F(x) = ${formula} pour x ∈ ${interval} ; 0 avant, 1 après`,
			cdfExponential: (exponent) => `F(x) = 1 − e^(${exponent}) pour x ⩾ 0`,
			power: 'puissance'
		},
		simulation: {
			orMore: (k) => `${k} ou plus`,
			histogram: 'Histogramme des tirages, en densité',
			histogramDescription: (draws, classes) =>
				`Histogramme des ${draws} tirages, en densité (fréquence divisée par l’amplitude), et courbe de densité de la loi : ${classes}.`,
			summary: (draws, plural, mean, variable, e) =>
				`${draws} tirage${plural ? 's' : ''} ; moyenne observée ≈ ${mean} (E(${variable}) = ${e})`,
			overflow: (bound, count) =>
				`la dernière classe compte aussi les tirages au-delà de ${bound} (ici ${count})`
		},
		scatter: {
			title: 'Nuage de points',
			points: (count) => `Nuage de ${count} points`,
			meanPoint: (x, y) => `G(${x} ; ${y})`,
			meanLine: (point) => `Point moyen : ${point}`,
			meanSpoken: (point) => `point moyen ${point}`,
			fitLine: (equation) => `Droite des moindres carrés : ${equation}`,
			fitSpoken: (equation) => `droite des moindres carrés ${equation}`,
			correlation: (relation) => `Coefficient de corrélation : r ${relation}`,
			prediction: (given, result, interpolation) =>
				`Pour ${given} : ${result} (${interpolation ? 'interpolation' : 'extrapolation'})`,
			noSolution: (given) => `Pour ${given} : aucune solution (pente nulle)`,
			everyX: (given) => `Pour ${given} : tout x convient (pente nulle)`,
			relationLine: (relation) => `Relation entre x et y : ${relation}`,
			relationSpoken: (relation) => `relation entre x et y ${relation}`,
			changeSpoken: (change) => `changement de variable ${change}`,
			noSolutionPlain: (given) => `Pour ${given} : aucune solution`,
			notDefined: (given) => `Pour ${given} : relation non définie`,
			tooLarge: (given) => `Pour ${given} : valeur trop grande pour être calculée`,
			meanLineOf: (pair, point) => `Point moyen du nuage (${pair}) : ${point}`
		}
	},
	en: {
		kind: {
			barres: 'Bar chart',
			circulaire: 'Pie chart',
			histogramme: 'Histogram',
			// Q122 : le polygone trace des FRÉQUENCES, pas des effectifs cumulés (revue)
			'frequences-cumulees': 'Cumulative relative frequency polygon',
			'tableau-croise': 'Two-way table'
		},
		axis: {
			count: 'Frequency',
			relative: 'Relative frequency (%)',
			cumulative: 'Cumulative relative frequency (%)'
		},
		rows: {
			count: 'Frequency',
			mean: 'Mean',
			deviation: 'Standard deviation',
			median: 'Median',
			q1: 'Q1',
			q3: 'Q3',
			iqr: 'Interquartile range',
			min: 'Minimum',
			max: 'Maximum',
			range: 'Range',
			medianClass: 'Median class'
		},
		total: (n) => `Total frequency: ${n}`,
		medianClass: (label) => `Median class: ${label}`,
		square: '1 square = ',
		squareSize: (across, tall) => `${across} square${across > 1 ? 's' : ''} wide, ${tall} high`,
		lessThan: (value) => `less than ${value}`,
		vertex: (percent, x) => `${percent}% at ${x}`,
		reading: { Q1: 'Q1', Me: 'Median', Q3: 'Q3' },
		medianSpoken: 'Median',
		comparison: (names) => `Comparison of ${names.join(' and ')}`,
		unavailable: 'Figure unavailable',
		polygonTitle: (direction) =>
			`${direction === 'croissantes' ? 'Increasing' : 'Decreasing'} cumulative relative frequency polygon`,
		colon: ': ',
		percent: '%',
		frequencyTable: {
			title: 'Frequency table',
			value: 'Value',
			classes: 'Class',
			total: 'Total',
			notApplicable: 'not applicable',
			// Q122 : *frequency* = effectif, *relative frequency* = fréquence
			row: (row, direction) => {
				const down = direction === 'décroissantes' ? 'Decreasing cumulative' : 'Cumulative';
				switch (row) {
					case 'effectifs':
						return 'Frequency';
					case 'fréquences':
						return 'Relative frequency';
					case 'effectifs cumulés':
						return `${down} frequency`;
					case 'fréquences cumulées':
						return `${down} relative frequency`;
				}
			}
		},
		law: {
			title: (variable, name) => `Distribution of ${variable}: ${name}`,
			binomial: (n, p) => `B(${n}, ${p})`,
			bernoulli: 'Bernoulli distribution',
			// « Geo(p) » : la notation des manuels anglais (G seul y est rare)
			geometric: (p) => `Geo(${p})`,
			uniform: (set) => `uniform distribution on ${set}`,
			notShown: 'following values not shown',
			uniformDensity: (interval) => `uniform distribution on ${interval}`,
			exponential: (lambda) => `Exp(${lambda})`,
			normal: (mu, variance) => `N(${mu}, ${variance})`,
			pointZero: (variable) => `continuous distribution: P(${variable} = x) = 0`,
			density: 'Density',
			densityCurve: 'Density curve',
			shadedArea: (event) => `shaded area: ${event}`,
			cdfUniform: (formula, interval) => `F(x) = ${formula} for x ∈ ${interval}; 0 before, 1 after`,
			cdfExponential: (exponent) => `F(x) = 1 − e^(${exponent}) for x ⩾ 0`,
			power: 'to the power'
		},
		simulation: {
			orMore: (k) => `${k} or more`,
			histogram: 'Histogram of the draws, as a density',
			histogramDescription: (draws, classes) =>
				`Histogram of the ${draws} draws, as a density (relative frequency divided by the class width), and the density curve of the distribution: ${classes}.`,
			summary: (draws, plural, mean, variable, e) =>
				`${draws} draw${plural ? 's' : ''}; observed mean ≈ ${mean} (E(${variable}) = ${e})`,
			overflow: (bound, count) =>
				`the last class also counts the draws beyond ${bound} (here ${count})`
		},
		scatter: {
			title: 'Scatter plot',
			points: (count) => `Scatter plot of ${count} points`,
			meanPoint: (x, y) => `G(${x}, ${y})`,
			meanLine: (point) => `Mean point: ${point}`,
			meanSpoken: (point) => `mean point ${point}`,
			fitLine: (equation) => `Least squares line: ${equation}`,
			fitSpoken: (equation) => `least squares line ${equation}`,
			correlation: (relation) => `Correlation coefficient: r ${relation}`,
			prediction: (given, result, interpolation) =>
				`For ${given}: ${result} (${interpolation ? 'interpolation' : 'extrapolation'})`,
			noSolution: (given) => `For ${given}: no solution (zero slope)`,
			everyX: (given) => `For ${given}: every x works (zero slope)`,
			relationLine: (relation) => `Relation between x and y: ${relation}`,
			relationSpoken: (relation) => `relation between x and y ${relation}`,
			changeSpoken: (change) => `change of variable ${change}`,
			noSolutionPlain: (given) => `For ${given}: no solution`,
			notDefined: (given) => `For ${given}: relation not defined`,
			tooLarge: (given) => `For ${given}: value too large to compute`,
			meanLineOf: (pair, point) => `Mean point of the (${pair}) scatter plot: ${point}`
		}
	}
};
