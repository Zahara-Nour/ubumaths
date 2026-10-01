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

import type { FigureIssue, FigureNode } from '../types/figure';
import { FIGURE_LIMITS } from '../types/figure';
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

export interface FigureScene {
	figure: Figure;
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
 * Seule forme de couleur admise en sortie : hexadécimale à 3, 4, 6 ou 8
 * chiffres (ce que `rgb("…")` de Typst accepte). Tout le reste — `red`, `"`,
 * `red;mask-image:url(…)` — ferait échouer TOUTE la fiche PDF, ou injecterait
 * du CSS à l'écran (chat élève).
 */
export const FIGURE_HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Noms courants, anglais et français (les noms français du DSL sont déjà résolus en amont). */
const COLOR_NAMES: Readonly<Record<string, string>> = {
	rouge: '#dc2626',
	red: '#dc2626',
	bleu: '#1e40af',
	blue: '#1e40af',
	vert: '#16a34a',
	green: '#16a34a',
	orange: '#ea580c',
	violet: '#9333ea',
	purple: '#9333ea',
	noir: '#000000',
	black: '#000000',
	gris: '#4b5563',
	gray: '#4b5563',
	grey: '#4b5563',
	jaune: '#f59e0b',
	yellow: '#f59e0b',
	cyan: '#0891b2',
	blanc: '#ffffff',
	white: '#ffffff',
	marron: '#92400e',
	brown: '#92400e',
	rose: '#db2777',
	pink: '#db2777'
};

/** Couleur sûre (hexadécimale) ou null si inconnue. */
export function normalizeFigureColor(raw: string): string | null {
	const value = raw.trim();
	if (FIGURE_HEX_COLOR.test(value)) return value;
	return COLOR_NAMES[value.toLowerCase()] ?? null;
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
 * couleur connus sont remplacés par leur valeur hexadécimale dans la figure.
 */
function validateDrawing(
	node: FigureNode,
	figure: Figure,
	elements: GeoElement[]
): FigureIssue | null {
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
			const hex = normalizeFigureColor(raw);
			if (hex === null) {
				const what = key === 'color' ? 'couleur' : 'couleur de remplissage';
				return located(
					el,
					`${name}${what} inconnue (écrire un nom courant comme rouge, bleu, red, blue, ou une valeur #2563eb)`,
					raw
				);
			}
			if (hex !== raw) fixes[key] = hex;
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

function autoAriaLabel(elements: GeoElement[]): string {
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
	return parts.length > 0 ? `Figure géométrique : ${parts.join(', ')}` : 'Figure géométrique';
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
	defaultPointSize: 3
} as const;

export function buildFigureScene(node: FigureNode): FigureSceneResult {
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

	const invalid = validateDrawing(node, figure, drawn);
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
			viewport: { ...window },
			elements,
			positions,
			ariaLabel: node.header.description ?? autoAriaLabel(elements)
		},
		errors: [],
		warnings
	};
}
