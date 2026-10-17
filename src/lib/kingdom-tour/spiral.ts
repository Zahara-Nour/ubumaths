/**
 * La gidouille de Sandomir : une spirale d'Archimède, de l'extérieur vers le Trône Royal,
 * le long de laquelle s'égrènent les Provinces (Compendium § II : « Sandomir est une ville
 * en spirale […]. Le Trône Royal se trouve au centre de la spirale »).
 *
 * Calcul pur : la carte en tire son tracé et la position de chaque Province.
 *
 * @module kingdom-tour/spiral
 */

// Types

export interface SpiralPoint {
	x: number;
	y: number;
}

export interface SpiralStop extends SpiralPoint {
	/** Part du tracé parcourue en arrivant ici, entre 0 et 1 */
	progress: number;
}

export interface Spiral {
	/** Chemin SVG, du bord vers le centre */
	d: string;
	/** Une étape par Province, également espacées le long du tracé */
	stops: SpiralStop[];
	/** Le centre : le Trône Royal (progress = 1) */
	center: SpiralPoint;
}

export interface SpiralOptions {
	/** Côté du carré `viewBox` */
	size: number;
	/** Nombre de tours */
	turns: number;
	/** Rayon au centre (le Trône) et au bord */
	innerRadius: number;
	outerRadius: number;
	/** Nombre d'étapes à placer */
	stops: number;
	/** Finesse du tracé (points par tour) */
	pointsPerTurn?: number;
}

// Functions

const round = (n: number): number => Math.round(n * 10) / 10;

/**
 * Le tracé part du bord (angle maximal) et s'enroule jusqu'au centre. Les étapes sont
 * placées à k / (n + 1) de la longueur totale (k = 1…n) : la dernière part du tracé mène
 * au Trône, qui n'est pas une Province.
 */
export function buildSpiral(options: SpiralOptions): Spiral {
	const { size, turns, innerRadius, outerRadius, stops, pointsPerTurn = 72 } = options;
	const c = size / 2;
	const maxAngle = turns * 2 * Math.PI;
	const count = Math.max(2, Math.round(turns * pointsPerTurn));

	// Du bord (t = 0) vers le centre (t = 1), dans le sens des aiguilles d'une montre ;
	// l'angle de départ −π/2 met l'entrée en haut
	const points: SpiralPoint[] = [];
	for (let i = 0; i <= count; i++) {
		const t = i / count;
		const angle = -Math.PI / 2 + maxAngle * t;
		const radius = outerRadius - (outerRadius - innerRadius) * t;
		points.push({ x: c + radius * Math.cos(angle), y: c + radius * Math.sin(angle) });
	}

	// Longueurs cumulées, pour placer les étapes à intervalles réguliers sur le tracé
	const lengths = [0];
	for (let i = 1; i < points.length; i++) {
		const dx = points[i].x - points[i - 1].x;
		const dy = points[i].y - points[i - 1].y;
		lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
	}
	const total = lengths[lengths.length - 1];

	const stopList: SpiralStop[] = [];
	for (let k = 1; k <= stops; k++) {
		const progress = k / (stops + 1);
		const target = progress * total;
		let i = lengths.findIndex((l) => l >= target);
		if (i <= 0) i = 1;
		const span = lengths[i] - lengths[i - 1] || 1;
		const f = (target - lengths[i - 1]) / span;
		stopList.push({
			x: round(points[i - 1].x + (points[i].x - points[i - 1].x) * f),
			y: round(points[i - 1].y + (points[i].y - points[i - 1].y) * f),
			progress
		});
	}

	const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`).join(' ');
	const last = points[points.length - 1];
	return { d, stops: stopList, center: { x: round(last.x), y: round(last.y) } };
}

// Carte des Provinces

/** Réglage de la carte, cherché par calcul (2026-10-11) : voir `spiral.test.ts` */
export const PROVINCE_MAP = {
	size: 400,
	turns: 1.5,
	innerRadius: 0,
	outerRadius: 160,
	/** Largeur approchée d'une lettre en Lora 15 px */
	charWidth: 8.4,
	/** Écart entre une étape et son nom */
	labelGap: 20
} as const;

export interface SpiralLabel {
	x: number;
	y: number;
	anchor: 'start' | 'end';
}

/**
 * Le nom d'une étape, à côté d'elle : du côté extérieur de la spirale, sauf s'il sortirait
 * du cadre (il passe alors de l'autre côté de l'étape).
 */
export function placeLabel(stop: SpiralPoint, name: string, size: number): SpiralLabel {
	const width = name.length * PROVINCE_MAP.charWidth;
	const gap = PROVINCE_MAP.labelGap;
	const outward = stop.x >= size / 2 ? 'start' : 'end';
	const fits = outward === 'start' ? stop.x + gap + width <= size : stop.x - gap - width >= 0;
	const anchor = fits ? outward : outward === 'start' ? 'end' : 'start';
	return { x: stop.x + (anchor === 'start' ? gap : -gap), y: stop.y + 5, anchor };
}
