/**
 * Compass Instrument Renderer - SVG rendering for the geometric compass
 *
 * This module provides the renderer for the compass instrument used in
 * geometric constructions. The compass has two branches (fixed point and
 * drawing point) that can open/close and rotate to trace arcs.
 *
 * Design:
 * - Two branches connected at a pivot point (top)
 * - Fixed point (pointe seche) on the left branch
 * - Drawing point (mine/crayon) on the right branch
 * - Optional graduations on one branch for measuring
 * - Arc trace visualization during drawing
 *
 * Coordinate system:
 * - Origin (0,0) is at the pivot point (top of compass)
 * - The fixed point position depends on opening angle
 * - Rotation is applied around the fixed point when drawing
 *
 * @module constructions/instruments/compass
 */

import type { InstrumentRuntimeState } from '../types';
import type { InstrumentRenderer } from './base';
import { registerInstrumentRenderer } from './base';
import { createSvgElement, createGroup } from '../core/renderer';
import { DEFAULT_COMPASS_RADIUS } from '../constants';

// =============================================================================
// Compass Constants
// =============================================================================

/**
 * Compass dimensions in pixels
 */
const COMPASS_BRANCH_LENGTH = 150; // Length of each branch
const COMPASS_BRANCH_WIDTH = 8; // Width of the branch at the base
const COMPASS_TIP_WIDTH = 2; // Width at the tip (point)
const COMPASS_PIVOT_RADIUS = 6; // Radius of the pivot circle

/**
 * Default opening angle in degrees (angle between branches)
 * 30 degrees gives a nice visual default
 */
const DEFAULT_OPENING_ANGLE = 30;

/**
 * Compass visual styles
 */
const COMPASS_METAL_COLOR = '#6B7280'; // Gray metal color
const COMPASS_METAL_HIGHLIGHT = '#9CA3AF'; // Lighter highlight
const COMPASS_METAL_SHADOW = '#374151'; // Darker shadow
const COMPASS_PIVOT_COLOR = '#1F2937'; // Dark pivot
const COMPASS_TIP_COLOR = '#111827'; // Very dark for tips
const COMPASS_PENCIL_COLOR = '#2563EB'; // Blue for drawing tip

/**
 * Graduation styles
 */
const GRADUATION_COLOR = '#374151';
const GRADUATION_SPACING = 10; // Pixels between graduations

// =============================================================================
// Types
// =============================================================================

/**
 * Extended compass state with opening angle
 */
interface CompassExtendedState extends InstrumentRuntimeState {
	/** Opening angle between branches in degrees */
	openingAngle?: number;
	/** Whether the compass is currently drawing */
	drawing?: boolean;
	/** Current trace angle for drawing animation */
	traceAngle?: number;
}

// =============================================================================
// Compass Renderer Implementation
// =============================================================================

/**
 * Compass instrument renderer
 *
 * Creates and manages the SVG representation of a geometric compass.
 * The compass can open/close its branches and rotate to trace arcs.
 *
 * @example
 * ```typescript
 * // Create the compass SVG element
 * const compassElement = compassRenderer.createSvgElement();
 * svgContainer.appendChild(compassElement);
 *
 * // Update position and opening when state changes
 * compassRenderer.updateSvgElement(compassElement, {
 *   type: 'compass',
 *   x: 200,
 *   y: 300,
 *   rotation: 0,
 *   scale: 1,
 *   visible: true,
 *   compassRadius: 100
 * });
 * ```
 */
export const compassRenderer: InstrumentRenderer = {
	/**
	 * Create the complete SVG element for the compass
	 *
	 * The compass consists of:
	 * 1. A pivot point at the top
	 * 2. Left branch with fixed point (pointe seche)
	 * 3. Right branch with drawing point (mine)
	 * 4. Optional graduations on the left branch
	 *
	 * @returns SVG group element containing all compass components
	 */
	createSvgElement(): SVGElement {
		const group = createGroup('construction-compass');

		// Add CSS class for potential external styling
		group.setAttribute('class', 'construction-instrument compass');

		// Create branches group (will be transformed based on opening angle)
		const branchesGroup = createGroup('compass-branches');

		// Create left branch (fixed point)
		const leftBranch = createCompassBranch('left');
		leftBranch.setAttribute('data-branch', 'left');
		branchesGroup.appendChild(leftBranch);

		// Create right branch (drawing point)
		const rightBranch = createCompassBranch('right');
		rightBranch.setAttribute('data-branch', 'right');
		branchesGroup.appendChild(rightBranch);

		// Create graduations on left branch
		const graduations = createGraduations();
		graduations.setAttribute('data-graduations', 'true');
		branchesGroup.appendChild(graduations);

		group.appendChild(branchesGroup);

		// Create pivot point (rendered on top)
		const pivot = createPivot();
		group.appendChild(pivot);

		return group;
	},

	/**
	 * Update the SVG element based on current runtime state
	 *
	 * Applies position, rotation, visibility, opacity, and opening angle.
	 *
	 * @param element - The compass SVG group element
	 * @param state - Current instrument runtime state
	 */
	updateSvgElement(element: SVGElement, state: InstrumentRuntimeState): void {
		const extendedState = state as CompassExtendedState;

		// Calculate opening angle from compass radius
		// The radius determines how far apart the tips are
		const radius = state.compassRadius ?? DEFAULT_COMPASS_RADIUS;
		const openingAngle = extendedState.openingAngle ?? calculateOpeningAngle(radius);

		// Build transform string for position and rotation
		// Position is where the fixed point (left tip) is placed
		const transform = `translate(${state.x}, ${state.y}) rotate(${state.rotation})`;
		element.setAttribute('transform', transform);

		// Apply visibility
		element.setAttribute('visibility', state.visible ? 'visible' : 'hidden');

		// Apply opacity
		element.setAttribute('opacity', String(state.scale));

		// Update branch angles based on opening
		updateBranchAngles(element, openingAngle);
	},

	/**
	 * Get default state for the compass
	 *
	 * The compass is hidden by default and positioned at (200, 300).
	 *
	 * @returns Default instrument runtime state
	 */
	getDefaultState(): InstrumentRuntimeState {
		return {
			type: 'compass',
			x: 200,
			y: 300,
			rotation: 0,
			visible: false,
			scale: 1,
			compassRadius: DEFAULT_COMPASS_RADIUS
		};
	}
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate opening angle from desired radius
 *
 * Uses trigonometry: sin(angle/2) = radius / branchLength
 *
 * @param radius - Desired distance between fixed and drawing points
 * @returns Opening angle in degrees
 */
function calculateOpeningAngle(radius: number): number {
	// Clamp radius to valid range
	const maxRadius = COMPASS_BRANCH_LENGTH * 2 * 0.95; // Leave some margin
	const clampedRadius = Math.min(radius, maxRadius);

	// Calculate half-angle using law of cosines
	// For isoceles triangle: radius^2 = 2 * L^2 * (1 - cos(angle))
	// Therefore: cos(angle) = 1 - radius^2 / (2 * L^2)
	const L = COMPASS_BRANCH_LENGTH;
	const cosAngle = 1 - (clampedRadius * clampedRadius) / (2 * L * L);
	const clampedCos = Math.max(-1, Math.min(1, cosAngle));
	const angleRad = Math.acos(clampedCos);

	return (angleRad * 180) / Math.PI;
}

/**
 * Create a compass branch (either left or right)
 *
 * Each branch is a tapered shape with a pointed tip.
 *
 * @param side - 'left' for fixed point, 'right' for drawing point
 * @returns SVG group element for the branch
 */
function createCompassBranch(side: 'left' | 'right'): SVGGElement {
	const group = createGroup(`compass-branch-${side}`);

	// Branch body (tapered rectangle)
	const body = createSvgElement('path');

	// Create a tapered shape from pivot to tip
	const halfWidthTop = COMPASS_BRANCH_WIDTH / 2;
	const halfWidthBottom = COMPASS_TIP_WIDTH / 2;
	const length = COMPASS_BRANCH_LENGTH;

	// Path: start at top-left, go to top-right, down to bottom-right, to bottom-left, close
	const pathData = `
		M ${-halfWidthTop} 0
		L ${halfWidthTop} 0
		L ${halfWidthBottom} ${length}
		L ${-halfWidthBottom} ${length}
		Z
	`;

	body.setAttribute('d', pathData);
	body.setAttribute('fill', COMPASS_METAL_COLOR);
	body.setAttribute('stroke', COMPASS_METAL_SHADOW);
	body.setAttribute('stroke-width', '1');

	// Add highlight edge
	const highlight = createSvgElement('line');
	highlight.setAttribute('x1', String(-halfWidthTop + 1));
	highlight.setAttribute('y1', '5');
	highlight.setAttribute('x2', String(-halfWidthBottom + 0.5));
	highlight.setAttribute('y2', String(length - 10));
	highlight.setAttribute('stroke', COMPASS_METAL_HIGHLIGHT);
	highlight.setAttribute('stroke-width', '1');

	group.appendChild(body);
	group.appendChild(highlight);

	// Add tip
	const tip = createSvgElement('circle');
	tip.setAttribute('cx', '0');
	tip.setAttribute('cy', String(length));
	tip.setAttribute('r', side === 'left' ? '2' : '3');
	tip.setAttribute('fill', side === 'left' ? COMPASS_TIP_COLOR : COMPASS_PENCIL_COLOR);
	group.appendChild(tip);

	// For the right branch (drawing point), add a small pencil indicator
	if (side === 'right') {
		const pencilMark = createSvgElement('rect');
		pencilMark.setAttribute('x', '-2');
		pencilMark.setAttribute('y', String(length - 15));
		pencilMark.setAttribute('width', '4');
		pencilMark.setAttribute('height', '12');
		pencilMark.setAttribute('fill', COMPASS_PENCIL_COLOR);
		pencilMark.setAttribute('rx', '1');
		group.appendChild(pencilMark);
	}

	return group;
}

/**
 * Create the pivot point circle
 *
 * The pivot is where both branches connect at the top.
 *
 * @returns SVG group element for the pivot
 */
function createPivot(): SVGGElement {
	const group = createGroup('compass-pivot');

	// Outer ring
	const outer = createSvgElement('circle');
	outer.setAttribute('cx', '0');
	outer.setAttribute('cy', '0');
	outer.setAttribute('r', String(COMPASS_PIVOT_RADIUS));
	outer.setAttribute('fill', COMPASS_PIVOT_COLOR);
	outer.setAttribute('stroke', COMPASS_METAL_SHADOW);
	outer.setAttribute('stroke-width', '1');

	// Inner highlight
	const inner = createSvgElement('circle');
	inner.setAttribute('cx', '-1');
	inner.setAttribute('cy', '-1');
	inner.setAttribute('r', String(COMPASS_PIVOT_RADIUS - 3));
	inner.setAttribute('fill', COMPASS_METAL_HIGHLIGHT);
	inner.setAttribute('opacity', '0.3');

	// Center screw
	const screw = createSvgElement('circle');
	screw.setAttribute('cx', '0');
	screw.setAttribute('cy', '0');
	screw.setAttribute('r', '2');
	screw.setAttribute('fill', COMPASS_METAL_SHADOW);

	group.appendChild(outer);
	group.appendChild(inner);
	group.appendChild(screw);

	return group;
}

/**
 * Create graduations on the compass branch
 *
 * Small tick marks to help measure the opening.
 *
 * @returns SVG group element for graduations
 */
function createGraduations(): SVGGElement {
	const group = createGroup('compass-graduations');

	// Add graduations along the left branch (will be rotated with it)
	const numGraduations = Math.floor((COMPASS_BRANCH_LENGTH - 20) / GRADUATION_SPACING);

	for (let i = 1; i <= numGraduations; i++) {
		const y = 15 + i * GRADUATION_SPACING;
		const isMajor = i % 5 === 0;

		const tick = createSvgElement('line');
		tick.setAttribute('x1', String(COMPASS_BRANCH_WIDTH / 2 + 1));
		tick.setAttribute('y1', String(y));
		tick.setAttribute('x2', String(COMPASS_BRANCH_WIDTH / 2 + (isMajor ? 6 : 3)));
		tick.setAttribute('y2', String(y));
		tick.setAttribute('stroke', GRADUATION_COLOR);
		tick.setAttribute('stroke-width', isMajor ? '1.5' : '1');

		group.appendChild(tick);
	}

	return group;
}

/**
 * Update the rotation of compass branches based on opening angle
 *
 * @param element - The compass SVG group element
 * @param openingAngle - Angle between branches in degrees
 */
function updateBranchAngles(element: SVGElement, openingAngle: number): void {
	const halfAngle = openingAngle / 2;

	// Find the branch elements
	const leftBranch = element.querySelector('[data-branch="left"]');
	const rightBranch = element.querySelector('[data-branch="right"]');
	const graduations = element.querySelector('[data-graduations="true"]');

	if (leftBranch) {
		// Left branch rotates counterclockwise (negative angle)
		leftBranch.setAttribute('transform', `rotate(${-halfAngle})`);
	}

	if (rightBranch) {
		// Right branch rotates clockwise (positive angle)
		rightBranch.setAttribute('transform', `rotate(${halfAngle})`);
	}

	if (graduations) {
		// Graduations follow the left branch
		graduations.setAttribute('transform', `rotate(${-halfAngle})`);
	}
}

/**
 * Calculate the position of the drawing tip relative to fixed point
 *
 * This is useful for animations and drawing operations.
 *
 * @param openingAngle - Angle between branches in degrees
 * @param compassRotation - Overall rotation of the compass in degrees
 * @returns Position offset {dx, dy} from fixed point to drawing point
 */
export function calculateDrawingTipOffset(
	openingAngle: number,
	compassRotation: number = 0
): { dx: number; dy: number } {
	const halfAngle = (openingAngle / 2) * (Math.PI / 180);
	const rotation = compassRotation * (Math.PI / 180);

	// Fixed point is at angle -halfAngle from vertical
	const fixedAngle = Math.PI / 2 + halfAngle + rotation;
	// Drawing point is at angle +halfAngle from vertical
	const drawAngle = Math.PI / 2 - halfAngle + rotation;

	// Calculate positions
	const fixedX = COMPASS_BRANCH_LENGTH * Math.cos(fixedAngle);
	const fixedY = COMPASS_BRANCH_LENGTH * Math.sin(fixedAngle);
	const drawX = COMPASS_BRANCH_LENGTH * Math.cos(drawAngle);
	const drawY = COMPASS_BRANCH_LENGTH * Math.sin(drawAngle);

	return {
		dx: drawX - fixedX,
		dy: drawY - fixedY
	};
}

/**
 * Calculate the radius (distance between tips) from opening angle
 *
 * @param openingAngle - Angle between branches in degrees
 * @returns Distance between the two tips in pixels
 */
export function calculateRadiusFromAngle(openingAngle: number): number {
	const angleRad = (openingAngle * Math.PI) / 180;
	// Using law of cosines: c^2 = a^2 + b^2 - 2ab*cos(C)
	// For isoceles: radius^2 = 2 * L^2 * (1 - cos(angle))
	const L = COMPASS_BRANCH_LENGTH;
	return Math.sqrt(2 * L * L * (1 - Math.cos(angleRad)));
}

// =============================================================================
// Auto-registration
// =============================================================================

// Register the compass renderer when this module is imported
registerInstrumentRenderer('compass', compassRenderer);
