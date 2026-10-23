/**
 * Atelier — reporter les points et les courbes vers une `Figure` de `geometry-core`
 *
 * Le pendant de `plot-sync.ts` pour la vue Figure (géométrie v2, lot 1, PR 2 ;
 * `docs/archive/wip/atelier-geometrie-phase0.md`, F2, F4, F5, S1, S2, S4). Mêmes
 * règles : l'atelier détient l'état, la figure le reflète, **un seul sens**
 * (rien de ce qui se passe dans la figure ne remonte), **idempotent** (deux
 * passages sans changement ne font rien).
 *
 * ## Pourquoi l'API `Figure.create*` et pas le DSL (`interpret`)
 *
 * Choix technique de la PR 2. Le DSL lit du TEXTE : il aurait fallu réécrire
 * chaque définition de l'atelier en script (`courbe("…")`), donc repasser par
 * une sortie texte relue — ce que l'invariant 10 de `atelier.md` interdit, et
 * qui a déjà coûté cher (`sin` relu `s i n`, constantes perdues). L'atelier a
 * déjà les ARBRES (dérivées développées, fonctions remplacées) : on les donne
 * tels quels à la figure. Et `courbe()` ne sait pas suivre un curseur dans une
 * conique (mesuré : `courbe("x^2 + y^2 = a^2")` rend une conique dégénérée,
 * `a` y vaut 0) ; l'API, si (`parameterRecipe`). La CLASSIFICATION, elle, est
 * celle de `courbe()` : `curveShapeOf` (`geometry/curve-nature.ts`), lue d'abord
 * sur l'équation TELLE QU'ÉCRITE (`y = 1/x` reste une courbe y = f(x)) ; l'équation
 * développée ne sert que si l'écrite ne donne qu'une courbe implicite
 * (`(x − 1)² + (y − 2)² = 4`, un cercle) ou si elle révèle une droite (la tangente
 * `y = 4(x − 2) + 4`).
 *
 * Ce que l'équation décrit est DESSINÉ, même dégénéré (l'atelier constate, il
 * montre l'ensemble des solutions) : le point isolé de `x² + y² = 0`, la droite
 * double de `x² = 0`, les deux droites de `x² = 4` ; seul le vide ne dessine rien.
 *
 * ## Les curseurs partagés (S1, S2, S4)
 *
 * Une valeur à curseur citée par un point ou une courbe devient un curseur
 * CACHÉ de la figure, aux bornes de sa carte. Glisser la valeur ne reconstruit
 * pas la figure : `Figure.moveSlider` marque ses seuls descendants, `recompute`
 * ne recalcule qu'eux. Seul un changement de STRUCTURE (une définition, un
 * objet, une borne de curseur) refait la figure — c'est l'empreinte.
 *
 * Exact d'abord (geometry-core/CLAUDE.md, règle 10) : un point sans curseur a
 * ses coordonnées exactes (`GeoValue` exacte), une droite sans curseur aussi ;
 * ce qui suit un curseur se calcule en nombres, comme tout ce qui bouge.
 *
 * @module atelier/figure-sync
 */

import type { Atelier } from './atelier.svelte';
import type {
	AtelierObject,
	CurveDisplay,
	CurveObject,
	PointDisplay,
	PointObject,
	PointSize,
	StrokeDisplay
} from './types';
import type { CompiledFn, MathNode } from '$lib/mathAST';
import {
	add,
	compile,
	divide,
	getVariables,
	multiply,
	number as mathNumber,
	opposite
} from '$lib/mathAST';
import { differentiate } from '$lib/mathAST/differentiation';
import { isZeroExpression } from '$lib/mathAST/normal';
import { Figure } from '$lib/geometry-core/graph/figure';
import type {
	CurveParameter,
	GeoFunctionDomain,
	GeoStyle
} from '$lib/geometry-core/types/elements';
import type { CurvePiece, Restriction } from '$lib/grapheur/restriction';
import { exact, numeric, type ScalarParam } from '$lib/geometry-core/types/geo-value';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { resolveScreenStyle } from '$lib/geometry-core/rendering/svg-primitives';
import {
	classifyConic,
	degenerateConic,
	type DegenerateConic
} from '$lib/geometry-core/geometry/conic-classify';
import {
	conicCoefficientNodes,
	conicCoefficients,
	curveShapeOf,
	equationExpression,
	expandedEquation,
	quadraticOrImplicit,
	type CurveShape,
	type QuadraticShape
} from '$lib/geometry-core/geometry/curve-nature';
import { isFigureObject, isFunction, isValue, type FunctionObject } from './types';
import { plotRestrictionOf } from './interval';
import { constantOf } from './constant';
import { pointCoordinatesOf } from './parse';
import { hideIndexedNames } from '$lib/mathAST/common/indexed-names';
import { substitutedAstOf, substitutedTextOf } from './engine';
import {
	constructionOf,
	isConstruction,
	nodeOf,
	type ConstructionMemo,
	type DeferredIntersection,
	type FigureRecipes
} from './construction';
import { intersectionPoint, type Support } from './construction-intersect';
import { isExact, type GeoValue } from '$lib/geometry-core/types/geo-value';
import { simplifyExact } from '$lib/geometry-core/compute/geo-arithmetic';
import { substitute } from '$lib/mathAST/eval/substitute';
import type { GeoPoint } from '$lib/geometry-core/types/primitives';
import { displayName } from './names';

// =============================================================================
// Types
// =============================================================================

/** Ce que la synchronisation a fait : rien, bouger des curseurs, ou refaire la figure. */
export type FigureSyncOutcome = 'unchanged' | 'moved' | 'restyled' | 'rebuilt';

/** Un curseur de l'atelier tel que la figure doit le porter. */
interface WantedSlider {
	readonly name: string;
	readonly value: number;
	readonly min: number;
	readonly max: number;
	/**
	 * La valeur sort des bornes de la carte (au-delà de ±10⁹, que la carte ne
	 * dépasse pas : `widenedSlider`). La figure la ramènerait dans les bornes —
	 * elle montrerait 10⁹ pour 10¹⁰ — et chaque passage la « bougerait » encore :
	 * ce qui la cite n'est pas dessiné, comme un objet en attente.
	 */
	readonly outOfRange: boolean;
}

/**
 * Le dessin réglé dans la carte (K4 pour 𝒞f, lot 4b pour points et courbes) :
 * un style de la figure, et pour un point son nom masqué ou non. Absent tant que
 * rien n'est réglé — le dessin par défaut de la figure. Hors empreinte : il se
 * pose par `Figure.updateStyle` / `setLabelHidden`, sans refaire la figure.
 */
interface Look {
	readonly style: GeoStyle;
	readonly labelHidden?: boolean;
}

/** Un point à dessiner : ses deux coordonnées, curseurs gardés en lettres. */
interface WantedPoint {
	readonly kind: 'point';
	readonly name: string;
	readonly x: MathNode;
	readonly y: MathNode;
	readonly look?: Look;
}

/** Une courbe à dessiner : F(x, y) = 0, écrite et développée, curseurs gardés en lettres. */
interface WantedCurve {
	readonly kind: 'curve';
	readonly name: string;
	readonly equation: string;
	/** F telle qu'écrite (gauche − droite) : la forme se lit d'abord sur elle. */
	readonly raw: MathNode;
	/** F développée et réduite. */
	readonly F: MathNode;
	readonly look?: Look;
}

/**
 * 𝒞f à dessiner (géométrie v2, K1-K3) : une fonction marquée `inFigure`, son
 * expression en x — dérivées et fonctions citées développées, curseurs gardés
 * en lettres —, et son ensemble (K2) en morceaux, comme pour le Graphe.
 */
interface WantedFunction {
	readonly kind: 'function';
	readonly name: string;
	readonly expression: MathNode;
	readonly pieces?: Restriction;
	/** Le trait de sa carte (K4 : couleur, pointillés, épaisseur), absent pour une fonction jamais tracée. */
	readonly look?: Look;
}

/**
 * Une construction (lot 2, L1) : droite, segment, demi-droite portés par deux
 * points, ou cercle par son centre et son rayon — CALCULÉS par l'atelier
 * (`construction.ts`), curseurs gardés en lettres. La figure n'en reçoit que
 * les arbres : elle ne refait aucune construction.
 */
type WantedConstruction =
	| {
			readonly kind: 'construction';
			readonly name: string;
			readonly shape: 'line' | 'segment' | 'ray';
			readonly from: readonly [MathNode, MathNode];
			readonly to: readonly [MathNode, MathNode];
			readonly look?: Look;
	  }
	| {
			readonly kind: 'construction';
			readonly name: string;
			readonly shape: 'circle';
			readonly center: readonly [MathNode, MathNode];
			readonly radius: MathNode;
			readonly look?: Look;
	  };

type Wanted = WantedPoint | WantedCurve | WantedFunction | WantedConstruction;

/** Ce que l'atelier demande à la figure. */
export interface FigurePlan {
	readonly sliders: readonly WantedSlider[];
	/**
	 * Les points d'intersection qui suivent un curseur (PR 3) : deux nombres de la
	 * figure chacun, recalculés à chaque cran par le calcul même de l'atelier
	 * (`intersectionPoint`) — dans l'ordre, un point peut en citer un autre.
	 */
	readonly derived: readonly DeferredIntersection[];
	readonly objects: readonly Wanted[];
}

// =============================================================================
// Constantes
// =============================================================================

/** En deçà, un coefficient de droite qui suit un curseur est tenu pour nul. */
const ZERO_EPSILON = 1e-12;

/**
 * Le rayon (px) d'un point par taille de sa carte : « moyen » est le dessin
 * d'avant (`defaultPointSize` absent : 5), « petit » reste visible, « grand »
 * ne mange pas le nom (posé à `pointSize + 4`).
 */
const POINT_RADII: Record<PointSize, number> = { small: 3, medium: 5, large: 7 };

// =============================================================================
// La figure de l'atelier
// =============================================================================

/**
 * La figure que montre la vue Figure, et ce qu'on sait de ce qu'on y a posé.
 *
 * Une PROJECTION, pas un état de l'atelier (invariant 1) : elle se refait à
 * l'identique depuis l'atelier, à tout moment.
 */
export class AtelierFigure {
	#figure = new Figure();
	#fingerprint: string | null = null;
	/** Nom de la valeur → id du curseur caché. */
	#sliders = new Map<string, string>();
	/** Nom du point ou de la courbe → id de l'élément visible. */
	#elements = new Map<string, string>();
	/** Nom d'un objet → ce qu'on a dessiné pour lui, et le réglage qu'on y a posé. */
	#looks = new Map<string, Drawn>();
	#changes = 0;

	get figure(): Figure {
		return this.#figure;
	}

	/**
	 * Le nombre de passages qui ont changé quelque chose (`moved` ou `rebuilt`) :
	 * la toile le reçoit en `externalVersion` pour se redessiner.
	 */
	get changes(): number {
		return this.#changes;
	}

	/** L'id du curseur caché qui porte la valeur `name`, s'il y en a un. */
	sliderOf(name: string): string | undefined {
		return this.#sliders.get(name);
	}

	/** L'id de l'élément dessiné pour le point ou la courbe `name`, s'il y en a un. */
	elementOf(name: string): string | undefined {
		return this.#elements.get(name);
	}

	/** Le nom de l'objet dessiné par l'élément `id`, s'il y en a un (le glisser, lot 3). */
	nameOf(id: string): string | undefined {
		for (const [name, element] of this.#elements) if (element === id) return name;
		return undefined;
	}

	/** Réservé à `syncFigure`. */
	apply(plan: FigurePlan): FigureSyncOutcome {
		const fingerprint = fingerprintOf(plan);
		if (fingerprint !== this.#fingerprint || this.#lookDropped(plan)) {
			this.#rebuild(plan);
			this.#fingerprint = fingerprint;
			this.#changes++;
			return 'rebuilt';
		}
		const restyled = this.#restyle(plan);
		let moved = false;
		for (const slider of plan.sliders) {
			const id = this.#sliders.get(slider.name);
			if (id === undefined || this.#figure.getScalarValue(id) === slider.value) continue;
			this.#figure.moveSlider(id, slider.value);
			moved = true;
		}
		if (!moved && !restyled) return 'unchanged';
		if (moved) this.#figure.recompute();
		this.#changes++;
		return moved ? 'moved' : 'restyled';
	}

	/**
	 * Un réglage posé qui disparaît (une sauvegarde relue peut le perdre) :
	 * `updateStyle` fusionne et ne sait pas rendre le défaut — on refait la figure.
	 */
	#lookDropped(plan: FigurePlan): boolean {
		return plan.objects.some((o) => {
			const drawn = this.#looks.get(o.name);
			return drawn !== undefined && drawn.key !== lookKey(undefined) && o.look === undefined;
		});
	}

	/** Repeindre les objets dont la carte a changé de réglage ; vrai si l'un l'a été. */
	#restyle(plan: FigurePlan): boolean {
		let changed = false;
		for (const object of plan.objects) {
			const drawn = this.#looks.get(object.name);
			const key = lookKey(object.look);
			if (drawn === undefined || drawn.key === key || object.look === undefined) continue;
			paint(this.#figure, drawn, object.look);
			drawn.key = key;
			changed = true;
		}
		return changed;
	}

	#rebuild(plan: FigurePlan): void {
		const figure = new Figure();
		const sliders = new Map<string, string>();
		for (const { name, value, min, max } of plan.sliders) {
			// Pas de `step` : le pas est celui de la carte, que l'atelier applique
			// avant que la valeur arrive ici (`slideTo`). Le réappliquer arrondirait
			// une valeur tapée (2,37 au pas de 0,1) et la figure mentirait.
			sliders.set(name, figure.createSlider(min, max, value, { visible: false, label: name }));
		}
		// Les intersections à curseur : leurs coordonnées, deux nombres de la figure
		// que les objets citent par leurs lettres (`intersection_1_x`)
		for (const derived of plan.derived) {
			try {
				const parameters = parametersOf(supportTrees(derived), sliders);
				const { x, y } = derivedCoordinates(derived, parameters);
				const ids = sliderIds(parameters);
				sliders.set(derived.x, figure.createScalarExpression(x, ids));
				sliders.set(derived.y, figure.createScalarExpression(y, ids));
			} catch {
				// Rien de posé : les objets qui le citent ne se poseront pas (F5)
			}
		}
		const elements = new Map<string, string>();
		const looks = new Map<string, Drawn>();
		for (const object of plan.objects) {
			// Une courbe que la figure refuse (compilation impossible) n'est pas
			// dessinée : sa carte, elle, reste ce qu'elle est (F5)
			const before = new Set(figure.getAllElements().map((el) => el.id));
			try {
				const id =
					object.kind === 'function'
						? (posePlottedFunction(figure, object, sliders)[0] ?? null)
						: object.kind === 'point'
							? posePoint(figure, object, sliders)
							: object.kind === 'construction'
								? poseConstruction(figure, object, sliders)
								: poseCurve(figure, object, sliders);
				if (id !== null) elements.set(object.name, id);
				// Tout ce qui est VISIBLE et vient d'être posé pour l'objet porte son
				// réglage — les morceaux de 𝒞f, les sortes d'une conique à curseur ;
				// un texte (le nom d'un cercle) n'en prend que la couleur
				const drawn: Drawn = { ids: [], texts: [], key: lookKey(object.look) };
				for (const el of figure.getAllElements()) {
					if (before.has(el.id) || !el.visible) continue;
					(el.type === 'text' ? drawn.texts : drawn.ids).push(el.id);
				}
				if (object.look !== undefined) paint(figure, drawn, object.look);
				looks.set(object.name, drawn);
			} catch {
				// Les aides déjà posées (calculs cachés, points d'une droite) s'en vont
				// avec l'objet : rien de lui ne reste dans la figure
				for (const el of figure.getAllElements()) {
					if (!before.has(el.id) && figure.getElementById(el.id) !== undefined) {
						figure.remove(el.id);
					}
				}
			}
		}
		this.#figure = figure;
		this.#sliders = sliders;
		this.#elements = elements;
		this.#looks = looks;
	}
}

/** Ce qu'on a dessiné pour un objet : ses éléments visibles, ses textes, le réglage posé. */
interface Drawn {
	readonly ids: string[];
	readonly texts: string[];
	key: string;
}

function lookKey(look: Look | undefined): string {
	return JSON.stringify(look ?? null);
}

/** Poser un réglage sur ce qu'on a dessiné pour un objet. */
function paint(figure: Figure, drawn: Drawn, look: Look): void {
	for (const id of drawn.ids) {
		figure.updateStyle(id, look.style);
		if (look.labelHidden !== undefined) figure.setLabelHidden(id, look.labelHidden);
	}
	const { color } = look.style;
	if (color === undefined) return;
	for (const id of drawn.texts) figure.updateStyle(id, { color });
}

/**
 * Mettre la figure en accord avec l'atelier.
 *
 * ⚠️ **Idempotente** : appelée deux fois sans changement, elle ne fait rien
 * (`'unchanged'`) — l'effet qui l'appelle à chaque révision ne boucle pas.
 */
export function syncFigure(atelier: Atelier, target: AtelierFigure): FigureSyncOutcome {
	return target.apply(planOf(atelier));
}

let defaultColor: string | null = null;

/**
 * La couleur ÉCRAN d'un point ou d'une courbe sans réglage, telle que la vue
 * Géométrie la peint (`resolveScreenStyle` d'un élément neuf) : le point de
 * couleur d'une carte sans réglage la montre, pour dire ce qui est dessiné.
 */
export function figureDefaultColor(): string {
	if (defaultColor === null) {
		const figure = new Figure();
		const id = figure.createFreePoint({ x: numeric(0), y: numeric(0) });
		const el = figure.getElementById(id);
		defaultColor = el === undefined ? '' : resolveScreenStyle(el, figure.defaults).color;
	}
	return defaultColor;
}

// =============================================================================
// Ce que l'atelier demande
// =============================================================================

/**
 * Les valeurs qui ont un curseur dans leur carte : une valeur `ok`, sans unité
 * (D4), constante — la règle de `ObjectCard` (une valeur calculée n'a pas de
 * curseur, elle suit les siens).
 */
function slidersOf(atelier: Atelier): Map<string, WantedSlider> {
	const sliders = new Map<string, WantedSlider>();
	for (const o of atelier.objects) {
		if (!isValue(o) || o.status !== 'ok' || o.unit !== undefined || o.slider === undefined) {
			continue;
		}
		const value = constantOf(o.definition, o.provenance, atelier.functionNames);
		if (value === null) continue;
		const { min, max } = o.slider;
		sliders.set(o.name, { name: o.name, value, min, max, outOfRange: value < min || value > max });
	}
	return sliders;
}

function planOf(atelier: Atelier): FigurePlan {
	const sliders = slidersOf(atelier);
	const keep = new Set(sliders.keys());
	// Un mémo pour tout le passage : curseurs gardés en lettres, celui de l'atelier ne sert pas
	const memo: ConstructionMemo = new Map();
	// PR 3 : les curseurs de position des `point_sur`, les intersections à curseur
	const recipes: FigureRecipes = { positions: new Map(), intersections: [] };
	const objects: Wanted[] = [];
	const cited = new Set<string>();
	for (const object of atelier.objects) {
		// F5 : en erreur, en attente ou à compléter, l'objet n'est pas dessiné
		if (object.status !== 'ok') continue;
		const wanted = isFigureObject(object)
			? wantedOf(atelier, object, keep, memo, recipes)
			: isFunction(object) && object.inFigure === true
				? wantedFunctionOf(atelier, object, keep)
				: null;
		if (wanted === null) continue;
		const trees =
			wanted.kind === 'point'
				? [wanted.x, wanted.y]
				: wanted.kind === 'curve'
					? [wanted.raw, wanted.F]
					: wanted.kind === 'construction'
						? constructionTrees(wanted)
						: [wanted.expression];
		const names = new Set(trees.flatMap((tree) => [...getVariables(tree)]));
		if ([...names].some((name) => sliders.get(name)?.outOfRange === true)) continue;
		objects.push(wanted);
		for (const name of names) cited.add(name);
	}
	for (const derived of recipes.intersections) {
		for (const tree of supportTrees(derived)) {
			for (const name of getVariables(tree)) cited.add(name);
		}
	}
	// Une position écrite est un curseur caché, aux bornes de son curseur de carte
	// (élargies à la valeur tapée : la figure la ramènerait dans les bornes)
	for (const [name, { value, slider }] of recipes.positions) {
		sliders.set(name, {
			name,
			value,
			min: Math.min(slider.min, value),
			max: Math.max(slider.max, value),
			outOfRange: false
		});
	}
	// Seuls les curseurs CITÉS entrent dans la figure (et dans son empreinte)
	return {
		sliders: [...sliders.values()].filter((s) => cited.has(s.name)),
		derived: recipes.intersections,
		objects
	};
}

/** Les arbres d'un support : ses coordonnées, son rayon, ses coefficients, son expression. */
function treesOfSupport(support: Support): MathNode[] {
	const values: GeoValue[] =
		support.type === 'line'
			? [support.from.x, support.from.y, support.to.x, support.to.y]
			: support.type === 'circle'
				? [support.center.x, support.center.y, support.radius]
				: support.type === 'conic'
					? [...support.coefficients]
					: [];
	const trees = values.map((v) => nodeOf(v));
	return support.type === 'graph' ? [...trees, support.expression] : trees;
}

function supportTrees(derived: DeferredIntersection): MathNode[] {
	return [...treesOfSupport(derived.a), ...treesOfSupport(derived.b)];
}

/**
 * Les deux coordonnées d'une intersection à curseur, en fonctions des curseurs :
 * les valeurs des curseurs substituées dans les supports, puis `intersectionPoint`
 * — le calcul de la carte, donc son point et sa numérotation. Une seule résolution par jeu de valeurs (les
 * deux coordonnées la partagent) ; pas de point : NaN, la figure ne le dessine pas.
 */
function derivedCoordinates(
	derived: DeferredIntersection,
	parameters: readonly CurveParameter[]
): {
	readonly x: (values: ReadonlyMap<string, number>) => number;
	readonly y: (values: ReadonlyMap<string, number>) => number;
} {
	const env: Record<string, number> = {};
	const numericSupport = numericSupportOf(derived.a, env, parameters);
	const otherSupport = numericSupportOf(derived.b, env, parameters);
	let lastKey: string | null = null;
	let last: GeoPoint | null = null;
	const solve = (values: ReadonlyMap<string, number>): GeoPoint | null => {
		for (const { sliderId, name } of parameters) env[name] = values.get(sliderId) ?? NaN;
		const key = parameters.map(({ name }) => env[name]).join('|');
		if (key === lastKey) return last;
		lastKey = key;
		if (parameters.some(({ name }) => !Number.isFinite(env[name]))) return (last = null);
		try {
			last = intersectionPoint(numericSupport(), otherSupport(), derived.k, derived.labels);
		} catch {
			last = null;
		}
		return last;
	};
	return {
		x: (values) => {
			const p = solve(values);
			return p === null ? NaN : geoToNumber(p.x);
		},
		y: (values) => {
			const p = solve(values);
			return p === null ? NaN : geoToNumber(p.y);
		}
	};
}

/** Un support aux valeurs courantes des curseurs (`env`, partagé), exact comme la carte. */
function numericSupportOf(
	support: Support,
	env: Record<string, number>,
	parameters: readonly CurveParameter[]
): () => Support {
	// Les valeurs des curseurs SUBSTITUÉES dans les arbres exacts : le calcul de la
	// carte, racines exactes comprises (revue de la PR 3 : un Newton sur [−10 ; 10]
	// dessinait un autre point que la carte)
	const bindings = (): Record<string, number> => {
		const values: Record<string, number> = {};
		for (const { name } of parameters) values[name] = env[name];
		return values;
	};
	const valueOf = (v: GeoValue): (() => GeoValue) => {
		if (!isExact(v) || getVariables(v.node).size === 0) return () => v;
		return () => exact(simplifyExact(substitute(v.node, bindings())));
	};
	const pointOf = (p: GeoPoint) => {
		const [x, y] = [valueOf(p.x), valueOf(p.y)];
		return () => ({ x: x(), y: y() });
	};
	switch (support.type) {
		case 'line': {
			const [from, to] = [pointOf(support.from), pointOf(support.to)];
			return () => ({ ...support, from: from(), to: to() });
		}
		case 'circle': {
			const [center, radius] = [pointOf(support.center), valueOf(support.radius)];
			return () => ({ ...support, center: center(), radius: radius() });
		}
		case 'conic': {
			const coefficients = support.coefficients.map(valueOf);
			return () => ({ ...support, coefficients: coefficients.map((c) => c()) });
		}
		case 'graph':
			return () => ({ ...support, expression: substitute(support.expression, bindings()) });
	}
}

/**
 * 𝒞f : l'arbre que le Graphe reçoit aussi (`substitutedAstOf`, qui sait lire la
 * carte `f′` et la carte `f⁻¹`), les curseurs gardés en lettres ; l'ensemble de
 * la fonction, celui que le Graphe respecte (`plotRestrictionOf`, hérité compris).
 */
function wantedFunctionOf(
	atelier: Atelier,
	object: FunctionObject,
	keep: ReadonlySet<string>
): WantedFunction | null {
	const substituted = substitutedAstOf(atelier, object.name, { keepNames: keep });
	if (!substituted.ok) return null;
	const pieces = plotRestrictionOf(object);
	return {
		kind: 'function',
		name: object.name,
		expression: withIndexedNames(substituted.ast),
		...(pieces !== undefined && { pieces }),
		...(object.display !== undefined && { look: { style: strokeOf(object.display) } })
	};
}

/**
 * Le trait de la carte en style de la figure (K4) : la couleur du grapheur
 * (`curve-2`), que la toile peint de son jeton `var(--color-curve-2)` — le même
 * que le Graphe, clair ou sombre (`screenColor` de `svg-primitives.ts`) ;
 * pointillés et épaisseur. `dashdot` n'a pas d'équivalent dans la figure :
 * des tirets.
 */
function strokeOf(display: CurveDisplay | StrokeDisplay): GeoStyle {
	const dash: GeoStyle['dash'] = display.lineStyle === 'dashdot' ? 'dashed' : display.lineStyle;
	// Couleur absente : celle de la figure, déjà peinte — rien à poser
	return {
		...(display.color !== undefined && { color: display.color }),
		dash,
		strokeWidth: display.lineWidth
	};
}

/** Le réglage d'un point en style de la figure : couleur, rayon, nom masqué ou non. */
function pointLookOf(display: PointDisplay): Look {
	return {
		style: {
			...(display.color !== undefined && { color: display.color }),
			pointSize: POINT_RADII[display.size]
		},
		labelHidden: !display.showLabel
	};
}

/**
 * Le réglage de la carte d'un point ou d'une courbe (lot 4b), absent sans réglage.
 * Une courbe n'a pas de `showLabel` : son nom (celui d'un cercle compris) reste écrit.
 */
function figureLookOf(object: PointObject | CurveObject): Look | undefined {
	if (object.kind === 'point') {
		return object.display === undefined ? undefined : pointLookOf(object.display);
	}
	return object.display === undefined ? undefined : { style: strokeOf(object.display) };
}

function constructionTrees(wanted: WantedConstruction): MathNode[] {
	return wanted.shape === 'circle'
		? [...wanted.center, wanted.radius]
		: [...wanted.from, ...wanted.to];
}

/** Une construction calculée par l'atelier, curseurs gardés en lettres (L1). */
function wantedConstructionOf(
	atelier: Atelier,
	object: AtelierObject,
	keep: ReadonlySet<string>,
	memo: ConstructionMemo,
	recipes: FigureRecipes
): WantedPoint | WantedConstruction | null {
	const outcome = constructionOf(atelier, object.name, { keepNames: keep, memo, recipes });
	if (!outcome.ok) return null;
	const { built } = outcome;
	const pair = (p: GeoPoint): readonly [MathNode, MathNode] => [nodeOf(p.x), nodeOf(p.y)];
	if (built.shape === 'point') {
		return { kind: 'point', name: object.name, x: nodeOf(built.at.x), y: nodeOf(built.at.y) };
	}
	if (built.shape === 'circle') {
		return {
			kind: 'construction',
			name: object.name,
			shape: 'circle',
			center: pair(built.center),
			radius: nodeOf(built.radius)
		};
	}
	return {
		kind: 'construction',
		name: object.name,
		shape: built.shape,
		from: pair(built.from),
		to: pair(built.to)
	};
}

/**
 * Un curseur `a_1` gardé en lettre reste un nœud indicé dans l'arbre substitué :
 * la figure le lit sous son nom entier (`hideIndexedNames`), sinon elle cherchait
 * le curseur `a`, et le point `(a_1 ; 2a_1)` n'était pas dessiné (2026-10-19).
 */
function withIndexedNames(ast: MathNode): MathNode {
	return hideIndexedNames(ast).node;
}

function wantedOf(
	atelier: Atelier,
	object: PointObject | CurveObject,
	keep: ReadonlySet<string>,
	memo: ConstructionMemo,
	recipes: FigureRecipes
): WantedPoint | WantedCurve | WantedConstruction | null {
	const wanted = wantedShapeOf(atelier, object, keep, memo, recipes);
	const look = figureLookOf(object);
	return wanted === null || look === undefined ? wanted : { ...wanted, look };
}

function wantedShapeOf(
	atelier: Atelier,
	object: PointObject | CurveObject,
	keep: ReadonlySet<string>,
	memo: ConstructionMemo,
	recipes: FigureRecipes
): WantedPoint | WantedCurve | WantedConstruction | null {
	if (isConstruction(object)) {
		return wantedConstructionOf(atelier, object, keep, memo, recipes);
	}
	if (object.kind === 'point') {
		const coordinates = pointCoordinatesOf(object.definition);
		if (coordinates === null) return null;
		const [x, y] = coordinates.map((c) =>
			substitutedTextOf(atelier, c, object.provenance, { keepNames: keep })
		);
		if (!x.ok || !y.ok) return null;
		return {
			kind: 'point',
			name: object.name,
			x: withIndexedNames(x.ast),
			y: withIndexedNames(y.ast)
		};
	}
	const substituted = substitutedAstOf(atelier, object.name, { keepNames: keep });
	if (!substituted.ok) return null;
	const raw = equationExpression(withIndexedNames(substituted.ast));
	return {
		kind: 'curve',
		name: object.name,
		equation: object.definition,
		raw,
		F: expandedEquation(raw)
	};
}

/**
 * L'empreinte de la STRUCTURE : objets, arbres, curseurs cités et leurs bornes —
 * pas leurs valeurs, que `moveSlider` règle sans rien refaire.
 */
function fingerprintOf(plan: FigurePlan): string {
	return JSON.stringify({
		sliders: plan.sliders.map(({ name, min, max }) => [name, min, max]),
		derived: plan.derived,
		// Le réglage d'un objet n'est pas de la structure : `#restyle` le pose
		objects: plan.objects.map((o) => ({ ...o, look: undefined }))
	});
}

// =============================================================================
// Poser dans la figure
// =============================================================================

/** Les curseurs cités par des arbres, dans l'ordre de `sliders`. */
function parametersOf(
	trees: readonly MathNode[],
	sliders: ReadonlyMap<string, string>
): CurveParameter[] {
	const names = new Set(trees.flatMap((tree) => [...getVariables(tree)]));
	const parameters: CurveParameter[] = [];
	for (const [name, sliderId] of sliders) {
		if (names.has(name)) parameters.push({ sliderId, name });
	}
	return parameters;
}

/**
 * Une fonction des curseurs, pour `createScalarExpression` : un seul `env`
 * mutable par fonction (geometry-core/CLAUDE.md, règle 8).
 */
function scalarCompute(
	evaluate: (env: Record<string, number>) => number,
	parameters: readonly CurveParameter[]
): (values: ReadonlyMap<string, number>) => number {
	const env: Record<string, number> = {};
	return (values) => {
		for (const { sliderId, name } of parameters) env[name] = values.get(sliderId) ?? NaN;
		return evaluate(env);
	};
}

function sliderIds(parameters: readonly CurveParameter[]): string[] {
	return parameters.map((p) => p.sliderId);
}

function isFiniteExact(node: MathNode): boolean {
	return Number.isFinite(geoToNumber(exact(node)));
}

/** Un point : exact sans curseur ; sinon calculé, chaque coordonnée suivant les siens. */
function posePoint(
	figure: Figure,
	point: WantedPoint,
	sliders: ReadonlyMap<string, string>
): string | null {
	return pointAt(figure, point.x, point.y, sliders, { label: displayName(point.name) });
}

/**
 * Un nombre de la figure : exact sans curseur, le curseur lui-même s'il est seul,
 * sinon une expression des curseurs (`createScalarExpression`).
 */
function scalarOf(
	figure: Figure,
	tree: MathNode,
	sliders: ReadonlyMap<string, string>
): ScalarParam {
	const own = parametersOf([tree], sliders);
	if (own.length === 0) return exact(tree);
	if (tree.type === 'variable' && own.length === 1) return { scalarRef: own[0].sliderId };
	const compiled = compile(tree);
	return {
		scalarRef: figure.createScalarExpression(scalarCompute(compiled, own), sliderIds(own))
	};
}

/** Poser un point (visible et nommé, ou caché : un appui de construction). */
function pointAt(
	figure: Figure,
	x: MathNode,
	y: MathNode,
	sliders: ReadonlyMap<string, string>,
	options: { readonly label?: string; readonly visible?: false }
): string | null {
	if (parametersOf([x, y], sliders).length === 0) {
		if (!isFiniteExact(x) || !isFiniteExact(y)) return null;
		return figure.createFreePoint({ x: exact(x), y: exact(y) }, { ...options, draggable: false });
	}
	return figure.createComputedPoint(
		scalarOf(figure, x, sliders),
		scalarOf(figure, y, sliders),
		options
	);
}

/**
 * Une construction : ses appuis (points cachés), puis l'élément de la figure qui
 * existe déjà pour elle — droite, segment, demi-droite, cercle par rayon. Aucun
 * type nouveau, donc aucune surface de rendu à ajouter (geometry-core/CLAUDE.md,
 * règle 5). Un rayon qui suit un curseur le suit sans reconstruire (`scalarRef`).
 */
function poseConstruction(
	figure: Figure,
	wanted: WantedConstruction,
	sliders: ReadonlyMap<string, string>
): string | null {
	const label = displayName(wanted.name);
	const hidden = (p: readonly [MathNode, MathNode]) =>
		pointAt(figure, p[0], p[1], sliders, { visible: false });
	if (wanted.shape === 'circle') {
		const center = hidden(wanted.center);
		if (center === null) return null;
		const id = figure.createCircleByRadius(center, scalarOf(figure, wanted.radius, sliders), {
			label
		});
		// ⚠️ Aucune surface de `geometry-core` n'écrit le nom d'un cercle : l'y
		// ajouter montrerait le nom de chaque cercle de toutes les figures de cours.
		// Le nom est un TEXTE de la figure (de la couleur du cercle ; la vue Géométrie
		// l'écrit pourtant en couleur du texte, `neutralLabels`), accroché à un
		// point CACHÉ du cercle (à 45°) — il suit rayon et centre, curseurs compris.
		// Un texte n'est pas désigné au survol (`findElementNear`) et s'exporte en
		// texte ; le point caché ne s'exporte pas.
		const along = multiply(wanted.radius, mathNumber(String(Math.SQRT1_2)), 'dot');
		const anchor = pointAt(
			figure,
			add(wanted.center[0], along),
			add(wanted.center[1], along),
			sliders,
			{ visible: false }
		);
		if (anchor !== null) {
			const color = figure.getElementById(id)?.color;
			figure.createText(
				label,
				[],
				{ anchorId: anchor, anchorOffset: { dx: 0.2, dy: 0.2 } },
				color === undefined ? {} : { color }
			);
		}
		return id;
	}
	const from = hidden(wanted.from);
	const to = hidden(wanted.to);
	if (from === null || to === null) return null;
	if (wanted.shape === 'segment') return figure.createSegment(from, to, { label });
	if (wanted.shape === 'ray') return figure.createRay(from, to, { label });
	return figure.createLine(from, to, { label });
}

/**
 * 𝒞f : une `GeoFunction` par morceau de son ensemble (K2 ; `GeoFunctionDomain`
 * n'a qu'un intervalle), nommée comme sur sa carte (`f`, `f′`, `f⁻¹`) — le nom
 * sur le premier morceau seulement. Les curseurs se lient par leur nom, comme
 * une courbe `y = f(x)`. Le trait de la carte (K4) se pose après, comme pour
 * tout objet (`paint`). Rend les ids des morceaux, le nommé d'abord.
 */
function posePlottedFunction(
	figure: Figure,
	wanted: WantedFunction,
	sliders: ReadonlyMap<string, string>
): string[] {
	const { expression } = wanted;
	let derivative: MathNode;
	try {
		derivative = differentiate(expression, { variable: 'x', simplify: true });
	} catch {
		// La dérivée ne sert qu'aux tangentes : la courbe se dessine sans
		derivative = mathNumber('0');
	}
	const compiled = compile(expression);
	const compiledDerivative = compile(derivative);
	const dependencies = sliderIds(parametersOf([expression], sliders));
	const label = displayName(wanted.name);
	const equation = `y = ${displayName(wanted.name)}(x)`;
	const pieces = wanted.pieces ?? [null];
	const ids: string[] = [];
	for (const piece of pieces) {
		const id = figure.createFunction(
			expression,
			derivative,
			compiled,
			compiledDerivative,
			equation,
			{
				...(ids.length === 0 && { label }),
				dependencies,
				...(piece !== null && { domain: domainOf(piece) })
			}
		);
		ids.push(id);
	}
	return ids;
}

/** Un morceau de l'ensemble (nombres, ±∞) en domaine de `GeoFunction`. */
function domainOf(piece: CurvePiece): GeoFunctionDomain {
	const bound = (value: number): ScalarParam =>
		value === Infinity
			? { infinity: '+' }
			: value === -Infinity
				? { infinity: '-' }
				: numeric(value);
	return {
		lower: bound(piece.from),
		upper: bound(piece.to),
		lowerType: piece.fromClosed ? 'closed' : 'open',
		upperType: piece.toClosed ? 'closed' : 'open'
	};
}

/** Une courbe : la forme de `courbe()` (`curveShapeOf`), curseurs câblés. */
function poseCurve(
	figure: Figure,
	curve: WantedCurve,
	sliders: ReadonlyMap<string, string>
): string | null {
	// L'écrite d'abord, comme `courbe()` : développée, `y = 1/x` devenait implicite
	const written = curveShapeOf(curve.raw);
	const expanded = curveShapeOf(curve.F);
	const useExpanded =
		written.kind === 'implicit' || (written.kind === 'function' && expanded.kind === 'line');
	const shape = useExpanded ? expanded : written;
	if (shape.kind === 'line') return poseLine(figure, curve, shape, sliders);
	if (shape.kind === 'function') {
		// g = 0 : y n'est pas dans l'équation (`x² = 4`) — ce n'est pas y = f(x)
		if (isZeroExpression(shape.g)) {
			return poseOther(figure, curve, quadraticOrImplicit(curve.F), sliders);
		}
		return poseFunction(figure, curve, shape, sliders);
	}
	return poseOther(figure, curve, shape, sliders);
}

function poseLine(
	figure: Figure,
	curve: WantedCurve,
	{ a, b, c }: Extract<CurveShape, { kind: 'line' }>,
	sliders: ReadonlyMap<string, string>
): string | null {
	const label = displayName(curve.name);
	const parameters = parametersOf([a, b, c], sliders);
	if (parameters.length === 0) {
		// Exact, comme `createLineFromCoefficients` de `courbe()`
		let p1: [MathNode, MathNode];
		let p2: [MathNode, MathNode];
		if (!isZeroExpression(b)) {
			p1 = [mathNumber('0'), divide(opposite(c), b, 'fraction')];
			p2 = [mathNumber('1'), divide(opposite(add(a, c)), b, 'fraction')];
		} else if (!isZeroExpression(a)) {
			const x = divide(opposite(c), a, 'fraction');
			p1 = [x, mathNumber('0')];
			p2 = [x, mathNumber('1')];
		} else {
			// 0 = c : vide ou tout le plan, rien à dessiner (la carte le dit)
			return null;
		}
		const first = figure.createFreePoint(
			{ x: exact(p1[0]), y: exact(p1[1]) },
			{ visible: false, draggable: false }
		);
		const second = figure.createFreePoint(
			{ x: exact(p2[0]), y: exact(p2[1]) },
			{ visible: false, draggable: false }
		);
		return figure.createLine(first, second, {
			label,
			equation: { a, b, c, expression: curve.equation }
		});
	}

	// Les deux points de la droite suivent les curseurs : (0 ; −c/b), (1 ; −(a+c)/b),
	// ou x = −c/a quand b s'annule ; a = b = 0 rend NaN, et la droite disparaît
	const [fa, fb, fc] = [a, b, c].map((node) => compile(node));
	const coordinate = (pick: (a: number, b: number, c: number) => number): ScalarParam => ({
		scalarRef: figure.createScalarExpression(
			scalarCompute((env) => pick(fa(env), fb(env), fc(env)), parameters),
			sliderIds(parameters)
		)
	});
	const flat = (value: number) => Math.abs(value) < ZERO_EPSILON;
	const first = figure.createComputedPoint(
		coordinate((va, vb, vc) => (flat(vb) ? -vc / va : 0)),
		coordinate((_va, vb, vc) => (flat(vb) ? 0 : -vc / vb)),
		{ visible: false }
	);
	const second = figure.createComputedPoint(
		coordinate((va, vb, vc) => (flat(vb) ? -vc / va : 1)),
		coordinate((va, vb, vc) => (flat(vb) ? 1 : -(va + vc) / vb)),
		{ visible: false }
	);
	return figure.createLine(first, second, { label });
}

/** y = −h/g, comme `createFunctionFromCoefficients` de `courbe()` ; les curseurs se lient par nom. */
function poseFunction(
	figure: Figure,
	curve: WantedCurve,
	{ g, h }: Extract<CurveShape, { kind: 'function' }>,
	sliders: ReadonlyMap<string, string>
): string {
	const expression = isZeroExpression(add(g, opposite(mathNumber('1'))))
		? opposite(h)
		: divide(opposite(h), g, 'fraction');
	let derivative: MathNode;
	try {
		derivative = differentiate(expression, { variable: 'x', simplify: true });
	} catch {
		// La dérivée ne sert qu'aux tangentes : la courbe se dessine sans
		derivative = mathNumber('0');
	}
	const parameters = parametersOf([expression], sliders);
	return figure.createFunction(
		expression,
		derivative,
		compile(expression),
		compile(derivative),
		curve.equation,
		{ label: displayName(curve.name), dependencies: sliderIds(parameters) }
	);
}

/** Une conique (curseurs : `parameterRecipe`), ou une courbe implicite. */
function poseOther(
	figure: Figure,
	curve: WantedCurve,
	shape: QuadraticShape | { readonly kind: 'implicit' },
	sliders: ReadonlyMap<string, string>
): string | null {
	const label = displayName(curve.name);
	const parameters = parametersOf([curve.F], sliders);
	if (shape.kind === 'quadratic') {
		if (parameters.length > 0) return poseParametricConic(figure, curve, shape, parameters);
		const coefficients = conicCoefficients(shape);
		if (coefficients === null) return null;
		const conic = classifyConic(...coefficients);
		if (conic.type !== 'degenerate') {
			return figure.createQuadraticCurve(curve.F, curve.equation, coefficients, conic, { label });
		}
		const set = degenerateConic(...coefficients);
		if (set?.kind === 'point') {
			return figure.createFreePoint(
				{ x: numeric(set.x), y: numeric(set.y) },
				{ label, draggable: false }
			);
		}
		if (set?.kind === 'line') {
			const [p, q] = pointsOfLine(set.a, set.b, set.c);
			const first = figure.createFreePoint(
				{ x: numeric(p[0]), y: numeric(p[1]) },
				{ visible: false, draggable: false }
			);
			const second = figure.createFreePoint(
				{ x: numeric(q[0]), y: numeric(q[1]) },
				{ visible: false, draggable: false }
			);
			return figure.createLine(first, second, { label });
		}
		// Deux droites (x² = 4) : la conique dégénérée ne se dessine pas, le
		// marching squares si. Le vide ne dessine rien (la carte le dit)
		if (set?.kind !== 'lines') return null;
	}
	return figure.createImplicitCurve(curve.F, compile(curve.F), curve.equation, {
		label,
		parameters
	});
}

/** Deux points de la droite a·x + b·y = c : le pied de la perpendiculaire depuis O, et un pas le long. */
function pointsOfLine(a: number, b: number, c: number): [[number, number], [number, number]] {
	const norm = a * a + b * b;
	const foot: [number, number] = [(a * c) / norm, (b * c) / norm];
	return [foot, [foot[0] - b, foot[1] + a]];
}

/**
 * Une conique dont les coefficients suivent des curseurs : sa SORTE peut changer
 * au glisser (`x² = a` : deux droites, une droite double à a = 0, rien pour
 * a < 0). Quatre éléments, au plus un dessiné à la fois : la conique
 * (`parameterRecipe`), le point isolé, la droite double, et deux droites par
 * une courbe implicite — chacun rend NaN (ou n'a pas de zéro) hors de sa sorte.
 * Rend l'id de la conique.
 */
function poseParametricConic(
	figure: Figure,
	curve: WantedCurve,
	shape: QuadraticShape,
	parameters: readonly CurveParameter[]
): string {
	const label = displayName(curve.name);
	const compiled: CompiledFn[] = conicCoefficientNodes(shape).map((node) =>
		node === undefined ? () => 0 : compile(node)
	);
	const degenerateAt = (env: Record<string, number>): DegenerateConic | null => {
		const values = compiled.map((fn) => fn(env));
		if (values.some((v) => !Number.isFinite(v))) return null;
		const [A, B, C, D, E, F] = values;
		return degenerateConic(A, B, C, D, E, F);
	};
	// Une conique de départ quelconque : `createQuadraticCurve` la recalcule aussitôt
	const zero: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
	const conicId = figure.createQuadraticCurve(
		curve.F,
		curve.equation,
		zero,
		classifyConic(...zero),
		{
			label,
			parameterRecipe: { coefficients: compiled, parameters }
		}
	);

	const scalar = (pick: (set: DegenerateConic | null) => number): ScalarParam => ({
		scalarRef: figure.createScalarExpression(
			scalarCompute((env) => pick(degenerateAt(env)), parameters),
			sliderIds(parameters)
		)
	});
	// Le point isolé
	figure.createComputedPoint(
		scalar((set) => (set?.kind === 'point' ? set.x : NaN)),
		scalar((set) => (set?.kind === 'point' ? set.y : NaN)),
		{ label }
	);
	// La droite double
	const along = (index: 0 | 1, axis: 0 | 1) =>
		scalar((set) => (set?.kind === 'line' ? pointsOfLine(set.a, set.b, set.c)[index][axis] : NaN));
	const first = figure.createComputedPoint(along(0, 0), along(0, 1), { visible: false });
	const second = figure.createComputedPoint(along(1, 0), along(1, 1), { visible: false });
	figure.createLine(first, second, { label });
	// Deux droites : F seulement quand la conique en est deux, sinon une
	// constante sans zéro (le marching squares ne trace rien). La sorte se
	// recalcule quand les curseurs changent, pas à chaque point de la grille
	const F = compile(curve.F);
	let lastKey = '';
	let lines = false;
	const gated: CompiledFn = (env) => {
		const key = parameters.map(({ name }) => env[name]).join(';');
		if (key !== lastKey) {
			lastKey = key;
			lines = degenerateAt(env)?.kind === 'lines';
		}
		return lines ? F(env) : 1;
	};
	figure.createImplicitCurve(curve.F, gated, curve.equation, { label, parameters });
	return conicId;
}
