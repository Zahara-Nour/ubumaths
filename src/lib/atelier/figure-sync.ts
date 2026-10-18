/**
 * Atelier — reporter les points et les courbes vers une `Figure` de `geometry-core`
 *
 * Le pendant de `plot-sync.ts` pour la vue Figure (géométrie v2, lot 1, PR 2 ;
 * `docs/wip/atelier-geometrie-phase0.md`, F2, F4, F5, S1, S2, S4). Mêmes
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
import type { AtelierObject, CurveDisplay } from './types';
import type { CompiledFn, MathNode } from '$lib/mathAST';
import { add, compile, divide, getVariables, number as mathNumber, opposite } from '$lib/mathAST';
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
import { substitutedAstOf, substitutedTextOf } from './engine';
import { constructionOf, isConstruction, nodeOf } from './construction';
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

/** Un point à dessiner : ses deux coordonnées, curseurs gardés en lettres. */
interface WantedPoint {
	readonly kind: 'point';
	readonly name: string;
	readonly x: MathNode;
	readonly y: MathNode;
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
	/**
	 * Le trait de sa carte (K4 : couleur, pointillés, épaisseur), absent pour une
	 * fonction jamais tracée — couleur par défaut de la figure. Hors empreinte :
	 * il se règle par `Figure.updateStyle`, sans refaire la figure.
	 */
	readonly style?: GeoStyle;
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
	  }
	| {
			readonly kind: 'construction';
			readonly name: string;
			readonly shape: 'circle';
			readonly center: readonly [MathNode, MathNode];
			readonly radius: MathNode;
	  };

type Wanted = WantedPoint | WantedCurve | WantedFunction | WantedConstruction;

/** Ce que l'atelier demande à la figure. */
export interface FigurePlan {
	readonly sliders: readonly WantedSlider[];
	readonly objects: readonly Wanted[];
}

// =============================================================================
// Constantes
// =============================================================================

/** En deçà, un coefficient de droite qui suit un curseur est tenu pour nul. */
const ZERO_EPSILON = 1e-12;

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
	/** Nom d'une fonction affichée → ids de ses morceaux, et le trait qu'ils portent (K4). */
	#strokes = new Map<string, { readonly ids: readonly string[]; style: string }>();
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

	/** Réservé à `syncFigure`. */
	apply(plan: FigurePlan): FigureSyncOutcome {
		const fingerprint = fingerprintOf(plan);
		if (fingerprint !== this.#fingerprint) {
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

	/** Repeindre les 𝒞f dont la carte a changé de trait (K4) ; vrai si l'une l'a été. */
	#restyle(plan: FigurePlan): boolean {
		let changed = false;
		for (const object of plan.objects) {
			if (object.kind !== 'function') continue;
			const stroke = this.#strokes.get(object.name);
			const style = JSON.stringify(object.style ?? null);
			if (stroke === undefined || stroke.style === style || object.style === undefined) continue;
			for (const id of stroke.ids) this.#figure.updateStyle(id, object.style);
			stroke.style = style;
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
		const elements = new Map<string, string>();
		const strokes = new Map<string, { readonly ids: readonly string[]; style: string }>();
		for (const object of plan.objects) {
			// Une courbe que la figure refuse (compilation impossible) n'est pas
			// dessinée : sa carte, elle, reste ce qu'elle est (F5)
			const before = new Set(figure.getAllElements().map((el) => el.id));
			try {
				if (object.kind === 'function') {
					const ids = posePlottedFunction(figure, object, sliders);
					if (ids.length > 0) elements.set(object.name, ids[0]);
					strokes.set(object.name, { ids, style: JSON.stringify(object.style ?? null) });
					continue;
				}
				const id =
					object.kind === 'point'
						? posePoint(figure, object, sliders)
						: object.kind === 'construction'
							? poseConstruction(figure, object, sliders)
							: poseCurve(figure, object, sliders);
				if (id !== null) elements.set(object.name, id);
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
		this.#strokes = strokes;
	}
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
	const objects: Wanted[] = [];
	const cited = new Set<string>();
	for (const object of atelier.objects) {
		// F5 : en erreur, en attente ou à compléter, l'objet n'est pas dessiné
		if (object.status !== 'ok') continue;
		const wanted = isFigureObject(object)
			? wantedOf(atelier, object, keep)
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
	// Seuls les curseurs CITÉS entrent dans la figure (et dans son empreinte)
	return { sliders: [...sliders.values()].filter((s) => cited.has(s.name)), objects };
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
	const style = object.display === undefined ? undefined : strokeOf(object.display);
	return {
		kind: 'function',
		name: object.name,
		expression: substituted.ast,
		...(pieces !== undefined && { pieces }),
		...(style !== undefined && { style })
	};
}

/**
 * Le trait de la carte en style de la figure (K4) : la couleur du grapheur
 * (`curve-2`), que la toile peint de son jeton `var(--color-curve-2)` — le même
 * que le Graphe, clair ou sombre (`screenColor` de `svg-primitives.ts`) ;
 * pointillés et épaisseur. `dashdot` n'a pas d'équivalent dans la figure :
 * des tirets.
 */
function strokeOf(display: CurveDisplay): GeoStyle {
	const dash: GeoStyle['dash'] = display.lineStyle === 'dashdot' ? 'dashed' : display.lineStyle;
	return { color: display.color, dash, strokeWidth: display.lineWidth };
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
	keep: ReadonlySet<string>
): WantedPoint | WantedConstruction | null {
	const outcome = constructionOf(atelier, object.name, { keepNames: keep });
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

function wantedOf(
	atelier: Atelier,
	object: AtelierObject,
	keep: ReadonlySet<string>
): WantedPoint | WantedCurve | WantedConstruction | null {
	if (isConstruction(object)) return wantedConstructionOf(atelier, object, keep);
	if (object.kind === 'point') {
		const coordinates = pointCoordinatesOf(object.definition);
		if (coordinates === null) return null;
		const [x, y] = coordinates.map((c) =>
			substitutedTextOf(atelier, c, object.provenance, { keepNames: keep })
		);
		if (!x.ok || !y.ok) return null;
		return { kind: 'point', name: object.name, x: x.ast, y: y.ast };
	}
	const substituted = substitutedAstOf(atelier, object.name, { keepNames: keep });
	if (!substituted.ok) return null;
	const raw = equationExpression(substituted.ast);
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
		// Le trait d'une 𝒞f n'est pas de la structure : `#restyle` le règle
		objects: plan.objects.map((o) => (o.kind === 'function' ? { ...o, style: undefined } : o))
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
		return figure.createCircleByRadius(center, scalarOf(figure, wanted.radius, sliders), {
			label
		});
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
 * une courbe `y = f(x)`. Le trait est celui de la carte (K4). Rend les ids des
 * morceaux, le nommé d'abord.
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
				...(piece !== null && { domain: domainOf(piece) }),
				...(wanted.style !== undefined && { style: wanted.style })
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
