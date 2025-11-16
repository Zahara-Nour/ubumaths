<!--
	DiceFallback Component

	2D fallback for browsers without WebGL support.
	Shows animated dice icons with CSS animations.
-->
<script lang="ts">
	import type { DiceConfig, DiceRollResult, SingleDiceResult } from './types';

	// Props
	let {
		config = [],
		onRollStart,
		onRollComplete,
		duration = 2000
	}: {
		config?: DiceConfig[];
		onRollStart?: () => void;
		onRollComplete?: (result: DiceRollResult[]) => void;
		duration?: number;
	} = $props();

	// State
	let isRolling = $state(false);
	let results = $state<DiceRollResult[]>([]);

	/**
	 * Generate random result for a die
	 */
	function getRandomResult(type: string): number {
		const maxValues: Record<string, number> = {
			d4: 4,
			d6: 6,
			d8: 8,
			d10: 10,
			d12: 12,
			d20: 20
		};
		return Math.floor(Math.random() * maxValues[type]) + 1;
	}

	/**
	 * Roll the dice with animation
	 */
	export function roll() {
		if (isRolling) return;

		isRolling = true;
		results = [];

		// Call start callback
		if (onRollStart) {
			onRollStart();
		}

		// Simulate rolling animation
		setTimeout(() => {
			// Generate results
			const rollResults: DiceRollResult[] = config.map((diceConfig) => {
				const count = diceConfig.count ?? 1;
				const diceResults: SingleDiceResult[] = [];
				let total = 0;

				for (let i = 0; i < count; i++) {
					const value = getRandomResult(diceConfig.type);
					diceResults.push({
						type: diceConfig.type,
						value,
						id: `${diceConfig.type}-${Date.now()}-${i}`
					});
					total += value;
				}

				return {
					dice: diceConfig.type,
					results: diceResults,
					total,
					timestamp: Date.now()
				};
			});

			results = rollResults;
			isRolling = false;

			// Call complete callback
			if (onRollComplete) {
				onRollComplete(rollResults);
			}
		}, duration);
	}

	/**
	 * Get display emoji for dice type
	 */
	function getDiceEmoji(type: string): string {
		const emojis: Record<string, string> = {
			d4: '🔺',
			d6: '🎲',
			d8: '🔷',
			d10: '🔟',
			d12: '⬢',
			d20: '⭕'
		};
		return emojis[type] || '🎲';
	}

	/**
	 * Get dice color from style
	 */
	function getDiceColor(diceConfig: DiceConfig): string {
		if (diceConfig.color) return diceConfig.color;

		const styleColors: Record<string, string> = {
			classic: '#ffffff',
			neon: '#00ff88',
			wood: '#8b4513'
		};

		return styleColors[diceConfig.style ?? 'classic'] ?? '#ffffff';
	}
</script>

<div class="dice-fallback flex flex-col items-center justify-center gap-6 p-8">
	{#if config.length === 0}
		<p class="text-muted-foreground">Aucun dé configuré</p>
	{:else}
		<!-- Dice Display -->
		<div class="dice-grid flex flex-wrap justify-center gap-4">
			{#each config as diceConfig (diceConfig.type)}
				{@const count = diceConfig.count ?? 1}
				{#each Array(count) as _, index (`${diceConfig.type}-${index}`)}
					<div
						class="dice-item relative flex flex-col items-center gap-2"
						class:rolling={isRolling}
					>
						<!-- Dice Icon -->
						<div
							class="dice-icon text-6xl transition-transform"
							style="color: {getDiceColor(diceConfig)}"
						>
							{getDiceEmoji(diceConfig.type)}
						</div>

						<!-- Result (when settled) -->
						{#if !isRolling && results.length > 0}
							{@const diceResult = results.find((r) => r.dice === diceConfig.type)}
							{#if diceResult && diceResult.results[index]}
								<div
									class="result-value rounded-lg bg-primary px-3 py-1 text-lg font-bold text-primary-foreground"
								>
									{diceResult.results[index].value}
								</div>
							{/if}
						{/if}
					</div>
				{/each}
			{/each}
		</div>

		<!-- Total (if multiple dice) -->
		{#if !isRolling && results.length > 0}
			{@const totalSum = results.reduce((sum, r) => sum + r.total, 0)}
			{#if config.reduce((sum, c) => sum + (c.count ?? 1), 0) > 1}
				<div class="total-result flex items-center gap-2 rounded-xl bg-accent px-6 py-3">
					<span class="text-lg font-medium text-accent-foreground">Total:</span>
					<span class="text-2xl font-bold text-primary">{totalSum}</span>
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.dice-fallback {
		min-height: 300px;
	}

	.dice-item.rolling .dice-icon {
		animation: rollAnimation 0.3s infinite;
	}

	@keyframes rollAnimation {
		0%,
		100% {
			transform: rotate(0deg) translateY(0);
		}
		25% {
			transform: rotate(90deg) translateY(-10px);
		}
		50% {
			transform: rotate(180deg) translateY(0);
		}
		75% {
			transform: rotate(270deg) translateY(-10px);
		}
	}
</style>
