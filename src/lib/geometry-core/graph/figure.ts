/**
 * Figure - The main API for creating and managing a geometry figure.
 *
 * Wraps the DependencyGraph and a collection of GeoElements.
 * Provides factory methods, position access, movePoint, and recompute.
 */

import { DependencyGraph } from './dependency-graph';
import type {
	GeoElement,
	GeoFreePoint,
	GeoMidpoint,
	GeoIntersectionLL,
	GeoReflectedPoint,
	GeoSegment,
	GeoLine,
	GeoRay,
	GeoCircleByRadius,
	GeoCircleByPoint
} from '../types/elements';
import {
	isFreePoint,
	isMidpoint,
	isIntersectionLL,
	isReflectedPoint,
	isPointElement,
	isLineLike
} from '../types/elements';
import type { GeoValue } from '../types/geo-value';
import type { GeoPoint } from '../types/primitives';
import { geoAdd, geoDiv, geoFromNumber } from '../compute/geo-arithmetic';
import { intersectLL } from '../geometry/intersections';
import { reflectPoint } from '../geometry/transformations';

const DEFAULT_COLOR = '#1e40af';

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

	// Undo/redo
	private undoStack: Delta[] = [];
	private redoStack: Delta[] = [];
	private currentTransaction: Delta | null = null;

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

	createFreePoint(position: GeoPoint, options?: { label?: string; color?: string }): string {
		const id = this.generateId('pt');
		const element: GeoFreePoint = {
			type: 'freePoint',
			id,
			position,
			color: options?.color ?? DEFAULT_COLOR,
			visible: true,
			label: options?.label,
			dependsOn: [] as const
		};
		this.addElement(id, element, []);
		this.positions.set(id, position);
		return id;
	}

	createMidpoint(
		point1Id: string,
		point2Id: string,
		options?: { label?: string; color?: string }
	): string {
		const id = this.generateId('mid');
		const element: GeoMidpoint = {
			type: 'midpoint',
			id,
			point1Id,
			point2Id,
			color: options?.color ?? DEFAULT_COLOR,
			visible: true,
			label: options?.label,
			dependsOn: [point1Id, point2Id]
		};
		this.addElement(id, element, [point1Id, point2Id]);
		this.computePosition(id);
		return id;
	}

	createSegment(
		startId: string,
		endId: string,
		options?: { label?: string; color?: string }
	): string {
		const id = this.generateId('seg');
		const element: GeoSegment = {
			type: 'segment',
			id,
			startId,
			endId,
			color: options?.color ?? DEFAULT_COLOR,
			visible: true,
			label: options?.label,
			dependsOn: [startId, endId]
		};
		this.addElement(id, element, [startId, endId]);
		return id;
	}

	createLine(
		point1Id: string,
		point2Id: string,
		options?: { label?: string; color?: string }
	): string {
		const id = this.generateId('ln');
		const element: GeoLine = {
			type: 'line',
			id,
			point1Id,
			point2Id,
			color: options?.color ?? DEFAULT_COLOR,
			visible: true,
			label: options?.label,
			dependsOn: [point1Id, point2Id]
		};
		this.addElement(id, element, [point1Id, point2Id]);
		return id;
	}

	createRay(
		originId: string,
		throughId: string,
		options?: { label?: string; color?: string }
	): string {
		const id = this.generateId('ray');
		const element: GeoRay = {
			type: 'ray',
			id,
			originId,
			throughId,
			color: options?.color ?? DEFAULT_COLOR,
			visible: true,
			label: options?.label,
			dependsOn: [originId, throughId]
		};
		this.addElement(id, element, [originId, throughId]);
		return id;
	}

	createCircleByRadius(
		centerId: string,
		radius: GeoValue,
		options?: { label?: string; color?: string }
	): string {
		const id = this.generateId('circ');
		const element: GeoCircleByRadius = {
			type: 'circleByRadius',
			id,
			centerId,
			radius,
			color: options?.color ?? DEFAULT_COLOR,
			visible: true,
			label: options?.label,
			dependsOn: [centerId]
		};
		this.addElement(id, element, [centerId]);
		return id;
	}

	createCircleByPoint(
		centerId: string,
		edgePointId: string,
		options?: { label?: string; color?: string }
	): string {
		const id = this.generateId('circ');
		const element: GeoCircleByPoint = {
			type: 'circleByPoint',
			id,
			centerId,
			edgePointId,
			color: options?.color ?? DEFAULT_COLOR,
			visible: true,
			label: options?.label,
			dependsOn: [centerId, edgePointId]
		};
		this.addElement(id, element, [centerId, edgePointId]);
		return id;
	}

	createIntersectionLL(
		line1Id: string,
		line2Id: string,
		options?: { label?: string; color?: string }
	): string {
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
			color: options?.color ?? DEFAULT_COLOR,
			visible: true,
			label: options?.label,
			dependsOn: [line1Id, line2Id]
		};
		this.addElement(id, element, [line1Id, line2Id]);
		this.computePosition(id);
		return id;
	}

	createReflectedPoint(
		sourceId: string,
		centerId: string,
		options?: { label?: string; color?: string }
	): string {
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
			color: options?.color ?? DEFAULT_COLOR,
			visible: true,
			label: options?.label,
			dependsOn: [sourceId, centerId]
		};
		this.addElement(id, element, [sourceId, centerId]);
		this.computePosition(id);
		return id;
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
