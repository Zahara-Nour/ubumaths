/**
 * Géométrie de la spirale de π de la page d'erreur.
 *
 * Les chiffres s'enroulent vers le centre sur une spirale logarithmique : à
 * chaque tour, le rayon est multiplié par `shrinkPerTurn`, et la taille des
 * chiffres suit le rayon. L'angle entre deux chiffres reste donc constant, et
 * l'écart entre deux tours reste proportionnel à la taille des chiffres : rien ne
 * se chevauche, du premier tour au dernier.
 *
 * Coordonnées en unités du `viewBox` (centre en 0, 0). Chaque chiffre est posé
 * en (0, -r) puis tourné de `rotate` degrés autour du centre : sa base reste
 * tangente à la spirale et il regarde vers l'extérieur.
 *
 * @module lib/error-page/pi-spiral
 */

export interface SpiralGlyph {
	char: string;
	/** Rotation autour du centre, en degrés (sens horaire). */
	rotate: number;
	/** Ordonnée avant rotation : −rayon. */
	y: number;
	/** Taille de police, en unités du `viewBox`. */
	size: number;
	/** Chiffre du code d'erreur, mis en couleur. */
	highlighted: boolean;
}

export interface SpiralOptions {
	/** Rayon du premier chiffre (le « 3 »). */
	outerRadius: number;
	/** Rayon en dessous duquel on s'arrête : la place du centre. */
	innerRadius: number;
	glyphsPerTurn: number;
	/** Rapport des rayons d'un tour au suivant (< 1). */
	shrinkPerTurn: number;
	/** Taille de police / rayon. */
	sizeRatio: number;
	/** Angle du « 3 », en degrés depuis midi. */
	startAngle: number;
}

/**
 * Réglages retenus pour un `viewBox` de −500 à 500 : le 404 (1 272ᵉ décimale)
 * tombe vers la mi-rayon, encore lisible, et la spirale s'arrête autour d'un
 * disque central de rayon 150.
 */
export const DEFAULT_SPIRAL_OPTIONS: SpiralOptions = {
	outerRadius: 455,
	innerRadius: 150,
	glyphsPerTurn: 125,
	shrinkPerTurn: 0.92,
	sizeRatio: 0.08,
	startAngle: -50
};

/** Écart, en places de chiffre, entre la virgule et ses voisins. */
const COMMA_GAP = 0.6;

/**
 * Les glyphes de la spirale : « 3 », « , », puis les décimales.
 *
 * @param decimals Décimales de π après la virgule.
 * @param highlightPosition Rang (1 = première décimale) du premier chiffre du
 *   code à mettre en couleur, sur 3 chiffres ; `null` pour ne rien colorer.
 */
export function spiralGlyphs(
	decimals: string,
	highlightPosition: number | null,
	options: SpiralOptions = DEFAULT_SPIRAL_OPTIONS
): SpiralGlyph[] {
	const { outerRadius, innerRadius, glyphsPerTurn, shrinkPerTurn, sizeRatio, startAngle } = options;
	const chars = ['3', ',', ...decimals];
	// Nombre de glyphes avant de passer sous le rayon intérieur
	const turns = Math.log(innerRadius / outerRadius) / Math.log(shrinkPerTurn);
	const count = Math.min(chars.length, Math.floor(turns * glyphsPerTurn) + 1);

	// La décimale de rang p est le glyphe d'indice p + 1 (après « 3 » et « , »)
	const firstHighlighted = highlightPosition === null ? -1 : highlightPosition + 1;

	// Avancée le long de la spirale, en places de chiffre : la virgule, étroite,
	// n'en occupe qu'une partie, sinon « 3 , 14 » paraît troué
	let slot = 0;
	return chars.slice(0, count).map((char, i) => {
		if (i > 0) slot += char === ',' || chars[i - 1] === ',' ? COMMA_GAP : 1;
		const radius = outerRadius * shrinkPerTurn ** (slot / glyphsPerTurn);
		return {
			char,
			rotate: round(startAngle + (360 * slot) / glyphsPerTurn),
			y: round(-radius),
			size: round(sizeRatio * radius),
			highlighted: firstHighlighted > 0 && i >= firstHighlighted && i < firstHighlighted + 3
		};
	});
}

function round(x: number): number {
	return Math.round(x * 10) / 10;
}
