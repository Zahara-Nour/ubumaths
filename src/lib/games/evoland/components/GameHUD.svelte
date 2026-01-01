<script lang="ts">
	/**
	 * Evoland Game HUD
	 *
	 * Displays player stats: HP, XP, Level, Gold, Keys.
	 * Styled to match the retro pixel-art aesthetic.
	 */

	import { evolandStore } from '../stores/evoland.svelte';
	import { Progress } from '$lib/components/ui/progress';

	// Derived values
	const hud = $derived(evolandStore.hud);
	const flags = $derived(evolandStore.flags);
	const hpPercentage = $derived(evolandStore.hpPercentage);
	const xpPercentage = $derived(evolandStore.xpPercentage);
</script>

<div class="game-hud" role="status" aria-live="polite" aria-label="Game status">
	<!-- Top Left: HP and XP bars -->
	<div class="hud-bars">
		<!-- HP Bar -->
		<div class="stat-bar hp-bar">
			<span class="stat-icon" aria-hidden="true">❤️</span>
			<div class="bar-container">
				<Progress value={hpPercentage} max={100} class="bar hp" />
				<span class="bar-text">{hud.hp}/{hud.maxHp}</span>
			</div>
		</div>

		<!-- XP Bar (only show after CLevelUp chest) -->
		{#if flags.levelUpEnabled}
			<div class="stat-bar xp-bar">
				<span class="stat-icon" aria-hidden="true">⭐</span>
				<div class="bar-container">
					<Progress value={xpPercentage} max={100} class="bar xp" />
					<span class="bar-text">Lv.{hud.level}</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Top Right: Items -->
	<div class="hud-items">
		<!-- Gold (only show when you have some) -->
		{#if hud.gold > 0}
			<div class="item gold" aria-label="{hud.gold} gold">
				<span class="item-icon" aria-hidden="true">🪙</span>
				<span class="item-count">{hud.gold}</span>
			</div>
		{/if}

		<!-- Keys -->
		{#if hud.keys > 0}
			<div class="item keys" aria-label="{hud.keys} keys">
				<span class="item-icon" aria-hidden="true">🔑</span>
				<span class="item-count">{hud.keys}</span>
			</div>
		{/if}
	</div>

	<!-- Bottom: Kill Counter (dungeon only) -->
	{#if hud.showKillCounter}
		<div class="kill-counter" aria-label="{hud.killCount} enemies defeated">
			<span class="kill-icon" aria-hidden="true">💀</span>
			<span class="kill-count">{hud.killCount}</span>
		</div>
	{/if}
</div>

<style>
	.game-hud {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		padding: 8px;
		font-family: 'Press Start 2P', monospace;
		font-size: 10px;
		color: #fff;
		text-shadow: 1px 1px 0 #000;
		pointer-events: none;
	}

	.hud-bars {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: fit-content;
	}

	.stat-bar {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.stat-icon {
		font-size: 12px;
		width: 16px;
		text-align: center;
	}

	.bar-container {
		position: relative;
		width: 80px;
	}

	.bar-container :global(.bar) {
		height: 10px;
		background-color: rgba(0, 0, 0, 0.5);
		border: 1px solid #fff;
		border-radius: 0;
	}

	.bar-container :global(.hp [data-progress]) {
		background-color: #e53935;
	}

	.bar-container :global(.xp [data-progress]) {
		background-color: #ffc107;
	}

	.bar-text {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 8px;
		white-space: nowrap;
	}

	.hud-items {
		position: absolute;
		top: 8px;
		right: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		align-items: flex-end;
	}

	.item {
		display: flex;
		align-items: center;
		gap: 4px;
		background-color: rgba(0, 0, 0, 0.5);
		padding: 2px 6px;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.item-icon {
		font-size: 12px;
	}

	.item-count {
		font-size: 10px;
		min-width: 24px;
		text-align: right;
	}

	.kill-counter {
		position: absolute;
		bottom: 8px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 4px;
		background-color: rgba(0, 0, 0, 0.5);
		padding: 4px 8px;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.kill-icon {
		font-size: 14px;
	}

	.kill-count {
		font-size: 12px;
	}
</style>
