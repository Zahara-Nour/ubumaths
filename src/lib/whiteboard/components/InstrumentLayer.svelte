<script lang="ts">
	/**
	 * InstrumentLayer - SVG layer for educational instruments
	 *
	 * Renders ruler, protractor, and set square instruments with
	 * drag-to-move and rotate functionality.
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type { InstrumentType } from '../types/document';

	// Import existing instrument components
	import Ruler from '$lib/constructions/components/instruments/Ruler.svelte';
	import Protractor from '$lib/constructions/components/instruments/Protractor.svelte';
	import SetSquare from '$lib/constructions/components/instruments/SetSquare.svelte';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Scale factor for coordinate transformation */
		scale?: number;
	}

	let { scale = 1 }: Props = $props();

	// ==========================================================================
	// Derived State
	// ==========================================================================

	let instruments = $derived(whiteboardStore.instruments);

	// ==========================================================================
	// Drag State
	// ==========================================================================

	let dragState = $state<{
		type: InstrumentType;
		mode: 'move' | 'rotate';
		startPointerX: number;
		startPointerY: number;
		startInstrumentX: number;
		startInstrumentY: number;
		startRotation: number;
		/** For rotation: initial angle from center to pointer */
		startAngle: number;
	} | null>(null);

	// ==========================================================================
	// Pointer Handlers
	// ==========================================================================

	function handlePointerDown(e: PointerEvent, type: InstrumentType, mode: 'move' | 'rotate') {
		if (!instruments) return;

		e.preventDefault();
		e.stopPropagation();

		const inst = instruments[type];
		const target = e.currentTarget as SVGElement;

		// Try to capture pointer with error handling
		try {
			target.setPointerCapture(e.pointerId);
		} catch (error) {
			console.warn('[InstrumentLayer] Failed to capture pointer:', error);
			return;
		}

		// Calculate initial angle for rotation mode
		const pointerX = e.clientX / scale;
		const pointerY = e.clientY / scale;
		const startAngle = mode === 'rotate' ? Math.atan2(pointerY - inst.y, pointerX - inst.x) : 0;

		dragState = {
			type,
			mode,
			startPointerX: e.clientX,
			startPointerY: e.clientY,
			startInstrumentX: inst.x,
			startInstrumentY: inst.y,
			startRotation: inst.rotation,
			startAngle
		};
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragState || !instruments) return;

		const deltaX = (e.clientX - dragState.startPointerX) / scale;
		const deltaY = (e.clientY - dragState.startPointerY) / scale;

		if (dragState.mode === 'move') {
			const newX = dragState.startInstrumentX + deltaX;
			const newY = dragState.startInstrumentY + deltaY;
			whiteboardStore.updateInstrumentPosition(dragState.type, newX, newY);
		} else if (dragState.mode === 'rotate') {
			// Calculate current pointer position in canvas coordinates
			const currentPointerX = e.clientX / scale;
			const currentPointerY = e.clientY / scale;

			// Get instrument center (position at drag start)
			const centerX = dragState.startInstrumentX;
			const centerY = dragState.startInstrumentY;

			// Calculate current angle from center to pointer
			const currentAngle = Math.atan2(currentPointerY - centerY, currentPointerX - centerX);

			// Calculate angle delta from start angle
			const angleDelta = ((currentAngle - dragState.startAngle) * 180) / Math.PI;

			const newRotation = dragState.startRotation + angleDelta;
			whiteboardStore.updateInstrumentRotation(dragState.type, newRotation);
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (dragState) {
			const target = e.currentTarget as SVGElement;
			try {
				target.releasePointerCapture(e.pointerId);
			} catch {
				// Ignore if capture already released
			}
		}
		dragState = null;
	}

	// ==========================================================================
	// Rotation Handle Position Calculation
	// ==========================================================================

	/** Rotation handle positions in instrument-local coordinates (px) */
	const ROTATION_HANDLE_POSITIONS: Record<InstrumentType, { x: number; y: number }> = {
		ruler: { x: 450, y: 28 }, // End of 15cm ruler
		protractor: { x: 156, y: 0 }, // Right edge
		setSquare: { x: 131, y: 0 } // Bottom-right corner
	};

	function getRotationHandlePosition(type: InstrumentType): { x: number; y: number } {
		return ROTATION_HANDLE_POSITIONS[type];
	}
</script>

<!-- Instrument Layer SVG Group -->
<g
	class="instrument-layer"
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerUp}
>
	{#if instruments}
		<!-- Ruler -->
		{#if instruments.ruler.visible}
			<g class="instrument-wrapper ruler-wrapper">
				<!-- Move handle (main body) -->
				<g
					class="move-handle"
					style="cursor: move;"
					onpointerdown={(e) => handlePointerDown(e, 'ruler', 'move')}
					role="button"
					tabindex="0"
					aria-label="Deplacer la regle"
				>
					<Ruler
						x={instruments.ruler.x}
						y={instruments.ruler.y}
						rotation={instruments.ruler.rotation}
						visible={true}
					/>
				</g>
				<!-- Rotation handle -->
				<g
					class="rotate-handle"
					style="cursor: grab;"
					transform="translate({instruments.ruler.x}, {instruments.ruler.y}) rotate({instruments
						.ruler.rotation})"
					onpointerdown={(e) => handlePointerDown(e, 'ruler', 'rotate')}
					role="button"
					tabindex="0"
					aria-label="Pivoter la regle"
				>
					{@const handle = getRotationHandlePosition('ruler')}
					<circle
						cx={handle.x}
						cy={handle.y}
						r="10"
						fill="var(--color-primary, #3b82f6)"
						fill-opacity="0.8"
						stroke="white"
						stroke-width="2"
					/>
					<text
						x={handle.x}
						y={handle.y + 4}
						text-anchor="middle"
						fill="white"
						font-size="12"
						pointer-events="none"
					>
						R
					</text>
				</g>
			</g>
		{/if}

		<!-- Protractor -->
		{#if instruments.protractor.visible}
			<g class="instrument-wrapper protractor-wrapper">
				<!-- Move handle (main body) -->
				<g
					class="move-handle"
					style="cursor: move;"
					onpointerdown={(e) => handlePointerDown(e, 'protractor', 'move')}
					role="button"
					tabindex="0"
					aria-label="Deplacer le rapporteur"
				>
					<Protractor
						x={instruments.protractor.x}
						y={instruments.protractor.y}
						rotation={instruments.protractor.rotation}
						visible={true}
					/>
				</g>
				<!-- Rotation handle -->
				<g
					class="rotate-handle"
					style="cursor: grab;"
					transform="translate({instruments.protractor.x}, {instruments.protractor
						.y}) rotate({instruments.protractor.rotation})"
					onpointerdown={(e) => handlePointerDown(e, 'protractor', 'rotate')}
					role="button"
					tabindex="0"
					aria-label="Pivoter le rapporteur"
				>
					{@const handle = getRotationHandlePosition('protractor')}
					<circle
						cx={handle.x}
						cy={handle.y}
						r="10"
						fill="var(--color-primary, #3b82f6)"
						fill-opacity="0.8"
						stroke="white"
						stroke-width="2"
					/>
					<text
						x={handle.x}
						y={handle.y + 4}
						text-anchor="middle"
						fill="white"
						font-size="12"
						pointer-events="none"
					>
						R
					</text>
				</g>
			</g>
		{/if}

		<!-- SetSquare -->
		{#if instruments.setSquare.visible}
			<g class="instrument-wrapper setSquare-wrapper">
				<!-- Move handle (main body) -->
				<g
					class="move-handle"
					style="cursor: move;"
					onpointerdown={(e) => handlePointerDown(e, 'setSquare', 'move')}
					role="button"
					tabindex="0"
					aria-label="Deplacer l'equerre"
				>
					<SetSquare
						x={instruments.setSquare.x}
						y={instruments.setSquare.y}
						rotation={instruments.setSquare.rotation}
						visible={true}
					/>
				</g>
				<!-- Rotation handle -->
				<g
					class="rotate-handle"
					style="cursor: grab;"
					transform="translate({instruments.setSquare.x}, {instruments.setSquare
						.y}) rotate({instruments.setSquare.rotation})"
					onpointerdown={(e) => handlePointerDown(e, 'setSquare', 'rotate')}
					role="button"
					tabindex="0"
					aria-label="Pivoter l'equerre"
				>
					{@const handle = getRotationHandlePosition('setSquare')}
					<circle
						cx={handle.x}
						cy={handle.y}
						r="10"
						fill="var(--color-primary, #3b82f6)"
						fill-opacity="0.8"
						stroke="white"
						stroke-width="2"
					/>
					<text
						x={handle.x}
						y={handle.y + 4}
						text-anchor="middle"
						fill="white"
						font-size="12"
						pointer-events="none"
					>
						R
					</text>
				</g>
			</g>
		{/if}
	{/if}
</g>
