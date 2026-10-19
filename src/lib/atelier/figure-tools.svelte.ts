/**
 * Atelier — la barre d'outils de la vue Géométrie (géométrie, lot 3, PR 2)
 *
 * Phase 0 : `docs/wip/atelier-geometrie-lot3-phase0.md`, M3, M4, M5 (partiel),
 * M7. Chaque outil ÉCRIT la ligne qu'on aurait tapée (G2) — un clic avec
 * « Point » écrit `A = (1,5 ; 2)`, deux clics avec « Segment » écrivent
 * `d = [AB]` : tout ce qui se fait à la souris se relit, se rejoue et s'annule
 * comme le clavier. La boîte ne crée donc rien elle-même : elle passe ses
 * lignes à `write` (la console), et n'avance que si la ligne a réussi.
 *
 * @module atelier/figure-tools
 */

import type { Atelier } from './atelier.svelte';
import { displayName, indexedNameClash, RESERVED_NAMES } from './names';
import { draggedCoordinates } from './point-drag';
import type { ObjectKind } from './types';

// =============================================================================
// Types
// =============================================================================

/** Les outils du lot 3, PR 2 (M3) : Déplacer, puis les outils de base. */
export type FigureTool = 'deplacer' | 'point' | 'segment' | 'droite' | 'demi-droite' | 'cercle';

/** Écrire une ligne dans la console ; vrai si elle a réussi (son objet existe). */
export type ToolWriter = (line: string) => boolean;

/** Un outil à deux points : la ligne écrite une fois les deux points choisis. */
type TwoPointTool = Exclude<FigureTool, 'deplacer' | 'point'>;

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
	{ id: 'cercle', label: 'Cercle' }
];

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
	cercle: ['Clique sur le centre du cercle.', 'Clique sur un point du cercle.']
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
	}
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
	/** Les points déjà choisis de la construction en cours (au plus un). */
	chosen = $state<readonly string[]>([]);
	/** Pourquoi le dernier clic n'a rien fait (le même point deux fois), ou `null`. */
	notice = $state<string | null>(null);

	readonly #atelier: Atelier;
	readonly #write: ToolWriter;

	constructor(atelier: Atelier, write: ToolWriter) {
		this.#atelier = atelier;
		this.#write = write;
	}

	/** Ce que l'élève doit faire maintenant, ou `null` avec Déplacer. */
	get instruction(): string | null {
		if (this.tool === 'deplacer') return null;
		if (this.tool === 'point') return 'Clique où placer le point.';
		return INSTRUCTIONS[this.tool][this.chosen.length === 0 ? 0 : 1];
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
	 * Abandonner la construction si son premier point n'existe plus (annulé,
	 * supprimé, renommé) : sans ça, le clic suivant écrirait `[AB]` sur un A
	 * disparu — ou sur un autre A, créé entre-temps (revue).
	 */
	forgetVanished(): void {
		const [first] = this.chosen;
		if (first !== undefined && this.#atelier.get(first)?.kind !== 'point') this.chosen = [];
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
	 * sous lequel une coordonnée d'un point créé s'aimante à l'entier (M2).
	 */
	click(x: number, y: number, point: string | null, snap = 0): void {
		this.notice = null;
		this.forgetVanished();
		const tool = this.tool;
		if (tool === 'deplacer') return;
		if (tool === 'point') {
			if (point === null) this.#placePoint(x, y, snap);
			return;
		}
		const [first] = this.chosen;
		if (point !== null && point === first) {
			this.notice = `Choisis un autre point que ${displayName(point)}.`;
			return;
		}
		const name = point ?? this.#placePoint(x, y, snap);
		if (name === null) return;
		if (first === undefined) {
			this.chosen = [name];
			return;
		}
		// La ligne refusée (atelier plein) : la console dit pourquoi, on repart de zéro
		this.#write(constructionLine(this.#atelier, tool, first, name));
		this.chosen = [];
	}

	/** Écrire un point en (x ; y) ; son nom, ou `null` si la ligne a échoué. */
	#placePoint(x: number, y: number, snap: number): string | null {
		const name = nextPointName(this.#atelier);
		return this.#write(`${name} = ${draggedCoordinates(x, y, snap)}`) ? name : null;
	}
}
