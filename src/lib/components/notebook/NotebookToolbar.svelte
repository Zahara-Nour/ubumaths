<script lang="ts">
	/**
	 * NotebookToolbar Component
	 *
	 * Main toolbar for notebook actions
	 * Features:
	 * - Run current cell / Run all cells
	 * - Stop execution
	 * - Add code/markdown cells
	 * - Save notebook
	 * - Reset kernel
	 */

	import type { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Play, Square, Save, Plus, RotateCcw, PlayCircle, Code, FileText } from 'lucide-svelte';
	import KeyboardShortcutsHelp from './KeyboardShortcutsHelp.svelte';

	// Props
	let {
		notebook = null as NotebookStore | null,
		isReadonly = false,
		onSave = () => {},
		onAddCodeCell = () => {},
		onAddMarkdownCell = () => {},
		onRunCurrent = () => {},
		onRunAll = () => {},
		onStop = () => {},
		onResetKernel = () => {}
	}: {
		notebook?: NotebookStore | null;
		isReadonly?: boolean;
		onSave?: () => void;
		onAddCodeCell?: () => void;
		onAddMarkdownCell?: () => void;
		onRunCurrent?: () => void;
		onRunAll?: () => void;
		onStop?: () => void;
		onResetKernel?: () => void;
	} = $props();

	// Derived state
	let isExecuting = $derived(notebook?.isExecutingAny ?? false);
	let isSaving = $derived(notebook?.isSaving ?? false);
	let isModified = $derived(notebook?.isModified ?? false);
	let isReady = $derived(notebook?.isReady ?? false);
	let hasActiveCell = $derived(notebook?.activeCell !== null);
</script>

<div class="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
	<!-- Left side: Execution controls -->
	<div class="flex items-center gap-2">
		{#if isExecuting}
			<!-- Stop button -->
			<Button
				variant="destructive"
				size="sm"
				onclick={onStop}
				disabled={!isReady || isReadonly}
				class="gap-1.5"
			>
				<Square class="size-4" />
				<span>Arrêter</span>
			</Button>
		{:else}
			<!-- Run current cell -->
			<Button
				variant="default"
				size="sm"
				onclick={onRunCurrent}
				disabled={!isReady || !hasActiveCell || isReadonly}
				class="gap-1.5"
			>
				<Play class="size-4" />
				<span>Exécuter</span>
			</Button>

			<!-- Run all cells -->
			<Button
				variant="outline"
				size="sm"
				onclick={onRunAll}
				disabled={!isReady || isReadonly}
				class="gap-1.5"
			>
				<PlayCircle class="size-4" />
				<span>Tout exécuter</span>
			</Button>
		{/if}

		<!-- Separator -->
		<div class="mx-2 h-6 w-px bg-border"></div>

		<!-- Add cell dropdown -->
		{#if !isReadonly}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild let:builder>
					<Button builders={[builder]} variant="outline" size="sm" class="gap-1.5">
						<Plus class="size-4" />
						<span>Ajouter</span>
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item onclick={onAddCodeCell}>
						<Code class="mr-2 size-4" />
						Cellule de code
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={onAddMarkdownCell}>
						<FileText class="mr-2 size-4" />
						Cellule markdown
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{/if}

		<!-- Reset kernel -->
		{#if !isReadonly}
			<Button
				variant="ghost"
				size="sm"
				onclick={onResetKernel}
				disabled={!isReady}
				class="gap-1.5"
				title="Réinitialiser le noyau (efface toutes les variables)"
			>
				<RotateCcw class="size-4" />
				<span>Réinitialiser</span>
			</Button>
		{/if}
	</div>

	<!-- Right side: Help and Save button -->
	<div class="flex items-center gap-2">
		<KeyboardShortcutsHelp {isReadonly} />
		{#if !isReadonly}
			<Button
				variant="outline"
				size="sm"
				onclick={onSave}
				disabled={isSaving || !isModified}
				class="gap-1.5"
			>
				{#if isSaving}
					<div
						class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
					></div>
					<span>Enregistrement...</span>
				{:else}
					<Save class="size-4" />
					<span>{isModified ? 'Enregistrer' : 'Enregistré'}</span>
				{/if}
			</Button>
		{/if}
	</div>
</div>
