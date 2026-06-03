<script lang="ts">
	/**
	 * CheckpointCell — Student-facing view of a checkpoint cell.
	 *
	 * Reads the cell's `checkpoint` config, renders a mode-specific summary
	 * of what is verified, exposes a "Vérifier" button that runs the
	 * assertion against the notebook's persistent namespace via the
	 * NotebookStore, and surfaces the verdict (✅/❌/—) + the worker's
	 * error message on failure.
	 *
	 * The teacher-facing editor lives in CheckpointEditor.svelte (Phase 5).
	 * This component is read-only on the test code: the student fills the
	 * preceding code cells, then clicks "Vérifier".
	 */

	import type { CheckpointCell } from '$lib/types/notebook';
	import type { NotebookStore } from '$lib/stores/notebookStore.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Loader2, CheckCircle2, XCircle, CircleDashed, Sparkles } from 'lucide-svelte';

	// Props
	let {
		cell,
		notebook = null as NotebookStore | null,
		isReadonly = false
	}: {
		cell: CheckpointCell;
		notebook?: NotebookStore | null;
		isReadonly?: boolean;
	} = $props();

	// Derived state from the store
	let status = $derived(notebook?.getCheckpointStatus(cell.id));
	let errorMessage = $derived(notebook?.checkpointError?.[cell.id] ?? null);
	let isRunning = $derived(notebook?.checkpointRunning?.[cell.id] ?? false);
	// Block "Vérifier" while any cell is executing — the worker serializes
	// requests, so interleaving a checkpoint mid-execute would silently
	// queue and surprise the student.
	let canRun = $derived(
		(notebook?.isReady ?? false) && !isRunning && !(notebook?.isExecutingAny ?? false)
	);

	let badgeLabel = $derived(
		status === 'passed' ? 'Réussi' : status === 'failed' ? 'Échec' : 'Non vérifié'
	);
	let badgeClass = $derived(
		status === 'passed'
			? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
			: status === 'failed'
				? 'bg-destructive/10 text-destructive border-destructive/30'
				: 'bg-muted text-muted-foreground border-border'
	);

	// Functions
	function handleVerify(): void {
		if (!notebook || !canRun) return;
		void notebook.runCheckpoint(cell.id);
	}
</script>

<div
	class="overflow-hidden rounded-lg border border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10"
>
	<!-- Header : icône + titre + badge statut -->
	<div class="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2">
		<Sparkles class="size-4 text-amber-700 dark:text-amber-300" aria-hidden="true" />
		<h3 class="flex-1 text-sm font-medium text-amber-900 dark:text-amber-100">
			{cell.title ?? 'Vérification'}
		</h3>
		<span
			class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium {badgeClass}"
		>
			{#if status === 'passed'}
				<CheckCircle2 class="size-3" />
			{:else if status === 'failed'}
				<XCircle class="size-3" />
			{:else}
				<CircleDashed class="size-3" />
			{/if}
			{badgeLabel}
		</span>
	</div>

	<!-- Body : description du test selon le mode -->
	<div class="space-y-2 px-4 py-3 text-sm">
		{#if cell.checkpoint.mode === 'assert'}
			<p class="text-muted-foreground">Le test suivant doit passer :</p>
			<pre
				class="overflow-x-auto rounded-md border bg-background px-3 py-2 font-mono text-xs leading-relaxed">{cell
					.checkpoint.code}</pre>
		{:else if cell.checkpoint.mode === 'unit_test'}
			<p class="text-muted-foreground">
				La fonction <code class="rounded bg-muted px-1 py-0.5 text-xs"
					>{cell.checkpoint.function_name}</code
				> doit retourner :
			</p>
			<ul class="space-y-1">
				{#each cell.checkpoint.test_cases as tc, idx (idx)}
					<li
						class="overflow-x-auto rounded-md border bg-background px-3 py-1 font-mono text-xs leading-relaxed"
					>
						<code>{cell.checkpoint.function_name}({JSON.stringify(tc.args).slice(1, -1)})</code>
						→ <code>{JSON.stringify(tc.expected)}</code>
					</li>
				{/each}
			</ul>
		{:else if cell.checkpoint.mode === 'variable_check'}
			<p class="text-muted-foreground">Les variables suivantes doivent avoir ces valeurs :</p>
			<ul class="space-y-1">
				{#each Object.entries(cell.checkpoint.expected_vars) as [name, value] (name)}
					<li
						class="overflow-x-auto rounded-md border bg-background px-3 py-1 font-mono text-xs leading-relaxed"
					>
						<code>{name}</code> == <code>{JSON.stringify(value)}</code>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Erreur si checkpoint a échoué -->
		{#if status === 'failed' && errorMessage}
			<div
				class="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
				role="alert"
			>
				<p class="mb-1 font-medium">Le test a échoué :</p>
				<pre class="font-mono whitespace-pre-wrap">{errorMessage}</pre>
			</div>
		{/if}
	</div>

	<!-- Footer : bouton Vérifier -->
	{#if !isReadonly}
		<div class="flex items-center justify-end gap-2 border-t border-amber-500/30 px-4 py-2">
			<Button
				variant="default"
				size="sm"
				onclick={handleVerify}
				disabled={!canRun}
				aria-label="Vérifier ce checkpoint"
				class="h-8 gap-1.5"
			>
				{#if isRunning}
					<Loader2 class="size-3.5 animate-spin" />
					<span>Vérification…</span>
				{:else}
					<Sparkles class="size-3.5" />
					<span>Vérifier</span>
				{/if}
			</Button>
		</div>
	{/if}
</div>
