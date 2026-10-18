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
 * la même que celle de `courbe()` : `curveShapeOf` (`geometry/curve-nature.ts`).
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
import type { AtelierObject } from './types';
import type { CompiledFn, MathNode } from '$lib/mathAST';
import { add, compile, divide, getVariables, number as mathNumber, opposite } from '$lib/mathAST';
import { differentiate } from '$lib/mathAST/differentiation';
import { isZeroExpression } from '$lib/mathAST/normal';
import { Figure } from '$lib/geometry-core/graph/figure';
import type { CurveParameter } from '$lib/geometry-core/types/elements';
import { exact, type ScalarParam } from '$lib/geometry-core/types/geo-value';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { classifyConic, degenerateConicKind } from '$lib/geometry-core/geometry/conic-classify';
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
import { isFigureObject, isValue } from './types';
import { constantOf } from './constant';
import { pointCoordinatesOf } from './parse';
import { substitutedAstOf, substitutedTextOf } from './engine';
import { displayName } from './names';

// =============================================================================
// Types
// =============================================================================

/** Ce que la synchronisation a fait : rien, bouger des curseurs, ou refaire la figure. */
export type FigureSyncOutcome = 'unchanged' | 'moved' | 'rebuilt';

/** Un curseur de l'atelier tel que la figure doit le porter. */
interface WantedSlider {
	readonly name: string;
	readonly value: number;
	readonly min: number;
	readonly max: number;
}

/** Un point à dessiner : ses deux coordonnées, curseurs gardés en lettres. */
interface WantedPoint {
	readonly kind: 'point';
	readonly name: string;
	readonly x: MathNode;
	readonly y: MathNode;
}

/** Une courbe à dessiner : F(x, y) = 0, développée, curseurs gardés en lettres. */
interface WantedCurve {
	readonly kind: 'curve';
	readonly name: string;
	readonly equation: string;
	readonly F: MathNode;
}

/** Ce que l'atelier demande à la figure. */
export interface FigurePlan {
	readonly sliders: readonly WantedSlider[];
	readonly objects: readonly (WantedPoint | WantedCurve)[];
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
		let moved = false;
		for (const slider of plan.sliders) {
			const id = this.#sliders.get(slider.name);
			if (id === undefined || this.#figure.getScalarValue(id) === slider.value) continue;
			this.#figure.moveSlider(id, slider.value);
			moved = true;
		}
		if (!moved) return 'unchanged';
		this.#figure.recompute();
		this.#changes++;
		return 'moved';
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
		for (const object of plan.objects) {
			// Une courbe que la figure refuse (compilation impossible) n'est pas
			// dessinée : sa carte, elle, reste ce qu'elle est (F5)
			try {
				const id =
					object.kind === 'point'
						? posePoint(figure, object, sliders)
						: poseCurve(figure, object, sliders);
				if (id !== null) elements.set(object.name, id);
			} catch {
				continue;
			}
		}
		this.#figure = figure;
		this.#sliders = sliders;
		this.#elements = elements;
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
		sliders.set(o.name, { name: o.name, value, min: o.slider.min, max: o.slider.max });
	}
	return sliders;
}

function planOf(atelier: Atelier): FigurePlan {
	const sliders = slidersOf(atelier);
	const keep = new Set(sliders.keys());
	const objects: (WantedPoint | WantedCurve)[] = [];
	const cited = new Set<string>();
	for (const object of atelier.objects) {
		// F5 : en erreur, en attente ou à compléter, l'objet n'est pas dessiné
		if (!isFigureObject(object) || object.status !== 'ok') continue;
		const wanted = wantedOf(atelier, object, keep);
		if (wanted === null) continue;
		objects.push(wanted);
		const trees = wanted.kind === 'point' ? [wanted.x, wanted.y] : [wanted.F];
		for (const tree of trees) for (const name of getVariables(tree)) cited.add(name);
	}
	// Seuls les curseurs CITÉS entrent dans la figure (et dans son empreinte)
	return { sliders: [...sliders.values()].filter((s) => cited.has(s.name)), objects };
}

function wantedOf(
	atelier: Atelier,
	object: AtelierObject,
	keep: ReadonlySet<string>
): WantedPoint | WantedCurve | null {
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
	return {
		kind: 'curve',
		name: object.name,
		equation: object.definition,
		// Développée : `y = 4(x − 2) + 4` est une droite, `(x − 1)² + (y − 2)² = 4` un cercle
		F: expandedEquation(equationExpression(substituted.ast))
	};
}

/**
 * L'empreinte de la STRUCTURE : objets, arbres, curseurs cités et leurs bornes —
 * pas leurs valeurs, que `moveSlider` règle sans rien refaire.
 */
function fingerprintOf(plan: FigurePlan): string {
	return JSON.stringify({
		sliders: plan.sliders.map(({ name, min, max }) => [name, min, max]),
		objects: plan.objects
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
	const label = displayName(point.name);
	if (parametersOf([point.x, point.y], sliders).length === 0) {
		if (!isFiniteExact(point.x) || !isFiniteExact(point.y)) return null;
		return figure.createFreePoint(
			{ x: exact(point.x), y: exact(point.y) },
			{ label, draggable: false }
		);
	}
	const coordinate = (tree: MathNode): ScalarParam => {
		const own = parametersOf([tree], sliders);
		if (own.length === 0) return exact(tree);
		if (tree.type === 'variable' && own.length === 1) return { scalarRef: own[0].sliderId };
		const compiled = compile(tree);
		return {
			scalarRef: figure.createScalarExpression(scalarCompute(compiled, own), sliderIds(own))
		};
	};
	return figure.createComputedPoint(coordinate(point.x), coordinate(point.y), { label });
}

/** Une courbe : la forme de `courbe()` (`curveShapeOf`), curseurs câblés. */
function poseCurve(
	figure: Figure,
	curve: WantedCurve,
	sliders: ReadonlyMap<string, string>
): string | null {
	const shape = curveShapeOf(curve.F);
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
		if (parameters.length > 0) {
			const compiled: CompiledFn[] = conicCoefficientNodes(shape).map((node) =>
				node === undefined ? () => 0 : compile(node)
			);
			// Une conique de départ quelconque : `createQuadraticCurve` la recalcule aussitôt
			const zero: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
			return figure.createQuadraticCurve(curve.F, curve.equation, zero, classifyConic(...zero), {
				label,
				parameterRecipe: { coefficients: compiled, parameters }
			});
		}
		const coefficients = conicCoefficients(shape);
		if (coefficients === null) return null;
		const conic = classifyConic(...coefficients);
		if (conic.type !== 'degenerate') {
			return figure.createQuadraticCurve(curve.F, curve.equation, coefficients, conic, { label });
		}
		// Deux droites (x² = 4) : la conique dégénérée ne se dessine pas, le
		// marching squares si. Vide, point isolé, droite double : rien (la carte le dit)
		if (degenerateConicKind(...coefficients) !== 'lines') return null;
	}
	return figure.createImplicitCurve(curve.F, compile(curve.F), curve.equation, {
		label,
		parameters
	});
}
