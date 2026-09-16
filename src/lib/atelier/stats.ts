/**
 * Atelier — statistiques d'une série et ajustement affine
 *
 * ⚠️ Calculés **ici** et non repris de `.stats` / `.linreg` (décision Q2) :
 * ces commandes rendent du TEXTE — « Moyenne (mean): 12 », sans accent et à
 * moitié en anglais — et le relire est interdit depuis le lot 3, mesures à
 * l'appui. `.stats` ne rend pas non plus l'étendue, que le §4 N2 promet.
 *
 * @module atelier/stats
 */

// =============================================================================
// Types
// =============================================================================

/** Ce qu'on sait dire d'une série de nombres. */
export interface Description {
	readonly count: number;
	readonly mean: number;
	readonly median: number;
	readonly min: number;
	readonly max: number;
	/** `max - min`. Absente de `.stats`, promise par le §4 N2. */
	readonly range: number;
	readonly variance: number;
	readonly deviation: number;
}

/** Ce qu'un ajustement affine a donné. */
export type Fit =
	| {
			readonly ok: true;
			/** `a` dans `y = ax + b`. */
			readonly slope: number;
			/** `b` dans `y = ax + b`. */
			readonly intercept: number;
			/** Coefficient de détermination : ce qui dit si l'ajustement vaut quelque chose. */
			readonly r2: number;
			/** Nombre de paires effectivement utilisées. */
			readonly used: number;
			/** Nombre de valeurs écartées faute de partenaire (§4 L1). */
			readonly ignored: number;
	  }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Décrire une série.
 *
 * ⚠️ **Variance de POPULATION** : la somme des carrés des écarts divisée par
 * `n`, pas par `n − 1`. C'est la variance descriptive du programme français,
 * celle que rend la touche σₓ d'une calculatrice — tranché par David le
 * 2026-09-16.
 *
 * Le moteur, lui, rend l'estimateur d'échantillon : `.stats 12,15,9` affiche un
 * écart-type de 3 là où le panneau affichera ≈ 2,45. Les deux sont justes, ils
 * ne répondent pas à la même question.
 *
 * @returns `null` pour une série vide — une absence, pas une erreur (§4 L2)
 */
export function describeList(values: readonly number[]): Description | null {
	const count = values.length;
	if (count === 0) return null;

	const sorted = [...values].sort((a, b) => a - b);
	const sum = values.reduce((total, value) => total + value, 0);
	const mean = sum / count;

	const middle = Math.floor(count / 2);
	const median = count % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];

	const min = sorted[0];
	const max = sorted[count - 1];

	const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / count;

	return {
		count,
		mean,
		median,
		min,
		max,
		range: max - min,
		variance,
		deviation: Math.sqrt(variance)
	};
}

/**
 * Ajuster `y = ax + b` sur deux séries, par les moindres carrés.
 *
 * ⚠️ Seules les **paires complètes** comptent, et les valeurs écartées sont
 * comptées pour qu'on puisse le dire (§4 L1) : une liste plus longue que
 * l'autre est une situation ordinaire quand on saisit des données, pas une
 * faute.
 */
export function fitAffine(xs: readonly number[], ys: readonly number[]): Fit {
	const used = Math.min(xs.length, ys.length);
	const ignored = Math.max(xs.length, ys.length) - used;

	if (used < 2) {
		return {
			ok: false,
			message: 'Il faut au moins deux points pour ajuster une droite.'
		};
	}

	const x = xs.slice(0, used);
	const y = ys.slice(0, used);
	const meanX = x.reduce((total, value) => total + value, 0) / used;
	const meanY = y.reduce((total, value) => total + value, 0) / used;

	let covariance = 0;
	let varianceX = 0;
	for (let i = 0; i < used; i++) {
		covariance += (x[i] - meanX) * (y[i] - meanY);
		varianceX += (x[i] - meanX) ** 2;
	}

	// Tous les points sur une même verticale : la droite existe, mais elle n'est
	// pas de la forme `y = ax + b`. Le dire vaut mieux qu'un `Infinity` affiché.
	if (varianceX === 0) {
		return {
			ok: false,
			message:
				'Tous les points ont la même abscisse : aucune droite « y = ax + b » ne peut les ajuster.'
		};
	}

	const slope = covariance / varianceX;
	const intercept = meanY - slope * meanX;

	// R² = 1 quand tous les points sont sur la droite. Une série d'ordonnées
	// constantes donne une variance nulle en y : l'ajustement est alors exact,
	// et c'est bien 1 qu'il faut rendre, pas une division par zéro.
	let totalSquares = 0;
	let residualSquares = 0;
	for (let i = 0; i < used; i++) {
		totalSquares += (y[i] - meanY) ** 2;
		residualSquares += (y[i] - (slope * x[i] + intercept)) ** 2;
	}
	const r2 = totalSquares === 0 ? 1 : 1 - residualSquares / totalSquares;

	return { ok: true, slope, intercept, r2, used, ignored };
}
