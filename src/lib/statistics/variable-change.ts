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

import { readExactValue, toSafeNumber } from './bivariate';

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
// Constantes
// =============================================================================

/**
 * Au-delà, une valeur calculée n'est ni écrite ni dessinée : e^4001 déborde
 * en Infinity, et une valeur finie comme e^41 ≈ 6,4 × 10^17 donnerait un cadre
 * qui écrase le nuage (revue) — même borne que les nombres écrits (15 chiffres).
 */
export const MAX_COMPUTED_VALUE = 1e15;

/**
 * Changements de variable (Q170), tels que l'auteur les écrit, et leurs
 * variantes (`y^2`, `sqrt(y)`), espaces retirées. Partagés par le bloc
 * ```nuage et la commande `.ajustement` (PR c).
 */
const VARIABLE_CHANGES: { written: string; spellings: string[]; change: VariableChange }[] = (
	[
		['ln', (v: string) => [`ln(${v})`]],
		['square', (v: string) => [`${v}²`, `${v}^2`]],
		['sqrt', (v: string) => [`√${v}`, `√(${v})`, `sqrt(${v})`]],
		['inverse', (v: string) => [`1/${v}`]]
	] as const
).flatMap(([fn, spell]) =>
	(
		[
			['z', 'y'],
			['t', 'x']
		] as const
	).map(([variable, on]) => ({
		written: `${variable} = ${spell(on)[0]}`,
		spellings: spell(on).map((form) => `${variable}=${form}`),
		change: { variable, on, fn }
	}))
);

/** Les huit formes, pour les messages : les quatre en z, puis les quatre en t */
export const VARIABLE_CHANGE_LIST = [
	...VARIABLE_CHANGES.filter((c) => c.change.variable === 'z'),
	...VARIABLE_CHANGES.filter((c) => c.change.variable === 't')
]
	.map((c) => c.written)
	.join(', ');

// =============================================================================
// Fonctions
// =============================================================================

/** `z = ln(y)`, `t=x^2`, `Z = SQRT(y)` : un des huit changements de variable, ou null */
export function readVariableChange(text: string): VariableChange | null {
	const compact = text.replace(/\s+/g, '').toLowerCase();
	return VARIABLE_CHANGES.find((c) => c.spellings.includes(compact))?.change ?? null;
}

/** Écriture d'une fonction dans les messages : `ln(y)`, `y²`, `√y`, `1/y` */
function changeName(change: VariableChange): string {
	return VARIABLE_CHANGES.find(
		(c) => c.change.fn === change.fn && c.change.on === change.on
	)!.written.split(' = ')[1];
}

/**
 * Une valeur interdite par le changement de variable, avec le point
 * (« ln(y) : y = −2 au point 3 n’est pas strictement positif »), ou null.
 * `texts` : les valeurs telles qu'écrites, toutes lisibles par `readExactValue`.
 */
export function changeDomainProblem(
	change: VariableChange,
	texts: readonly string[]
): string | null {
	const name = changeName(change);
	const values = texts.map((text) => toSafeNumber(readExactValue(text)!));
	if (change.fn === 'square') {
		const signs = squaredSign(values);
		return 'mixed' in signs
			? `${name} : ${change.on} change de signe au point ${signs.mixed} (une seule branche de √ possible)`
			: null;
	}
	const index = values.findIndex((v) => transformValue(change.fn, v) === null);
	if (index === -1) return null;
	const reason =
		change.fn === 'ln'
			? 'n’est pas strictement positif'
			: change.fn === 'sqrt'
				? 'est négatif'
				: 'est nul';
	return `${name} : ${change.on} = ${texts[index]} au point ${index + 1} ${reason}`;
}

/** Une valeur calculée : finie et pas trop grande, sinon 'overflow' */
function computed(value: number): number | 'overflow' {
	return Number.isFinite(value) && Math.abs(value) <= MAX_COMPUTED_VALUE ? value : 'overflow';
}

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

/**
 * y en fonction de x par la relation retrouvée ; null hors du domaine ;
 * 'overflow' : définie, mais trop grande pour être calculée (e^4001).
 */
export function relationY(
	change: VariableChange,
	fit: DecimalFit,
	x: number,
	sign: number
): number | null | 'overflow' {
	if (change.on === 'y') {
		const y = inverseValue(change.fn, fit.slope * x + fit.intercept, sign);
		return y === null ? null : computed(y);
	}
	const t = transformValue(change.fn, x);
	return t === null ? null : computed(fit.slope * t + fit.intercept);
}

/**
 * x tel que la relation donne y. null : aucune solution, y hors de l'image
 * (testé AVANT la pente : la raison dite est la bonne) ; 'flat' : pente nulle
 * et y différent de la constante ; 'all' : pente nulle et y est la constante ;
 * 'overflow' : x existe mais est trop grand pour être calculé (e^999).
 */
export function relationX(
	change: VariableChange,
	fit: DecimalFit,
	y: number,
	sign: number
): number | null | 'all' | 'flat' | 'overflow' {
	// Le côté « droite » : z = g(y) ou y lui-même
	const right = change.on === 'y' ? transformValue(change.fn, y) : y;
	if (right === null) return null;
	// z = y² : y = sign·√z, un y de l'autre signe n'est pas sur la branche
	if (change.on === 'y' && change.fn === 'square' && y !== 0 && Math.sign(y) !== sign) return null;
	if (fit.slope === 0) return Math.abs(right - fit.intercept) <= 1e-12 ? 'all' : 'flat';
	const left = (right - fit.intercept) / fit.slope;
	if (change.on === 'y') return computed(left);
	const x = inverseValue(change.fn, left, sign);
	return x === null ? null : computed(x);
}

/** Abscisse où la relation n'est pas définie et part à l'infini, ou null. */
export function relationPole(change: VariableChange, fit: DecimalFit): number | null {
	if (change.fn !== 'inverse') return null;
	if (change.on === 'x') return 0;
	return fit.slope === 0 ? null : -fit.intercept / fit.slope;
}
