<script lang="ts">
	/**
	 * Evoland Victory Screen
	 *
	 * Displayed when the player completes the game.
	 */

	import { evolandStore } from '../stores/evoland.svelte';
	import { Button } from '$lib/components/ui/button';

	function handleContinue() {
		evolandStore.goToTitle();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
			handleContinue();
			event.preventDefault();
		}
	}
</script>

<div
	class="victory-screen"
	onkeydown={handleKeyDown}
	tabindex="0"
	role="alertdialog"
	aria-label="Victory"
>
	<div class="content">
		<div class="crown" aria-hidden="true">👑</div>

		<h1 class="title">VICTORY!</h1>

		<p class="message">
			Congratulations! You have rescued the princess and completed your adventure!
		</p>

		<div class="stats">
			<p>Final Level: {evolandStore.hud.level}</p>
			<p>Gold Collected: {evolandStore.hud.gold}</p>
			<p>Enemies Defeated: {evolandStore.hud.killCount}</p>
		</div>

		<div class="credits">
			<p>Thank you for playing!</p>
		</div>

		<Button variant="outline" class="menu-button" onclick={handleContinue}>Return to Title</Button>
	</div>
</div>

<style>
	.victory-screen {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(180deg, #1a237e 0%, #311b92 100%);
		font-family: 'Press Start 2P', monospace;
		color: #ffd700;
		outline: none;
	}

	.content {
		text-align: center;
		max-width: 400px;
	}

	.crown {
		font-size: 64px;
		margin-bottom: 16px;
		animation: bounce 1s infinite;
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	.title {
		font-size: 32px;
		margin-bottom: 24px;
		text-shadow: 2px 2px 0 #000;
		animation: glow 2s infinite;
	}

	@keyframes glow {
		0%,
		100% {
			text-shadow:
				2px 2px 0 #000,
				0 0 10px #ffd700;
		}
		50% {
			text-shadow:
				2px 2px 0 #000,
				0 0 20px #ffd700,
				0 0 30px #ffa500;
		}
	}

	.message {
		font-size: 10px;
		line-height: 1.8;
		color: #fff;
		margin-bottom: 24px;
	}

	.stats {
		font-size: 10px;
		color: #fff;
		margin-bottom: 24px;
		opacity: 0.9;
	}

	.stats p {
		margin: 8px 0;
	}

	.credits {
		font-size: 8px;
		color: #fff;
		opacity: 0.6;
		margin-bottom: 32px;
	}

	:global(.victory-screen .menu-button) {
		font-family: 'Press Start 2P', monospace !important;
		font-size: 10px !important;
		color: #ffd700 !important;
		border-color: #ffd700 !important;
		border-radius: 0 !important;
	}

	:global(.victory-screen .menu-button:hover) {
		background-color: rgba(255, 215, 0, 0.2) !important;
	}
</style>
