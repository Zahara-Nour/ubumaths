<script lang="ts">
	import type { MathfieldElement } from 'mathlive';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Keyboard } from 'lucide-svelte';
	import UnifiedInput from './UnifiedInput.svelte';
	import ResultDisplay from './ResultDisplay.svelte';
	import CalculatorKeyboard from './CalculatorKeyboard.svelte';
	import { calculatorStore } from '$lib/stores/calculator.svelte';
	import { browser } from '$app/environment';

	let activeTab = $state('calc');
	let showKeyboard = $state(false);

	// Référence au MathField pour injecter les touches du clavier
	let mathFieldElement = $state<MathfieldElement | null>(null);

	// Reactive window width for mobile detection
	let windowWidth = $state(browser ? window.innerWidth : 0);

	$effect(() => {
		if (!browser) return;

		function handleResize() {
			windowWidth = window.innerWidth;
		}

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	let isMobile = $derived(windowWidth < 768);

	/**
	 * Gère la soumission depuis UnifiedInput
	 */
	async function handleSubmit(input: {
		type: 'expression' | 'command';
		command?: string;
		expression: string;
	}) {
		await calculatorStore.execute(input);
	}

	/**
	 * Injecte une valeur dans le MathField via le clavier virtuel
	 */
	function handleKeyboardInput(value: string) {
		if (mathFieldElement) {
			mathFieldElement.executeCommand(['insert', value]);
		}
	}

	/**
	 * Efface le dernier caractère
	 */
	function handleBackspace() {
		if (mathFieldElement) {
			mathFieldElement.executeCommand('deleteBackward');
		}
	}

	/**
	 * Efface l'input courant
	 */
	function handleClear() {
		if (mathFieldElement) {
			mathFieldElement.setValue('');
		}
	}

	/**
	 * Efface tout (input + historique)
	 */
	function handleAllClear() {
		handleClear();
		calculatorStore.clearHistory();
	}

	/**
	 * Soumet depuis le clavier (bouton =)
	 */
	function handleKeyboardSubmit() {
		if (mathFieldElement) {
			const value = mathFieldElement.getValue('latex');
			if (value) {
				handleSubmit({ type: 'expression', expression: value });
				handleClear();
			}
		}
	}
</script>

<Tabs.Root bind:value={activeTab} class="w-full">
	<Tabs.List class="grid w-full grid-cols-2">
		<Tabs.Trigger value="calc">Calcul</Tabs.Trigger>
		<Tabs.Trigger value="graph">Graphique</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="calc" class="mt-4 space-y-4">
		<!-- Zone de saisie -->
		<div class="rounded-lg border border-border bg-card p-4">
			<UnifiedInput onSubmit={handleSubmit} bind:mathFieldElement />
		</div>

		<!-- Historique des résultats -->
		{#if calculatorStore.hasHistory}
			<div class="space-y-2">
				<h3 class="text-sm font-medium text-muted-foreground">Historique</h3>
				<div class="max-h-[300px] space-y-2 overflow-y-auto">
					{#each calculatorStore.history as result (result.id)}
						<ResultDisplay {result} />
					{/each}
				</div>
			</div>
		{/if}

		<!-- Toggle clavier (desktop uniquement) -->
		{#if !isMobile}
			<div class="flex justify-center">
				<Button
					variant="outline"
					size="sm"
					onclick={() => (showKeyboard = !showKeyboard)}
					class="gap-2"
				>
					<Keyboard class="size-4" />
					{showKeyboard ? 'Masquer le clavier' : 'Afficher le clavier'}
				</Button>
			</div>
		{/if}

		<!-- Clavier virtuel -->
		<CalculatorKeyboard
			visible={isMobile || showKeyboard}
			onInput={handleKeyboardInput}
			onSubmit={handleKeyboardSubmit}
			onBackspace={handleBackspace}
			onClear={handleClear}
			onAllClear={handleAllClear}
		/>
	</Tabs.Content>

	<Tabs.Content value="graph" class="mt-4">
		<div class="rounded-lg border border-border bg-card p-6 text-card-foreground">
			<p class="text-muted-foreground">Grapheur (Phase 3)</p>
		</div>
	</Tabs.Content>
</Tabs.Root>
