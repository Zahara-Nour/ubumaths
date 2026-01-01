<script lang="ts">
	/**
	 * Evoland Game Container
	 *
	 * Main component that integrates the canvas renderer with Svelte UI overlays.
	 * Handles game initialization, rendering, and screen management.
	 */

	import { onMount } from 'svelte';
	import { evolandStore } from '../stores/evoland.svelte';
	import { GameController } from '../engine/game-controller';
	import GameHUD from './GameHUD.svelte';
	import TitleScreen from './TitleScreen.svelte';
	import PauseMenu from './PauseMenu.svelte';
	import DialogPopup from './DialogPopup.svelte';
	import GameOverScreen from './GameOverScreen.svelte';
	import VictoryScreen from './VictoryScreen.svelte';

	// Props
	interface Props {
		/** Width of the game canvas */
		width?: number;
		/** Height of the game canvas */
		height?: number;
		/** Scale factor for pixel-perfect rendering */
		scale?: number;
		/** Show FPS counter */
		showFps?: boolean;
	}

	let { width = 240, height = 160, scale = 4, showFps = false }: Props = $props();

	// Canvas and container references
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;

	// Game controller
	let controller: GameController | null = null;

	// Computed dimensions
	const scaledWidth = $derived(width * scale);
	const scaledHeight = $derived(height * scale);

	// Game initialization
	onMount(() => {
		if (!canvas) return;

		// Create and initialize the game controller
		controller = new GameController({
			canvas,
			scale,
			showFps
		});

		// Initialize asynchronously
		controller.initialize().catch((error) => {
			console.error('Failed to initialize game:', error);
		});

		// Focus the container for keyboard input
		container?.focus();

		// Cleanup on unmount
		return () => {
			controller?.destroy();
			controller = null;
		};
	});

	// Start game when user clicks "New Game" from title screen
	function handleStartGame() {
		controller?.start();
	}

	// Handle keyboard focus
	function handleContainerClick() {
		container?.focus();
	}

	// Handle keyboard events
	function handleKeyDown(event: KeyboardEvent) {
		// Escape toggles pause
		if (event.key === 'Escape') {
			if (evolandStore.screen === 'playing') {
				controller?.pause();
				event.preventDefault();
			} else if (evolandStore.screen === 'paused') {
				controller?.resume();
				event.preventDefault();
			}
		}
	}

	// Expose start game handler to title screen
	$effect(() => {
		// This makes the handleStartGame function available when title screen needs it
		if (evolandStore.screen === 'title' && controller?.state.initialized) {
			// Ready to start
		}
	});
</script>

<div
	class="evoland-container"
	bind:this={container}
	onclick={handleContainerClick}
	onkeydown={handleKeyDown}
	tabindex="0"
	role="application"
	aria-label="Evoland Game"
	style="width: {scaledWidth}px; height: {scaledHeight}px;"
>
	<!-- Game Canvas -->
	<canvas
		bind:this={canvas}
		{width}
		{height}
		class="evoland-canvas"
		style="width: {scaledWidth}px; height: {scaledHeight}px;"
	></canvas>

	<!-- UI Overlays -->
	<div class="evoland-ui">
		<!-- Title Screen -->
		{#if evolandStore.screen === 'title'}
			<TitleScreen onStartGame={handleStartGame} />
		{/if}

		<!-- HUD (visible during gameplay) -->
		{#if evolandStore.canShowHUD}
			<GameHUD />
		{/if}

		<!-- Pause Menu -->
		{#if evolandStore.screen === 'paused'}
			<PauseMenu
				onResume={() => controller?.resume()}
				onQuit={() => {
					controller?.stop();
					evolandStore.goToTitle();
				}}
			/>
		{/if}

		<!-- Dialog Popup -->
		{#if evolandStore.canShowDialog && evolandStore.dialog}
			<DialogPopup
				title={evolandStore.dialog.title}
				message={evolandStore.dialog.message}
				icon={evolandStore.dialog.icon}
				onClose={evolandStore.closeDialog}
			/>
		{/if}

		<!-- Game Over Screen -->
		{#if evolandStore.screen === 'gameover'}
			<GameOverScreen onRetry={handleStartGame} />
		{/if}

		<!-- Victory Screen -->
		{#if evolandStore.screen === 'victory'}
			<VictoryScreen />
		{/if}

		<!-- Loading Overlay -->
		{#if evolandStore.isLoading}
			<div class="evoland-loading">
				<div class="loading-text">Loading...</div>
			</div>
		{/if}

		<!-- FPS Counter (debug) -->
		{#if showFps}
			<div class="evoland-fps">{evolandStore.fps} FPS</div>
		{/if}
	</div>
</div>

<style>
	.evoland-container {
		position: relative;
		background-color: #000;
		outline: none;
		overflow: hidden;
		user-select: none;
		-webkit-user-select: none;
	}

	.evoland-container:focus {
		outline: 2px solid #4a9eff;
		outline-offset: 2px;
	}

	.evoland-canvas {
		display: block;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}

	.evoland-ui {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
	}

	.evoland-ui > :global(*) {
		pointer-events: auto;
	}

	.evoland-loading {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(0, 0, 0, 0.8);
	}

	.loading-text {
		font-family: 'Press Start 2P', monospace;
		font-size: 16px;
		color: #fff;
		animation: blink 1s infinite;
	}

	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		51%,
		100% {
			opacity: 0;
		}
	}

	.evoland-fps {
		position: absolute;
		top: 4px;
		right: 4px;
		font-family: monospace;
		font-size: 12px;
		color: #0f0;
		background-color: rgba(0, 0, 0, 0.5);
		padding: 2px 4px;
	}
</style>
