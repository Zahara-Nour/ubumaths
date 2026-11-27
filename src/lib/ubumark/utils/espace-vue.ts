/**
 * Figures de l'espace — le moteur de vue
 * ======================================
 *
 * Calcul pur : d'où l'on regarde une figure de l'espace, comment ses points se
 * projettent et quelles arêtes sont cachées. Chantier `solides-3d`, ADR 0045.
 *
 * Deux vues, reliées par un seul réglage (`oblique`) :
 * - au repos, la perspective CAVALIÈRE de l'ADR 0034 (`VUE_DE_DEPART`) : face
 *   de devant en vraie grandeur, fuyantes à 45° vers le haut à droite, réduites
 *   de moitié. C'est aussi la seule vue du PDF ;
 * - en rotation, une vue DROITE (projection orthogonale) : le solide garde sa
 *   forme. Elle part de l'angle où les fuyantes tombent exactement là où la
 *   cavalière les dessine (`VUE_DROITE_YAW`, `VUE_DROITE_PITCH`) : le passage
 *   d'une vue à l'autre déplace à peine le dessin.
 *
 * Repère de calcul : x vers la droite, y vers le HAUT, z vers le fond. La
 * rotation se fait autour d'un pivot (le centre du solide), d'abord autour de
 * la verticale (`yaw`), puis autour de l'horizontale de l'écran (`pitch`).
 *
 * À la vue de départ, rien n'est tourné et la projection est celle d'avant le
 * moteur, au chiffre près (`__tests__/espace/solide-scene-figee.test.ts`).
 *
 * @module ubumark/utils/espace-vue
 */

import type { EspacePoint } from './espace-scene';

// ============================================================================
// TYPES
// ============================================================================

export interface Point3 {
	x: number;
	y: number;
	z: number;
}

/** D'où l'on regarde la figure */
export interface EspaceVue {
	/** Tour autour de la verticale, en radians, depuis la vue de départ */
	yaw: number;
	/** Bascule vers le dessus (positif) ou le dessous, en radians, depuis la vue de départ */
	pitch: number;
	/** 1 : perspective cavalière ; 0 : vue droite ; entre les deux : le passage */
	oblique: number;
}

/**
 * Bascule que le dessin ajoute à celle de la vue (`pitch`), en radians : au
 * repos (`oblique` 1) et dans la vue droite (`oblique` 0). `turnVue` s'en sert
 * pour arrêter la figure à la vue de dessus et à la vue de dessous.
 */
export interface VueTilt {
	atRest: number;
	straight: number;
}

/** Une vue prête à l'emploi */
export interface VueProjection {
	/** Vers l'œil, dans le repère tourné : deux points alignés sur cette direction se confondent au dessin */
	toEye: Point3;
	/** Le point tourné autour du pivot (repère de calcul) */
	rotate(p: Point3): Point3;
	/** Le point tourné puis projeté (y vers le HAUT) */
	project(p: Point3): EspacePoint;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Déport des fuyantes pour une profondeur de 1 : 0,5 × arête, à 45° */
const DEPTH_SHIFT = 0.5 * Math.SQRT1_2;

/** La vue au repos et au PDF : la perspective cavalière, rien de tourné */
export const VUE_DE_DEPART: EspaceVue = { yaw: 0, pitch: 0, oblique: 1 };

/**
 * Angles de la vue droite « de départ » : ceux où une profondeur de 1 se
 * projette en (DEPTH_SHIFT, DEPTH_SHIFT), comme en cavalière
 */
export const VUE_DROITE_YAW = Math.asin(DEPTH_SHIFT);
export const VUE_DROITE_PITCH = Math.asin(DEPTH_SHIFT / Math.cos(VUE_DROITE_YAW));

/** Bascule des polyèdres : aucune en cavalière, celle de la vue droite ensuite */
export const VUE_TILT: VueTilt = { atRest: 0, straight: VUE_DROITE_PITCH };

// ============================================================================
// FONCTIONS
// ============================================================================

/** La projection d'une vue ; la figure tourne autour de `pivot` */
export function vueProjection(vue: EspaceVue, pivot: Point3): VueProjection {
	const yaw = vue.yaw + (1 - vue.oblique) * VUE_DROITE_YAW;
	const pitch = vue.pitch + (1 - vue.oblique) * VUE_DROITE_PITCH;
	const shift = vue.oblique * DEPTH_SHIFT;
	const still = yaw === 0 && pitch === 0;
	const cy = Math.cos(yaw);
	const sy = Math.sin(yaw);
	const cp = Math.cos(pitch);
	const sp = Math.sin(pitch);

	const rotate = (p: Point3): Point3 => {
		// Rien de tourné : le point lui-même, sans aller-retour par le pivot (chiffres intacts)
		if (still) return p;
		const x = p.x - pivot.x;
		const y = p.y - pivot.y;
		const z = p.z - pivot.z;
		const x1 = x * cy + z * sy;
		const z1 = -x * sy + z * cy;
		return {
			x: pivot.x + x1,
			y: pivot.y + y * cp + z1 * sp,
			z: pivot.z - y * sp + z1 * cp
		};
	};
	return {
		toEye: { x: shift, y: shift, z: -1 },
		rotate,
		project: (p) => {
			const r = rotate(p);
			return { x: r.x + r.z * shift, y: r.y + r.z * shift };
		}
	};
}

/**
 * La vue tournée de `dyaw` et `dpitch` (radians). Glisser vers la droite
 * (`dyaw` négatif) amène la face de gauche devant ; glisser vers le bas
 * (`dpitch` positif) montre le dessus. La bascule s'arrête à la vue de dessus
 * et à la vue de dessous : le haut reste en haut, dans la vue en cours comme
 * dans la vue droite vers laquelle elle passe (`oblique` qui descend vers 0
 * ajoute de la bascule vers le dessus). Le tour est ramené entre −π et π.
 * `tilt` : la bascule que le dessin ajoute (polyèdres par défaut ; un solide
 * rond a la sienne, `SOLIDE_ROUND_TILT`).
 */
export function turnVue(
	vue: EspaceVue,
	dyaw: number,
	dpitch: number,
	tilt: VueTilt = VUE_TILT
): EspaceVue {
	const limit = Math.PI / 2;
	const now = vue.oblique * tilt.atRest + (1 - vue.oblique) * tilt.straight;
	const pitch = Math.max(
		-limit - Math.min(now, tilt.straight),
		Math.min(limit - Math.max(now, tilt.straight), vue.pitch + dpitch)
	);
	const yaw = vue.yaw + dyaw;
	return { ...vue, yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)), pitch };
}

/**
 * La face tourne-t-elle vers l'œil ? `face` : ses sommets tournés (au moins
 * trois, dans l'ordre du tour) ; `center` : le centre tourné du solide, qui dit
 * où est l'extérieur. Vue de face ou par la tranche : oui (seuil absolu : la
 * normale grandit comme l'aire de la face, sûr pour des dimensions ≤ 1000,
 * la limite du parseur).
 */
export function faceTowardEye(face: Point3[], center: Point3, toEye: Point3): boolean {
	const [a, b, c] = face;
	const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
	const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
	let normal = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
	const middle = {
		x: face.reduce((s, p) => s + p.x, 0) / face.length,
		y: face.reduce((s, p) => s + p.y, 0) / face.length,
		z: face.reduce((s, p) => s + p.z, 0) / face.length
	};
	const outward =
		normal.x * (middle.x - center.x) +
		normal.y * (middle.y - center.y) +
		normal.z * (middle.z - center.z);
	if (outward < 0) normal = { x: -normal.x, y: -normal.y, z: -normal.z };
	return normal.x * toEye.x + normal.y * toEye.y + normal.z * toEye.z > -1e-9;
}

/**
 * Pour chaque arête d'un polyèdre CONVEXE, est-elle cachée ? Une arête est
 * cachée quand toutes ses faces tournent le dos à l'œil. `vertices` : les
 * sommets dans l'espace, non tournés.
 */
export function hiddenEdges(
	vertices: Point3[],
	faces: number[][],
	edges: [number, number][],
	view: VueProjection
): boolean[] {
	const turned = vertices.map(view.rotate);
	const center = {
		x: turned.reduce((s, p) => s + p.x, 0) / turned.length,
		y: turned.reduce((s, p) => s + p.y, 0) / turned.length,
		z: turned.reduce((s, p) => s + p.z, 0) / turned.length
	};
	const seen = faces.map((face) =>
		faceTowardEye(
			face.map((i) => turned[i]),
			center,
			view.toEye
		)
	);
	return edges.map(([a, b]) =>
		faces.every((face, i) => !(face.includes(a) && face.includes(b)) || !seen[i])
	);
}

/** Un morceau de droite, entre deux paramètres de 0 (un bout) à 1 (l'autre) */
export interface Stretch {
	from: number;
	to: number;
	/** Une face du solide passe devant ce morceau */
	hidden: boolean;
}

/** Part de la taille du solide en dessous de laquelle deux longueurs se confondent */
const SOLID_EPSILON = 1e-9;

const minus = (a: Point3, b: Point3): Point3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scalar = (a: Point3, b: Point3) => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * Les plans des faces d'un polyèdre convexe : normale unitaire sortante et
 * `offset` tel qu'un point p du solide vérifie normale · p ≤ offset
 */
function facePlanes(vertices: Point3[], faces: number[][]): { normal: Point3; offset: number }[] {
	const center = {
		x: vertices.reduce((s, p) => s + p.x, 0) / vertices.length,
		y: vertices.reduce((s, p) => s + p.y, 0) / vertices.length,
		z: vertices.reduce((s, p) => s + p.z, 0) / vertices.length
	};
	return faces.map((face) => {
		const [a, b, c] = face.map((i) => vertices[i]);
		const u = minus(b, a);
		const v = minus(c, a);
		let normal = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
		const length =
			Math.hypot(normal.x, normal.y, normal.z) * (scalar(normal, minus(a, center)) < 0 ? -1 : 1);
		normal = { x: normal.x / length, y: normal.y / length, z: normal.z / length };
		return { normal, offset: scalar(normal, a) };
	});
}

/** Plus grande distance entre le centre et un sommet : l'ordre de grandeur du solide */
function solidSize(vertices: Point3[]): number {
	const xs = vertices.map((p) => p.x);
	const ys = vertices.map((p) => p.y);
	const zs = vertices.map((p) => p.z);
	return Math.hypot(
		Math.max(...xs) - Math.min(...xs),
		Math.max(...ys) - Math.min(...ys),
		Math.max(...zs) - Math.min(...zs)
	);
}

/**
 * La corde d'une droite dans un polyèdre CONVEXE : les paramètres t de
 * a + t (b − a) où la droite entre dans le solide et où elle en sort. `a` et
 * `b` sont deux points distincts du solide (sommets, milieux, centres) : la
 * corde contient toujours [0, 1].
 */
export function chordInSolid(
	vertices: Point3[],
	faces: number[][],
	a: Point3,
	b: Point3
): [number, number] {
	const direction = minus(b, a);
	const epsilon = solidSize(vertices) * SOLID_EPSILON;
	let from = -Infinity;
	let to = Infinity;
	for (const { normal, offset } of facePlanes(vertices, faces)) {
		const along = scalar(normal, direction);
		// Droite parallèle à la face : ce plan ne la coupe pas (a et b sont dans le solide)
		if (Math.abs(along) < epsilon) continue;
		const t = (offset - scalar(normal, a)) / along;
		if (along > 0) to = Math.min(to, t);
		else from = Math.max(from, t);
	}
	// a et b sont dans le solide, aux arrondis près
	return [Math.min(from, 0), Math.max(to, 1)];
}

/**
 * Le segment [from, to] (dans l'espace, non tourné) découpé en morceaux cachés
 * ou visibles par un polyèdre CONVEXE plein : un point est caché quand, en
 * allant de lui vers l'œil, on traverse le solide — dedans, ou dehors mais
 * derrière. Posé sur une face tournée vers l'œil, il se voit ; sur une face du
 * fond, non. Les morceaux se suivent de 0 à 1 et alternent.
 */
export function hiddenStretches(
	vertices: Point3[],
	faces: number[][],
	edges: [number, number][],
	from: Point3,
	to: Point3,
	view: VueProjection
): Stretch[] {
	const turned = vertices.map(view.rotate);
	const start = view.rotate(from);
	const direction = minus(view.rotate(to), start);
	const planes = facePlanes(turned, faces);
	const size = solidSize(turned);
	const epsilon = size * SOLID_EPSILON;
	const at = (t: number): Point3 => ({
		x: start.x + direction.x * t,
		y: start.y + direction.y * t,
		z: start.z + direction.z * t
	});
	const eyeLength = Math.hypot(view.toEye.x, view.toEye.y, view.toEye.z);
	const toEye = {
		x: view.toEye.x / eyeLength,
		y: view.toEye.y / eyeLength,
		z: view.toEye.z / eyeLength
	};

	/** En allant de p vers l'œil, traverse-t-on le solide sur une vraie longueur ? */
	const hiddenAt = (p: Point3): boolean => {
		let enter = 0;
		let leave = Infinity;
		for (const { normal, offset } of planes) {
			const along = scalar(normal, toEye);
			const room = offset - scalar(normal, p);
			if (Math.abs(along) < SOLID_EPSILON) {
				// Rayon parallèle à la face : du bon côté ou jamais
				if (room < -epsilon) return false;
				continue;
			}
			if (along > 0) leave = Math.min(leave, room / along);
			else enter = Math.max(enter, room / along);
		}
		return leave - enter > size * 1e-7;
	};

	// Où le morceau peut changer d'état : là où la droite traverse le plan d'une
	// face, et là où son dessin croise celui d'une arête
	const cuts = [0, 1];
	for (const { normal, offset } of planes) {
		const along = scalar(normal, direction);
		if (Math.abs(along) < epsilon) continue;
		cuts.push((offset - scalar(normal, start)) / along);
	}
	const flat = (p: Point3): EspacePoint => ({
		x: p.x - (p.z * toEye.x) / toEye.z,
		y: p.y - (p.z * toEye.y) / toEye.z
	});
	const p0 = flat(start);
	const d = flat(direction);
	for (const [i, j] of edges) {
		const q0 = flat(turned[i]);
		const q1 = flat(turned[j]);
		const e = { x: q1.x - q0.x, y: q1.y - q0.y };
		const det = d.x * e.y - d.y * e.x;
		// Dessins parallèles (ou droite vue par le bout) : pas de croisement
		if (Math.abs(det) < epsilon * size) continue;
		const wx = q0.x - p0.x;
		const wy = q0.y - p0.y;
		const u = (wx * d.y - wy * d.x) / det;
		if (u < -1e-9 || u > 1 + 1e-9) continue;
		cuts.push((wx * e.y - wy * e.x) / det);
	}
	const sorted = cuts.filter((t) => t >= 0 && t <= 1).sort((a, b) => a - b);

	const stretches: Stretch[] = [];
	for (let k = 1; k < sorted.length; k++) {
		const a = sorted[k - 1];
		const b = sorted[k];
		// Deux coupes au même endroit (la droite passe par un sommet) : rien entre elles
		if (b - a < 1e-9) continue;
		const hidden = hiddenAt(at((a + b) / 2));
		const last = stretches[stretches.length - 1];
		if (last !== undefined && last.hidden === hidden) last.to = b;
		else stretches.push({ from: last?.to ?? 0, to: b, hidden });
	}
	if (stretches.length === 0) return [{ from: 0, to: 1, hidden: hiddenAt(at(0.5)) }];
	stretches[stretches.length - 1].to = 1;
	return stretches;
}
