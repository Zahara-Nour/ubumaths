/**
 * Construction - The main API for creating and managing a geometry construction.
 *
 * Wraps the DependencyGraph and a collection of GeoElements.
 * Provides factory methods, position access, movePoint, and recompute.
 */

import { DependencyGraph } from './dependency-graph';
import type {
	GeoElement,
	GeoFreePoint,
	GeoMidpoint,
	GeoSegment,
	GeoLine,
	GeoRay,
	GeoCircleByRadius,
	GeoCircleByPoint
} from '../types/elements';
import { isFreePoint, isMidpoint } from '../types/elements';
import type { GeoValue } from '../types/geo-value';
import type { GeoPoint } from '../types/primitives';
import { geoAdd, geoDiv } from '../compute/geo-arithmetic';
import { geoFromNumber } from '../compute/geo-arithmetic';

// =============================================================================
// ID generation
// =============================================================================

let nextId = 1;

function generateId(prefix: string): string {
	return `${prefix}_${nextId++}`;
}

/** Reset ID counter (for testing only). */
export function _resetIdCounter(): void {
	nextId = 1;
}

// =============================================================================
// Default style
// =============================================================================

const DEFAULT_COLOR = '#1e40af';

// =============================================================================
// Construction class
// =============================================================================

export class Construction {
	private elements = new Map<string, GeoElement>();
	private positions = new Map<string, GeoPoint>();
	private graph = new DependencyGraph();

	// ─── Factory methods ────────────────────────────────────────────

	createFreePoint(position: GeoPoint, options?: { label?: string; color?: string }): string {
		const id = generateId('pt');
		const element: GeoFreePoint = {
			type: 'freePoint',
			id,
			position,
			color: options?.color ?? DEFAULT_COLOR,
			visible: true,
			label: options?.label,
			dependsOn: [] as const
		};
		this.elements.set(id, element);
		this.positions.set(id, position);
		this.graph.addNode(id, []);
		return id;
	}

	createMidpoint(
		point1Id: string,
		point2Id: string,
		options?: { label?: string; color?: string }
	): string {
		const id = generateId('mid');
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
		this.elements.set(id, element);
		this.graph.addNode(id, [point1Id, point2Id]);
		this.computePosition(id);
		return id;
	}

	createSegment(
		startId: string,
		endId: string,
		options?: { label?: string; color?: string }
	): string {
		const id = generateId('seg');
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
		this.elements.set(id, element);
		this.graph.addNode(id, [startId, endId]);
		return id;
	}

	createLine(
		point1Id: string,
		point2Id: string,
		options?: { label?: string; color?: string }
	): string {
		const id = generateId('ln');
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
		this.elements.set(id, element);
		this.graph.addNode(id, [point1Id, point2Id]);
		return id;
	}

	createRay(
		originId: string,
		throughId: string,
		options?: { label?: string; color?: string }
	): string {
		const id = generateId('ray');
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
		this.elements.set(id, element);
		this.graph.addNode(id, [originId, throughId]);
		return id;
	}

	createCircleByRadius(
		centerId: string,
		radius: GeoValue,
		options?: { label?: string; color?: string }
	): string {
		const id = generateId('circ');
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
		this.elements.set(id, element);
		this.graph.addNode(id, [centerId]);
		return id;
	}

	createCircleByPoint(
		centerId: string,
		edgePointId: string,
		options?: { label?: string; color?: string }
	): string {
		const id = generateId('circ');
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
		this.elements.set(id, element);
		this.graph.addNode(id, [centerId, edgePointId]);
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
	 * Get the position of a point element. Returns null for non-point elements.
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
		this.elements.set(id, updated);
		this.positions.set(id, newPosition);
		this.graph.markDirty(id);
	}

	/**
	 * Recompute all dirty elements in topological order.
	 */
	recompute(): void {
		const dirtyIds = this.graph.getDirtyInOrder();
		for (const id of dirtyIds) {
			this.computePosition(id);
		}
	}

	/**
	 * Remove an element and cascade-delete its dependants.
	 */
	remove(id: string): string[] {
		if (!this.elements.has(id)) {
			throw new Error(`remove: "${id}" does not exist`);
		}
		const removedIds = this.graph.removeNode(id);
		for (const rid of removedIds) {
			this.elements.delete(rid);
			this.positions.delete(rid);
		}
		return removedIds;
	}

	// ─── Internal: compute position for a single element ────────────

	private computePosition(id: string): void {
		const el = this.elements.get(id);
		if (!el) return;

		if (isMidpoint(el)) {
			const p1 = this.positions.get(el.point1Id);
			const p2 = this.positions.get(el.point2Id);
			if (p1 && p2) {
				const two = geoFromNumber(2);
				const mx = geoDiv(geoAdd(p1.x, p2.x), two);
				const my = geoDiv(geoAdd(p1.y, p2.y), two);
				if (mx && my) {
					this.positions.set(id, { x: mx, y: my });
				}
			}
		}
		// Free points: position is stored directly, no compute needed.
		// Segments, lines, rays, circles: no position to compute (they reference point ids).
	}
}
