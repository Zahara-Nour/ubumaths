<script lang="ts">
	import { cn } from '$lib/utils';
	import type { ReplHistoryEntry, TabStyle } from '$lib/mathAST/cli/web';
	import { Button } from '$lib/components/ui/button';
	import { ArrowRightLeft } from 'lucide-svelte';

	interface Props {
		entry: ReplHistoryEntry;
		variant: TabStyle;
	}

	let { entry, variant }: Props = $props();

	// Local toggle state (false = exact, true = decimal)
	let showDecimal = $state(false);

	// Determine if entry is an error
	const isError = $derived(!entry.result.success);

	// Determine if entry is a command
	const isCommand = $derived(entry.isCommand);

	// Can this entry toggle between exact/decimal?
	const canToggle = $derived(entry.result.canToggle ?? false);

	// Get the appropriate HTML output based on toggle state
	const displayHtml = $derived.by(() => {
		if (!canToggle) {
			return entry.result.outputHtml || entry.result.output;
		}
		if (showDecimal) {
			return entry.result.decimalOutputHtml || entry.result.decimalOutput || entry.result.output;
		}
		return entry.result.exactOutputHtml || entry.result.exactOutput || entry.result.output;
	});

	function handleToggle(): void {
		showDecimal = !showDecimal;
	}
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
		<div class="flex items-center gap-2 pl-6">
			{#if isError}
				<div class="repl-error break-words text-destructive">
					{entry.result.error?.message || entry.result.output}
				</div>
			{:else if isCommand && !canToggle}
				<!-- Informational commands (help, vars, etc.) -->
				<div class="repl-dim text-muted-foreground">
					{@html entry.result.outputHtml || entry.result.output}
				</div>
			{:else}
				<!-- Regular evaluations and commands with toggle (solve) -->
				<div class="repl-success text-foreground">
					{@html displayHtml}
				</div>
				{#if canToggle}
					<Button
						variant="ghost"
						size="icon"
						class="size-6"
						onclick={handleToggle}
						aria-label={showDecimal ? 'Afficher exact' : 'Afficher décimal'}
					>
						<ArrowRightLeft class="size-3" />
					</Button>
				{/if}
			{/if}
		</div>
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
			<div class="mb-1 flex items-center justify-between">
				<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Résultat
				</span>
				{#if canToggle && !isError}
					<Button
						variant="ghost"
						size="icon"
						class="size-6"
						onclick={handleToggle}
						aria-label={showDecimal ? 'Afficher exact' : 'Afficher décimal'}
					>
						<ArrowRightLeft class="size-3" />
					</Button>
				{/if}
			</div>
			<div
				class={cn(
					'rounded px-3 py-2 text-sm',
					isError ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-foreground'
				)}
			>
				{#if isError}
					{entry.result.error?.message || entry.result.output}
				{:else if isCommand && !canToggle}
					<!-- Informational commands -->
					{@html entry.result.outputHtml || entry.result.output}
				{:else}
					<!-- Regular evaluations and commands with toggle -->
					{@html displayHtml}
				{/if}
			</div>
		</div>
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
					'flex items-center gap-2 rounded px-3 py-2 text-sm',
					isError ? 'bg-destructive/10 text-destructive' : 'bg-muted/70 font-mono text-foreground'
				)}
			>
				{#if isError}
					<span>{entry.result.error?.message || entry.result.output}</span>
				{:else if isCommand && !canToggle}
					<!-- Informational commands -->
					<span>{@html entry.result.outputHtml || entry.result.output}</span>
				{:else}
					<!-- Regular evaluations and commands with toggle -->
					<span>{@html displayHtml}</span>
					{#if canToggle}
						<Button
							variant="ghost"
							size="icon"
							class="size-6 shrink-0"
							onclick={handleToggle}
							aria-label={showDecimal ? 'Afficher exact' : 'Afficher décimal'}
						>
							<ArrowRightLeft class="size-3" />
						</Button>
					{/if}
				{/if}
			</div>
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
