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
			pointZero: (variable) => `loi à densité : P(${variable} = x) = 0`,
			density: 'Densité',
			densityCurve: 'Courbe de densité',
			shadedArea: (event) => `aire hachurée : ${event}`,
			cdfUniform: (formula, interval) =>
				`F(x) = ${formula} pour x ∈ ${interval} ; 0 avant, 1 après`,
			cdfExponential: (exponent) => `F(x) = 1 − e^(${exponent}) pour x ⩾ 0`,
			power: 'puissance'
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
			pointZero: (variable) => `continuous distribution: P(${variable} = x) = 0`,
			density: 'Density',
			densityCurve: 'Density curve',
			shadedArea: (event) => `shaded area: ${event}`,
			cdfUniform: (formula, interval) => `F(x) = ${formula} for x ∈ ${interval}; 0 before, 1 after`,
			cdfExponential: (exponent) => `F(x) = 1 − e^(${exponent}) for x ⩾ 0`,
			power: 'to the power'
		}
	}
};
