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
	GeoPointOnCurve,
	GeoTangentLine,
	type LineEquation
} from '../types/elements';
import {
	isFreePoint,
	isMidpoint,
	isIntersectionLL,
	isReflectedPoint,
	isRotatedPoint,
	isTranslatedPoint,
	isDilatedPoint,
	isReflectedOverLine,
	isAngleMark,
	isSegmentMark,
	isMeasure,
	isPointElement,
	isLineLike,
	isPointOnCurve
} from '../types/elements';
import type { GeoValue } from '../types/geo-value';
import { geoValueToMathNode, numeric } from '../types/geo-value';
import type { GeoPoint } from '../types/primitives';
import { geoAdd, geoSub, geoDiv, geoFromNumber } from '../compute/geo-arithmetic';
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
import { geoToNumber } from '../compute/to-number';
import { intersectLL } from '../geometry/intersections';
import {
	reflectPoint,
	rotate,
	translate,
	dilate,
	reflectOverLine
} from '../geometry/transformations';

const DEFAULT_COLOR = '#1e40af';

export interface FigureDefaults {
	readonly defaultColor?: string;
	readonly defaultStrokeWidth?: number;
	readonly defaultDash?: 'solid' | 'dashed' | 'dotted';
	readonly defaultPointShape?: 'dot' | 'circle' | 'cross' | 'square';
	readonly defaultPointSize?: number;
	readonly defaultOpacity?: number;
	// Note: fillColor/fillOpacity have no figure-level defaults; set per-element via style.
	/** Figure-level rendering mode: 'normal' (clean SVG), 'rough' (hand-drawn), 'mixed' (per-element). */
	readonly renderMode?: 'normal' | 'rough' | 'mixed';
	/** Default roughness for rough rendering (0..5, default 1). */
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

interface Delta {
	added: Map<string, GeoElement>;
	removed: Map<string, GeoElement>;
	updated: Map<string, { before: GeoElement; after: GeoElement }>;
	/** Positions of elements at the time they were removed (for undo of remove). */
	removedPositions: Map<string, GeoPoint>;
}

function createEmptyDelta(): Delta {
	return {
		added: new Map(),
		removed: new Map(),
		updated: new Map(),
		removedPositions: new Map()
	};
}

function invertDelta(delta: Delta): Delta {
	return {
		added: delta.removed,
		removed: delta.added,
		updated: new Map(
			[...delta.updated].map(([id, { before, after }]) => [id, { before: after, after: before }])
		),
		removedPositions: new Map(delta.removedPositions) // defensive copy
	};
}

export class Figure {
	private elements = new Map<string, GeoElement>();
	private positions = new Map<string, GeoPoint>();
	private graph = new DependencyGraph();
	private nextId = 1;
	readonly defaults: FigureDefaults;
	private measureValues = new Map<string, number>();

	// Undo/redo
	private undoStack: Delta[] = [];
	private redoStack: Delta[] = [];
	private currentTransaction: Delta | null = null;

	constructor(defaults?: FigureDefaults) {
		this.defaults = defaults ?? {};
	}

	private generateId(prefix: string): string {
		return `${prefix}_${this.nextId++}`;
	}

	// ─── Transactions ───────────────────────────────────────────────

	beginTransaction(): void {
		if (this.currentTransaction) {
			throw new Error('beginTransaction: a transaction is already in progress');
		}
		this.currentTransaction = createEmptyDelta();
	}

	commit(): void {
		if (!this.currentTransaction) {
			throw new Error('commit: no transaction in progress');
		}
		const delta = this.currentTransaction;
		this.currentTransaction = null;
		// Only push non-empty deltas
		if (delta.added.size > 0 || delta.removed.size > 0 || delta.updated.size > 0) {
			this.undoStack.push(delta);
			this.redoStack.length = 0; // new commit clears redo
		}
	}

	discard(): void {
		this.currentTransaction = null;
	}

	get canUndo(): boolean {
		return this.undoStack.length > 0;
	}

	get canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	undo(): void {
		const delta = this.undoStack.pop();
		if (!delta) return;
		this.applyDelta(invertDelta(delta));
		this.redoStack.push(delta);
	}

	redo(): void {
		const delta = this.redoStack.pop();
		if (!delta) return;
		this.applyDelta(delta);
		this.undoStack.push(delta);
	}

	private applyDelta(delta: Delta): void {
		// 1. Remove elements (undo of create).
		// Only call removeNode on roots (nodes whose parents are not also being removed).
		const toRemoveSet = new Set(delta.removed.keys());
		for (const id of toRemoveSet) {
			if (!this.graph.hasNode(id)) continue; // already cascade-deleted
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

		// 2. Re-add elements (undo of delete), in dependency order (parents first).
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
			}
		}

		// 4. Recompute: mark only affected elements dirty, not the entire figure.
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

	// ─── Recording helpers ──────────────────────────────────────────

	private recordAdd(id: string, element: GeoElement): void {
		if (!this.currentTransaction) return;
		this.currentTransaction.added.set(id, element);
	}

	private recordRemove(id: string, element: GeoElement): void {
		if (!this.currentTransaction) return;
		// If it was added in the same transaction, net effect is no-op
		if (this.currentTransaction.added.has(id)) {
			this.currentTransaction.added.delete(id);
			return;
		}
		this.currentTransaction.removed.set(id, element);
		const pos = this.positions.get(id);
		if (pos) {
			this.currentTransaction.removedPositions.set(id, pos);
		}
	}

	private recordUpdate(id: string, before: GeoElement, after: GeoElement): void {
		if (!this.currentTransaction) return;
		const existing = this.currentTransaction.updated.get(id);
		// Keep the original "before" if already updated in this transaction
		this.currentTransaction.updated.set(id, {
			before: existing?.before ?? before,
			after
		});
	}

	// ─── Factory methods ────────────────────────────────────────────

	/**
	 * Add an element to the construction and register it in the graph.
	 * If graph.addNode fails, the element is rolled back from the maps.
	 */
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
		this.recordAdd(id, element);
	}

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
		// Validate that both elements are line-like
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
			visible: true,
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
			visible: true,
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
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [sourceId, vectorStartId, vectorEndId]
		};
		this.addElement(id, element, [sourceId, vectorStartId, vectorEndId]);
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
			visible: true,
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
			visible: true,
			label: options?.label,
			labelOffset: options?.labelOffset,
			style: this.resolveStyle(options),
			dependsOn: [sourceId, linePoint1Id, linePoint2Id]
		};
		this.addElement(id, element, [sourceId, linePoint1Id, linePoint2Id]);
		this.computePosition(id);
		return id;
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
		// Store vertex position as the mark's position
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
		// Store midpoint position as the mark's position
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

	movePointOnCurve(id: string, newX: GeoValue): void {
		const el = this.elements.get(id);
		if (!el || !isPointOnCurve(el)) {
			throw new Error(`movePointOnCurve: "${id}" is not a pointOnCurve`);
		}

		const updated: GeoPointOnCurve = { ...el, x0: newX };
		this.recordUpdate(id, el, updated);
		this.elements.set(id, updated);

		// Recompute position (y from function)
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
		this.computeMeasureValue(id, element);
		return id;
	}

	getMeasureValue(id: string): number | undefined {
		return this.measureValues.get(id);
	}

	private computeMeasureValue(id: string, el: GeoMeasure): void {
		const positions = el.targetIds.map((tid) => this.positions.get(tid));
		if (positions.some((p) => !p)) {
			this.measureValues.delete(id);
			return;
		}

		if (el.measureType === 'distance') {
			const [a, b] = positions as [GeoPoint, GeoPoint];
			const dx = geoToNumber(a.x) - geoToNumber(b.x);
			const dy = geoToNumber(a.y) - geoToNumber(b.y);
			this.measureValues.set(id, Math.sqrt(dx * dx + dy * dy));
		} else if (el.measureType === 'angle') {
			const [p1, v, p2] = positions as [GeoPoint, GeoPoint, GeoPoint];
			const vax = geoToNumber(p1.x) - geoToNumber(v.x);
			const vay = geoToNumber(p1.y) - geoToNumber(v.y);
			const vbx = geoToNumber(p2.x) - geoToNumber(v.x);
			const vby = geoToNumber(p2.y) - geoToNumber(v.y);
			const dot = vax * vbx + vay * vby;
			const lenA = Math.sqrt(vax * vax + vay * vay);
			const lenB = Math.sqrt(vbx * vbx + vby * vby);
			if (lenA < 1e-15 || lenB < 1e-15) {
				this.measureValues.delete(id);
				return;
			}
			const cosAngle = Math.max(-1, Math.min(1, dot / (lenA * lenB)));
			const radians = Math.acos(cosAngle);
			this.measureValues.set(id, (radians * 180) / Math.PI);
		} else if (el.measureType === 'area') {
			// Shoelace formula
			const pts = positions as GeoPoint[];
			let sum = 0;
			const n = pts.length;
			for (let i = 0; i < n; i++) {
				const xi = geoToNumber(pts[i].x);
				const yi = geoToNumber(pts[i].y);
				const xn = geoToNumber(pts[(i + 1) % n].x);
				const yn = geoToNumber(pts[(i + 1) % n].y);
				sum += xi * yn - xn * yi;
			}
			this.measureValues.set(id, Math.abs(sum) / 2);
		}
	}

	setLabelOffset(id: string, dx: number, dy: number): void {
		const el = this.elements.get(id);
		if (!el) throw new Error(`setLabelOffset: "${id}" does not exist`);
		const updated = { ...el, labelOffset: { dx, dy } } as GeoElement;
		this.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
	}

	updateStyle(id: string, newStyle: Partial<GeoStyle>): void {
		const el = this.elements.get(id);
		if (!el) throw new Error(`updateStyle: "${id}" does not exist`);
		const mergedStyle = { ...el.style, ...newStyle };
		const updated = { ...el, style: mergedStyle } as GeoElement;
		this.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
	}

	updateLabel(id: string, label: string): void {
		const el = this.elements.get(id);
		if (!el) throw new Error(`updateLabel: "${id}" does not exist`);
		const updated = { ...el, label } as GeoElement;
		this.recordUpdate(id, el, updated);
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

	/**
	 * Get the cached position of a point element.
	 * Returns null if the element is not a point type or does not exist.
	 */
	getPosition(id: string): GeoPoint | null {
		return this.positions.get(id) ?? null;
	}

	/**
	 * Get the equation ax + by + c = 0 for a line element.
	 * If the line was created via courbe(), returns the stored equation.
	 * Otherwise, computes it dynamically from current point positions.
	 */
	getLineEquation(id: string): LineEquation | null {
		const el = this.elements.get(id);
		if (!el || el.type !== 'line') return null;

		const line = el as GeoLine;

		// If equation is stored (from courbe()), return it
		if (line.equation) return line.equation;

		// Compute from current point positions
		const p1 = this.positions.get(line.point1Id);
		const p2 = this.positions.get(line.point2Id);
		if (!p1 || !p2) return null;

		const x1 = geoValueToMathNode(p1.x);
		const y1 = geoValueToMathNode(p1.y);
		const x2 = geoValueToMathNode(p2.x);
		const y2 = geoValueToMathNode(p2.y);

		// a = y2 - y1, b = x1 - x2, c = x2*y1 - x1*y2
		const a = subtract(y2, y1);
		const b = subtract(x1, x2);
		const c = subtract(implicitMultiply(x2, y1), implicitMultiply(x1, y2));

		// Build expression string: a*x + b*y + c = 0 (using exact MathNode)
		const terms: MathNode[] = [];
		if (!isZeroExpression(a)) terms.push(implicitMultiply(a, variable('x')));
		if (!isZeroExpression(b)) terms.push(implicitMultiply(b, variable('y')));
		if (!isZeroExpression(c)) terms.push(c);

		const lhs = terms.length === 0 ? mathNumber('0') : terms.reduce((acc, t) => add(acc, t));
		const expression = toCustom(relation('=', lhs, mathNumber('0')));

		return { a, b, c, expression };
	}

	// ─── Mutation ───────────────────────────────────────────────────

	/**
	 * Move a free point to new coordinates. Marks dependants dirty.
	 * Call recompute() after to update dependent elements.
	 */
	movePoint(id: string, x: GeoValue, y: GeoValue): void {
		const el = this.elements.get(id);
		if (!el || !isFreePoint(el)) {
			throw new Error(`movePoint: "${id}" is not a free point`);
		}

		const newPosition: GeoPoint = { x, y };
		const updated: GeoFreePoint = { ...el, position: newPosition };
		this.recordUpdate(id, el, updated);
		this.elements.set(id, updated);
		this.positions.set(id, newPosition);
		this.graph.markDirty(id);
	}

	/** Recompute all dirty elements in topological order. */
	recompute(): void {
		const dirtyIds = this.graph.getDirtyInOrder();
		for (const id of dirtyIds) {
			this.computePosition(id);
		}
	}

	/** Remove an element and cascade-delete its dependants. */
	remove(id: string): string[] {
		if (!this.elements.has(id)) {
			throw new Error(`remove: "${id}" does not exist`);
		}
		// Record before deleting
		const removedIds = this.graph.removeNode(id);
		for (const rid of removedIds) {
			const el = this.elements.get(rid);
			if (el) this.recordRemove(rid, el);
			this.elements.delete(rid);
			this.positions.delete(rid);
			this.measureValues.delete(rid);
		}
		return removedIds;
	}

	// ─── Internal ───────────────────────────────────────────────────

	private computePosition(id: string): void {
		const el = this.elements.get(id);
		if (!el) return;

		if (isMidpoint(el)) {
			const p1 = this.positions.get(el.point1Id);
			const p2 = this.positions.get(el.point2Id);
			if (!p1 || !p2) return;

			const two = geoFromNumber(2);
			const mx = geoDiv(geoAdd(p1.x, p2.x), two);
			const my = geoDiv(geoAdd(p1.y, p2.y), two);
			if (mx === null || my === null) {
				throw new Error(`computePosition: unexpected null computing midpoint "${id}"`);
			}
			this.positions.set(id, { x: mx, y: my });
		} else if (isIntersectionLL(el)) {
			const result = this.computeIntersectionLL(el);
			if (result) {
				this.positions.set(id, result);
			} else {
				this.positions.delete(id); // no intersection (parallel lines)
			}
		} else if (isReflectedPoint(el)) {
			const source = this.positions.get(el.sourceId);
			const center = this.positions.get(el.centerId);
			if (source && center) {
				this.positions.set(id, reflectPoint(source, center));
			} else {
				this.positions.delete(id);
			}
		} else if (isRotatedPoint(el)) {
			const source = this.positions.get(el.sourceId);
			const center = this.positions.get(el.centerId);
			if (source && center) {
				this.positions.set(id, rotate(source, center, el.angle));
			} else {
				this.positions.delete(id);
			}
		} else if (isTranslatedPoint(el)) {
			const source = this.positions.get(el.sourceId);
			const vStart = this.positions.get(el.vectorStartId);
			const vEnd = this.positions.get(el.vectorEndId);
			if (source && vStart && vEnd) {
				const vector: GeoPoint = {
					x: geoSub(vEnd.x, vStart.x),
					y: geoSub(vEnd.y, vStart.y)
				};
				this.positions.set(id, translate(source, vector));
			} else {
				this.positions.delete(id);
			}
		} else if (isDilatedPoint(el)) {
			const source = this.positions.get(el.sourceId);
			const center = this.positions.get(el.centerId);
			if (source && center) {
				this.positions.set(id, dilate(source, center, el.factor));
			} else {
				this.positions.delete(id);
			}
		} else if (isReflectedOverLine(el)) {
			const source = this.positions.get(el.sourceId);
			const lp1 = this.positions.get(el.linePoint1Id);
			const lp2 = this.positions.get(el.linePoint2Id);
			if (source && lp1 && lp2) {
				const result = reflectOverLine(source, lp1, lp2);
				if (result) {
					this.positions.set(id, result);
				} else {
					this.positions.delete(id); // degenerate line
				}
			} else {
				this.positions.delete(id);
			}
		} else if (isSegmentMark(el)) {
			// Segment mark position = midpoint of start and end
			const p1 = this.positions.get(el.startId);
			const p2 = this.positions.get(el.endId);
			if (p1 && p2) {
				const two = geoFromNumber(2);
				const mx = geoDiv(geoAdd(p1.x, p2.x), two);
				const my = geoDiv(geoAdd(p1.y, p2.y), two);
				if (mx !== null && my !== null) {
					this.positions.set(id, { x: mx, y: my });
				} else {
					this.positions.delete(id);
				}
			} else {
				this.positions.delete(id);
			}
		} else if (isMeasure(el)) {
			this.computeMeasureValue(id, el);
		} else if (isAngleMark(el)) {
			// Angle mark position = vertex position (for hit-testing and dependency tracking)
			const vertexPos = this.positions.get(el.vertexId);
			if (vertexPos) {
				this.positions.set(id, vertexPos);
			} else {
				this.positions.delete(id);
			}
		} else if (isPointOnCurve(el)) {
			const fnEl = this.elements.get(el.functionId);
			if (fnEl && fnEl.type === 'function') {
				const xNum = geoToNumber(el.x0);
				const yNum = fnEl.compiledFn({ x: xNum });
				if (Number.isFinite(yNum)) {
					this.positions.set(id, { x: el.x0, y: numeric(yNum) });
				} else {
					this.positions.delete(id);
				}
			} else {
				this.positions.delete(id);
			}
		}
		// Free points: position stored directly in movePoint/createFreePoint.
		// Segments, lines, rays, circles: no position to compute.
	}

	/**
	 * Get the two defining points of a line-like element.
	 * Returns their positions, or null if not found.
	 */
	private getLineLikePoints(lineId: string): { p1: GeoPoint; p2: GeoPoint } | null {
		const el = this.elements.get(lineId);
		if (!el) return null;

		let id1: string;
		let id2: string;

		if (el.type === 'segment') {
			id1 = el.startId;
			id2 = el.endId;
		} else if (el.type === 'line') {
			id1 = el.point1Id;
			id2 = el.point2Id;
		} else if (el.type === 'ray') {
			id1 = el.originId;
			id2 = el.throughId;
		} else {
			return null;
		}

		const p1 = this.positions.get(id1);
		const p2 = this.positions.get(id2);
		if (!p1 || !p2) return null;
		return { p1, p2 };
	}

	private computeIntersectionLL(el: GeoIntersectionLL): GeoPoint | null {
		const line1 = this.getLineLikePoints(el.line1Id);
		const line2 = this.getLineLikePoints(el.line2Id);
		if (!line1 || !line2) return null;
		return intersectLL(line1.p1, line1.p2, line2.p1, line2.p2);
	}
}
