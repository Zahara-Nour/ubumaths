<script lang="ts">
	/**
	 * Evoland Pause Menu
	 *
	 * In-game pause menu with Resume, Save, Load, and Quit options.
	 */

	import { evolandStore } from '../stores/evoland.svelte';
	import { Button } from '$lib/components/ui/button';

	// Props
	interface Props {
		/** Called when resuming the game */
		onResume?: () => void;
		/** Called when quitting to title */
		onQuit?: () => void;
	}

	let { onResume, onQuit }: Props = $props();

	// Check if save is available
	const canSave = $derived(evolandStore.canSaveGame);

	// Menu actions
	function handleResume() {
		onResume?.();
	}

	function handleSave() {
		// TODO: Open save screen
		console.log('Save game');
	}

	function handleLoad() {
		// TODO: Open load screen
		console.log('Load game');
	}

	function handleQuit() {
		onQuit?.();
	}

	// Keyboard navigation
	let selectedIndex = $state(0);
	const menuItems = $derived([
		{ label: 'Resume', action: handleResume, enabled: true },
		{ label: 'Save Game', action: handleSave, enabled: canSave },
		{ label: 'Load Game', action: handleLoad, enabled: true },
		{ label: 'Quit to Title', action: handleQuit, enabled: true }
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
		} else if (event.key === 'Escape') {
			handleResume();
			event.preventDefault();
		}
	}
</script>

<div class="pause-menu" onkeydown={handleKeyDown} tabindex="0" role="menu" aria-label="Pause menu">
	<div class="menu-box">
		<h2 class="menu-title">PAUSED</h2>

		<div class="menu-items">
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
	</div>
</div>

<style>
	.pause-menu {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(0, 0, 0, 0.7);
		font-family: 'Press Start 2P', monospace;
		outline: none;
	}

	.menu-box {
		background-color: #1a1a2e;
		border: 4px solid #fff;
		padding: 24px 32px;
		min-width: 240px;
	}

	.menu-title {
		font-size: 16px;
		color: #fff;
		text-align: center;
		margin-bottom: 24px;
	}

	.menu-items {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	:global(.pause-menu .menu-item) {
		font-family: 'Press Start 2P', monospace !important;
		font-size: 10px !important;
		color: #fff !important;
		background: transparent !important;
		border: none !important;
		text-align: left !important;
		padding: 8px 12px !important;
		justify-content: flex-start !important;
	}

	:global(.pause-menu .menu-item:hover:not(:disabled)) {
		color: #ffc107 !important;
	}

	:global(.pause-menu .menu-item:disabled) {
		opacity: 0.3 !important;
	}

	:global(.pause-menu .menu-item.selected) {
		color: #ffc107 !important;
	}

	.arrow {
		margin-right: 8px;
		font-size: 8px;
	}
</style>
