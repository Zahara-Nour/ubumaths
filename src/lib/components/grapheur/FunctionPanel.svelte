<!--
FunctionPanel Component

A panel that displays the list of functions with controls to add new functions.

Features:
- List of FunctionInput components
- Add button to create new functions
- Empty state message when no functions exist
- Responsive layout
- Scrollable list for many functions

@component
@example
```svelte
<FunctionPanel />
```
-->

<script lang="ts">
	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import FunctionInput from './FunctionInput.svelte';
	import SequenceInput from './SequenceInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Plus } from '@lucide/svelte';

	/**
	 * Add a new empty function
	 */
	function addFunction() {
		grapheurStore.addFunction();
	}

	/**
	 * Add a new empty sequence, explicit by default
	 */
	function addSequence() {
		grapheurStore.addSequence();
	}
</script>

<div class="function-panel flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-4">
	<!-- Panel Header -->
	<div class="panel-header flex items-center justify-between border-b border-border pb-3">
		<h3 class="text-lg font-semibold text-foreground">Tracés</h3>
		<div class="flex gap-1">
			<Button variant="outline" size="sm" onclick={addFunction} aria-label="Ajouter une fonction">
				<Plus class="h-4 w-4" />
				<span class="ml-1">Fonction</span>
			</Button>
			<Button variant="outline" size="sm" onclick={addSequence} aria-label="Ajouter une suite">
				<Plus class="h-4 w-4" />
				<span class="ml-1">Suite</span>
			</Button>
		</div>
	</div>

	<!-- Function List -->
	<div class="function-list flex-grow space-y-3 overflow-y-auto">
		{#each grapheurStore.functions as plottable (plottable.id)}
			{#if plottable.type === 'explicit'}
				<FunctionInput func={plottable} />
			{:else}
				<SequenceInput sequence={plottable} />
			{/if}
		{/each}

		{#if grapheurStore.functions.length === 0}
			<div class="empty-message flex h-full flex-col items-center justify-center gap-2 py-12">
				<p class="text-sm text-muted-foreground">Aucun tracé défini.</p>
				<p class="text-xs text-muted-foreground">
					Ajoutez une fonction ou une suite pour commencer.
				</p>
			</div>
		{/if}
	</div>

	<!-- Optional: Function Count Display -->
	{#if grapheurStore.functions.length > 0}
		<div class="border-t border-border pt-3 text-xs text-muted-foreground">
			{grapheurStore.functions.length} tracé{grapheurStore.functions.length > 1 ? 's' : ''}
			{#if grapheurStore.functions.length > 0}
				· {grapheurStore.validFunctions.length} valide{grapheurStore.validFunctions.length > 1
					? 's'
					: ''}
			{/if}
		</div>
	{/if}
</div>

<style>
	.function-list {
		/* Allow scrolling when there are many functions */
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--muted-foreground)) transparent;
	}

	.function-list::-webkit-scrollbar {
		width: 6px;
	}

	.function-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.function-list::-webkit-scrollbar-thumb {
		background: hsl(var(--muted-foreground));
		border-radius: 3px;
	}

	.function-list::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--foreground));
	}
</style>
