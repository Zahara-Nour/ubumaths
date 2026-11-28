/**
 * Nombres des programmes en blocs (tortue, calcul) : écriture sans exposant, refus de `1e2`,
 * nombre de tours d'une répétition.
 */

// =============================================================================
// Constantes
// =============================================================================

/** Écriture sans exposant (`1e21`, `1e-7` ne se reliraient pas). */
const FORMAT_NOMBRE = new Intl.NumberFormat('en-US', {
	useGrouping: false,
	maximumFractionDigits: 20
});

/** Nombre écrit avec un exposant (`1e2`, `2,5E-3`). */
const AVEC_EXPOSANT = /^[-−]?\d+(?:[.,]\d+)?e[+\-−]?\d+$/i;

/** Écart toléré à l'entier : `0,1 × 30` vaut 3,0000000000000004 en machine. */
const TOLERANCE_ENTIER = 1e-9;

// =============================================================================
// Fonctions
// =============================================================================

/** Écriture d'un nombre sans exposant, virgule décimale, signe `-` du clavier. */
export function ecrireSansExposant(n: number): string {
	return FORMAT_NOMBRE.format(n || 0).replace('.', ',');
}

/**
 * Message de refus d'un nombre écrit avec un exposant (`1e2`), avec son écriture en entier ;
 * null si le mot n'en a pas.
 */
export function messageExposant(ecrit: string): string | null {
	if (!AVEC_EXPOSANT.test(ecrit)) return null;
	const n = Number(ecrit.replace(',', '.').replaceAll('−', '-'));
	const enEntier = Number.isFinite(n) ? ` (${ecrireSansExposant(n).replace('-', '−')})` : '';
	return `« ${ecrit} » : écrire le nombre en entier${enEntier}.`;
}

/**
 * Nombre de tours d'une répétition à partir d'une valeur calculée : entier ≥ 0, à l'arrondi du
 * calcul près ; null sinon (non entier, négatif, infini).
 */
export function toursEntiers(valeur: number): number | null {
	if (!Number.isFinite(valeur)) return null;
	const entier = Math.round(valeur);
	return entier >= 0 && Math.abs(valeur - entier) <= TOLERANCE_ENTIER ? entier : null;
}
