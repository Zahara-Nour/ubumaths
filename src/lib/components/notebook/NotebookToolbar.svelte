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
	import type { PythonNotebook } from '$lib/types/notebook';
	import type { NotebookExportOptions } from '$lib/typst/generators/notebook-generator';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		Square,
		Save,
		Plus,
		RotateCcw,
		PlayCircle,
		Code,
		FileText,
		Sparkles,
		ListTree,
		FileDown,
		Presentation
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import KeyboardShortcutsHelp from './KeyboardShortcutsHelp.svelte';
	import NotebookPdfDialog from './NotebookPdfDialog.svelte';
	import { generateAndDownloadNotebookPdf } from '$lib/typst/notebook-pdf';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Props
	let {
		notebook = null as NotebookStore | null,
		isReadonly = false,
		isTeacher = false,
		onSave = () => {},
		onAddCodeCell = () => {},
		onAddMarkdownCell = () => {},
		onAddCheckpointCell = () => {},
		onRunAll = () => {},
		onStop = () => {},
		onResetKernel = () => {},
		onToggleOutline = () => {},
		outlineOpen = false
	}: {
		notebook?: NotebookStore | null;
		isReadonly?: boolean;
		isTeacher?: boolean;
		onSave?: () => void;
		onAddCodeCell?: () => void;
		onAddMarkdownCell?: () => void;
		onAddCheckpointCell?: () => void;
		onRunAll?: () => void;
		onStop?: () => void;
		onResetKernel?: () => void;
		onToggleOutline?: () => void;
		outlineOpen?: boolean;
	} = $props();

	// PDF export state
	let pdfDialogOpen = $state(false);
	// Teacher may reveal hints only in edit mode — not in "Vue élève".
	let canRevealHints = $derived(isTeacher && !(notebook?.previewMode ?? false));

	// Notebook ID for the presentation route — derived from the loaded notebook.
	let notebookIdForPresent = $derived(notebook?.notebook?.id ?? null);

	function handleStartPresentation(): void {
		if (!notebookIdForPresent) return;
		void goto(`/python-notebook/${notebookIdForPresent}/present`);
	}

	async function handlePdfExport(options: NotebookExportOptions): Promise<void> {
		const nb: PythonNotebook | null = notebook?.notebook ?? null;
		if (!nb) {
			toaster.error('Notebook introuvable');
			return;
		}
		const result = await generateAndDownloadNotebookPdf({ notebook: nb, options });
		if (result.success) {
			toaster.success('PDF téléchargé');
		} else {
			toaster.error(result.error ?? 'Erreur lors de la génération du PDF');
		}
	}

	// Derived state
	let isExecuting = $derived(notebook?.isExecutingAny ?? false);
	let isSaving = $derived(notebook?.isSaving ?? false);
	let isModified = $derived(notebook?.isModified ?? false);
	let isReady = $derived(notebook?.isReady ?? false);
</script>

<div class="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
	<!-- Left side: Execution controls -->
	<div class="flex items-center gap-2">
		<!-- Outline toggle (Colab-style sommaire) -->
		<Button
			variant={outlineOpen ? 'secondary' : 'ghost'}
			size="sm"
			onclick={onToggleOutline}
			class="gap-1.5"
			aria-pressed={outlineOpen}
			aria-label="Afficher le sommaire"
			title="Sommaire (titres markdown)"
		>
			<ListTree class="size-4" />
		</Button>

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
			<!-- Run-current was removed from the toolbar in favour of the
			     per-cell ▶ button (visible on hover) and Ctrl+Entrée: keeps
			     the toolbar focused on batch actions, matches Colab UX. -->

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
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="gap-1.5">
							<Plus class="size-4" />
							<span>Ajouter</span>
						</Button>
					{/snippet}
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
					{#if isTeacher}
						<DropdownMenu.Item onclick={onAddCheckpointCell}>
							<Sparkles class="mr-2 size-4" />
							Checkpoint (vérification)
						</DropdownMenu.Item>
					{/if}
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

	<!-- Right side: Help, PDF export and Save button -->
	<div class="flex items-center gap-2">
		<KeyboardShortcutsHelp {isReadonly} />

		<!-- Presentation mode — full-screen cell-by-cell slideshow. Available
		     to all roles; relevant for both teachers (live class) and
		     students (review with bigger fonts). -->
		<Button
			variant="ghost"
			size="sm"
			onclick={handleStartPresentation}
			disabled={!notebookIdForPresent}
			class="gap-1.5"
			title="Mode présentation (plein écran cellule par cellule)"
			aria-label="Mode présentation"
		>
			<Presentation class="size-4" />
			<span class="hidden sm:inline">Présentation</span>
		</Button>

		<!-- PDF export — available to all roles; the dialog locks the hint
		     toggle for non-teachers. -->
		<Button
			variant="ghost"
			size="sm"
			onclick={() => (pdfDialogOpen = true)}
			class="gap-1.5"
			title="Exporter le notebook en PDF"
			aria-label="Exporter en PDF"
		>
			<FileDown class="size-4" />
			<span class="hidden sm:inline">PDF</span>
		</Button>

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

<NotebookPdfDialog bind:open={pdfDialogOpen} {canRevealHints} onExport={handlePdfExport} />
