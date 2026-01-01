<script lang="ts">
	/**
	 * Evoland Title Screen
	 *
	 * Main menu with New Game, Continue, and Load options.
	 * Styled to match the retro GameBoy aesthetic.
	 */

	import { evolandStore } from '../stores/evoland.svelte';
	import { Button } from '$lib/components/ui/button';

	// Props
	interface Props {
		/** Called when starting a new game */
		onStartGame?: () => void;
	}

	let { onStartGame }: Props = $props();

	// Check if continue is available
	const hasSaveData = $derived(evolandStore.saveSlots.some((s) => s.exists));

	// Menu actions
	function handleNewGame() {
		onStartGame?.();
	}

	function handleContinue() {
		evolandStore.continueGame();
	}

	function handleLoad() {
		// TODO: Open load game screen
		console.log('Load game');
	}

	// Keyboard navigation
	let selectedIndex = $state(0);
	const menuItems = $derived([
		{ label: 'New Game', action: handleNewGame, enabled: true },
		{ label: 'Continue', action: handleContinue, enabled: hasSaveData },
		{ label: 'Load Game', action: handleLoad, enabled: hasSaveData }
	]);

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp') {
			selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
			event.preventDefault();
		} else if (event.key === 'ArrowDown') {
			selectedIndex = (selectedIndex + 1) % menuItems.length;
			event.preventDefault();
		} else if (event.key === 'Enter' || event.key === ' ') {
			const item = menuItems[selectedIndex];
			if (item.enabled) {
				item.action();
			}
			event.preventDefault();
		}
	}
</script>

<div class="title-screen" onkeydown={handleKeyDown} tabindex="0" role="menu" aria-label="Main menu">
	<!-- Title -->
	<div class="title-container">
		<h1 class="game-title">EVOLAND</h1>
		<p class="subtitle">A Short Story of Adventure Video Games Evolution</p>
	</div>

	<!-- Menu -->
	<div class="menu-container">
		{#each menuItems as item, index (item.label)}
			<Button
				variant="ghost"
				class="menu-item {index === selectedIndex ? 'selected' : ''}"
				disabled={!item.enabled}
				onclick={item.action}
				role="menuitem"
				aria-selected={index === selectedIndex}
			>
				<span class="arrow" aria-hidden="true">{index === selectedIndex ? '▶' : ' '}</span>
				{item.label}
			</Button>
		{/each}
	</div>

	<!-- Footer -->
	<div class="footer">
		<p class="copyright">Press ENTER to select</p>
	</div>
</div>

<style>
	.title-screen {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: linear-gradient(180deg, #0f380f 0%, #306230 100%);
		font-family: 'Press Start 2P', monospace;
		color: #9bbc0f;
		outline: none;
	}

	.title-container {
		text-align: center;
		margin-bottom: 48px;
	}

	.game-title {
		font-size: 32px;
		letter-spacing: 4px;
		margin-bottom: 16px;
		text-shadow: 2px 2px 0 #0f380f;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
	}

	.subtitle {
		font-size: 8px;
		max-width: 280px;
		line-height: 1.5;
		opacity: 0.8;
	}

	.menu-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 200px;
	}

	:global(.menu-item) {
		font-family: 'Press Start 2P', monospace !important;
		font-size: 12px !important;
		color: #9bbc0f !important;
		background: transparent !important;
		border: none !important;
		text-align: left !important;
		padding: 8px 16px !important;
		justify-content: flex-start !important;
	}

	:global(.menu-item:hover:not(:disabled)) {
		color: #c4d484 !important;
	}

	:global(.menu-item:disabled) {
		opacity: 0.3 !important;
	}

	:global(.menu-item.selected) {
		color: #c4d484 !important;
	}

	.arrow {
		margin-right: 8px;
		font-size: 10px;
	}

	.footer {
		position: absolute;
		bottom: 16px;
		text-align: center;
	}

	.copyright {
		font-size: 8px;
		opacity: 0.6;
	}
</style>
