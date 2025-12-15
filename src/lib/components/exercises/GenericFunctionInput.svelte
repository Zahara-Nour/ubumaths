<!--
	GenericFunctionInput Component
	==============================

	Input component for specifying generic function identifiers.
	Displays selected functions as badges with the ability to add/remove.

	These identifiers are used by the math parser to recognize function calls
	(e.g., P(x), Q'(x)) instead of implicit multiplication.

	Usage:
	```svelte
	<script lang="ts">
	  let functions = $state<string[]>(['f', 'P', 'Q']);
	</script>

	<GenericFunctionInput bind:value={functions} />
	```
-->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { X } from 'lucide-svelte';

	interface Props {
		/** Array of function identifiers */
		value: string[];
		/** Placeholder text for input */
		placeholder?: string;
		/** Whether the input is disabled */
		disabled?: boolean;
		/** Maximum number of function names allowed */
		max?: number;
	}

	let {
		value = $bindable([]),
		placeholder = 'Ex: f, P, Q',
		disabled = false,
		max = 50
	}: Props = $props();

	// Input state
	let inputValue = $state('');
	let inputError = $state<string | null>(null);

	// Validation regex: starts with letter, then letters/numbers/underscores
	const IDENTIFIER_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

	// Default functions for reference
	const DEFAULT_FUNCTIONS = ['f', 'g', 'h', 'u', 'v', 'w', 'F', 'G', 'H'];

	/**
	 * Validate a function identifier
	 */
	function validateIdentifier(name: string): string | null {
		if (!name.trim()) {
			return 'Le nom ne peut pas etre vide';
		}
		if (!IDENTIFIER_REGEX.test(name)) {
			return 'Doit commencer par une lettre (a-z, A-Z)';
		}
		if (value.includes(name)) {
			return 'Cette fonction est deja ajoutee';
		}
		if (value.length >= max) {
			return `Maximum ${max} fonctions`;
		}
		return null;
	}

	/**
	 * Add a function identifier
	 */
	function addFunction() {
		const name = inputValue.trim();
		const error = validateIdentifier(name);

		if (error) {
			inputError = error;
			return;
		}

		value = [...value, name];
		inputValue = '';
		inputError = null;
	}

	/**
	 * Remove a function identifier
	 */
	function removeFunction(name: string) {
		value = value.filter((f) => f !== name);
	}

	/**
	 * Handle key press in input
	 */
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addFunction();
		}
		// Clear error on typing
		if (inputError) {
			inputError = null;
		}
	}

	/**
	 * Add all default functions
	 */
	function addDefaults() {
		const newFunctions = DEFAULT_FUNCTIONS.filter((f) => !value.includes(f));
		value = [...value, ...newFunctions].slice(0, max);
	}

	/**
	 * Clear all functions
	 */
	function clearAll() {
		value = [];
	}

	// Derived: whether we can add more
	let canAddMore = $derived(value.length < max);

	// Derived: whether using defaults (empty means defaults)
	let usingDefaults = $derived(value.length === 0);
</script>

<div class="space-y-3">
	<!-- Current selection info -->
	{#if usingDefaults}
		<p class="text-sm text-muted-foreground">
			Par defaut, les fonctions reconnues sont :
			<span class="font-mono">{DEFAULT_FUNCTIONS.join(', ')}</span>
		</p>
	{:else}
		<p class="text-sm text-muted-foreground">
			Fonctions personnalisees ({value.length}/{max})
		</p>
	{/if}

	<!-- Selected functions as badges -->
	{#if value.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each value as func (func)}
				<Badge variant="secondary" class="gap-1 pr-1">
					<span class="font-mono">{func}</span>
					<button
						type="button"
						class="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
						onclick={() => removeFunction(func)}
						{disabled}
						aria-label="Supprimer {func}"
					>
						<X class="h-3 w-3" />
					</button>
				</Badge>
			{/each}
		</div>
	{/if}

	<!-- Input row -->
	{#if canAddMore}
		<div class="flex gap-2">
			<Input
				type="text"
				{placeholder}
				bind:value={inputValue}
				onkeydown={handleKeydown}
				{disabled}
				class="font-mono"
				aria-label="Nom de fonction"
				aria-invalid={!!inputError}
			/>
			<Button type="button" variant="outline" size="sm" onclick={addFunction} {disabled}>
				Ajouter
			</Button>
		</div>
	{/if}

	<!-- Error message -->
	{#if inputError}
		<p class="text-sm text-destructive">{inputError}</p>
	{/if}

	<!-- Quick actions -->
	<div class="flex gap-2">
		{#if value.length === 0}
			<Button type="button" variant="ghost" size="sm" onclick={addDefaults} {disabled}>
				Utiliser les defauts ({DEFAULT_FUNCTIONS.join(', ')})
			</Button>
		{:else}
			<Button type="button" variant="ghost" size="sm" onclick={clearAll} {disabled}>
				Effacer tout (utiliser les defauts)
			</Button>
		{/if}
	</div>
</div>
