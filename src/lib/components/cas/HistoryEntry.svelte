<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Eye } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { replStore } from '$lib/stores/repl.svelte';
	import type { ReplHistoryEntry, TabStyle } from '$lib/mathAST/cli/web';

	interface Props {
		entry: ReplHistoryEntry;
		variant: TabStyle;
		onShowAst?: (entry: ReplHistoryEntry) => void;
	}

	let { entry, variant, onShowAst }: Props = $props();

	/**
	 * Open AST drawer for this entry's expression.
	 */
	function showAst(): void {
		if (onShowAst) {
			onShowAst(entry);
		}
		replStore.showAstDrawer = true;
	}

	// Determine if entry is an error
	const isError = $derived(!entry.result.success);

	// Determine if entry is a command
	const isCommand = $derived(entry.isCommand);
</script>

{#if variant === 'terminal'}
	<!-- Terminal style -->
	<div class="space-y-1 font-mono text-sm">
		<!-- Input line -->
		<div class="flex items-start gap-2">
			<span class="repl-hash shrink-0 text-primary select-none">math&gt;</span>
			<span class="flex-1 break-all text-foreground">{entry.input}</span>
		</div>

		<!-- Output line -->
		<div class="pl-6">
			{#if isError}
				<div class="repl-error break-words text-destructive">
					{entry.result.error?.message || entry.result.output}
				</div>
			{:else if isCommand}
				<div class="repl-dim text-muted-foreground">
					{@html entry.result.outputHtml || entry.result.output}
				</div>
			{:else}
				<div class="repl-success text-foreground">
					{entry.result.output}
				</div>
			{/if}
		</div>

		<!-- AST button (if available) -->
		{#if entry.result.ast}
			<div class="pl-6">
				<Button variant="ghost" size="sm" onclick={showAst} class="h-6 gap-1 px-2 text-xs">
					<Eye class="size-3" />
					Voir AST
				</Button>
			</div>
		{/if}
	</div>
{:else if variant === 'modern'}
	<!-- Modern card style -->
	<div
		class={cn(
			'rounded-lg border border-border bg-card p-4 shadow-sm transition-colors',
			isError && 'border-destructive/50 bg-destructive/5'
		)}
	>
		<!-- Input -->
		<div class="mb-3">
			<div class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Entrée
			</div>
			<div class="rounded bg-muted/50 px-3 py-2 font-mono text-sm text-foreground">
				{entry.input}
			</div>
		</div>

		<!-- Output -->
		<div>
			<div class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Résultat
			</div>
			<div
				class={cn(
					'rounded px-3 py-2 text-sm',
					isError ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-foreground'
				)}
			>
				{#if isError}
					{entry.result.error?.message || entry.result.output}
				{:else if entry.result.outputHtml}
					{@html entry.result.outputHtml}
				{:else}
					{entry.result.output}
				{/if}
			</div>
		</div>

		<!-- AST button (if available) -->
		{#if entry.result.ast}
			<div class="mt-3 flex justify-end">
				<Button variant="outline" size="sm" onclick={showAst} class="gap-2">
					<Eye class="size-4" />
					Voir AST
				</Button>
			</div>
		{/if}
	</div>
{:else}
	<!-- Hybrid style (mix of terminal and modern) -->
	<div class="rounded-lg border border-border bg-card/50 p-3 shadow-sm">
		<!-- Input (terminal style) -->
		<div class="mb-2 flex items-start gap-2 font-mono text-sm">
			<span class="repl-hash shrink-0 text-primary select-none">math&gt;</span>
			<span class="flex-1 break-all text-foreground">{entry.input}</span>
		</div>

		<!-- Output (card style) -->
		<div class="ml-6">
			<div
				class={cn(
					'rounded px-3 py-2 text-sm',
					isError ? 'bg-destructive/10 text-destructive' : 'bg-muted/70 font-mono text-foreground'
				)}
			>
				{#if isError}
					{entry.result.error?.message || entry.result.output}
				{:else if entry.result.outputHtml}
					{@html entry.result.outputHtml}
				{:else}
					{entry.result.output}
				{/if}
			</div>

			<!-- AST button (if available) -->
			{#if entry.result.ast}
				<div class="mt-2">
					<Button variant="ghost" size="sm" onclick={showAst} class="h-7 gap-1.5 px-2 text-xs">
						<Eye class="size-3" />
						Voir AST
					</Button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.repl-error {
		color: hsl(var(--destructive));
	}

	.repl-success {
		color: hsl(var(--foreground));
	}

	.repl-hash {
		color: hsl(var(--primary));
	}

	.repl-dim {
		opacity: 0.7;
	}
</style>
