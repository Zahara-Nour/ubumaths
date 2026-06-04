<!--
	NotebookPdfDialog Component
	===========================

	Modal that lets the user pick what goes into the exported PDF:
	  - cell outputs (stream, error, display, PNG inline images)
	  - checkpoints (the amber blocks)
	  - teacher hints (only available to the notebook's owner-teacher;
	    locked OFF for students so the in-app "two-failed-attempts"
	    revelation isn't bypassable via PDF)
	  - cover page (title + author + date + page break)

	Defaults are derived from `canRevealHints`:
	  - teacher in edit mode → all 4 ON
	  - teacher in "Vue élève" (`previewMode`) → hints OFF, others ON
	  - student → hints OFF, checkbox disabled
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { FileDown, Loader2 } from 'lucide-svelte';
	import type { NotebookExportOptions } from '$lib/typst/generators/notebook-generator';

	interface Props {
		open: boolean;
		/** Whether the current user is allowed to include teacher hints (owner-teacher in edit mode). */
		canRevealHints: boolean;
		/** Async callback that runs the export. Returns when download completes. */
		onExport: (options: NotebookExportOptions) => Promise<void>;
	}

	let { open = $bindable(), canRevealHints, onExport }: Props = $props();

	let isExporting = $state(false);
	let includeOutputs = $state(true);
	let includeCheckpoints = $state(true);
	let includeHints = $state(false);
	let includeCoverPage = $state(true);

	// Reset hint toggle whenever the dialog opens — the "can reveal" flag
	// may have flipped (teacher toggling "Vue élève" between exports), and
	// students should never see this pre-checked.
	$effect(() => {
		if (open) {
			includeHints = canRevealHints;
		}
	});

	async function handleExport(): Promise<void> {
		isExporting = true;
		try {
			await onExport({
				includeOutputs,
				includeCheckpoints,
				// Defense in depth: even if the checkbox was somehow toggled by
				// a student via devtools, never emit hints in their PDF.
				includeHints: includeHints && canRevealHints,
				includeCoverPage
			});
			open = false;
		} finally {
			isExporting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Exporter en PDF</Dialog.Title>
			<Dialog.Description>Choisissez ce que le PDF doit contenir.</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3 py-2">
			<MyCheckbox
				bind:checked={includeOutputs}
				label="Inclure les sorties (Out, erreurs, images)"
			/>
			<MyCheckbox bind:checked={includeCheckpoints} label="Inclure les checkpoints" />

			{#if canRevealHints}
				<MyCheckbox
					bind:checked={includeHints}
					label="Inclure les indices des checkpoints (correction prof)"
				/>
			{:else}
				<!-- Students can't reveal hints from a PDF — preserves the
				     in-app "2 failed attempts" pedagogy. -->
				<MyCheckbox
					checked={false}
					disabled
					label="Inclure les indices (réservé aux enseignants)"
				/>
			{/if}

			<MyCheckbox bind:checked={includeCoverPage} label="Page de garde (titre + date)" />
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={isExporting}>
				Annuler
			</Button>
			<Button onclick={handleExport} disabled={isExporting} class="gap-1.5">
				{#if isExporting}
					<Loader2 class="size-4 animate-spin" />
					<span>Génération…</span>
				{:else}
					<FileDown class="size-4" />
					<span>Télécharger</span>
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
