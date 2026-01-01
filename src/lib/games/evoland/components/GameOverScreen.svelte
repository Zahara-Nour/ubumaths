<script lang="ts">
	/**
	 * Evoland Game Over Screen
	 *
	 * Displayed when the player dies.
	 */

	import { evolandStore } from '../stores/evoland.svelte';
	import { Button } from '$lib/components/ui/button';

	// Props
	interface Props {
		/** Called when retrying the game */
		onRetry?: () => void;
	}

	let { onRetry }: Props = $props();

	function handleContinue() {
		onRetry?.();
	}

	function handleQuit() {
		evolandStore.goToTitle();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			handleContinue();
			event.preventDefault();
		} else if (event.key === 'Escape') {
			handleQuit();
			event.preventDefault();
		}
	}
</script>

<div
	class="gameover-screen"
	onkeydown={handleKeyDown}
	tabindex="0"
	role="alertdialog"
	aria-label="Game over"
>
	<div class="content">
		<h1 class="title">GAME OVER</h1>

		<div class="stats">
			<p>Level: {evolandStore.hud.level}</p>
			<p>Gold: {evolandStore.hud.gold}</p>
			<p>Kills: {evolandStore.hud.killCount}</p>
		</div>

		<div class="buttons">
			<Button variant="outline" class="menu-button" onclick={handleContinue}>Continue</Button>
			<Button variant="ghost" class="menu-button secondary" onclick={handleQuit}>
				Title Screen
			</Button>
		</div>
	</div>
</div>

<style>
	.gameover-screen {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(139, 0, 0, 0.9);
		font-family: 'Press Start 2P', monospace;
		color: #fff;
		outline: none;
	}

	.content {
		text-align: center;
	}

	.title {
		font-size: 28px;
		margin-bottom: 32px;
		animation: shake 0.5s ease-in-out;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-5px);
		}
		75% {
			transform: translateX(5px);
		}
	}

	.stats {
		font-size: 10px;
		margin-bottom: 32px;
		opacity: 0.8;
	}

	.stats p {
		margin: 8px 0;
	}

	.buttons {
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}

	:global(.menu-button) {
		font-family: 'Press Start 2P', monospace !important;
		font-size: 10px !important;
		min-width: 160px !important;
		border-radius: 0 !important;
	}

	:global(.menu-button.secondary) {
		opacity: 0.7;
	}
</style>
