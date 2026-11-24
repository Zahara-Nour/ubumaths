/**
 * Barres et boîtes à moustaches — dessin à la largeur disponible (écran)
 * =======================================================================
 *
 * Écart E46, choix B de David (2026-11-24). Avant, le SVG gardait le cadre de
 * `taille:` (400 px + marges) et le navigateur le RÉTRÉCISSAIT quand la place
 * manquait : texte de 7-8 px au téléphone. Ici, on calcule la largeur du dessin
 * (`viewWidth`, celle du `viewBox`) pour qu'elle soit celle de l'écran :
 *
 * - place suffisante, ou largeur pas encore mesurée (rendu serveur) : le
 *   dessin de `taille:`, inchangé ;
 * - place plus étroite : la largeur disponible, et la scène est RECONSTRUITE
 *   pour ce cadre (noms inclinés, graduations, rangées de valeurs) ;
 * - sous 300 px : 300 px, le dessin défile dans son cadre (`min-width` du SVG) ;
 *   de même un diagramme de beaucoup de colonnes, dont les noms se toucheraient.
 *
 * Le dessin est donc toujours à l'échelle 1 : son texte fait sa taille CSS
 * (12 px). Pur : aucune mesure ici, la largeur disponible vient du composant
 * (`bind:contentRect`), qui pose aussi `min-width: viewWidth` sur le SVG : un
 * dessin plus large que la place défile, il n'est pas rétréci. Le PDF n'est pas concerné.
 *
 * @module ubumark/utils/stat-chart-fit
 */

import {
	SCATTER_LABEL_CHAR_PX,
	type BarScene,
	type BoxPlotScene,
	type SceneTick
} from './stat-chart-scene';

// ============================================================================
// TYPES
// ============================================================================

/** Un diagramme en barres prêt à dessiner : la scène et ses marges, en px */
export interface BarFit {
	scene: BarScene;
	padLeft: number;
	padRight: number;
	padTop: number;
	padBottom: number;
	/** Étendue d'un nom incliné, horizontale comme verticale ; 0 s'ils sont à plat */
	rotatedExtent: number;
	plotWidth: number;
	plotHeight: number;
	/** Taille du `viewBox`, et largeur maximale du SVG */
	viewWidth: number;
	viewHeight: number;
}

/** Des boîtes à moustaches prêtes à dessiner */
export interface BoxPlotFit {
	scene: BoxPlotScene;
	padLeft: number;
	padRight: number;
	plotWidth: number;
	viewWidth: number;
	/** Une graduation étiquetée sur `labelStride` (axe écrit trop serré pour le cadre) */
	labelStride: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** En dessous, le dessin ne se resserre plus : il défile dans son cadre */
export const STAT_SVG_MIN_WIDTH = 300;

/** Largeur d'un caractère d'un nom de catégorie à l'écran (12 px), en px */
export const BAR_LABEL_CHAR_PX = 7.1;

/** Marges d'un diagramme en barres, en px */
const BAR_PAD_LEFT_MIN = 40;
const BAR_PAD_RIGHT = 12;
/**
 * Au-dessus du cadre : le titre de l'axe vertical, puis la valeur écrite sur
 * une première barre qui monte jusqu'en haut (12 px chacun, sans se toucher)
 */
export const BAR_PAD_TOP = 32;
const BAR_PAD_BOTTOM_FLAT = 26;
const AXIS_TITLE_PX = 18;
/** Largeur d'un caractère d'une graduation (12 px, chiffres), en px */
const BAR_TICK_CHAR_PX = 7.4;
/** Largeur d'un caractère d'une valeur écrite en 8 px (deux séries), en px */
const BAR_SMALL_VALUE_CHAR_PX = 5;
const SIN_45 = Math.SQRT1_2;

/**
 * Largeur minimale d'une colonne, en px : deux noms inclinés à 45° voisins
 * (12 px de haut) ne se touchent pas. Un diagramme de beaucoup de colonnes ne
 * se resserre pas au-delà : il défile dans son cadre.
 */
const BAR_MIN_BAND_PX = 18;

/** Boîtes : une demi-étiquette de graduation déborde de chaque côté */
const BOX_PAD_MIN = 12;

/** Air entre deux étiquettes de graduations voisines, en px */
const TICK_LABEL_GAP_PX = 4;

/** Tours pour accorder la scène et ses marges (les marges dépendent de la scène) */
const FIT_ROUNDS = 3;

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Largeur du dessin : la place disponible, entre `minimum` (300 px au moins)
 * et le dessin de `taille:`
 */
function viewWidthFor(
	available: number | undefined,
	natural: number,
	minimum = STAT_SVG_MIN_WIDTH
): number {
	if (available === undefined || !(available > 0)) return natural;
	// Place réelle (`contentRect`, pas `clientWidth` qui arrondit), arrondie en
	// dessous : le navigateur ne rétrécit jamais le dessin d'un cheveu (11,99 px)
	const room = Math.floor(available);
	const floor = Number.isFinite(minimum)
		? Math.max(STAT_SVG_MIN_WIDTH, minimum)
		: STAT_SVG_MIN_WIDTH;
	return Math.min(natural, Math.max(floor, room));
}

function rotatedExtentOf(scene: BarScene): number {
	return scene.rotateLabels ? scene.longestLabel * BAR_LABEL_CHAR_PX * SIN_45 : 0;
}

/** Marge gauche qui contient les graduations, quel que soit le cadre */
function barBasePad(scene: BarScene): number {
	const ticks = 12 + Math.max(...scene.ticks.map((t) => t.label.length)) * BAR_TICK_CHAR_PX;
	// Marges entières : un dessin de largeur entière n'est jamais rétréci d'un cheveu
	// par l'arrondi du navigateur (11,9995 px sous Safari)
	return Math.ceil(Math.max(BAR_PAD_LEFT_MIN, ticks));
}

/**
 * Marge gauche d'un cadre de largeur connue : les graduations, et un nom incliné
 * qui part vers la gauche depuis le milieu de la première colonne
 */
function barPadLeft(scene: BarScene, plotWidth: number): number {
	const halfBand = plotWidth / scene.labels.length / 2;
	return Math.ceil(Math.max(barBasePad(scene), rotatedExtentOf(scene) - halfBand + 6));
}

/**
 * Marge gauche d'un DESSIN de largeur connue (`viewWidth`) : le cadre est ce
 * qui reste, et la marge d'un nom incliné dépend du cadre. On résout
 * p = e − (V − p − R) / (2c) + 6, c colonnes.
 */
function barPadLeftInView(scene: BarScene, viewWidth: number): number {
	const base = barBasePad(scene);
	const count = scene.labels.length;
	const extent = rotatedExtentOf(scene);
	const halfBand = (viewWidth - base - BAR_PAD_RIGHT) / count / 2;
	if (extent - halfBand + 6 <= base) return base;
	const solved = Math.ceil(
		(extent + 6 - (viewWidth - BAR_PAD_RIGHT) / (2 * count)) / (1 - 1 / (2 * count))
	);
	// Nom démesuré : le cadre garde de quoi dessiner ses colonnes (le nom déborde)
	return Math.max(base, Math.min(solved, viewWidth - BAR_PAD_RIGHT - count * BAR_MIN_BAND_PX));
}

/**
 * Largeur en dessous de laquelle les textes des colonnes se toucheraient : noms
 * inclinés voisins, noms à plat qu'on ne peut pas incliner (scène sans `rebuild`),
 * valeurs écrites au-dessus des barres
 */
function barMinView(scene: BarScene, canRebuild: boolean): number {
	const flat = scene.rotateLabels || canRebuild ? 0 : scene.longestLabel * BAR_LABEL_CHAR_PX + 4;
	const perBand = scene.bars.length / scene.labels.length;
	// Deux séries : valeurs écrites en 8 px (`.stat-valeur-serree`)
	const valueChar = scene.legend !== null ? BAR_SMALL_VALUE_CHAR_PX : BAR_TICK_CHAR_PX;
	const values = scene.showValues
		? perBand * (Math.max(...scene.bars.map((b) => b.valueLabel.length)) * valueChar + 2)
		: 0;
	const band = Math.max(BAR_MIN_BAND_PX, flat, values);
	return barBasePad(scene) + BAR_PAD_RIGHT + scene.labels.length * band;
}

function barFit(scene: BarScene, padLeft: number, plotWidth: number): BarFit {
	const rotatedExtent = rotatedExtentOf(scene);
	// Entière, comme les marges de côté : hauteur du dessin entière (Safari)
	const padBottom = Math.ceil(
		(scene.rotateLabels ? 16 + rotatedExtent : BAR_PAD_BOTTOM_FLAT) +
			(scene.axisTitles.x ? AXIS_TITLE_PX : 0)
	);
	const plotHeight = scene.pixelSize.height;
	return {
		scene,
		padLeft,
		padRight: BAR_PAD_RIGHT,
		padTop: BAR_PAD_TOP,
		padBottom,
		rotatedExtent,
		plotWidth,
		plotHeight,
		viewWidth: padLeft + plotWidth + BAR_PAD_RIGHT,
		viewHeight: BAR_PAD_TOP + plotHeight + padBottom
	};
}

/**
 * Diagramme en barres à la largeur disponible.
 *
 * @param natural scène de `taille:` (construite sans `plotWidth`)
 * @param available largeur disponible en px ; `undefined` tant qu'elle n'est pas mesurée
 * @param rebuild la même scène pour un cadre de cette largeur ; absent (scène
 *   donnée sans sa spec) : la scène de `taille:` est dessinée dans le cadre resserré
 */
export function fitBarScene(
	natural: BarScene,
	available: number | undefined,
	rebuild?: (plotWidth: number) => BarScene
): BarFit {
	const naturalWidth = natural.pixelSize.width;
	const naturalPad = barPadLeft(natural, naturalWidth);
	const naturalView = naturalPad + naturalWidth + BAR_PAD_RIGHT;
	const viewWidth = viewWidthFor(
		available,
		naturalView,
		barMinView(natural, rebuild !== undefined)
	);
	if (viewWidth >= naturalView) return barFit(natural, naturalPad, naturalWidth);

	let scene = natural;
	let padLeft = barPadLeftInView(scene, viewWidth);
	for (let round = 0; rebuild && round < FIT_ROUNDS; round++) {
		const next = rebuild(viewWidth - padLeft - BAR_PAD_RIGHT);
		const nextPad = barPadLeftInView(next, viewWidth);
		const stable = Math.abs(nextPad - padLeft) < 0.5 && next.rotateLabels === scene.rotateLabels;
		scene = next;
		padLeft = nextPad;
		if (stable) break;
	}
	return barFit(scene, padLeft, viewWidth - padLeft - BAR_PAD_RIGHT);
}

/**
 * Une étiquette de graduation sur combien, pour qu'elles ne se touchent pas :
 * graduations régulières sur `plotWidth` px
 */
export function tickLabelStride(ticks: readonly SceneTick[], plotWidth: number): number {
	if (ticks.length < 2 || !(plotWidth > 0)) return 1;
	const spacing = plotWidth / (ticks.length - 1);
	const needed =
		Math.max(...ticks.map((t) => t.label.length)) * SCATTER_LABEL_CHAR_PX + TICK_LABEL_GAP_PX;
	return Math.max(1, Math.ceil(needed / spacing - 1e-9));
}

function boxPads(scene: BoxPlotScene): { left: number; right: number } {
	const half = (tick: SceneTick | undefined) =>
		Math.ceil(Math.max(BOX_PAD_MIN, ((tick?.label.length ?? 0) * SCATTER_LABEL_CHAR_PX) / 2 + 4));
	return { left: half(scene.xTicks[0]), right: half(scene.xTicks.at(-1)) };
}

function boxFit(
	scene: BoxPlotScene,
	pads: { left: number; right: number },
	plotWidth: number
): BoxPlotFit {
	return {
		scene,
		padLeft: pads.left,
		padRight: pads.right,
		plotWidth,
		viewWidth: pads.left + plotWidth + pads.right,
		labelStride: tickLabelStride(scene.xTicks, plotWidth)
	};
}

/**
 * Boîtes à moustaches à la largeur disponible : mêmes paramètres que
 * `fitBarScene`. Les hauteurs (bandes de la scène) ne changent pas.
 */
export function fitBoxPlotScene(
	natural: BoxPlotScene,
	available: number | undefined,
	rebuild?: (plotWidth: number) => BoxPlotScene
): BoxPlotFit {
	const naturalPads = boxPads(natural);
	const naturalWidth = natural.pixelSize.width;
	const naturalView = naturalPads.left + naturalWidth + naturalPads.right;
	const viewWidth = viewWidthFor(available, naturalView);
	if (viewWidth >= naturalView) return boxFit(natural, naturalPads, naturalWidth);

	let scene = natural;
	let pads = naturalPads;
	for (let round = 0; rebuild && round < FIT_ROUNDS; round++) {
		const next = rebuild(viewWidth - pads.left - pads.right);
		const nextPads = boxPads(next);
		const stable = nextPads.left === pads.left && nextPads.right === pads.right;
		scene = next;
		pads = nextPads;
		if (stable) break;
	}
	return boxFit(scene, pads, viewWidth - pads.left - pads.right);
}
