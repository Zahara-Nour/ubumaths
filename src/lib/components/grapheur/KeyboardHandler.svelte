<script lang="ts">
	/**
	 * KeyboardHandler Component
	 *
	 * Handles keyboard shortcuts for the grapheur.
	 * Uses <svelte:window> to capture key events globally.
	 *
	 * Shortcuts:
	 * - +/= : Zoom in
	 * - - : Zoom out
	 * - Arrow keys : Pan
	 * - Escape : Reset viewport
	 * - G : Toggle grid
	 * - 0 : Center on origin
	 *
	 * @component
	 */

	import { grapheurStore } from '$lib/stores/grapheur.svelte';

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Pan factor as percentage of viewport (10%) */
	const PAN_FACTOR = 0.1;

	/** Zoom in factor (shrink viewport) */
	const ZOOM_IN_FACTOR = 0.8;

	/** Zoom out factor (expand viewport) */
	const ZOOM_OUT_FACTOR = 1.25;

	/** Throttle time in milliseconds for held keys */
	const THROTTLE_MS = 50;

	// ==========================================================================
	// State
	// ==========================================================================

	/** Last key event time for throttling */
	let lastKeyTime = $state(0);

	// ==========================================================================
	// Handlers
	// ==========================================================================

	/**
	 * Handle keydown events for shortcuts
	 */
	function handleKeydown(event: KeyboardEvent): void {
		// Ignore if user is typing in an input field
		const target = event.target as HTMLElement;
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.isContentEditable ||
			target.tagName === 'MATH-FIELD'
		) {
			return;
		}

		// Throttle rapid key presses
		const now = performance.now();
		if (now - lastKeyTime < THROTTLE_MS) {
			return;
		}

		const { viewportMetrics } = grapheurStore;
		let handled = false;

		switch (event.key) {
			case '+':
			case '=':
				grapheurStore.zoom(ZOOM_IN_FACTOR);
				handled = true;
				break;

			case '-':
				grapheurStore.zoom(ZOOM_OUT_FACTOR);
				handled = true;
				break;

			case 'ArrowLeft':
				grapheurStore.pan(-viewportMetrics.width * PAN_FACTOR, 0);
				handled = true;
				break;

			case 'ArrowRight':
				grapheurStore.pan(viewportMetrics.width * PAN_FACTOR, 0);
				handled = true;
				break;

			case 'ArrowUp':
				grapheurStore.pan(0, viewportMetrics.height * PAN_FACTOR);
				handled = true;
				break;

			case 'ArrowDown':
				grapheurStore.pan(0, -viewportMetrics.height * PAN_FACTOR);
				handled = true;
				break;

			case 'Escape':
				grapheurStore.resetViewport();
				handled = true;
				break;

			case 'g':
			case 'G':
				// Only toggle if no modifier keys
				if (!event.ctrlKey && !event.metaKey && !event.altKey) {
					grapheurStore.toggleGrid();
					handled = true;
				}
				break;

			case '0':
				// Center on origin (no modifier keys)
				if (!event.ctrlKey && !event.metaKey && !event.altKey) {
					const { width, height } = viewportMetrics;
					grapheurStore.setViewport({
						xMin: -width / 2,
						xMax: width / 2,
						yMin: -height / 2,
						yMax: height / 2
					});
					handled = true;
				}
				break;
		}

		if (handled) {
			event.preventDefault();
			lastKeyTime = now;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />
