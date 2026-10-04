/**
 * Bloc ```figure — scène
 * ======================
 *
 * Interprète SANS affichage le script DSL d'un bloc ```figure
 * (`interpret(parse(script))` de geometry-core) et vérifie qu'il ne contient
 * que ce que l'écran ET le PDF savent dessiner (liste blanche v1).
 *
 * Module LOURD (tout l'interpréteur de geometry-core) : il n'est importé que
 * par le composant chargé à la demande et par le générateur Typst, jamais par
 * le parseur Markdown.
 *
 * Budget borné (Q56 : rendu dans le chat élève et le tableau blanc) : taille du
 * script, nombre d'objets (`Figure.setElementLimit`), instructions exécutées
 * (`interpret(…, { maxSteps })`) ; les appels hors liste blanche sont refusés
 * AVANT l'exécution, donc aucun calcul coûteux (courbes, lieux…) n'est lancé.
 *
 * @module ubumark/utils/figure-scene
 */

import { HEX_COLOR, resolveNamedColor } from '$lib/theme/named-colors';
import { darkContrastWarning } from '$lib/theme/author-color';
import type {
	FigureIssue,
	FigureNode,
	FigureSize,
	FigureStep,
	FigureWindow
} from '../types/figure';
import {
	FIGURE_LABEL_FONT_PX,
	FIGURE_LIMITS,
	FIGURE_PIXEL_WIDTH,
	FIGURE_WIDTH_CM
} from '../types/figure';
import {
	CAP_HEIGHT_EM,
	labelDirection,
	labelOffset,
	type Direction
} from '$lib/geometry-core/rendering/label-placement';
import { resolveStyle } from '$lib/geometry-core/rendering/svg-primitives';
import type { ContentLocale } from '$lib/types/locale';
import { formatTick, multiples } from './courbe-scene';
import { parse } from '$lib/geometry-core/dsl/parser';
import { interpret } from '$lib/geometry-core/dsl/interpreter';
import { DslParseError, DslRuntimeError } from '$lib/geometry-core/dsl/errors';
import { DslTokenizerError } from '$lib/geometry-core/dsl/tokenizer';
import type { DslExpr, DslProgram, DslStatement } from '$lib/geometry-core/dsl/types';
import { Figure, FigureElementLimitError } from '$lib/geometry-core/graph/figure';
import type { GeoElement } from '$lib/geometry-core/types/elements';
import {
	isAngle,
	isArcByAngles,
	isCircleByRadius,
	isPointElement,
	isText,
	isVector
} from '$lib/geometry-core/types/elements';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import type { Viewport } from '$lib/geometry-core/viewport/types';

// ============================================================================
// TYPES
// ============================================================================

/** Graduation d'un axe ; `label` null : tracée sans étiquette (graduations serrées) */
export interface FigureTick {
	value: number;
	label: string | null;
}

/** Repère de la figure (`axes:`, `grille:` de l'en-tête), en coordonnées mathématiques */
export interface FigureFrame {
	/** Abscisses et ordonnées des lignes de grille ; null sans `grille:` */
	grid: { xs: number[]; ys: number[] } | null;
	/** null sans `axes: oui` */
	axes: {
		/** Position des axes : 0 s'il est dans la fenêtre, sinon le bord le plus proche (```courbe) */
		xAxisY: number;
		yAxisX: number;
		/** Origine visible : le 0 n'est pas écrit */
		originVisible: boolean;
		/** Étiquette « O » écrite : origine visible et aucun point nommé dessus (`O = point(0, 0)`) */
		originLabel: boolean;
		ticks: { x: FigureTick[]; y: FigureTick[] };
	} | null;
}

export interface FigureSceneOptions {
	/** Séparateur décimal des graduations : virgule en français (défaut), point en anglais */
	locale?: ContentLocale;
}

export interface FigureScene {
	figure: Figure;
	/** Axes et grille ; null sans `axes:` ni `grille:` (rendu historique) */
	frame: FigureFrame | null;
	viewport: Viewport;
	/** Éléments VISIBLES, dans l'ordre de création (tous dans la liste blanche) */
	elements: GeoElement[];
	/** Position numérique des points visibles */
	positions: Map<string, { x: number; y: number }>;
	/** `description:` de l'en-tête, sinon une description automatique */
	ariaLabel: string;
}

export interface FigureSceneResult {
	/** null dès qu'il y a une erreur : rien n'est dessiné */
	scene: FigureScene | null;
	errors: FigureIssue[];
	warnings: FigureIssue[];
}

// ============================================================================
// LISTE BLANCHE (v1)
// ============================================================================

/**
 * Appels refusés en v1, avec la raison donnée à l'auteur. Refusés AVANT
 * l'exécution : ce sont aussi les calculs coûteux (échantillonnage, Newton).
 */
const REFUSED_CALLS: ReadonlyMap<string, string> = new Map([
	...[
		'courbe',
		'tangente',
		'derivee',
		'integrale',
		'zeros',
		'extrema',
		'inflections',
		'asymptotes',
		'courbure',
		'cercle_osculateur',
		'axes',
		'directrice',
		'foyers',
		'excentricite',
		'polaire'
	].map((name): [string, string] => [
		name,
		'les courbes et fonctions ne sont pas prises en charge dans une figure (utiliser un bloc ```courbe)'
	]),
	['aire', 'les aires ne sont pas prises en charge dans une figure'],
	['aire_entre', 'les aires ne sont pas prises en charge dans une figure'],
	['lieu', 'les lieux ne sont pas pris en charge dans une figure'],
	['trace', 'les lieux (traces) ne sont pas pris en charge dans une figure'],
	['image', 'les images (adresse externe) ne sont pas prises en charge dans une figure'],
	['slider', 'les curseurs ne sont pas pris en charge (la figure est statique)'],
	['curseur', 'les curseurs ne sont pas pris en charge (la figure est statique)'],
	['secteur', 'les secteurs ne sont pas pris en charge dans une figure (pas d’export PDF)'],
	['couronne', 'les couronnes ne sont pas prises en charge dans une figure (pas d’export PDF)'],
	['mtexte', 'les textes mathématiques ne sont pas pris en charge : utiliser texte()'],
	['rtexte', 'les textes enrichis ne sont pas pris en charge : utiliser texte()']
] as Array<[string, string]>);

/** Points qui dépendent d'une courbe ou d'une conique : hors v1. */
const CURVE_POINT_TYPES: ReadonlySet<string> = new Set([
	'pointOnCurve',
	'pointOnQuadraticCurve',
	'pointOnParametricCurve',
	'intersectionLQ',
	'intersectionQQ',
	'intersectionLF',
	'intersectionFF',
	'intersectionParametric',
	'intersectionParametricLine',
	'intersectionParametricCircle',
	'intersectionParametricFunction',
	'intersectionParametricSegment',
	'intersectionParametricRay'
]);

/** Types visibles exportés à la fois par l'écran ET par `exportToTypst`. */
const DRAWABLE_TYPES: ReadonlySet<string> = new Set([
	'segment',
	'line',
	'ray',
	'circleByRadius',
	'circleByPoint',
	'circleBy3Points',
	'arcByAngles',
	'arcByPoints',
	'polygon',
	'angle',
	'segmentMark',
	'text'
]);

export function isFigureDrawable(el: GeoElement): boolean {
	if (isPointElement(el)) return !CURVE_POINT_TYPES.has(el.type);
	if (isVector(el)) return true;
	return DRAWABLE_TYPES.has(el.type);
}

// ============================================================================
// SCRIPT
// ============================================================================

/**
 * Ce que la substitution des variables et l'usage français laissent dans le
 * script : `2{,}5` → `2.5`, `point(0;0)` → `point(0,0)`. Le `;` n'existe pas
 * dans le DSL : le remplacer hors chaînes et hors commentaires est sans risque.
 * Le nombre de lignes est conservé (numéros d'erreur justes).
 */
export function normalizeFigureScript(script: string): string {
	return script
		.split('\n')
		.map((line) => {
			let out = '';
			let inString = false;
			for (let i = 0; i < line.length; i++) {
				const ch = line[i];
				if (ch === '"') inString = !inString;
				if (!inString && ch === '#') return out + line.slice(i);
				if (!inString && ch === '{' && line.startsWith('{,}', i)) {
					out += '.';
					i += 2;
					continue;
				}
				out += !inString && ch === ';' ? ',' : ch;
			}
			return out;
		})
		.join('\n');
}

/** Code d'une ligne, chaînes vidées et commentaire retiré. */
function codeOf(line: string): string {
	let out = '';
	let inString = false;
	for (const ch of line) {
		if (ch === '"') inString = !inString;
		else if (ch === '#' && !inString) break;
		out += inString ? ' ' : ch;
	}
	return out;
}

/**
 * Virgule décimale : dans une ligne qui sépare ses arguments par `;`
 * (`point(2,5 ; 1)`), une virgule entre deux chiffres ne peut être qu'une
 * virgule décimale — sans ce message, l'auteur lirait « 3 arguments reçus ».
 */
function findDecimalComma(script: string): { line: number; number: string } | null {
	const lines = script.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const code = codeOf(lines[i]);
		if (!code.includes(';')) continue;
		const match = /\d+,\d+/.exec(code);
		if (match) return { line: i + 1, number: match[0] };
	}
	return null;
}

/** Premier appel refusé ou directive d'animation, parcouru dans tout le programme. */
function findRefused(program: DslProgram): { line: number; reason: string } | null {
	let found: { line: number; reason: string } | null = null;

	const visitExpr = (expr: DslExpr): void => {
		if (found) return;
		switch (expr.kind) {
			case 'call': {
				const reason = REFUSED_CALLS.get(expr.name);
				if (reason) {
					found = { line: expr.line, reason: `${expr.name}() : ${reason}` };
					return;
				}
				expr.args.forEach(visitExpr);
				expr.namedArgs.forEach(visitExpr);
				return;
			}
			case 'binary':
				visitExpr(expr.left);
				visitExpr(expr.right);
				return;
			case 'unary':
				visitExpr(expr.operand);
				return;
			case 'tuple':
			case 'list':
				expr.elements.forEach(visitExpr);
				return;
			case 'indexedAccess':
				visitExpr(expr.index);
				return;
			default:
				return;
		}
	};

	const visitStatements = (statements: DslStatement[]): void => {
		for (const stmt of statements) {
			if (found) return;
			switch (stmt.kind) {
				case 'assignment':
				case 'destructuring':
				case 'return':
					visitExpr(stmt.value);
					break;
				case 'indexedAssignment':
					visitExpr(stmt.index);
					visitExpr(stmt.value);
					break;
				case 'exprStatement':
					visitExpr(stmt.expr);
					break;
				case 'macroDef':
					stmt.params.forEach((p) => p.defaultValue && visitExpr(p.defaultValue));
					visitStatements(stmt.body);
					break;
				case 'forRange':
					visitExpr(stmt.from);
					visitExpr(stmt.to);
					visitStatements(stmt.body);
					break;
				case 'forIn':
					visitExpr(stmt.iterable);
					visitStatements(stmt.body);
					break;
				case 'if':
					visitExpr(stmt.condition);
					visitStatements(stmt.body);
					if (stmt.elseBody) visitStatements(stmt.elseBody);
					break;
				case 'directive':
					found = {
						line: stmt.line,
						reason: `@${stmt.name} : les animations ne sont pas prises en charge (la figure est statique)`
					};
					break;
			}
		}
	};

	visitStatements(program.statements);
	return found;
}

// ============================================================================
// ERREURS
// ============================================================================

/** Retirer le préfixe « Ligne N, colonne C : » (numéro de ligne du SCRIPT). */
function stripLinePrefix(message: string): string {
	return message.replace(/^Ligne \d+(?:, colonne \d+)? : /, '');
}

function issueAt(
	node: FigureNode,
	scriptLine: number,
	message: string,
	hint?: string
): FigureIssue {
	const line = node.scriptStartLine + scriptLine - 1;
	return { message: `Ligne ${line} : ${message}`, line, ...(hint ? { hint } : {}) };
}

function toIssue(node: FigureNode, error: unknown): FigureIssue {
	if (error instanceof DslRuntimeError) {
		const summary = error.details?.summary ?? stripLinePrefix(error.message);
		return issueAt(node, error.line, summary, error.details?.hint);
	}
	if (error instanceof DslParseError || error instanceof DslTokenizerError) {
		return issueAt(node, error.line, stripLinePrefix(error.message));
	}
	if (error instanceof FigureElementLimitError) {
		return { message: `Trop d’objets dans la figure (au plus ${error.limit}, cachés compris)` };
	}
	if (error instanceof RangeError) {
		return { message: 'Script trop complexe (récursion trop profonde)' };
	}
	return { message: error instanceof Error ? error.message : String(error) };
}

// ============================================================================
// COULEURS ET NOMBRES (relecture 2026-10-01)
// ============================================================================

/**
 * Couleur sûre, ou null si inconnue. Formes admises en sortie : un NOM de la
 * palette (canonique : `red` → `rouge`), traduit au rendu (variable du thème à
 * l'écran, variante claire au PDF), ou un hexadécimal à 3, 4, 6 ou 8 chiffres,
 * tel quel. Tout le reste — `"`, `red;mask-image:url(…)` — ferait échouer TOUTE
 * la fiche PDF, ou injecterait du CSS à l'écran (chat élève).
 */
export function normalizeFigureColor(raw: string): string | null {
	const value = raw.trim();
	if (HEX_COLOR.test(value)) return value;
	return resolveNamedColor(value);
}

/** Au-delà, les nombres s'écrivent en notation exponentielle : refusés. */
const MAX_COORDINATE = 1e9;

function finite(n: number | undefined): boolean {
	return n === undefined || (Number.isFinite(n) && Math.abs(n) <= MAX_COORDINATE);
}

/** Ligne du SCRIPT où l'objet est nommé (`A = …`), sinon où la chaîne apparaît. */
function scriptLineOf(script: string, el: GeoElement, needle?: string): number | null {
	const lines = script.split('\n');
	if (needle !== undefined) {
		const i = lines.findIndex((l) => l.includes(`"${needle}"`));
		if (i !== -1) return i + 1;
	}
	if (el.label) {
		const escaped = el.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const i = lines.findIndex((l) => new RegExp(`^\\s*${escaped}\\s*=`).test(l));
		if (i !== -1) return i + 1;
	}
	return null;
}

/** Nombres dessinés d'un objet visible : tous finis et raisonnables ? */
function hasFiniteGeometry(figure: Figure, el: GeoElement): boolean {
	const positionOk = (id: string) => {
		const pos = figure.getPosition(id);
		return !pos || (finite(geoToNumber(pos.x)) && finite(geoToNumber(pos.y)));
	};
	if (isPointElement(el) && !positionOk(el.id)) return false;
	if (!el.dependsOn.every(positionOk)) return false;
	const sty = el.style;
	if (sty && ![sty.strokeWidth, sty.pointSize, sty.opacity, sty.fillOpacity].every(finite)) {
		return false;
	}
	if (isCircleByRadius(el) && !finite(figure.resolveParam(el.radius))) return false;
	if (
		isArcByAngles(el) &&
		![el.radius, el.startAngle, el.endAngle].every((p) => finite(figure.resolveParam(p)))
	) {
		return false;
	}
	if (isVector(el)) {
		const comp = figure.getVectorComponents(el.id);
		if (comp && !(finite(geoToNumber(comp.dx)) && finite(geoToNumber(comp.dy)))) return false;
	}
	if (isText(el)) {
		const p = el.position;
		const o = el.anchorOffset;
		if ((p && !(finite(p.x) && finite(p.y))) || (o && !(finite(o.dx) && finite(o.dy)))) {
			return false;
		}
	}
	if (isAngle(el) && !(finite(el.arcRadiusPx) && finite(el.arcSpacingPx))) return false;
	return true;
}

/**
 * Valider (et normaliser) couleurs et nombres des objets visibles. Les noms de
 * couleur connus sont ramenés à leur nom canonique dans la figure. Un hex de
 * trait peu lisible en mode sombre ajoute un avertissement (D2, une fois par
 * valeur) ; `#000000`, le défaut, suit le texte et n'est pas concerné.
 */
function validateDrawing(
	node: FigureNode,
	figure: Figure,
	elements: GeoElement[],
	warnings: FigureIssue[]
): FigureIssue | null {
	const warnedHex = new Set<string>();
	const located = (el: GeoElement, message: string, needle?: string): FigureIssue => {
		const line = scriptLineOf(node.script, el, needle);
		return line === null ? { message } : issueAt(node, line, message);
	};
	for (const el of elements) {
		const name = el.label ? `« ${el.label} » : ` : '';
		const fixes: { color?: string; fillColor?: string } = {};
		const rawColor = el.style?.color ?? el.color;
		const rawFill = el.style?.fillColor;
		for (const [key, raw] of [
			['color', rawColor],
			['fillColor', rawFill]
		] as const) {
			if (raw === undefined) continue;
			const safe = normalizeFigureColor(raw);
			if (safe === null) {
				const what = key === 'color' ? 'couleur' : 'couleur de remplissage';
				return located(
					el,
					`${name}${what} inconnue (écrire un nom courant comme rouge, bleu, red, blue, ou une valeur #2563eb)`,
					raw
				);
			}
			if (safe !== raw) fixes[key] = safe;
			const hex = safe.toLowerCase();
			if (
				key === 'color' &&
				hex !== FIGURE_DEFAULT_COLOR &&
				!warnedHex.has(hex) &&
				warnings.length < MAX_WARNINGS
			) {
				const warning = darkContrastWarning(safe);
				if (warning) {
					warnedHex.add(hex);
					warnings.push(located(el, `${name}${warning}`, raw));
				}
			}
		}
		if (fixes.color !== undefined || fixes.fillColor !== undefined)
			figure.updateStyle(el.id, fixes);
		if (!hasFiniteGeometry(figure, el)) {
			return located(
				el,
				`${name}nombre non fini ou démesuré (division par zéro, valeur au-delà de 10^9 ?)`
			);
		}
	}
	return null;
}

// ============================================================================
// DESCRIPTION AUTOMATIQUE
// ============================================================================

const TYPE_WORDS: Record<string, [string, string]> = {
	segment: ['segment', 'segments'],
	line: ['droite', 'droites'],
	ray: ['demi-droite', 'demi-droites'],
	polygon: ['polygone', 'polygones'],
	circleByRadius: ['cercle', 'cercles'],
	circleByPoint: ['cercle', 'cercles'],
	circleBy3Points: ['cercle', 'cercles'],
	arcByAngles: ['arc', 'arcs'],
	arcByPoints: ['arc', 'arcs'],
	angle: ['angle', 'angles']
};

function autoAriaLabel(elements: GeoElement[], inFrame: boolean): string {
	const pointNames = elements.filter((e) => isPointElement(e) && e.label).map((e) => e.label);
	const counts = new Map<string, [string, string, number]>();
	for (const el of elements) {
		const words = isVector(el)
			? (['vecteur', 'vecteurs'] as [string, string])
			: TYPE_WORDS[el.type];
		if (!words) continue;
		const current = counts.get(words[0]);
		counts.set(words[0], [words[0], words[1], (current?.[2] ?? 0) + 1]);
	}
	const parts: string[] = [];
	if (pointNames.length > 0) {
		parts.push(
			`${pointNames.length > 1 ? 'points' : 'point'} ${pointNames.slice(0, 12).join(', ')}`
		);
	}
	for (const [singular, plural, n] of counts.values()) {
		parts.push(`${n} ${n > 1 ? plural : singular}`);
	}
	const title = inFrame ? 'Figure géométrique dans un repère' : 'Figure géométrique';
	return parts.length > 0 ? `${title} : ${parts.join(', ')}` : title;
}

// ============================================================================
// REPÈRE
// ============================================================================

const EPSILON = 1e-9;

/**
 * Écart minimal entre deux étiquettes de graduation : la largeur de « −10 »
 * et un peu plus (abscisses), deux hauteurs de chiffre (ordonnées). Plus
 * serrées — à l'écran OU au PDF —, une graduation sur 2 (sur 3…) reçoit son étiquette.
 */
const MIN_TICK_LABEL_GAP = { xChars: 3.7, yHeights: 2 } as const;

/** Nom de point dessiné : de quoi calculer sa boîte à l'écran et au PDF */
export interface NamedPoint {
	x: number;
	y: number;
	label: string;
	dir: Direction;
	/** Rayon du point à l'écran, en px (l'écart du nom en dépend) */
	pointSize: number;
}

/** Boîte en coordonnées mathématiques (y vers le haut) */
interface Box {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

function overlaps(a: Box, b: Box): boolean {
	return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
}

/**
 * Mesures des étiquettes sur un support, dans l'unité du support (px à
 * l'écran, cm au PDF). L'écran : `figure-svg.ts` + `FigureBlockView.svelte`
 * (graduations 10 px, noms 13 px) ; le PDF : `figure-typst.ts` + `exportToTypst`
 * (graduations 6,5 pt, noms dans la police du document, 11 pt). Les tailles
 * de texte RELATIVES à la figure ne sont pas les mêmes (≈ × 1,5 au PDF) : une
 * étiquette de graduation est omise si elle chevauche un nom sur l'UN des deux.
 */
interface LabelMetrics {
	/** Longueur d'une unité du repère */
	perUnit: number;
	nameGap: (pointSize: number) => { gap: number; diagonal: number };
	nameCharWidth: number;
	nameHeight: number;
	tickCharWidth: number;
	tickHeight: number;
	/** Distance axe des abscisses → haut de l'étiquette */
	xTickGap: number;
	/** Distance axe des ordonnées → bord droit de l'étiquette */
	yTickGap: number;
	/** Espace gardé entre une étiquette de graduation et un nom */
	pad: number;
}

const CM_PER_PT = 2.54 / 72;

function screenMetrics(size: FigureSize, w: FigureWindow): LabelMetrics {
	return {
		perUnit: FIGURE_PIXEL_WIDTH[size] / (w.xMax - w.xMin),
		nameGap: (pointSize) => ({ gap: pointSize + 3, diagonal: pointSize + 2 }),
		nameCharWidth: 8,
		nameHeight: CAP_HEIGHT_EM * FIGURE_LABEL_FONT_PX,
		tickCharWidth: 6,
		tickHeight: CAP_HEIGHT_EM * 10,
		// Ligne de base à 13 px sous l'axe ; étiquettes à 5 px à gauche (`figure-svg.ts`)
		xTickGap: 13 - CAP_HEIGHT_EM * 10,
		yTickGap: 5,
		pad: 2
	};
}

function pdfMetrics(size: FigureSize, w: FigureWindow): LabelMetrics {
	return {
		perUnit: FIGURE_WIDTH_CM[size] / (w.xMax - w.xMin),
		// `LABEL_GAP` / `LABEL_GAP_DIAGONAL_Y` d'`exportToTypst`, en cm sur la page
		nameGap: () => ({ gap: 0.15, diagonal: 0.125 }),
		nameCharWidth: 0.55 * 11 * CM_PER_PT,
		nameHeight: CAP_HEIGHT_EM * 11 * CM_PER_PT,
		tickCharWidth: 0.55 * 6.5 * CM_PER_PT,
		tickHeight: CAP_HEIGHT_EM * 6.5 * CM_PER_PT,
		xTickGap: 0.1,
		yTickGap: 0.1,
		pad: 0.05
	};
}

/** Boîte d'un texte écrit dans la direction `dir` depuis (x, y), comme `svgTextPlacement` / `cetzAnchor` */
function textBox(x: number, y: number, dir: Direction, width: number, height: number): Box {
	const x1 = dir.ux > 0 ? x : dir.ux < 0 ? x - width : x - width / 2;
	const y1 = dir.uy > 0 ? y : dir.uy < 0 ? y - height : y - height / 2;
	return { x1, y1, x2: x1 + width, y2: y1 + height };
}

function nameBox(p: NamedPoint, m: LabelMetrics): Box {
	const { gap, diagonal } = m.nameGap(p.pointSize);
	const off = labelOffset(p.dir, gap / m.perUnit, diagonal / m.perUnit);
	return textBox(
		p.x + off.dx,
		p.y + off.dy,
		p.dir,
		(p.label.length * m.nameCharWidth) / m.perUnit,
		m.nameHeight / m.perUnit
	);
}

function tickBox(
	axis: 'x' | 'y',
	value: number,
	text: string,
	axisAt: number,
	m: LabelMetrics
): Box {
	const width = (text.length * m.tickCharWidth) / m.perUnit;
	const height = m.tickHeight / m.perUnit;
	const box =
		axis === 'x'
			? textBox(value, axisAt - m.xTickGap / m.perUnit, { ux: 0, uy: -1 }, width, height)
			: textBox(axisAt - m.yTickGap / m.perUnit, value, { ux: -1, uy: 0 }, width, height);
	const pad = m.pad / m.perUnit;
	return { x1: box.x1 - pad, y1: box.y1 - pad, x2: box.x2 + pad, y2: box.y2 + pad };
}

/** Noms de points visibles (même table de placement que l'écran et le PDF) */
function namedPoints(
	figure: Figure,
	elements: GeoElement[],
	positions: Map<string, { x: number; y: number }>
): NamedPoint[] {
	const named: NamedPoint[] = [];
	for (const el of elements) {
		if (!isPointElement(el) || !el.label || el.labelHidden) continue;
		const pos = positions.get(el.id);
		if (!pos) continue;
		named.push({
			...pos,
			label: el.label,
			dir: labelDirection(el.labelPosition),
			pointSize: resolveStyle(el, figure.defaults).pointSize
		});
	}
	return named;
}

/** Repère de l'en-tête, ou null sans axes ni grille. */
export function buildFigureFrame(
	header: { axes: boolean; grid: FigureStep | null; ticks: FigureStep | false | null },
	w: FigureWindow,
	size: FigureSize,
	locale: ContentLocale = 'fr',
	/** Noms de points : une étiquette de graduation qui en chevauche un est omise */
	names: NamedPoint[] = []
): FigureFrame | null {
	if (!header.axes && header.grid === null) return null;
	const grid = header.grid
		? { xs: multiples(header.grid.x, w.xMin, w.xMax), ys: multiples(header.grid.y, w.yMin, w.yMax) }
		: null;
	if (!header.axes) return { grid, axes: null };

	const xAxisY = w.yMin <= 0 && 0 <= w.yMax ? 0 : w.yMin > 0 ? w.yMin : w.yMax;
	const yAxisX = w.xMin <= 0 && 0 <= w.xMax ? 0 : w.xMin > 0 ? w.xMin : w.xMax;
	const originVisible = xAxisY === 0 && yAxisX === 0;

	const media = [screenMetrics(size, w), pdfMetrics(size, w)];
	const hiddenByName = (axis: 'x' | 'y', value: number, text: string): boolean =>
		media.some((m) => {
			const box = tickBox(axis, value, text, axis === 'x' ? xAxisY : yAxisX, m);
			return names.some((p) => overlaps(nameBox(p, m), box));
		});
	const ticksFor = (axis: 'x' | 'y', step: number, min: number, max: number): FigureTick[] => {
		const stride = Math.max(
			1,
			...media.map((m) => {
				const gap =
					axis === 'x'
						? MIN_TICK_LABEL_GAP.xChars * m.tickCharWidth
						: MIN_TICK_LABEL_GAP.yHeights * m.tickHeight;
				return Math.ceil(gap / (step * m.perUnit));
			})
		);
		return multiples(step, min, max)
			.filter((v) => !originVisible || Math.abs(v) > EPSILON)
			.map((value) => {
				if (Math.round(value / step) % stride !== 0) return { value, label: null };
				const text = formatTick(value, locale);
				return { value, label: hiddenByName(axis, value, text) ? null : text };
			});
	};
	const step = header.ticks === null ? (header.grid ?? { x: 1, y: 1 }) : header.ticks;
	const ticks = step
		? {
				x: ticksFor('x', step.x, w.xMin, w.xMax),
				y: ticksFor('y', step.y, w.yMin, w.yMax)
			}
		: { x: [], y: [] };
	const originLabel =
		originVisible && !names.some((p) => Math.abs(p.x) < EPSILON && Math.abs(p.y) < EPSILON);
	return { grid, axes: { xAxisY, yAxisX, originVisible, originLabel, ticks } };
}

// ============================================================================
// SCÈNE
// ============================================================================

const MAX_WARNINGS = 10;

/**
 * Style par défaut d'une figure de manuel : objets NOIRS (l'écran les affiche
 * dans la couleur du texte, claire ou sombre), traits fins, petits points.
 */
export const FIGURE_DEFAULT_COLOR = '#000000';
const FIGURE_DEFAULTS = {
	defaultColor: FIGURE_DEFAULT_COLOR,
	defaultStrokeWidth: 1.5,
	defaultPointSize: 3,
	// Remplissage sans `opacite_fond` : translucide, on voit les traits dessous.
	// Le même à l'écran et au PDF (avant : 25 % à l'écran, opaque au PDF).
	defaultFillOpacity: 0.25
} as const;

export function buildFigureScene(
	node: FigureNode,
	options: FigureSceneOptions = {}
): FigureSceneResult {
	const warnings: FigureIssue[] = [];
	if (node.errors.length > 0 || node.header.window === null) {
		return { scene: null, errors: node.errors, warnings };
	}
	const window = node.header.window;

	// Taille du script : avant toute analyse
	if (node.script.length > FIGURE_LIMITS.scriptChars) {
		return {
			scene: null,
			errors: [{ message: `Script trop long (au plus ${FIGURE_LIMITS.scriptChars} caractères)` }],
			warnings
		};
	}
	if (node.script.split('\n').length > FIGURE_LIMITS.scriptLines) {
		return {
			scene: null,
			errors: [{ message: `Script trop long (au plus ${FIGURE_LIMITS.scriptLines} lignes)` }],
			warnings
		};
	}

	const comma = findDecimalComma(node.script);
	if (comma) {
		const [int, dec] = comma.number.split(',');
		return {
			scene: null,
			errors: [
				issueAt(
					node,
					comma.line,
					`virgule décimale dans « ${comma.number} » : écrire ${int}.${dec} ou ${int}{,}${dec} (la virgule et le point-virgule séparent les arguments)`
				)
			],
			warnings
		};
	}

	let program: DslProgram;
	try {
		program = parse(normalizeFigureScript(node.script));
	} catch (error) {
		return { scene: null, errors: [toIssue(node, error)], warnings };
	}

	const refused = findRefused(program);
	if (refused) {
		return { scene: null, errors: [issueAt(node, refused.line, refused.reason)], warnings };
	}

	const figure = new Figure(FIGURE_DEFAULTS);
	figure.setElementLimit(FIGURE_LIMITS.elements);
	try {
		interpret(program, figure, undefined, { maxSteps: FIGURE_LIMITS.steps });
	} catch (error) {
		return { scene: null, errors: [toIssue(node, error)], warnings };
	}

	const drawn = figure.getAllElements().filter((el) => el.visible);
	const outside = drawn.find((el) => !isFigureDrawable(el));
	if (outside) {
		const name = outside.label ? `« ${outside.label} » ` : '';
		return {
			scene: null,
			errors: [
				{ message: `L’objet ${name}(${outside.type}) n’est pas pris en charge dans une figure` }
			],
			warnings
		};
	}

	const invalid = validateDrawing(node, figure, drawn, warnings);
	if (invalid) return { scene: null, errors: [invalid], warnings };
	// Relire après normalisation des couleurs (`updateStyle` remplace l'objet)
	const elements = figure.getAllElements().filter((el) => el.visible);

	const positions = new Map<string, { x: number; y: number }>();
	for (const el of elements) {
		if (!isPointElement(el)) continue;
		const pos = figure.getPosition(el.id);
		if (!pos) continue;
		const x = geoToNumber(pos.x);
		const y = geoToNumber(pos.y);
		if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
		positions.set(el.id, { x, y });
		const inside = x >= window.xMin && x <= window.xMax && y >= window.yMin && y <= window.yMax;
		if (!inside && warnings.length < MAX_WARNINGS) {
			warnings.push({
				message: `Le point ${el.label ?? ''} est hors de la fenêtre`.replace('  ', ' ')
			});
		}
	}

	return {
		scene: {
			figure,
			frame: buildFigureFrame(
				node.header,
				window,
				node.header.size,
				options.locale,
				node.header.axes ? namedPoints(figure, elements, positions) : []
			),
			viewport: { ...window },
			elements,
			positions,
			ariaLabel: node.header.description ?? autoAriaLabel(elements, node.header.axes)
		},
		errors: [],
		warnings
	};
}
