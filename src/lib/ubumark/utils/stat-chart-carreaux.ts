/**
 * Histogramme — quadrillage en carreaux
 * =====================================
 *
 * Amplitudes inégales (ou `légende:`) : l'AIRE porte l'effectif (Q26). Un
 * carreau a pour largeur le PGCD des amplitudes, et vaut `value` données ; un
 * rectangle a pour hauteur, en carreaux, `effectif × carreau / amplitude / value`.
 *
 * Partagé par le parseur (qui REFUSE un quadrillage démesuré, avec un message
 * situé) et par la scène (qui le dessine) : une seule règle. Sans plafond, deux
 * classes d'amplitudes 1 et 10^9 demandaient 10^9 lignes et tuaient le
 * processus (revue du lot 3).
 *
 * @module ubumark/utils/stat-chart-carreaux
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ClassBox {
	readonly lower: number;
	readonly upper: number;
	readonly count: number;
}

export interface CarreauGrid {
	/** Largeur d'un carreau, dans l'unité des classes */
	width: number;
	/** Données représentées par un carreau */
	value: number;
	/** Hauteur de chaque rectangle, en carreaux */
	heights: number[];
	/** Carreaux en largeur (toute la série) et en hauteur (arrondi au-dessus) */
	columns: number;
	rows: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Au plus autant de carreaux en largeur comme en hauteur */
export const CARREAUX_MAX = 60;

/** Hauteur visée du plus haut rectangle, en carreaux, quand la valeur est automatique */
const CARREAUX_TARGET_MAX = 12;

/** Valeurs « simples » d'un carreau, à une puissance de 10 près */
const NICE_MULTIPLIERS = [1, 2, 2.5, 5] as const;

/** Précision du PGCD : les bornes ont au plus 4 décimales (parseur) */
const GCD_SCALE = 1e4;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Quadrillage plutôt qu'axe gradué : amplitudes inégales, ou légende imposée. */
export function usesCarreaux(classes: readonly ClassBox[], hasLegend: boolean): boolean {
	if (hasLegend) return true;
	const first = classes[0].upper - classes[0].lower;
	return classes.some((c) => Math.abs(c.upper - c.lower - first) > 1e-9 * Math.abs(first));
}

/** PGCD de décimaux à 4 décimales au plus. */
function decimalGcd(values: readonly number[]): number {
	const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
	const scaled = values.map((value) => Math.round(value * GCD_SCALE));
	return scaled.reduce((acc, value) => gcd(acc, value)) / GCD_SCALE;
}

/** Plus petite valeur simple (1, 2, 2,5, 5 × 10^k) pour que `max / valeur` ≤ cible. */
function niceCarreauValue(maxDensity: number): number {
	const ideal = maxDensity / CARREAUX_TARGET_MAX;
	let power = 10 ** Math.floor(Math.log10(ideal));
	for (;;) {
		for (const multiplier of NICE_MULTIPLIERS) {
			const candidate = multiplier * power;
			if (candidate >= ideal - 1e-12) return candidate;
		}
		power *= 10;
	}
}

/**
 * Le quadrillage d'un histogramme, ou pourquoi il serait démesuré.
 *
 * @param legendValue `légende: 1 carreau = N`, sinon null (valeur automatique)
 */
export function carreauGrid(
	classes: readonly ClassBox[],
	legendValue: number | null
): { ok: true; grid: CarreauGrid } | { ok: false; message: string } {
	const widths = classes.map((c) => c.upper - c.lower);
	const width = decimalGcd(widths);
	const span = classes[classes.length - 1].upper - classes[0].lower;
	const columns = width > 0 ? Math.round(span / width) : Infinity;
	if (columns > CARREAUX_MAX) {
		return {
			ok: false,
			message: `amplitudes sans diviseur commun assez grand : il faudrait ${Number.isFinite(columns) ? columns : 'trop de'} carreaux de large (au plus ${CARREAUX_MAX})`
		};
	}

	const densities = classes.map((c, i) => (c.count * width) / widths[i]);
	const value = legendValue ?? niceCarreauValue(Math.max(...densities) || 1);
	const heights = densities.map((density) => density / value);
	const rows = Math.max(1, Math.ceil(Math.max(...heights) - 1e-9));
	if (rows > CARREAUX_MAX) {
		return {
			ok: false,
			message: `un carreau vaut trop peu : il faudrait ${rows} carreaux de haut (au plus ${CARREAUX_MAX})`
		};
	}
	return { ok: true, grid: { width, value, heights, columns, rows } };
}
