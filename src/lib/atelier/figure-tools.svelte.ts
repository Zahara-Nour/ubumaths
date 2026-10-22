/**
 * Atelier — la barre d'outils de la vue Géométrie (géométrie, lot 3, PR 2 et 3)
 *
 * Phase 0 : `docs/archive/wip/atelier-geometrie-lot3-phase0.md`, M3, M4, M5, M7. Chaque
 * outil ÉCRIT la ligne qu'on aurait tapée (G2) — un clic avec
 * « Point » écrit `A = (1,5 ; 2)`, deux clics avec « Segment » écrivent
 * `d = [AB]` : tout ce qui se fait à la souris se relit, se rejoue et s'annule
 * comme le clavier. La boîte ne crée donc rien elle-même : elle passe ses
 * lignes à `write` (la console), et n'avance que si la ligne a réussi.
 *
 * M5 : un outil qui attend un point réutilise le point visé ; sinon, un clic à
 * la rencontre de deux objets écrit leur `intersection`, un clic sur un objet
 * un `point_sur` à la position du clic, et un clic dans le vide un point par
 * coordonnées. La toile dit ce qui est proche du clic (`ToolNear`) ; la boîte
 * calcule elle-même sur l'atelier (`supportNamed`, `commonPoints`).
 *
 * @module atelier/figure-tools
 */

import type { Atelier } from './atelier.svelte';
import { supportNamed } from './construction';
import { commonPoints, type Support } from './construction-intersect';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import type { GeoPoint } from '$lib/geometry-core/types/primitives';
import { displayName, indexedNameClash, RESERVED_NAMES } from './names';
import { draggedCoordinates, positionAt, positionWithin } from './point-drag';
import type { ObjectKind } from './types';

// =============================================================================
// Types
// =============================================================================

/** Les outils du lot 3 (M3) : Déplacer, les outils de base, puis ceux de construction. */
export type FigureTool =
	| 'deplacer'
	| 'point'
	| 'segment'
	| 'droite'
	| 'demi-droite'
	| 'cercle'
	| 'milieu'
	| 'intersection'
	| 'point-sur'
	| 'parallele'
	| 'perpendiculaire';

/** Écrire une ligne dans la console ; vrai si elle a réussi (son objet existe). */
export type ToolWriter = (line: string) => boolean;

/**
 * Ce que la toile voit près d'un clic (M5) : les objets de l'atelier (droites,
 * cercles, courbes, fonctions) à moins de `radius`, le plus proche d'abord ;
 * `radius` en unités du repère (8 px à la souris, 20 px au doigt).
 */
export interface ToolNear {
	readonly objects: readonly string[];
	readonly radius: number;
	/** La taille d'un pixel, en unités : ce que suit le déplacement fluide (absente : aimanté). */
	readonly pixel?: number;
}

/** Un outil à deux points : la ligne écrite une fois les deux points choisis. */
type TwoPointTool = 'segment' | 'droite' | 'demi-droite' | 'cercle' | 'milieu';

/** Parallèle ou perpendiculaire : une droite et un point, dans un ordre ou dans l'autre. */
type DirectionTool = 'parallele' | 'perpendiculaire';

// =============================================================================
// Constantes
// =============================================================================

/** Les outils, dans l'ordre de la barre (M3), avec leur nom affiché. */
export const FIGURE_TOOLS: readonly { readonly id: FigureTool; readonly label: string }[] = [
	{ id: 'deplacer', label: 'Déplacer' },
	{ id: 'point', label: 'Point' },
	{ id: 'segment', label: 'Segment' },
	{ id: 'droite', label: 'Droite' },
	{ id: 'demi-droite', label: 'Demi-droite' },
	{ id: 'cercle', label: 'Cercle' },
	{ id: 'milieu', label: 'Milieu' },
	{ id: 'intersection', label: 'Intersection' },
	{ id: 'point-sur', label: 'Point sur un objet' },
	{ id: 'parallele', label: 'Parallèle' },
	{ id: 'perpendiculaire', label: 'Perpendiculaire' }
];

/** Rien près du clic : le clic d'un outil de base dans le vide. */
const NOTHING_NEAR: ToolNear = { objects: [], radius: 0 };

/**
 * Au-delà de ces objets proches, on ne cherche plus de rencontre : trois
 * suffisent à un clic, et chaque couple coûte un calcul d'intersection.
 */
const CROSSING_CANDIDATES = 3;

/** La boîte, quand le clic ne vise pas ce que l'outil attend. */
const OBJECT_NOTICE = 'Clique sur une droite, un segment, un cercle ou une courbe.';
const DIRECTION_NOTICE = 'Clique sur une droite, un segment ou une demi-droite.';

/** Les points : A à Z, dans l'ordre de l'alphabet (M4). */
const POINT_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Droites, segments, demi-droites : d, d_1, d_2… ; cercles : c, c_1… (M4).
 * La seconde lettre ne sert que si la première désigne une fonction ou une
 * suite (d_1 serait alors d(1)).
 */
const LINE_LETTERS = ['d', 'D'];
const CIRCLE_LETTERS = ['c', 'C'];

/** Au-delà, l'atelier est de toute façon plein (plafond d'objets). */
const MAX_INDEX = 200;

/** Ce que dit la boîte à chaque étape d'une construction (M7). */
const INSTRUCTIONS: Readonly<Record<TwoPointTool, readonly [string, string]>> = {
	segment: ['Clique sur un premier point.', 'Clique sur un deuxième point.'],
	droite: ['Clique sur un premier point.', 'Clique sur un deuxième point.'],
	'demi-droite': ['Clique sur l’origine de la demi-droite.', 'Clique sur un deuxième point.'],
	cercle: ['Clique sur le centre du cercle.', 'Clique sur un point du cercle.'],
	milieu: ['Clique sur un premier point, ou sur un segment.', 'Clique sur un deuxième point.']
};

/** Parallèle, perpendiculaire : la consigne une fois la droite, ou le point, choisi. */
const DIRECTION_INSTRUCTIONS: Readonly<
	Record<DirectionTool, { readonly line: string; readonly point: string }>
> = {
	parallele: {
		line: 'Clique sur le point par lequel passe la parallèle.',
		point: 'Clique sur la droite à laquelle elle est parallèle.'
	},
	perpendiculaire: {
		line: 'Clique sur le point par lequel passe la perpendiculaire.',
		point: 'Clique sur la droite à laquelle elle est perpendiculaire.'
	}
};

// =============================================================================
// Fonctions
// =============================================================================

/** Ce nom est-il libre pour un nouvel objet `kind` : ni pris, ni réservé, ni ambigu ? */
function isFree(atelier: Atelier, name: string, kind: ObjectKind): boolean {
	return (
		!atelier.names.includes(name) &&
		!RESERVED_NAMES.has(name) &&
		indexedNameClash(name, kind, atelier.objects) === null
	);
}

/**
 * Le nom d'un point créé à la souris : la première majuscule libre, dans
 * l'ordre de l'alphabet, puis A_1, A_2… (M4).
 */
export function nextPointName(atelier: Atelier): string {
	const letter = POINT_LETTERS.find((name) => isFree(atelier, name, 'point'));
	if (letter !== undefined) return letter;
	return indexedName(atelier, POINT_LETTERS[0], 'point');
}

/** Le nom d'une droite, d'un segment, d'une demi-droite créés à la souris (M4). */
export function nextLineName(atelier: Atelier): string {
	return letterThenIndices(atelier, LINE_LETTERS, 'curve');
}

/** Le nom d'un cercle créé à la souris (M4). */
export function nextCircleName(atelier: Atelier): string {
	return letterThenIndices(atelier, CIRCLE_LETTERS, 'curve');
}

/**
 * `d`, puis `d_1`, `d_2`… ; la lettre suivante seulement si `d` est une
 * fonction ou une suite (tous les `d_i` désigneraient ses images).
 */
function letterThenIndices(atelier: Atelier, letters: readonly string[], kind: ObjectKind): string {
	for (const letter of letters) {
		if (isFree(atelier, letter, kind)) return letter;
		if (indexedNameClash(`${letter}_1`, kind, atelier.objects) !== null) continue;
		return indexedName(atelier, letter, kind);
	}
	return indexedName(atelier, letters[0], kind);
}

/** Le premier `letter_i` libre ; jamais un nom pris (invariant). */
function indexedName(atelier: Atelier, letter: string, kind: ObjectKind): string {
	for (let i = 1; i <= MAX_INDEX; i++) {
		const name = `${letter}_${i}`;
		if (isFree(atelier, name, kind)) return name;
	}
	// Inatteignable en pratique : le plafond d'objets est bien plus bas
	throw new Error('Aucun nom libre pour un objet de la figure');
}

/** Le pas du curseur de position d'un support (`positionSliderFor`), en décimales. */
function stepDecimals(support: Support): number {
	if (support.type === 'circle') return 0;
	if (support.type === 'line' && support.shape === 'segment') return 2;
	return 1;
}

/** La position `value` ramenée dans ce que le support accepte (segment, demi-droite, cercle). */
function clampedPosition(support: Support, value: number): number {
	if (support.type === 'circle') return ((value % 360) + 360) % 360;
	if (support.type === 'line' && support.shape === 'segment')
		return Math.min(1, Math.max(0, value));
	if (support.type === 'line' && support.shape === 'ray') return Math.max(0, value);
	return value;
}

/**
 * La position écrite d'un `point_sur` cliqué en (x ; y), au pas de son curseur
 * de position (`positionSliderFor`) — segment au centième, ramené dans
 * [0 ; 1] ; demi-droite et droite au dixième (une demi-droite ne va pas sous
 * 0) ; cercle en degrés entiers ; courbe au dixième — et plus fin s'il le faut
 * pour que le point retombe à moins de `tolerance` de sa position sous le clic
 * (une droite longue, une courbe raide : revue). `null` sur une conique.
 */
function writtenPosition(support: Support, x: number, y: number, tolerance: number): string | null {
	const raw = positionAt(support, x, y);
	if (raw === null || !Number.isFinite(raw)) return null;
	const exact = clampedPosition(support, raw);
	let value = positionWithin(support, exact, stepDecimals(support), tolerance);
	if (support.type === 'circle') value %= 360;
	return String(value === 0 ? 0 : value).replace('.', ',');
}

/** Un support en droite (droite, segment, demi-droite, droite par équation) ? */
function isLine(support: Support | null): boolean {
	return support !== null && support.type === 'line';
}

/** La ligne d'un outil à deux points : le raccourci des manuels, ou `cercle(…)`. */
function constructionLine(atelier: Atelier, tool: TwoPointTool, a: string, b: string): string {
	switch (tool) {
		case 'segment':
			return `${nextLineName(atelier)} = [${a}${b}]`;
		case 'droite':
			return `${nextLineName(atelier)} = (${a}${b})`;
		case 'demi-droite':
			return `${nextLineName(atelier)} = [${a}${b})`;
		case 'cercle':
			return `${nextCircleName(atelier)} = cercle(${a} ; passant=${b})`;
		case 'milieu':
			return `${nextPointName(atelier)} = milieu(${a} ; ${b})`;
	}
}

/** L'outil attend-il des points (et seulement des points) ? */
function isTwoPointTool(tool: FigureTool): tool is TwoPointTool {
	return (
		tool === 'segment' ||
		tool === 'droite' ||
		tool === 'demi-droite' ||
		tool === 'cercle' ||
		tool === 'milieu'
	);
}

// =============================================================================
// La boîte à outils
// =============================================================================

/**
 * L'outil choisi et la construction en cours. Un état de VUE (comme la case
 * « Repère ») : rien n'est sauvegardé, l'atelier ne reçoit que des lignes.
 */
export class FigureToolbox {
	/** L'outil choisi ; Déplacer par défaut (M3). */
	tool = $state<FigureTool>('deplacer');
	/**
	 * Ce qui est déjà choisi de la construction en cours (au plus un nom) : un
	 * point, ou un objet (Intersection ; la droite d'une parallèle).
	 */
	chosen = $state<readonly string[]>([]);
	/** Pourquoi le dernier clic n'a rien fait (le même point deux fois), ou `null`. */
	notice = $state<string | null>(null);

	readonly #atelier: Atelier;
	readonly #write: ToolWriter;
	/** La direction du fantôme, et pour quoi elle a été calculée. */
	#direction: { key: string; value: { dx: number; dy: number } | null } | null = null;

	constructor(atelier: Atelier, write: ToolWriter) {
		this.#atelier = atelier;
		this.#write = write;
	}

	/** Ce que l'élève doit faire maintenant, ou `null` avec Déplacer. */
	get instruction(): string | null {
		const tool = this.tool;
		const [first] = this.chosen;
		switch (tool) {
			case 'deplacer':
				return null;
			case 'point':
				return 'Clique où placer le point.';
			case 'point-sur':
				return OBJECT_NOTICE;
			case 'intersection':
				return first === undefined
					? 'Clique sur un premier objet, ou là où deux objets se coupent.'
					: 'Clique sur un deuxième objet.';
			case 'parallele':
			case 'perpendiculaire':
				if (first === undefined) return DIRECTION_NOTICE;
				return DIRECTION_INSTRUCTIONS[tool][this.#isPoint(first) ? 'point' : 'line'];
			default:
				return INSTRUCTIONS[tool][first === undefined ? 0 : 1];
		}
	}

	/**
	 * Le point déjà choisi, d'où part le fantôme (segment, cercle, milieu en
	 * cours), ou `null`.
	 */
	get chosenPoint(): string | null {
		const [first] = this.chosen;
		return first !== undefined && isTwoPointTool(this.tool) ? first : null;
	}

	/**
	 * La direction du fantôme d'une parallèle ou d'une perpendiculaire dont la
	 * droite est choisie, en nombres, ou `null`.
	 */
	get ghostDirection(): { readonly dx: number; readonly dy: number } | null {
		const tool = this.tool;
		const [first] = this.chosen;
		if ((tool !== 'parallele' && tool !== 'perpendiculaire') || first === undefined) return null;
		// Lue à chaque mouvement du pointeur : calculée une fois par révision (revue)
		const key = `${tool}|${first}|${this.#atelier.revision}`;
		if (this.#direction?.key !== key) {
			this.#direction = { key, value: this.#directionOf(tool, first) };
		}
		return this.#direction.value;
	}

	#directionOf(tool: DirectionTool, first: string): { dx: number; dy: number } | null {
		if (this.#isPoint(first)) return null;
		const support = supportNamed(this.#atelier, first);
		if (support === null || support.type !== 'line') return null;
		const dx = geoToNumber(support.to.x) - geoToNumber(support.from.x);
		const dy = geoToNumber(support.to.y) - geoToNumber(support.from.y);
		return tool === 'parallele' ? { dx, dy } : { dx: -dy, dy: dx };
	}

	/**
	 * Choisir un outil. Une construction commencée est abandonnée — par un
	 * autre outil comme par un second appui sur le même (M7).
	 */
	select(tool: FigureTool): void {
		this.tool = tool;
		this.cancel();
	}

	/**
	 * Abandonner la construction si ce qu'elle a choisi n'existe plus (annulé,
	 * supprimé, renommé) ou n'est plus ce qu'elle attend (une droite devenue
	 * cercle) : sans ça, le clic suivant écrirait `[AB]` sur un A
	 * disparu — ou sur un autre A, créé entre-temps (revue).
	 */
	forgetVanished(): void {
		const [first] = this.chosen;
		if (first === undefined) return;
		const object = this.#atelier.get(first);
		const tool = this.tool;
		let kept: boolean;
		if (object === undefined) kept = false;
		else if (isTwoPointTool(tool)) kept = object.kind === 'point';
		else if (object.kind === 'point') kept = tool !== 'intersection';
		else {
			// Un objet choisi doit rester coupable (Intersection), ou une droite (Parallèle…)
			const support = supportNamed(this.#atelier, first);
			kept = tool === 'intersection' ? support !== null : isLine(support);
		}
		if (!kept) this.chosen = [];
	}

	/** Abandonner la construction en cours (Échap) ; vrai s'il y en avait une. */
	cancel(): boolean {
		this.notice = null;
		if (this.chosen.length === 0) return false;
		this.chosen = [];
		return true;
	}

	/**
	 * Un clic en (x ; y), coordonnées du repère. `point` : le point existant
	 * visé (M5 : il est réutilisé), ou `null` ; `snap` : l'écart, en unités,
	 * sous lequel une coordonnée d'un point créé s'aimante à l'entier (M2) ;
	 * `near` : les objets proches du clic (M5).
	 */
	click(x: number, y: number, point: string | null, snap = 0, near = NOTHING_NEAR): void {
		this.notice = null;
		this.forgetVanished();
		const tool = this.tool;
		switch (tool) {
			case 'deplacer':
				return;
			case 'point':
				if (point === null) this.#pointAt(x, y, snap, near);
				return;
			case 'point-sur':
				this.#pointOnClick(x, y, near);
				return;
			case 'intersection':
				this.#intersectionClick(x, y, near);
				return;
			case 'parallele':
			case 'perpendiculaire':
				this.#directionClick(tool, x, y, point, snap, near);
				return;
			default:
				this.#twoPointClick(tool, x, y, point, snap, near);
		}
	}

	#twoPointClick(
		tool: TwoPointTool,
		x: number,
		y: number,
		point: string | null,
		snap: number,
		near: ToolNear
	): void {
		const [first] = this.chosen;
		if (point !== null && point === first) {
			this.notice = `Choisis un autre point que ${displayName(point)}.`;
			return;
		}
		// Milieu : un clic sur un segment donne son milieu, d'un seul clic
		if (tool === 'milieu' && first === undefined && point === null) {
			// L'objet le plus proche seulement : un cercle visé près d'un segment reste le cercle
			const [segment] = near.objects;
			const support = segment === undefined ? null : supportNamed(this.#atelier, segment);
			if (support !== null && support.type === 'line' && support.shape === 'segment') {
				this.#write(`${nextPointName(this.#atelier)} = milieu(${segment})`);
				return;
			}
		}
		const name = point ?? this.#pointAt(x, y, snap, near);
		if (name === null) return;
		if (first === undefined) {
			this.chosen = [name];
			return;
		}
		// La ligne refusée (atelier plein) : la console dit pourquoi, on repart de zéro
		this.#write(constructionLine(this.#atelier, tool, first, name));
		this.chosen = [];
	}

	/** Point sur un objet : un clic sur l'objet, jamais une intersection. */
	#pointOnClick(x: number, y: number, near: ToolNear): void {
		if (this.#placeOn(x, y, near) === undefined) this.notice = OBJECT_NOTICE;
	}

	/**
	 * Intersection : un clic là où deux objets se coupent écrit leur point
	 * commun ; sinon, un objet par clic, et le point commun le plus proche du
	 * second clic.
	 */
	#intersectionClick(x: number, y: number, near: ToolNear): void {
		const objects = near.objects.filter((name) => supportNamed(this.#atelier, name) !== null);
		const [first] = this.chosen;
		if (first === undefined) {
			if (objects.length === 0) {
				this.notice = OBJECT_NOTICE;
				return;
			}
			if (this.#placeAtCrossing(x, y, near) !== undefined) return;
			this.chosen = [objects[0]];
			return;
		}
		const second = objects.find((name) => name !== first);
		if (second === undefined) {
			this.notice =
				objects.length === 0 ? OBJECT_NOTICE : `Choisis un autre objet que ${displayName(first)}.`;
			return;
		}
		const a = supportNamed(this.#atelier, first);
		const b = supportNamed(this.#atelier, second);
		const pair = `${displayName(first)} et ${displayName(second)}`;
		const common = a === null || b === null ? null : commonPoints(a, b);
		if (common?.kind === 'unsupported') {
			this.notice = common.message;
			return;
		}
		if (common?.kind === 'infinite') {
			this.notice = `${pair} ont une infinité de points communs.`;
			return;
		}
		const nearest = closest(common?.points ?? [], x, y);
		if (nearest === null) {
			this.notice = `${pair} ne se coupent pas.`;
			return;
		}
		this.#writeIntersection(first, second, nearest.k);
		this.chosen = [];
	}

	/**
	 * Parallèle, perpendiculaire : la droite puis le point (M5 pour le point),
	 * ou un point existant puis la droite.
	 */
	#directionClick(
		tool: DirectionTool,
		x: number,
		y: number,
		point: string | null,
		snap: number,
		near: ToolNear
	): void {
		const [first] = this.chosen;
		const line = near.objects.find((name) => isLine(supportNamed(this.#atelier, name)));
		if (first === undefined) {
			if (point !== null) this.chosen = [point];
			else if (line !== undefined) this.chosen = [line];
			else this.notice = DIRECTION_NOTICE;
			return;
		}
		let through: string;
		let base: string;
		if (this.#isPoint(first)) {
			if (line === undefined) {
				this.notice = DIRECTION_NOTICE;
				return;
			}
			[through, base] = [first, line];
		} else {
			const name = point ?? this.#pointAt(x, y, snap, near);
			if (name === null) return;
			[through, base] = [name, first];
		}
		this.#write(`${nextLineName(this.#atelier)} = ${tool}(${through} ; ${base})`);
		this.chosen = [];
	}

	#isPoint(name: string): boolean {
		return this.#atelier.get(name)?.kind === 'point';
	}

	/**
	 * Le point d'un outil qui attend un point, là où l'on n'a visé aucun point
	 * (M5) : l'intersection de deux objets si leur rencontre est sous le clic,
	 * sinon un `point_sur` de l'objet le plus proche, sinon un point par
	 * coordonnées. Son nom, ou `null` si la ligne a échoué.
	 */
	#pointAt(x: number, y: number, snap: number, near: ToolNear): string | null {
		const crossing = this.#placeAtCrossing(x, y, near);
		if (crossing !== undefined) return crossing;
		const on = this.#placeOn(x, y, near);
		if (on !== undefined) return on;
		return this.#placePoint(x, y, snap, near);
	}

	/**
	 * Écrire l'intersection de deux objets proches dont un point commun est à
	 * moins de `near.radius` du clic (le plus proche) : son nom, `null` si la
	 * ligne a échoué, `undefined` s'il n'y a pas de rencontre sous le clic.
	 */
	#placeAtCrossing(x: number, y: number, near: ToolNear): string | null | undefined {
		const objects = near.objects.slice(0, CROSSING_CANDIDATES);
		const supports = objects.map((name) => supportNamed(this.#atelier, name));
		let best: { a: string; b: string; k: number | null; distance: number } | null = null;
		for (let i = 0; i < objects.length; i++) {
			for (let j = i + 1; j < objects.length; j++) {
				const [sa, sb] = [supports[i], supports[j]];
				if (sa === null || sb === null) continue;
				const common = commonPoints(sa, sb);
				if (common.kind !== 'points') continue;
				const nearest = closest(common.points, x, y);
				if (nearest === null || nearest.distance > near.radius) continue;
				if (best === null || nearest.distance < best.distance) {
					best = { a: objects[i], b: objects[j], k: nearest.k, distance: nearest.distance };
				}
			}
		}
		if (best === null) return undefined;
		return this.#writeIntersection(best.a, best.b, best.k);
	}

	/**
	 * Écrire un `point_sur` du premier objet proche qui en porte un, à la
	 * position du clic (à moins d'une demi-tolérance près) : son nom, `null` si la ligne a échoué, `undefined` si
	 * aucun objet ne convient.
	 */
	#placeOn(x: number, y: number, near: ToolNear): string | null | undefined {
		for (const object of near.objects) {
			const support = supportNamed(this.#atelier, object);
			// Fluide : au pixel près ; aimanté : à la moitié du rayon de visée
			const fluid = this.#atelier.fluidPixel(near.pixel ?? 0);
			const tolerance = fluid ?? near.radius / 2;
			const position = support === null ? null : writtenPosition(support, x, y, tolerance);
			if (position === null) continue;
			const name = nextPointName(this.#atelier);
			return this.#write(`${name} = point_sur(${object} ; ${position})`) ? name : null;
		}
		return undefined;
	}

	#writeIntersection(a: string, b: string, k: number | null): string | null {
		const name = nextPointName(this.#atelier);
		const written = k === null ? `intersection(${a} ; ${b})` : `intersection(${a} ; ${b} ; ${k})`;
		return this.#write(`${name} = ${written}`) ? name : null;
	}

	/** Écrire un point en (x ; y) ; son nom, ou `null` si la ligne a échoué. */
	#placePoint(x: number, y: number, snap: number, near: ToolNear): string | null {
		const name = nextPointName(this.#atelier);
		const fluid = this.#atelier.fluidPixel(near.pixel ?? 0);
		return this.#write(`${name} = ${draggedCoordinates(x, y, snap, fluid)}`) ? name : null;
	}
}

/** Le point commun le plus proche de (x ; y), avec sa distance, ou `null`. */
function closest(
	points: readonly { k: number | null; point: GeoPoint }[],
	x: number,
	y: number
): { k: number | null; distance: number } | null {
	let best: { k: number | null; distance: number } | null = null;
	for (const { k, point } of points) {
		const distance = Math.hypot(geoToNumber(point.x) - x, geoToNumber(point.y) - y);
		if (best === null || distance < best.distance) best = { k, distance };
	}
	return best;
}
