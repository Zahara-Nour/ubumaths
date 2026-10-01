/**
 * Statistiques — ajustement affine de deux séries
 *
 * **La** source de l'ajustement : l'atelier (vue Données) et le moteur
 * (`.linreg` / `.ajustement`) l'appellent. Déplacé de `atelier/stats.ts`
 * (chantier outils statistiques, lot 1).
 *
 * ⚠️ Aucun import `$lib` : voir `statistics/describe`.
 *
 * @module statistics/fit
 */

// =============================================================================
// Types
// =============================================================================

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

	if (![...x, ...y].every(Number.isFinite)) {
		return { ok: false, message: "Une valeur n'est pas un nombre fini : impossible d'ajuster." };
	}
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
	// ⚠️ Tester les VALEURS, pas `varianceX === 0` : pour 0,1 ; 0,1 ; 0,1 la
	// moyenne flottante vaut 0,10000000000000002 et la variance ≈ 6e-34 passait
	// le garde, avec une pente absurde à la clé.
	if (isConstant(x)) {
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
	// ⚠️ Même piège que pour les abscisses : 0,1 ; 0,1 ; 0,1 laissait
	// `totalSquares` ≈ 6e-34 et rendait R² = 0.
	const r2 = isConstant(y) ? 1 : 1 - residualSquares / totalSquares;

	return { ok: true, slope, intercept, r2, used, ignored };
}

function isConstant(values: readonly number[]): boolean {
	return values.every((value) => value === values[0]);
}
