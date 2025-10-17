<!--
	MathGraphFullscreen Component
	==============================
	Wrapper component for MathGraph32 figures with fullscreen capabilities.

	Features:
	- Fullscreen toggle button
	- Keyboard shortcuts (F key or F11 to toggle, Escape to exit)
	- Automatic canvas resizing when entering/exiting fullscreen
	- CSS transform scaling to visually resize figures (MathGraph32 coordinates are fixed)
	- Maintains exact original state during transitions
	- Works with both Player and Editor modes

	How it works:
	- MathGraph32 figures have fixed internal coordinates that cannot be changed
	- When entering fullscreen, the SVG wrapper is resized and CSS transform: scale() is applied
	- When exiting fullscreen, the original SVG size and transform are restored
	- This ensures pixel-perfect restoration without modifying the figure data

	Usage:
	```svelte
	<MathGraphFullscreen bind:container={canvasRef}>
		<Button onclick={createFigure}>Create Figure</Button>
	</MathGraphFullscreen>
	```
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { MathGraphService } from '$lib/services/mathgraph-api';
	import { cn } from '$lib/utils';
	import { Maximize2, Minimize2 } from 'lucide-svelte';

	interface Props {
		container?: HTMLElement;
		showButton?: boolean;
		buttonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
		onFullscreenChange?: (isFullscreen: boolean) => void;
		children?: any;
	}

	let {
		container = $bindable(),
		showButton = true,
		buttonPosition = 'bottom-right',
		onFullscreenChange,
		children
	}: Props = $props();

	// Fullscreen state
	let isFullscreen = $state(false);
	let wrapperElement: HTMLElement;
	let service: MathGraphService;
	let originalWidth = 0;
	let originalHeight = 0;
	let originalTransform = '';
	let fullscreenListener: ((e: Event) => void) | null = null;
	let resizePending = false;

	onMount(() => {
		service = MathGraphService.getInstance();

		// Keyboard shortcuts
		const handleKeydown = (e: KeyboardEvent) => {
			// F key or F11 to toggle fullscreen
			if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
				e.preventDefault();
				toggleFullscreen();
			}
			// Escape to exit fullscreen
			if (e.key === 'Escape' && isFullscreen) {
				e.preventDefault();
				exitFullscreen();
			}
		};

		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
			if (fullscreenListener) {
				document.removeEventListener('fullscreenchange', fullscreenListener);
			}
		};
	});

	async function toggleFullscreen() {
		try {
			if (isFullscreen) {
				await exitFullscreen();
			} else {
				await enterFullscreen();
			}
		} catch (error) {
			console.error('Failed to toggle fullscreen:', error);
		}
	}

	/**
	 * Enters fullscreen mode and sets up resize handling.
	 *
	 * This function:
	 * 1. Stores the original SVG dimensions and transform state
	 * 2. Sets up a fullscreen change listener for enter/exit events
	 * 3. Requests fullscreen on the wrapper element
	 *
	 * The listener handles both entering and exiting fullscreen by calling
	 * resizeCanvas() with appropriate dimensions.
	 */
	async function enterFullscreen() {
		if (!wrapperElement || !container) return;

		// Store original SVG state before entering fullscreen
		// This allows us to restore the exact original state when exiting
		const svg = container.querySelector('svg');
		if (svg) {
			originalWidth = parseInt(svg.getAttribute('width') || '800');
			originalHeight = parseInt(svg.getAttribute('height') || '600');
			const svgElement = svg as unknown as HTMLElement;
			originalTransform = svgElement.style.transform || 'none';
		}

		// Set up fullscreen change listener for both enter and exit events
		fullscreenListener = () => {
			const isNowFullscreen = document.fullscreenElement === wrapperElement;

			// Prevent duplicate resize operations
			if (resizePending) return;

			isFullscreen = isNowFullscreen;
			onFullscreenChange?.(isNowFullscreen);

			if (isNowFullscreen) {
				// Entering fullscreen
				resizePending = true;
				// Wait for browser to finish fullscreen transition
				// Use double RAF to ensure layout is complete
				requestAnimationFrame(() => {
					requestAnimationFrame(async () => {
						// Use screen dimensions for true fullscreen size
						// Note: window.innerWidth/Height can be constrained by browser chrome
						const width = screen.width;
						const height = screen.height;

						await resizeCanvas(width, height);
						resizePending = false;
					});
				});
			} else {
				// Exiting fullscreen - restore original dimensions
				resizePending = true;
				requestAnimationFrame(async () => {
					if (originalWidth > 0 && originalHeight > 0) {
						await resizeCanvas(originalWidth, originalHeight);
					}
					resizePending = false;
				});
			}
		};

		document.addEventListener('fullscreenchange', fullscreenListener);

		// Request fullscreen on the wrapper element
		await wrapperElement.requestFullscreen();
	}

	/**
	 * Resizes the MathGraph canvas wrapper and applies CSS transform to scale the figure.
	 *
	 * IMPORTANT: MathGraph32 figures have fixed internal coordinates that cannot be resized.
	 * This function uses CSS transform: scale() to visually scale the figure without modifying
	 * the internal MathGraph32 coordinate system.
	 *
	 * Strategy:
	 * 1. Resize container and SVG wrapper to target dimensions
	 * 2. Get MathGraph32 content bounds (which are fixed and never change)
	 * 3. Calculate scale factor to fit content in wrapper
	 * 4. Apply CSS transform to visually scale the figure
	 * 5. Restore original transform when exiting fullscreen
	 *
	 * @param width - Target width in pixels
	 * @param height - Target height in pixels
	 */
	async function resizeCanvas(width: number, height: number) {
		if (!container) return;

		// Step 1: Resize the container div
		// MathGraph32 may read dimensions from the container
		container.style.width = `${width}px`;
		container.style.height = `${height}px`;

		// Also resize any child wrapper divs
		const mtgCanvas = container.querySelector('#mtg-canvas, [id^="mtg-"]') as HTMLElement;
		if (mtgCanvas) {
			mtgCanvas.style.width = `${width}px`;
			mtgCanvas.style.height = `${height}px`;
		}

		// Step 2: Find and resize the SVG element
		const svg = container.querySelector('svg');
		if (!svg) {
			console.warn('MathGraph SVG element not found in container');
			return;
		}

		const svgElement = svg as unknown as HTMLElement;

		// Update SVG dimensions (wrapper only, not content)
		svg.setAttribute('width', width.toString());
		svg.setAttribute('height', height.toString());
		svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

		// Set inline styles for consistent sizing
		svgElement.style.width = `${width}px`;
		svgElement.style.height = `${height}px`;
		svgElement.style.maxWidth = `${width}px`;
		svgElement.style.maxHeight = `${height}px`;

		// Step 3: Get MathGraph32 content bounds
		// Note: getFigDim() returns the bounding box of the figure content, not canvas size
		// These bounds are fixed and baked into the figure data - they never change
		const svgId = svg.getAttribute('id');
		let contentBounds = [width, height];

		if (svgId) {
			const app = service.getApp(svgId) as any;
			if (app && typeof app.getFigDim === 'function') {
				contentBounds = app.getFigDim();
			}
		}

		// Step 4: Calculate scale factor to fit content in wrapper
		// Use min() to maintain aspect ratio and ensure content fits
		const scaleX = width / (contentBounds[0] || width);
		const scaleY = height / (contentBounds[1] || height);
		const scale = Math.min(scaleX, scaleY);

		// Step 5: Apply CSS transform to visually scale the figure
		// This is the ONLY way to "resize" MathGraph32 figures since their
		// internal coordinates are fixed and cannot be changed
		svgElement.style.transformOrigin = 'top left';

		// Check if we're exiting fullscreen (restoring to original size)
		if (width === originalWidth && height === originalHeight) {
			// Restore the exact original transform (may be 'none' or a previous scale)
			svgElement.style.transform = originalTransform === 'none' ? '' : originalTransform;
		} else {
			// Scale to fit the new size (usually when entering fullscreen)
			svgElement.style.transform = `scale(${scale})`;
		}
	}

	async function exitFullscreen() {
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
			}
		} catch (error) {
			console.error('Failed to exit fullscreen:', error);
		}
	}

	// Get button position classes
	function getButtonPositionClasses(): string {
		const baseClasses = 'absolute z-10';
		switch (buttonPosition) {
			case 'top-right':
				return `${baseClasses} right-2 top-2`;
			case 'top-left':
				return `${baseClasses} left-2 top-2`;
			case 'bottom-right':
				return `${baseClasses} bottom-2 right-2`;
			case 'bottom-left':
				return `${baseClasses} bottom-2 left-2`;
			default:
				return `${baseClasses} right-2 top-2`;
		}
	}
</script>

<!-- Fullscreen Wrapper -->
<div
	bind:this={wrapperElement}
	class={cn(
		'mathgraph-fullscreen-wrapper relative',
		isFullscreen ? 'bg-background' : ''
	)}
>
	<!-- Fullscreen Toggle Button -->
	{#if showButton}
		<button
			onclick={toggleFullscreen}
			class={cn(
				getButtonPositionClasses(),
				'rounded-md bg-primary px-3 py-2 text-primary-foreground shadow-lg transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
			)}
			title={isFullscreen ? 'Quitter le plein écran (F ou Échap)' : 'Passer en plein écran (F ou F11)'}
			aria-label={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
		>
			{#if isFullscreen}
				<Minimize2 class="h-5 w-5" />
			{:else}
				<Maximize2 class="h-5 w-5" />
			{/if}
		</button>
	{/if}

	<!-- Canvas Container -->
	<div
		bind:this={container}
		class="mathgraph-canvas-container"
	>
		{@render children?.()}
	</div>
</div>

<style>
	/* Normal state */
	.mathgraph-fullscreen-wrapper {
		position: relative;
	}

	.mathgraph-canvas-container {
		width: 100%;
		height: 100%;
		position: relative;
	}

	/* Fullscreen-specific styles */
	.mathgraph-fullscreen-wrapper:fullscreen {
		width: 100vw !important;
		height: 100vh !important;
		padding: 0 !important;
		margin: 0 !important;
		display: flex !important;
		flex-direction: column !important;
		align-items: stretch !important;
		background: hsl(var(--background)) !important;
	}

	.mathgraph-fullscreen-wrapper:fullscreen .mathgraph-canvas-container {
		width: 100vw !important;
		height: 100vh !important;
		flex: 1 1 auto !important;
	}

	/* Ensure SVG fills the container in fullscreen */
	.mathgraph-fullscreen-wrapper:fullscreen svg {
		width: 100vw !important;
		height: 100vh !important;
		max-width: 100vw !important;
		max-height: 100vh !important;
	}

	/* WebKit (Safari, Chrome) */
	.mathgraph-fullscreen-wrapper:-webkit-full-screen {
		width: 100vw !important;
		height: 100vh !important;
		padding: 0 !important;
		margin: 0 !important;
		display: flex !important;
		flex-direction: column !important;
		align-items: stretch !important;
		background: hsl(var(--background)) !important;
	}

	.mathgraph-fullscreen-wrapper:-webkit-full-screen .mathgraph-canvas-container {
		width: 100vw !important;
		height: 100vh !important;
		flex: 1 1 auto !important;
	}

	.mathgraph-fullscreen-wrapper:-webkit-full-screen svg {
		width: 100vw !important;
		height: 100vh !important;
		max-width: 100vw !important;
		max-height: 100vh !important;
	}

	/* Firefox */
	.mathgraph-fullscreen-wrapper:-moz-full-screen {
		width: 100vw !important;
		height: 100vh !important;
		padding: 0 !important;
		margin: 0 !important;
		display: flex !important;
		flex-direction: column !important;
		align-items: stretch !important;
		background: hsl(var(--background)) !important;
	}

	.mathgraph-fullscreen-wrapper:-moz-full-screen .mathgraph-canvas-container {
		width: 100vw !important;
		height: 100vh !important;
		flex: 1 1 auto !important;
	}

	.mathgraph-fullscreen-wrapper:-moz-full-screen svg {
		width: 100vw !important;
		height: 100vh !important;
		max-width: 100vw !important;
		max-height: 100vh !important;
	}

	/* Microsoft Edge */
	.mathgraph-fullscreen-wrapper:-ms-fullscreen {
		width: 100vw !important;
		height: 100vh !important;
		padding: 0 !important;
		margin: 0 !important;
		display: flex !important;
		flex-direction: column !important;
		align-items: stretch !important;
		background: hsl(var(--background)) !important;
	}

	.mathgraph-fullscreen-wrapper:-ms-fullscreen .mathgraph-canvas-container {
		width: 100vw !important;
		height: 100vh !important;
		flex: 1 1 auto !important;
	}

	.mathgraph-fullscreen-wrapper:-ms-fullscreen svg {
		width: 100vw !important;
		height: 100vh !important;
		max-width: 100vw !important;
		max-height: 100vh !important;
	}
</style>
