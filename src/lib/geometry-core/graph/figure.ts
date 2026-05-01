/**
 * Figure - The main API for creating and managing a geometry figure.
 *
 * Wraps the DependencyGraph and a collection of GeoElements.
 * Provides factory methods, position access, movePoint, and recompute.
 */

import { DependencyGraph } from './dependency-graph';
import type {
	GeoElement,
	GeoStyle,
	GeoFreePoint,
	GeoMidpoint,
	GeoIntersectionLL,
	GeoIntersectionLC,
	GeoIntersectionCC,
	GeoIntersectionLQ,
	GeoIntersectionQQ,
	GeoReflectedPoint,
	GeoRotatedPoint,
	GeoTranslatedPoint,
	GeoDilatedPoint,
	GeoReflectedOverLine,
	GeoSegment,
	GeoLine,
	GeoRay,
	GeoAngleMark,
	GeoSegmentMark,
	GeoText,
	GeoMathText,
	GeoRichText,
	GeoImage,
	GeoCircleByRadius,
	GeoCircleByPoint,
	GeoCircleBy3Points,
	GeoArcByAngles,
	GeoArcByPoints,
	GeoSectorByPoints,
	GeoSectorByAngles,
	GeoAnnulus,
	GeoPolygon,
	GeoFunction,
	GeoQuadraticCurve,
	GeoImplicitCurve,
	GeoPointOnCurve,
	GeoPointOnQuadraticCurve,
	GeoPointOnSegment,
	GeoPointOnLine,
	GeoPointOnCircle,
	GeoPointOnArc,
	GeoIntersectionLF,
	GeoIntersectionFF,
	GeoTangentLine,
	GeoTangentToQuadratic,
	GeoConicPolar,
	GeoVectorByPoints,
	GeoFreeVector,
	GeoVectorSum,
	GeoVectorScaled,
	GeoVectorNegate,
	type GeoRotation,
	type GeoReflection,
	type GeoReflectionOverLine,
	type GeoTranslation,
	type GeoHomothety,
	type GeoComposition,
	type GeoProjection,
	type GeoProjectedPoint,
	type GeoAffinity,
	type GeoAffinityPoint,
	type GeoInversion,
	type GeoInvertedPoint,
	type GeoLocus,
	type GeoTrace,
	type GeoComputedPoint,
	type GeoScalar,
	type GeoSlider,
	type GeoIntegralArea,
	type LineEquation,
	type ConicParams
} from '../types/elements';
import {
	isFreePoint,
	isFreeVector,
	isCircle,
	isLineLike,
	isPointElement,
	isQuadraticCurve,
	isFunction,
	isPointOnCurve,
	isPointOnQuadraticCurve,
	isPointOnSegment,
	isPointOnLine,
	isPointOnCircle,
	isPointOnArc,
	isTransformation,
	isVector,
	isSlider
} from '../types/elements';
import type { GeoValue, ScalarParam } from '../types/geo-value';
import { geoValueToMathNode, numeric, isScalarRef } from '../types/geo-value';
import { geoToNumber } from '../compute/to-number';
import type { GeoPoint } from '../types/primitives';
import { resolveVectorComponents } from './vector-components';
import {
	buildInverseAffineMatrix,
	transformConicCoefficients,
	type TransformAccessors
} from '../geometry/affine-transform';
import { classifyConic } from '../geometry/conic-classify';
import type { MathNode } from '$lib/mathAST/types';
import type { CompiledFn } from '$lib/mathAST/eval/compile';
import { compile } from '$lib/mathAST/eval/compile';
import {
	subtract,
	implicitMultiply,
	add,
	number as mathNumber,
	variable,
	relation,
	abs as mathAbs
} from '$lib/mathAST/factory';
import { toCustom } from '$lib/mathAST/custom-generator';
import { isZeroExpression } from '$lib/mathAST/normal';
import { integrateDefinite, numericIntegrate } from '$lib/mathAST/integration';
import { improperIntegrate, PROBE_T_MAX } from '$lib/mathAST/integration/improper';
import { findRoots } from '$lib/mathAST/analysis/roots';
import type { Discontinuity } from '$lib/mathAST/analysis';
import { classifyDiscontinuitiesForRange } from '../dsl/singularity-warn';
import { UndoManager } from './undo-redo';
import type { Delta } from './undo-redo';
import { computeElementPosition, resolveScalarParam } from './compute-position';
import { computeLocusCurve } from './compute-locus';
import type { SampledCurve, Viewport, Point } from '../viewport/types';

const DEFAULT_COLOR = '#1e40af';

export interface FigureDefaults {
	readonly defaultColor?: string;
	readonly defaultStrokeWidth?: number;
	readonly defaultDash?: 'solid' | 'dashed' | 'dotted';
	readonly defaultPointShape?: 'dot' | 'circle' | 'cross' | 'square';
	readonly defaultPointSize?: number;
	readonly defaultOpacity?: number;
	readonly renderMode?: 'normal' | 'rough' | 'mixed';
	readonly defaultRoughness?: number;
}

export interface ElementOptions {
	label?: string;
	labelOffset?: { dx: number; dy: number };
	color?: string;
	style?: GeoStyle;
	visible?: boolean;
	draggable?: boolean;
	equation?: LineEquation;
}

/**
 * Resolve a template string by replacing {expr} placeholders with scalar values.
 * Supports: {id}, {id:.2f}, {id:deg}, simple arithmetic {id*2}, {id+other}.
 *
 * If the content does not refer to any known scalar (typo or — more commonly —
 * a LaTeX construct like `\text{...}`, `\sqrt{2}`, `\frac{a}{b}` that happens
 * to use braces), the original `{...}` is returned **as-is** so the downstream
 * MathLive/LaTeX renderer receives intact braces. Only scalar refs that resolve
 * to a non-finite number (NaN/∞ — broken scalar) fall back to '?'.
 */
function resolveTemplateString(
	template: string,
	scalarValues: ReadonlyMap<string, number>
): string {
	return template.replace(/\{([^}]+)\}/g, (_match, content: string) => {
		// Split off format specifier: {expr:format}
		const colonIdx = content.indexOf(':');
		let expr: string;
		let format: string | undefined;
		if (colonIdx !== -1) {
			expr = content.slice(0, colonIdx).trim();
			format = content.slice(colonIdx + 1).trim();
		} else {
			expr = content.trim();
		}

		// Evaluate the expression
		const value = evaluateSimpleExpr(expr, scalarValues);
		if (value === undefined) return _match; // unknown content — keep literal for LaTeX
		if (!Number.isFinite(value)) return '?'; // known scalar but broken value (NaN/∞)

		// Format the value
		return formatScalarValue(value, format);
	});
}

function evaluateSimpleExpr(
	expr: string,
	scalarValues: ReadonlyMap<string, number>
): number | undefined {
	// Try direct lookup first (most common case)
	const direct = scalarValues.get(expr);
	if (direct !== undefined) return direct;

	// Simple binary operations: id*N, id+id, id-id, id/N
	const opMatch = expr.match(/^(\w+)\s*([+\-*/])\s*(.+)$/);
	if (opMatch) {
		const [, left, op, right] = opMatch;
		const leftVal = scalarValues.get(left) ?? parseFloat(left);
		const rightVal = scalarValues.get(right) ?? parseFloat(right);
		if (!Number.isFinite(leftVal) || !Number.isFinite(rightVal)) return undefined;
		switch (op) {
			case '+':
				return leftVal + rightVal;
			case '-':
				return leftVal - rightVal;
			case '*':
				return leftVal * rightVal;
			case '/':
				return rightVal !== 0 ? leftVal / rightVal : undefined;
		}
	}
	return undefined;
}

function formatScalarValue(value: number, format?: string): string {
	if (!format) return `${Math.round(value * 100) / 100}`;
	if (format === 'deg') return `${Math.round(value * 10) / 10}°`;
	if (format === 'rad') return `${Math.round(((value * Math.PI) / 180) * 1000) / 1000}`;
	const fMatch = format.match(/^\.(\d+)f$/);
	if (fMatch) return value.toFixed(parseInt(fMatch[1]));
	return `${Math.round(value * 100) / 100}`;
}

const TRACE_MAX_POINTS = 500;
const TRACE_EPSILON = 1e-6;

export class Figure {
	private elements = new Map<string, GeoElement>();
	private positions = new Map<string, GeoPoint>();
	private graph = new DependencyGraph();
	private nextId = 1;
	readonly defaults: FigureDefaults;
	private scalarValues = new Map<string, number>();
	private tracePoints = new Map<string, Point[]>();
	private undo_manager = new UndoManager();
	private _transformeOrigins = new Map<string, { transformId: string; sourceId: string }>();

	constructor(defaults?: FigureDefaults) {
		this.defaults = defaults ?? {};
	}

	private generateId(prefix: string): string {
		return `${prefix}_${this.nextId++}`;
	}

	// ─── Transactions ───────────────────────────────────────────────

	beginTransaction(): void {
		this.undo_manager.beginTransaction();
	}

	commit(): void {
		this.undo_manager.commit();
	}

	discard(): void {
		this.undo_manager.discard();
	}

	get canUndo(): boolean {
		return this.undo_manager.canUndo;
	}

	get canRedo(): boolean {
		return this.undo_manager.canRedo;
	}

	undo(): void {
		this.undo_manager.undo((delta) => this.applyDelta(delta));
	}

	redo(): void {
		this.undo_manager.redo((delta) => this.applyDelta(delta));
	}

	private applyDelta(delta: Delta): void {
		// 1. Remove elements (undo of create).
		const toRemoveSet = new Set(delta.removed.keys());
		for (const id of toRemoveSet) {
			if (!this.graph.hasNode(id)) continue;
			const parents = this.graph.getParents(id);
			const isRoot = !parents.some((pid) => toRemoveSet.has(pid));
			if (isRoot) {
				this.graph.removeNode(id);
			}
		}
		for (const id of toRemoveSet) {
			this.elements.delete(id);
			this.positions.delete(id);
		}

		// 2. Re-add elements (undo of delete), in dependency order.
		const toAdd = [...delta.added.entries()];
		const added = new Set<string>();
		let remaining = toAdd;
		while (remaining.length > 0) {
			const next: typeof remaining = [];
			for (const [id, el] of remaining) {
				const parentsReady = el.dependsOn.every((pid) => this.elements.has(pid) || added.has(pid));
				if (parentsReady) {
					this.elements.set(id, el);
					this.graph.addNode(id, [...el.dependsOn]);
					const pos = delta.removedPositions.get(id);
					if (pos) {
						this.positions.set(id, pos);
					} else if (el.type === 'freePoint') {
						this.positions.set(id, el.position);
					}
					if (el.type === 'slider') {
						this.scalarValues.set(id, el.value);
					}
					added.add(id);
				} else {
					next.push([id, el]);
				}
			}
			if (next.length === remaining.length) break;
			remaining = next;
		}

		// 3. Apply updates (undo of movePoint / moveSlider).
		for (const [id, { after }] of delta.updated) {
			this.elements.set(id, after);
			if (after.type === 'freePoint') {
				this.positions.set(id, after.position);
			} else if (after.type === 'freeVector') {
				this.positions.set(id, { x: after.anchorX, y: after.anchorY });
			} else if (after.type === 'slider') {
				this.scalarValues.set(id, after.value);
			}
		}

		// 4. Recompute affected elements.
		for (const [id, el] of delta.added) {
			if (el.type === 'freePoint' && this.graph.hasNode(id)) {
				this.graph.markDirty(id);
			}
		}
		for (const id of delta.updated.keys()) {
			if (this.graph.hasNode(id)) {
				this.graph.markDirty(id);
			}
		}
		const dirtyIds = this.graph.getDirtyInOrder();
		for (const id of dirtyIds) {
			this.computePosition(id);
		}
	}

	// ─── Factory helpers ────────────────────────────────────────────

	private resolveColor(options?: ElementOptions): string {
		return options?.color ?? this.defaults.defaultColor ?? DEFAULT_COLOR;
	}

	private resolveStyle(options?: ElementOptions): GeoStyle | undefined {
		return options?.style;
	}

	private addElement(id: string, element: GeoElement, parentIds: readonly string[]): void {
		this.elements.set(id, element);
		try {
			this.graph.addNode(id, parentIds);
		} catch (e) {
			this.elements.delete(id);
			throw e;
		}
		this.undo_manager.recordAdd(id, element);
	}

	/** Validate that all given IDs reference existing point elements. */
	private requirePoints(caller: string, ...ids: string[]): void {
		for (const id of ids) {
			const el = this.elements.get(id);
			if (!el || !isPointElement(el)) {
				throw new Error(`${caller}: "${id}" is not a point element`);
			}
		}
	}

	// ─── Factory methods ────────────────────────────────────────────

	createFreePoint(position: GeoPoint, options?: ElementOptions): string {
		const id = this.generateId('pt');
		const element: GeoFreePoint = {
			type: 'freePoint',
			id,
			position,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			draggable: options?.draggable ?? true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [] as const
		};
		this.addElement(id, element, []);
		this.positions.set(id, position);
		return id;
	}

	createComputedPoint(xParam: ScalarParam, yParam: ScalarParam, options?: ElementOptions): string {
		const id = this.generateId('pt');
		const deps: string[] = [];
		for (const param of [xParam, yParam]) {
			if (isScalarRef(param)) {
				const depId = param.scalarRef;
				if (!deps.includes(depId)) deps.push(depId);
				const el = this.elements.get(depId);
				if (el) {
					for (const parentId of el.dependsOn) {
						if (!deps.includes(parentId)) deps.push(parentId);
					}
				}
			}
		}
		const element: GeoComputedPoint = {
			type: 'computedPoint',
			id,
			xParam,
			yParam,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			draggable: false,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		this.computePosition(id);
		return id;
	}

	createMidpoint(point1Id: string, point2Id: string, options?: ElementOptions): string {
		const id = this.generateId('mid');
		const element: GeoMidpoint = {
			type: 'midpoint',
			id,
			point1Id,
			point2Id,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [point1Id, point2Id]
		};
		this.addElement(id, element, [point1Id, point2Id]);
		this.computePosition(id);
		return id;
	}

	createSegment(startId: string, endId: string, options?: ElementOptions): string {
		this.requirePoints('createSegment', startId, endId);
		const id = this.generateId('seg');
		const element: GeoSegment = {
			type: 'segment',
			id,
			startId,
			endId,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [startId, endId]
		};
		this.addElement(id, element, [startId, endId]);
		return id;
	}

	createLine(point1Id: string, point2Id: string, options?: ElementOptions): string {
		this.requirePoints('createLine', point1Id, point2Id);
		const id = this.generateId('ln');
		const element: GeoLine = {
			type: 'line',
			id,
			point1Id,
			point2Id,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			...(options?.equation && { equation: options.equation }),
			dependsOn: [point1Id, point2Id]
		};
		this.addElement(id, element, [point1Id, point2Id]);
		return id;
	}

	createRay(originId: string, throughId: string, options?: ElementOptions): string {
		this.requirePoints('createRay', originId, throughId);
		const id = this.generateId('ray');
		const element: GeoRay = {
			type: 'ray',
			id,
			originId,
			throughId,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [originId, throughId]
		};
		this.addElement(id, element, [originId, throughId]);
		return id;
	}

	// ─── Vector factories ───────────────────────────────────────────

	createVectorByPoints(startId: string, endId: string, options?: ElementOptions): string {
		this.requirePoints('createVectorByPoints', startId, endId);
		const id = this.generateId('vec');
		const element: GeoVectorByPoints = {
			type: 'vectorByPoints',
			id,
			startId,
			endId,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [startId, endId]
		};
		this.addElement(id, element, [startId, endId]);
		return id;
	}

	createFreeVector(
		dx: GeoValue,
		dy: GeoValue,
		anchor?: GeoPoint,
		options?: ElementOptions
	): string {
		const id = this.generateId('vec');
		const anchorX = anchor?.x ?? numeric(0);
		const anchorY = anchor?.y ?? numeric(0);
		const element: GeoFreeVector = {
			type: 'freeVector',
			id,
			dx,
			dy,
			anchorX,
			anchorY,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [] as const
		};
		this.addElement(id, element, []);
		this.positions.set(id, { x: anchorX, y: anchorY });
		return id;
	}

	moveFreeVector(id: string, newAnchorX: GeoValue, newAnchorY: GeoValue): void {
		const el = this.elements.get(id);
		if (!el || !isFreeVector(el)) {
			throw new Error(`moveFreeVector: "${id}" is not a free vector`);
		}
		const updated: GeoFreeVector = { ...el, anchorX: newAnchorX, anchorY: newAnchorY };
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
		this.positions.set(id, { x: newAnchorX, y: newAnchorY });
	}

	// ─── Vector operations (reactive) ───────────────��───────────────

	/** Create a reactive vector sum: w = v1 + v2 (or v1 - v2 if negate=true). */
	createVectorSum(v1Id: string, v2Id: string, negate?: boolean, options?: ElementOptions): string {
		const v1 = this.elements.get(v1Id);
		const v2 = this.elements.get(v2Id);
		if (!v1 || !isVector(v1)) throw new Error(`createVectorSum: "${v1Id}" is not a vector element`);
		if (!v2 || !isVector(v2)) throw new Error(`createVectorSum: "${v2Id}" is not a vector element`);

		const deps = [...new Set([v1Id, ...v1.dependsOn, v2Id, ...v2.dependsOn])];
		const id = this.generateId('vec');
		const element: GeoVectorSum = {
			type: 'vectorSum',
			id,
			vector1Id: v1Id,
			vector2Id: v2Id,
			negate: negate ?? false,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		this.positions.set(id, { x: numeric(0), y: numeric(0) });
		return id;
	}

	/** Create a reactive scaled vector: w = factor * v. */
	createVectorScaled(vectorId: string, factor: GeoValue, options?: ElementOptions): string {
		const vec = this.elements.get(vectorId);
		if (!vec || !isVector(vec))
			throw new Error(`createVectorScaled: "${vectorId}" is not a vector element`);

		const deps = [vectorId, ...vec.dependsOn];
		const id = this.generateId('vec');
		const element: GeoVectorScaled = {
			type: 'vectorScaled',
			id,
			vectorId,
			factor,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		this.positions.set(id, { x: numeric(0), y: numeric(0) });
		return id;
	}

	/** Create a reactive negated vector: w = -v. */
	createVectorNegate(vectorId: string, options?: ElementOptions): string {
		const vec = this.elements.get(vectorId);
		if (!vec || !isVector(vec))
			throw new Error(`createVectorNegate: "${vectorId}" is not a vector element`);

		const deps = [vectorId, ...vec.dependsOn];
		const id = this.generateId('vec');
		const element: GeoVectorNegate = {
			type: 'vectorNegate',
			id,
			vectorId,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		this.positions.set(id, { x: numeric(0), y: numeric(0) });
		return id;
	}

	/**
	 * Get the displacement (dx, dy) of any vector element.
	 *
	 * Works for all vector types: bound, free, sum, scaled, negated.
	 * Delegates to the shared resolveVectorComponents() helper.
	 * Returns null if the vector or its dependencies cannot be resolved.
	 */
	getVectorComponents(id: string): { dx: GeoValue; dy: GeoValue } | null {
		return resolveVectorComponents(id, this.elements, this.positions);
	}

	createCircleByRadius(centerId: string, radius: ScalarParam, options?: ElementOptions): string {
		const id = this.generateId('circ');
		const deps: string[] = [centerId];
		if (isScalarRef(radius)) deps.push(radius.scalarRef);
		const element: GeoCircleByRadius = {
			type: 'circleByRadius',
			id,
			centerId,
			radius,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	createCircleByPoint(centerId: string, edgePointId: string, options?: ElementOptions): string {
		const id = this.generateId('circ');
		const element: GeoCircleByPoint = {
			type: 'circleByPoint',
			id,
			centerId,
			edgePointId,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [centerId, edgePointId]
		};
		this.addElement(id, element, [centerId, edgePointId]);
		return id;
	}

	createCircleBy3Points(
		point1Id: string,
		point2Id: string,
		point3Id: string,
		options?: ElementOptions
	): string {
		const id = this.generateId('circ');
		const element: GeoCircleBy3Points = {
			type: 'circleBy3Points',
			id,
			point1Id,
			point2Id,
			point3Id,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [point1Id, point2Id, point3Id]
		};
		this.addElement(id, element, [point1Id, point2Id, point3Id]);
		return id;
	}

	createIntersectionLL(line1Id: string, line2Id: string, options?: ElementOptions): string {
		const el1 = this.elements.get(line1Id);
		const el2 = this.elements.get(line2Id);
		if (!el1 || !isLineLike(el1))
			throw new Error(`createIntersectionLL: "${line1Id}" is not a line-like element`);
		if (!el2 || !isLineLike(el2))
			throw new Error(`createIntersectionLL: "${line2Id}" is not a line-like element`);

		const id = this.generateId('intLL');
		const element: GeoIntersectionLL = {
			type: 'intersectionLL',
			id,
			line1Id,
			line2Id,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [line1Id, line2Id]
		};
		this.addElement(id, element, [line1Id, line2Id]);
		this.computePosition(id);
		return id;
	}

	createIntersectionLC(
		lineId: string,
		circleId: string,
		index: 0 | 1,
		options?: ElementOptions
	): string {
		const el1 = this.elements.get(lineId);
		const el2 = this.elements.get(circleId);
		if (!el1 || !isLineLike(el1))
			throw new Error(`createIntersectionLC: "${lineId}" is not a line-like element`);
		if (!el2 || !isCircle(el2))
			throw new Error(`createIntersectionLC: "${circleId}" is not a circle element`);

		const id = this.generateId('intLC');
		const element: GeoIntersectionLC = {
			type: 'intersectionLC',
			id,
			lineId,
			circleId,
			index,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [lineId, circleId]
		};
		this.addElement(id, element, [lineId, circleId]);
		this.computePosition(id);
		return id;
	}

	createIntersectionCC(
		circle1Id: string,
		circle2Id: string,
		index: 0 | 1,
		options?: ElementOptions
	): string {
		const el1 = this.elements.get(circle1Id);
		const el2 = this.elements.get(circle2Id);
		if (!el1 || !isCircle(el1))
			throw new Error(`createIntersectionCC: "${circle1Id}" is not a circle element`);
		if (!el2 || !isCircle(el2))
			throw new Error(`createIntersectionCC: "${circle2Id}" is not a circle element`);

		const id = this.generateId('intCC');
		const element: GeoIntersectionCC = {
			type: 'intersectionCC',
			id,
			circle1Id,
			circle2Id,
			index,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [circle1Id, circle2Id]
		};
		this.addElement(id, element, [circle1Id, circle2Id]);
		this.computePosition(id);
		return id;
	}

	createIntersectionLQ(
		lineId: string,
		curveId: string,
		index: 0 | 1,
		options?: ElementOptions
	): string {
		const el1 = this.elements.get(lineId);
		const el2 = this.elements.get(curveId);
		if (!el1 || !isLineLike(el1))
			throw new Error(`createIntersectionLQ: "${lineId}" is not a line-like element`);
		if (!el2 || !isQuadraticCurve(el2))
			throw new Error(`createIntersectionLQ: "${curveId}" is not a quadratic curve element`);

		const id = this.generateId('intLQ');
		const element: GeoIntersectionLQ = {
			type: 'intersectionLQ',
			id,
			lineId,
			curveId,
			index,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [lineId, curveId]
		};
		this.addElement(id, element, [lineId, curveId]);
		this.computePosition(id);
		return id;
	}

	createIntersectionQQ(
		curve1Id: string,
		curve2Id: string,
		index: 0 | 1 | 2 | 3,
		options?: ElementOptions
	): string {
		const el1 = this.elements.get(curve1Id);
		const el2 = this.elements.get(curve2Id);
		// Accept both quadraticCurve and circle elements (circle is converted to conic coefficients at compute time)
		const isConicLike = (el: GeoElement | undefined): boolean =>
			!!el && (isQuadraticCurve(el) || isCircle(el));
		if (!isConicLike(el1))
			throw new Error(
				`createIntersectionQQ: "${curve1Id}" is not a quadratic curve or circle element`
			);
		if (!isConicLike(el2))
			throw new Error(
				`createIntersectionQQ: "${curve2Id}" is not a quadratic curve or circle element`
			);

		const id = this.generateId('intQQ');
		const element: GeoIntersectionQQ = {
			type: 'intersectionQQ',
			id,
			curve1Id,
			curve2Id,
			index,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [curve1Id, curve2Id]
		};
		this.addElement(id, element, [curve1Id, curve2Id]);
		this.computePosition(id);
		return id;
	}

	createIntersectionLF(
		lineId: string,
		functionId: string,
		index: number,
		xMin: number,
		xMax: number,
		options?: ElementOptions
	): string {
		const el1 = this.elements.get(lineId);
		const el2 = this.elements.get(functionId);
		if (!el1 || !isLineLike(el1))
			throw new Error(`createIntersectionLF: "${lineId}" is not a line-like element`);
		if (!el2 || !isFunction(el2))
			throw new Error(`createIntersectionLF: "${functionId}" is not a function element`);

		const id = this.generateId('intLF');
		const element: GeoIntersectionLF = {
			type: 'intersectionLF',
			id,
			lineId,
			functionId,
			index,
			xMin,
			xMax,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [lineId, functionId]
		};
		this.addElement(id, element, [lineId, functionId]);
		this.computePosition(id);
		return id;
	}

	createIntersectionFF(
		function1Id: string,
		function2Id: string,
		index: number,
		xMin: number,
		xMax: number,
		options?: ElementOptions
	): string {
		const el1 = this.elements.get(function1Id);
		const el2 = this.elements.get(function2Id);
		if (!el1 || !isFunction(el1))
			throw new Error(`createIntersectionFF: "${function1Id}" is not a function element`);
		if (!el2 || !isFunction(el2))
			throw new Error(`createIntersectionFF: "${function2Id}" is not a function element`);

		const id = this.generateId('intFF');
		const element: GeoIntersectionFF = {
			type: 'intersectionFF',
			id,
			function1Id,
			function2Id,
			index,
			xMin,
			xMax,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [function1Id, function2Id]
		};
		this.addElement(id, element, [function1Id, function2Id]);
		this.computePosition(id);
		return id;
	}

	createReflectedPoint(sourceId: string, centerId: string, options?: ElementOptions): string {
		if (sourceId === centerId) {
			throw new Error('createReflectedPoint: sourceId and centerId must be distinct');
		}
		const src = this.elements.get(sourceId);
		const ctr = this.elements.get(centerId);
		if (!src || !isPointElement(src)) {
			throw new Error(`createReflectedPoint: "${sourceId}" is not a point element`);
		}
		if (!ctr || !isPointElement(ctr)) {
			throw new Error(`createReflectedPoint: "${centerId}" is not a point element`);
		}

		const id = this.generateId('refl');
		const element: GeoReflectedPoint = {
			type: 'reflectedPoint',
			id,
			sourceId,
			centerId,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [sourceId, centerId]
		};
		this.addElement(id, element, [sourceId, centerId]);
		this.computePosition(id);
		return id;
	}

	createRotatedPoint(
		sourceId: string,
		centerId: string,
		angle: ScalarParam,
		options?: ElementOptions
	): string {
		const src = this.elements.get(sourceId);
		const ctr = this.elements.get(centerId);
		if (!src || !isPointElement(src))
			throw new Error(`createRotatedPoint: "${sourceId}" is not a point element`);
		if (!ctr || !isPointElement(ctr))
			throw new Error(`createRotatedPoint: "${centerId}" is not a point element`);

		const id = this.generateId('rot');
		const deps: string[] = [sourceId, centerId];
		if (isScalarRef(angle)) deps.push(angle.scalarRef);
		const element: GeoRotatedPoint = {
			type: 'rotatedPoint',
			id,
			sourceId,
			centerId,
			angle,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		this.computePosition(id);
		return id;
	}

	createTranslatedPoint(
		sourceId: string,
		vectorStartId: string,
		vectorEndId: string,
		options?: ElementOptions
	): string {
		if (sourceId === vectorStartId || sourceId === vectorEndId || vectorStartId === vectorEndId) {
			throw new Error(
				'createTranslatedPoint: sourceId, vectorStartId, and vectorEndId must all be distinct'
			);
		}
		const src = this.elements.get(sourceId);
		const vs = this.elements.get(vectorStartId);
		const ve = this.elements.get(vectorEndId);
		if (!src || !isPointElement(src))
			throw new Error(`createTranslatedPoint: "${sourceId}" is not a point element`);
		if (!vs || !isPointElement(vs))
			throw new Error(`createTranslatedPoint: "${vectorStartId}" is not a point element`);
		if (!ve || !isPointElement(ve))
			throw new Error(`createTranslatedPoint: "${vectorEndId}" is not a point element`);

		const id = this.generateId('trans');
		const element: GeoTranslatedPoint = {
			type: 'translatedPoint',
			id,
			sourceId,
			vectorStartId,
			vectorEndId,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [sourceId, vectorStartId, vectorEndId]
		};
		this.addElement(id, element, [sourceId, vectorStartId, vectorEndId]);
		this.computePosition(id);
		return id;
	}

	/**
	 * Create a translated point using a vector element directly.
	 *
	 * Unlike createTranslatedPoint (which takes two point IDs as the vector),
	 * this method references a GeoVector element. The translated point stays
	 * reactive: if the vector's defining points move (bound vector) or if
	 * a future operation changes dx/dy (free vector), the translation updates.
	 */
	createTranslatedPointByVector(
		sourceId: string,
		vectorId: string,
		options?: ElementOptions
	): string {
		const src = this.elements.get(sourceId);
		if (!src || !isPointElement(src))
			throw new Error(`createTranslatedPointByVector: "${sourceId}" is not a point element`);

		const vecEl = this.elements.get(vectorId);
		if (!vecEl || !isVector(vecEl))
			throw new Error(`createTranslatedPointByVector: "${vectorId}" is not a vector element`);

		// Build dependency list: source + vector + vector's own dependencies (deduplicated)
		const deps = [...new Set([sourceId, vectorId, ...vecEl.dependsOn])];

		const id = this.generateId('trans');
		const element: GeoTranslatedPoint = {
			type: 'translatedPoint',
			id,
			sourceId,
			vectorStartId: '',
			vectorEndId: '',
			vectorId,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		this.computePosition(id);
		return id;
	}

	createDilatedPoint(
		sourceId: string,
		centerId: string,
		factor: ScalarParam,
		options?: ElementOptions
	): string {
		const src = this.elements.get(sourceId);
		const ctr = this.elements.get(centerId);
		if (!src || !isPointElement(src))
			throw new Error(`createDilatedPoint: "${sourceId}" is not a point element`);
		if (!ctr || !isPointElement(ctr))
			throw new Error(`createDilatedPoint: "${centerId}" is not a point element`);

		const id = this.generateId('dil');
		const deps: string[] = [sourceId, centerId];
		if (isScalarRef(factor)) deps.push(factor.scalarRef);
		const element: GeoDilatedPoint = {
			type: 'dilatedPoint',
			id,
			sourceId,
			centerId,
			factor,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		this.computePosition(id);
		return id;
	}

	createReflectedOverLine(
		sourceId: string,
		linePoint1Id: string,
		linePoint2Id: string,
		options?: ElementOptions
	): string {
		if (linePoint1Id === linePoint2Id) {
			throw new Error('createReflectedOverLine: linePoint1Id and linePoint2Id must be distinct');
		}
		const src = this.elements.get(sourceId);
		const lp1 = this.elements.get(linePoint1Id);
		const lp2 = this.elements.get(linePoint2Id);
		if (!src || !isPointElement(src))
			throw new Error(`createReflectedOverLine: "${sourceId}" is not a point element`);
		if (!lp1 || !isPointElement(lp1))
			throw new Error(`createReflectedOverLine: "${linePoint1Id}" is not a point element`);
		if (!lp2 || !isPointElement(lp2))
			throw new Error(`createReflectedOverLine: "${linePoint2Id}" is not a point element`);

		const id = this.generateId('reflL');
		const element: GeoReflectedOverLine = {
			type: 'reflectedOverLine',
			id,
			sourceId,
			linePoint1Id,
			linePoint2Id,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [sourceId, linePoint1Id, linePoint2Id]
		};
		this.addElement(id, element, [sourceId, linePoint1Id, linePoint2Id]);
		this.computePosition(id);
		return id;
	}

	// ─── Transformation object factories ─────────���────────────────

	createRotation(centerId: string, angle: ScalarParam, options?: ElementOptions): string {
		this.requirePoints('createRotation', centerId);
		const id = this.generateId('tRot');
		const deps: string[] = [centerId];
		if (isScalarRef(angle)) deps.push(angle.scalarRef);
		const element: GeoRotation = {
			type: 'rotation',
			id,
			centerId,
			angle,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	createReflection(centerId: string, options?: ElementOptions): string {
		this.requirePoints('createReflection', centerId);
		const id = this.generateId('tRefl');
		const element: GeoReflection = {
			type: 'reflection',
			id,
			centerId,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: [centerId]
		};
		this.addElement(id, element, [centerId]);
		return id;
	}

	createReflectionOverLine(
		linePoint1Id: string,
		linePoint2Id: string,
		options?: ElementOptions
	): string {
		this.requirePoints('createReflectionOverLine', linePoint1Id, linePoint2Id);
		if (linePoint1Id === linePoint2Id) {
			throw new Error('createReflectionOverLine: line points must be distinct');
		}
		const id = this.generateId('tReflL');
		const element: GeoReflectionOverLine = {
			type: 'reflectionOverLine',
			id,
			linePoint1Id,
			linePoint2Id,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: [linePoint1Id, linePoint2Id]
		};
		this.addElement(id, element, [linePoint1Id, linePoint2Id]);
		return id;
	}

	createTranslation(vectorStartId: string, vectorEndId: string, options?: ElementOptions): string {
		this.requirePoints('createTranslation', vectorStartId, vectorEndId);
		if (vectorStartId === vectorEndId) {
			throw new Error('createTranslation: vector points must be distinct');
		}
		const id = this.generateId('tTrans');
		const element: GeoTranslation = {
			type: 'translation',
			id,
			vectorStartId,
			vectorEndId,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: [vectorStartId, vectorEndId]
		};
		this.addElement(id, element, [vectorStartId, vectorEndId]);
		return id;
	}

	createTranslationByVector(vectorId: string, options?: ElementOptions): string {
		const vecEl = this.elements.get(vectorId);
		if (!vecEl || !isVector(vecEl)) {
			throw new Error(`createTranslationByVector: "${vectorId}" is not a vector element`);
		}
		const id = this.generateId('tTrans');
		const deps = [...new Set([vectorId, ...vecEl.dependsOn])];
		const element: GeoTranslation = {
			type: 'translation',
			id,
			vectorStartId: '',
			vectorEndId: '',
			vectorId,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	createHomothety(centerId: string, factor: ScalarParam, options?: ElementOptions): string {
		this.requirePoints('createHomothety', centerId);
		const id = this.generateId('tHom');
		const deps: string[] = [centerId];
		if (isScalarRef(factor)) deps.push(factor.scalarRef);
		const element: GeoHomothety = {
			type: 'homothety',
			id,
			centerId,
			factor,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	createComposition(
		transformationIds: string[],
		options?: ElementOptions,
		sourceBuiltin?: GeoComposition['sourceBuiltin']
	): string {
		if (transformationIds.length < 2) {
			throw new Error('createComposition: at least 2 transformations required');
		}
		for (const tId of transformationIds) {
			const el = this.elements.get(tId);
			if (!el || !isTransformation(el)) {
				throw new Error(`createComposition: "${tId}" is not a transformation`);
			}
		}
		// Collect all dependencies transitively
		const deps = [
			...new Set(
				transformationIds.flatMap((tId) => {
					const el = this.elements.get(tId)!;
					return [tId, ...el.dependsOn];
				})
			)
		];
		const id = this.generateId('tComp');
		const element: GeoComposition = {
			type: 'composition',
			id,
			transformationIds,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: deps,
			...(sourceBuiltin ? { sourceBuiltin } : {})
		};
		this.addElement(id, element, deps);
		return id;
	}

	createProjection(linePoint1Id: string, linePoint2Id: string, options?: ElementOptions): string {
		this.requirePoints('createProjection', linePoint1Id, linePoint2Id);
		if (linePoint1Id === linePoint2Id) {
			throw new Error('createProjection: line points must be distinct');
		}
		const id = this.generateId('tProj');
		const element: GeoProjection = {
			type: 'projection',
			id,
			linePoint1Id,
			linePoint2Id,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: [linePoint1Id, linePoint2Id]
		};
		this.addElement(id, element, [linePoint1Id, linePoint2Id]);
		return id;
	}

	createProjectedPoint(
		sourcePointId: string,
		linePoint1Id: string,
		linePoint2Id: string,
		options?: ElementOptions
	): string {
		this.requirePoints('createProjectedPoint', sourcePointId, linePoint1Id, linePoint2Id);
		const id = this.generateId('projPt');
		const element: GeoProjectedPoint = {
			type: 'projectedPoint',
			id,
			sourceId: sourcePointId,
			linePoint1Id,
			linePoint2Id,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [sourcePointId, linePoint1Id, linePoint2Id]
		};
		this.addElement(id, element, [sourcePointId, linePoint1Id, linePoint2Id]);
		this.computePosition(id);
		return id;
	}

	createAffinity(
		linePoint1Id: string,
		linePoint2Id: string,
		factor: GeoValue,
		options?: ElementOptions
	): string {
		this.requirePoints('createAffinity', linePoint1Id, linePoint2Id);
		if (linePoint1Id === linePoint2Id) {
			throw new Error('createAffinity: line points must be distinct');
		}
		const id = this.generateId('tAff');
		const element: GeoAffinity = {
			type: 'affinity',
			id,
			linePoint1Id,
			linePoint2Id,
			factor,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: [linePoint1Id, linePoint2Id]
		};
		this.addElement(id, element, [linePoint1Id, linePoint2Id]);
		return id;
	}

	createAffinityPoint(
		sourcePointId: string,
		linePoint1Id: string,
		linePoint2Id: string,
		factor: GeoValue,
		options?: ElementOptions
	): string {
		this.requirePoints('createAffinityPoint', sourcePointId, linePoint1Id, linePoint2Id);
		const id = this.generateId('affPt');
		const element: GeoAffinityPoint = {
			type: 'affinityPoint',
			id,
			sourceId: sourcePointId,
			linePoint1Id,
			linePoint2Id,
			factor,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [sourcePointId, linePoint1Id, linePoint2Id]
		};
		this.addElement(id, element, [sourcePointId, linePoint1Id, linePoint2Id]);
		this.computePosition(id);
		return id;
	}

	createInversion(centerId: string, radius: GeoValue, options?: ElementOptions): string {
		this.requirePoints('createInversion', centerId);
		const id = this.generateId('tInv');
		const element: GeoInversion = {
			type: 'inversion',
			id,
			centerId,
			radius,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: [centerId]
		};
		this.addElement(id, element, [centerId]);
		return id;
	}

	createInvertedPoint(
		sourcePointId: string,
		centerId: string,
		radius: GeoValue,
		options?: ElementOptions
	): string {
		this.requirePoints('createInvertedPoint', sourcePointId, centerId);
		const id = this.generateId('invPt');
		const deps = [...new Set([sourcePointId, centerId])];
		const element: GeoInvertedPoint = {
			type: 'invertedPoint',
			id,
			sourceId: sourcePointId,
			centerId,
			radius,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps as [string, string]
		};
		this.addElement(id, element, deps);
		this.computePosition(id);
		return id;
	}

	createSimilitude(
		centerId: string,
		angle: ScalarParam,
		factor: ScalarParam,
		options?: ElementOptions
	): string {
		const rotId = this.createRotation(centerId, angle);
		const homId = this.createHomothety(centerId, factor);
		// compose(homothetie, rotation) → apply rotation first, then homothety
		return this.createComposition([homId, rotId], options, {
			name: 'similitude',
			params: { angle, rapport: factor, centerId }
		});
	}

	// ─── Arc factories ─────────────────────────────────────────────

	createArcByAngles(
		centerId: string,
		radius: ScalarParam,
		startAngle: ScalarParam,
		endAngle: ScalarParam,
		options?: ElementOptions
	): string {
		const id = this.generateId('arc');
		const deps: string[] = [centerId];
		if (isScalarRef(radius)) deps.push(radius.scalarRef);
		if (isScalarRef(startAngle)) deps.push(startAngle.scalarRef);
		if (isScalarRef(endAngle)) deps.push(endAngle.scalarRef);
		const element: GeoArcByAngles = {
			type: 'arcByAngles',
			id,
			centerId,
			radius,
			startAngle,
			endAngle,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	createArcByPoints(
		startId: string,
		centerId: string,
		endId: string,
		options?: ElementOptions
	): string {
		const id = this.generateId('arc');
		const element: GeoArcByPoints = {
			type: 'arcByPoints',
			id,
			startId,
			centerId,
			endId,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [startId, centerId, endId]
		};
		this.addElement(id, element, [startId, centerId, endId]);
		return id;
	}

	// ─── Sector factories ─────────────────────────────────────────

	createSectorByPoints(
		centerId: string,
		startId: string,
		endId: string,
		options?: ElementOptions
	): string {
		const id = this.generateId('sec');
		const element: GeoSectorByPoints = {
			type: 'sectorByPoints',
			id,
			centerId,
			startId,
			endId,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: options?.style
				? { ...options.style }
				: { fillColor: this.resolveColor(options), fillOpacity: 0.3 },
			dependsOn: [centerId, startId, endId]
		};
		this.addElement(id, element, [centerId, startId, endId]);
		return id;
	}

	createSectorByAngles(
		centerId: string,
		radius: ScalarParam,
		startAngle: ScalarParam,
		endAngle: ScalarParam,
		options?: ElementOptions
	): string {
		const id = this.generateId('sec');
		const deps: string[] = [centerId];
		if (isScalarRef(radius)) deps.push(radius.scalarRef);
		if (isScalarRef(startAngle)) deps.push(startAngle.scalarRef);
		if (isScalarRef(endAngle)) deps.push(endAngle.scalarRef);
		const element: GeoSectorByAngles = {
			type: 'sectorByAngles',
			id,
			centerId,
			radius,
			startAngle,
			endAngle,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: options?.style
				? { ...options.style }
				: { fillColor: this.resolveColor(options), fillOpacity: 0.3 },
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	// ─── Annulus factories ────────────────────────────────────────

	createAnnulus(
		centerId: string,
		innerRadius: ScalarParam,
		outerRadius: ScalarParam,
		options?: ElementOptions
	): string {
		const id = this.generateId('ann');
		const deps: string[] = [centerId];
		if (isScalarRef(innerRadius)) deps.push(innerRadius.scalarRef);
		if (isScalarRef(outerRadius)) deps.push(outerRadius.scalarRef);
		const element: GeoAnnulus = {
			type: 'annulus',
			id,
			centerId,
			innerRadius,
			outerRadius,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: options?.style
				? { ...options.style }
				: { fillColor: this.resolveColor(options), fillOpacity: 0.3 },
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	// ─── Annotation factories ───────────────────────────────────────

	createAngleMark(
		p1Id: string,
		vertexId: string,
		p2Id: string,
		options?: ElementOptions & { arcCount?: 1 | 2 | 3; rightAngle?: boolean }
	): string {
		const p1 = this.elements.get(p1Id);
		const v = this.elements.get(vertexId);
		const p2 = this.elements.get(p2Id);
		if (!p1 || !isPointElement(p1))
			throw new Error(`createAngleMark: "${p1Id}" is not a point element`);
		if (!v || !isPointElement(v))
			throw new Error(`createAngleMark: "${vertexId}" is not a point element`);
		if (!p2 || !isPointElement(p2))
			throw new Error(`createAngleMark: "${p2Id}" is not a point element`);

		const id = this.generateId('angM');
		const element: GeoAngleMark = {
			type: 'angleMark',
			id,
			p1Id,
			vertexId,
			p2Id,
			arcCount: options?.arcCount ?? 1,
			rightAngle: options?.rightAngle ?? false,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [p1Id, vertexId, p2Id]
		};
		this.addElement(id, element, [p1Id, vertexId, p2Id]);
		const vertexPos = this.positions.get(vertexId);
		if (vertexPos) this.positions.set(id, vertexPos);
		return id;
	}

	createSegmentMark(
		startId: string,
		endId: string,
		options?: ElementOptions & { markCount?: 1 | 2 | 3 }
	): string {
		const s = this.elements.get(startId);
		const e = this.elements.get(endId);
		if (!s || !isPointElement(s))
			throw new Error(`createSegmentMark: "${startId}" is not a point element`);
		if (!e || !isPointElement(e))
			throw new Error(`createSegmentMark: "${endId}" is not a point element`);

		const id = this.generateId('segM');
		const element: GeoSegmentMark = {
			type: 'segmentMark',
			id,
			startId,
			endId,
			markCount: options?.markCount ?? 1,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [startId, endId]
		};
		this.addElement(id, element, [startId, endId]);
		this.computePosition(id);
		return id;
	}

	createPolygon(
		vertexIds: [string, string, string, ...string[]],
		options?: ElementOptions
	): string {
		for (const vid of vertexIds) {
			const el = this.elements.get(vid);
			if (!el || !isPointElement(el)) {
				throw new Error(`createPolygon: "${vid}" is not a point element`);
			}
		}
		const id = this.generateId('poly');
		const element: GeoPolygon = {
			type: 'polygon',
			id,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: vertexIds
		};
		this.addElement(id, element, [...vertexIds]);
		return id;
	}

	createFunction(
		expression: MathNode,
		derivative: MathNode,
		compiledFn: CompiledFn,
		compiledDerivative: CompiledFn,
		equation: string,
		options?: ElementOptions
	): string {
		const id = this.generateId('fn');
		const element: GeoFunction = {
			type: 'function',
			id,
			expression,
			derivative,
			compiledFn,
			compiledDerivative,
			equation,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [] as const
		};
		this.addElement(id, element, []);
		return id;
	}

	createQuadraticCurve(
		expression: MathNode,
		equation: string,
		coefficients: readonly [number, number, number, number, number, number],
		conic: ConicParams,
		options?: ElementOptions
	): string {
		const id = this.generateId('qc');
		const element: GeoQuadraticCurve = {
			type: 'quadraticCurve',
			id,
			expression,
			equation,
			coefficients,
			conic,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [] as const
		};
		this.addElement(id, element, []);
		return id;
	}

	createTransformedQuadraticCurve(
		sourceCoefficients: readonly [number, number, number, number, number, number],
		transformId: string,
		options?: ElementOptions
	): string {
		const transformEl = this.elements.get(transformId);
		if (!transformEl || !isTransformation(transformEl)) {
			throw new Error(`createTransformedQuadraticCurve: "${transformId}" is not a transformation`);
		}

		const access: TransformAccessors = {
			getPosition: (id) => this.getPosition(id),
			getElementById: (id) => this.elements.get(id),
			getVectorComponents: (id) => this.getVectorComponents(id),
			getScalarValue: (id) => this.getScalarValue(id)
		};
		const invMatrix = buildInverseAffineMatrix(transformEl, access);
		const newCoeffs = transformConicCoefficients(sourceCoefficients, invMatrix);
		const conic = classifyConic(...newCoeffs);

		const deps = [...new Set([transformId, ...transformEl.dependsOn])];
		const id = this.generateId('qc');
		const element: GeoQuadraticCurve = {
			type: 'quadraticCurve',
			id,
			expression: { type: 'number', value: 0 } as MathNode,
			equation: `transformed`,
			coefficients: newCoeffs,
			conic,
			transformRecipe: { sourceCoefficients, transformId },
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	createImplicitCurve(
		expression: MathNode,
		compiledFn: CompiledFn,
		equation: string,
		options?: ElementOptions
	): string {
		const id = this.generateId('ic');
		const element: GeoImplicitCurve = {
			type: 'implicitCurve',
			id,
			expression,
			compiledFn,
			equation,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [] as const
		};
		this.addElement(id, element, []);
		return id;
	}

	createPointOnCurve(functionId: string, x0: GeoValue, options?: ElementOptions): string {
		const fnEl = this.elements.get(functionId);
		if (!fnEl || fnEl.type !== 'function') {
			throw new Error(`createPointOnCurve: "${functionId}" is not a function element`);
		}

		const id = this.generateId('ptC');
		const element: GeoPointOnCurve = {
			type: 'pointOnCurve',
			id,
			functionId,
			x0,
			draggable: options?.draggable ?? true,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [functionId]
		};
		this.addElement(id, element, [functionId]);
		this.computePosition(id);
		return id;
	}

	createPointOnQuadraticCurve(curveId: string, t: number, options?: ElementOptions): string {
		const curveEl = this.elements.get(curveId);
		if (!curveEl || curveEl.type !== 'quadraticCurve') {
			throw new Error(`createPointOnQuadraticCurve: "${curveId}" is not a quadraticCurve element`);
		}

		const id = this.generateId('ptQC');
		const element: GeoPointOnQuadraticCurve = {
			type: 'pointOnQuadraticCurve',
			id,
			curveId,
			t,
			draggable: options?.draggable ?? true,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [curveId]
		};
		this.addElement(id, element, [curveId]);
		this.computePosition(id);
		return id;
	}

	movePointOnQuadraticCurve(id: string, newT: number): void {
		const el = this.elements.get(id);
		if (!el || !isPointOnQuadraticCurve(el)) {
			throw new Error(`movePointOnQuadraticCurve: "${id}" is not a pointOnQuadraticCurve`);
		}

		const updated: GeoPointOnQuadraticCurve = { ...el, t: newT };
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
		this.graph.markDirty(id);
	}

	createTangentToQuadratic(
		curveId: string,
		anchor: { pointOnCurveId: string } | { t: number },
		options?: ElementOptions
	): string {
		const curveEl = this.elements.get(curveId);
		if (!curveEl || curveEl.type !== 'quadraticCurve') {
			throw new Error(`createTangentToQuadratic: "${curveId}" is not a quadraticCurve element`);
		}

		const id = this.generateId('tgQ');
		const deps: string[] = [curveId];

		if ('pointOnCurveId' in anchor) {
			const ptEl = this.elements.get(anchor.pointOnCurveId);
			if (!ptEl || ptEl.type !== 'pointOnQuadraticCurve') {
				throw new Error(
					`createTangentToQuadratic: "${anchor.pointOnCurveId}" is not a pointOnQuadraticCurve`
				);
			}
			deps.push(anchor.pointOnCurveId);
		}

		const element: GeoTangentToQuadratic = {
			type: 'tangentToQuadratic',
			id,
			curveId,
			...('pointOnCurveId' in anchor ? { pointOnCurveId: anchor.pointOnCurveId } : { t: anchor.t }),
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps as readonly string[]
		};
		this.addElement(id, element, deps);
		return id;
	}

	createConicPolar(curveId: string, pointId: string, options?: ElementOptions): string {
		const curveEl = this.elements.get(curveId);
		if (!curveEl || curveEl.type !== 'quadraticCurve') {
			throw new Error(`createConicPolar: "${curveId}" is not a quadraticCurve element`);
		}
		const ptEl = this.elements.get(pointId);
		if (!ptEl || !isPointElement(ptEl)) {
			throw new Error(`createConicPolar: "${pointId}" is not a point element`);
		}

		const id = this.generateId('pol');
		const deps = [curveId, pointId];

		const element: GeoConicPolar = {
			type: 'conicPolar',
			id,
			curveId,
			pointId,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps as readonly string[]
		};
		this.addElement(id, element, deps);
		return id;
	}

	movePointOnCurve(id: string, newX: GeoValue): void {
		const el = this.elements.get(id);
		if (!el || !isPointOnCurve(el)) {
			throw new Error(`movePointOnCurve: "${id}" is not a pointOnCurve`);
		}

		const updated: GeoPointOnCurve = { ...el, x0: newX };
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
		this.graph.markDirty(id);
	}

	createPointOnSegment(segmentId: string, t: number, options?: ElementOptions): string {
		const segEl = this.elements.get(segmentId);
		if (!segEl || segEl.type !== 'segment') {
			throw new Error(`createPointOnSegment: "${segmentId}" is not a segment element`);
		}

		const id = this.generateId('ptS');
		const element: GeoPointOnSegment = {
			type: 'pointOnSegment',
			id,
			segmentId,
			t: Math.max(0, Math.min(1, t)),
			draggable: options?.draggable ?? true,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [segmentId]
		};
		this.addElement(id, element, [segmentId]);
		this.computePosition(id);
		return id;
	}

	movePointOnSegment(id: string, newT: number): void {
		const el = this.elements.get(id);
		if (!el || !isPointOnSegment(el)) {
			throw new Error(`movePointOnSegment: "${id}" is not a pointOnSegment`);
		}

		const clamped = Math.max(0, Math.min(1, newT));
		const updated: GeoPointOnSegment = { ...el, t: clamped };
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
		this.graph.markDirty(id);
	}

	createPointOnLine(lineId: string, t: number, options?: ElementOptions): string {
		const lineEl = this.elements.get(lineId);
		if (!lineEl || (lineEl.type !== 'line' && lineEl.type !== 'ray')) {
			throw new Error(`createPointOnLine: "${lineId}" is not a line or ray element`);
		}

		const id = this.generateId('ptL');
		const element: GeoPointOnLine = {
			type: 'pointOnLine',
			id,
			lineId,
			t: lineEl.type === 'ray' ? Math.max(0, t) : t,
			draggable: options?.draggable ?? true,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [lineId]
		};
		this.addElement(id, element, [lineId]);
		this.computePosition(id);
		return id;
	}

	movePointOnLine(id: string, newT: number): void {
		const el = this.elements.get(id);
		if (!el || !isPointOnLine(el)) {
			throw new Error(`movePointOnLine: "${id}" is not a pointOnLine`);
		}

		// Clamp t >= 0 if parent is a ray
		const lineEl = this.elements.get(el.lineId);
		const clamped = lineEl?.type === 'ray' ? Math.max(0, newT) : newT;
		const updated: GeoPointOnLine = { ...el, t: clamped };
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
		this.graph.markDirty(id);
	}

	createPointOnCircle(circleId: string, theta: number, options?: ElementOptions): string {
		const circEl = this.elements.get(circleId);
		if (
			!circEl ||
			(circEl.type !== 'circleByRadius' &&
				circEl.type !== 'circleByPoint' &&
				circEl.type !== 'circleBy3Points')
		) {
			throw new Error(`createPointOnCircle: "${circleId}" is not a circle element`);
		}

		const id = this.generateId('ptCi');
		const element: GeoPointOnCircle = {
			type: 'pointOnCircle',
			id,
			circleId,
			theta: ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
			draggable: options?.draggable ?? true,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [circleId]
		};
		this.addElement(id, element, [circleId]);
		this.computePosition(id);
		return id;
	}

	movePointOnCircle(id: string, newTheta: number): void {
		const el = this.elements.get(id);
		if (!el || !isPointOnCircle(el)) {
			throw new Error(`movePointOnCircle: "${id}" is not a pointOnCircle`);
		}

		const normalized = ((newTheta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
		const updated: GeoPointOnCircle = { ...el, theta: normalized };
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
		this.graph.markDirty(id);
	}

	createPointOnArc(arcId: string, t: number, options?: ElementOptions): string {
		const arcEl = this.elements.get(arcId);
		if (!arcEl || (arcEl.type !== 'arcByAngles' && arcEl.type !== 'arcByPoints')) {
			throw new Error(`createPointOnArc: "${arcId}" is not an arc element`);
		}

		const id = this.generateId('ptA');
		const element: GeoPointOnArc = {
			type: 'pointOnArc',
			id,
			arcId,
			t: Math.max(0, Math.min(1, t)),
			draggable: options?.draggable ?? true,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [arcId]
		};
		this.addElement(id, element, [arcId]);
		this.computePosition(id);
		return id;
	}

	movePointOnArc(id: string, newT: number): void {
		const el = this.elements.get(id);
		if (!el || !isPointOnArc(el)) {
			throw new Error(`movePointOnArc: "${id}" is not a pointOnArc`);
		}

		const clamped = Math.max(0, Math.min(1, newT));
		const updated: GeoPointOnArc = { ...el, t: clamped };
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
		this.graph.markDirty(id);
	}

	createLocus(
		driverId: string,
		tracerId: string,
		options?: ElementOptions & { numSamples?: number }
	): string {
		const driverEl = this.elements.get(driverId);
		if (!driverEl) {
			throw new Error(`createLocus: driver "${driverId}" does not exist`);
		}
		const isDriverOnPath =
			isPointOnCurve(driverEl) ||
			isPointOnQuadraticCurve(driverEl) ||
			isPointOnSegment(driverEl) ||
			isPointOnLine(driverEl) ||
			isPointOnCircle(driverEl) ||
			isPointOnArc(driverEl);
		if (!isDriverOnPath) {
			throw new Error(`createLocus: driver "${driverId}" must be a point_sur`);
		}

		const tracerEl = this.elements.get(tracerId);
		if (!tracerEl || !isPointElement(tracerEl)) {
			throw new Error(`createLocus: tracer "${tracerId}" must be a point element`);
		}

		const id = this.generateId('loc');
		// Include transitive deps of the tracer so that scalar/slider changes
		// mark the locus dirty (e.g. slider controlling a radius in the chain)
		const depsSet = new Set<string>([driverId, tracerId]);
		const queue = [...tracerEl.dependsOn];
		while (queue.length > 0) {
			const depId = queue.pop()!;
			if (depsSet.has(depId)) continue;
			depsSet.add(depId);
			const depEl = this.elements.get(depId);
			if (depEl) {
				for (const parentId of depEl.dependsOn) queue.push(parentId);
			}
		}
		const deps = [...depsSet];
		const element: GeoLocus = {
			type: 'locus',
			id,
			driverId,
			tracerId,
			numSamples: options?.numSamples ?? 200,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	createTrace(trackedPointId: string, options?: ElementOptions): string {
		const trackedEl = this.elements.get(trackedPointId);
		if (!trackedEl || !isPointElement(trackedEl)) {
			throw new Error(`createTrace: "${trackedPointId}" must be a point element`);
		}
		const id = this.generateId('tr');
		// Include transitive deps so that scalar/slider changes mark the trace dirty
		const depsSet = new Set<string>([trackedPointId]);
		const queue = [...trackedEl.dependsOn];
		while (queue.length > 0) {
			const depId = queue.pop()!;
			if (depsSet.has(depId)) continue;
			depsSet.add(depId);
			const depEl = this.elements.get(depId);
			if (depEl) {
				for (const parentId of depEl.dependsOn) queue.push(parentId);
			}
		}
		const deps = [...depsSet];
		const element: GeoTrace = {
			type: 'trace',
			id,
			trackedPointId,
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		// Seed with current position
		this.accumulateTracePoint(id, trackedPointId);
		return id;
	}

	clearTrace(id: string): void {
		const el = this.elements.get(id);
		if (!el || el.type !== 'trace') {
			throw new Error(`clearTrace: "${id}" is not a trace element`);
		}
		this.tracePoints.set(id, []);
	}

	getTracePoints(id: string): readonly Point[] {
		return this.tracePoints.get(id) ?? [];
	}

	private accumulateTracePoint(traceId: string, trackedPointId: string): void {
		const pos = this.positions.get(trackedPointId);
		if (!pos) return;
		const x = geoToNumber(pos.x);
		const y = geoToNumber(pos.y);
		if (!Number.isFinite(x) || !Number.isFinite(y)) return;

		let points = this.tracePoints.get(traceId);
		if (!points) {
			points = [];
			this.tracePoints.set(traceId, points);
		}

		// Filter near-duplicates
		if (points.length > 0) {
			const last = points[points.length - 1];
			const dx = x - last.x;
			const dy = y - last.y;
			if (dx * dx + dy * dy < TRACE_EPSILON * TRACE_EPSILON) return;
		}

		points.push({ x, y });

		// Enforce max size — drop oldest
		if (points.length > TRACE_MAX_POINTS) {
			points.shift();
		}
	}

	createTangentLine(
		functionId: string,
		anchor: { pointOnCurveId: string } | { x0: GeoValue },
		options?: ElementOptions
	): string {
		const fnEl = this.elements.get(functionId);
		if (!fnEl || fnEl.type !== 'function') {
			throw new Error(`createTangentLine: "${functionId}" is not a function element`);
		}

		const id = this.generateId('tg');
		const deps: string[] = [functionId];

		if ('pointOnCurveId' in anchor) {
			const ptEl = this.elements.get(anchor.pointOnCurveId);
			if (!ptEl || ptEl.type !== 'pointOnCurve') {
				throw new Error(`createTangentLine: "${anchor.pointOnCurveId}" is not a pointOnCurve`);
			}
			if (ptEl.functionId !== functionId) {
				throw new Error(
					`createTangentLine: pointOnCurve "${anchor.pointOnCurveId}" belongs to a different function`
				);
			}
			deps.push(anchor.pointOnCurveId);
		}

		const element: GeoTangentLine = {
			type: 'tangentLine',
			id,
			functionId,
			...('pointOnCurveId' in anchor
				? { pointOnCurveId: anchor.pointOnCurveId }
				: { x0: anchor.x0 }),
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: deps as readonly string[]
		};
		this.addElement(id, element, deps);
		return id;
	}

	createScalarArea(pointIds: string[], options?: ElementOptions): string {
		if (pointIds.length < 3) {
			throw new Error('createScalarArea: area requires at least 3 target points');
		}
		for (const tid of pointIds) {
			const el = this.elements.get(tid);
			if (!el || !isPointElement(el)) {
				throw new Error(`createScalarArea: "${tid}" is not a point element`);
			}
		}
		const id = this.generateId('sca');
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'area',
			id,
			targetIds: pointIds,
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: [...pointIds]
		};
		this.addElement(id, element, [...pointIds]);
		this.computePosition(id);
		return id;
	}

	private _collectTextDeps(
		scalarRefs: string[],
		positioning: { anchorId?: string; autoTargetIds?: string[] }
	): string[] {
		const deps: string[] = [];
		for (const ref of scalarRefs) {
			const el = this.elements.get(ref);
			if (!el) throw new Error(`scalar ref "${ref}" does not exist`);
			deps.push(ref);
			for (const parentId of el.dependsOn) {
				if (!deps.includes(parentId)) deps.push(parentId);
			}
		}
		if (positioning.anchorId) {
			const anchorEl = this.elements.get(positioning.anchorId);
			if (!anchorEl || !isPointElement(anchorEl)) {
				throw new Error(`anchor "${positioning.anchorId}" is not a point element`);
			}
			if (!deps.includes(positioning.anchorId)) deps.push(positioning.anchorId);
		}
		if (positioning.autoTargetIds) {
			for (const tid of positioning.autoTargetIds) {
				if (!deps.includes(tid)) deps.push(tid);
			}
		}
		return deps;
	}

	createText(
		template: string,
		scalarRefs: string[],
		positioning: {
			anchorId?: string;
			anchorOffset?: { dx: number; dy: number };
			position?: { x: number; y: number };
			autoPosition?: 'midpoint' | 'bisector' | 'centroid';
			autoTargetIds?: string[];
		},
		options?: ElementOptions
	): string {
		const deps = this._collectTextDeps(scalarRefs, positioning);
		const id = this.generateId('txt');
		const element: GeoText = {
			type: 'text',
			id,
			template,
			scalarRefs,
			anchorId: positioning.anchorId,
			anchorOffset: positioning.anchorOffset,
			position: positioning.position,
			autoPosition: positioning.autoPosition,
			autoTargetIds: positioning.autoTargetIds,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	createMathText(
		template: string,
		scalarRefs: string[],
		positioning: {
			anchorId?: string;
			anchorOffset?: { dx: number; dy: number };
			position?: { x: number; y: number };
			autoPosition?: 'midpoint' | 'bisector' | 'centroid';
			autoTargetIds?: string[];
		},
		options?: ElementOptions
	): string {
		const deps = this._collectTextDeps(scalarRefs, positioning);
		const id = this.generateId('mtxt');
		const element: GeoMathText = {
			type: 'mathText',
			id,
			template,
			scalarRefs,
			anchorId: positioning.anchorId,
			anchorOffset: positioning.anchorOffset,
			position: positioning.position,
			autoPosition: positioning.autoPosition,
			autoTargetIds: positioning.autoTargetIds,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	createRichText(
		template: string,
		scalarRefs: string[],
		positioning: {
			anchorId?: string;
			anchorOffset?: { dx: number; dy: number };
			position?: { x: number; y: number };
			autoPosition?: 'midpoint' | 'bisector' | 'centroid';
			autoTargetIds?: string[];
		},
		options?: ElementOptions
	): string {
		const deps = this._collectTextDeps(scalarRefs, positioning);
		const id = this.generateId('rtxt');
		const element: GeoRichText = {
			type: 'richText',
			id,
			template,
			scalarRefs,
			anchorId: positioning.anchorId,
			anchorOffset: positioning.anchorOffset,
			position: positioning.position,
			autoPosition: positioning.autoPosition,
			autoTargetIds: positioning.autoTargetIds,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	createImage(
		url: string,
		width: number,
		height: number | undefined,
		positioning: {
			anchorId?: string;
			anchorOffset?: { dx: number; dy: number };
			position?: { x: number; y: number };
			point1Id?: string;
			point2Id?: string;
		},
		options?: ElementOptions & {
			layer?: 'fond' | 'avant';
			rotation?: number;
			flipped?: boolean;
			_srcPoint1Id?: string;
			_srcPoint2Id?: string;
			_transformId?: string;
			_srcImageId?: string;
		}
	): string {
		const deps = this._collectTextDeps([], positioning);
		// For 2-point mode, add both points to deps
		if (positioning.point1Id) {
			const p1El = this.elements.get(positioning.point1Id);
			if (!p1El || !isPointElement(p1El))
				throw new Error(`createImage: "${positioning.point1Id}" is not a point element`);
			if (!deps.includes(positioning.point1Id)) deps.push(positioning.point1Id);
		}
		if (positioning.point2Id) {
			const p2El = this.elements.get(positioning.point2Id);
			if (!p2El || !isPointElement(p2El))
				throw new Error(`createImage: "${positioning.point2Id}" is not a point element`);
			if (!deps.includes(positioning.point2Id)) deps.push(positioning.point2Id);
		}
		const id = this.generateId('img');
		const element: GeoImage = {
			type: 'image',
			id,
			url,
			width,
			height,
			anchorId: positioning.anchorId,
			anchorOffset: positioning.anchorOffset,
			position: positioning.position,
			point1Id: positioning.point1Id,
			point2Id: positioning.point2Id,
			layer: options?.layer,
			rotation: options?.rotation,
			flipped: options?.flipped,
			_srcPoint1Id: options?._srcPoint1Id,
			_srcPoint2Id: options?._srcPoint2Id,
			_transformId: options?._transformId,
			_srcImageId: options?._srcImageId,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		return id;
	}

	/**
	 * Resolve a text element's template, replacing {scalarId} with formatted values.
	 * Supports: {id}, {id:.2f}, {id:deg}, {id*2}, {id+other:.1f}
	 */
	resolveTemplate(id: string): string | undefined {
		const el = this.elements.get(id);
		if (!el || (el.type !== 'text' && el.type !== 'mathText' && el.type !== 'richText'))
			return undefined;
		const textEl = el as GeoText | GeoMathText | GeoRichText;
		return resolveTemplateString(textEl.template, this.scalarValues);
	}

	getScalarValue(id: string): number | undefined {
		return this.scalarValues.get(id);
	}

	/** Resolve a ScalarParam to a number. ScalarRef looks up scalarValues, GeoValue converts directly. */
	resolveParam(param: ScalarParam): number {
		if (isScalarRef(param)) {
			return this.scalarValues.get(param.scalarRef) ?? 0;
		}
		return geoToNumber(param);
	}

	// ─── Scalar factories ───────────────────────────────────────

	private coordinateScalarCache = new Map<string, string>();

	createScalarCoordinate(pointId: string, axis: 'x' | 'y', options?: ElementOptions): string {
		const cacheKey = `${pointId}.${axis}`;
		const cached = this.coordinateScalarCache.get(cacheKey);
		if (cached && this.elements.has(cached)) return cached;

		this.requirePoints('createScalarCoordinate', pointId);
		const id = this.generateId('sca');
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'coordinate',
			id,
			targetIds: [pointId],
			coordinateAxis: axis,
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: [pointId]
		};
		this.addElement(id, element, [pointId]);
		this.computePosition(id);
		this.coordinateScalarCache.set(cacheKey, id);
		return id;
	}

	createScalarDistance(point1Id: string, point2Id: string, options?: ElementOptions): string {
		this.requirePoints('createScalarDistance', point1Id, point2Id);
		const id = this.generateId('sca');
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'distance',
			id,
			targetIds: [point1Id, point2Id],
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: [point1Id, point2Id]
		};
		this.addElement(id, element, [point1Id, point2Id]);
		this.computePosition(id);
		return id;
	}

	createScalarDistancePointLine(pointId: string, lineId: string, options?: ElementOptions): string {
		this.requirePoints('createScalarDistancePointLine', pointId);
		const lineEl = this.getElementById(lineId);
		if (!lineEl || (lineEl.type !== 'line' && lineEl.type !== 'segment' && lineEl.type !== 'ray'))
			throw new Error('createScalarDistancePointLine: lineId must be a line, segment, or ray');
		const id = this.generateId('sca');
		// dependsOn [pointId, lineId]: the line's own defining points are reached
		// transitively (defining point → line → this scalar) via dirty-propagation.
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'distance_point_line',
			id,
			targetIds: [pointId, lineId],
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: [pointId, lineId]
		};
		this.addElement(id, element, [pointId, lineId]);
		this.computePosition(id);
		return id;
	}

	createScalarAngle(
		p1Id: string,
		vertexId: string,
		p2Id: string,
		options?: ElementOptions
	): string {
		this.requirePoints('createScalarAngle', p1Id, vertexId, p2Id);
		const id = this.generateId('sca');
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'angle',
			id,
			targetIds: [p1Id, vertexId, p2Id],
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: [p1Id, vertexId, p2Id]
		};
		this.addElement(id, element, [p1Id, vertexId, p2Id]);
		this.computePosition(id);
		return id;
	}

	createScalarPolarAngle(centerId: string, pointId: string, options?: ElementOptions): string {
		this.requirePoints('createScalarPolarAngle', centerId, pointId);
		const id = this.generateId('sca');
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'polar_angle',
			id,
			targetIds: [centerId, pointId],
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: [centerId, pointId]
		};
		this.addElement(id, element, [centerId, pointId]);
		this.computePosition(id);
		return id;
	}

	createScalarNorme(vectorId: string, options?: ElementOptions): string {
		const vecEl = this.elements.get(vectorId);
		if (!vecEl || !isVector(vecEl)) {
			throw new Error(`createScalarNorme: "${vectorId}" is not a vector element`);
		}
		const id = this.generateId('sca');
		const deps = [...new Set([vectorId, ...vecEl.dependsOn])];
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'norme',
			id,
			targetIds: [vectorId],
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: deps
		};
		this.addElement(id, element, deps);
		this.computePosition(id);
		return id;
	}

	createScalarPerimeter(pointIds: string[], options?: ElementOptions): string {
		if (pointIds.length < 3) {
			throw new Error('createScalarPerimeter: perimeter requires at least 3 points');
		}
		for (const tid of pointIds) {
			const el = this.elements.get(tid);
			if (!el || !isPointElement(el)) {
				throw new Error(`createScalarPerimeter: "${tid}" is not a point element`);
			}
		}
		const id = this.generateId('sca');
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'perimeter',
			id,
			targetIds: pointIds,
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: [...pointIds]
		};
		this.addElement(id, element, [...pointIds]);
		this.computePosition(id);
		return id;
	}

	createScalarSlope(lineId: string, options?: ElementOptions): string {
		const lineEl = this.getElementById(lineId);
		if (!lineEl || (lineEl.type !== 'line' && lineEl.type !== 'segment' && lineEl.type !== 'ray'))
			throw new Error('createScalarSlope: lineId must be a line, segment, or ray');
		const id = this.generateId('sca');
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'slope',
			id,
			targetIds: [lineId],
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: [lineId]
		};
		this.addElement(id, element, [lineId]);
		this.computePosition(id);
		return id;
	}

	createScalarRadius(circleId: string, options?: ElementOptions): string {
		const circleEl = this.getElementById(circleId);
		if (!circleEl || !isCircle(circleEl))
			throw new Error('createScalarRadius: circleId must be a circle');
		const id = this.generateId('sca');
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'radius',
			id,
			targetIds: [circleId],
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: [circleId]
		};
		this.addElement(id, element, [circleId]);
		this.computePosition(id);
		return id;
	}

	createScalarPower(pointId: string, circleId: string, options?: ElementOptions): string {
		const circleEl = this.getElementById(circleId);
		if (!circleEl || !isCircle(circleEl))
			throw new Error('createScalarPower: circleId must be a circle');
		const id = this.generateId('sca');
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'power',
			id,
			targetIds: [pointId, circleId],
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: [pointId, circleId]
		};
		this.addElement(id, element, [pointId, circleId]);
		this.computePosition(id);
		return id;
	}

	createScalarExpression(
		compute: (scalarValues: ReadonlyMap<string, number>) => number,
		scalarDeps: string[],
		options?: ElementOptions
	): string {
		// Collect transitive dependencies from scalar deps (deduplicated)
		const allDeps: string[] = [];
		for (const depId of scalarDeps) {
			const el = this.elements.get(depId);
			if (!el) throw new Error(`createScalarExpression: "${depId}" does not exist`);
			if (!allDeps.includes(depId)) allDeps.push(depId);
			for (const parentId of el.dependsOn) {
				if (!allDeps.includes(parentId)) allDeps.push(parentId);
			}
		}
		const id = this.generateId('sca');
		const element: GeoScalar = {
			type: 'scalar',
			scalarKind: 'expression',
			id,
			targetIds: [],
			compute,
			scalarDeps,
			color: this.resolveColor(options),
			visible: options?.visible ?? false,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: allDeps
		};
		this.addElement(id, element, allDeps);
		this.computePosition(id);
		return id;
	}

	/**
	 * Create a paired GeoIntegralArea (visual zone) and GeoScalar (reactive value)
	 * representing the area between f and the x-axis on [a, b].
	 *
	 * - `options.signed = true` (default) → scalar = F(b) − F(a), used by
	 *   `integrale()` (DSL builtin). See `docs/wip/geometry/integrale-study.md`.
	 * - `options.signed = false` → scalar = Σ |F(z_{i+1}) − F(z_i)| over zeros
	 *   of f in (a, b), used by `aire()` (DSL builtin). Always ≥ 0.
	 *   See `docs/wip/geometry/aire-study.md`.
	 *
	 * Returns both ids; the scalar is what the DSL exposes.
	 */
	createIntegralArea(
		functionId: string,
		lowerBound: ScalarParam,
		upperBound: ScalarParam,
		options?: ElementOptions & {
			signed?: boolean;
			/**
			 * Pre-computed list of all discontinuities of the integrand (typically
			 * `analyzeContinuity(fnExpression, 'x').discontinuities`). When provided,
			 * the compute closure consults this list on every recompute: divergent
			 * discontinuities (`infinite`/`essential` interior, or boundary with no
			 * finite interior limit) inside the current `[a, b]` cause the scalar to
			 * resolve to `NaN`; removable / jump interior points are used as
			 * additional split breakpoints to keep the numeric integrator from
			 * sampling the singularity. See `docs/wip/geometry/singularity-rigorous-study.md`.
			 *
			 * In V3 (aire_entre) mode, this should be the discontinuities of
			 * `h = f − g`, not of `f` alone — the DSL builtin handles this.
			 */
			discontinuities?: readonly Discontinuity[];
			/**
			 * Second function id for `aire_entre()` mode (V3). When set:
			 *  - the visual fills between f and g (not between f and the x-axis),
			 *  - `signed` is forced to `false` (aire_entre is always ≥ 0),
			 *  - the antiderivative cached is that of h = f − g (not of f alone),
			 *  - findRoots and the numeric fallback work on h.
			 * See `docs/wip/geometry/aire-entre-study.md`.
			 */
			secondFunctionId?: string;
		}
	): { areaId: string; scalarId: string } {
		const fnEl = this.elements.get(functionId);
		if (!fnEl || fnEl.type !== 'function') {
			throw new Error(`createIntegralArea: "${functionId}" is not a function element`);
		}

		// V3 (aire_entre) — validate the second function id if present.
		let secondFnEl: GeoFunction | undefined;
		let secondFnId: string | undefined;
		if (options?.secondFunctionId !== undefined) {
			const candidate = this.elements.get(options.secondFunctionId);
			if (!candidate || candidate.type !== 'function') {
				throw new Error(
					`createIntegralArea: secondFunctionId "${options.secondFunctionId}" is not a function element`
				);
			}
			secondFnEl = candidate;
			secondFnId = options.secondFunctionId;
		}

		const validateBoundRef = (param: ScalarParam, label: string): void => {
			if (!isScalarRef(param)) return;
			const refEl = this.elements.get(param.scalarRef);
			if (!refEl) {
				throw new Error(
					`createIntegralArea: ${label} bound ref "${param.scalarRef}" does not exist`
				);
			}
			if (refEl.type !== 'scalar' && refEl.type !== 'slider') {
				throw new Error(
					`createIntegralArea: ${label} bound ref "${param.scalarRef}" is not a scalar or slider`
				);
			}
		};
		validateBoundRef(lowerBound, 'lower');
		validateBoundRef(upperBound, 'upper');

		// V3 (aire_entre) forces signed = false (aire entre est toujours ≥ 0).
		const signed = secondFnEl ? false : (options?.signed ?? true);

		// Build the working expression: f alone in V1/V2, h = f − g in V3.
		// findRoots, numericIntegrate and the symbolic antiderivative all work
		// on this expression, transparently to the compute branches below.
		let differenceExpression: MathNode | undefined;
		let compiledDifference: CompiledFn | undefined;
		let workingExpression: MathNode = fnEl.expression;
		let workingCompiled: CompiledFn = fnEl.compiledFn;
		if (secondFnEl) {
			differenceExpression = subtract(fnEl.expression, secondFnEl.expression);
			try {
				compiledDifference = compile(differenceExpression);
			} catch (e) {
				throw new Error(
					`createIntegralArea: failed to compile h = f − g — ${e instanceof Error ? e.message : ''}`
				);
			}
			workingExpression = differenceExpression;
			workingCompiled = compiledDifference;
		}

		// Symbolic integration attempt — only the antiderivative matters here.
		// Pass allowNumeric: false so integrateDefinite doesn't run a redundant
		// adaptive-Simpson at creation; we handle the numeric fallback ourselves
		// in the compute closure below. In V3 mode, integrates h = f − g.
		let antiderivative: MathNode | null = null;
		let compiledF: CompiledFn | null = null;
		let integrationStatus: 'exact' | 'approximate' | 'unsupported' = 'unsupported';
		try {
			const r = integrateDefinite(workingExpression, mathNumber('0'), mathNumber('0'), {
				allowNumeric: false
			});
			integrationStatus = r.status;
			if (r.status === 'exact' && r.antiderivative) {
				try {
					compiledF = compile(r.antiderivative);
					antiderivative = r.antiderivative;
				} catch {
					antiderivative = null;
					compiledF = null;
					integrationStatus = 'unsupported';
				}
			}
		} catch {
			integrationStatus = 'unsupported';
		}

		const fnExpression = workingExpression;
		const fnCompiled = workingCompiled;
		const cachedCompiledF = compiledF;
		const lowerCapture = lowerBound;
		const upperCapture = upperBound;
		const cachedDiscs = options?.discontinuities ?? null;
		const compute = (scalarValues: ReadonlyMap<string, number>): number => {
			const a = resolveScalarParam(lowerCapture, scalarValues);
			const b = resolveScalarParam(upperCapture, scalarValues);
			if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;

			// Consult cached discontinuities for the current bounds. Divergent
			// (infinite/essential) → NaN ; interior removable/jump points are kept
			// to split the numeric integrator and avoid sampling the singularity.
			const interiorSplitPoints: number[] = [];
			if (cachedDiscs) {
				const ranged = classifyDiscontinuitiesForRange(cachedDiscs, a, b);
				if (ranged) {
					for (const rd of ranged) {
						if (rd.causesDivergence) return NaN;
						if (rd.atBoundary === 'interior') interiorSplitPoints.push(rd.pointValue);
					}
				}
			}

			if (signed) {
				if (cachedCompiledF) {
					// `F(b) - F(a)` is exact for a continuous antiderivative on `[a, b]`.
					// For removable interior points the antiderivative is finite at the
					// limit value, so this is correct. For interior **jumps** the
					// antiderivative would have to be discontinuous and the symbolic
					// integrator (`integrateDefinite`) declines (`status: 'unsupported'`)
					// — so this branch is unreachable for `floor` / `ceil` / `sign` today.
					// If a future integrator emits a piecewise antiderivative for a
					// genuinely discontinuous primitive, add a guard here that falls
					// through to the numeric path on `interiorSplitPoints.length > 0`.
					return cachedCompiledF({ x: b }) - cachedCompiledF({ x: a });
				}
				// Numeric path. Split around interior removable/jump points so the
				// adaptive Simpson never samples a singularity. The function may be
				// undefined at the exact point (e.g. sin(0)/0 = NaN), so we skip a
				// 1e-9 sliver around each split point — the omitted contribution is
				// O(eps) for any bounded integrand and far below adaptive-Simpson
				// tolerance (1e-6).
				const lo = Math.min(a, b);
				const hi = Math.max(a, b);
				const direction = a <= b ? 1 : -1;
				const innerPts = interiorSplitPoints
					.filter((p) => p > lo + 1e-9 && p < hi - 1e-9)
					.sort((x, y) => x - y);
				const splitEps = 1e-9;
				let total = 0;
				let prev = lo;
				for (const p of innerPts) {
					try {
						total += numericIntegrate(fnExpression, 'x', prev, p - splitEps).value;
					} catch {
						return NaN;
					}
					prev = p + splitEps;
				}
				try {
					total += numericIntegrate(fnExpression, 'x', prev, hi).value;
				} catch {
					return NaN;
				}
				return direction * total;
			}

			// signed = false: aire géométrique = Σ |F(z_{i+1}) − F(z_i)| over zeros of f in (a, b).
			if (a === b) return 0;
			const lo = Math.min(a, b);
			const hi = Math.max(a, b);
			// Inner zeros only — boundary roots would create empty subintervals (harmless,
			// just wasted work). Tolerance 1e-7 matches splitOnZeros' ZERO_Y_EPS scale.
			const inner: number[] = [];
			try {
				const all = findRoots(fnExpression, fnCompiled, 'x', lo, hi);
				for (const r of all) {
					if (r.x > lo + 1e-7 && r.x < hi - 1e-7) inner.push(r.x);
				}
			} catch {
				// findRoots failed; fall back to a single subinterval [lo, hi].
			}
			// Interior removable/jump points used as additional split sites. Tracked
			// separately from the zero breakpoints because the integrand may be
			// undefined at these exact x-values (e.g. sin(x)/x at 0), so the numeric
			// path skips a 1e-9 sliver around each. Antiderivative path keeps them
			// as plain breakpoints (cachedCompiledF is finite at the limit value).
			const removableInterior = new Set(
				interiorSplitPoints.filter((p) => p > lo + 1e-7 && p < hi - 1e-7)
			);

			let area = 0;
			if (cachedCompiledF) {
				const allBreakpoints = Array.from(new Set([lo, ...inner, ...removableInterior, hi])).sort(
					(x, y) => x - y
				);
				for (let i = 0; i < allBreakpoints.length - 1; i++) {
					area += Math.abs(
						cachedCompiledF({ x: allBreakpoints[i + 1] }) -
							cachedCompiledF({ x: allBreakpoints[i] })
					);
				}
				return area;
			}
			// Numeric path: keep zero breakpoints (f is genuinely zero there, no
			// sampling issue) and skip a 1e-9 sliver around each removable point.
			const splitEps = 1e-9;
			const sortedZeros = [...inner].sort((x, y) => x - y);
			let prev = lo;
			const subintervals: Array<[number, number]> = [];
			for (const z of sortedZeros) {
				if (removableInterior.has(z)) {
					// Zero coincides with a removable point — split with sliver.
					subintervals.push([prev, z - splitEps]);
					prev = z + splitEps;
				} else {
					subintervals.push([prev, z]);
					prev = z;
				}
			}
			// Apply slivers for removable points that are not zeros of f. The
			// `1e-7` matches the zero-detection tolerance used above for
			// `findRoots`: a removable point within that radius of a zero is
			// numerically the same point and is already covered by the zero
			// breakpoint (since f is exactly zero there, so adaptive Simpson
			// has no sampling problem at the boundary). Tolerance choice is
			// asymmetric with the `splitEps = 1e-9` sliver radius by design.
			const removableNotZero = Array.from(removableInterior)
				.filter((p) => !sortedZeros.some((z) => Math.abs(z - p) < 1e-7))
				.sort((x, y) => x - y);
			subintervals.push([prev, hi]);
			// Re-walk subintervals to apply remaining removable splits.
			const finalSubintervals: Array<[number, number]> = [];
			for (const [s, e] of subintervals) {
				let cursor = s;
				const interior = removableNotZero.filter((p) => p > s + splitEps && p < e - splitEps);
				for (const p of interior) {
					finalSubintervals.push([cursor, p - splitEps]);
					cursor = p + splitEps;
				}
				finalSubintervals.push([cursor, e]);
			}
			for (const [s, e] of finalSubintervals) {
				if (e - s < splitEps * 2) continue;
				try {
					area += Math.abs(numericIntegrate(fnExpression, 'x', s, e).value);
				} catch {
					// Subinterval failed (e.g. extremely narrow width or non-integrable form).
					// Skip contribution rather than discarding partial sums from earlier subintervals.
				}
			}
			return area;
		};

		const deps: string[] = [functionId];
		// V3 — aire_entre depends on g as well, for orphan detection on g deletion.
		// Dedupe when caller passes the same id for f and g (Q-C: aire_entre(f, f) = 0
		// is mathematically valid and pedagogically useful — autorisé sans warning).
		if (secondFnId && secondFnId !== functionId) deps.push(secondFnId);
		const scalarRefDeps: string[] = [];
		if (isScalarRef(lowerBound)) {
			deps.push(lowerBound.scalarRef);
			scalarRefDeps.push(lowerBound.scalarRef);
		}
		if (isScalarRef(upperBound) && !deps.includes(upperBound.scalarRef)) {
			deps.push(upperBound.scalarRef);
			scalarRefDeps.push(upperBound.scalarRef);
		}

		const areaId = this.generateId('iar');
		const scalarId = this.generateId('sca');

		const areaElement: GeoIntegralArea = {
			type: 'integralArea',
			id: areaId,
			functionId,
			lowerBound,
			upperBound,
			signed,
			antiderivative,
			compiledF,
			integrationStatus,
			_scalarId: scalarId,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: deps,
			...(secondFnId && {
				secondFunctionId: secondFnId,
				differenceExpression,
				compiledDifference
			})
		};

		const scalarElement: GeoScalar = {
			type: 'scalar',
			scalarKind: 'expression',
			id: scalarId,
			targetIds: [],
			compute,
			scalarDeps: scalarRefDeps,
			_visualAreaId: areaId,
			color: this.resolveColor(options),
			visible: false,
			label: undefined,
			style: this.resolveStyle(options),
			dependsOn: deps
		};

		this.beginTransaction();
		try {
			this.addElement(areaId, areaElement, deps);
			this.addElement(scalarId, scalarElement, deps);
			this.computePosition(areaId);
			this.computePosition(scalarId);
			this.commit();
		} catch (e) {
			this.undo_manager.discard();
			throw e;
		}

		return { areaId, scalarId };
	}

	/**
	 * Improper integral area — at least one of `lowerBound` / `upperBound` is
	 * ±Infinity. Routed here from `interpretAreaBuiltin()` when a bound is
	 * non-finite.
	 *
	 * Strategy: a fresh compute closure delegates to `improperIntegrate()` from
	 * `mathAST/integration/improper`. Divergent diagnostics return NaN. The
	 * returned `GeoIntegralArea` is structurally identical to the V1-V4 one;
	 * only the compute closure differs (no symbolic antiderivative branch, no
	 * findRoots-based unsigned path — the substitution scheme handles signed
	 * AND unsigned via the `signed` flag wrapping `abs()` around the integrand).
	 *
	 * Spec: docs/wip/geometry/improper-integrals-study.md §2.4 + §4 (Phase 3).
	 */
	createImproperIntegralArea(
		functionId: string,
		lowerBound: ScalarParam,
		upperBound: ScalarParam,
		options?: ElementOptions & {
			signed?: boolean;
			discontinuities?: readonly Discontinuity[];
			secondFunctionId?: string;
		}
	): { areaId: string; scalarId: string } {
		const fnEl = this.elements.get(functionId);
		if (!fnEl || fnEl.type !== 'function') {
			throw new Error(`createImproperIntegralArea: "${functionId}" is not a function element`);
		}

		let secondFnEl: GeoFunction | undefined;
		let secondFnId: string | undefined;
		if (options?.secondFunctionId !== undefined) {
			const candidate = this.elements.get(options.secondFunctionId);
			if (!candidate || candidate.type !== 'function') {
				throw new Error(
					`createImproperIntegralArea: secondFunctionId "${options.secondFunctionId}" is not a function element`
				);
			}
			secondFnEl = candidate;
			secondFnId = options.secondFunctionId;
		}

		const validateBoundRef = (param: ScalarParam, label: string): void => {
			if (!isScalarRef(param)) return;
			const refEl = this.elements.get(param.scalarRef);
			if (!refEl) {
				throw new Error(
					`createImproperIntegralArea: ${label} bound ref "${param.scalarRef}" does not exist`
				);
			}
			if (refEl.type !== 'scalar' && refEl.type !== 'slider') {
				throw new Error(
					`createImproperIntegralArea: ${label} bound ref "${param.scalarRef}" is not a scalar or slider`
				);
			}
		};
		validateBoundRef(lowerBound, 'lower');
		validateBoundRef(upperBound, 'upper');

		const signed = secondFnEl ? false : (options?.signed ?? true);

		// Working expression: f alone in V1/V2, h = f − g in V3.
		// `abs(...)` wrap added when signed=false so the substitution scheme
		// computes the unsigned area directly (no findRoots — there can be
		// infinitely many zeros on an infinite range).
		let differenceExpression: MathNode | undefined;
		let compiledDifference: CompiledFn | undefined;
		let workingExpression: MathNode = fnEl.expression;
		if (secondFnEl) {
			differenceExpression = subtract(fnEl.expression, secondFnEl.expression);
			try {
				compiledDifference = compile(differenceExpression);
			} catch (e) {
				throw new Error(
					`createImproperIntegralArea: failed to compile h = f − g — ${e instanceof Error ? e.message : ''}`
				);
			}
			workingExpression = differenceExpression;
		}

		const computeExpression: MathNode = signed ? workingExpression : mathAbs(workingExpression);

		const cachedDiscs = options?.discontinuities ?? null;
		const lowerCapture = lowerBound;
		const upperCapture = upperBound;
		const compute = (scalarValues: ReadonlyMap<string, number>): number => {
			const a = resolveScalarParam(lowerCapture, scalarValues);
			const b = resolveScalarParam(upperCapture, scalarValues);
			// Both bounds must reduce to a number (possibly ±Infinity).
			if (Number.isNaN(a) || Number.isNaN(b)) return NaN;

			// Consult discontinuity cache against the effective probe range
			// [min(a, T_max_neg), max(b, T_max_pos)] = [-PROBE_T_MAX, +PROBE_T_MAX]
			// extended only on the infinite side(s). A divergent inner singularity
			// makes the integral diverge.
			if (cachedDiscs) {
				const aEff = Number.isFinite(a) ? a : -PROBE_T_MAX;
				const bEff = Number.isFinite(b) ? b : PROBE_T_MAX;
				const ranged = classifyDiscontinuitiesForRange(cachedDiscs, aEff, bEff);
				if (ranged) {
					for (const rd of ranged) {
						if (rd.causesDivergence && rd.atBoundary === 'interior') return NaN;
					}
				}
			}

			// If both bounds happen to be finite (slider drag from ±Inf to a number),
			// fall back to numericIntegrate for that slider range.
			if (Number.isFinite(a) && Number.isFinite(b)) {
				const lo = Math.min(a, b);
				const hi = Math.max(a, b);
				const direction = a <= b ? 1 : -1;
				try {
					const v = numericIntegrate(computeExpression, 'x', lo, hi).value;
					return signed ? direction * v : v;
				} catch {
					return NaN;
				}
			}

			try {
				const r = improperIntegrate(computeExpression, 'x', a, b);
				return r.status === 'convergent' ? r.value : NaN;
			} catch {
				return NaN;
			}
		};

		const deps: string[] = [functionId];
		if (secondFnId && secondFnId !== functionId) deps.push(secondFnId);
		const scalarRefDeps: string[] = [];
		if (isScalarRef(lowerBound)) {
			deps.push(lowerBound.scalarRef);
			scalarRefDeps.push(lowerBound.scalarRef);
		}
		if (isScalarRef(upperBound) && !deps.includes(upperBound.scalarRef)) {
			deps.push(upperBound.scalarRef);
			scalarRefDeps.push(upperBound.scalarRef);
		}

		const areaId = this.generateId('iar');
		const scalarId = this.generateId('sca');

		const areaElement: GeoIntegralArea = {
			type: 'integralArea',
			id: areaId,
			functionId,
			lowerBound,
			upperBound,
			signed,
			antiderivative: null,
			compiledF: null,
			integrationStatus: 'approximate',
			_scalarId: scalarId,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: deps,
			...(secondFnId && {
				secondFunctionId: secondFnId,
				differenceExpression,
				compiledDifference
			})
		};

		const scalarElement: GeoScalar = {
			type: 'scalar',
			scalarKind: 'expression',
			id: scalarId,
			targetIds: [],
			compute,
			scalarDeps: scalarRefDeps,
			_visualAreaId: areaId,
			color: this.resolveColor(options),
			visible: false,
			label: undefined,
			style: this.resolveStyle(options),
			dependsOn: deps
		};

		this.beginTransaction();
		try {
			this.addElement(areaId, areaElement, deps);
			this.addElement(scalarId, scalarElement, deps);
			this.computePosition(areaId);
			this.computePosition(scalarId);
			this.commit();
		} catch (e) {
			this.undo_manager.discard();
			throw e;
		}

		return { areaId, scalarId };
	}

	// ─── Slider factories ───────────────────────────────────────

	createSlider(
		min: number,
		max: number,
		value: number,
		options?: ElementOptions & { step?: number }
	): string {
		const clamped = Math.max(min, Math.min(max, value));
		const id = this.generateId('sli');
		const element: GeoSlider = {
			type: 'slider',
			id,
			value: clamped,
			min,
			max,
			step: options?.step,
			color: this.resolveColor(options),
			visible: options?.visible ?? true,
			label: options?.label,
			style: this.resolveStyle(options),
			dependsOn: [] as const
		};
		this.addElement(id, element, []);
		this.scalarValues.set(id, clamped);
		return id;
	}

	moveSlider(id: string, newValue: number): void {
		const el = this.elements.get(id);
		if (!el || !isSlider(el)) {
			throw new Error(`moveSlider: "${id}" is not a slider`);
		}
		let clamped = Math.max(el.min, Math.min(el.max, newValue));
		if (el.step !== undefined && el.step > 0) {
			clamped = Math.round(clamped / el.step) * el.step;
			clamped = Math.max(el.min, Math.min(el.max, clamped));
		}
		const updated: GeoSlider = { ...el, value: clamped };
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
		this.scalarValues.set(id, clamped);
		this.graph.markDirty(id);
	}

	setLabelOffset(id: string, dx: number, dy: number): void {
		const el = this.elements.get(id);
		if (!el) throw new Error(`setLabelOffset: "${id}" does not exist`);
		const updated = { ...el, labelOffset: { dx, dy } } as GeoElement;
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
	}

	updateStyle(id: string, newStyle: Partial<GeoStyle>): void {
		const el = this.elements.get(id);
		if (!el) throw new Error(`updateStyle: "${id}" does not exist`);
		const mergedStyle = { ...el.style, ...newStyle };
		const updated = { ...el, style: mergedStyle } as GeoElement;
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
	}

	hideElement(id: string): void {
		const el = this.elements.get(id);
		if (!el) return;
		const updated = { ...el, visible: false, label: undefined } as GeoElement;
		this.elements.set(id, updated);
	}

	showElement(id: string, label?: string): void {
		const el = this.elements.get(id);
		if (!el) return;
		const updated = {
			...el,
			visible: true,
			...(label !== undefined ? { label } : {})
		} as GeoElement;
		this.elements.set(id, updated);
	}

	updateLabel(id: string, label: string): void {
		const el = this.elements.get(id);
		if (!el) throw new Error(`updateLabel: "${id}" does not exist`);
		const updated = { ...el, label } as GeoElement;
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
	}

	// ─── Access ─────────────────────────────────────────────────────

	getElementById(id: string): GeoElement | undefined {
		return this.elements.get(id);
	}

	getAllElements(): GeoElement[] {
		return [...this.elements.values()];
	}

	getElementsByType<T extends GeoElement['type']>(type: T): Extract<GeoElement, { type: T }>[] {
		return this.getAllElements().filter(
			(el): el is Extract<GeoElement, { type: T }> => el.type === type
		);
	}

	get size(): number {
		return this.elements.size;
	}

	recordTransformeOrigin(resultId: string, transformId: string, sourceId: string): void {
		this._transformeOrigins.set(resultId, { transformId, sourceId });
	}

	getTransformeOrigin(resultId: string): { transformId: string; sourceId: string } | undefined {
		return this._transformeOrigins.get(resultId);
	}

	getPosition(id: string): GeoPoint | null {
		return this.positions.get(id) ?? null;
	}

	/**
	 * Compute a locus curve for a given element and viewport.
	 * Called by the renderer on each draw cycle.
	 */
	computeLocusCurveForElement(id: string, viewport: Viewport): SampledCurve | null {
		const el = this.elements.get(id);
		if (!el || el.type !== 'locus') return null;
		return computeLocusCurve(
			el as GeoLocus,
			this.elements,
			this.positions,
			viewport,
			this.scalarValues
		);
	}

	getLineEquation(id: string): LineEquation | null {
		const el = this.elements.get(id);
		if (!el || el.type !== 'line') return null;

		const line = el as GeoLine;
		if (line.equation) return line.equation;

		const p1 = this.positions.get(line.point1Id);
		const p2 = this.positions.get(line.point2Id);
		if (!p1 || !p2) return null;

		const x1 = geoValueToMathNode(p1.x);
		const y1 = geoValueToMathNode(p1.y);
		const x2 = geoValueToMathNode(p2.x);
		const y2 = geoValueToMathNode(p2.y);

		const a = subtract(y2, y1);
		const b = subtract(x1, x2);
		const c = subtract(implicitMultiply(x2, y1), implicitMultiply(x1, y2));

		const terms: MathNode[] = [];
		if (!isZeroExpression(a)) terms.push(implicitMultiply(a, variable('x')));
		if (!isZeroExpression(b)) terms.push(implicitMultiply(b, variable('y')));
		if (!isZeroExpression(c)) terms.push(c);

		const lhs = terms.length === 0 ? mathNumber('0') : terms.reduce((acc, t) => add(acc, t));
		const expression = toCustom(relation('=', lhs, mathNumber('0')));

		return { a, b, c, expression };
	}

	// ─── Mutation ───────────────────────────────────────────────────

	movePoint(id: string, x: GeoValue, y: GeoValue): void {
		const el = this.elements.get(id);
		if (!el || !isFreePoint(el)) {
			throw new Error(`movePoint: "${id}" is not a free point`);
		}

		const newPosition: GeoPoint = { x, y };
		const updated: GeoFreePoint = { ...el, position: newPosition };
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
		this.positions.set(id, newPosition);
		this.graph.markDirty(id);
	}

	moveText(id: string, x: number, y: number): void {
		const el = this.elements.get(id);
		if (!el || (el.type !== 'text' && el.type !== 'mathText' && el.type !== 'richText')) {
			throw new Error(`moveText: "${id}" is not a text element`);
		}
		const textEl = el as GeoText | GeoMathText | GeoRichText;
		if (!textEl.position) {
			throw new Error(`moveText: "${id}" is not a free-positioned text`);
		}
		const updated: GeoText | GeoMathText | GeoRichText = { ...textEl, position: { x, y } };
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
	}

	moveImage(id: string, x: number, y: number): void {
		const el = this.elements.get(id);
		if (!el || el.type !== 'image') {
			throw new Error(`moveImage: "${id}" is not an image element`);
		}
		const imgEl = el as GeoImage;
		if (!imgEl.position) {
			throw new Error(`moveImage: "${id}" is not a free-positioned image`);
		}
		const updated: GeoImage = { ...imgEl, position: { x, y } };
		this.undo_manager.recordUpdate(id, el, updated);
		this.elements.set(id, updated);

		// Propagate to hidden center point so transformed images follow
		if (imgEl._centerPointId) {
			this.movePoint(imgEl._centerPointId, numeric(x), numeric(y));
		}
	}

	/** Attach a hidden center point to a free-positioned image (used by transforme()). */
	setImageCenterPoint(imageId: string, centerPointId: string): void {
		const el = this.elements.get(imageId);
		if (!el || el.type !== 'image') return;
		const updated: GeoImage = { ...(el as GeoImage), _centerPointId: centerPointId };
		this.elements.set(imageId, updated);
	}

	recompute(): void {
		const dirtyIds = this.graph.getDirtyInOrder();
		for (const id of dirtyIds) {
			this.computePosition(id);
		}
		// Accumulate trace points for any dirty trace elements
		for (const id of dirtyIds) {
			const el = this.elements.get(id);
			if (el && el.type === 'trace') {
				this.accumulateTracePoint(id, el.trackedPointId);
			}
		}
	}

	remove(id: string): string[] {
		if (!this.elements.has(id)) {
			throw new Error(`remove: "${id}" does not exist`);
		}
		const removedIds = this.graph.removeNode(id);
		for (const rid of removedIds) {
			const el = this.elements.get(rid);
			if (el) this.undo_manager.recordRemove(rid, el, this.positions.get(rid));
			this.elements.delete(rid);
			this.positions.delete(rid);
			this.scalarValues.delete(rid);
			this.tracePoints.delete(rid);
		}
		return removedIds;
	}

	// ─── Internal ───────────────────────────────────────────────────

	private recomputeTransformedConic(id: string, el: GeoQuadraticCurve): void {
		const recipe = el.transformRecipe!;
		const transformEl = this.elements.get(recipe.transformId);
		if (!transformEl || !isTransformation(transformEl)) return;

		const access: TransformAccessors = {
			getPosition: (pid) => this.getPosition(pid),
			getElementById: (eid) => this.elements.get(eid),
			getVectorComponents: (vid) => this.getVectorComponents(vid),
			getScalarValue: (sid) => this.getScalarValue(sid)
		};
		const invMatrix = buildInverseAffineMatrix(transformEl, access);
		const newCoeffs = transformConicCoefficients(recipe.sourceCoefficients, invMatrix);
		const newConic = classifyConic(...newCoeffs);

		// Replace element with updated coefficients and conic params
		this.elements.set(id, { ...el, coefficients: newCoeffs, conic: newConic });
	}

	private computePosition(id: string): void {
		const el = this.elements.get(id);
		if (!el) return;

		// Recompute transformed conic coefficients when transformation moves
		if (el.type === 'quadraticCurve' && el.transformRecipe) {
			this.recomputeTransformedConic(id, el);
		}

		const result = computeElementPosition(el, this.positions, this.elements, this.scalarValues);

		if (result.position) {
			this.positions.set(id, result.position);
		} else if (result.hasComputablePosition) {
			// Element should have a position but computation failed (e.g. parallel lines)
			this.positions.delete(id);
		}

		if (result.scalarValue !== undefined) {
			this.scalarValues.set(id, result.scalarValue);
		} else if (el.type === 'scalar' || el.type === 'slider') {
			this.scalarValues.delete(id);
		}
	}
}
