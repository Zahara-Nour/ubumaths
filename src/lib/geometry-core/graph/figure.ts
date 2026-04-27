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
	GeoMeasure,
	GeoCircleByRadius,
	GeoCircleByPoint,
	GeoArcByAngles,
	GeoArcByPoints,
	GeoPolygon,
	GeoFunction,
	GeoQuadraticCurve,
	GeoImplicitCurve,
	GeoPointOnCurve,
	GeoPointOnQuadraticCurve,
	GeoIntersectionLF,
	GeoIntersectionFF,
	GeoTangentLine,
	GeoTangentToQuadratic,
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
	isTransformation,
	isVector
} from '../types/elements';
import type { GeoValue } from '../types/geo-value';
import { geoValueToMathNode, numeric } from '../types/geo-value';
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
import {
	subtract,
	implicitMultiply,
	add,
	number as mathNumber,
	variable,
	relation
} from '$lib/mathAST/factory';
import { toCustom } from '$lib/mathAST/custom-generator';
import { isZeroExpression } from '$lib/mathAST/normal';
import { UndoManager } from './undo-redo';
import type { Delta } from './undo-redo';
import { computeElementPosition } from './compute-position';

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

export class Figure {
	private elements = new Map<string, GeoElement>();
	private positions = new Map<string, GeoPoint>();
	private graph = new DependencyGraph();
	private nextId = 1;
	readonly defaults: FigureDefaults;
	private measureValues = new Map<string, number>();
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
					added.add(id);
				} else {
					next.push([id, el]);
				}
			}
			if (next.length === remaining.length) break;
			remaining = next;
		}

		// 3. Apply updates (undo of movePoint).
		for (const [id, { after }] of delta.updated) {
			this.elements.set(id, after);
			if (after.type === 'freePoint') {
				this.positions.set(id, after.position);
			} else if (after.type === 'freeVector') {
				this.positions.set(id, { x: after.anchorX, y: after.anchorY });
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

	createCircleByRadius(centerId: string, radius: GeoValue, options?: ElementOptions): string {
		const id = this.generateId('circ');
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
			dependsOn: [centerId]
		};
		this.addElement(id, element, [centerId]);
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
		angle: GeoValue,
		options?: ElementOptions
	): string {
		const src = this.elements.get(sourceId);
		const ctr = this.elements.get(centerId);
		if (!src || !isPointElement(src))
			throw new Error(`createRotatedPoint: "${sourceId}" is not a point element`);
		if (!ctr || !isPointElement(ctr))
			throw new Error(`createRotatedPoint: "${centerId}" is not a point element`);

		const id = this.generateId('rot');
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
			dependsOn: [sourceId, centerId]
		};
		this.addElement(id, element, [sourceId, centerId]);
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
		factor: GeoValue,
		options?: ElementOptions
	): string {
		const src = this.elements.get(sourceId);
		const ctr = this.elements.get(centerId);
		if (!src || !isPointElement(src))
			throw new Error(`createDilatedPoint: "${sourceId}" is not a point element`);
		if (!ctr || !isPointElement(ctr))
			throw new Error(`createDilatedPoint: "${centerId}" is not a point element`);

		const id = this.generateId('dil');
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
			dependsOn: [sourceId, centerId]
		};
		this.addElement(id, element, [sourceId, centerId]);
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

	createRotation(centerId: string, angle: GeoValue, options?: ElementOptions): string {
		this.requirePoints('createRotation', centerId);
		const id = this.generateId('tRot');
		const element: GeoRotation = {
			type: 'rotation',
			id,
			centerId,
			angle,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: [centerId]
		};
		this.addElement(id, element, [centerId]);
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

	createHomothety(centerId: string, factor: GeoValue, options?: ElementOptions): string {
		this.requirePoints('createHomothety', centerId);
		const id = this.generateId('tHom');
		const element: GeoHomothety = {
			type: 'homothety',
			id,
			centerId,
			factor,
			color: DEFAULT_COLOR,
			visible: false,
			label: options?.label,
			dependsOn: [centerId]
		};
		this.addElement(id, element, [centerId]);
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
		angle: GeoValue,
		factor: GeoValue,
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
		radius: GeoValue,
		startAngle: GeoValue,
		endAngle: GeoValue,
		options?: ElementOptions
	): string {
		const id = this.generateId('arc');
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
			dependsOn: [centerId]
		};
		this.addElement(id, element, [centerId]);
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
			getVectorComponents: (id) => this.getVectorComponents(id)
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

	createMeasure(
		measureType: 'distance' | 'angle' | 'area',
		targetIds: string[],
		options?: ElementOptions & { format?: 'exact' | 'approx' | 'degrees' | 'radians' }
	): string {
		if (measureType === 'distance' && targetIds.length !== 2) {
			throw new Error('createMeasure: distance requires exactly 2 target points');
		}
		if (measureType === 'angle' && targetIds.length !== 3) {
			throw new Error('createMeasure: angle requires exactly 3 target points');
		}
		if (measureType === 'area' && targetIds.length < 3) {
			throw new Error('createMeasure: area requires at least 3 target points');
		}
		for (const tid of targetIds) {
			const el = this.elements.get(tid);
			if (!el || !isPointElement(el)) {
				throw new Error(`createMeasure: "${tid}" is not a point element`);
			}
		}

		const id = this.generateId('meas');
		const element: GeoMeasure = {
			type: 'measure',
			id,
			measureType,
			targetIds,
			format: options?.format ?? (measureType === 'angle' ? 'degrees' : 'approx'),
			color: this.resolveColor(options),
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: targetIds
		};
		this.addElement(id, element, targetIds);
		this.computePosition(id);
		return id;
	}

	getMeasureValue(id: string): number | undefined {
		return this.measureValues.get(id);
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

	recompute(): void {
		const dirtyIds = this.graph.getDirtyInOrder();
		for (const id of dirtyIds) {
			this.computePosition(id);
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
			this.measureValues.delete(rid);
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
			getVectorComponents: (vid) => this.getVectorComponents(vid)
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

		const result = computeElementPosition(el, this.positions, this.elements);

		if (result.position) {
			this.positions.set(id, result.position);
		} else if (result.hasComputablePosition) {
			// Element should have a position but computation failed (e.g. parallel lines)
			this.positions.delete(id);
		}

		if (result.measureValue !== undefined) {
			this.measureValues.set(id, result.measureValue);
		} else if (el.type === 'measure') {
			this.measureValues.delete(id);
		}
	}
}
