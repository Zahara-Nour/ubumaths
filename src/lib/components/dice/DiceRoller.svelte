<!--
	DiceRoller Component

	Main dice roller component with WebGL detection.
	Supports controlled mode (via config) or interactive mode (user selects dice).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { isWebGLSupported } from './utils/webgl-detector';
	import { allDiceTypes, getDiceDisplayName } from './utils/dice-geometry';
	import { styleNames } from './styles';
	import type { DiceConfig, DiceRollResult, DiceRollerProps, DiceType, DiceStyle } from './types';
	import DiceScene3D from './DiceScene3D.svelte';
	import DiceFallback from './DiceFallback.svelte';
	import { Button } from '$lib/components/ui/button';
	import MySelect from '$lib/components/MySelect.svelte';

	// Props
	let {
		config,
		interactive = false,
		style = 'classic',
		showHistory = false,
		maxHistory = 10,
		onRollStart,
		onRollProgress: _onRollProgress,
		onRollComplete,
		physics,
		duration = 2500,
		disabled = false
	}: DiceRollerProps = $props();

	// State
	let hasWebGL = $state(false);
	let sceneRef: { roll: () => void } | null = $state(null);
	let fallbackRef: { roll: () => void } | null = $state(null);
	let isRolling = $state(false);
	let history = $state<DiceRollResult[][]>([]);

	// Interactive mode state
	let selectedDiceType = $state<string>('d6');
	let selectedCount = $state(1);
	let selectedStyle = $state<string>(style);

	// Derived config for interactive mode
	let activeConfig: DiceConfig[] = $derived.by(() => {
		if (config) {
			return config;
		}

		if (interactive) {
			return [
				{
					type: selectedDiceType as DiceType,
					count: selectedCount,
					style: selectedStyle as DiceStyle
				}
			];
		}

		return [];
	});

	// Detect WebGL on mount
	onMount(() => {
		hasWebGL = isWebGLSupported();
	});

	/**
	 * Handle roll button click
	 */
	function handleRoll() {
		if (isRolling || disabled) return;

		isRolling = true;

		// Call the roll method on the appropriate component
		if (hasWebGL && sceneRef) {
			sceneRef.roll();
		} else if (fallbackRef) {
			fallbackRef.roll();
		}
	}

	/**
	 * Handle roll start
	 */
	function handleRollStart() {
		isRolling = true;
		if (onRollStart) {
			onRollStart();
		}
	}

	/**
	 * Handle roll complete
	 */
	function handleRollComplete(result: DiceRollResult[]) {
		isRolling = false;

		// Add to history if enabled
		if (showHistory) {
			history = [result, ...history].slice(0, maxHistory);
		}

		if (onRollComplete) {
			onRollComplete(result);
		}
	}

	/**
	 * Format result for display
	 */
	function formatResult(result: DiceRollResult[]): string {
		return result
			.map((r) => {
				const values = r.results.map((d) => d.value).join(', ');
				return `${r.dice.toUpperCase()}: ${values} (Total: ${r.total})`;
			})
			.join(' | ');
	}

	// Items for dice type selector
	const diceTypeItems = allDiceTypes.map((type) => ({
		value: type,
		label: getDiceDisplayName(type)
	}));

	// Items for style selector
	const styleItems = styleNames.map((s) => ({
		value: s.value,
		label: s.label
	}));
</script>

<div class="dice-roller flex flex-col gap-4">
	<!-- Interactive Controls (if in interactive mode) -->
	{#if interactive}
		<div class="controls flex flex-wrap items-end gap-4 rounded-lg bg-muted/50 p-4">
			<!-- Dice Type Selector -->
			<div class="flex flex-col gap-2">
				<label class="text-sm font-medium text-foreground">Type de dé</label>
				<div class="w-48">
					<MySelect type="single" bind:value={selectedDiceType} items={diceTypeItems} />
				</div>
			</div>

			<!-- Count Input -->
			<div class="flex flex-col gap-2">
				<label for="dice-count" class="text-sm font-medium text-foreground">Nombre</label>
				<input
					id="dice-count"
					type="number"
					min="1"
					max="10"
					bind:value={selectedCount}
					class="h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				/>
			</div>

			<!-- Style Selector -->
			<div class="flex flex-col gap-2">
				<label class="text-sm font-medium text-foreground">Style</label>
				<div class="w-40">
					<MySelect type="single" bind:value={selectedStyle} items={styleItems} />
				</div>
			</div>
		</div>
	{/if}

	<!-- 3D Scene or Fallback -->
	<div class="scene-wrapper relative">
		{#if hasWebGL}
			<DiceScene3D
				bind:this={sceneRef}
				config={activeConfig}
				onRollStart={handleRollStart}
				onRollComplete={handleRollComplete}
				{physics}
				{duration}
			/>
		{:else}
			<DiceFallback
				bind:this={fallbackRef}
				config={activeConfig}
				onRollStart={handleRollStart}
				onRollComplete={handleRollComplete}
				{duration}
			/>
		{/if}

		<!-- WebGL Status Badge (bottom-right) -->
		<div class="absolute right-2 bottom-2 rounded-md bg-background/80 px-2 py-1 text-xs">
			{hasWebGL ? '3D (WebGL)' : '2D (Fallback)'}
		</div>
	</div>

	<!-- Roll Button -->
	<Button
		onclick={handleRoll}
		disabled={disabled || isRolling || activeConfig.length === 0}
		class="w-full text-lg font-semibold"
		size="lg"
	>
		{isRolling ? '🎲 Lancement...' : '🎲 Lancer'}
	</Button>

	<!-- History -->
	{#if showHistory && history.length > 0}
		<div class="history flex flex-col gap-2">
			<h3 class="text-sm font-semibold text-foreground">Historique</h3>
			<div class="history-list flex flex-col gap-1">
				{#each history as roll, index (index)}
					<div class="history-item rounded-md bg-muted p-2 text-xs text-muted-foreground">
						<span class="font-medium">#{history.length - index}:</span>
						{formatResult(roll)}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.scene-wrapper {
		min-height: 400px;
	}
</style>
