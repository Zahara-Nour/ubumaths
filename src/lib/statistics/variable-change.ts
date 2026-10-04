/**
 * Statistiques — changement de variable d'un nuage (manche 15, PR b)
 *
 * `z = ln(y)` (ou y², √y, 1/y) ajuste z = ax + b ; `t = ln(x)` (ou x², √x,
 * 1/x) ajuste y = at + b. La relation retrouvée entre x et y sert la courbe et
 * les prévisions, avec les coefficients EXACTS de l'ajustement, jamais les
 * arrondis affichés (décision de David). Calcul en décimal : ln et √ sont
 * irrationnels (Q172) ; affichage arrondi une fois.
 *
 * ⚠️ Aucun import `$lib` : voir `statistics/describe`.
 *
 * @module statistics/variable-change
 */

// =============================================================================
// Types
// =============================================================================

/** La fonction appliquée à la variable changée */
export type ChangeFunction = 'ln' | 'square' | 'sqrt' | 'inverse';

/** `z = ln(y)` : `{ variable: 'z', on: 'y', fn: 'ln' }` ; `t` change toujours x */
export interface VariableChange {
	variable: 'z' | 't';
	on: 'x' | 'y';
	fn: ChangeFunction;
}

/** Ajustement affine en décimal de (u ; v) : v = slope·u + intercept */
export interface DecimalFit {
	meanX: number;
	meanY: number;
	slope: number;
	intercept: number;
	/** null si les ordonnées sont toutes égales */
	correlation: number | null;
	/** Étendue des abscisses du nuage D'ORIGINE (interpolation / extrapolation) */
	minX: number;
	maxX: number;
}

// =============================================================================
// Fonctions
// =============================================================================

/** f(v), ou null hors du domaine (ln v ⩽ 0, √ d'un négatif, 1/0) */
export function transformValue(fn: ChangeFunction, v: number): number | null {
	switch (fn) {
		case 'ln':
			return v > 0 ? Math.log(v) : null;
		case 'square':
			return v * v;
		case 'sqrt':
			return v >= 0 ? Math.sqrt(v) : null;
		case 'inverse':
			return v === 0 ? null : 1 / v;
	}
}

/**
 * f⁻¹(w) sur la branche du nuage (`sign` : celle de la variable élevée au
 * carré), ou null si w n'est pas dans l'image de f
 */
function inverseValue(fn: ChangeFunction, w: number, sign: number): number | null {
	switch (fn) {
		case 'ln':
			return Math.exp(w);
		case 'square':
			return w >= 0 ? sign * Math.sqrt(w) : null;
		case 'sqrt':
			return w >= 0 ? w * w : null;
		case 'inverse':
			return w === 0 ? null : 1 / w;
	}
}

/**
 * Signe de la variable élevée au carré (`z = y²`, `t = x²`) : un seul, pour
 * retrouver y = ±√z sans ambiguïté ; sinon le rang (à partir de 1) du premier
 * point de l'autre signe. Des zéros seuls : positif.
 */
export function squaredSign(values: readonly number[]): { sign: 1 | -1 } | { mixed: number } {
	let sign: 1 | -1 | 0 = 0;
	for (let i = 0; i < values.length; i++) {
		const own = Math.sign(values[i]);
		if (own === 0) continue;
		if (sign === 0) sign = own as 1 | -1;
		else if (own !== sign) return { mixed: i + 1 };
	}
	return { sign: sign === 0 ? 1 : sign };
}

/** Moindres carrés en décimal ; null si les abscisses sont toutes égales. */
export function decimalFit(us: readonly number[], vs: readonly number[]): DecimalFit | null {
	const n = us.length;
	const meanX = us.reduce((a, b) => a + b, 0) / n;
	const meanY = vs.reduce((a, b) => a + b, 0) / n;
	let covariance = 0;
	let varianceX = 0;
	let varianceY = 0;
	for (let i = 0; i < n; i++) {
		covariance += (us[i] - meanX) * (vs[i] - meanY);
		varianceX += (us[i] - meanX) ** 2;
		varianceY += (vs[i] - meanY) ** 2;
	}
	// Tester les VALEURS, pas une variance flottante (voir `fitAffine`)
	if (us.every((u) => u === us[0])) return null;
	const slope = covariance / varianceX;
	return {
		meanX,
		meanY,
		slope,
		intercept: meanY - slope * meanX,
		correlation: vs.every((v) => v === vs[0])
			? null
			: covariance / Math.sqrt(varianceX * varianceY),
		minX: Math.min(...us),
		maxX: Math.max(...us)
	};
}

/** y en fonction de x par la relation retrouvée ; null hors du domaine. */
export function relationY(
	change: VariableChange,
	fit: DecimalFit,
	x: number,
	sign: number
): number | null {
	if (change.on === 'y') {
		const y = inverseValue(change.fn, fit.slope * x + fit.intercept, sign);
		return y !== null && Number.isFinite(y) ? y : null;
	}
	const t = transformValue(change.fn, x);
	return t === null ? null : fit.slope * t + fit.intercept;
}

/**
 * x tel que la relation donne y ; null : aucune solution (y hors de l'image,
 * ou pente nulle et y différent de la constante) ; 'all' : pente nulle et y
 * est la constante (tout x du domaine convient).
 */
export function relationX(
	change: VariableChange,
	fit: DecimalFit,
	y: number,
	sign: number
): number | null | 'all' {
	// Le côté « droite » : z = g(y) ou y lui-même
	const right = change.on === 'y' ? transformValue(change.fn, y) : y;
	if (right === null) return null;
	// z = y² : y = sign·√z, un y de l'autre signe n'est pas sur la branche
	if (change.on === 'y' && change.fn === 'square' && y !== 0 && Math.sign(y) !== sign) return null;
	if (fit.slope === 0) return Math.abs(right - fit.intercept) <= 1e-12 ? 'all' : null;
	const left = (right - fit.intercept) / fit.slope;
	if (change.on === 'y') return left;
	return inverseValue(change.fn, left, sign);
}

/** Abscisse où la relation n'est pas définie et part à l'infini, ou null. */
export function relationPole(change: VariableChange, fit: DecimalFit): number | null {
	if (change.fn !== 'inverse') return null;
	if (change.on === 'x') return 0;
	return fit.slope === 0 ? null : -fit.intercept / fit.slope;
}
