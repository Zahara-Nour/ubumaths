<script lang="ts">
	// Imports
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Play, Loader2, Trash2, Copy, RotateCcw, Circle } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Props
	let {
		onExecute,
		onClear,
		onCopy,
		onReset,
		canExecute,
		isExecuting,
		isModified = false
	}: {
		onExecute: () => void;
		onClear: () => void;
		onCopy: () => void;
		onReset: () => void;
		canExecute: boolean;
		isExecuting: boolean;
		isModified?: boolean;
	} = $props();

	// State
	let copySuccess = $state(false);

	// Functions
	function handleCopy(): void {
		onCopy();
		copySuccess = true;
		toaster.success('Code copié dans le presse-papiers');
		setTimeout(() => {
			copySuccess = false;
		}, 2000);
	}
</script>

<div class="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
	<!-- Execute button -->
	<Button
		variant="default"
		size="sm"
		onclick={onExecute}
		disabled={!canExecute || isExecuting}
		class="gap-2"
	>
		{#if isExecuting}
			<Loader2 class="size-4 animate-spin" />
			<span>Exécution...</span>
		{:else}
			<Play class="size-4" />
			<span>Exécuter</span>
		{/if}
	</Button>

	<!-- Keyboard shortcut hint (hidden on mobile) -->
	<kbd class="hidden rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground sm:inline">
		Ctrl+Entrée
	</kbd>

	<Separator orientation="vertical" class="mx-2 h-6" />

	<!-- Secondary actions -->
	<div class="flex items-center gap-1">
		<Button
			variant="ghost"
			size="icon"
			onclick={onClear}
			aria-label="Effacer la sortie"
			title="Effacer la sortie"
		>
			<Trash2 class="size-4" />
		</Button>

		<Button
			variant="ghost"
			size="icon"
			onclick={handleCopy}
			aria-label="Copier le code"
			title="Copier le code"
			class={copySuccess ? 'text-green-500' : ''}
		>
			<Copy class="size-4" />
		</Button>

		<Button
			variant="ghost"
			size="icon"
			onclick={onReset}
			aria-label="Réinitialiser le code"
			title="Réinitialiser le code"
		>
			<RotateCcw class="size-4" />
		</Button>
	</div>

	<!-- Spacer -->
	<div class="flex-1"></div>

	<!-- Status indicator -->
	<div class="flex items-center gap-2 text-xs text-muted-foreground">
		<Circle
			class="size-2 {canExecute
				? 'fill-green-500 text-green-500'
				: 'fill-yellow-500 text-yellow-500'}"
		/>
		<span class="hidden sm:inline">
			{canExecute ? 'Prêt' : 'Chargement...'}
		</span>
		{#if isModified}
			<span class="font-medium text-destructive" title="Code modifié (non sauvegardé)">*</span>
		{/if}
	</div>
</div>
