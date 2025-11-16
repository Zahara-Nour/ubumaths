<!--
	Dice Roller Test Page

	Quick demo page to test the dice roller components.
	TODO: Remove this file before production.
-->
<script lang="ts">
	import DiceRoller from '$lib/components/dice/DiceRoller.svelte';
	import DiceRollerModal from '$lib/components/dice/DiceRollerModal.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { DiceConfig, DiceRollResult } from '$lib/components/dice/types';
	import { toaster } from '$lib/stores/toaster.svelte';

	// State
	let showModal = $state(false);
	let lastResult = $state<DiceRollResult[] | null>(null);

	// Example configurations
	const singleD6: DiceConfig[] = [{ type: 'd6', count: 1, style: 'classic' }];
	const multiDice: DiceConfig[] = [
		{ type: 'd20', count: 1, style: 'neon' },
		{ type: 'd6', count: 2, style: 'classic' }
	];

	/**
	 * Handle roll complete
	 */
	function handleRollComplete(result: DiceRollResult[]) {
		lastResult = result;
		const total = result.reduce((sum, r) => sum + r.total, 0);
		toaster.success(`Résultat: ${total}`);
	}
</script>

<div class="container mx-auto max-w-4xl space-y-8 p-6">
	<div class="space-y-2">
		<h1 class="text-3xl font-bold">Test du Lanceur de Dés 3D</h1>
		<p class="text-muted-foreground">
			Démo des composants de lancer de dés avec support WebGL et fallback 2D
		</p>
	</div>

	<!-- Interactive Mode -->
	<section class="space-y-4 rounded-lg border border-border bg-card p-6">
		<h2 class="text-xl font-semibold">Mode Interactif</h2>
		<p class="text-sm text-muted-foreground">
			L'utilisateur peut sélectionner le type de dé, le nombre et le style
		</p>
		<DiceRoller interactive showHistory onRollComplete={handleRollComplete} />
	</section>

	<!-- Controlled Mode - Single D6 -->
	<section class="space-y-4 rounded-lg border border-border bg-card p-6">
		<h2 class="text-xl font-semibold">Mode Contrôlé - D6 Simple</h2>
		<p class="text-sm text-muted-foreground">Configuration fixe: 1 dé à 6 faces (classique)</p>
		<DiceRoller config={singleD6} showHistory={false} onRollComplete={handleRollComplete} />
	</section>

	<!-- Controlled Mode - Multiple Dice -->
	<section class="space-y-4 rounded-lg border border-border bg-card p-6">
		<h2 class="text-xl font-semibold">Mode Contrôlé - Plusieurs Dés</h2>
		<p class="text-sm text-muted-foreground">Configuration fixe: 1 D20 (néon) + 2 D6 (classique)</p>
		<DiceRoller config={multiDice} showHistory onRollComplete={handleRollComplete} />
	</section>

	<!-- Modal Demo -->
	<section class="space-y-4 rounded-lg border border-border bg-card p-6">
		<h2 class="text-xl font-semibold">Mode Modal</h2>
		<p class="text-sm text-muted-foreground">Lanceur de dés dans une fenêtre modale</p>
		<Button onclick={() => (showModal = true)}>Ouvrir le Modal</Button>
		<DiceRollerModal
			bind:open={showModal}
			title="Lanceur de Dés Modal"
			interactive
			showHistory
			onRollComplete={handleRollComplete}
		/>
	</section>

	<!-- Last Result -->
	{#if lastResult}
		<section class="space-y-4 rounded-lg border border-green-500 bg-green-500/10 p-6">
			<h2 class="text-xl font-semibold">Dernier Résultat</h2>
			<div class="space-y-2">
				{#each lastResult as diceResult (diceResult.dice + '-' + diceResult.timestamp)}
					<div class="rounded-md bg-background p-3">
						<div class="font-semibold">{diceResult.dice.toUpperCase()}</div>
						<div class="text-sm text-muted-foreground">
							Valeurs: {diceResult.results.map((r) => r.value).join(', ')}
						</div>
						<div class="text-lg font-bold text-primary">Total: {diceResult.total}</div>
					</div>
				{/each}
				<div class="mt-4 rounded-md bg-primary p-3 text-center">
					<div class="text-sm text-primary-foreground">Total Global</div>
					<div class="text-3xl font-bold text-primary-foreground">
						{lastResult.reduce((sum, r) => sum + r.total, 0)}
					</div>
				</div>
			</div>
		</section>
	{/if}
</div>
